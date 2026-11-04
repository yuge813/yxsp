<?php
/** Real first-level, fixed-coin referral campaign administration. PHP 7.2+. */
defined('IN_IA') or exit('Access Denied');
global $_W, $_GPC;
if (!class_exists('DksyV150AdminInputException', false)) { class DksyV150AdminInputException extends RuntimeException {} }
$rU = (int)($_W['uniacid'] ?? 0);
$rUid = (int)($_W['uid'] ?? 0);
$rOwner = !empty($_W['isfounder']) || (string)($_W['role'] ?? '') === 'owner';
$rCanView = $rOwner || (string)($_W['role'] ?? '') === 'manager';
if (!$rU || !$rUid || !$rCanView) { echo '<main style="padding:40px;font:16px sans-serif">请使用当前站点的所有者或经理账号登录。</main>'; return; }
$rH = static function($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); };
$rT = static function($name) { return tablename('sage_dksy_v150_referral_'.$name); };
$rIdent = static function($name) { return '`'.str_replace('`', '``', trim((string)$name, '`')).'`'; };
$rUrl = function($args = array()) { return html_entity_decode($this->createWebUrl('referral150', $args), ENT_QUOTES, 'UTF-8'); };
$rDate = static function($time) { return $time ? (new DateTimeImmutable('@'.(int)$time))->setTimezone(new DateTimeZone('Asia/Shanghai'))->format('Y-m-d H:i') : '—'; };
$rInputDate = static function($time) { return $time ? (new DateTimeImmutable('@'.(int)$time))->setTimezone(new DateTimeZone('Asia/Shanghai'))->format('Y-m-d\TH:i') : ''; };
$rExists = static function($name) { return function_exists('pdo_tableexists') && pdo_tableexists($name); };
$rSchemaPath = dirname(__DIR__, 2).'/class/referral150/schema.php';
$rSchema = is_file($rSchemaPath) ? require $rSchemaPath : array();
$rTables = array('campaign','day','enrollment','reward','admin_audit');
$rExpectedColumns = array(
 'campaign'=>array('id','uniacid','name','enabled','public_visible','inviter_points','invitee_points','min_sign_days','window_days','starts_at','ends_at','daily_invite_cap','daily_budget_coins','total_budget_coins','reserved_coins','paid_coins','created_by','created_at','updated_at'),
 'day'=>array('id','uniacid','campaign_id','day_key','reserved_coins','paid_coins'),
 'enrollment'=>array('id','uniacid','campaign_id','referee_key','invitee_id','invitee_openid','inviter_id','inviter_openid','binding_audit_id','registered_at','register_day','budget_day','expires_at','inviter_points','invitee_points','min_sign_days','window_days','signed_days','invitee_status','inviter_status','created_at','updated_at'),
 'reward'=>array('id','uniacid','campaign_id','enrollment_id','referee_key','stage','beneficiary_id','beneficiary_openid','coins','ledger_log_id','created_at'),
 'admin_audit'=>array('id','uniacid','actor_id','action','campaign_id','detail','created_at')
);
$rUnique = array(
 'day'=>array('uq_campaign_day'=>array('uniacid','campaign_id','day_key')),
 'enrollment'=>array('uq_lifetime_referee'=>array('uniacid','referee_key'),'uq_binding'=>array('uniacid','binding_audit_id')),
 'reward'=>array('uq_lifetime_stage'=>array('uniacid','referee_key','stage'),'uq_enrollment_stage'=>array('uniacid','enrollment_id','stage'),'uq_ledger'=>array('uniacid','ledger_log_id'))
);
$rCheck = function() use ($rTables,$rT,$rExists,$rIdent,$rExpectedColumns,$rUnique) {
 $rows = array(); $ready = true; $baseReady = true;
 $base = array('sage_dksy_user'=>array('id','uniacid','openid','num','createtime','fromid'), 'sage_dksy_num_log'=>array('id','uniacid','openid','num','static'), 'sage_dksy_qian'=>array('uniacid','openid','datetime'), 'sage_dksy_v11_relation_audit'=>array('id','uniacid','user_id','new_inviter_id','action','result','created_at'));
 $targets = $base;
 foreach ($rTables as $suffix) $targets['sage_dksy_v150_referral_'.$suffix] = $rExpectedColumns[$suffix];
 foreach ($targets as $name=>$columns) {
  $isNew = strpos($name, 'sage_dksy_v150_referral_') === 0;
  $ok = true; $note = ''; $engine = '—';
  try {
   if (!$rExists($name)) { $ok=false; $note=$isNew?'待安装':'基础表缺失'; }
   else {
    $actual = pdo_fetch('SHOW TABLE STATUS WHERE Name=:name', array(':name'=>trim((string)tablename($name), '`')));
    $engine = $actual ? (string)($actual['Engine'] ?? '') : '';
    if (strcasecmp($engine, 'InnoDB') !== 0) { $ok=false; $note='必须使用 InnoDB；本工具不会自动转换旧表'; }
    $found = array(); foreach ((array)pdo_fetchall('SHOW COLUMNS FROM '.$rIdent(tablename($name))) as $field) $found[(string)$field['Field']]=true;
    foreach ($columns as $column) if (!isset($found[$column])) { $ok=false; $note='缺少必要字段，需按部署文档核对表结构'; break; }
    if ($isNew) {
     $suffix = substr($name, strlen('sage_dksy_v150_referral_'));
     if (isset($rUnique[$suffix])) {
      $indexes=array();
      foreach ((array)pdo_fetchall('SHOW INDEX FROM '.$rIdent(tablename($name))) as $idx) if ((int)$idx['Non_unique']===0) $indexes[(string)$idx['Key_name']][(int)$idx['Seq_in_index']]=(string)$idx['Column_name'];
      foreach ($rUnique[$suffix] as $key=>$expected) {
       $parts = isset($indexes[$key]) ? $indexes[$key] : array(); ksort($parts);
       if (array_values($parts)!==$expected) { $ok=false; $note='必要的唯一约束不匹配，暂不开放发奖'; break; }
      }
     }
    }
   }
  } catch (Throwable $error) { $ok=false; $note='无法完成结构检查，请由维护者查看服务器日志'; error_log('[YX150 ADMIN] preflight '.get_class($error)); }
  if (!$ok) { $ready=false; if (!$isNew) $baseReady=false; }
  $rows[]=array('name'=>$name,'ok'=>$ok,'engine'=>$engine?:'未知','note'=>$note?:'结构可用');
 }
 return array('ready'=>$ready,'base_ready'=>$baseReady,'rows'=>$rows);
};
$rNumber = static function($name,$min,$max) use (&$_GPC) {
 $value = isset($_GPC[$name]) ? trim((string)$_GPC[$name]) : '';
 if (!preg_match('/^[0-9]{1,10}$/', $value) || (float)$value<$min || (float)$value>$max) throw new DksyV150AdminInputException('请检查数字字段：'.$name);
 return (int)$value;
};
$rScalar = static function($sql,$params) {
 $value=pdo_fetchcolumn($sql,$params);
 if (!is_scalar($value) || is_bool($value) || !preg_match('/^[0-9]+$/',(string)$value)) throw new DksyV150AdminInputException('无法核实活动与预算状态，请稍后重试');
 return (int)$value;
};
$rParseDate = static function($raw) {
 if ($raw==='') return 0;
 $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $raw, new DateTimeZone('Asia/Shanghai'));
 $errors=DateTimeImmutable::getLastErrors();
 if (!$date || ($errors && ($errors['warning_count'] || $errors['error_count'])) || $date->format('Y-m-d\TH:i')!==$raw) throw new DksyV150AdminInputException('日期格式不正确，请使用北京时间');
 return $date->getTimestamp();
};
$rRuleHash = static function($row) {
 $keys=array('id','name','enabled','public_visible','inviter_points','invitee_points','min_sign_days','window_days','starts_at','ends_at','daily_invite_cap','daily_budget_coins','total_budget_coins','updated_at');
 $snapshot=array();foreach($keys as $key)$snapshot[$key]=(string)($row[$key]??'');
 return hash('sha256',json_encode($snapshot));
};
$rAudit = function($action,$campaign,$detail) use ($rU,$rUid) {
 if (!pdo_insert('sage_dksy_v150_referral_admin_audit',array('uniacid'=>$rU,'actor_id'=>$rUid,'action'=>$action,'campaign_id'=>(int)$campaign,'detail'=>json_encode($detail,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'created_at'=>time()))) throw new DksyV150AdminInputException('审计记录写入失败，配置未保存');
};
$rMessage='';$rError='';$rSelected=(int)($_GPC['campaign_id']??0);
if (strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'))==='POST') {
 $lock='yx_v150_rewards_'.$rU; $locked=false; $transaction=false;
 try {
  if (!$rOwner) throw new DksyV150AdminInputException('只有账号所有者可以安装、修改或启停活动');
  if (!function_exists('checksubmit') || !checksubmit('referral150_save')) throw new DksyV150AdminInputException('表单校验失败，请刷新页面重新提交');
  $action=(string)($_GPC['action']??'');
  if (!in_array($action,array('install','create','save','pause','enable'),true)) throw new DksyV150AdminInputException('无效操作');
  $locked=(int)pdo_fetchcolumn('SELECT GET_LOCK(:name,5)',array(':name'=>$lock))===1;
  if (!$locked) throw new DksyV150AdminInputException('奖励服务正在结算，请稍后重试');
  $check=$rCheck();
  if ($action==='install') {
   if (!$check['base_ready']) throw new DksyV150AdminInputException('基础表未通过检查，请先修复基础表；安装不会自动转换或修改旧表');
   if (count($rSchema)!==count($rTables)) throw new DksyV150AdminInputException('安装定义未完整部署');
   foreach ($rSchema as $name=>$sql) if (pdo_query(sprintf($sql,$rIdent(tablename($name))))===false) throw new DksyV150AdminInputException('邀请数据表安装未完成，请重新检查');
   $check=$rCheck();if(!$check['ready'])throw new DksyV150AdminInputException('数据表仍未通过检查，请按下方状态核对；未启用任何活动');
   if(pdo_begin()===false)throw new DksyV150AdminInputException('无法开启事务，未保存配置');$transaction=true;$rAudit('schema_checked',0,array('result'=>'ready','activation'=>false));if(pdo_commit()===false)throw new DksyV150AdminInputException('事务提交未确认，请刷新核对');$transaction=false;
   $rMessage='邀请奖励数据表已就绪。活动仍未启用，请设置规则和预算后单独启用。';
  } else {
   if (!$check['ready']) throw new DksyV150AdminInputException('数据表未通过检查，暂不允许修改或启用活动');
   if(pdo_begin()===false)throw new DksyV150AdminInputException('无法开启事务，未保存配置');$transaction=true;
   if ($action==='create') {
    $latest=$rScalar('SELECT COALESCE(MAX(id),0) FROM '.$rT('campaign').' WHERE uniacid=:u',array(':u'=>$rU));
    if ((int)($_GPC['expected_latest']??-1)!==$latest) throw new DksyV150AdminInputException('活动列表已经变化，请刷新后再创建，避免重复提交');
    $old=null;
   } else {
    $old=pdo_fetch('SELECT * FROM '.$rT('campaign').' WHERE uniacid=:u AND id=:id FOR UPDATE',array(':u'=>$rU,':id'=>$rSelected));
    if (!$old) throw new DksyV150AdminInputException('活动不存在或不属于当前站点');
    if (!hash_equals($rRuleHash($old),(string)($_GPC['revision']??''))) throw new DksyV150AdminInputException('活动配置已经变化，请刷新后核对再提交');
   }
   if ($action==='pause') {
    if (pdo_update('sage_dksy_v150_referral_campaign',array('enabled'=>0,'public_visible'=>0,'updated_at'=>time()),array('uniacid'=>$rU,'id'=>$rSelected))===false) throw new DksyV150AdminInputException('暂停未完成');
    $rAudit('campaign_paused',$rSelected,array('commitments_preserved'=>true));$rMessage='已停止新参与，已承诺的合格奖励仍按原规则结算。';
   } elseif ($action==='enable') {
    $used=(int)$old['reserved_coins']+(int)$old['paid_coins'];
    if ($used>0) throw new DksyV150AdminInputException('此活动已有奖励承诺；重新开放请创建新活动，旧承诺继续结算');
    if ((int)$old['enabled']===1) throw new DksyV150AdminInputException('活动已经启用，请勿重复操作');
    $now=time();$start=max($now,(int)$old['starts_at']);
    if ((int)$old['ends_at']>0 && (int)$old['ends_at']<=$start) throw new DksyV150AdminInputException('活动结束时间已经过期，请先调整时间');
    $sum=(int)$old['inviter_points']+(int)$old['invitee_points'];
    if ($sum<1 || (int)$old['total_budget_coins']<$sum || (int)$old['daily_budget_coins']<$sum) throw new DksyV150AdminInputException('预算不足以承诺一位参与者的奖励，请先修改');
    if (pdo_query('UPDATE '.$rT('campaign').' SET enabled=0,public_visible=0,updated_at=:now WHERE uniacid=:u AND enabled=1',array(':now'=>$now,':u'=>$rU))===false) throw new DksyV150AdminInputException('旧活动暂停失败');
    if (pdo_update('sage_dksy_v150_referral_campaign',array('enabled'=>1,'public_visible'=>1,'starts_at'=>$start,'updated_at'=>$now),array('uniacid'=>$rU,'id'=>$rSelected))===false) throw new DksyV150AdminInputException('活动启用未完成');
    $rAudit('campaign_enabled',$rSelected,array('starts_at'=>$start,'new_bindings_only'=>true));$rMessage='活动已启用，新注册且新绑定的参与者可按规则获得真实金币奖励。';
   } else {
    $name=trim((string)($_GPC['name']??''));
    if ($name==='' || (function_exists('mb_strlen')?mb_strlen($name,'UTF-8'):strlen($name))>80) throw new DksyV150AdminInputException('活动名称请填写1至80个字');
    $values=array('name'=>$name,'inviter_points'=>$rNumber('inviter_points',1,500),'invitee_points'=>$rNumber('invitee_points',0,500),'min_sign_days'=>$rNumber('min_sign_days',1,7),'window_days'=>$rNumber('window_days',1,30),'daily_invite_cap'=>$rNumber('daily_invite_cap',1,10000),'daily_budget_coins'=>$rNumber('daily_budget_coins',1,1000000000),'total_budget_coins'=>$rNumber('total_budget_coins',1,1000000000));
    if ($values['window_days']<$values['min_sign_days']) throw new DksyV150AdminInputException('有效期不能短于需要签到的自然日数');
    $sum=$values['inviter_points']+$values['invitee_points'];
    if ($values['daily_budget_coins']<$sum || $values['total_budget_coins']<$sum) throw new DksyV150AdminInputException('预算至少应覆盖一位参与者的双方奖励');
    if ($values['daily_budget_coins']>$values['total_budget_coins']) throw new DksyV150AdminInputException('每日承诺预算不能超过活动总预算');
    $values['ends_at']=$rParseDate(trim((string)($_GPC['ends_at']??'')));$now=time();$values['updated_at']=$now;
    if ($action==='create') {
     $startMode=(string)($_GPC['start_mode']??'now');
     if(!in_array($startMode,array('now','scheduled'),true))throw new DksyV150AdminInputException('开始时间设置不正确');
     $values['starts_at']=$startMode==='scheduled'?$rParseDate(trim((string)($_GPC['starts_at']??''))):$now;
     if ($values['starts_at']<$now) throw new DksyV150AdminInputException('新活动开始时间不能早于当前时间，避免补发历史奖励');
     if ($values['ends_at']>0 && $values['ends_at']<=$values['starts_at']) throw new DksyV150AdminInputException('结束时间必须晚于开始时间');
     $enable=(string)($_GPC['activate']??'')==='1';
     if ($enable && pdo_query('UPDATE '.$rT('campaign').' SET enabled=0,public_visible=0,updated_at=:now WHERE uniacid=:u AND enabled=1',array(':now'=>$now,':u'=>$rU))===false) throw new DksyV150AdminInputException('旧活动暂停失败');
     $values+=array('uniacid'=>$rU,'enabled'=>$enable?1:0,'public_visible'=>$enable?1:0,'created_by'=>$rUid,'created_at'=>$now);
     if (!pdo_insert('sage_dksy_v150_referral_campaign',$values)) throw new DksyV150AdminInputException('活动创建未完成');
     $rSelected=(int)pdo_insertid();$rAudit('campaign_created',$rSelected,$values);$rMessage=$enable?'新活动已创建并启用，已有活动停止新参与，原有承诺保留。':'活动草稿已保存，尚未启用。';
    } else {
     if ($values['ends_at']>0 && $values['ends_at']<=max($now,(int)$old['starts_at'])) throw new DksyV150AdminInputException('结束时间必须晚于活动开始与当前时间');
     $used=(int)$old['reserved_coins']+(int)$old['paid_coins'];
     $maxDay=$rScalar('SELECT COALESCE(MAX(reserved_coins+paid_coins),0) FROM '.$rT('day').' WHERE uniacid=:u AND campaign_id=:id',array(':u'=>$rU,':id'=>$rSelected));
     if ($values['total_budget_coins']<$used || $values['daily_budget_coins']<$maxDay) throw new DksyV150AdminInputException('预算不能降低到已发放与已预留承诺以下');
     if (pdo_update('sage_dksy_v150_referral_campaign',$values,array('uniacid'=>$rU,'id'=>$rSelected))===false) throw new DksyV150AdminInputException('配置保存未完成');
     $rAudit('campaign_updated',$rSelected,$values);$rMessage='配置已保存。奖励金额、签到条件与有效期仅对之后新参与者生效，已承诺奖励保持原快照。';
    }
   }
   if(pdo_commit()===false)throw new DksyV150AdminInputException('事务提交未确认，请刷新核对');$transaction=false;
  }
 } catch (Throwable $error) {
  if($transaction){try{pdo_rollback();}catch(Throwable $rollbackError){error_log('[YX150 ADMIN] rollback failed '.get_class($rollbackError));}}
  $rError=$error instanceof DksyV150AdminInputException?$error->getMessage():'操作暂未完成，请稍后重试；原有业务不受影响';
  error_log('[YX150 ADMIN] action failed '.get_class($error));
 } finally { if($locked){try{if(pdo_fetchcolumn('SELECT RELEASE_LOCK(:name)',array(':name'=>$lock))===false)error_log('[YX150 ADMIN] lock release failed');}catch(Throwable $releaseError){error_log('[YX150 ADMIN] lock release failed '.get_class($releaseError));}} }
}
$rCheckState=$rCheck();$rReady=$rCheckState['ready'];$rCampaigns=array();$rCampaign=null;$rRewards=array();$rPeople=array();$rAudits=array();$rLatest=0;$rDay=null;$rMore=false;$rPersonMore=false;$rLedgerIssues=null;
$rPage=max(1,min(100000,(int)($_GPC['page']??1)));$rPeoplePage=max(1,min(100000,(int)($_GPC['people_page']??1)));$rLimit=20;
try {
 if($rReady){
  $rCampaigns=pdo_fetchall('SELECT * FROM '.$rT('campaign').' WHERE uniacid=:u ORDER BY enabled DESC,id DESC LIMIT 50',array(':u'=>$rU));
  $rLatest=$rScalar('SELECT COALESCE(MAX(id),0) FROM '.$rT('campaign').' WHERE uniacid=:u',array(':u'=>$rU));
  if(!$rSelected && $rCampaigns)$rSelected=(int)$rCampaigns[0]['id'];
  if($rSelected)$rCampaign=pdo_get('sage_dksy_v150_referral_campaign',array('uniacid'=>$rU,'id'=>$rSelected));
  if($rCampaign){
   $day=(int)(floor((time()+28800)/86400)*86400-28800);
   $rDay=pdo_get('sage_dksy_v150_referral_day',array('uniacid'=>$rU,'campaign_id'=>$rSelected,'day_key'=>$day));
   $ledgerJoin=' FROM '.$rT('reward').' r LEFT JOIN '.tablename('sage_dksy_num_log').' n ON n.id=r.ledger_log_id AND n.uniacid=r.uniacid AND n.openid=r.beneficiary_openid AND n.num=r.coins AND n.`static`=1';
   $rLedgerIssues=$rScalar('SELECT COUNT(*)'.$ledgerJoin.' WHERE r.uniacid=:u AND r.campaign_id=:id AND n.id IS NULL',array(':u'=>$rU,':id'=>$rSelected));
   $rRewards=pdo_fetchall('SELECT r.id,r.enrollment_id,r.stage,r.beneficiary_id,r.coins,r.ledger_log_id,r.created_at,n.id AS verified_ledger_id'.$ledgerJoin.' WHERE r.uniacid=:u AND r.campaign_id=:id ORDER BY r.id DESC LIMIT '.(($rPage-1)*$rLimit).','.($rLimit+1),array(':u'=>$rU,':id'=>$rSelected));
   $rMore=count($rRewards)>$rLimit;$rRewards=array_slice($rRewards,0,$rLimit);
   $rPeople=pdo_fetchall('SELECT id,invitee_id,inviter_id,binding_audit_id,registered_at,created_at,expires_at,signed_days,min_sign_days,inviter_points,invitee_points,invitee_status,inviter_status FROM '.$rT('enrollment').' WHERE uniacid=:u AND campaign_id=:id ORDER BY id DESC LIMIT '.(($rPeoplePage-1)*$rLimit).','.($rLimit+1),array(':u'=>$rU,':id'=>$rSelected));
   $rPersonMore=count($rPeople)>$rLimit;$rPeople=array_slice($rPeople,0,$rLimit);
   $rAudits=pdo_fetchall('SELECT actor_id,action,created_at FROM '.$rT('admin_audit').' WHERE uniacid=:u AND campaign_id=:id ORDER BY id DESC LIMIT 20',array(':u'=>$rU,':id'=>$rSelected));
  }
 }
} catch(Throwable $error){$rError='奖励数据暂时无法读取，请稍后刷新；请维护者核对服务器日志';error_log('[YX150 ADMIN] read failed '.get_class($error));}
$rForm=$rCampaign?:array('name'=>'元享一级邀请礼遇','inviter_points'=>10,'invitee_points'=>5,'min_sign_days'=>2,'window_days'=>7,'daily_invite_cap'=>10,'daily_budget_coins'=>0,'total_budget_coins'=>0,'starts_at'=>time(),'ends_at'=>0);
$rStatus = static function($value) { $labels=array('waiting'=>'待达标','paid'=>'已到账','expired'=>'已到期','no_budget'=>'预算不足','relation_changed'=>'归属已变化','pending'=>'待核验');return $labels[$value]??'待核验'; };
$rToken=(string)($_W['token']??'');
$rFormHidden=function($action) use($rH,$rToken,$rSelected,$rCampaign,$rRuleHash) {echo '<input type="hidden" name="referral150_save" value="1"><input type="hidden" name="token" value="'.$rH($rToken).'"><input type="hidden" name="action" value="'.$rH($action).'"><input type="hidden" name="campaign_id" value="'.(int)$rSelected.'"><input type="hidden" name="revision" value="'.$rH($rCampaign?$rRuleHash($rCampaign):'').'">';};
?>
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>元享 · 真实邀请奖励</title><style>
*{box-sizing:border-box}body{margin:0;background:#f8f5f6;color:#29222c;font:15px/1.7 -apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif}a{color:#b71948;text-decoration:none}button,input,select{font:inherit}button,a.btn{cursor:pointer}main{max-width:1460px;margin:auto;padding:26px}.head,.card,.metric{background:#fff;border:1px solid #eddee4;border-radius:16px}.head{padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:20px}.eyebrow{color:#a74363;font-size:13px}h1{font-size:28px;margin:2px 0}h2{font-size:20px;margin:0 0 12px}.muted{color:#826b78;font-size:13px}.tag{padding:7px 14px;background:#fff0d6;color:#9b5439;border-radius:25px;white-space:nowrap}.notice{padding:14px 18px;border:1px solid #efd3dc;border-radius:12px;background:#fff0f4;margin:18px 0}.notice.ok{background:#f1faf4;border-color:#d1e8d8;color:#356246}.card{margin-top:20px;padding:23px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-top:20px}.metric{padding:20px}.metric span{display:block;color:#826b78;font-size:13px}.metric strong{display:block;font-size:29px;color:#b71948;line-height:1.5}.field-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.field label{display:block;font-size:14px;font-weight:600}.field input,.field select{width:100%;min-height:44px;border:1px solid #dccbd3;border-radius:8px;padding:8px 11px;background:#fff;color:#29222c}.field small{display:block;color:#826b78;font-size:12px;line-height:1.7;margin-top:5px}.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:18px}.btn,button{border:1px solid #e8ccd6;border-radius:9px;background:#fff6f8;color:#a01943;padding:10px 16px;min-height:44px;display:inline-block}.primary{background:#c41140;color:#fff;border-color:#c41140}.danger{color:#9c2d3f;background:#fff}fieldset{margin:0;padding:0;border:0}fieldset:disabled{opacity:.6}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:11px 13px;border-bottom:1px solid #f0e3e8;white-space:nowrap}th{background:#fff5f7;color:#775566}td.note{white-space:normal;min-width:230px}.table{overflow:auto;border:1px solid #efe0e7;border-radius:11px}.row{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}.stage{font-size:13px;color:#a74363}.rules{line-height:1.9;color:#765969}.empty{padding:24px;color:#826b78;text-align:center}.separate{border-top:1px solid #eadce3;margin:24px 0}.check-ok{color:#397652}.check-bad{color:#b42c50}@media(max-width:850px){main{padding:15px}.metrics,.field-grid{grid-template-columns:repeat(2,1fr)}.head{align-items:flex-start;flex-direction:column}}@media(max-width:520px){.metrics,.field-grid{grid-template-columns:1fr}}
</style></head><body><main>
<header class="head"><div><div class="eyebrow">元享经营管理 · 一级固定金币</div><h1>真实邀请奖励</h1><div class="muted">B首次签到获得新人金币；B达到不同自然日签到条件后，直属A获得邀请金币。与广告观看无关。</div></div><a class="btn" href="<?php echo $rH(html_entity_decode($this->createWebUrl('growth13'),ENT_QUOTES,'UTF-8'));?>">返回增长总览</a></header>
<?php if($rMessage):?><div class="notice ok"><?php echo $rH($rMessage);?></div><?php endif;?>
<?php if($rError):?><div class="notice"><?php echo $rH($rError);?></div><?php endif;?>
<section class="card"><div class="row"><h2>部署前置检查</h2><span class="tag"><?php echo $rReady?'数据表已就绪':'尚未就绪，不发放邀请奖励';?></span></div><p class="muted">安装仅新增邀请奖励表，不转换旧表，不修改现有余额，不自动开启活动。所有金额单位均为金币。</p><details <?php if(!$rReady)echo 'open';?>><summary>查看表结构与存储引擎</summary><div class="table"><table><thead><tr><th>数据表</th><th>引擎</th><th>状态</th></tr></thead><tbody><?php foreach($rCheckState['rows'] as $row):?><tr><td><?php echo $rH($row['name']);?></td><td><?php echo $rH($row['engine']);?></td><td class="note <?php echo $row['ok']?'check-ok':'check-bad';?>"><?php echo $rH($row['note']);?></td></tr><?php endforeach;?></tbody></table></div></details><?php if($rOwner):?><form method="post" action="<?php echo $rH($rUrl());?>"><div class="actions"><?php $rFormHidden('install');?><button>安装 / 重新检查邀请数据表</button></div></form><?php else:?><p class="muted">当前账号可查看，安装和配置需要账号所有者操作。</p><?php endif;?></section>
<?php if($rReady):?>
<section class="card"><div class="row"><h2>活动与承诺预算</h2><form method="get" action="<?php echo $rH($rUrl());?>"><select onchange="if(this.value)window.location.href=this.value"><option value="">选择历史活动</option><?php foreach($rCampaigns as $item):?><option value="<?php echo $rH($rUrl(array('campaign_id'=>$item['id'])));?>" <?php if((int)$item['id']===$rSelected)echo 'selected';?>>#<?php echo (int)$item['id'];?> <?php echo $rH($item['name']);?><?php echo (int)$item['enabled']===1?' · 已启用':' · 停止新参与';?></option><?php endforeach;?></select></form></div><?php if($rCampaign):?><p><strong><?php echo $rH($rCampaign['name']);?></strong> <span class="tag"><?php echo (int)$rCampaign['enabled']===1?'接收合格新参与者':'停止新参与';?></span></p><p class="muted">参与生效：<?php echo $rH($rDate($rCampaign['starts_at']));?> 至 <?php echo $rCampaign['ends_at']?$rH($rDate($rCampaign['ends_at'])):'未设置结束时间';?>（北京时间）</p><?php else:?><p class="empty">尚未创建活动。先设置规则及金币预算，再创建并启用。</p><?php endif;?></section>
<?php if($rCampaign):?><div class="metrics"><div class="metric"><span>已记账发放</span><strong><?php echo (int)$rCampaign['paid_coins'];?></strong><span>奖励会计累计，流水核验见下方</span></div><div class="metric"><span>待达标已预留</span><strong><?php echo (int)$rCampaign['reserved_coins'];?></strong><span>承诺保留，不因暂停取消</span></div><div class="metric"><span>活动剩余额度</span><strong><?php echo max(0,(int)$rCampaign['total_budget_coins']-(int)$rCampaign['paid_coins']-(int)$rCampaign['reserved_coins']);?></strong><span>总预算 <?php echo (int)$rCampaign['total_budget_coins'];?> 金币</span></div><div class="metric"><span>今日新增承诺</span><strong><?php echo $rDay?(int)$rDay['reserved_coins']+(int)$rDay['paid_coins']:0;?></strong><span>今日承诺预算 <?php echo (int)$rCampaign['daily_budget_coins'];?> 金币</span></div></div><?php endif;?>
<section class="card"><h2><?php echo $rCampaign?'活动规则与新活动':'创建首个活动';?></h2><p class="rules">每位新参与B在有效期内首次签到可获得新人金币，达到指定的不同自然日签到数后直属A获得邀请金币；不要求连续签到。每位B每阶段终身一次。旧30%参考比例和旧预算模拟不参与本机制，不能把内部启用当作腾讯审核结论。</p><form method="post" action="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected)));?>" id="referralConfig"><input type="hidden" name="referral150_save" value="1"><input type="hidden" name="token" value="<?php echo $rH($rToken);?>"><input type="hidden" name="campaign_id" value="<?php echo $rSelected;?>"><input type="hidden" name="revision" value="<?php echo $rH($rCampaign?$rRuleHash($rCampaign):'');?>"><input type="hidden" name="expected_latest" value="<?php echo $rLatest;?>"><fieldset <?php if(!$rOwner)echo 'disabled';?>><div class="field-grid">
<?php $rFields=array('name'=>array('活动名称','text','活动名称会展示给参与者'),'inviter_points'=>array('直属A达标奖励','number','默认10金币，范围1–500'),'invitee_points'=>array('新B首次签到奖励','number','默认5金币，范围0–500'),'min_sign_days'=>array('A奖励要求的签到自然日数','number','默认2天，按不同自然日计数'),'window_days'=>array('参与有效期（自然日）','number','默认7天，包含注册当日'),'daily_invite_cap'=>array('每位A每日新增参与者上限','number','按奖励资格登记日计数'),'daily_budget_coins'=>array('每日新增承诺预算（金币）','number','包含已发与待达标预留；不是当天实际支付上限'),'total_budget_coins'=>array('此活动总预算（金币）','number','包含已发与预留，不得低于已有承诺'));foreach($rFields as $key=>$info):?><div class="field"><label for="<?php echo $key;?>"><?php echo $rH($info[0]);?></label><input id="<?php echo $key;?>" type="<?php echo $info[1];?>" name="<?php echo $key;?>" value="<?php echo $rH($rForm[$key]);?>" <?php if($info[1]==='number')echo 'min="0" step="1"';?> required><small><?php echo $rH($info[2]);?></small></div><?php endforeach;?>
<div class="field"><label for="ends_at">停止新参与时间（北京时间）</label><input id="ends_at" type="datetime-local" name="ends_at" value="<?php echo $rH($rInputDate($rForm['ends_at']));?>"><small>留空表示不限定。已承诺奖励按自己的快照与到期时间继续处理。</small></div><div class="field"><label for="start_mode">新活动开始方式</label><select name="start_mode" id="start_mode"><option value="now">创建时立即开始</option><option value="scheduled">预约未来时间</option></select><small>新活动不补发历史注册或历史绑定奖励。</small></div><div class="field"><label for="starts_at">新活动预约时间（北京时间）</label><input id="starts_at" type="datetime-local" name="starts_at" value="<?php echo $rH($rInputDate(time()+120));?>"><small>仅在创建新活动且选择预约时使用。修改当前活动不会回改原开始时间。</small></div></div><div class="actions"><?php if($rCampaign):?><button class="primary" name="action" value="save">保存当前活动配置</button><?php endif;?><button name="action" value="create">另存新活动草稿</button><label><input type="checkbox" name="activate" value="1"> 创建新活动时立即启用</label></div></fieldset></form><?php if($rOwner&&$rCampaign):?><div class="separate"></div><div class="actions"><form method="post" action="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected)));?>"><?php $rFormHidden((int)$rCampaign['enabled']===1?'pause':'enable');?><button class="<?php echo (int)$rCampaign['enabled']===1?'danger':'primary';?>"><?php echo (int)$rCampaign['enabled']===1?'暂停新参与，保留已承诺奖励':'启用此未参与草稿';?></button></form><span class="muted">已产生承诺的暂停活动如需恢复，请另存新活动并启用。</span></div><?php endif;?></section>
<?php if($rCampaign):?><section class="card"><h2>参与进度与规则快照</h2><p class="muted">按每位参与者登记时的奖励与条件展示；归属变化或未达标不虚构到账。到期释放由奖励服务处理。</p><div class="table"><table><thead><tr><th>记录</th><th>A / B会员ID</th><th>不同日签到</th><th>B首次奖励</th><th>A达标奖励</th><th>参与截止</th><th>绑定审计</th></tr></thead><tbody><?php foreach($rPeople as $row):?><tr><td>#<?php echo (int)$row['id'];?></td><td>A #<?php echo (int)$row['inviter_id'];?> / B #<?php echo (int)$row['invitee_id'];?></td><td><?php echo (int)$row['signed_days'];?> / <?php echo (int)$row['min_sign_days'];?></td><td><?php echo (int)$row['invitee_points'];?> · <?php echo $rH($rStatus($row['invitee_status']));?></td><td><?php echo (int)$row['inviter_points'];?> · <?php echo $rH($rStatus($row['inviter_status']));?></td><td><?php echo $rH($rDate($row['expires_at']));?></td><td>#<?php echo (int)$row['binding_audit_id'];?></td></tr><?php endforeach;?></tbody></table><?php if(!$rPeople):?><div class="empty">暂无参与记录；不会给历史用户补造邀请奖励。</div><?php endif;?></div><div class="actions"><?php if($rPeoplePage>1):?><a class="btn" href="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected,'people_page'=>$rPeoplePage-1,'page'=>$rPage)));?>">上一页参与记录</a><?php endif;?><?php if($rPersonMore):?><a class="btn" href="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected,'people_page'=>$rPeoplePage+1,'page'=>$rPage)));?>">下一页参与记录</a><?php endif;?></div></section>
<section class="card"><h2>真实金币奖励与流水核验</h2><?php if($rLedgerIssues===null||$rLedgerIssues>0):?><div class="notice">金币流水<?php echo $rLedgerIssues===null?'尚未完成核验':'存在 '.(int)$rLedgerIssues.' 条不匹配记录';?>，请维护者核对；本页面不会补造或重复发放金币。</div><?php endif;?><div class="table"><table><thead><tr><th>奖励记录</th><th>参与记录</th><th>收款会员ID</th><th>阶段</th><th>金币</th><th>钱包流水ID</th><th>核验状态</th><th>记录时间</th></tr></thead><tbody><?php foreach($rRewards as $row):?><tr><td>#<?php echo (int)$row['id'];?></td><td>#<?php echo (int)$row['enrollment_id'];?></td><td>#<?php echo (int)$row['beneficiary_id'];?></td><td><?php echo $row['stage']==='invitee_first_sign'?'B首次签到':'A有效直推';?></td><td>+<?php echo (int)$row['coins'];?></td><td>#<?php echo (int)$row['ledger_log_id'];?></td><td class="<?php echo !empty($row['verified_ledger_id'])?'check-ok':'check-bad';?>"><?php echo !empty($row['verified_ledger_id'])?'金币流水已核验':'流水待核对';?></td><td><?php echo $rH($rDate($row['created_at']));?></td></tr><?php endforeach;?></tbody></table><?php if(!$rRewards):?><div class="empty">尚无奖励记录。每条奖励均核对同站点、会员、金币数量和入账类型的真实流水。</div><?php endif;?></div><div class="actions"><?php if($rPage>1):?><a class="btn" href="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected,'page'=>$rPage-1,'people_page'=>$rPeoplePage)));?>">上一页到账记录</a><?php endif;?><?php if($rMore):?><a class="btn" href="<?php echo $rH($rUrl(array('campaign_id'=>$rSelected,'page'=>$rPage+1,'people_page'=>$rPeoplePage)));?>">下一页到账记录</a><?php endif;?></div></section>
<section class="card"><h2>近期配置审计</h2><div class="table"><table><thead><tr><th>操作</th><th>管理员ID</th><th>时间</th></tr></thead><tbody><?php foreach($rAudits as $row):?><tr><td><?php echo $rH($row['action']);?></td><td>#<?php echo (int)$row['actor_id'];?></td><td><?php echo $rH($rDate($row['created_at']));?></td></tr><?php endforeach;?></tbody></table><?php if(!$rAudits):?><div class="empty">暂无此活动配置记录。</div><?php endif;?></div></section><?php endif;?>
<?php endif;?>
<p class="muted" style="padding:15px 5px">已确认奖励进入现有金币钱包，可按实际商品规则兑换，不能提现。活动启用是运营配置操作，不代表已取得腾讯平台审核结论。</p>
</main></body></html>
