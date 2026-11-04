<?php
// Loads actual application methods with only the framework base class stubbed.
require_once __DIR__.'/host.php';
if(!defined('IA_ROOT'))define('IA_ROOT',dirname(qaBackend(),2));
if(!defined('TIMESTAMP'))define('TIMESTAMP',time());
if(!class_exists('WeModuleWxapp',false)){class WeModuleWxapp {}}
$GLOBALS['_W']['siteroot']='https://qa.invalid/';
require_once qaBackend().'/wxapp.php';
class TestProductionHost extends Sage_dksyModuleWxapp {
    protected function v150Now(){return QA::$now;}
}
function qaProductionHost($openid='qa-B'){
    // A synthetic server signing key exercises the real private authentication.
    $GLOBALS['_W']['account']=array('key'=>'wx_qa_synthetic','secret'=>'qa-only-synthetic-signing-secret-20261104');
    $GLOBALS['_W']['config']=array('setting'=>array('authkey'=>'qa-only-synthetic-authkey'));
    $h=new TestProductionHost();
    $method=new ReflectionMethod(Sage_dksyModuleWxapp::class,'safeToken');
    $GLOBALS['_GPC']=array('safe_token'=>$method->invoke($h,$openid));
    return $h;
}
