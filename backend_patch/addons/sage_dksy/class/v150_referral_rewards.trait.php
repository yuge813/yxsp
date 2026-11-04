<?php
/** Fixed-coin, direct-only referral rewards. App requests never install schema. */
defined('IN_IA') or exit('Access Denied');
trait DksyV150ReferralRewardsTrait {
    private $v150ReadyCache = null;
    protected function v150Now() { return time(); }
    private function v150U() { global $_W; return (int)($_W['uniacid'] ?? 0); }
    private function v150Day($time) { return (int)(floor(((int)$time + 28800) / 86400) * 86400 - 28800); }
    private function v150T($name) { return tablename('sage_dksy_'.$name); }
    private function v150Json($value) { return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); }
    private function v150RefereeKey($openid) { return hash('sha256', $this->v150U().'|'.(string)$openid); }
    private function v150Names() { return array('v150_referral_campaign','v150_referral_day','v150_referral_enrollment','v150_referral_reward','v150_referral_admin_audit'); }
    // WeEngine may return false instead of throwing on a failed SELECT. A failed
    // eligibility/accounting read must never become an empty result or zero.
    private function v150Rows($sql,$args=array()) {
        $rows=pdo_fetchall($sql,$args);
        if (!is_array($rows)) throw new RuntimeException('Referral read unavailable');
        foreach ($rows as $row) if (!is_array($row)) throw new RuntimeException('Referral row unavailable');
        return $rows;
    }
    private function v150One($sql,$args=array()) {
        $rows=$this->v150Rows($sql,$args);
        return count($rows)>0?reset($rows):null;
    }
    private function v150Integer($value) {
        if ((!is_int($value) && !is_string($value)) || !preg_match('/^[0-9]+$/',(string)$value)) throw new RuntimeException('Referral numeric read unavailable');
        $digits=ltrim((string)$value,'0');$digits=$digits===''?'0':$digits;$maximum=(string)PHP_INT_MAX;
        if (strlen($digits)>strlen($maximum) || (strlen($digits)===strlen($maximum) && strcmp($digits,$maximum)>0)) throw new RuntimeException('Referral numeric overflow');
        return (int)$digits;
    }
    private function v150Count($sql,$args=array()) { return $this->v150Integer(pdo_fetchcolumn($sql,$args)); }
    public function v150SchemaReady() {
        if ($this->v150ReadyCache !== null) return $this->v150ReadyCache;
        if ($this->v150U() < 1 || !function_exists('pdo_tableexists')) return $this->v150ReadyCache=false;
        try {
            foreach (array_merge($this->v150Names(), array('user','qian','num_log','v11_relation_audit')) as $name) {
                if (!pdo_tableexists('sage_dksy_'.$name)) return $this->v150ReadyCache=false;
            }
            foreach (array_merge($this->v150Names(), array('user','qian','num_log','v11_relation_audit')) as $name) {
                $physical=trim($this->v150T($name),'`');
                $row=$this->v150One('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t',array(':t'=>$physical));
                if (!$row || strcasecmp((string)$row['ENGINE'],'InnoDB')!==0) return $this->v150ReadyCache=false;
            }
            $sample=$this->v150One('SELECT `datetime` FROM '.$this->v150T('qian').' WHERE uniacid=:u ORDER BY `datetime` DESC LIMIT 1',array(':u'=>$this->v150U()));
            if ($sample && (!is_numeric($sample['datetime']) || (float)$sample['datetime']<1000000000 || (float)$sample['datetime']>=5000000000)) return $this->v150ReadyCache=false;
            return $this->v150ReadyCache=true;
        } catch (Throwable $e) { return $this->v150ReadyCache=false; }
    }
    private function v150CampaignValid($row) {
        if (!$row || (int)$row['uniacid']!==$this->v150U()) return false;
        foreach (array('inviter_points','invitee_points') as $key) if (!isset($row[$key]) || !preg_match('/^[0-9]+$/',(string)$row[$key]) || (int)$row[$key]>500) return false;
        return (int)$row['inviter_points']>=1 && (int)$row['min_sign_days']>=1 && (int)$row['min_sign_days']<=7 && (int)$row['window_days']>=(int)$row['min_sign_days'] && (int)$row['window_days']<=30 && (int)$row['daily_invite_cap']>0 && (int)$row['daily_invite_cap']<=10000 && (int)$row['daily_budget_coins']>0 && (int)$row['daily_budget_coins']<=1000000000 && (int)$row['total_budget_coins']>0 && (int)$row['total_budget_coins']<=1000000000 && (int)$row['starts_at']>0;
    }
    private function v150ActiveCampaign($lock=false) {
        $now=$this->v150Now();
        $row=$this->v150One('SELECT * FROM '.$this->v150T('v150_referral_campaign').' WHERE uniacid=:u AND enabled=1 AND public_visible=1 AND starts_at<=:n AND (ends_at=0 OR ends_at>:n2) ORDER BY id DESC LIMIT 1'.($lock?' FOR UPDATE':''),array(':u'=>$this->v150U(),':n'=>$now,':n2'=>$now));
        return $this->v150CampaignValid($row)?$row:null;
    }
    private function v150CampaignDto($row) {
        if (!$row) return null;
        $a=(int)$row['inviter_points'];$b=(int)$row['invitee_points'];$days=(int)$row['min_sign_days'];$window=(int)$row['window_days'];
        return array('id'=>(int)$row['id'],'enabled'=>true,'public_visible'=>true,'name'=>(string)$row['name'],
            'inviter_points'=>$a,'invitee_points'=>$b,'min_sign_days'=>$days,'window_days'=>$window,
            'starts_at'=>(int)$row['starts_at'],'ends_at'=>(int)$row['ends_at'],'daily_invite_cap'=>(int)$row['daily_invite_cap'],
            'rules_text'=>'仅活动开始后新注册并通过有效邀请入口建立直属关系的新用户参与。报名需有奖励名额及预算。新人在注册日起'.$window.'个北京时间自然日内首次签到得'.$b.'金币；累计'.$days.'个不同自然日签到后，直属邀请人得'.$a.'金币。每位新人每档终身一次，不与广告观看挂钩；金币不能提现。暂停活动只停止新参与，已确认参与的奖励按原规则核验。');
    }
    public function v150PublishedCampaign() {
        if (!$this->v150SchemaReady()) return null;
        $row=$this->v150ActiveCampaign();if (!$row) return null;
        return array('approved'=>true,'enabled'=>true,'public_visible'=>true,
            'stages'=>array(array('label'=>'直属好友完成'.(int)$row['min_sign_days'].'个不同自然日签到，邀请人可得','coins'=>(int)$row['inviter_points'])),
            'cap'=>(int)$row['inviter_points'],'invitee_coins'=>(int)$row['invitee_points'],
            'min_sign_days'=>(int)$row['min_sign_days'],'window_days'=>(int)$row['window_days']);
    }
    private function v150RequireWrite($result) { if ($result===false) throw new RuntimeException('Referral storage unavailable'); return $result; }
    private function v150BudgetMove($row,$amount,$paid) {
        $amount=(int)$amount;if ($amount<=0) return;
        $u=$this->v150U();$extra=$paid?',paid_coins=paid_coins+:p':'';
        $args=array(':n'=>$amount,':u'=>$u,':id'=>(int)$row['campaign_id'],':minimum'=>$amount);
        if ($paid) $args[':p']=$amount;
        if (pdo_query('UPDATE '.$this->v150T('v150_referral_campaign').' SET reserved_coins=reserved_coins-:n'.$extra.' WHERE uniacid=:u AND id=:id AND reserved_coins>=:minimum',$args)!==1) throw new RuntimeException('Referral campaign accounting mismatch');
        $args=array(':n'=>$amount,':u'=>$u,':id'=>(int)$row['campaign_id'],':day'=>(int)$row['budget_day'],':minimum'=>$amount);
        if ($paid) $args[':p']=$amount;
        if (pdo_query('UPDATE '.$this->v150T('v150_referral_day').' SET reserved_coins=reserved_coins-:n'.$extra.' WHERE uniacid=:u AND campaign_id=:id AND day_key=:day AND reserved_coins>=:minimum',$args)!==1) throw new RuntimeException('Referral day accounting mismatch');
    }
    private function v150Credit($row,$stage,$user,$coins) {
        $coins=(int)$coins;if ($coins<=0 || $coins>500) throw new RuntimeException('Invalid referral amount');
        $u=$this->v150U();$now=$this->v150Now();
        $prior=$this->v150One('SELECT id FROM '.$this->v150T('v150_referral_reward').' WHERE uniacid=:u AND referee_key=:r AND stage=:s FOR UPDATE',array(':u'=>$u,':r'=>$row['referee_key'],':s'=>$stage));
        if ($prior) throw new RuntimeException('Referral stage accounting mismatch');
        $fields=array();foreach ($this->v150Rows('SHOW COLUMNS FROM '.$this->v150T('num_log')) as $field) $fields[$field['Field']]=$field;
        foreach (array('id','uniacid','openid','num','static') as $required) if (!isset($fields[$required])) throw new RuntimeException('Ledger schema unavailable');
        $title=$stage==='invitee_first_sign'?'邀请新人 · 首次签到奖励':'一级推广 · 好友留存奖励';
        $log=array('uniacid'=>$u,'openid'=>$user['openid'],'num'=>$coins,'static'=>1);
        foreach (array('createtime','addtime','create_time') as $key) if (isset($fields[$key])) $log[$key]=$now;
        if (isset($fields['title'])) $log['title']=$title;
        foreach (array('remark','remarks','content','description') as $key) if (isset($fields[$key])) $log[$key]='V150 enrollment '.(int)$row['id'].' '.$stage;
        foreach ($fields as $key=>$field) if (!array_key_exists($key,$log) && $field['Null']==='NO' && $field['Default']===null && stripos($field['Extra'],'auto_increment')===false) throw new RuntimeException('Ledger required field unavailable');
        if (pdo_query('UPDATE '.$this->v150T('user').' SET num=num+:n WHERE uniacid=:u AND id=:id AND openid=:o',array(':n'=>$coins,':u'=>$u,':id'=>(int)$user['id'],':o'=>$user['openid']))!==1) throw new RuntimeException('Referral balance update failed');
        if (!pdo_insert('sage_dksy_num_log',$log)) throw new RuntimeException('Referral ledger write failed');
        $ledgerId=(int)pdo_insertid();if ($ledgerId<1) throw new RuntimeException('Referral ledger id unavailable');
        if (!pdo_insert('sage_dksy_v150_referral_reward',array('uniacid'=>$u,'campaign_id'=>(int)$row['campaign_id'],'enrollment_id'=>(int)$row['id'],'referee_key'=>$row['referee_key'],'stage'=>$stage,'beneficiary_id'=>(int)$user['id'],'beneficiary_openid'=>$user['openid'],'coins'=>$coins,'ledger_log_id'=>$ledgerId,'created_at'=>$now))) throw new RuntimeException('Referral reward write failed');
        $this->v150BudgetMove($row,$coins,true);
    }
    private function v150SettleEnrollment($row,$now) {
        if (!in_array($row['invitee_status'],array('waiting','relation_changed'),true) && !in_array($row['inviter_status'],array('waiting','relation_changed'),true)) return $row;
        $u=$this->v150U();
        $users=$this->v150Rows('SELECT id,openid,fromid FROM '.$this->v150T('user').' WHERE uniacid=:u AND id IN (:a,:b) ORDER BY id ASC FOR UPDATE',array(':u'=>$u,':a'=>(int)$row['inviter_id'],':b'=>(int)$row['invitee_id']));
        $byId=array();foreach ($users as $user) $byId[(int)$user['id']]=$user;
        $b=$byId[(int)$row['invitee_id']]??null;$a=$byId[(int)$row['inviter_id']]??null;
        $validB=$b && hash_equals((string)$row['invitee_openid'],(string)$b['openid']);
        $validA=$validB && $a && hash_equals((string)$row['inviter_openid'],(string)$a['openid']) && (string)$b['fromid']===(string)$row['inviter_openid'];
        // The referral transaction uses READ COMMITTED. After the locked account
        // row is acquired this read sees an ordinary sign-in that just committed,
        // even when another enrollment was examined earlier in this transaction.
        $days=$validB?$this->v150Count('SELECT COUNT(DISTINCT FLOOR((`datetime`+28800)/86400)) FROM '.$this->v150T('qian').' WHERE uniacid=:u AND openid=:o AND `datetime`>=:s AND `datetime`<:e AND `datetime`<:today_end',array(':u'=>$u,':o'=>$row['invitee_openid'],':s'=>(int)$row['register_day'],':e'=>(int)$row['expires_at'],':today_end'=>$this->v150Day($now)+86400)):(int)$row['signed_days'];
        $days=min((int)$row['window_days'],max(0,$days));
        $welcome=(string)$row['invitee_status'];$retention=(string)$row['inviter_status'];
        if ($welcome==='waiting' || $welcome==='relation_changed') {
            if ($validB && $days>=1) {$this->v150Credit($row,'invitee_first_sign',$b,(int)$row['invitee_points']);$welcome='paid';}
            elseif (!$validB) $welcome='relation_changed';
            else $welcome='waiting';
        }
        if ($retention==='waiting' || $retention==='relation_changed') {
            if ($validA && $days>=(int)$row['min_sign_days']) {$this->v150Credit($row,'inviter_retention',$a,(int)$row['inviter_points']);$retention='paid';}
            elseif (!$validA) $retention='relation_changed';
            else $retention='waiting';
        }
        if ($now>=(int)$row['expires_at']) {
            foreach (array('invitee'=>$welcome,'inviter'=>$retention) as $role=>$state) if (in_array($state,array('waiting','relation_changed'),true)) {
                $this->v150BudgetMove($row,(int)$row[$role.'_points'],false);
                if ($role==='invitee') $welcome='expired'; else $retention='expired';
            }
        }
        $patch=array('signed_days'=>$days,'invitee_status'=>$welcome,'inviter_status'=>$retention,'updated_at'=>$now);
        $this->v150RequireWrite(pdo_update('sage_dksy_v150_referral_enrollment',$patch,array('uniacid'=>$u,'id'=>(int)$row['id'])));
        return array_merge($row,$patch);
    }
    private function v150ExpireDue($now) {
        $rows=$this->v150Rows('SELECT * FROM '.$this->v150T('v150_referral_enrollment')." WHERE uniacid=:u AND expires_at<=:n AND (invitee_status IN ('waiting','relation_changed') OR inviter_status IN ('waiting','relation_changed')) ORDER BY id ASC LIMIT 50 FOR UPDATE",array(':u'=>$this->v150U(),':n'=>$now));
        foreach ($rows as $row) $this->v150SettleEnrollment($row,$now);
    }
    private function v150RepairDirectInvitees($openid,$now) {
        // Server-selected direct relationships only. Oldest checked rows first
        // rotates a bounded batch; callers cannot name another account to settle.
        $rows=$this->v150Rows('SELECT * FROM '.$this->v150T('v150_referral_enrollment')." WHERE uniacid=:u AND inviter_openid=:o AND (invitee_status IN ('waiting','relation_changed') OR inviter_status IN ('waiting','relation_changed')) ORDER BY updated_at ASC,id ASC LIMIT 50 FOR UPDATE",array(':u'=>$this->v150U(),':o'=>$openid));
        foreach ($rows as $row) $this->v150SettleEnrollment($row,$now);
    }
    private function v150Enroll($user,$now) {
        $u=$this->v150U();$cfg=$this->v150ActiveCampaign(true);
        if (!$cfg || empty($user['fromid']) || $user['fromid']==='0') return array(null,'not_invited');
        $registered=(int)$user['createtime'];
        if ($registered<(int)$cfg['starts_at'] || $registered>$now) return array(null,'not_invited');
        $day=$this->v150Day($registered);$expires=$day+(int)$cfg['window_days']*86400;
        if ($expires<=$now) return array(null,'expired');
        $audit=$this->v150One('SELECT id,new_inviter_id,created_at FROM '.$this->v150T('v11_relation_audit')." WHERE uniacid=:u AND user_id=:id AND action='new_bind' AND result='ok' ORDER BY id ASC LIMIT 1",array(':u'=>$u,':id'=>(int)$user['id']));
        if (!$audit || (int)$audit['created_at']<(int)$cfg['starts_at'] || (int)$audit['created_at']<$registered || (int)$audit['created_at']>$registered+86400 || (int)$audit['created_at']>$now) return array(null,'not_invited');
        $inviter=$this->v150One('SELECT id,openid FROM '.$this->v150T('user').' WHERE uniacid=:u AND id=:id',array(':u'=>$u,':id'=>(int)$audit['new_inviter_id']));
        if (!$inviter || (int)$inviter['id']===(int)$user['id'] || (string)$inviter['openid']!==(string)$user['fromid']) return array(null,'relation_changed');
        $budgetDay=$this->v150Day($now);$amount=(int)$cfg['invitee_points']+(int)$cfg['inviter_points'];
        $count=$this->v150Count('SELECT COUNT(*) FROM '.$this->v150T('v150_referral_enrollment').' WHERE uniacid=:u AND inviter_openid=:o AND budget_day=:d',array(':u'=>$u,':o'=>$inviter['openid'],':d'=>$budgetDay));
        if ($count>=(int)$cfg['daily_invite_cap'] || (int)$cfg['reserved_coins']+(int)$cfg['paid_coins']+$amount>(int)$cfg['total_budget_coins']) return array(null,'no_budget');
        $this->v150RequireWrite(pdo_query('INSERT IGNORE INTO '.$this->v150T('v150_referral_day').' (uniacid,campaign_id,day_key,reserved_coins,paid_coins) VALUES (:u,:c,:d,0,0)',array(':u'=>$u,':c'=>(int)$cfg['id'],':d'=>$budgetDay)));
        $daily=$this->v150One('SELECT * FROM '.$this->v150T('v150_referral_day').' WHERE uniacid=:u AND campaign_id=:c AND day_key=:d FOR UPDATE',array(':u'=>$u,':c'=>(int)$cfg['id'],':d'=>$budgetDay));
        if (!$daily || (int)$daily['reserved_coins']+(int)$daily['paid_coins']+$amount>(int)$cfg['daily_budget_coins']) return array(null,'no_budget');
        $row=array('uniacid'=>$u,'campaign_id'=>(int)$cfg['id'],'referee_key'=>$this->v150RefereeKey($user['openid']),
            'invitee_id'=>(int)$user['id'],'invitee_openid'=>$user['openid'],'inviter_id'=>(int)$inviter['id'],'inviter_openid'=>$inviter['openid'],
            'binding_audit_id'=>(int)$audit['id'],'registered_at'=>$registered,'register_day'=>$day,'budget_day'=>$budgetDay,'expires_at'=>$expires,
            'inviter_points'=>(int)$cfg['inviter_points'],'invitee_points'=>(int)$cfg['invitee_points'],'min_sign_days'=>(int)$cfg['min_sign_days'],'window_days'=>(int)$cfg['window_days'],
            'signed_days'=>0,'invitee_status'=>(int)$cfg['invitee_points']>0?'waiting':'none','inviter_status'=>(int)$cfg['inviter_points']>0?'waiting':'none','created_at'=>$now,'updated_at'=>$now);
        if (!pdo_insert('sage_dksy_v150_referral_enrollment',$row)) throw new RuntimeException('Referral enrollment failed');
        $row['id']=(int)pdo_insertid();
        if (pdo_query('UPDATE '.$this->v150T('v150_referral_campaign').' SET reserved_coins=reserved_coins+:n WHERE uniacid=:u AND id=:id AND reserved_coins+paid_coins+:n2<=total_budget_coins',array(':n'=>$amount,':u'=>$u,':id'=>(int)$cfg['id'],':n2'=>$amount))!==1) throw new RuntimeException('Referral budget changed');
        if (pdo_query('UPDATE '.$this->v150T('v150_referral_day').' SET reserved_coins=reserved_coins+:n WHERE uniacid=:u AND id=:id AND reserved_coins+paid_coins+:n2<=:limit',array(':n'=>$amount,':u'=>$u,':id'=>(int)$daily['id'],':n2'=>$amount,':limit'=>(int)$cfg['daily_budget_coins']))!==1) throw new RuntimeException('Referral day budget changed');
        return array($row,'waiting_sign');
    }
    private function v150Mine($row,$fallback) {
        if (!$row) return array('state'=>$fallback,'signed_days'=>0,'required_days'=>null,'invitee_coins'=>null,'invitee_paid'=>false,'inviter_coins'=>null,'inviter_paid'=>false,'expires_at'=>null);
        $welcome=(string)$row['invitee_status'];$retention=(string)$row['inviter_status'];
        if (in_array('relation_changed',array($welcome,$retention),true)) $state='relation_changed';
        elseif (in_array('expired',array($welcome,$retention),true)) $state='expired';
        elseif (in_array($welcome,array('paid','none'),true) && in_array($retention,array('paid','none'),true)) $state='completed';
        elseif ((int)$row['signed_days']<1) $state='waiting_sign';
        else $state='waiting_retention';
        return array('state'=>$state,'signed_days'=>(int)$row['signed_days'],'required_days'=>(int)$row['min_sign_days'],'invitee_coins'=>(int)$row['invitee_points'],'invitee_paid'=>$welcome==='paid','inviter_coins'=>(int)$row['inviter_points'],'inviter_paid'=>$retention==='paid','expires_at'=>(int)$row['expires_at']);
    }
    public function v150ProcessUser($openid) {
        if (!is_string($openid) || $openid==='' || strlen($openid)>64 || !$this->v150SchemaReady()) return $this->v150Mine(null,'unavailable');
        $u=$this->v150U();$lock='yx_v150_rewards_'.$u;
        if ($this->v150Count('SELECT GET_LOCK(:l,5)',array(':l'=>$lock))!==1) throw new RuntimeException('Referral busy');
        $started=false;
        try {
            // Transaction-only setting: never change the connection/session's
            // default isolation for legacy sign-in, ads or account operations.
            $this->v150RequireWrite(pdo_query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED'));
            $this->v150RequireWrite(pdo_begin());$started=true;$now=$this->v150Now();$this->v150ExpireDue($now);
            $user=$this->v150One('SELECT id,openid,fromid,createtime FROM '.$this->v150T('user').' WHERE uniacid=:u AND openid=:o',array(':u'=>$u,':o'=>$openid));
            if (!$user) throw new RuntimeException('Referral account unavailable');
            $row=$this->v150One('SELECT * FROM '.$this->v150T('v150_referral_enrollment').' WHERE uniacid=:u AND referee_key=:r FOR UPDATE',array(':u'=>$u,':r'=>$this->v150RefereeKey($openid)));
            $fallback='not_invited';
            if (!$row) list($row,$fallback)=$this->v150Enroll($user,$now);
            if ($row) $row=$this->v150SettleEnrollment($row,$now);
            $this->v150RepairDirectInvitees($openid,$now);
            $this->v150RequireWrite(pdo_commit());$started=false;return $this->v150Mine($row,$fallback);
        } catch (Throwable $e) {
            if ($started) { try { pdo_rollback(); } catch (Throwable $rollbackError) { error_log('[YX150] reward_rollback_failed'); } }
            throw $e;
        } finally {
            try { if (pdo_fetchcolumn('SELECT RELEASE_LOCK(:l)',array(':l'=>$lock))===false) error_log('[YX150] reward_lock_release_failed'); }
            catch (Throwable $releaseError) { error_log('[YX150] reward_lock_release_failed'); }
        }
    }
    public function v150SafeProcessUser($openid) {
        try { return $this->v150ProcessUser($openid); }
        catch (Throwable $e) { error_log('[YX150] reward_process_failed');return array_merge($this->v150Mine(null,'pending'),array('service_error'=>true)); }
    }
    private function v150Summary($openid,$mine) {
        $u=$this->v150U();$page=max(1,min(10000,(int)($_GET['page']??1)));global $_GPC;if (isset($_GPC['page'])) $page=max(1,min(10000,(int)$_GPC['page']));
        $empty=array('error'=>0,'version'=>1,'campaign'=>null,'mine'=>$mine,'inviter'=>array('earned'=>null,'pending_coins'=>null,'qualified'=>null,'waiting'=>null),'records'=>array(),'page'=>$page,'has_more'=>false,'server_time'=>$this->v150Now());
        if (!$this->v150SchemaReady()) return $empty;
        if (!empty($mine['service_error'])) throw new RuntimeException('Referral processing pending');
        $user=$this->v150One('SELECT id FROM '.$this->v150T('user').' WHERE uniacid=:u AND openid=:o',array(':u'=>$u,':o'=>$openid));if (!$user) throw new RuntimeException('Referral account unavailable');
        // Stable, server-verified identity preserves history after account row
        // recreation and prevents a reused numeric id from exposing old records.
        $broken=$this->v150Count('SELECT COUNT(*) FROM '.$this->v150T('v150_referral_reward').' r LEFT JOIN '.$this->v150T('num_log').' n ON n.id=r.ledger_log_id AND n.uniacid=r.uniacid AND n.openid=r.beneficiary_openid AND n.num=r.coins AND n.`static`=1 WHERE r.uniacid=:u AND r.beneficiary_openid=:o AND n.id IS NULL',array(':u'=>$u,':o'=>$openid));
        if ($broken>0) throw new RuntimeException('Referral ledger reconciliation required');
        $earned=$this->v150Count('SELECT COALESCE(SUM(coins),0) FROM '.$this->v150T('v150_referral_reward')." WHERE uniacid=:u AND beneficiary_openid=:o AND stage='inviter_retention'",array(':u'=>$u,':o'=>$openid));
        $stats=$this->v150One('SELECT COALESCE(SUM(CASE WHEN inviter_status IN (\'waiting\',\'relation_changed\') THEN inviter_points ELSE 0 END),0) pending_coins,COALESCE(SUM(CASE WHEN inviter_status=\'paid\' THEN 1 ELSE 0 END),0) qualified,COALESCE(SUM(CASE WHEN inviter_status IN (\'waiting\',\'relation_changed\') THEN 1 ELSE 0 END),0) waiting FROM '.$this->v150T('v150_referral_enrollment').' WHERE uniacid=:u AND inviter_openid=:o',array(':u'=>$u,':o'=>$openid));
        if (!$stats) throw new RuntimeException('Referral summary unavailable');
        $offset=($page-1)*15;
        $sql='SELECT * FROM (SELECT e.id,e.invitee_id,e.inviter_id,e.signed_days,e.min_sign_days,e.invitee_points coins,e.invitee_status reward_status,e.created_at,r.created_at paid_at,\'invitee_first_sign\' stage,\'invitee\' role FROM '.$this->v150T('v150_referral_enrollment').' e LEFT JOIN '.$this->v150T('v150_referral_reward').' r ON r.uniacid=e.uniacid AND r.enrollment_id=e.id AND r.stage=\'invitee_first_sign\' WHERE e.uniacid=:u AND e.invitee_openid=:o AND e.invitee_points>0 UNION ALL SELECT e.id,e.invitee_id,e.inviter_id,e.signed_days,e.min_sign_days,e.inviter_points coins,e.inviter_status reward_status,e.created_at,r.created_at paid_at,\'inviter_retention\' stage,\'inviter\' role FROM '.$this->v150T('v150_referral_enrollment').' e LEFT JOIN '.$this->v150T('v150_referral_reward').' r ON r.uniacid=e.uniacid AND r.enrollment_id=e.id AND r.stage=\'inviter_retention\' WHERE e.uniacid=:u2 AND e.inviter_openid=:o2 AND e.inviter_points>0) records ORDER BY created_at DESC,id DESC,stage ASC LIMIT '.$offset.',16';
        $rows=$this->v150Rows($sql,array(':u'=>$u,':o'=>$openid,':u2'=>$u,':o2'=>$openid));$more=count($rows)>15;$rows=array_slice($rows,0,15);$records=array();
        foreach ($rows as $row) $records[]=array('id'=>$row['id'].':'.$row['stage'],'stage'=>$row['stage'],'role'=>$row['role'],'coins'=>(int)$row['coins'],'status'=>$row['reward_status']==='paid'?'paid':($row['reward_status']==='none'?'waiting':$row['reward_status']),'created_at'=>(int)$row['created_at'],'paid_at'=>$row['paid_at']===null?null:(int)$row['paid_at'],'member_label'=>'好友***'.substr(str_pad((string)$row['invitee_id'],3,'0',STR_PAD_LEFT),-3),'signed_days'=>(int)$row['signed_days'],'required_days'=>(int)$row['min_sign_days']);
        return array_merge($empty,array('campaign'=>$this->v150CampaignDto($this->v150ActiveCampaign()),'inviter'=>array('earned'=>$earned,'pending_coins'=>$this->v150Integer($stats['pending_coins']),'qualified'=>$this->v150Integer($stats['qualified']),'waiting'=>$this->v150Integer($stats['waiting'])),'records'=>$records,'has_more'=>$more));
    }
    public function doPageV150referralsummary() {
        $openid=$this->safeVerifiedUser();if (!$openid) return $this->safeError();
        try { return $this->v150Json($this->v150Summary($openid,$this->v150SafeProcessUser($openid))); }
        catch (Throwable $e) { return $this->v150Json(array('error'=>1,'msg'=>'推广奖励暂未同步，请稍后重试','version'=>1)); }
    }
    public function doPageV150referralsettle() { return $this->doPageV150referralsummary(); }
}
