<?php
// Run only against the disposable local qa_ database. Includes the actual admin controller.
$quoted=in_array('--quoted',$_SERVER['argv']??array(),true);
if($quoted){
    // Simulate We7 versions whose tablename() already quotes physical identifiers;
    // only normalize the isolated PDO adapter's identifier and metadata helpers.
    $source=file_get_contents(__DIR__.'/bootstrap.php');
    $source=str_replace("function tablename(\$name){return QA_PREFIX.\$name;}","function tablename(\$name){return '`'.QA_PREFIX.\$name.'`';}",$source);
    $source=str_replace("function qaIdentifier(\$value){", "function qaIdentifier(\$value){\$value=trim((string)\$value,'`');",$source);
    $source=str_replace("array(':n'=>tablename(\$table))", "array(':n'=>trim(tablename(\$table),'`'))",$source);
    $source=str_replace("array(':n'=>tablename(\$table),':c'=>\$field)", "array(':n'=>trim(tablename(\$table),'`'),':c'=>\$field)",$source);
    eval('?>'.$source);
}else require __DIR__.'/bootstrap.php';
if(!defined('IN_IA'))define('IN_IA',true);
const ADMIN_QA_TOKEN='synthetic-local-only-csrf-token';
function checksubmit($name){global $_W,$_GPC;return ($_SERVER['REQUEST_METHOD']??'')==='POST'&&!empty($_GPC[$name])&&is_string($_GPC['token']??null)&&hash_equals((string)($_W['token']??''),(string)$_GPC['token']);}
final class AdminQASite {
    function createWebUrl($name,$args=array()){return './index.php?'.http_build_query(array_merge(array('c'=>'site','a'=>'entry','m'=>'sage_dksy','do'=>$name),$args));}
    function render(){ob_start();try{include qaBackend().'/inc/web/referral150.inc.php';return ob_get_clean();}catch(Throwable $error){ob_end_clean();throw $error;}}
}
function adminRender($input=array(),$role='owner',$method='POST',$tenant=1){
    $GLOBALS['_W']=array('uniacid'=>$tenant,'uid'=>22,'isfounder'=>false,'role'=>$role,'token'=>ADMIN_QA_TOKEN);
    $GLOBALS['_GPC']=$input;$_POST=$method==='POST'?$input:array();$_GET=$method==='GET'?$input:array();$_SERVER['REQUEST_METHOD']=$method;
    return (new AdminQASite())->render();
}
function adminRevision($id,$tenant=1){$html=adminRender(array('campaign_id'=>$id),'owner','GET',$tenant);qaAssert(preg_match('/name="revision" value="([a-f0-9]{64})"/',$html,$m)===1,'actual form exposes revision');return $m[1];}
function adminPayload($action,$id=0,$extra=array(),$tenant=1){return array_merge(array('referral150_save'=>1,'token'=>ADMIN_QA_TOKEN,'action'=>$action,'campaign_id'=>$id,'revision'=>$id?adminRevision($id,$tenant):''),$extra);}
function adminConfig($extra=array()){return array_merge(array('name'=>'QA fixed rewards','inviter_points'=>'10','invitee_points'=>'5','min_sign_days'=>'2','window_days'=>'7','daily_invite_cap'=>'10','daily_budget_coins'=>'100','total_budget_coins'=>'1000','ends_at'=>'','start_mode'=>'now','activate'=>'0','expected_latest'=>'0'),$extra);}
$tests=array();function adminCase($name,$run){global $tests;$tests[$name]=$run;}
adminCase('owner installs only five new tables and never automatically enables campaign',function(){
    qaReset();foreach(array('campaign','day','enrollment','reward','admin_audit')as $suffix)pdo_query('DROP TABLE '.tablename('sage_dksy_v150_referral_'.$suffix));
    $html=adminRender(adminPayload('install'));qaAssert(strpos($html,'邀请奖励数据表已就绪')!==false,'actual installer success');
    foreach(array('campaign','day','enrollment','reward','admin_audit')as $suffix)qaAssert(pdo_tableexists('sage_dksy_v150_referral_'.$suffix),'created '.$suffix);
    qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),0,'no activity automatically enabled');qaEqual(pdo_count('sage_dksy_v150_referral_admin_audit'),1,'installation audit');
    adminRender(adminPayload('install'));qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),0,'reinstall safe');
});
adminCase('manager can view but cannot mutate campaigns',function(){
    qaReset();$id=qaCampaign();$payload=adminPayload('pause',$id);$html=adminRender(array('campaign_id'=>$id),'manager','GET');qaAssert(strpos($html,'当前账号可查看')!==false,'read only UI');
    $html=adminRender($payload,'manager');qaAssert(strpos($html,'只有账号所有者可以')!==false,'write explicitly rejected');qaEqual((int)qaRow('campaign',array('id'=>$id))['enabled'],1,'not paused');qaEqual(pdo_count('sage_dksy_v150_referral_admin_audit'),0,'no manager audit mutation');
});
adminCase('invalid or absent csrf token cannot create activity',function(){
    foreach(array('','bad-synthetic-token')as $token){qaReset();$payload=adminPayload('create',0,adminConfig(array('token'=>$token,'activate'=>'1')));$html=adminRender($payload);qaAssert(strpos($html,'表单校验失败')!==false,'csrf rejected');qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),0,'no activity write');}
});
adminCase('unprivileged role cannot read operator screen',function(){qaReset();$html=adminRender(array(),'operator','GET');qaAssert(strpos($html,'请使用当前站点的所有者或经理账号登录')!==false,'role rejected');qaAssert(strpos($html,'真实金币到账记录')===false,'no financial screen');});
adminCase('owner creates enabled campaign and preserves prior commitments',function(){
    qaReset();$old=qaCampaign(array('reserved_coins'=>15));$before=time();$payload=adminPayload('create',0,adminConfig(array('expected_latest'=>(string)$old,'activate'=>'1')));$html=adminRender($payload);
    qaAssert(strpos($html,'新活动已创建并启用')!==false,'create enabled');qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),2,'one new activity');$prior=qaRow('campaign',array('id'=>$old));qaEqual((int)$prior['enabled'],0,'old closed for new');qaEqual((int)$prior['reserved_coins'],15,'old promise retained');
    $new=qaRow('campaign',array('id'=>$old+1));qaEqual((int)$new['enabled'],1,'new enabled');qaAssert((int)$new['starts_at']>=$before,'cannot backdate');qaEqual((int)$new['invitee_points'],5,'B5');qaEqual((int)$new['inviter_points'],10,'A10');qaEqual(pdo_count('sage_dksy_v150_referral_reward'),0,'create does not award');
});
adminCase('owner pauses only new participation and preserves money counters',function(){
    qaReset();$id=qaCampaign(array('reserved_coins'=>10,'paid_coins'=>5));$html=adminRender(adminPayload('pause',$id));qaAssert(strpos($html,'已停止新参与')!==false,'pause confirmed');$r=qaRow('campaign',array('id'=>$id));qaEqual((int)$r['enabled'],0,'paused');qaEqual((int)$r['public_visible'],0,'not published');qaEqual((int)$r['reserved_coins'],10,'reserved retained');qaEqual((int)$r['paid_coins'],5,'paid retained');
});
adminCase('owner enables only unused draft with a current start',function(){
    qaReset();$id=qaCampaign(array('enabled'=>0,'public_visible'=>0,'starts_at'=>time()-86400));$before=time();$html=adminRender(adminPayload('enable',$id));qaAssert(strpos($html,'活动已启用')!==false,'enabled');$r=qaRow('campaign',array('id'=>$id));qaEqual((int)$r['enabled'],1,'enabled flag');qaAssert((int)$r['starts_at']>=$before,'old draft not backdated');
    qaReset();$id=qaCampaign(array('enabled'=>0,'public_visible'=>0,'reserved_coins'=>15));$html=adminRender(adminPayload('enable',$id));qaAssert(strpos($html,'重新开放请创建新活动')!==false,'used activity cannot reopen');qaEqual((int)qaRow('campaign',array('id'=>$id))['enabled'],0,'still paused');
});
adminCase('stale revision and cross-tenant campaign id cannot be changed',function(){
    qaReset();$id=qaCampaign();$payload=adminPayload('pause',$id);$payload['revision']=str_repeat('a',64);$html=adminRender($payload);qaAssert(strpos($html,'活动配置已经变化')!==false,'stale form rejected');qaEqual((int)qaRow('campaign',array('id'=>$id))['enabled'],1,'stale no pause');
    $payload['revision']=str_repeat('b',64);$html=adminRender($payload,'owner','POST',2);qaAssert(strpos($html,'不属于当前站点')!==false,'other tenant id rejected');qaEqual((int)qaRow('campaign',array('id'=>$id))['enabled'],1,'cross tenant no pause');
});
adminCase('historical daily commitments cannot be lowered and false budget reads cannot save',function(){
    qaReset();$id=qaCampaign(array('reserved_coins'=>30));pdo_insert('sage_dksy_v150_referral_day',array('uniacid'=>1,'campaign_id'=>$id,'day_key'=>qaDay(),'reserved_coins'=>30,'paid_coins'=>0));
    $payload=adminPayload('save',$id,adminConfig(array('daily_budget_coins'=>'20')));$html=adminRender($payload);qaAssert(strpos($html,'预算不能降低')!==false,'cannot reduce below historical commitment');qaEqual((int)qaRow('campaign',array('id'=>$id))['daily_budget_coins'],1000,'budget retained');
    $payload=adminPayload('save',$id,adminConfig(array('daily_budget_coins'=>'50')));QA::$falsePattern='/SELECT COALESCE\(MAX\(reserved_coins\+paid_coins\),0\)/i';$html=adminRender($payload);qaAssert(QA::$falseHits>0,'fault hit');QA::$falsePattern=null;qaAssert(strpos($html,'无法核实活动与预算状态')!==false,'unknown read explicit error');qaEqual((int)qaRow('campaign',array('id'=>$id))['daily_budget_coins'],1000,'false not zero');qaEqual(pdo_count('sage_dksy_v150_referral_admin_audit'),0,'failed save no audit mutation');
});
adminCase('PDO exception details do not leak into administrative HTML',function(){
    qaReset();$payload=adminPayload('create',0,adminConfig());$secret='SYNTHETIC_SQL_CREDENTIAL_MUST_NOT_APPEAR';QA::$queryHook=function($sql)use($secret){if(strpos($sql,'COALESCE(MAX(id),0)')!==false)throw new PDOException($secret);};$html=adminRender($payload);QA::$queryHook=null;
    qaAssert(strpos($html,$secret)===false,'no raw database detail');qaAssert(strpos($html,'操作暂未完成')!==false||strpos($html,'奖励数据暂时无法读取')!==false,'safe message');qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),0,'failed read no create');
});
adminCase('broken ledger receipt is marked for reconciliation without forged payout',function(){
    qaReset();$id=qaCampaign();pdo_insert('sage_dksy_v150_referral_reward',array('uniacid'=>1,'campaign_id'=>$id,'enrollment_id'=>9,'referee_key'=>str_repeat('a',64),'stage'=>'inviter_retention','beneficiary_id'=>1,'beneficiary_openid'=>'qa-A','coins'=>10,'ledger_log_id'=>999999,'created_at'=>time()));
    $html=adminRender(array('campaign_id'=>$id),'owner','GET');qaAssert(strpos($html,'流水待核对')!==false,'missing real ledger marked');qaEqual(pdo_count('sage_dksy_num_log'),0,'view never manufactures ledger');
});
adminCase('explicit false begin or commit prevents admin configuration mutation',function(){
    foreach(array('failBegin','failCommit')as $fault){qaReset();$payload=adminPayload('create',0,adminConfig());QA::$$fault=true;$html=adminRender($payload);QA::$$fault=false;qaEqual(pdo_count('sage_dksy_v150_referral_campaign'),0,'failed transaction no campaign '.$fault);qaEqual(pdo_count('sage_dksy_v150_referral_admin_audit'),0,'failed transaction no audit '.$fault);qaAssert(strpos($html,'无法开启事务')!==false||strpos($html,'事务提交未确认')!==false,'transaction failure visible');}
});
if($quoted){$selected=array_slice($tests,0,1,true);$tests=$selected;}
$report=array('scope'=>'Disposable MariaDB, actual admin include with synthetic sessions; never production','runtime'=>PHP_VERSION,'quoted_identifiers'=>$quoted,'cases'=>array());
foreach($tests as $name=>$run){try{$run();$report['cases'][]=array('name'=>$name,'status'=>'passed');echo 'PASS '.$name."\n";}catch(Throwable $e){if(QA::$pdo->inTransaction())QA::$pdo->rollBack();$report['cases'][]=array('name'=>$name,'status'=>'failed','error'=>$e->getMessage());echo 'FAIL '.$name.': '.$e->getMessage()."\n";}}
$report['passed']=count(array_filter($report['cases'],function($r){return $r['status']==='passed';}));$report['total']=count($report['cases']);$report['failed']=$report['total']-$report['passed'];$report['status']=$report['failed']?'failed':'passed';
file_put_contents(__DIR__.($quoted?'/admin-quoted-report.json':'/admin-integration-report.json'),json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n");
echo json_encode(array('status'=>$report['status'],'passed'=>$report['passed'],'failed'=>$report['failed'],'total'=>$report['total']))."\n";
exit($report['failed']?1:0);
