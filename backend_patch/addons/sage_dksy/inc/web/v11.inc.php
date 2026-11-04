<?php
/** 元享 V11 微擎运营后台：管理员核验、模板、作品及一级邀请关系。 */
defined('IN_IA') or exit('Access Denied');
global $_W,$_GPC;
$uid=(int)$_W['uniacid'];$role=(string)($_W['role']??'');$root=!empty($_W['isfounder'])||$role==='owner';$contentAdmin=$root||$role==='manager';
if(!$contentAdmin)message('当前账号没有V11后台访问权限','','error');
if(!function_exists('pdo_tableexists')||!pdo_tableexists('sage_dksy_v11_template'))message('请先按说明导入V11增量SQL','','error');
$esc=function($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');};
$preview=null;$editTemplate=null;$actor='admin:'.(int)($_W['uid']??0);$u=$uid;$msg='';$err='';$pane=(string)($_GPC['pane']??'templates');
if(!in_array($pane,array('templates','works','invites','stats'),true))$pane='templates';if($pane==='invites'&&!$root)message('邀请关系仅账号所有者可查','','error');
/** V11.1 可选语音上传：仅管理员上传真实 MP3，前端仍由用户主动点击播放。 */
if (isset($_POST['v11_upload_audio'])) {
 $respond=function($ok,$msg,$extra=array()) { if(!headers_sent())header('Content-Type: application/json; charset=utf-8');echo json_encode(array_merge(array('ok'=>$ok?true:false,'message'=>$msg),$extra),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit; };
 if(strtoupper((string)($_SERVER['REQUEST_METHOD']??''))!=='POST')$respond(false,'只允许POST上传');
 $tok=(string)($_POST['token']??'');$expected=(string)($_W['token']??'');
 if($tok===''||$expected===''||!hash_equals($expected,$tok))$respond(false,'会话已过期，请刷新后重试');
 if($u<=0||!defined('ATTACHMENT_ROOT')||!is_dir(ATTACHMENT_ROOT))$respond(false,'附件目录未就绪');
 if((int)($_W['setting']['remote']['type']??0)!==0)$respond(false,'当前账号使用远程附件，请使用支持远程存储的上传方式');
 $f=$_FILES['v11_audio_file']??null;
 if(!is_array($f))$respond(false,'请选择MP3语音');
 $code=(int)($f['error']??UPLOAD_ERR_NO_FILE);
 if($code!==UPLOAD_ERR_OK)$respond(false,$code===UPLOAD_ERR_INI_SIZE||$code===UPLOAD_ERR_FORM_SIZE?'音频超过服务器上传限制':'音频上传失败（错误码'.$code.'）');
 $tmp=(string)($f['tmp_name']??'');$n=(int)($f['size']??0);
 if($n<128||$n>5*1024*1024||!is_uploaded_file($tmp))$respond(false,'请上传不超过5MB的真实MP3文件');
 $fh=@fopen($tmp,'rb');if(!$fh)$respond(false,'无法读取音频');$sig=(string)fread($fh,12);fclose($fh);
 $isMp3=(substr($sig,0,3)==='ID3')||(strlen($sig)>=2&&ord($sig[0])===255&&(ord($sig[1])&224)===224);
 if(!$isMp3)$respond(false,'音频格式不正确，请导出为标准MP3');
 if(function_exists('finfo_open')){$fi=@finfo_open(FILEINFO_MIME_TYPE);$mt=$fi?@finfo_file($fi,$tmp):'';if($fi)finfo_close($fi);if($mt&&!in_array($mt,array('audio/mpeg','audio/mp3','audio/x-mpeg','application/octet-stream'),true))$respond(false,'音频文件类型不符合MP3要求');}
 $root=realpath(ATTACHMENT_ROOT);if(!$root)$respond(false,'附件目录不可访问');
 $rel='images/'.$u.'/v11/audio/'.gmdate('Ym',time()+28800).'/';$dir=$root.DIRECTORY_SEPARATOR.str_replace('/',DIRECTORY_SEPARATOR,rtrim($rel,'/'));
 if(!is_dir($dir)&&!@mkdir($dir,0755,true))$respond(false,'无法创建音频目录');
 $real=realpath($dir);if(!$real||strpos($real.DIRECTORY_SEPARATOR,$root.DIRECTORY_SEPARATOR)!==0||!is_writable($real))$respond(false,'附件目录无写入权限');
 try{$name='yx11_voice_'.bin2hex(random_bytes(12)).'.mp3';}catch(Exception $e){$respond(false,'无法创建安全文件名');}
 $dest=$real.DIRECTORY_SEPARATOR.$name;
 if(!@move_uploaded_file($tmp,$dest))$respond(false,'音频保存失败');
 @chmod($dest,0644);
 $url=function_exists('toimage')?toimage($rel.$name):'';
 if(!is_string($url)||!preg_match('~^https?://~i',$url))$url='';
 if(!$url)$respond(false,'音频已保存，但附件访问地址解析失败');
 $respond(true,'语音上传成功，保存模板后生效',array('path'=>$rel.$name,'url'=>$url,'bytes'=>(int)filesize($dest)));
}

/** V11.1 后台本地图像上传；仅微擎管理员、当前 uniacid，且必须通过表单令牌。 */
if (isset($_POST['v11_upload_background'])) {
 $respond=function($ok,$msg,$extra=array()) { if(!headers_sent())header('Content-Type: application/json; charset=utf-8'); echo json_encode(array_merge(array('ok'=>$ok?true:false,'message'=>$msg),$extra),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; };
 if (strtoupper((string)($_SERVER['REQUEST_METHOD']??''))!=='POST')$respond(false,'只允许POST上传');
 $postedToken=(string)($_POST['token']??'');$serverToken=(string)($_W['token']??'');
 if ($postedToken===''||$serverToken===''||!hash_equals($serverToken,$postedToken))$respond(false,'会话已过期，请刷新后台重试');
 if ($u<=0)$respond(false,'未找到当前账号，请先选择小程序账号');
 if (!defined('ATTACHMENT_ROOT')||!is_dir(ATTACHMENT_ROOT))$respond(false,'平台附件目录不存在，未上传');
 if (!function_exists('imagecreatetruecolor')||!function_exists('imagecreatefromstring')||!function_exists('imagejpeg'))$respond(false,'服务器缺少GD图片扩展');
 // 开启远程附件时，需要专用的远程存储接口；本补丁不绕过远程存储配置。
 $remoteType=(int)($_W['setting']['remote']['type']??0);
 if($remoteType!==0)$respond(false,'当前账号开启了远程附件，请先使用支持远程存储的上传方式');
 $file=$_FILES['v11_background_file']??null;
 if(!is_array($file))$respond(false,'请选择图片');
 $code=(int)($file['error']??UPLOAD_ERR_NO_FILE);
 if($code!==UPLOAD_ERR_OK){$respond(false,$code===UPLOAD_ERR_INI_SIZE||$code===UPLOAD_ERR_FORM_SIZE?'文件超过服务器上传限制':'文件上传失败（错误码 '.$code.'）');}
 $tmp=(string)($file['tmp_name']??'');$bytes=(int)($file['size']??0);
 if($bytes<100||$bytes>8*1024*1024||!is_uploaded_file($tmp))$respond(false,'请上传不超过8MB的真实图片文件');
 $info=@getimagesize($tmp);
 if(!$info||!isset($info[0],$info[1],$info['mime']))$respond(false,'文件不是有效图片');
 $mime=(string)$info['mime'];$w=(int)$info[0];$h=(int)$info[1];
 if(!in_array($mime,array('image/jpeg','image/png','image/webp'),true))$respond(false,'仅支持 JPG、PNG、WebP 图片');
 if($w<480||$h<640||$w>6000||$h>8000||$w*$h>14000000)$respond(false,'推荐1080×1440；图片最短480×640、最多1400万像素');
 $raw=@file_get_contents($tmp);if($raw===false)$respond(false,'无法读取上传图片');
 $im=@imagecreatefromstring($raw);unset($raw);
 if(!$im)$respond(false,'图片解码失败，请换用JPG格式');
 $out=imagecreatetruecolor(1080,1440);
 if(!$out){imagedestroy($im);$respond(false,'无法初始化图片处理');}
 $light=imagecolorallocate($out,255,246,233);imagefill($out,0,0,$light);
 // 中心裁剪，输出统一3:4竖图；仅在这里生成新文件，不修改原作品。
 $srcRatio=$w/$h;$dstRatio=1080/1440;
 if($srcRatio>$dstRatio){$sw=(int)round($h*$dstRatio);$sh=$h;$sx=(int)floor(($w-$sw)/2);$sy=0;}
 else {$sw=$w;$sh=(int)round($w/$dstRatio);$sx=0;$sy=(int)floor(($h-$sh)/2);}
 imagecopyresampled($out,$im,0,0,$sx,$sy,1080,1440,$sw,$sh);
 imagedestroy($im);
 $root=realpath(ATTACHMENT_ROOT);
 if(!$root){imagedestroy($out);$respond(false,'附件目录不可访问');}
 $relDir='images/'.$u.'/v11/backgrounds/'.gmdate('Ym',time()+28800).'/';
 $dir=$root.DIRECTORY_SEPARATOR.str_replace('/',DIRECTORY_SEPARATOR,rtrim($relDir,'/'));
 if(!is_dir($dir)&&!@mkdir($dir,0755,true)){imagedestroy($out);$respond(false,'无法建立附件目录，请检查写入权限');}
 $resolved=realpath($dir);
 if(!$resolved||strpos($resolved.DIRECTORY_SEPARATOR,$root.DIRECTORY_SEPARATOR)!==0||!is_writable($resolved)){imagedestroy($out);$respond(false,'附件目录不可写或路径不安全');}
 try{$name='yx11_'.bin2hex(random_bytes(12)).'.jpg';}catch(Exception $e){imagedestroy($out);$respond(false,'无法创建安全随机文件名');}
 $relative=$relDir.$name;$filePath=$resolved.DIRECTORY_SEPARATOR.$name;
 $temporary=@tempnam($resolved,'.yx11upload_');
 if(!$temporary){imagedestroy($out);$respond(false,'无法创建临时图片');}
 $saved=@imagejpeg($out,$temporary,86);imagedestroy($out);
 if(!$saved||!@rename($temporary,$filePath)){@unlink($temporary);$respond(false,'图片保存失败，请检查目录权限');}
 @chmod($filePath,0644);
 $url=function_exists('toimage')?toimage($relative):'';
 if(!is_string($url)||!preg_match('~^https?://~i',$url))$url='';
 if(!$url)$respond(false,'图片已保存，但附件公开地址解析失败，请检查附件配置',array('path'=>$relative));
 $respond(true,'图片上传成功，已优化为1080×1440',array('path'=>$relative,'url'=>$url,'width'=>1080,'height'=>1440,'bytes'=>(int)filesize($filePath)));
}

if(checksubmit('v11_save_config')){
 $data=array('home_on'=>!empty($_GPC['home_on'])?1:0,'updated_at'=>time());foreach(array('morning','night','birthday','holiday','thanks') as $cat)$data['cat_'.$cat]=!empty($_GPC['cat_'.$cat])?1:0;
 $has=pdo_get('sage_dksy_v11_config',array('uniacid'=>$u));$ok=$has?pdo_update('sage_dksy_v11_config',$data,array('uniacid'=>$u)):pdo_insert('sage_dksy_v11_config',$data+array('uniacid'=>$u));if($ok===false)$err='入口和分类保存失败';else $msg='入口与分类设置已保存';$pane='templates';
}
if(checksubmit('v11_save_template')){
 $id=(int)($_GPC['template_id']??0);$cat=(string)($_GPC['category']??'');$title=trim((string)($_GPC['title']??''));$greeting=trim((string)($_GPC['greeting']??''));$license=trim((string)($_GPC['license_note']??''));$color=(string)($_GPC['bg_color']??'');$fg=(string)($_GPC['text_color']??'');$path=trim((string)($_GPC['background_path']??''));$audio=trim((string)($_GPC['audio_path']??''));
 if(!in_array($cat,array('morning','night','birthday','holiday','thanks'),true)||mb_strlen($title,'UTF-8')<1||mb_strlen($title,'UTF-8')>80||mb_strlen($greeting,'UTF-8')<1||mb_strlen($greeting,'UTF-8')>200||mb_strlen($license,'UTF-8')<2) $err='请填写有效模板、祝福语及版权来源';
 elseif(!preg_match('/^#[0-9a-fA-F]{6}$/',$color)||!preg_match('/^#[0-9a-fA-F]{6}$/',$fg))$err='颜色须为#RRGGBB';
 elseif(($path&&!preg_match('~^images/[0-9]+/[A-Za-z0-9_./-]+\.(png|jpg|jpeg|webp)$~i',$path))||strpos($path,'..')!==false||($audio&&!preg_match('~^images/[0-9]+/[A-Za-z0-9_./-]+\.mp3$~i',$audio))||strpos($audio,'..')!==false)$err='素材必须是已上传到本平台的附件相对路径';
 else{
  $layout=trim((string)($_GPC['layout_json']??''));if($layout!==''){ $json=json_decode($layout,true);if(!is_array($json) || strlen($layout)>600){$err='布局配置不是合法JSON';}}
 if(!$err){$row=array('layout_json'=>$layout,'category'=>$cat,'title'=>$title,'greeting'=>$greeting,'bg_color'=>$color,'text_color'=>$fg,'background_path'=>$path,'audio_path'=>$audio,'license_note'=>mb_substr($license,0,255,'UTF-8'),'recommended_on'=>preg_match('/^20\d\d-\d\d-\d\d$/',(string)($_GPC['recommended_on']??''))?$_GPC['recommended_on']:null,'sort_order'=>min(100000,max(-100000,(int)($_GPC['sort_order']??100))),'enabled'=>!empty($_GPC['enabled'])?1:0,'updated_at'=>time());
  $old=$id?pdo_get('sage_dksy_v11_template',array('uniacid'=>$u,'id'=>$id)):null;
  if($id&&!$old)$err='模板不属于当前账号';
  else{
    $ok=$old?pdo_update('sage_dksy_v11_template',$row,array('uniacid'=>$u,'id'=>$id)):pdo_insert('sage_dksy_v11_template',$row+array('uniacid'=>$u,'created_at'=>time()));
    $msg=$ok===false?'': '模板保存成功';if($ok===false)$err='写入失败';
  }}
 }
 $pane='templates';
}
if(checksubmit('v11_process_report')){
 $pane='works';$reportId=(int)($_GPC['report_id']??0);$decision=(string)($_GPC['decision']??'');$reason=trim((string)($_GPC['reason']??''));$report=pdo_get('sage_dksy_v11_report',array('uniacid'=>$u,'id'=>$reportId,'status'=>'pending'));
 if(!$report||!in_array($decision,array('resolved','dismissed'),true)||mb_strlen($reason,'UTF-8')<2)$err='举报记录、处理方式或原因不完整';else{
 $changed=pdo_update('sage_dksy_v11_report',array('status'=>$decision),array('uniacid'=>$u,'id'=>$reportId,'status'=>'pending'));
 if($changed!==1)$err='举报状态已经变化';else{pdo_insert('sage_dksy_v11_content_audit',array('uniacid'=>$u,'work_id'=>$report['work_id'],'action'=>'report_'.$decision,'operator'=>$actor,'reason'=>mb_substr($reason,0,255,'UTF-8'),'created_at'=>time()));$msg='举报处理已留痕';}
 }
}
if(checksubmit('v11_review_work')){
 $pane='works';$id=(int)($_GPC['work_id']??0);$act=(string)($_GPC['action']??'');$reason=trim((string)($_GPC['reason']??''));$work=pdo_get('sage_dksy_v11_work',array('uniacid'=>$u,'id'=>$id));
 if(!$work||$work['visibility']==='deleted'||!in_array($act,array('approve','reject','hide'),true)||mb_strlen($reason,'UTF-8')<2)$err='作品、操作或原因无效';
 elseif($act==='approve'&&($work['visibility']!=='public'||$work['review_status']!=='pending'||$work['security_status']!=='pass'))$err='作品未经内容安全校验或非待审核，不能通过';
 else{$state=$act==='approve'?'approved':($act==='reject'?'rejected':'hidden');$w=array('review_status'=>$state,'updated_at'=>time());if($act!=='approve')$w['visibility']='private';
  $ok=pdo_update('sage_dksy_v11_work',$w,array('uniacid'=>$u,'id'=>$id));if($ok===false)$err='更新失败';else{pdo_insert('sage_dksy_v11_content_audit',array('uniacid'=>$u,'work_id'=>$id,'action'=>$act,'operator'=>$actor,'reason'=>mb_substr($reason,0,255,'UTF-8'),'created_at'=>time()));$msg='审核操作已记录';}}
}
/* YX_V1316: 独立同行邀请比例设置，不复用旧的“分享送积分”绝对数值。 */
$refPolicyTable='sage_dksy_v11_referral_policy';
$refPolicyReady= function_exists('pdo_tableexists') && pdo_tableexists($refPolicyTable);
$refPolicy=$refPolicyReady?pdo_get($refPolicyTable,array('uniacid'=>$u)):null;
if(checksubmit('v11_policy_save')){
 $pane='invites';
 if(!$root){$err='仅账号所有者可以调整同行政策';}
 else{
  $rate=trim((string)($_GPC['partner_rate']??''));
  if(!preg_match('/^(?:100(?:\.0{1,2})?|[1-9]?[0-9](?:\.[0-9]{1,2})?)$/',$rate))$err='比例范围为0%至100%，最多两位小数';
  else{
   // 比例保存不触发金币结算，不创建返佣任务，也不改变现有金币预算。
   if(!$refPolicyReady){
    $t=tablename($refPolicyTable);
    pdo_query('CREATE TABLE IF NOT EXISTS '.$t.' (`uniacid` int unsigned NOT NULL, `percent_bps` int unsigned NOT NULL DEFAULT 3000, `enabled` tinyint unsigned NOT NULL DEFAULT 0, `updated_by` int unsigned NOT NULL DEFAULT 0, `updated_at` int unsigned NOT NULL DEFAULT 0, PRIMARY KEY (`uniacid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $refPolicyReady=pdo_tableexists($refPolicyTable);
   }
   if(!$refPolicyReady)$err='独立政策表初始化失败，未保存';
   else{
    $data=array('percent_bps'=>(int)round((float)$rate*100),'enabled'=>0,'updated_at'=>time(),'updated_by'=>(int)($_W['uid']??0));
    $saved=$refPolicy?pdo_update($refPolicyTable,$data,array('uniacid'=>$u)):pdo_insert($refPolicyTable,$data+array('uniacid'=>$u));
    if($saved===false)$err='政策比例保存失败';
    else{$msg='参考比例已保存；此比例不参与真实固定金币奖励';$refPolicy=pdo_get($refPolicyTable,array('uniacid'=>$u));}
   }
  }
 }
}
if(checksubmit('v11_preview_inviter')){$pane='invites';if(!$root)$err='需要账号所有者权限';else{
 $tid=(int)($_GPC['user_id']??0);$nid=(int)($_GPC['inviter_id']??0);$why=trim((string)($_GPC['reason']??''));$oldrow=pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>$tid));$newrow=$nid?pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>$nid)):null;$oldInv=($oldrow&&!empty($oldrow['fromid']))?pdo_get('sage_dksy_user',array('uniacid'=>$u,'openid'=>$oldrow['fromid'])):null;
 if(!$oldrow||($nid&&!$newrow)||mb_strlen($why,'UTF-8')<5)$err='请填写有效会员与至少5字原因';else $preview=array('user_id'=>$tid,'inviter_id'=>$nid,'expected_old'=>$oldInv?(int)$oldInv['id']:0,'reason'=>$why,'user_name'=>$oldrow['nickname'],'old_name'=>$oldInv?$oldInv['nickname']:'暂无','new_name'=>$newrow?$newrow['nickname']:'无（解绑）');}}
if(checksubmit('v11_change_inviter')){
 $pane='invites';if(!$root)$err='需要账号所有者权限';
 else{
  $target=(int)($_GPC['user_id']??0);$inviter=(int)($_GPC['inviter_id']??0);$reason=trim((string)($_GPC['reason']??''));$confirm=(int)($_GPC['confirm_change']??0);$expected=(int)($_GPC['expected_old']??-1);
  if(!$target||mb_strlen($reason,'UTF-8')<5||!$confirm)$err='请核实会员编号、填写至少5字原因并勾选确认';
  else{
   $lock='yx_v11_rel_'.$u;$acquired=(int)pdo_fetchcolumn('SELECT GET_LOCK(:l,5)',array(':l'=>$lock));
   if(!$acquired)$err='操作繁忙，请重试';
   else{
    pdo_begin();try{
      $user=pdo_fetch('SELECT id,openid,fromid FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND id=:id FOR UPDATE',array(':u'=>$u,':id'=>$target));
      $next=$inviter?pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>$inviter)):null;
      if(!$user||($inviter&&!$next))throw new Exception('目标会员不存在');if($inviter===$target)throw new Exception('不能绑定自己');
      $old=$user['fromid']?pdo_get('sage_dksy_user',array('uniacid'=>$u,'openid'=>$user['fromid'])):null;
      $prev=$old?(int)$old['id']:null;if((int)$prev!==$expected)throw new Exception('原邀请人已经变化，请重新预览');$new=$next?(int)$next['id']:null;if($prev===$new)throw new Exception('邀请关系没有变化');
      $cursor=$next;$seen=array();for($i=0;$i<500&&$cursor;$i++){$cid=(int)$cursor['id'];if($cid===$target||isset($seen[$cid]))throw new Exception('存在循环关系');$seen[$cid]=1;$cursor=empty($cursor['fromid'])?null:pdo_get('sage_dksy_user',array('uniacid'=>$u,'openid'=>$cursor['fromid']));}if($i>=500)throw new Exception('关系链异常');
      $ok=pdo_update('sage_dksy_user',array('fromid'=>$next?$next['openid']:''),array('uniacid'=>$u,'id'=>$target));if($ok!==1)throw new Exception('关系修改失败');
      if(!pdo_insert('sage_dksy_v11_relation_audit',array('uniacid'=>$u,'user_id'=>$target,'old_inviter_id'=>$prev,'new_inviter_id'=>$new,'action'=>$next?'admin_rebind':'admin_unbind','reason'=>mb_substr($reason,0,255,'UTF-8'),'actor'=>$actor,'visit_id'=>null,'result'=>'ok','created_at'=>time())))throw new Exception('审计记录失败');
      pdo_commit();$msg='关系调整已保存；历史金币和已结算奖励不变';
    }catch(Exception $e){pdo_rollback();$err=$e->getMessage();}pdo_fetchcolumn('SELECT RELEASE_LOCK(:l)',array(':l'=>$lock));
   }
  }
 }
}
$v11Config=pdo_get('sage_dksy_v11_config',array('uniacid'=>$u));
$editTemplate=(int)($_GPC['edit_template']??0)?pdo_get('sage_dksy_v11_template',array('uniacid'=>$u,'id'=>(int)$_GPC['edit_template'])):null;
$pg=max(1,min(1000,(int)($_GPC['page']??1)));$offset=($pg-1)*25;
$templates=pdo_fetchall('SELECT * FROM '.tablename('sage_dksy_v11_template').' WHERE uniacid=:u ORDER BY sort_order ASC,id DESC LIMIT 100',array(':u'=>$u));
$works=pdo_fetchall('SELECT w.id,w.owner_id,w.greeting,w.visibility,w.review_status,w.security_status,w.created_at,t.title AS template_title FROM '.tablename('sage_dksy_v11_work').' w LEFT JOIN '.tablename('sage_dksy_v11_template').' t ON t.id=w.template_id AND t.uniacid=w.uniacid WHERE w.uniacid=:u ORDER BY w.id DESC LIMIT '.$offset.',25',array(':u'=>$u));
$q=trim((string)($_GPC['q']??''));$args=array(':u'=>$u);$filter='';if($q!==''){
 if(ctype_digit($q)){$filter=' AND (c.id=:cid OR p.id=:pid)';$args[':cid']=(int)$q;$args[':pid']=(int)$q;}
 else{$filter=' AND (c.nickname LIKE :nick OR p.nickname LIKE :pname)';$args[':nick']='%'.mb_substr($q,0,35,'UTF-8').'%';$args[':pname']=$args[':nick'];}
}
if($root){$status=(string)($_GPC['status']??'');if($status==='bound')$filter.=' AND c.fromid<>\'\'';if($status==='unbound')$filter.=' AND (c.fromid=\'\' OR c.fromid IS NULL)';$from=(string)($_GPC['bound_from']??'');$to=(string)($_GPC['bound_to']??'');if(preg_match('/^20\d\d-\d\d-\d\d$/',$from)){$filter.=' AND a.created_at>=:since';$args[':since']=strtotime($from.' 00:00:00 Asia/Shanghai');}if(preg_match('/^20\d\d-\d\d-\d\d$/',$to)){$filter.=' AND a.created_at<:until';$args[':until']=strtotime($to.' 00:00:00 Asia/Shanghai')+86400;}}
$relations=$root?pdo_fetchall('SELECT c.id,c.nickname,c.num,c.createtime,c.fromid,p.id AS inviter_id,p.nickname AS inviter_name,a.created_at AS bound_at FROM '.tablename('sage_dksy_user').' c LEFT JOIN '.tablename('sage_dksy_user').' p ON p.uniacid=c.uniacid AND p.openid=c.fromid LEFT JOIN '.tablename('sage_dksy_v11_relation_audit').' a ON a.id=(SELECT MAX(z.id) FROM '.tablename('sage_dksy_v11_relation_audit').' z WHERE z.uniacid=c.uniacid AND z.user_id=c.id AND z.result=\'ok\') WHERE c.uniacid=:u'.$filter.' ORDER BY c.id DESC LIMIT '.$offset.',25',$args):array();
$reports=pdo_fetchall('SELECT id,work_id,reason,status,created_at FROM '.tablename('sage_dksy_v11_report').' WHERE uniacid=:u AND status=\'pending\' ORDER BY id DESC LIMIT 50',array(':u'=>$u));
$inspectUser=null;if($root && (int)($_GPC['ledger_user_id']??0)>0){$check=pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>(int)$_GPC['ledger_user_id']));if($check){$ledger=pdo_fetch('SELECT COALESCE(SUM(CASE WHEN `static`=1 THEN num ELSE 0 END),0) earned,COALESCE(SUM(CASE WHEN `static`=2 THEN num ELSE 0 END),0) spent, COUNT(*) count_rows FROM '.tablename('sage_dksy_num_log').' WHERE uniacid=:u AND openid=:o',array(':u'=>$u,':o'=>$check['openid']));$inspectUser=array('id'=>(int)$check['id'],'balance'=>(int)$check['num'],'earned'=>(int)$ledger['earned'],'spent'=>(int)$ledger['spent'],'count_rows'=>(int)$ledger['count_rows']);}}
$audit=$root?pdo_fetchall('SELECT * FROM '.tablename('sage_dksy_v11_relation_audit').' WHERE uniacid=:u ORDER BY id DESC LIMIT 30',array(':u'=>$u)):array();
$stats=pdo_fetchall('SELECT event_type,COUNT(*) AS cnt FROM '.tablename('sage_dksy_v11_event').' WHERE uniacid=:u GROUP BY event_type',array(':u'=>$u));
// 新用户注册以既有会员表的真实注册时间统计，不虚构分享归因。
$registeredToday=(int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND createtime>=:d',array(':u'=>$u,':d'=>(int)(floor((time()+28800)/86400)*86400-28800)));
$focusId=$root?(int)($_GPC['focus_user_id']??0):0;$focusUser=$focusId?pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>$focusId)):null;$focusChildren=$focusUser?pdo_fetchall('SELECT id,nickname,createtime FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND fromid=:f ORDER BY id DESC LIMIT 100',array(':u'=>$u,':f'=>$focusUser['openid'])):array();$focusCount=$focusUser?(int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND fromid=:f',array(':u'=>$u,':f'=>$focusUser['openid'])):0;
include template('common/header');
include POSETERH_ROOT.'template/v11_plain.php';
include template('common/footer');
