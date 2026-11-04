<?php
/** 元享 V11：独立社交与一级邀请管理。不得调用任何金币奖励函数。 */
trait DksyV11SocialTrait {
 private function v11O($d){return json_encode($d,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
 private function v11U(){global $_W;return (int)$_W['uniacid'];}
 private function v11Fail($msg){return $this->v11O(array('error'=>1,'msg'=>$msg));}
 private function v11Ready(){foreach(array('invite_code','visit','relation_audit','template','work','favorite','profile','event','content_audit','report','config') as $n)if(!pdo_tableexists('sage_dksy_v11_'.$n))return false;return true;}
 private function v11Auth(){ $openid=$this->safeVerifiedUser();return $openid?pdo_get('sage_dksy_user',array('uniacid'=>$this->v11U(),'openid'=>$openid)):null; }
 private function v11Must(){return $this->v11Auth();}
 private function v11UserById($id){return pdo_get('sage_dksy_user',array('uniacid'=>$this->v11U(),'id'=>(int)$id));}
 private function v11Text($val,$max){$s=trim((string)$val);return mb_strlen($s,'UTF-8')<=$max?$s:null;}
 private function v11Event($type,$kind,$id,$actor=0,$source=''){
   $allowed=array('template_view','work_created','work_saved','image_saved','share_trigger','share_landing','visit','register','invite_bound','remix');
   if(in_array($type,$allowed,true))pdo_insert('sage_dksy_v11_event',array('uniacid'=>$this->v11U(),'event_type'=>$type,'target_kind'=>$kind,'target_id'=>(int)$id,'actor_id'=>$actor?:null,'source'=>substr($source,0,24),'created_at'=>time()));
 }
 private function v11Code($user){
  $u=$this->v11U();$id=(int)$user['id'];$found=pdo_get('sage_dksy_v11_invite_code',array('uniacid'=>$u,'user_id'=>$id));if($found)return (string)$found['code'];
  for($i=0;$i<4;$i++){
   $code=substr(bin2hex(random_bytes(8)),0,12);
   $ok=@pdo_insert('sage_dksy_v11_invite_code',array('uniacid'=>$u,'user_id'=>$id,'code'=>$code,'created_at'=>time()));
   if($ok)return $code;
   $found=pdo_get('sage_dksy_v11_invite_code',array('uniacid'=>$u,'user_id'=>$id));if($found)return (string)$found['code'];
  }return '';
 }
 private function v11PublicWork($id){return null; // 个人主体不对外提供用户作品$r=pdo_get('sage_dksy_v11_work',array('uniacid'=>$this->v11U(),'id'=>(int)$id,'visibility'=>'public','review_status'=>'approved','security_status'=>'pass'));
  if(!$r)return null;$t=pdo_get('sage_dksy_v11_template',array('uniacid'=>$this->v11U(),'id'=>$r['template_id'],'enabled'=>1));if(!$t)return null;
  return array('id'=>(int)$r['id'],'template_id'=>(int)$r['template_id'],'greeting'=>$r['greeting'],'signature'=>$r['signature'],'show_date'=>(int)$r['show_date'],'card_date'=>(string)$r['card_date'],'background_path'=>$t['background_path']?toimage($t['background_path']):'','bg_color'=>$t['bg_color'],'text_color'=>$t['text_color'],'author_label'=>'元享好友','layout_json'=>$t['layout_json']);
 }
 public function doPageV11config(){if(!$this->v11Ready())return $this->v11Fail('尚未开放');$r=pdo_get('sage_dksy_v11_config',array('uniacid'=>$this->v11U()));$cats=array('morning','night','birthday','holiday','thanks');if($r){$cats=array_values(array_filter($cats,function($c)use($r){return !empty($r['cat_'.$c]);}));}return $this->v11O(array('error'=>0,'home_on'=>0,'categories'=>$cats));}
 public function doPageV11templates(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('请先安装V11数据表');$cat=(string)($_GPC['category']??'');$cats=array('morning','night','birthday','holiday','thanks');if($cat && !in_array($cat,$cats,true))return $this->v11Fail('分类不正确');$cfg=pdo_get('sage_dksy_v11_config',array('uniacid'=>$this->v11U()));if($cfg && $cat && empty($cfg['cat_'.$cat]))return $this->v11O(array('error'=>0,'items'=>array(),'today'=>gmdate('Y-m-d',time()+28800)));
  $sql='SELECT id,category,title,greeting,bg_color,text_color,background_path,audio_path,layout_json,recommended_on FROM '.tablename('sage_dksy_v11_template').' WHERE uniacid=:u AND enabled=1'.($cat?' AND category=:c':'').' ORDER BY (recommended_on=:today) DESC,sort_order ASC,id DESC LIMIT 60';$args=array(':u'=>$this->v11U(),':today'=>gmdate('Y-m-d',time()+28800));if($cat)$args[':c']=$cat;
  $items=pdo_fetchall($sql,$args);if($cfg){$items=array_values(array_filter($items,function($r)use($cfg){return !empty($cfg['cat_'.$r['category']]);}));}foreach($items as &$r){$r['background_url']=$r['background_path']?toimage($r['background_path']):'';$r['audio_url']=$r['audio_path']?toimage($r['audio_path']):'';unset($r['background_path'],$r['audio_path']);}unset($r);
  return $this->v11O(array('error'=>0,'items'=>$items,'today'=>gmdate('Y-m-d',time()+8*3600)));
 }
 public function doPageV11templateview(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$id=(int)($_GPC['id']??0);$r=pdo_get('sage_dksy_v11_template',array('uniacid'=>$this->v11U(),'id'=>$id,'enabled'=>1));if(!$r)return $this->v11Fail('模板不存在');$this->v11Event('template_view','template',$id);return $this->v11O(array('error'=>0));}
 public function doPageV11favorite(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$id=(int)($_GPC['id']??0);if(!pdo_get('sage_dksy_v11_template',array('id'=>$id,'uniacid'=>$this->v11U(),'enabled'=>1)))return $this->v11Fail('模板不可用');$w=array('uniacid'=>$this->v11U(),'user_id'=>$me['id'],'template_id'=>$id);if((int)($_GPC['favorite']??0)===1)pdo_insert('sage_dksy_v11_favorite',$w+array('created_at'=>time()));else pdo_delete('sage_dksy_v11_favorite',$w);return $this->v11O(array('error'=>0));}
 public function doPageV11favorites(){if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$rows=pdo_getall('sage_dksy_v11_favorite',array('uniacid'=>$this->v11U(),'user_id'=>$me['id']),array('template_id'));return $this->v11O(array('error'=>0,'ids'=>array_map(function($r){return (int)$r['template_id'];},$rows)));}
 public function doPageV11worksave(){return $this->v11Fail('个人主体暂未开放内容创作与发布');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$template=(int)($_GPC['template_id']??0);$t=pdo_get('sage_dksy_v11_template',array('uniacid'=>$this->v11U(),'id'=>$template,'enabled'=>1));if(!$t)return $this->v11Fail('模板不存在');
  $g=$this->v11Text($_GPC['greeting']??'',200);$sig=$this->v11Text($_GPC['signature']??'',20);if($g===null||$g===''||$sig===null)return $this->v11Fail('文字过长或为空');$id=(int)($_GPC['id']??0);$row=array('template_id'=>$template,'greeting'=>$g,'signature'=>$sig,'show_date'=>empty($_GPC['show_date'])?0:1,'card_date'=>gmdate('Y-m-d',time()+28800),'visibility'=>'private','review_status'=>'draft','security_status'=>'unchecked','updated_at'=>time());
  if($id){$old=pdo_get('sage_dksy_v11_work',array('uniacid'=>$this->v11U(),'id'=>$id,'owner_id'=>$me['id']));if(!$old||$old['visibility']==='deleted')return $this->v11Fail('作品不可编辑');if(pdo_update('sage_dksy_v11_work',$row,array('uniacid'=>$this->v11U(),'id'=>$id,'owner_id'=>$me['id']))===false)return $this->v11Fail('保存失败');}
  else{$row['owner_id']=$me['id'];$row['uniacid']=$this->v11U();$row['created_at']=time();if(!pdo_insert('sage_dksy_v11_work',$row))return $this->v11Fail('保存失败');$id=(int)pdo_insertid();$this->v11Event('work_created','work',$id,(int)$me['id']);}
  $this->v11Event('work_saved','work',$id,(int)$me['id']);return $this->v11O(array('error'=>0,'id'=>$id,'status'=>'private'));
 }
 public function doPageV11mywork(){return $this->v11Fail('个人作品功能暂已关闭');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$r=pdo_get('sage_dksy_v11_work',array('uniacid'=>$this->v11U(),'id'=>(int)($_GPC['id']??0),'owner_id'=>$me['id']));if(!$r||$r['visibility']==='deleted')return $this->v11Fail('作品不存在');return $this->v11O(array('error'=>0,'work'=>array('id'=>$r['id'],'template_id'=>$r['template_id'],'greeting'=>$r['greeting'],'signature'=>$r['signature'],'show_date'=>$r['show_date'],'card_date'=>$r['card_date'],'review_status'=>$r['review_status'],'visibility'=>$r['visibility'])));}
 public function doPageV11myworks(){return $this->v11Fail('个人作品功能暂已关闭');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$page=min(10000,max(1,(int)($_GPC['page']??1)));$offset=($page-1)*15;
  $rows=pdo_fetchall('SELECT w.id,w.template_id,w.greeting,w.signature,w.show_date,w.card_date,w.visibility,w.review_status,w.created_at,t.bg_color,t.text_color,t.background_path FROM '.tablename('sage_dksy_v11_work').' w LEFT JOIN '.tablename('sage_dksy_v11_template').' t ON t.id=w.template_id AND t.uniacid=w.uniacid WHERE w.uniacid=:u AND w.owner_id=:o AND w.visibility<>\'deleted\' ORDER BY w.id DESC LIMIT '.$offset.',15',array(':u'=>$this->v11U(),':o'=>$me['id']));foreach($rows as &$r){$r['background_url']=$r['background_path']?toimage($r['background_path']):'';unset($r['background_path']);}unset($r);return $this->v11O(array('error'=>0,'items'=>$rows,'page'=>$page));
 }
 private function v11Token(){global $_W; $a=$_W['account']??array();$appid=trim((string)($a['key']??''));$secret=trim((string)($a['secret']??''));if(!$appid||strlen($secret)<16||!function_exists('ihttp_get'))return '';
  $key='yx_v11_token_'.hash('sha256',$appid);$tok=function_exists('cache_load')?cache_load($key):'';if(is_string($tok)&&strlen($tok)>20)return $tok;
  $r=ihttp_get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='.rawurlencode($appid).'&secret='.rawurlencode($secret));$j=json_decode((string)($r['content']??''),true);$tok=is_array($j)?(string)($j['access_token']??''):'';if(strlen($tok)>20&&function_exists('cache_write'))cache_write($key,$tok,6600);return strlen($tok)>20?$tok:'';
 }
 private function v11SecurityCheck($openid,$text){if(!function_exists('ihttp_post'))return 'unavailable';$tok=$this->v11Token();if(!$tok)return 'unavailable';$payload=json_encode(array('version'=>2,'scene'=>2,'openid'=>$openid,'content'=>$text),JSON_UNESCAPED_UNICODE);
  $r=ihttp_post('https://api.weixin.qq.com/wxa/msg_sec_check?access_token='.rawurlencode($tok),$payload,array('Content-Type'=>'application/json'));$j=json_decode((string)($r['content']??''),true);if(!is_array($j)||!array_key_exists('errcode',$j))return 'unavailable';if((int)$j['errcode']!==0)return 'unavailable';$suggest=(string)($j['result']['suggest']??'');return $suggest==='pass'?'pass':($suggest==='review'?'review':'reject');}
 public function doPageV11workaction(){return $this->v11Fail('个人主体暂未开放内容创作与发布');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$id=(int)($_GPC['id']??0);$action=(string)($_GPC['action']??'');$r=pdo_get('sage_dksy_v11_work',array('uniacid'=>$this->v11U(),'id'=>$id,'owner_id'=>$me['id']));if(!$r||$r['visibility']==='deleted')return $this->v11Fail('作品不存在');
  if($action==='publish'){$sec=$this->v11SecurityCheck((string)$me['openid'],(string)$r['greeting'].' '.(string)$r['signature']);if($sec!=='pass')return $this->v11Fail($sec==='review'?'内容需要进一步审核，请修改后重试':($sec==='reject'?'内容不适合公开，请修改':'内容安全校验不可用，暂不能公开'));$state=array('visibility'=>'public','review_status'=>'pending','security_status'=>'pass','updated_at'=>time());}
  elseif($action==='withdraw')$state=array('visibility'=>'private','review_status'=>'draft','updated_at'=>time());
  elseif($action==='delete')$state=array('visibility'=>'deleted','review_status'=>'hidden','updated_at'=>time());
  else return $this->v11Fail('操作不支持');
  $ok=pdo_update('sage_dksy_v11_work',$state,array('uniacid'=>$this->v11U(),'id'=>$id,'owner_id'=>$me['id']));if($ok===false)return $this->v11Fail('操作失败');pdo_insert('sage_dksy_v11_content_audit',array('uniacid'=>$this->v11U(),'work_id'=>$id,'action'=>$action,'operator'=>'user:'.$me['id'],'reason'=>'用户主动操作','created_at'=>time()));return $this->v11O(array('error'=>0,'status'=>$state['visibility'],'msg'=>$action==='publish'?'已提交审核，通过后才能公开':'操作已生效'));
 }
 public function doPageV11public(){return $this->v11Fail('个人作品功能暂已关闭');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$id=(int)($_GPC['id']??0);$r=$this->v11PublicWork($id);return $r?$this->v11O(array('error'=>0,'work'=>$r)):$this->v11Fail('作品未公开、已撤回或已下架');}
 public function doPageV11report(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$id=(int)($_GPC['id']??0);$reason=$this->v11Text($_GPC['reason']??'',160);if(!$this->v11PublicWork($id)||!$reason||mb_strlen($reason,'UTF-8')<4)return $this->v11Fail('请选择公开作品并填写原因');$day=(int)(floor((time()+28800)/86400)*86400-28800);$count=(int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.tablename('sage_dksy_v11_report').' WHERE uniacid=:u AND reporter_id=:id AND created_at>=:d',array(':u'=>$this->v11U(),':id'=>$me['id'],':d'=>$day));if($count>=3)return $this->v11Fail('今天的举报提交已达上限');if(!pdo_insert('sage_dksy_v11_report',array('uniacid'=>$this->v11U(),'work_id'=>$id,'reporter_id'=>$me['id'],'reason'=>$reason,'status'=>'pending','created_at'=>time())))return $this->v11Fail('提交失败');return $this->v11O(array('error'=>0,'msg'=>'已收到举报，管理员将核实'));}
 public function doPageV11whoami(){if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$code=$this->v11Code($me);if(!$code)return $this->v11Fail('邀请标识暂不可用');$profile=pdo_get('sage_dksy_v11_profile',array('uniacid'=>$this->v11U(),'user_id'=>$me['id']));$inv=$me['fromid']?pdo_get('sage_dksy_user',array('uniacid'=>$this->v11U(),'openid'=>$me['fromid'])):null;
  return $this->v11O(array('error'=>0,'code'=>$code,'member_no'=>(int)$me['id'],'inviter_label'=>$inv?'会员'.substr(str_pad((string)$inv['id'],6,'0',STR_PAD_LEFT),-6):'暂无邀请人','show_balance'=>!empty($profile['show_balance_to_inviter'])?1:0,'font_scale'=>!empty($profile['font_scale'])?(int)$profile['font_scale']:1,'voice_on'=>!empty($profile['voice_on'])?1:0));
 }
 public function doPageV11visit(){global $_GPC; if ((string)($_GPC['kind']??'home')==='work') return $this->v11Fail('个人作品访问已关闭');global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$code=(string)($_GPC['code']??'');if(!preg_match('/^[a-f0-9]{12}$/',$code))return $this->v11Fail('邀请标识无效');$inv=pdo_get('sage_dksy_v11_invite_code',array('uniacid'=>$this->v11U(),'code'=>$code));if(!$inv)return $this->v11Fail('邀请来源失效');$kind=(string)($_GPC['kind']??'home');$id=(int)($_GPC['id']??0);if(!in_array($kind,array('home','work','prize','trial','review'),true))return $this->v11Fail('分享类型无效');if($kind==='work'&&!$this->v11PublicWork($id))return $this->v11Fail('作品不可访问');$token=bin2hex(random_bytes(24));$src=(string)($_GPC['source']??'qr');$src=in_array($src,array('friend','timeline','qr','poster','remix'),true)?$src:'qr';
  $ok=pdo_insert('sage_dksy_v11_visit',array('uniacid'=>$this->v11U(),'receipt_hash'=>hash('sha256',$token),'invite_code'=>$code,'target_kind'=>$kind,'target_id'=>$id,'source'=>$src,'created_at'=>time()));if(!$ok)return $this->v11Fail('来源登记失败');$vid=(int)pdo_insertid();$this->v11Event('visit',$kind,$id,0,$src);$this->v11Event('share_landing',$kind,$id,0,$src);return $this->v11O(array('error'=>0,'receipt'=>$token,'visit_id'=>$vid,'expires_in'=>86400));
 }
 public function doPageV11bind(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$token=(string)($_GPC['receipt']??'');if(!preg_match('/^[a-f0-9]{48}$/',$token))return $this->v11Fail('来源凭据无效');$u=$this->v11U();$uid=(int)$me['id'];$h=hash('sha256',$token);
  // 同一公众号/小程序内所有自动绑定与管理员改绑使用全局互斥锁，防止交叉绑定并发成环。
  $lock='yx_v11_rel_'.$u;$got=(int)pdo_fetchcolumn('SELECT GET_LOCK(:l,5)',array(':l'=>$lock));if(!$got)return $this->v11Fail('绑定繁忙，请重试');
  pdo_begin();try{
  $self=pdo_fetch('SELECT id,openid,fromid,createtime FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND id=:id FOR UPDATE',array(':u'=>$u,':id'=>$uid));
  $v=pdo_fetch('SELECT * FROM '.tablename('sage_dksy_v11_visit').' WHERE uniacid=:u AND receipt_hash=:h FOR UPDATE',array(':u'=>$u,':h'=>$h));
  if(!$v||time()-(int)$v['created_at']>86400||(!empty($v['bound_user_id'])&&(int)$v['bound_user_id']!==$uid))throw new Exception('邀请来源已失效或已使用');
  if(!$self||!empty($self['fromid']))throw new Exception('已有有效邀请归属，不能覆盖');
  // 老用户无邀请人：须后台核实补绑。前台只接受首次注册24小时内且来源早于首次注册/不晚于注册短时间的记录。
  $registered=(int)$self['createtime'];if(!$registered||time()-$registered>86400||$registered-(int)$v['created_at']>86400||(int)$v['created_at']-$registered>900)throw new Exception('仅新注册用户可自动建立关系，老用户需人工核实');
  $code=pdo_get('sage_dksy_v11_invite_code',array('uniacid'=>$u,'code'=>$v['invite_code']));$inv=$code?$this->v11UserById($code['user_id']):null;
  if(!$inv||(int)$inv['id']===$uid)throw new Exception('不能邀请自己');
  // 一人仅有一位父级，检查任意深度历史链，不创建环。
  $cursor=$inv;$seen=array();for($i=0;$i<500&&$cursor;$i++){$cid=(int)$cursor['id'];if($cid===$uid||isset($seen[$cid]))throw new Exception('检测到循环关系');$seen[$cid]=1;if(empty($cursor['fromid']))break;$cursor=pdo_get('sage_dksy_user',array('uniacid'=>$u,'openid'=>$cursor['fromid']));}if($i>=500)throw new Exception('邀请关系层级异常，请后台核查');
  $changed=pdo_update('sage_dksy_user',array('fromid'=>$inv['openid']),array('uniacid'=>$u,'id'=>$uid,'fromid'=>$self['fromid']));if($changed!==1)throw new Exception('邀请关系已变化');
  pdo_update('sage_dksy_v11_visit',array('bound_user_id'=>$uid,'bound_at'=>time()),array('id'=>$v['id'],'uniacid'=>$u));
  // 新版关系表为权威来源；同步旧会员推广列表，兼容既有“一级推广”管理入口。
  // 不启用旧版分享送币及二级代理逻辑。
  if(function_exists('pdo_tableexists') && pdo_tableexists('sage_dksy_user_share')){
   $legacy=pdo_get('sage_dksy_user_share',array('uniacid'=>$u,'openid'=>$self['openid'],'level'=>1));
   if($legacy && (string)$legacy['fromid']!==(string)$inv['openid'])throw new Exception('旧版邀请记录冲突，请管理员核验');
   if(!$legacy){
    $saved=pdo_insert('sage_dksy_user_share',array('uniacid'=>$u,'openid'=>$self['openid'],'fromid'=>$inv['openid'],'fromid_tow'=>'','createtime'=>time(),'integral'=>0,'level'=>1));
    if(!$saved)throw new Exception('旧版推广关系同步失败');
   }
  }
  if(!pdo_insert('sage_dksy_v11_relation_audit',array('uniacid'=>$u,'user_id'=>$uid,'old_inviter_id'=>null,'new_inviter_id'=>$inv['id'],'action'=>'new_bind','reason'=>'新用户有效访问凭据','actor'=>'user:'.$uid,'visit_id'=>$v['id'],'result'=>'ok','created_at'=>time())))throw new Exception('邀请变更审计写入失败');
  pdo_commit();pdo_fetchcolumn('SELECT RELEASE_LOCK(:l)',array(':l'=>$lock));$this->v11Event('invite_bound','user',$uid,$uid);
  // Only the authenticated B is evaluated, after the original relation transaction
  // and lock have completed. A summary retry can recover any deferred reward check.
  $reply=array('error'=>0,'bound'=>1);
  try{$reply['referral']=$this->v150SafeProcessUser((string)$self['openid']);}
  catch(\Throwable $referralError){error_log('[YX150] bound referral check pending');$reply['referral']=array('state'=>'pending');}
  return $this->v11O($reply);
 }catch(Exception $e){pdo_rollback();pdo_fetchcolumn('SELECT RELEASE_LOCK(:l)',array(':l'=>$lock));return $this->v11Fail($e->getMessage());}
 }
 public function doPageV11profile(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$w=array('uniacid'=>$this->v11U(),'user_id'=>$me['id']);$data=array('show_balance_to_inviter'=>!empty($_GPC['show_balance'])?1:0,'font_scale'=>max(1,min(3,(int)($_GPC['font_scale']??1))),'voice_on'=>!empty($_GPC['voice_on'])?1:0,'updated_at'=>time());$old=pdo_get('sage_dksy_v11_profile',$w);$ok=$old?pdo_update('sage_dksy_v11_profile',$data,$w):pdo_insert('sage_dksy_v11_profile',$w+$data);return $ok===false?$this->v11Fail('保存失败'):$this->v11O(array('error'=>0));}
 public function doPageV11wallet(){if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$args=array(':u'=>$this->v11U(),':o'=>$me['openid']);$row=pdo_fetch('SELECT COALESCE(SUM(CASE WHEN `static`=1 THEN num ELSE 0 END),0) income, COALESCE(SUM(CASE WHEN `static`=2 THEN num ELSE 0 END),0) expense,COUNT(*) n FROM '.tablename('sage_dksy_num_log').' WHERE uniacid=:u AND openid=:o',$args);$income=(int)$row['income'];$expense=(int)$row['expense'];$balance=(int)$me['num'];return $this->v11O(array('error'=>0,'current_balance'=>$balance,'ledger_received'=>$income,'ledger_expense'=>$expense,'ledger_count'=>(int)$row['n'],'ledger_reconciled'=>(($income-$expense)===$balance&&$row['n']>0)?1:0,'label'=>'累计获得（仅已记录流水）'));}
 public function doPageV11promote(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$me=$this->v11Must();if(!$me)return $this->safeError();$u=$this->v11U();$p=max(1,min(10000,(int)($_GPC['page']??1)));$off=($p-1)*15;$from=$me['openid'];$args=array(':u'=>$u,':f'=>$from);
  $total=(int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND fromid=:f',$args);$day=(int)(floor((time()+28800)/86400)*86400-28800);
  $today=(int)pdo_fetchcolumn('SELECT COUNT(DISTINCT a.user_id) FROM '.tablename('sage_dksy_v11_relation_audit').' a INNER JOIN '.tablename('sage_dksy_user').' c ON c.uniacid=a.uniacid AND c.id=a.user_id WHERE a.uniacid=:u AND a.new_inviter_id=:inv AND a.action IN (\'new_bind\',\'admin_rebind\') AND a.created_at>=:d AND c.fromid=:f',array(':u'=>$u,':inv'=>$me['id'],':d'=>$day,':f'=>$me['openid']));
  $rows=pdo_fetchall('SELECT id,nickname,createtime,openid FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND fromid=:f ORDER BY id DESC LIMIT '.$off.',15',$args);
  foreach($rows as &$r){$a=pdo_fetch('SELECT created_at FROM '.tablename('sage_dksy_v11_relation_audit').' WHERE uniacid=:u AND user_id=:id AND result=\'ok\' ORDER BY id ASC LIMIT 1',array(':u'=>$u,':id'=>$r['id']));$profile=pdo_get('sage_dksy_v11_profile',array('uniacid'=>$u,'user_id'=>$r['id']));$allowed=!empty($profile['show_balance_to_inviter']);$real= $allowed?pdo_get('sage_dksy_user',array('uniacid'=>$u,'id'=>$r['id'])):null;
   $r=array('member_mask'=>'***'.substr(str_pad((string)$r['id'],6,'0',STR_PAD_LEFT),-3),'nickname'=>mb_substr((string)$r['nickname'],0,1,'UTF-8').'***','registered_at'=>(int)$r['createtime'],'bound_at'=>$a?(int)$a['created_at']:null,'status'=>'active','balance_visible'=>$allowed?1:0,'balance'=>$allowed?(int)$real['num']:null);}
  unset($r);$reply=array('error'=>0,'total'=>$total,'today'=>$today,'items'=>$rows,'page'=>$p);
  // Backward-compatible, read-only campaign metadata. Missing schema, disabled
  // campaigns, or a referral subsystem failure must not break the friend list.
  try{$campaign=$this->v150PublishedCampaign();if(is_array($campaign))$reply['published_referral_campaign']=$campaign;}
  catch(\Throwable $referralError){error_log('[YX150] campaign metadata temporarily unavailable');}
  return $this->v11O($reply);
 }
 public function doPageV11qrcode(){
  global $_GPC,$_W;
  if((string)($_GPC['kind']??'home')==='work')return $this->v11Fail('个人作品分享已关闭');
  if(!$this->v11Ready())return $this->v11Fail('尚未开放');
  $me=$this->v11Must();if(!$me)return $this->safeError();
  $kind=(string)($_GPC['kind']??'home');if($kind!=='home')return $this->v11Fail('不支持的二维码内容');
  $code=$this->v11Code($me);if(!$code)return $this->v11Fail('专属码不可用');
  $scene='g'.$code;if(strlen($scene)>32)return $this->v11Fail('参数过长');
  // 生产站只能生成正式版已发布、真实可扫码的小程序码。
  $env=(string)($_GPC['env_version']??'release');
  if(!in_array($env,array('release','trial','develop'),true))$env='release';
  if(strtolower((string)($_SERVER['SERVER_NAME']??''))!=='test.yxsp.top')$env='release';
  $strict=($env==='release');
  $path='images/'.$this->v11U().'/v11_qr/v11_'.hash('sha256',$this->v11U().'|'.($_W['account']['key']??'').'|'.$env.'|sage_dksy/pages/v11/entry|'.$scene).'.png';
  $base=rtrim(ATTACHMENT_ROOT,'/\\').'/';$full=$base.$path;
  // 附件存储可用时读旧缓存；不可写时不得错误地拒绝微信真实二维码生成。
  if(is_file($full)&&is_readable($full)){
   $existing=@file_get_contents($full);
   if($existing!==false){$cached=$this->v1314QrImage($existing,true,$strict);if($cached)return $this->v11O($cached);}
  }
  $lockName='yxqr_'.substr(hash('sha256',$path),0,40);
  $locked=(int)pdo_fetchcolumn('SELECT GET_LOCK(:k,3)',array(':k'=>$lockName));
  if($locked!==1)return $this->v11Fail('二维码请求正在处理，请稍后重试');
  try{
   if(is_file($full)&&is_readable($full)){
    $existing=@file_get_contents($full);
    if($existing!==false){$cached=$this->v1314QrImage($existing,true,$strict);if($cached)return $this->v11O($cached);}
   }
   $token=$this->v11Token();if(!$token)return $this->v11Fail('微信接口鉴权失败，请核查小程序账号');
   $payload=json_encode(array('scene'=>$scene,'page'=>'sage_dksy/pages/v11/entry','env_version'=>$env,'check_path'=>$strict,'width'=>430));
   $api='https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=';
   $r=ihttp_post($api.rawurlencode($token),$payload,array('Content-Type'=>'application/json'));
   $bin=(string)($r['content']??'');$img=$this->v1314QrImage($bin,false,$strict);
   if(!$img){
    $j=json_decode($bin,true);$ec=is_array($j)?(int)($j['errcode']??0):0;
    if(in_array($ec,array(40001,42001),true)){
     $ck='yx_v11_token_'.hash('sha256',(string)($_W['account']['key']??''));
     if(function_exists('cache_delete'))cache_delete($ck);
     $token=$this->v11Token();
     if($token){$r=ihttp_post($api.rawurlencode($token),$payload,array('Content-Type'=>'application/json'));$bin=(string)($r['content']??'');$img=$this->v1314QrImage($bin,false,$strict);$j=$img?null:json_decode($bin,true);$ec=is_array($j)?(int)($j['errcode']??0):0;}
    }
    if(!$img){
     $message=($ec===41030||$ec===41029)?'二维码入口尚未发布，请先发布包含推广入口页面的小程序正式版':(($ec===45009)?'微信二维码接口调用次数受限，请稍后重试':(($ec===40001||$ec===42001)?'微信接口凭证异常，请检查小程序账号配置':'微信真实小程序码生成失败，请检查接口配置'));
     return $this->v11Fail($message.($ec?'（微信错误码 '.$ec.'）':''));
    }
   }
   // 写缓存是可选优化，写失败不影响返回用户自己的真实码。
   $folder=dirname($full);
   if((is_dir($folder)||@mkdir($folder,0755,true))&&is_writable($folder)){
    @file_put_contents($full,$bin,LOCK_EX);
   }
   return $this->v11O($img);
  }finally{pdo_fetchcolumn('SELECT RELEASE_LOCK(:k)',array(':k'=>$lockName));}
 }
 // 只允许官方返回的有效 PNG/JPEG、小尺寸二维码，不能透传 JSON/HTML 或任意文件。
 private function v1314QrImage($bin,$cached,$strict){
  if(!is_string($bin)||strlen($bin)<200||strlen($bin)>400000)return null;
  $meta=@getimagesizefromstring($bin);
  if(!is_array($meta)||!in_array((int)$meta[2],array(IMAGETYPE_PNG,IMAGETYPE_JPEG),true)||$meta[0]<150||$meta[1]<150||$meta[0]>1280||$meta[1]>1280)return null;
  return array('error'=>0,'qr_base64'=>base64_encode($bin),'mime'=>(int)$meta[2]===IMAGETYPE_JPEG?'image/jpeg':'image/png','cached'=>$cached?1:0,'test_only'=>$strict?0:1);
 }
 public function doPageV11metric(){global $_GPC;if(!$this->v11Ready())return $this->v11Fail('尚未开放');$type=(string)($_GPC['type']??'');if(!in_array($type,array('share_trigger','remix','work_saved','image_saved'),true))return $this->v11Fail('不支持的事件');$me=$this->v11Must();if(!$me)return $this->safeError();$this->v11Event($type,(string)($_GPC['kind']??'work'),(int)($_GPC['id']??0),(int)$me['id'],'app');return $this->v11O(array('error'=>0));}
}
