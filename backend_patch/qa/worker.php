<?php
require __DIR__.'/host.php';
$GLOBALS['_W']=array('uniacid'=>(int)($argv[4]??1));$GLOBALS['_GPC']=array();
QA::$now=(int)($argv[2]??QA::$now);$start=(float)($argv[3]??0);
while($start>0&&microtime(true)<$start)usleep(1000);
try{$result=qaHost($argv[1]??'qa-B')->v150ProcessUser($argv[1]??'qa-B');echo json_encode(array('ok'=>true,'state'=>$result['state']))."\n";}
catch(Throwable $e){fwrite(STDERR,get_class($e).': '.$e->getMessage()."\n");echo json_encode(array('ok'=>false))."\n";exit(1);}
