<?php
/** 元享V14运营核对：旧业务全部只读；唯一写入V13.5独立巡检快照和V13.2操作审计。PHP7.2。 */
defined('IN_IA') or exit('Access Denied');
$yx14Action=(string)$_GPC['yx14_api'];
$yx14Respond=function($ok,$data=array(),$message=''){
    if(!headers_sent())header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok'=>(bool)$ok,'data'=>$data,'message'=>$message),JSON_UNESCAPED_UNICODE|JSON_PARTIAL_OUTPUT_ON_ERROR);
};
$yx14Has=function($table,$fields=array()) use($yxExists,$yxField){
    if(!$yxExists($table))return false;
    foreach(array_merge(array('uniacid'),$fields) as $f)if(!$yxField($table,$f))return false;
    return true;
};
$yx14Query=function($table,$sql,$params,$fields=array())use($yx14Has,$yxNum){
    if(!$yx14Has($table,$fields))return array('value'=>null,'status'=>'unavailable','reason'=>'表或字段未接入');
    $n=$yxNum($table,$sql,$params);
    return array('value'=>$n,'status'=>$n===null?'unavailable':'ok','reason'=>$n===null?'查询失败，请查看PHP日志':'');
};
$yx14List=function($table,$sql,$params,$fields=array())use($yx14Has,$yxRows){
    if(!$yx14Has($table,$fields))return array('rows'=>array(),'status'=>'unavailable','reason'=>'表或字段未接入');
    $r=$yxRows($table,$sql,$params);
    return array('rows'=>$r===null?array():$r,'status'=>$r===null?'unavailable':'ok','reason'=>$r===null?'查询失败，请查看PHP日志':'');
};
$yx14Day=(new DateTimeImmutable('today',new DateTimeZone('Asia/Shanghai')))->getTimestamp();
$yx14Params=array(':u'=>$yxU);
$yx14Links=array(
    'orders'=>html_entity_decode($this->createWebUrl('manage13',array('section'=>'orders')),ENT_QUOTES,'UTF-8'),
    'shipping'=>html_entity_decode($this->createWebUrl('work13',array('section'=>'shipping')),ENT_QUOTES,'UTF-8'),
    'messages'=>html_entity_decode($this->createWebUrl('catalog13',array('section'=>'messages')),ENT_QUOTES,'UTF-8'),
    'reward'=>html_entity_decode($this->createWebUrl('reward'),ENT_QUOTES,'UTF-8'),
    'finance'=>$yxUrl('finance'), 'relations'=>$yxUrl('relations'), 'inspection'=>$yxUrl('inspection')
);
$yx14Ledger=function()use($yx14Query,$yx14Has,$yxT,$yxU,$yx14Params){
    $u=$yx14Params;$rows=array();
    $rows[]=array('key'=>'balance_total','label'=>'用户当前金币余额总计','unit'=>'金币','scope'=>'当前用户余额，不能当作已核实的全部负债','result'=>$yx14Query('user','SELECT COALESCE(SUM(num),0) FROM '.$yxT('user').' WHERE uniacid=:u',$u,array('num')));
    $rows[]=array('key'=>'negative_users','label'=>'金币余额为负的账户','unit'=>'人','scope'=>'负余额为异常线索，不自动调整','result'=>$yx14Query('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND num<0',$u,array('num')));
    $rows[]=array('key'=>'settled_tasks','label'=>'已到账视频任务数','unit'=>'条','scope'=>'仅现有激励视频任务','result'=>$yx14Query('v12_reward_task',"SELECT COUNT(*) FROM ".$yxT('v12_reward_task')." WHERE uniacid=:u AND status='settled'",$u,array('status')));
    $rows[]=array('key'=>'settled_coins','label'=>'已到账视频任务金币累计','unit'=>'金币','scope'=>'不等于全部签到/成长发币','result'=>$yx14Query('v12_reward_task',"SELECT COALESCE(SUM(coins),0) FROM ".$yxT('v12_reward_task')." WHERE uniacid=:u AND status='settled'",$u,array('status','coins')));
    $rows[]=array('key'=>'negative_task','label'=>'奖励任务非法负数','unit'=>'条','scope'=>'核查异常记录，不自动补发','result'=>$yx14Query('v12_reward_task',"SELECT COUNT(*) FROM ".$yxT('v12_reward_task')." WHERE uniacid=:u AND coins<0",$u,array('coins')));
    $rows[]=array('key'=>'pending_task','label'=>'待核验任务','unit'=>'条','scope'=>'不触发客户端完播信号补币','result'=>$yx14Query('v12_reward_task',"SELECT COUNT(*) FROM ".$yxT('v12_reward_task')." WHERE uniacid=:u AND status='pending_verification'",$u,array('status')));
    if($yx14Has('v12_reward_task',array('request_id','status'))){
        $rows[]=array('key'=>'repeated_requests','label'=>'重复已到账请求号','unit'=>'组','scope'=>'同一请求号出现多笔已到账任务的核查线索','result'=>$yx14Query('v12_reward_task',"SELECT COUNT(*) FROM (SELECT request_id FROM ".$yxT('v12_reward_task')." WHERE uniacid=:u AND status='settled' AND request_id IS NOT NULL AND request_id<>'' GROUP BY request_id HAVING COUNT(*)>1) a",$u,array('request_id','status')));
    }else{
        $rows[]=array('key'=>'repeated_requests','label'=>'奖励幂等跨表核查','unit'=>'—','scope'=>'当前表无已核实的请求唯一键映射，不能声称无重复发币','result'=>array('value'=>null,'status'=>'unavailable','reason'=>'请求键映射待核实'));
    }
    return array('items'=>$rows,'overall'=>'unverified','notice'=>'尚无全来源金币账本、兑换扣币、回退及未兑付负债的完整映射，因此不是总账已核平的结论。');
};
$yx14Workflow=function()use($yx14Query,$yx14List,$yx14Params,$yxT,$yxU,$yx14Has,$yx14Links){
    $u=$yx14Params;
    $orders=$yx14Query('order','SELECT COUNT(*) FROM '.$yxT('order').' WHERE uniacid=:u AND isyes=0',$u,array('isyes'));
    $messages=$yx14Query('dy','SELECT COUNT(*) FROM '.$yxT('dy').' WHERE uniacid=:u AND issend=0 AND isyes=0',$u,array('issend','isyes'));
    $stocks=$yx14Query('prize','SELECT COUNT(*) FROM '.$yxT('prize').' WHERE uniacid=:u AND prize_num<=3',$u,array('prize_num'));
    $olist=$yx14List('order','SELECT id,isyes FROM '.$yxT('order').' WHERE uniacid=:u AND isyes=0 ORDER BY id DESC LIMIT 20',$u,array('id','isyes'));
    $mlist=$yx14List('dy','SELECT id,issend,isyes FROM '.$yxT('dy').' WHERE uniacid=:u AND issend=0 AND isyes=0 ORDER BY id DESC LIMIT 20',$u,array('id','issend','isyes'));
    return array('totals'=>array('orders'=>$orders,'messages'=>$messages,'stock'=>$stocks),'orders'=>$olist,'messages'=>$mlist,'links'=>$yx14Links,
        'note'=>'订阅记录不等于可发送额度，不能擅自重复发送；订单操作进入现有受权限控制的发货页面，避免另建结算接口。');
};
$yx14Revenue=function()use($yx14Query,$yxT,$yx14Params,$yx14Has){
    $u=$yx14Params;
    $valid=$yx14Has('v134_growth_finance',array('status','kind','amount_fen'));
    $inc=$valid?$yx14Query('v134_growth_finance',"SELECT COALESCE(SUM(amount_fen),0) FROM ".$yxT('v134_growth_finance')." WHERE uniacid=:u AND status='approved' AND kind='ad_settled'",$u,array('status','kind','amount_fen')):array('value'=>null,'status'=>'unavailable','reason'=>'缺少复核凭据表');
    $exp=$valid?$yx14Query('v134_growth_finance',"SELECT COALESCE(SUM(amount_fen),0) FROM ".$yxT('v134_growth_finance')." WHERE uniacid=:u AND status='approved' AND kind<>'ad_settled'",$u,array('status','kind','amount_fen')):array('value'=>null,'status'=>'unavailable','reason'=>'缺少复核凭据表');
    $pending=$valid?$yx14Query('v134_growth_finance',"SELECT COUNT(*) FROM ".$yxT('v134_growth_finance')." WHERE uniacid=:u AND status='pending'",$u,array('status')):array('value'=>null,'status'=>'unavailable','reason'=>'缺少复核凭据表');
    $net=($inc['value']!==null&&$exp['value']!==null)?$inc['value']-$exp['value']:null;
    return array('income_fen'=>$inc,'expense_fen'=>$exp,'pending'=>$pending,'difference_fen'=>$net,'verified_official'=>false,'source'=>'仅经双人复核的人工财务凭据','notice'=>'未直连腾讯结算接口；差额不是经审计利润。金币潜在负债及商品实际履约成本可能尚未全覆盖。');
};
$yx14Checks=function()use($yx14Ledger,$yx14Workflow,$yx14Revenue,$yx14Has,$yx14Query,$yx14Params,$yxT){
    $ledger=$yx14Ledger();$workflow=$yx14Workflow();$revenue=$yx14Revenue();$rows=array();
    foreach(array(array('orders','待处理订单','orders'),array('messages','待处理订阅登记','messages'),array('stock','库存预警','stock')) as $m){
        $r=$workflow['totals'][$m[0]];
        $rows[]=array('key'=>$m[0],'name'=>$m[1],'status'=>$r['value']===null?'unknown':($r['value']>0?'attention':'ok'),'detail'=>$r['value']===null?$r['reason']:('当前'.$r['value'].'条，需在对应管理页处理'));
    }
    foreach($ledger['items'] as $r)if(in_array($r['key'],array('negative_users','negative_task','repeated_requests','pending_task'),true)){
        $n=$r['result']['value'];$rows[]=array('key'=>$r['key'],'name'=>$r['label'],'status'=>$n===null?'unknown':($n>0?'attention':'ok'),'detail'=>$n===null?$r['result']['reason']:('核对结果 '.$n.'，不自动改余额'));
    }
    $rows[]=array('key'=>'ledger_global','name'=>'全来源金币总账','status'=>'unknown','detail'=>'缺少可靠的全账本及兑换债务映射，尚未核平');
    $rows[]=array('key'=>'tencent_settlement','name'=>'腾讯广告实际结算','status'=>'unknown','detail'=>'没有腾讯官方授权数据直连；人工凭据不得充当自动对账');
    $n=$revenue['pending']['value'];$rows[]=array('key'=>'finance_pending','name'=>'待复核财务凭据','status'=>$n===null?'unknown':($n>0?'attention':'ok'),'detail'=>$n===null?'复核数据不可用':('待审核 '.$n.' 条'));
    $counts=array('ok'=>0,'attention'=>0,'unknown'=>0);foreach($rows as $row)$counts[$row['status']]++;
    return array('checks'=>$rows,'counts'=>$counts,'time'=>(new DateTimeImmutable('now',new DateTimeZone('Asia/Shanghai')))->format('Y-m-d H:i:s'),'mode'=>'只读检查，状态不等于会计核平');
};
$yx14IsPost=($_SERVER['REQUEST_METHOD']??'GET')==='POST';
try{
    if($yx14Action==='ledger'){$yx14Respond(true,$yx14Ledger());return;}
    if($yx14Action==='workflow'){$yx14Respond(true,$yx14Workflow());return;}
    if($yx14Action==='revenue'){$yx14Respond(true,$yx14Revenue());return;}
    if($yx14Action==='checks'){$yx14Respond(true,$yx14Checks());return;}
    if($yx14Action==='dashboard'){
        $w=$yx14Workflow();$f=$yx14Revenue();$checks=$yx14Checks();
        $yx14Respond(true,array('totals'=>$w['totals'],'finance'=>$f,'counts'=>$checks['counts'],'links'=>$yx14Links,'note'=>'所有数据仅来自当前站点实际表；未对账项目单独提示。'));return;
    }
    if($yx14Action==='schedule'){
        $ready=$yx14Has('v135_ops_snapshot',array('request_id','inspected_at','ok_count','attention_count','unknown_count','actor_id'));
        $rows=array();$ran=false;
        if($ready){
            $r=$yx14List('v135_ops_snapshot','SELECT id,request_id,inspected_at,ok_count,attention_count,unknown_count,actor_id FROM '.$yxT('v135_ops_snapshot').' WHERE uniacid=:u ORDER BY id DESC LIMIT 12',$yx14Params,array('id','request_id','inspected_at','ok_count','attention_count','unknown_count','actor_id'));
            $rows=$r['rows'];$key='YX14DAY_'.gmdate('Ymd',$yx14Day+28800).'_'.$yxU;
            foreach($rows as $line)if($line['request_id']===$key)$ran=true;
        }
        $yx14Respond(true,array('ready'=>$ready,'today_done'=>$ran,'rows'=>$rows,'type'=>'后台管理员访问触发；非服务器无人值守定时任务'));return;
    }
    if($yx14Action==='acceptance'){
        $capabilities=array(
            array('功能'=>'原广告播放与金币结算','state'=>'保持不动','note'=>'本版没有覆盖客户端广告或既有金币发放函数'),
            array('功能'=>'签到、兑换、订单原路径','state'=>'保持不动','note'=>'数据只读核查、已有发货页面跳转'),
            array('功能'=>'一级推广关系','state'=>'保持不动','note'=>'基于既有归属与后台审计'),
            array('功能'=>'订阅发送可靠性','state'=>'待真机验收','note'=>'只读查询待处理，未自动代发'),
            array('功能'=>'头像上传','state'=>'待真实上传验收','note'=>'可写目录不等于真实接口已成功'),
            array('功能'=>'完整金币账本','state'=>'未对接','note'=>'已实现局部异常检测，不能宣称总账平衡'),
            array('功能'=>'腾讯广告官方结算','state'=>'未对接','note'=>'仅能显示双人复核人工财务凭据'),
            array('功能'=>'每日巡检','state'=>'访问触发','note'=>'管理员打开页面时每日最多留存一次；未配置独立定时服务'),
            array('功能'=>'一级固定金币奖励','state'=>'独立配置','note'=>'请进入真实邀请奖励管理核对活动、承诺预算和到账流水；本巡检不启用活动')
        );
        $yx14Respond(true,array('items'=>$capabilities,'status'=>'上线前必须再做正式站数据库和微信真机验收'));return;
    }
    if($yx14Action!=='snapshot_today')throw new RuntimeException('无效操作');
    if(!$yx14IsPost||!$yxOwner||!function_exists('checksubmit')||!checksubmit('yx14_save'))throw new RuntimeException('需要站点所有者权限及有效表单令牌');
    if(!$yx14Has('v135_ops_snapshot',array('request_id','result_json','ok_count','attention_count','unknown_count','actor_id','inspected_at'))||!$yx14Has('v132_growth_audit',array('action','ref_id','detail','actor_id','created_at')))throw new RuntimeException('请先在原V13.5巡检中心初始化快照审计表');
    $req='YX14DAY_'.gmdate('Ymd',$yx14Day+28800).'_'.$yxU;
    $previous=pdo_get('sage_dksy_v135_ops_snapshot',array('uniacid'=>$yxU,'request_id'=>$req),array('id'));
    if($previous){$yx14Respond(true,array('id'=>(int)$previous['id'],'duplicate'=>true),'今日巡检已留存，不会重复写入');return;}
    $scan=$yx14Checks();$serialized=json_encode($scan,JSON_UNESCAPED_UNICODE|JSON_PARTIAL_OUTPUT_ON_ERROR);
    if(!$serialized||strlen($serialized)>60000)throw new RuntimeException('巡检结果编码异常');
    pdo_begin();try{
        if(!pdo_insert('sage_dksy_v135_ops_snapshot',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'request_id'=>$req,'result_json'=>$serialized,'ok_count'=>$scan['counts']['ok'],'attention_count'=>$scan['counts']['attention'],'unknown_count'=>$scan['counts']['unknown'],'inspected_at'=>time())))throw new RuntimeException('快照写入失败');
        $id=(int)pdo_insertid();
        if(!pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>'v14_daily_audit','ref_id'=>$id,'detail'=>'V14单日管理员访问触发的只读巡检快照','created_at'=>time())))throw new RuntimeException('审计写入失败');
        pdo_commit();
    }catch(Throwable $ex){pdo_rollback();throw $ex;}
    $yx14Respond(true,array('id'=>$id,'duplicate'=>false),'今日巡检已留存；未更改任何旧业务表');
}catch(Throwable $e){error_log('[YX14] '.$yx14Action.' '.get_class($e).' '.$e->getMessage());$yx14Respond(false,array(),'操作未完成；请检查当前站点数据结构和后台错误日志');}
