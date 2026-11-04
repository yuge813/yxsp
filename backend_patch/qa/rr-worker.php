<?php
require __DIR__.'/host.php';
$GLOBALS['_W']=array('uniacid'=>1);$GLOBALS['_GPC']=array();
QA::$now=(int)$argv[1];$marker=(string)$argv[2];$signReads=0;
QA::$queryHook=function($sql,$params)use($marker,&$signReads){
    if(strpos($sql,'FROM '.QA_PREFIX.'sage_dksy_qian')!==false&&strpos($sql,'information_schema')===false)$signReads++;
    if(strpos($sql,'ORDER BY id ASC FOR UPDATE')!==false&&strpos($sql,'sage_dksy_user')!==false&&(int)($params[':b']??0)===3){
        file_put_contents($marker,json_encode(array('prior_sign_reads'=>$signReads,'c_user_lock_requested'=>true)));
    }
};
try{$result=qaHost('qa-A')->v150ProcessUser('qa-A');echo json_encode(array('ok'=>true,'state'=>$result['state']))."\n";}
catch(Throwable $e){fwrite(STDERR,get_class($e).': '.$e->getMessage()."\n");exit(1);}
