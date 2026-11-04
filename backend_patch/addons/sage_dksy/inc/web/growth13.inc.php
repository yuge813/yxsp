<?php
/**
 * 元享 V13.4.0 用户增长运营闭环，基于稳定 V13.3.2 增量升级。
 * 仅替换旧控制器，保持 site.php/已存在的 V11 邀请与金币接口不变。
 * 默认页面不执行任何业务表 SQL；查询通过独立 JSON 请求进行。
 * PHP 7.2 兼容。
 */
defined('IN_IA') or exit('Access Denied');
global $_W, $_GPC;
$yxU = isset($_W['uniacid']) ? (int)$_W['uniacid'] : 0;
$yxUid = isset($_W['uid']) ? (int)$_W['uid'] : 0;
$yxRole = isset($_W['role']) ? (string)$_W['role'] : '';
$yxOwner = !empty($_W['isfounder']) || $yxRole === 'owner';
$yxCanView = $yxOwner || $yxRole === 'manager';
if (!$yxU || !$yxUid || !$yxCanView) {
    echo '<main style="margin:60px auto;max-width:680px;font:16px sans-serif">此账号没有该站点增长管理权限。</main>';
    return;
}
$yxTabs = array('overview'=>'增长总览','relations'=>'一级邀请关系','newcomers'=>'新人成长','budget'=>'预算模拟','finance'=>'成本核算','health'=>'经营驾驶舱','inspection'=>'系统巡检','segments'=>'留存分析','risk'=>'风控检查','compliance'=>'合规发布','operations14'=>'经营总控','ledger14'=>'金币核查','workflow14'=>'订单与订阅','automation14'=>'巡检计划','acceptance14'=>'上线验收','triage141'=>'问题处理台','coverage141'=>'账本覆盖核查');
$yxTab = isset($_GPC['section']) ? (string)$_GPC['section'] : 'overview';
if (!isset($yxTabs[$yxTab])) $yxTab = 'overview';
$yxH = function($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); };
$yxUrl = function($section) { return html_entity_decode($this->createWebUrl('growth13', array('section'=>$section)), ENT_QUOTES, 'UTF-8'); };
$yxRoot = $yxUrl($yxTab);
$yxT = function($suffix) { return tablename('sage_dksy_'.$suffix); };
$yxField = function($suffix,$field) { try {return function_exists('pdo_fieldexists') && (bool)pdo_fieldexists('sage_dksy_'.$suffix, $field);}catch(Throwable $e){return false;} };
$yxExists = function($suffix) {
    try {return function_exists('pdo_tableexists') && (bool)pdo_tableexists('sage_dksy_'.$suffix);}
    catch (Throwable $e) {error_log('[YX1322] table check '.$suffix.' '.$e->getMessage());return false;}
};
$yxNum = function($suffix, $sql, $params) use($yxExists) {
    if (!$yxExists($suffix)) return null;
    try {$v = pdo_fetchcolumn($sql, $params);return is_numeric($v)?(int)$v:null;}
    catch (Throwable $e) {error_log('[YX1322] metric '.$suffix.' '.$e->getMessage());return null;}
};
$yxRows = function($suffix, $sql, $params) use($yxExists) {
    if (!$yxExists($suffix)) return null;
    try {$result = pdo_fetchall($sql,$params);return is_array($result)?$result:null;}
    catch (Throwable $e) {error_log('[YX1322] list '.$suffix.' '.$e->getMessage());return null;}
};
$yxSend = function($payload) {
    if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_PARTIAL_OUTPUT_ON_ERROR);
};
// V14.1 业务处理与来源核对接口：独立处理台账，旧业务保持不动。
if (isset($_GPC['yx141_api']) && (string)$_GPC['yx141_api'] !== '') {
    try {
        $file141=__DIR__.'/growth13_v141_api.inc.php';
        if (!is_file($file141)) throw new RuntimeException('V14.1 接口未部署');
        require $file141;
    } catch (Throwable $e) {
        error_log('[YX141] api '.get_class($e).' '.$e->getMessage());
        $yxSend(array('ok'=>false,'data'=>array(),'message'=>'V14.1 处理接口异常，请检查PHP日志'));
    }
    return;
}
// V14 综合运营审计 API。不同操作均通过管理员登录校验，旧业务表保持只读。
if (isset($_GPC['yx14_api']) && (string)$_GPC['yx14_api'] !== '') {
    try {
        $yx14File=__DIR__ . '/growth13_v14_api.inc.php';
        if(!is_file($yx14File)) throw new RuntimeException('V14 运营接口文件未安装');
        require $yx14File;
    } catch (Throwable $e) {
        error_log('[YX14] api '.get_class($e).' '.$e->getMessage());
        $yxSend(array('ok'=>false,'message'=>'V14 接口异常，旧业务没有被改动，请检查部署文件和PHP日志','data'=>array()));
    }
    return;
}
// V13.5 隔离式经营/巡检接口。只有经过管理员身份检查才会进入。
if (isset($_GPC['yx135_api']) && (string)$_GPC['yx135_api'] !== '') {
    try {
        $yx135ApiFile=__DIR__ . '/growth13_v135_api.inc.php';
        if (!is_file($yx135ApiFile)) throw new RuntimeException('V13.5 经营接口文件未安装');
        require $yx135ApiFile;
    } catch (Throwable $e) {
        error_log('[YX135] '.get_class($e).' '.$e->getMessage());
        $yxSend(array('ok'=>false,'message'=>'经营模块未完整部署，请检查四个覆盖文件','data'=>array()));
    }
    return;
}
// V13.4独立读写接口：不影响已验证的V13.3.2分项统计和配置流程。
if (isset($_GPC['yx134_api']) && (string)$_GPC['yx134_api'] !== '') {
    try {
        $yx134ApiFile=__DIR__ . '/growth13_v134_api.inc.php';
        if (!is_file($yx134ApiFile)) throw new RuntimeException('增长扩展接口文件未安装');
        require $yx134ApiFile;
    } catch (Throwable $e) {
        error_log('[YX134] extension '.$e->getMessage());
        if(!headers_sent()) header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('ok'=>false,'message'=>'增长扩展尚未完整部署，请检查覆盖文件','data'=>array()), JSON_UNESCAPED_UNICODE);
    }
    return;
}
$yxApi = isset($_GPC['yx132_api']) ? (string)$_GPC['yx132_api'] : '';
if ($yxApi !== '') {
    // JSON 请求单独运行，避免 SQL 错误中断整个后台 HTML 页面。
    $result = array('ok'=>true,'data'=>array(),'message'=>'');
    // 统一北京时间自然日边界，与原增长统计一致。
    $today = (new DateTimeImmutable('today', new DateTimeZone('Asia/Shanghai')))->getTimestamp();
    $end = $today+86400;
    try {
        if ($yxApi === 'metric') {
            // 所有指标各走一次独立请求。某个旧表/字段/查询失败不会拖垮其他指标。
            $metric = isset($_GPC['yx132_metric']) ? (string)$_GPC['yx132_metric'] : '';
            $allowed = array('all','new','invited','today_invited','visits','signed7',
                             'today_bound','new7','effective7','d1','d7','trend');
            if (!in_array($metric,$allowed,true)) throw new RuntimeException('未知统计项目');
            $qStart = $today - 6*86400;
            $requirements = array(
                'all'=>array('user'=>array('uniacid')),
                'new'=>array('user'=>array('uniacid','createtime')),
                'invited'=>array('user'=>array('uniacid','fromid')),
                'today_invited'=>array('user'=>array('uniacid','createtime','fromid')),
                'visits'=>array('v11_visit'=>array('uniacid','created_at')),
                'signed7'=>array('qian'=>array('uniacid','openid','datetime')),
                'today_bound'=>array('v11_relation_audit'=>array('uniacid','user_id','action','result','created_at')),
                'new7'=>array('user'=>array('uniacid','createtime')),
                'effective7'=>array('user'=>array('uniacid','createtime','fromid','openid','id'),'qian'=>array('uniacid','openid','datetime')),
                'd1'=>array('user'=>array('uniacid','id','createtime','openid'),'qian'=>array('uniacid','openid','datetime')),
                'd7'=>array('user'=>array('uniacid','id','createtime','openid'),'qian'=>array('uniacid','openid','datetime')),
                'trend'=>array('user'=>array('uniacid','createtime'))
            );
            $reason = '';
            foreach ($requirements[$metric] as $tbl=>$columns) {
                if (!$yxExists($tbl)) { $reason='数据表不可用：'.$tbl; break; }
                foreach($columns as $col) {
                    if (function_exists('pdo_fieldexists') && !$yxField($tbl,$col)) { $reason='字段未接入：'.$tbl.'.'.$col; break 2; }
                }
            }
            $value=null; $base=null;
            $p=array(':u'=>$yxU);
            if ($reason==='') {
                try {
                    switch($metric) {
                        case 'all':
                            $value=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u',$p); break;
                        case 'new':
                            $value=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',array(':u'=>$yxU,':s'=>$today,':e'=>$end)); break;
                        case 'invited':
                            $value=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND fromid IS NOT NULL AND fromid<>'' AND fromid<>'0'",$p);break;
                        case 'today_invited':
                            $value=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND createtime>=:s AND createtime<:e AND fromid IS NOT NULL AND fromid<>'' AND fromid<>'0'",array(':u'=>$yxU,':s'=>$today,':e'=>$end));break;
                        case 'visits':
                            $value=$yxNum('v11_visit','SELECT COUNT(*) FROM '.$yxT('v11_visit').' WHERE uniacid=:u AND created_at>=:s AND created_at<:e',array(':u'=>$yxU,':s'=>$today,':e'=>$end));break;
                        case 'signed7':
                            $value=$yxNum('qian','SELECT COUNT(DISTINCT openid) FROM '.$yxT('qian').' WHERE uniacid=:u AND `datetime`>=:s AND `datetime`<:e',array(':u'=>$yxU,':s'=>$qStart,':e'=>$end));break;
                        case 'today_bound':
                            $value=$yxNum('v11_relation_audit',"SELECT COUNT(DISTINCT user_id) FROM ".$yxT('v11_relation_audit')." WHERE uniacid=:u AND action='new_bind' AND result='ok' AND created_at>=:s AND created_at<:e",array(':u'=>$yxU,':s'=>$today,':e'=>$end));break;
                        case 'new7':
                            $value=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',array(':u'=>$yxU,':s'=>$qStart,':e'=>$end));break;
                        case 'trend':
                            // 兼容旧微擎 SQL/PDO：不依赖 GROUP BY FLOOR(...) 聚合。
                            // 逐日复用已稳定的 COUNT 查询，避免趋势聚合异常牵连整张表。
                            $hasAttr=$yxField('user','fromid');
                            $trend=array();$failedDays=0;
                            for($i=6;$i>=0;$i--){
                                $dayStart=$today-$i*86400;
                                $dayEnd=$dayStart+86400;
                                $dayParams=array(':u'=>$yxU,':s'=>$dayStart,':e'=>$dayEnd);
                                $dayTotal=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',$dayParams);
                                $dayAttr=null;
                                if($hasAttr){
                                    $dayAttr=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND createtime>=:s AND createtime<:e AND fromid IS NOT NULL AND fromid<>'' AND fromid<>'0'",$dayParams);
                                }
                                if($dayTotal===null || ($hasAttr&&$dayAttr===null)) $failedDays++;
                                $trend[]=array('daykey'=>(int)floor(($dayStart+28800)/86400),
                                               'registered'=>$dayTotal,'attributed'=>$dayAttr);
                            }
                            $value=$trend;
                            if($failedDays>0) $reason='近7天有'.$failedDays.'天查询失败；仅对应日期显示—';
                            if(!$hasAttr && !$failedDays) $reason='新增人数已读取；邀请归因字段不存在';
                            break;
                        case 'effective7':
                        case 'd1':
                        case 'd7':
                            // 不把 varchar 日期或空样本伪装成“真实留存为零”。
                            $sample=pdo_fetchcolumn('SELECT `datetime` FROM '.$yxT('qian').' WHERE uniacid=:u ORDER BY `datetime` DESC LIMIT 1',$p);
                            if (!is_numeric($sample) || (float)$sample<1000000000 || (float)$sample>=5000000000) {
                                $reason='签到日期不是有效秒级时间戳，或暂无签到记录';break;
                            }
                            if($metric==='effective7'){
                                $sql="SELECT COUNT(*) FROM (SELECT u.id FROM ".$yxT('user')." u INNER JOIN ".$yxT('qian')." q ON q.uniacid=u.uniacid AND q.openid=u.openid WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e AND u.fromid IS NOT NULL AND u.fromid<>'' AND u.fromid<>'0' AND q.datetime>=(FLOOR((u.createtime+28800)/86400)*86400-28800) AND q.datetime<:qend GROUP BY u.id HAVING COUNT(DISTINCT FLOOR((q.datetime+28800)/86400))>=2) a";
                                $value=$yxNum('qian',$sql,array(':u'=>$yxU,':s'=>$qStart,':e'=>$end,':qend'=>$end));
                            } else {
                                // D1: 昨天注册、今天签到；D7: 七天前注册、今天签到。
                                $offset=$metric==='d1'?1:7;
                                $s=$today-$offset*86400;
                                $base=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',array(':u'=>$yxU,':s'=>$s,':e'=>$s+86400));
                                if($base===null){$reason='注册样本查询失败';break;}
                                if($base===0){$reason=$metric==='d1'?'昨日无新注册用户':'7天前无新注册用户';$base=0;break;}
                                $rows=$yxRows('qian','SELECT COUNT(DISTINCT u.id) AS kept_n FROM '.$yxT('user').' u INNER JOIN '.$yxT('qian').' q ON q.uniacid=u.uniacid AND q.openid=u.openid AND q.`datetime`>=:q0 AND q.`datetime`<:q1 WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e',array(':u'=>$yxU,':s'=>$s,':e'=>$s+86400,':q0'=>$today,':q1'=>$end));
                                if(is_array($rows)&&isset($rows[0])&&is_numeric($rows[0]['kept_n'])){
                                    $value=round(100*(int)$rows[0]['kept_n']/$base,1);
                                }else{$reason='签到样本查询失败';}
                            }
                            break;
                    }
                } catch (Throwable $e) {
                    error_log('[YX1332] metric '.$metric.' '.$e->getMessage());
                    $reason='该指标查询异常'; $value=null;
                }
            }
            if ($reason==='' && $value===null) $reason='数据库查询暂不可用';
            $result['data']=array('metric'=>$metric,'value'=>$value,'base'=>$base,'reason'=>$reason);
        } elseif ($yxApi === 'stats') {
            $p=array(':u'=>$yxU);
            $newParams=array(':u'=>$yxU,':start'=>$today,':end'=>$end);
            $all=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u',$p);
            $new=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:start AND createtime<:end',$newParams);
            $inv=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND fromid IS NOT NULL AND fromid<>''",$p);
            $todayInv=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." WHERE uniacid=:u AND createtime>=:start AND createtime<:end AND fromid IS NOT NULL AND fromid<>''",$newParams);
            $visit=$yxNum('v11_visit','SELECT COUNT(*) FROM '.$yxT('v11_visit').' WHERE uniacid=:u AND created_at>=:start AND created_at<:end',$newParams);
            $active=$yxNum('qian','SELECT COUNT(DISTINCT openid) FROM '.$yxT('qian').' WHERE uniacid=:u AND datetime>=:start AND datetime<:end',array(':u'=>$yxU,':start'=>$today-6*86400,':end'=>$end));

            // 最近7日新增趋势，来源仅限当前站点真实注册表。
            $trend=$yxRows('user', "SELECT FLOOR((createtime+28800)/86400) AS daykey, COUNT(*) AS registered, SUM(CASE WHEN fromid IS NOT NULL AND fromid<>'' THEN 1 ELSE 0 END) AS attributed FROM ".$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e GROUP BY FLOOR((createtime+28800)/86400) ORDER BY daykey ASC', array(':u'=>$yxU,':s'=>$today-6*86400,':e'=>$end));
            $todayBound=$yxNum('v11_relation_audit', 'SELECT COUNT(DISTINCT user_id) FROM '.$yxT('v11_relation_audit')." WHERE uniacid=:u AND action='new_bind' AND result='ok' AND created_at>=:s AND created_at<:e", array(':u'=>$yxU,':s'=>$today,':e'=>$end));
            $new7=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND createtime>=:s AND createtime<:e',array(':u'=>$yxU,':s'=>$today-6*86400,':e'=>$end));
            $effective=null; $retention=array('d1'=>null,'d7'=>null,'d1_base'=>null,'d7_base'=>null);
            // 只有原签到日期为Unix秒数时才计算留存，避免varchar日期误算为0%。
            $qianCompatible=$yxExists('qian') && $yxField('qian','openid') && $yxField('qian','datetime');
            if($qianCompatible){
                try { $sample=pdo_fetchcolumn('SELECT `datetime` FROM '.$yxT('qian').' WHERE uniacid=:u ORDER BY `datetime` DESC LIMIT 1',array(':u'=>$yxU));$qianCompatible=is_numeric($sample) && (float)$sample>=1000000000 && (float)$sample<5000000000; }catch(Throwable $e){$qianCompatible=false;}
            }
            if($qianCompatible && $yxExists('user')) {
                $effective=$yxNum('qian', "SELECT COUNT(*) FROM (SELECT u.id FROM ".$yxT('user')." u INNER JOIN ".$yxT('qian')." q ON q.uniacid=u.uniacid AND q.openid=u.openid WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e AND u.fromid IS NOT NULL AND u.fromid<>'' AND q.datetime>=(FLOOR((u.createtime+28800)/86400)*86400-28800) AND q.datetime<:e2 GROUP BY u.id HAVING COUNT(DISTINCT FLOOR((q.datetime+28800)/86400))>=2) a",array(':u'=>$yxU,':s'=>$today-6*86400,':e'=>$end,':e2'=>$end));
                foreach(array(1=>'d1',7=>'d7') as $offset=>$key){
                    // 仅成熟cohort：D1=前天注册且昨天签到；D7=八天前注册且第7个完整日签到。
                    $s=$today-($offset+1)*86400;
                    $counts=$yxRows('qian','SELECT COUNT(DISTINCT u.id) AS base_n, COUNT(DISTINCT CASE WHEN q.openid IS NOT NULL THEN u.id ELSE NULL END) AS kept_n FROM '.$yxT('user').' u LEFT JOIN '.$yxT('qian').' q ON q.uniacid=u.uniacid AND q.openid=u.openid AND q.datetime>=:q0 AND q.datetime<:q1 WHERE u.uniacid=:u AND u.createtime>=:s AND u.createtime<:e',array(':u'=>$yxU,':s'=>$s,':e'=>$s+86400,':q0'=>$s+$offset*86400,':q1'=>$s+($offset+1)*86400));
                    if($counts!==null && isset($counts[0]) && (int)$counts[0]['base_n']>0){$retention[$key.'_base']=(int)$counts[0]['base_n'];$retention[$key]=round(100*(int)$counts[0]['kept_n']/max(1,(int)$counts[0]['base_n']),1);}
                }
            }
            $result['data']=array('all'=>$all,'new'=>$new,'invited'=>$inv,'today_invited'=>$todayInv,'visits'=>$visit,'signed7'=>$qianCompatible?$active:null,'today_bound'=>$todayBound,'new7'=>$new7,'effective7'=>$effective,'retention'=>$retention,'trend'=>$trend);
        } elseif ($yxApi==='relations') {
            $list=$yxRows('v11_relation_audit','SELECT id,user_id,new_inviter_id,action,result,created_at FROM '.$yxT('v11_relation_audit').' WHERE uniacid=:u ORDER BY id DESC LIMIT 40',array(':u'=>$yxU));
            $result['data']=array('rows'=>$list);
        } elseif ($yxApi==='risk') {
            $list=$yxRows('v11_relation_audit',"SELECT new_inviter_id,COUNT(*) AS count_1d FROM ".$yxT('v11_relation_audit')." WHERE uniacid=:u AND action='new_bind' AND result='ok' AND created_at>=:s AND new_inviter_id IS NOT NULL GROUP BY new_inviter_id HAVING COUNT(*)>=6 ORDER BY count_1d DESC LIMIT 30",array(':u'=>$yxU,':s'=>time()-86400));

            $self=$yxNum('user', 'SELECT COUNT(*) FROM '.$yxT('user')." WHERE uniacid=:u AND fromid=openid AND fromid IS NOT NULL AND fromid<>''",array(':u'=>$yxU));
            $orphan=$yxNum('user',"SELECT COUNT(*) FROM ".$yxT('user')." child LEFT JOIN ".$yxT('user')." parent ON parent.uniacid=child.uniacid AND parent.openid=child.fromid WHERE child.uniacid=:u AND child.fromid IS NOT NULL AND child.fromid<>'' AND parent.id IS NULL",array(':u'=>$yxU));
            // 最近审查记录只记录审核操作，不封禁、不调整推广关系。
            $history=$yxRows('v132_growth_audit', 'SELECT actor_id,action,ref_id,detail,created_at FROM '.$yxT('v132_growth_audit')." WHERE uniacid=:u AND action='risk_review' ORDER BY id DESC LIMIT 25",array(':u'=>$yxU));
            $result['data']=array('rows'=>$list,'self'=>$self,'orphan'=>$orphan,'reviews'=>$history);
        } elseif ($yxApi==='config') {
            $names=array('v132_growth_policy','v132_growth_campaign','v132_growth_audit');
            $missing=array();foreach($names as $n)if(!$yxExists($n))$missing[]=$n;
            $ready=!$missing;
            $policy=null;$campaigns=array();$audits=array();
            if($ready) {
                try {
                    $policy=pdo_get('sage_dksy_v132_growth_policy',array('uniacid'=>$yxU));
                    $campaigns=pdo_fetchall('SELECT id,name,mode,status,creator,reviewer,created_at FROM '.$yxT('v132_growth_campaign').' WHERE uniacid=:u ORDER BY id DESC LIMIT 30',array(':u'=>$yxU));
                    $audits=pdo_fetchall('SELECT actor_id,action,ref_id,detail,created_at FROM '.$yxT('v132_growth_audit').' WHERE uniacid=:u ORDER BY id DESC LIMIT 15',array(':u'=>$yxU));
                } catch(Throwable $e) {error_log('[YX1322] config '.$e->getMessage());$result['message']='配置读取异常';}
            }
            $result['data']=array('ready'=>$ready,'missing'=>$missing,'policy'=>$policy,'campaigns'=>is_array($campaigns)?array_values($campaigns):array(),'audits'=>is_array($audits)?array_values($audits):array(),'owner'=>$yxOwner);
        } elseif ($yxApi==='save') {
            if (($_SERVER['REQUEST_METHOD'] ?? 'GET')!=='POST') throw new RuntimeException('只允许 POST');
            // 审批要求独立管理员：经理账号可复核草稿，但无权修改预算或发币。
            $requestedAction = isset($_GPC['yx132_action']) ? (string)$_GPC['yx132_action'] : '';
            $requestedNext = isset($_GPC['next_status']) ? (string)$_GPC['next_status'] : '';
            $canSecondReview = ($yxRole === 'manager' && $requestedAction === 'transition' && $requestedNext === 'reviewed');
            if(!$yxOwner && !$canSecondReview)throw new RuntimeException('需要站点所有者或授权复核人员权限');
            if (!function_exists('checksubmit')) throw new RuntimeException('页面令牌校验不可用');
            $action=isset($_GPC['yx132_action'])?(string)$_GPC['yx132_action']:'';
            if(!in_array($action,array('init','budget','draft','transition','risk_review'),true))throw new RuntimeException('无效操作');
            if(!checksubmit('yx132_save'))throw new RuntimeException('表单校验失败，请刷新页面');
            $names=array('v132_growth_policy','v132_growth_campaign','v132_growth_audit');
            if($action==='init') {
                $schema=array(
                    'CREATE TABLE IF NOT EXISTS '.$yxT('v132_growth_policy').' (`uniacid` int unsigned NOT NULL,`day_budget_fen` bigint unsigned NOT NULL DEFAULT 0,`total_budget_fen` bigint unsigned NOT NULL DEFAULT 0,`user_cap_fen` int unsigned NOT NULL DEFAULT 0,`expected_new` int unsigned NOT NULL DEFAULT 0,`effective_pct` tinyint unsigned NOT NULL DEFAULT 0,`expected_7d_pct` tinyint unsigned NOT NULL DEFAULT 0,`updated_by` int unsigned NOT NULL DEFAULT 0,`updated_at` int unsigned NOT NULL DEFAULT 0,PRIMARY KEY (`uniacid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
                    'CREATE TABLE IF NOT EXISTS '.$yxT('v132_growth_campaign').' (`id` bigint unsigned NOT NULL AUTO_INCREMENT,`uniacid` int unsigned NOT NULL,`name` varchar(80) NOT NULL,`mode` varchar(12) NOT NULL DEFAULT \'A\',`status` varchar(20) NOT NULL DEFAULT \'draft\',`creator` int unsigned NOT NULL,`reviewer` int unsigned NOT NULL DEFAULT 0,`created_at` int unsigned NOT NULL,`updated_at` int unsigned NOT NULL,PRIMARY KEY (`id`),KEY `idx_tenant_status` (`uniacid`,`status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
                    'CREATE TABLE IF NOT EXISTS '.$yxT('v132_growth_audit').' (`id` bigint unsigned NOT NULL AUTO_INCREMENT,`uniacid` int unsigned NOT NULL,`actor_id` int unsigned NOT NULL,`action` varchar(40) NOT NULL,`ref_id` bigint unsigned NOT NULL DEFAULT 0,`detail` varchar(300) NOT NULL DEFAULT \'\',`created_at` int unsigned NOT NULL,PRIMARY KEY (`id`),KEY `idx_tenant_time` (`uniacid`,`created_at`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
                foreach($schema as $sql){if(pdo_query($sql)===false)throw new RuntimeException('初始化失败');}
                $result['message']='配置表已初始化（没有修改旧金币和订单表）';
            } else {
                foreach($names as $n)if(!$yxExists($n))throw new RuntimeException('请先初始化配置表');
                if($action==='budget') {
                    $limits=array('day_budget_fen'=>10000000000,'total_budget_fen'=>100000000000,'user_cap_fen'=>100000000,'expected_new'=>1000000,'effective_pct'=>100,'expected_7d_pct'=>100);$values=array();
                    foreach($limits as $k=>$limit){$s=isset($_GPC[$k])?trim((string)$_GPC[$k]):'';if(!preg_match('/^[0-9]{1,12}$/',$s)||(float)$s>$limit)throw new RuntimeException('预算或比例格式无效');$values[$k]=(int)$s;}
                    if($values['day_budget_fen']>$values['total_budget_fen'])throw new RuntimeException('单日预算不能超过总预算');
                    $values['updated_by']=$yxUid;$values['updated_at']=time();$old=pdo_get('sage_dksy_v132_growth_policy',array('uniacid'=>$yxU));
                    pdo_begin();try{$ok=$old?pdo_update('sage_dksy_v132_growth_policy',$values,array('uniacid'=>$yxU)):pdo_insert('sage_dksy_v132_growth_policy',$values+array('uniacid'=>$yxU));if($ok===false)throw new RuntimeException('保存失败');$ok=pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>'budget_simulation','ref_id'=>0,'detail'=>'预算模拟，不启用真奖励','created_at'=>time()));if(!$ok)throw new RuntimeException('审计失败');pdo_commit();}catch(Throwable $e){pdo_rollback();throw $e;}
                    $result['message']='预算模拟已保存；本页不发奖，实际固定金币活动请进入真实邀请奖励管理';
                } elseif($action==='draft') {
                    $name=isset($_GPC['campaign_name'])?trim((string)$_GPC['campaign_name']):'';
                    $mode=isset($_GPC['campaign_mode'])?(string)$_GPC['campaign_mode']:'A';
                    if($name===''||strlen($name)>180||!in_array($mode,array('A','B'),true))throw new RuntimeException('活动名称或类型不合规');
                    pdo_begin();try{$ok=pdo_insert('sage_dksy_v132_growth_campaign',array('uniacid'=>$yxU,'name'=>$name,'mode'=>$mode,'status'=>'draft','creator'=>$yxUid,'reviewer'=>0,'created_at'=>time(),'updated_at'=>time()));if(!$ok)throw new RuntimeException('草稿保存失败');$id=(int)pdo_insertid();$ok=pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>'campaign_draft','ref_id'=>$id,'detail'=>'活动草稿，不产生推广返佣','created_at'=>time()));if(!$ok)throw new RuntimeException('审计写入失败');pdo_commit();}catch(Throwable $e){pdo_rollback();throw $e;}
                    $result['message']='活动草稿已保存（不会发放金币）';
                } elseif($action==='risk_review') {
                    // 风控为可追溯的人工复核建议，不改变用户余额、冻结状态或关系归属。
                    $subject=isset($_GPC['subject_id'])?(int)$_GPC['subject_id']:0;
                    $decision=isset($_GPC['decision'])?(string)$_GPC['decision']:'';
                    $memo=isset($_GPC['memo'])?trim((string)$_GPC['memo']):'';
                    if($subject<=0 || !in_array($decision,array('monitor','cleared','reviewed'),true) || $memo==='' || strlen($memo)>160)throw new RuntimeException('人工复核信息不完整');
                    $existsUser=$yxNum('user','SELECT COUNT(*) FROM '.$yxT('user').' WHERE uniacid=:u AND id=:id',array(':u'=>$yxU,':id'=>$subject));
                    if($existsUser!==1)throw new RuntimeException('对应站点会员不存在');
                    if(!pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>'risk_review','ref_id'=>$subject,'detail'=>$decision.' | '.$memo,'created_at'=>time())))throw new RuntimeException('复核日志写入失败');
                    $result['message']='人工复核已记录，不自动封禁用户';
                } elseif($action==='transition') {
                    $id=isset($_GPC['campaign_id'])?(int)$_GPC['campaign_id']:0;
                    $next=isset($_GPC['next_status'])?(string)$_GPC['next_status']:'';
                    $old=$id>0?pdo_get('sage_dksy_v132_growth_campaign',array('uniacid'=>$yxU,'id'=>$id)):false;
                    $allowed=$old && (($old['status']==='draft'&&$next==='pending') || ($old['status']==='pending'&&$next==='reviewed'&&(int)$old['creator']!==$yxUid) || ($old['status']==='reviewed'&&$next==='archived'));
                    if(!$allowed)throw new RuntimeException('流程状态或审批权限不符合要求');
                    pdo_begin();try{
                        $ok=pdo_update('sage_dksy_v132_growth_campaign',array('status'=>$next,'reviewer'=>$next==='reviewed'?$yxUid:(int)$old['reviewer'],'updated_at'=>time()),array('uniacid'=>$yxU,'id'=>$id,'status'=>$old['status']));
                        if($ok!==1)throw new RuntimeException('活动状态发生变化，请刷新');
                        $ok=pdo_insert('sage_dksy_v132_growth_audit',array('uniacid'=>$yxU,'actor_id'=>$yxUid,'action'=>'campaign_'.$next,'ref_id'=>$id,'detail'=>'仅变更活动记录，不执行金币奖励','created_at'=>time()));
                        if(!$ok)throw new RuntimeException('审计写入失败');pdo_commit();
                    }catch(Throwable $e){pdo_rollback();throw $e;}
                    $result['message']='草稿审核记录已更新；本页不启用奖励，固定金币活动由真实邀请奖励管理独立配置';
                }
            }
        } else {throw new RuntimeException('未知请求');}
    } catch (Throwable $e) {
        error_log('[YX1322] api '.$yxApi.' '.get_class($e).' '.$e->getMessage());
        $result=array('ok'=>false,'data'=>array(),'message'=>'操作暂不可用，请查看网站PHP错误日志或检查站点权限');
    }
    $yxSend($result);
    return;
}
// 从这里起只输出 HTML，无任何数据库查询；六个标签不会因统计SQL错误变白。
$yxBack = html_entity_decode($this->createWebUrl('ops13'), ENT_QUOTES, 'UTF-8');
$yxJsonUrl = json_encode($yxRoot, JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_AMP|JSON_HEX_QUOT);
$yxJsonToken = json_encode(isset($_W['token'])?$_W['token']:'', JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_AMP|JSON_HEX_QUOT);
?>
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>元享 · 用户增长</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#20232a;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif}a{text-decoration:none}.page{max-width:1470px;padding:24px 26px 50px;margin:auto}.header,.card,.stat,.nav{background:#fff;border:1px solid #e8eaed;border-radius:12px}.header{padding:15px 20px;display:flex;align-items:center;justify-content:space-between}.brand{font-weight:750;color:#a10f32;font-size:19px}.toplink{color:#9d2444}.title{display:flex;gap:20px;align-items:center;justify-content:space-between;margin:25px 0 15px}.title h1{margin:0;font-size:25px}.sub{margin:3px 0 0;color:#667085;font-size:13px}.tag{background:#f9eaee;border-radius:20px;padding:6px 12px;color:#9d2444;font-size:12px}.nav{display:flex;flex-wrap:wrap;gap:6px;padding:10px;margin-bottom:16px}.nav a{color:#344054;padding:9px 13px;border-radius:8px}.nav a.active{background:#a10f32;color:#fff}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.stat{padding:18px}.stat label{color:#667085}.stat strong{display:block;font-size:30px;margin-top:4px}.card{padding:22px;margin:15px 0}.card h2{font-size:19px;margin:0 0 9px}.muted{color:#667085}.alert{border:1px solid #e9bdc9;background:#fff2f4;color:#8e1735;padding:12px 14px;border-radius:8px}.ok{background:#edf8ef;color:#166534;padding:12px 14px;border-radius:8px}.data{overflow-x:auto;width:100%}table{width:100%;border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid #edf0f4;padding:12px;text-align:left;white-space:nowrap}th{background:#f7f8fa;color:#667085}.btn{cursor:pointer;border:0;border-radius:8px;background:#a10f32;color:#fff;padding:11px 18px;font-size:14px}.btn:disabled{opacity:.5}.fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.field label{display:block;font-size:14px;margin-bottom:4px}.field input,.field select{border:1px solid #d9dee5;border-radius:8px;padding:10px 12px;font-size:15px;width:100%}.mini{font-size:12px;color:#8c95a1}.model{margin-top:14px;padding:14px;background:#fff8fa;border-radius:8px;color:#7a2035}.stat small{display:block;font-size:12px;margin-top:4px}.tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.fields{grid-template-columns:repeat(2,1fr)}}@media(max-width:550px){.page{padding:12px}.title{flex-direction:column;align-items:flex-start}.grid{grid-template-columns:1fr 1fr;gap:8px}.stat{padding:12px}.fields{grid-template-columns:1fr}.nav a{font-size:13px}}
.yx14more{position:relative}.yx14more summary{cursor:pointer;list-style:none;color:#344054;padding:9px 13px;border-radius:8px}.yx14more summary:hover{background:#f5f6f8}.yx14moreContent{position:absolute;top:42px;right:0;width:300px;z-index:40;display:grid;grid-template-columns:repeat(2,1fr);gap:5px;padding:11px;background:#fff;border:1px solid #e8eaed;border-radius:10px;box-shadow:0 12px 30px rgba(31,35,41,.12)}.yx14moreContent a{padding:9px!important}.yx14more[open] summary{background:#fff1f4;color:#a10f32}@media(max-width:600px){.yx14moreContent{right:auto;left:0;width:min(300px,80vw)}}</style></head><body><div class="page"><div class="header"><strong class="brand">元享 · 经营管理平台</strong><a class="toplink" href="<?php echo $yxH($yxBack);?>">返回稳定运营总览 ›</a></div><div class="title"><div><h1><?php echo $yxH($yxTabs[$yxTab]);?></h1><p class="sub">V14.1 · 站点 <?php echo (int)$yxU;?> · 一级邀请 · 数据延迟加载</p></div><span class="tag">固定金币奖励请进入真实邀请管理</span></div>
<nav class="nav" aria-label="元享统一运营导航"><a href="<?php echo $yxH(html_entity_decode($this->createWebUrl('referral150'),ENT_QUOTES,'UTF-8'));?>">真实邀请奖励</a><?php
$yxMainTabs=array('operations14','ledger14','workflow14','automation14','acceptance14','triage141','coverage141','overview','relations','finance');
foreach($yxMainTabs as $key): if(!isset($yxTabs[$key]))continue;?><a href="<?php echo $yxH($yxUrl($key));?>" class="<?php echo $key===$yxTab?'active':'';?>"><?php echo $yxH($yxTabs[$key]);?></a><?php endforeach;?>
<details class="yx14more"><summary>更多运营工具</summary><div class="yx14moreContent"><?php foreach($yxTabs as $key=>$label): if(in_array($key,$yxMainTabs,true))continue;?><a href="<?php echo $yxH($yxUrl($key));?>" class="<?php echo $key===$yxTab?'active':'';?>"><?php echo $yxH($label);?></a><?php endforeach;?></div></details></nav>
<div id="notification" aria-live="polite"></div><p class="mini" id="metricDiagnostics" aria-live="polite"></p>
<?php if($yxTab==='overview'):?>
<div class="grid"><div class="stat"><label>用户总数</label><strong data-val="all">—</strong></div><div class="stat"><label>今日新增</label><strong data-val="new">—</strong></div><div class="stat"><label>累计一级归属</label><strong data-val="invited">—</strong></div><div class="stat"><label>今日归因新增*</label><strong data-val="today_invited">—</strong></div><div class="stat"><label>今日邀请链接访问</label><strong data-val="visits">—</strong></div><div class="stat"><label>近7天签到用户</label><strong data-val="signed7">—</strong></div><div class="stat"><label>今日新绑定</label><strong data-val="today_bound">—</strong></div><div class="stat"><label>近7日新增用户</label><strong data-val="new7">—</strong></div><div class="stat"><label>近7日有效归属*</label><strong data-val="effective7">—</strong></div></div>
<div class="card"><h2>近7天新增与邀请来源</h2><p class="muted">按真实注册时间统计；邀请归属人数与严格绑定当日人数分开展示。</p><div class="data"><table><thead><tr><th>日期</th><th>新增用户</th><th>有邀请归属的新用户</th></tr></thead><tbody id="trendRows"><tr><td colspan="3">加载中…</td></tr></tbody></table></div></div>
<div class="card"><h2>留存与有效归属</h2><div class="grid"><div class="stat"><label>次日签到留存</label><strong id="retentionD1">—</strong><small id="d1Base" class="muted"></small></div><div class="stat"><label>第7日签到留存</label><strong id="retentionD7">—</strong><small id="d7Base" class="muted"></small></div></div><p class="muted">仅以原签到表时间戳核验：次日为昨天注册者今天签到；第7日为七天前注册者今天签到。注册样本不足或签到日期不兼容时显示“—”。*有效归属需近7天新用户且至少两个不同自然日签到，不是金币奖励资格。</p></div>
<div class="card"><h2>统计说明</h2><p class="muted">仅显示真实业务数据。未接入或数据库不可用时显示“—”，不会展示假数字。今日归因新增仅统计今日注册且已有邀请归属的用户；“今日新绑定”按当日绑定审计记录计算。签到用户不代表全部活跃用户。</p></div>
<?php elseif($yxTab==='relations'):?>
<div class="card"><h2>一级关系审计记录</h2><p class="muted">只读历史关系，不改变邀请归属、不补绑。</p><div class="data"><table><thead><tr><th>ID</th><th>被邀请用户</th><th>邀请人</th><th>动作</th><th>结果</th><th>时间戳</th></tr></thead><tbody id="tableRows"><tr><td colspan="6">加载中…</td></tr></tbody></table></div></div>
<?php elseif($yxTab==='newcomers'):?>
<div class="card"><h2>新人成长</h2><p>继续复用小程序已经投入使用的 7 天成长礼遇，<strong>不新建奖励池、不二次发币。</strong></p><p class="muted">第1、2、3、5、7日仅作为成长观察节点，原有签到连续天数和本期7天挑战进度仍按原规则分别计算。</p></div>
<?php elseif($yxTab==='finance'):?>
<?php /* 成本核算的完整内容位于隔离式V13.4视图文件 */ ?>
<?php elseif($yxTab==='risk'):?>
<div class="card"><h2>邀请异常观察</h2><p class="muted">24小时内同一邀请人新增6次或更多绑定，列为人工复核线索，不代表自动封号。</p><div class="data"><table><thead><tr><th>邀请用户 ID</th><th>24小时绑定量</th><th>状态</th></tr></thead><tbody id="tableRows"><tr><td colspan="3">加载中…</td></tr></tbody></table></div><p id="riskIntegrity" class="muted">正在核对关系完整性…</p><h2>人工复核记录</h2><div class="data"><table><thead><tr><th>对象会员ID</th><th>审核员</th><th>复核说明</th><th>时间</th></tr></thead><tbody id="riskReviewRows"><tr><td colspan="4">加载中…</td></tr></tbody></table></div><p class="muted">仅记录人工审查线索，不作自动冻结或扣币。</p></div>
<?php elseif($yxTab==='budget'):?>
<div class="card"><h2>获客预算沙盘</h2><p class="muted">单位为人民币“分”，此处完全模拟，不连接金币、订单或广告实际收入。</p><div id="configStatus" class="muted">正在检查独立配置表…</div><div id="configForms" style="display:none"><div class="fields" style="margin:18px 0">
<?php foreach(array('day_budget_fen'=>'每日预算（分）','total_budget_fen'=>'活动总预算（分）','user_cap_fen'=>'单人上限（分）','expected_new'=>'预计新用户','effective_pct'=>'有效率（%）','expected_7d_pct'=>'7日留存率（%）') as $k=>$title):?><div class="field"><label for="<?php echo $yxH($k);?>"><?php echo $yxH($title);?></label><input type="number" step="1" min="0" id="<?php echo $yxH($k);?>" value="0"></div><?php endforeach;?></div><button class="btn" id="saveBudget">保存模拟参数</button><p id="budgetHint" class="muted"></p><div id="budgetModel" class="model" aria-live="polite"></div></div></div>
<?php elseif($yxTab==='compliance'):?>
<div class="card"><h2>活动草稿与合规管理</h2><p class="alert">此处只有活动草稿与记录，不执行任何真实推广金币奖励。审批操作不能替代微信官方规则核查。</p><div id="configStatus" class="muted">正在检查独立配置表…</div><div id="configForms" style="display:none"><div id="campaignCreator"><div class="fields"><div class="field"><label>活动名称</label><input id="campaign_name" maxlength="60"></div><div class="field"><label>活动类型</label><select id="campaign_mode"><option value="A">A - 无有偿推广</option><option value="B">B - 待合规审核，仅保存草稿</option></select></div></div><p><button class="btn" id="saveDraft">保存活动草稿</button></p></div><div class="data"><table><thead><tr><th>活动</th><th>模式</th><th>状态</th><th>创建人</th><th>操作</th></tr></thead><tbody id="draftRows"></tbody></table></div></div></div>
<?php endif; ?>
<?php try { if(is_file(__DIR__ . '/growth13_v134_view.inc.php')) require __DIR__ . '/growth13_v134_view.inc.php'; else echo '<div class="card">增长扩展视图尚未安装，原有管理页不受影响。</div>'; } catch(Throwable $e){ error_log('[YX134] view '.$e->getMessage()); echo '<div class="card">增长扩展视图暂不可用，原有管理页不受影响。</div>'; } ?>
<?php if (in_array($yxTab,array('operations14','ledger14','workflow14','automation14','acceptance14'),true)): ?>
<?php try {if(is_file(__DIR__.'/growth13_v14_view.inc.php')) require __DIR__.'/growth13_v14_view.inc.php';else echo '<section class="card">V14 视图文件尚未部署。</section>';}catch(Throwable $e){error_log('[YX14] view '.$e->getMessage());echo '<section class="card">V14 运营视图暂不可用，现有管理功能不受影响。</section>';} ?>
<?php endif; ?>
<?php if (in_array($yxTab,array('triage141','coverage141'),true)): ?>
<?php try {if(is_file(__DIR__.'/growth13_v141_view.inc.php')) require __DIR__.'/growth13_v141_view.inc.php';else echo '<section class="card">V14.1 处理视图未完整部署。</section>';}catch(Throwable $e){error_log('[YX141] view '.$e->getMessage());echo '<section class="card">问题处理视图暂不可用，原后台不受影响。</section>';} ?>
<?php endif; ?>
<?php if (in_array($yxTab,array('health','inspection','segments'),true)): ?>
<style>
.yx135Intro{border-color:#edd7de}.yx135Action{display:flex;flex-wrap:wrap;gap:13px;align-items:center;margin-top:15px}.yx135Link{display:inline-flex;align-items:center;padding:9px 13px;border:1px solid #e9c9d2;border-radius:8px;color:#a10f32;background:#fff}.yx135Outline{background:#fff;color:#a10f32;border:1px solid #d4a2b0}.yx135Kpis{margin:16px 0}.yx135Three{grid-template-columns:repeat(3,minmax(0,1fr))}.yx135Pill{display:inline-block;padding:4px 9px;border-radius:12px;font-size:12px;background:#f1f3f6;color:#475467}.yx135Pill.ok{background:#e7f5ee;color:#08704b}.yx135Pill.attention{background:#fff2e4;color:#9a5317}.yx135Pill.unknown{background:#f0f2f5;color:#667085}.yx135Todos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.yx135Todo{border:1px solid #ebedf0;border-radius:9px;padding:12px 14px;color:#20232a;display:flex;align-items:center;gap:12px;justify-content:space-between}.yx135Todo small{color:#a10f32}.yx135Todo strong{font-weight:650}.yx135Todo:hover{border-color:#d8aeb9}.yx135Kpis .stat{min-height:112px}.yx135Kpis .stat strong{font-size:27px}button[disabled]{opacity:.5;cursor:not-allowed}@media(max-width:900px){.yx135Three{grid-template-columns:repeat(2,minmax(0,1fr))}.yx135Todos{grid-template-columns:1fr}}@media(max-width:550px){.yx135Three{grid-template-columns:1fr}.yx135Kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
<?php try {if(is_file(__DIR__ . '/growth13_v135_view.inc.php')) require __DIR__ . '/growth13_v135_view.inc.php';else echo '<div class="card">V13.5视图尚未部署，旧后台不受影响。</div>';}catch(Throwable $e){error_log('[YX135] view '.$e->getMessage());echo '<div class="card">经营视图暂不可用，旧后台不受影响。</div>';} ?>
<?php endif;?>
<div class="card"><p class="mini">增长管理是独立扩展，不修改签到、首页视频、阅读激励、奖励流水与兑换订单。旧后台可随时访问。</p></div>
</div><script>
(function(){'use strict';var ROOT=<?php echo $yxJsonUrl;?>,TOKEN=<?php echo $yxJsonToken;?>,TAB=<?php echo json_encode($yxTab);?>,OWNER=<?php echo $yxOwner?'true':'false';?>,REVIEWER=<?php echo $yxRole==='manager'?'true':'false';?>;
function show(t,good){var e=document.getElementById('notification');if(!e)return;e.className=good?'ok':'alert';e.textContent=t;}
function req(action,data,cb){var xhr=new XMLHttpRequest();var post=!!data;var sep=ROOT.indexOf('?')>=0?'&':'?';var url=ROOT+sep+'yx132_api='+encodeURIComponent(action);if(action==='metric'&&typeof data==='string'){url+='&yx132_metric='+encodeURIComponent(data);post=false;}xhr.open(post?'POST':'GET',url,true);xhr.timeout=15000;xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;var v=null;try{v=JSON.parse(xhr.responseText);}catch(e){}if(xhr.status>=200&&xhr.status<300&&v&&v.ok){cb(null,v.data,v.message);}else{cb(v&&v.message?v.message:'数据读取失败，旧后台不受影响');}};xhr.ontimeout=function(){cb('读取超时，请检查PHP数据库日志');};xhr.onerror=function(){cb('请求异常，请稍后重试');};if(post){xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded;charset=UTF-8');var body='token='+encodeURIComponent(TOKEN)+'&yx132_save=yes&yx132_action='+encodeURIComponent(action==='save'?data.action:action);Object.keys(data).forEach(function(k){if(k!=='action')body+='&'+encodeURIComponent(k)+'='+encodeURIComponent(data[k]);});xhr.send(body);}else{xhr.send();}}
function escapeHtml(v){return String(v===undefined||v===null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function loadConfig(){req('config',null,function(err,d){if(err){show(err);return;}var status=document.getElementById('configStatus'),forms=document.getElementById('configForms');if(!status)return;if(!d.ready){status.textContent='独立增长配置表未初始化。已有用户、签到与推广数据不受影响。';if(OWNER){var btn=document.createElement('button');btn.className='btn';btn.textContent='仅初始化增长配置表';btn.onclick=function(){if(!confirm('确认只新增3张增长配置表？不会修改已有金币、用户和订单数据。'))return;req('save',{action:'init'},function(e){if(e){show(e);return;}show('增长表初始化成功',true);loadConfig();});};status.appendChild(document.createElement('br'));status.appendChild(btn);}return;}status.textContent='增长统计与模拟配置已就绪；固定金币活动请进入真实邀请奖励管理';if(forms)forms.style.display=(d.owner||TAB==='compliance')?'block':'none';if(TAB==='compliance'&&!OWNER){var cc=document.getElementById('campaignCreator');if(cc)cc.style.display='none';}if(TAB==='budget'){var p=d.policy||{};['day_budget_fen','total_budget_fen','user_cap_fen','expected_new','effective_pct','expected_7d_pct'].forEach(function(k){var el=document.getElementById(k);if(el)el.value=p[k]||0;});function simulate(){
 var n=Number(document.getElementById('expected_new').value)||0,p=Number(document.getElementById('effective_pct').value)||0,k=Number(document.getElementById('expected_7d_pct').value)||0;
 var cap=Number(document.getElementById('user_cap_fen').value)||0,lim=Number(document.getElementById('total_budget_fen').value)||0;
 var eff=Math.floor(n*p/100),retained=Math.floor(eff*k/100),cost=Math.min(lim,eff*cap);
 var el=document.getElementById('budgetModel');if(el)el.textContent='模拟：预计有效用户 '+eff+' 人；第7日留存 '+retained+' 人；预计支出上界 '+(cost/100).toFixed(2)+' 元；有效用户最大平均成本 '+(eff?((cost/100)/eff).toFixed(2)+' 元':'无法估计')+'。这是模拟值，不是实际广告收益或实际获客成本。';
 }
 ['expected_new','effective_pct','expected_7d_pct','user_cap_fen','total_budget_fen'].forEach(function(k){var el=document.getElementById(k);if(el)el.oninput=simulate;});simulate();
 var save=document.getElementById('saveBudget');if(save)save.onclick=function(){var v={action:'budget'};['day_budget_fen','total_budget_fen','user_cap_fen','expected_new','effective_pct','expected_7d_pct'].forEach(function(k){v[k]=document.getElementById(k).value;});req('save',v,function(e){if(e){show(e);return;}show('预算模拟已保存，不会产生真实奖励',true);loadConfig();});};var hint=document.getElementById('budgetHint');if(hint)hint.textContent='预算不等于已结算广告收入，当前没有真实收入、兑换成本数据。';}else if(TAB==='compliance'){var list=document.getElementById('draftRows');if(list)list.innerHTML=(d.campaigns||[]).map(function(row){var next=row.status==='draft'?'pending':(row.status==='pending'?'reviewed':(row.status==='reviewed'?'archived':''));var allow=!!next&&(OWNER||(REVIEWER&&next==='reviewed'))&&!(next==='reviewed'&&Number(row.creator)===<?php echo (int)$yxUid;?>);var btn=allow?'<button class=\"btn changeState\" data-id=\"'+escapeHtml(row.id)+'\" data-next=\"'+escapeHtml(next)+'\">'+(next==='pending'?'提交复核':(next==='reviewed'?'不同管理员复核':'归档'))+'</button>':'—';return '<tr><td>'+escapeHtml(row.name)+'</td><td>'+escapeHtml(row.mode)+'</td><td>'+escapeHtml(row.status)+'</td><td>'+escapeHtml(row.creator)+'</td><td>'+btn+'</td></tr>';}).join('')||'<tr><td colspan="5">暂无草稿</td></tr>';if(list){Array.prototype.forEach.call(list.querySelectorAll('button.changeState'),function(btn){btn.onclick=function(){var id=btn.getAttribute('data-id'),next=btn.getAttribute('data-next');if(!confirm('确认变更活动审核记录？此操作不会开启返佣或发放金币。'))return;req('save',{action:'transition',campaign_id:id,next_status:next},function(e){if(e){show(e);return;}show('审核记录更新',true);loadConfig();});};});}var save=document.getElementById('saveDraft');if(save&&OWNER)save.onclick=function(){req('save',{action:'draft',campaign_name:document.getElementById('campaign_name').value,campaign_mode:document.getElementById('campaign_mode').value},function(e){if(e){show(e);return;}show('草稿保存成功',true);loadConfig();});};}});}
if(TAB==='overview'){
 var metrics=['all','new','invited','today_invited','visits','signed7','today_bound','new7','effective7','d1','d7','trend'];
 var pending=metrics.slice(),active=0,finished=0,healthy=0,issues=[];
 function renderMetric(key,d){
  var val=d&&d.value!==undefined?d.value:null;
  if(key==='trend'){
   var tr=document.getElementById('trendRows');if(!tr)return;
   if(!Array.isArray(val)){tr.innerHTML='<tr><td colspan="3">'+escapeHtml(d&&d.reason?d.reason:'新增趋势暂不可用')+'</td></tr>';return;}
   var map={},lastDay=null;val.forEach(function(r){var k=Number(r.daykey);if(Number.isFinite(k)){map[k]=r;if(lastDay===null||k>lastDay)lastDay=k;}});
   var current=lastDay===null?Math.floor((Date.now()+28800000)/86400000):lastDay,html='';
   for(var i=6;i>=0;i--){var day=current-i,r=map[day]||{registered:null,attributed:null},date=new Date((day*86400-28800)*1000);
    html+='<tr><td>'+escapeHtml(date.toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}))+'</td><td>'+escapeHtml(r.registered===undefined||r.registered===null?'—':r.registered)+'</td><td>'+escapeHtml(r.attributed===null?'—':(r.attributed===undefined?'—':r.attributed))+'</td></tr>';}
   tr.innerHTML=html;return;
  }
  if(key==='d1'||key==='d7'){
   var pct=document.getElementById(key==='d1'?'retentionD1':'retentionD7');
   var base=document.getElementById(key==='d1'?'d1Base':'d7Base');
   if(pct)pct.textContent=val===null?'—':Number(val).toFixed(1)+'%';
   if(base)base.textContent=d&&d.base!==null?'样本 '+d.base+' 人':(d&&d.reason?d.reason:'样本不足或来源不可用');return;
  }
  var el=document.querySelector('[data-val="'+key+'"]');if(el)el.textContent=val===null?'—':Number(val).toLocaleString('zh-CN');
 }
 function run(){
  while(active<3&&pending.length){
   (function(key){active++;
    req('metric',key,function(err,d){
     active--;finished++;
     if(err){issues.push(key+'：请求失败');renderMetric(key,null);}
     else{renderMetric(key,d);if(d&&d.reason){issues.push(key+'：'+d.reason);}else{healthy++;}}
     if(finished===metrics.length){
      var diag=document.getElementById('metricDiagnostics');
      if(diag)diag.textContent='数据加载完毕：'+healthy+' 项已读取；'+issues.length+' 项暂不可用。'+(issues.length?'原因：'+issues.join('；'):'');
      if(issues.length)show('已读取可用指标，其他指标按真实数据源单独检查；不会显示虚假数字');
     }
     run();
    });
   })(pending.shift());
  }
 }
 run();
 }else if(TAB==='relations'||TAB==='risk'){req(TAB,null,function(err,d){var table=document.getElementById('tableRows');if(!table)return;if(err){table.innerHTML='<tr><td colspan="6">指标读取暂不可用</td></tr>';return;}var rows=d.rows||[];if(!rows.length){table.innerHTML='<tr><td colspan="6">暂无符合条件的记录</td></tr>';if(TAB!=='risk')return;}if(TAB==='risk'){
 var el=document.getElementById('riskIntegrity');if(el)el.textContent='关系完整性检查：自邀 '+(d.self===null?'不可用':d.self)+' 条；邀请人缺失 '+(d.orphan===null?'不可用':d.orphan)+' 条。仅作为核验线索。';
 var h=document.getElementById('riskReviewRows');if(h)h.innerHTML=(d.reviews||[]).map(function(r){return '<tr><td>'+escapeHtml(r.ref_id)+'</td><td>'+escapeHtml(r.actor_id)+'</td><td>'+escapeHtml(r.detail)+'</td><td>'+escapeHtml(r.created_at)+'</td></tr>';}).join('')||'<tr><td colspan="4">暂无复核记录</td></tr>';
 }
 table.innerHTML=rows.map(function(r){if(TAB==='relations')return '<tr><td>'+escapeHtml(r.id)+'</td><td>'+escapeHtml(r.user_id)+'</td><td>'+escapeHtml(r.new_inviter_id)+'</td><td>'+escapeHtml(r.action)+'</td><td>'+escapeHtml(r.result)+'</td><td>'+escapeHtml(r.created_at)+'</td></tr>';return '<tr><td>'+escapeHtml(r.new_inviter_id)+'</td><td>'+escapeHtml(r.count_1d)+'</td><td>'+ (OWNER?'<button class="btn reviewRisk" data-id="'+escapeHtml(r.new_inviter_id)+'">记入复核</button>':'人工复核线索') +'</td></tr>';}).join('');if(TAB==='risk')Array.prototype.forEach.call(table.querySelectorAll('.reviewRisk'),function(btn){btn.onclick=function(){var id=btn.getAttribute('data-id');var memo=prompt('请填写真实复核说明（不自动封禁）：');if(!memo)return;req('save',{action:'risk_review',subject_id:id,decision:'reviewed',memo:memo},function(e){if(e){show(e);return;}show('人工复核记录已写入',true);window.location.reload();});};});});}else if(TAB==='budget'||TAB==='compliance'){loadConfig();}
})();
</script><script>window.YX134={root:<?php echo $yxJsonUrl;?>,token:<?php echo $yxJsonToken;?>,uid:<?php echo (int)$yxUid;?>,tab:<?php echo json_encode($yxTab);?>,owner:<?php echo $yxOwner?'true':'false';?>};</script><script src="<?php echo $yxH(($_W['siteroot'] ?? '/').'addons/sage_dksy/static/v134/growth.js?v=1340');?>"></script><script>window.YX135={root:<?php echo $yxJsonUrl;?>,token:<?php echo $yxJsonToken;?>,tab:<?php echo json_encode($yxTab);?>,owner:<?php echo $yxOwner?'true':'false';?>,links:{orders:<?php echo json_encode(html_entity_decode($this->createWebUrl('manage13',array('section'=>'orders')),ENT_QUOTES,'UTF-8'));?>,products:<?php echo json_encode(html_entity_decode($this->createWebUrl('catalog13',array('section'=>'products')),ENT_QUOTES,'UTF-8'));?>,messages:<?php echo json_encode(html_entity_decode($this->createWebUrl('catalog13',array('section'=>'messages')),ENT_QUOTES,'UTF-8'));?>,articles:<?php echo json_encode(html_entity_decode($this->createWebUrl('v12',array('pane'=>'articles')),ENT_QUOTES,'UTF-8'));?>,reward:<?php echo json_encode(html_entity_decode($this->createWebUrl('control13',array('section'=>'reward')),ENT_QUOTES,'UTF-8'));?>,relations:<?php echo json_encode($yxUrl('relations'));?>,risk:<?php echo json_encode($yxUrl('risk'));?>,finance:<?php echo json_encode($yxUrl('finance'));?>}};</script><script src="<?php echo $yxH(($_W['siteroot'] ?? '/').'addons/sage_dksy/static/v135/ops.js?v=1350');?>"></script><script>window.YX14={root:<?php echo $yxJsonUrl;?>,token:<?php echo $yxJsonToken;?>,tab:<?php echo json_encode($yxTab);?>,owner:<?php echo $yxOwner?'true':'false';?>};</script><script src="<?php echo $yxH(($_W['siteroot'] ?? '/').'addons/sage_dksy/static/v14/ops.js?v=1411');?>"></script><script>window.YX141={root:<?php echo $yxJsonUrl;?>,token:<?php echo $yxJsonToken;?>,tab:<?php echo json_encode($yxTab);?>,owner:<?php echo $yxOwner?'true':'false';?>};</script><script src="<?php echo $yxH(($_W['siteroot'] ?? '/').'addons/sage_dksy/static/v14/triage.js?v=1411');?>"></script></body></html>
