<?php
// Isolated integration adapter for a disposable MariaDB database. Never loads private server config.
error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');
const QA_PREFIX='qa_';
final class QA {
    public static $pdo;
    public static $now;
    public static $failLedger=false;
    public static $failBalance=false;
    public static $failReferralLedger=false;
    public static $queryHook=null;
    public static $failBegin=false;
    public static $failCommit=false;
    public static $transactionReturnNull=false;
    public static $queries=[];
    public static $falsePattern=null;
    public static $falseHits=0;
}
$qaDsn=getenv('YX_QA_DSN') ?: 'mysql:host=yx-referral-db;dbname=yx_referral_test;charset=utf8mb4';
QA::$pdo=new PDO($qaDsn,getenv('YX_QA_DB_USER') ?: 'root',getenv('YX_QA_DB_PASS') ?: 'local-only-referral-it-20261104',array(PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>true));
QA::$now=strtotime('2026-11-04 14:00:00 +0800');
function qaIdentifier($value){if(!is_string($value)||!preg_match('/^[A-Za-z0-9_]+$/',$value))throw new RuntimeException('Invalid test SQL identifier');return '`'.$value.'`';}
function tablename($name){return QA_PREFIX.$name;}
function qaStatement($sql,$params=array()){
    QA::$queries[]=$sql;
    if(is_callable(QA::$queryHook))call_user_func(QA::$queryHook,$sql,$params);
    if(QA::$failBalance && preg_match('/^\s*UPDATE\s+`?'.QA_PREFIX.'sage_dksy_user`?\s+SET\s+num\s*=\s*num\s*\+/i',$sql))throw new RuntimeException('Injected wallet-write failure');
    $s=QA::$pdo->prepare($sql);$s->execute($params);return $s;
}
function qaReturnFalse($sql){if(QA::$falsePattern&&preg_match(QA::$falsePattern,$sql)){QA::$falseHits++;return true;}return false;}
function pdo_fetch($sql,$params=array()){if(qaReturnFalse($sql))return false; $r=qaStatement($sql,$params)->fetch();return $r===false?false:$r; }
function pdo_fetchall($sql,$params=array(),$keyfield=''){if(qaReturnFalse($sql))return false; $rows=qaStatement($sql,$params)->fetchAll();if($keyfield){$out=array();foreach($rows as $r)$out[$r[$keyfield]]=$r;return $out;}return $rows; }
function pdo_fetchcolumn($sql,$params=array(),$column=0){if(qaReturnFalse($sql))return false;return qaStatement($sql,$params)->fetchColumn($column);}
function pdo_query($sql,$params=array()){return qaStatement($sql,$params)->rowCount();}
function qaWhere($where,&$params){if(!$where)return '1=1';$clauses=array();foreach($where as $field=>$value){$k=':w'.count($params);if($value===null)$clauses[]=qaIdentifier($field).' IS NULL';else{$clauses[]=qaIdentifier($field).'='.$k;$params[$k]=$value;}}return implode(' AND ',$clauses);}
function qaFields($fields){return is_array($fields)&&count($fields)?implode(',',array_map('qaIdentifier',$fields)):($fields==='*'||!$fields?'*':$fields);}
function pdo_get($table,$where=array(),$fields=array(),$keyfield='',$orderby=array(),$limit=array()){
    $params=array();$sql='SELECT '.qaFields($fields).' FROM '.qaIdentifier(tablename($table)).' WHERE '.qaWhere($where,$params);
    if($orderby){$sql.=' ORDER BY '.(is_array($orderby)?implode(',',$orderby):$orderby);}
    return pdo_fetch($sql.' LIMIT 1',$params);
}
function pdo_getall($table,$where=array(),$fields=array(),$keyfield='',$orderby=array(),$limit=array()){
    $params=array();$sql='SELECT '.qaFields($fields).' FROM '.qaIdentifier(tablename($table)).' WHERE '.qaWhere($where,$params);
    if($orderby)$sql.=' ORDER BY '.(is_array($orderby)?implode(',',$orderby):$orderby);
    if($limit)$sql.=' LIMIT '.implode(',',array_map('intval',(array)$limit));
    return pdo_fetchall($sql,$params,$keyfield);
}
function pdo_insert($table,$data=array(),$replace=false){
    if($table==='sage_dksy_num_log'&&(QA::$failLedger||(QA::$failReferralLedger&&preg_match('/邀请新人|一级推广/',(string)($data['title']??'')))))return false;
    $fields=array();$holders=array();$params=array();foreach($data as $field=>$value){$fields[]=qaIdentifier($field);$k=':d'.count($params);$holders[]=$k;$params[$k]=$value;}
    qaStatement(($replace?'REPLACE':'INSERT').' INTO '.qaIdentifier(tablename($table)).' ('.implode(',',$fields).') VALUES ('.implode(',',$holders).')',$params);return true;
}
function pdo_insertid(){return (int)QA::$pdo->lastInsertId();}
function pdo_update($table,$data,$where=array()){$params=array();$sets=array();foreach($data as $field=>$value){$k=':d'.count($params);$sets[]=qaIdentifier($field).'='.$k;$params[$k]=$value;}return pdo_query('UPDATE '.qaIdentifier(tablename($table)).' SET '.implode(',',$sets).' WHERE '.qaWhere($where,$params),$params);}
function pdo_delete($table,$where=array()){$params=array();return pdo_query('DELETE FROM '.qaIdentifier(tablename($table)).' WHERE '.qaWhere($where,$params),$params);}
function pdo_count($table,$where=array()){$params=array();return (int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.qaIdentifier(tablename($table)).' WHERE '.qaWhere($where,$params),$params);}
function pdo_tableexists($table){return (int)pdo_fetchcolumn('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:n',array(':n'=>tablename($table)))===1;}
function pdo_fieldexists($table,$field){return (int)pdo_fetchcolumn('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:n AND COLUMN_NAME=:c',array(':n'=>tablename($table),':c'=>$field))===1;}
function pdo_begin(){if(QA::$failBegin)return false;$result=QA::$pdo->beginTransaction();return QA::$transactionReturnNull?null:$result;}
function pdo_commit(){if(QA::$failCommit)return false;$result=QA::$pdo->commit();return QA::$transactionReturnNull?null:$result;}
function pdo_rollback(){return QA::$pdo->inTransaction()?QA::$pdo->rollBack():false;}
function qaAssert($condition,$message){if(!$condition)throw new RuntimeException($message);}
function qaEqual($actual,$expected,$message){if($actual!==$expected)throw new RuntimeException($message.' expected='.json_encode($expected).' actual='.json_encode($actual));}
function qaDay($ts=null){return (int)(floor((($ts===null?QA::$now:$ts)+28800)/86400)*86400-28800);}
function qaBackend(){return getenv('YX_QA_BACKEND_ROOT') ?: dirname(__DIR__).'/addons/sage_dksy';}
function qaReset(){
    if(QA::$pdo->inTransaction())QA::$pdo->rollBack();
    QA::$failLedger=false;QA::$failBalance=false;QA::$failReferralLedger=false;QA::$queryHook=null;QA::$failBegin=false;QA::$failCommit=false;QA::$transactionReturnNull=false;QA::$queries=array();QA::$falsePattern=null;QA::$falseHits=0;
    QA::$now=strtotime('2026-11-04 14:00:00 +0800');
    foreach(pdo_fetchall('SHOW TABLES') as $r){$name=(string)reset($r);if(strpos($name,QA_PREFIX)===0)pdo_query('DROP TABLE '.qaIdentifier($name));}
    $schemas=array(
      'sage_dksy_user'=>"id int unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,fromid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '',createtime int unsigned NOT NULL,num bigint NOT NULL DEFAULT 0,nickname varchar(80) NOT NULL DEFAULT '',qian_num int NOT NULL DEFAULT 0,qian_total int NOT NULL DEFAULT 0,PRIMARY KEY(id),UNIQUE KEY uq_user(uniacid,openid)",
      'sage_dksy_qian'=>"id bigint unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,datetime int unsigned NOT NULL,num int NOT NULL DEFAULT 0,PRIMARY KEY(id),KEY ix_sign(uniacid,openid,datetime)",
      'sage_dksy_num_log'=>"id bigint unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,openid varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,num int NOT NULL,`static` tinyint NOT NULL,title varchar(255) NOT NULL,createtime int unsigned NOT NULL,PRIMARY KEY(id)",
      'sage_dksy_v11_relation_audit'=>"id bigint unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,user_id int unsigned NOT NULL,old_inviter_id int unsigned NULL,new_inviter_id int unsigned NOT NULL,action varchar(40) NOT NULL,reason varchar(255) NOT NULL DEFAULT '',actor varchar(80) NOT NULL DEFAULT '',visit_id bigint unsigned NOT NULL DEFAULT 0,result varchar(20) NOT NULL,created_at int unsigned NOT NULL,PRIMARY KEY(id),KEY ix_binding(uniacid,user_id,action)",
      'sage_dksy_set'=>"id int unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,day_on tinyint NOT NULL DEFAULT 0,day1 int NOT NULL DEFAULT 10,day2 int NOT NULL DEFAULT 20,day3 int NOT NULL DEFAULT 30,day4 int NOT NULL DEFAULT 40,day5 int NOT NULL DEFAULT 50,day6 int NOT NULL DEFAULT 60,day7 int NOT NULL DEFAULT 70,days int NOT NULL DEFAULT 80,PRIMARY KEY(id)",
      'sage_dksy_template'=>"id int unsigned NOT NULL AUTO_INCREMENT,uniacid int unsigned NOT NULL,isyes tinyint NOT NULL DEFAULT 0,PRIMARY KEY(id)"
    );
    foreach($schemas as $name=>$body)pdo_query('CREATE TABLE '.qaIdentifier(tablename($name)).' ('.$body.') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $new=require qaBackend().'/class/referral150/schema.php';
    foreach($new as $name=>$sql)pdo_query(sprintf($sql,qaIdentifier(tablename($name))));
    $GLOBALS['_W']=array('uniacid'=>1,'uid'=>1,'isfounder'=>true,'role'=>'owner');$GLOBALS['_GPC']=array();
}
function qaCampaign($overrides=array()){
    $r=array('uniacid'=>1,'name'=>'QA invite retention','enabled'=>1,'public_visible'=>1,'inviter_points'=>10,'invitee_points'=>5,'min_sign_days'=>2,'window_days'=>7,'starts_at'=>qaDay()-86400,'ends_at'=>qaDay()+30*86400,'daily_invite_cap'=>10,'daily_budget_coins'=>1000,'total_budget_coins'=>10000,'reserved_coins'=>0,'paid_coins'=>0,'created_by'=>1,'created_at'=>QA::$now,'updated_at'=>QA::$now);
    pdo_insert('sage_dksy_v150_referral_campaign',array_merge($r,$overrides));return pdo_insertid();
}
function qaUser($id,$openid,$fromid='',$registered=null,$tenant=1,$balance=0){pdo_insert('sage_dksy_user',array('id'=>$id,'uniacid'=>$tenant,'openid'=>$openid,'fromid'=>$fromid,'createtime'=>$registered===null?qaDay()+3600:$registered,'num'=>$balance,'nickname'=>'QA member '.$id));}
function qaBoundPair($registered=null,$tenant=1,$aid=1,$bid=2,$a='qa-A',$b='qa-B'){
    $registered=$registered===null?qaDay()+3600:$registered;
    qaUser($aid,$a,'',$registered-86400,$tenant);qaUser($bid,$b,$a,$registered,$tenant);
    pdo_insert('sage_dksy_v11_relation_audit',array('uniacid'=>$tenant,'user_id'=>$bid,'old_inviter_id'=>null,'new_inviter_id'=>$aid,'action'=>'new_bind','reason'=>'QA actual visit receipt','actor'=>'qa','visit_id'=>1,'result'=>'ok','created_at'=>$registered+30));
    return array('a'=>$a,'b'=>$b,'aid'=>$aid,'bid'=>$bid,'audit_id'=>pdo_insertid());
}
function qaSign($openid,$day=null,$tenant=1){pdo_insert('sage_dksy_qian',array('uniacid'=>$tenant,'openid'=>$openid,'datetime'=>$day===null?qaDay():$day,'num'=>10));}
function qaBalance($openid,$tenant=1){return (int)pdo_fetchcolumn('SELECT num FROM '.qaIdentifier(tablename('sage_dksy_user')).' WHERE uniacid=:u AND openid=:o',array(':u'=>$tenant,':o'=>$openid));}
function qaRow($name,$where=array()){return pdo_get('sage_dksy_v150_referral_'.$name,$where);}
