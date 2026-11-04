<?php
/** V13.4 增长补充 API：独立、受控、不会触及旧金币/广告/订单业务表。 */
defined('IN_IA') or exit('Access Denied');
$action = (string)$_GPC['yx134_api'];
$reply = function($ok, $data, $message) {
    if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok'=>(bool)$ok,'data'=>$data,'message'=>$message), JSON_UNESCAPED_UNICODE|JSON_PARTIAL_OUTPUT_ON_ERROR);
};
$names = array('v134_growth_finance','v134_growth_case');
$ready = true;
foreach($names as $n) if (!$yxExists($n)) $ready=false;
$validMoney = function($value) {
    $s=trim((string)$value);
    if (!preg_match('/^(0|[1-9][0-9]{0,11})$/',$s)) throw new RuntimeException('金额必须为非负整数分，且不超过12位');
    return (int)$s;
};
$logAudit = function($name, $id, $description) use($yxU,$yxUid,$yxExists) {
    if (!$yxExists('v132_growth_audit')) throw new RuntimeException('V13.2审计表尚未初始化，禁止无日志写入');
    return pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>$name,'ref_id'=>$id,'detail'=>(function_exists('mb_substr')?mb_substr($description,0,250,'UTF-8'):substr($description,0,250)),'created_at'=>time()));
};
try {
    $writes=array('init','finance_add','finance_decide','case_add','case_decide');
    if(in_array($action,$writes,true)) {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET')!=='POST') throw new RuntimeException('仅允许 POST 提交');
        if (!function_exists('checksubmit') || !checksubmit('yx134_save')) throw new RuntimeException('表单令牌校验失败，请刷新页面');
        // 会计新增/复核、风控复核由站点有权限的管理员执行，每个决策有独立操作者日志。
        if (!$yxOwner && $yxRole!=='manager') throw new RuntimeException('无可用的站点管理权限');
    }
    if ($action==='init') {
        if (!$yxOwner) throw new RuntimeException('只有站点所有者可初始化扩展表');
        $ddl=array(
          'CREATE TABLE IF NOT EXISTS '.$yxT('v134_growth_finance')." (`id` bigint unsigned NOT NULL AUTO_INCREMENT,`uniacid` int unsigned NOT NULL,`period_date` date NOT NULL,`kind` varchar(28) NOT NULL,`amount_fen` bigint unsigned NOT NULL DEFAULT 0,`evidence_ref` varchar(160) NOT NULL DEFAULT '',`remark` varchar(200) NOT NULL DEFAULT '',`status` varchar(16) NOT NULL DEFAULT 'pending',`created_by` int unsigned NOT NULL,`reviewed_by` int unsigned NOT NULL DEFAULT 0,`created_at` int unsigned NOT NULL,`updated_at` int unsigned NOT NULL,PRIMARY KEY (`id`),KEY `ix_site_time` (`uniacid`,`period_date`),KEY `ix_status` (`uniacid`,`status`),UNIQUE KEY `uq_site_reference` (`uniacid`,`evidence_ref`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
          'CREATE TABLE IF NOT EXISTS '.$yxT('v134_growth_case')." (`id` bigint unsigned NOT NULL AUTO_INCREMENT,`uniacid` int unsigned NOT NULL,`subject_id` int unsigned NOT NULL,`rule_code` varchar(32) NOT NULL,`evidence` varchar(240) NOT NULL DEFAULT '',`status` varchar(16) NOT NULL DEFAULT 'open',`memo` varchar(240) NOT NULL DEFAULT '',`created_by` int unsigned NOT NULL,`reviewed_by` int unsigned NOT NULL DEFAULT 0,`created_at` int unsigned NOT NULL,`updated_at` int unsigned NOT NULL,PRIMARY KEY (`id`),KEY `ix_site_case` (`uniacid`,`status`),KEY `ix_subject` (`uniacid`,`subject_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        foreach($ddl as $sql) {if(pdo_query($sql)===false)throw new RuntimeException('新扩展表创建失败');}
        $reply(true,array('ready'=>true),'已仅新建2张增长扩展表；旧业务表不变');return;
    }
    if ($action==='cohorts') {
        // 显示真实签到留存，不等同全部活跃留存；跨自然日、日期为北京时间。
        $items=array();$tz=new DateTimeZone('Asia/Shanghai');$today=(new DateTimeImmutable('today',$tz))->getTimestamp();
        if (!$yxExists('user')||!$yxExists('qian')||!$yxField('user','createtime')||!$yxField('qian','datetime')) {
            $reply(true,array('rows'=>array(),'reason'=>'用户或签到数据表缺失'),'');return;
        }
        $sample=pdo_fetchcolumn('SELECT `datetime` FROM '.$yxT('qian').' WHERE uniacid=:u ORDER BY `datetime` DESC LIMIT 1',array(':u'=>$yxU));
        if(!is_numeric($sample)||(float)$sample<1000000000||(float)$sample>=5000000000) {
            $reply(true,array('rows'=>array(),'reason'=>'签到记录不是秒级时间戳，无法计算真实留存'),'');return;
        }
        foreach(array(1,2,3,5,7) as $day) {
            $start=$today-$day*86400;
            $base=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',array(':u'=>$yxU,':s'=>$start,':e'=>$start+86400));
            $kept=null;
            if($base>0){
                try {$kept=pdo_fetchcolumn('SELECT COUNT(DISTINCT u.id) FROM '.$yxT('user').' u JOIN '.$yxT('qian').' q ON q.uniacid=u.uniacid AND q.openid=u.openid WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e AND q.`datetime`>=:q0 AND q.`datetime`<:q1',array(':u'=>$yxU,':s'=>$start,':e'=>$start+86400,':q0'=>$today,':q1'=>$today+86400));$kept=is_numeric($kept)?(int)$kept:null;}catch(Throwable $e){error_log('[YX134] cohort '.$day.' '.$e->getMessage());}
            }
            $items[]=array('day'=>$day,'base'=>$base,'signed'=>$kept,'rate'=>$base>0&&$kept!==null?round(100*$kept/$base,1):null);
        }
        $reply(true,array('rows'=>$items,'reason'=>'这是按注册日期分组、当天再次签到的观察指标；非完整DAU留存'),'');return;
    }
    if ($action==='relation_search') {
        if(!$yxExists('v11_relation_audit')) {$reply(true,array('rows'=>array(),'total'=>null,'reason'=>'邀请审计表不存在'),'');return;}
        $page=max(1,min(10000,(int)($_GPC['page']??1)));$size=20;$offset=($page-1)*$size;
        $filter=trim((string)($_GPC['member']??''));
        if($filter!==''&&!preg_match('/^[0-9]{1,12}$/',$filter))throw new RuntimeException('请填写会员数字ID');
        $where=' WHERE uniacid=:u';$params=array(':u'=>$yxU);
        if($filter!==''){$where.=' AND (user_id=:m OR new_inviter_id=:n)';$params[':m']=(int)$filter;$params[':n']=(int)$filter;}
        $total=$yxNum('v11_relation_audit','SELECT COUNT(*) FROM '.$yxT('v11_relation_audit').$where,$params);
        $rows=$yxRows('v11_relation_audit','SELECT id,user_id,new_inviter_id,action,result,created_at FROM '.$yxT('v11_relation_audit').$where.' ORDER BY id DESC LIMIT '.$offset.','.$size,$params);
        $reply(true,array('rows'=>$rows?:array(),'total'=>$total,'page'=>$page,'pages'=>$total===null?0:(int)ceil($total/$size)),'');return;
    }
    if ($action==='source_mix') {
        if(!$yxExists('user')||!$yxField('user','fromid')){$reply(true,array('status'=>'unavailable'),'来源字段不可用');return;}
        $all=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u',array(':u'=>$yxU));
        $inv=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND fromid IS NOT NULL AND fromid<>'' AND fromid<>'0'",array(':u'=>$yxU));
        $reply(true,array('all'=>$all,'invited'=>$inv,'unattributed'=>$all!==null&&$inv!==null?max(0,$all-$inv):null,'note'=>'无归属不等于完全自然流量；仅基于当前关系字段'),'');return;
    }
    if ($action==='extension_status') { $reply(true,array('ready'=>$ready,'missing'=>$ready?array():array_values(array_filter($names,function($n)use($yxExists){return !$yxExists($n);}))),'');return; }
    if($action==='actual_cac') {
        if(!$ready) {$reply(true,array('ready'=>false,'reason'=>'未初始化成本台账'),'');return;}
        // 相同北京时间自然月口径：仅包括不同管理员核验的获客费用。
        $month=(string)($_GPC['month']??date('Y-m'));
        if(!preg_match('/^20[0-9]{2}-(0[1-9]|1[0-2])$/',$month))throw new RuntimeException('月份格式无效');
        $tz=new DateTimeZone('Asia/Shanghai');
        $start=(new DateTimeImmutable($month.'-01 00:00:00',$tz))->getTimestamp();
        $end=(new DateTimeImmutable($month.'-01 00:00:00',$tz))->modify('+1 month')->getTimestamp();
        $cost=$yxNum('v134_growth_finance','SELECT COALESCE(SUM(amount_fen),0) FROM '.$yxT('v134_growth_finance')." WHERE uniacid=:u AND kind='acquisition' AND status='approved' AND period_date>=:s AND period_date<:e",array(':u'=>$yxU,':s'=>$month.'-01',':e'=>(new DateTimeImmutable($month.'-01 00:00:00',$tz))->modify('+1 month')->format('Y-m-d')));
        $effective=null;$reason='';
        $expenseCount=$yxNum('v134_growth_finance','SELECT COUNT(*) FROM '.$yxT('v134_growth_finance')." WHERE uniacid=:u AND kind='acquisition' AND status='approved' AND period_date>=:s AND period_date<:e",array(':u'=>$yxU,':s'=>$month.'-01',':e'=>(new DateTimeImmutable($month.'-01 00:00:00',$tz))->modify('+1 month')->format('Y-m-d')));
        if(!$yxExists('user')||!$yxExists('qian'))$reason='注册或签到表不可用';
        elseif(!$yxField('user','fromid')||!$yxField('qian','datetime'))$reason='邀请归属或签到时间字段不存在';
        else {
            // 只统计本月注册且有一级归属、至少两个自然日签到的人。
            try {
                $query="SELECT COUNT(*) FROM (SELECT u.id FROM ".$yxT('user')." u INNER JOIN ".$yxT('qian')." q ON q.uniacid=u.uniacid AND q.openid=u.openid WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e AND u.fromid IS NOT NULL AND u.fromid<>'' AND u.fromid<>'0' AND q.`datetime`>=(FLOOR((u.createtime+28800)/86400)*86400-28800) AND q.`datetime`<:e2 GROUP BY u.id HAVING COUNT(DISTINCT FLOOR((q.`datetime`+28800)/86400))>=2) zz";
                $value=pdo_fetchcolumn($query,array(':u'=>$yxU,':s'=>$start,':e'=>$end,':e2'=>$end));
                $effective=is_numeric($value)?(int)$value:null;
            }catch(Throwable $err){error_log('[YX134] cac query '.$err->getMessage());$reason='有效新增用户核验失败';}
        }
        if($cost===null)$reason='财务凭据读取失败';elseif($expenseCount===0)$reason='本月尚无经复核的真实获客费用凭据';
        if($effective===0 && $reason==='')$reason='本月暂无达标有效归属用户';
        $cac=($effective!==null&&$effective>0&&$cost!==null&&$expenseCount>0)?round($cost/100/$effective,2):null;
        $reply(true,array('month'=>$month,'verified_acquisition_cost_fen'=>$cost,'effective_attributed'=>$effective,'reference_cac_yuan'=>$cac,'reason'=>$reason,'note'=>'同月人工审核费用÷同月满足双自然日签到的一级归属注册用户，仅为参考CAC，不是完整会计利润'),'');return;
    }
    if (strpos($action,'finance')===0) {
        if(!$ready)throw new RuntimeException('请先在成本核算页初始化扩展表');
        $kinds=array('ad_settled'=>'已结算广告收入','acquisition'=>'获客推广费','goods'=>'商品采购成本','shipping'=>'物流成本','redemption'=>'兑换履约成本','content'=>'内容及运营成本','other'=>'其他直接支出');
        if($action==='finance_add'){
            if(!$yxOwner)throw new RuntimeException('只有所有者可新增会计记录');
            $kind=(string)($_GPC['kind']??'');$date=(string)($_GPC['period_date']??'');$amount=$validMoney($_GPC['amount_fen']??'');$ref=trim((string)($_GPC['evidence_ref']??''));$remark=trim((string)($_GPC['remark']??''));
            if(!isset($kinds[$kind])||!preg_match('/^20[0-9]{2}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/',$date)||!checkdate((int)substr($date,5,2),(int)substr($date,8,2),(int)substr($date,0,4))||$amount<=0||strlen($ref)<3||strlen($ref)>160||strlen($remark)>200)throw new RuntimeException('请填写有效日期、金额、来源凭据编号及说明');
            $id=0;pdo_begin();try{
                if(!pdo_insert('sage_dksy_v134_growth_finance',array('uniacid'=>$yxU,'period_date'=>$date,'kind'=>$kind,'amount_fen'=>$amount,'evidence_ref'=>$ref,'remark'=>$remark,'status'=>'pending','created_by'=>$yxUid,'created_at'=>time(),'updated_at'=>time())))throw new RuntimeException('保存失败');
                $id=(int)pdo_insertid();if(!$logAudit('finance_pending',$id,$kind.' 金额(分):'.$amount))throw new RuntimeException('审计保存失败');pdo_commit();
            }catch(Throwable $e){pdo_rollback();throw $e;}
            $reply(true,array('id'=>$id),'已经进入待复核状态，未经复核不计入核算');return;
        }
        if($action==='finance_decide'){
            $id=(int)($_GPC['id']??0);$next=(string)($_GPC['decision']??'');
            if(!$id||!in_array($next,array('approved','rejected'),true))throw new RuntimeException('复核参数无效');
            $old=pdo_get('sage_dksy_v134_growth_finance',array('id'=>$id,'uniacid'=>$yxU));
            if(!$old||$old['status']!=='pending')throw new RuntimeException('该凭据已处理');
            if((int)$old['created_by']===$yxUid)throw new RuntimeException('录入人与复核人必须是不同管理员');
            pdo_begin();try{
                $affected=pdo_update('sage_dksy_v134_growth_finance',array('status'=>$next,'reviewed_by'=>$yxUid,'updated_at'=>time()),array('id'=>$id,'uniacid'=>$yxU,'status'=>'pending'));
                if($affected!==1)throw new RuntimeException('记录被其他管理员更新');
                if(!$logAudit('finance_'.$next,$id,$old['evidence_ref']))throw new RuntimeException('审计保存失败');pdo_commit();
            }catch(Throwable $e){pdo_rollback();throw $e;}
            $reply(true,array('id'=>$id),'复核完成');return;
        }
        if($action==='finance_list'){
            $rows=$yxRows('v134_growth_finance','SELECT id,period_date,kind,amount_fen,evidence_ref,remark,status,created_by,reviewed_by FROM '.$yxT('v134_growth_finance').' WHERE uniacid=:u ORDER BY id DESC LIMIT 100',array(':u'=>$yxU));
            $all=$yxRows('v134_growth_finance','SELECT kind,SUM(amount_fen) total FROM '.$yxT('v134_growth_finance')." WHERE uniacid=:u AND status='approved' GROUP BY kind",array(':u'=>$yxU));
            $totals=array();foreach($kinds as $k=>$v)$totals[$k]=0;foreach($all?:array() as $r) if(isset($totals[$r['kind']]))$totals[$r['kind']]=(float)$r['total'];
            $revenue=$totals['ad_settled'];$expense=array_sum($totals)-$revenue;
            $reply(true,array('rows'=>$rows?:array(),'kinds'=>$kinds,'totals'=>$totals,'revenue_fen'=>$revenue,'expense_fen'=>$expense,'net_fen'=>$revenue-$expense,'note'=>'仅含经不同管理员复核的人工凭据；不是腾讯自动结算或平台完整利润'),'');return;
        }
    }
    if(strpos($action,'case')===0) {
        if(!$ready)throw new RuntimeException('请先初始化增长扩展表');
        if($action==='case_add'){
            $id=(int)($_GPC['subject_id']??0);$rule=(string)($_GPC['rule_code']??'');$detail=trim((string)($_GPC['evidence']??''));
            if(!$id||!in_array($rule,array('burst_bind','self_invite','orphan_inviter','manual'),true)||strlen($detail)<4||strlen($detail)>240)throw new RuntimeException('风险线索信息不足');
            $user=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND id=:id',array(':u'=>$yxU,':id'=>$id));
            if($user!==1)throw new RuntimeException('指定用户不属于当前站点');
            pdo_begin();try{
                if(!pdo_insert('sage_dksy_v134_growth_case',array('uniacid'=>$yxU,'subject_id'=>$id,'rule_code'=>$rule,'evidence'=>$detail,'status'=>'open','memo'=>'','created_by'=>$yxUid,'created_at'=>time(),'updated_at'=>time())))throw new RuntimeException('写入失败');
                $rid=(int)pdo_insertid();if(!$logAudit('risk_case_open',$rid,'会员'.$id.' '.$rule))throw new RuntimeException('审计失败');pdo_commit();
            }catch(Throwable $e){pdo_rollback();throw $e;}
            $reply(true,array('id'=>$rid),'线索已记录，仅供人工复核，不自动限制账号');return;
        }
        if($action==='case_decide'){
            $id=(int)($_GPC['id']??0);$next=(string)($_GPC['decision']??'');$memo=trim((string)($_GPC['memo']??''));
            if(!$id||!in_array($next,array('cleared','confirmed','appeal_review'),true)||strlen($memo)<5||strlen($memo)>200)throw new RuntimeException('复核决定或理由无效');
            $old=pdo_get('sage_dksy_v134_growth_case',array('id'=>$id,'uniacid'=>$yxU));
            if(!$old||(!in_array($old['status'],array('open','appeal_review'),true)&&!($old['status']==='confirmed'&&$next==='appeal_review')))throw new RuntimeException('复核状态不可修改');
            if((int)$old['created_by']===$yxUid)throw new RuntimeException('复核人必须与线索登记人不同');
            pdo_begin();try{
                $n=pdo_update('sage_dksy_v134_growth_case',array('status'=>$next,'memo'=>$memo,'reviewed_by'=>$yxUid,'updated_at'=>time()),array('id'=>$id,'uniacid'=>$yxU,'status'=>$old['status']));
                if($n!==1)throw new RuntimeException('状态已变化');
                if(!$logAudit('risk_case_'.$next,$id,$memo))throw new RuntimeException('审计失败');pdo_commit();
            }catch(Throwable $e){pdo_rollback();throw $e;}
            $reply(true,array('id'=>$id),'人工复核决定已记录，不自动冻结账号');return;
        }
        if($action==='case_list'){
            $rows=$yxRows('v134_growth_case','SELECT id,subject_id,rule_code,evidence,status,memo,created_by,reviewed_by,created_at FROM '.$yxT('v134_growth_case').' WHERE uniacid=:u ORDER BY id DESC LIMIT 80',array(':u'=>$yxU));
            $reply(true,array('rows'=>$rows?:array()),'');return;
        }
    }
    throw new RuntimeException('未知的增长操作');
}catch(Throwable $e){
    error_log('[YX134] '.$action.' '.get_class($e).' '.$e->getMessage());
    $reply(false,array(),'操作未完成：'.$e->getMessage());
}
