<?php
/**
 * sage_dksy模块小程序接口定义
 *
 * @author heyuguo0619
 * @url
 */
global $_W;
defined('IN_IA') or exit('Access Denied');
define('POSETERH_ROOT',IA_ROOT.'/addons/sage_dksy/');
define('POSETERH_URL',$_W['siteroot'].'addons/sage_dksy/');
define('MODULE','sage_dksy');
require_once(POSETERH_ROOT.'class/autoload.php');
require_once(POSETERH_ROOT.'class/v11_social.trait.php');
require_once(POSETERH_ROOT.'class/v12_read.trait.php');
require_once(POSETERH_ROOT.'class/v124_callback.trait.php');
require_once(POSETERH_ROOT.'class/v125_client_auto.trait.php');
require_once(POSETERH_ROOT.'class/v10_social.trait.php'); // DKSY_SOCIAL_V10_20261029
require_once(POSETERH_ROOT.'class/growth_v5.trait.php'); // DKSY_GROWTH_V5_20261029
require_once(POSETERH_ROOT.'class/v150_referral_rewards.trait.php'); // Fixed first-level referral rewards; schema installation is owner-controlled.

class Sage_dksyModuleWxapp extends WeModuleWxapp {
    use DksyV12ReadTrait;
    use DksyV124CallbackTrait;
    use DksyV125ClientAutoTrait;
    use DksyV11SocialTrait;
    use DksyV10SocialTrait; // DKSY_SOCIAL_V10_20261029
    use SageDksyGrowthV5Trait; // DKSY_GROWTH_V5_20261029
    use DksyV150ReferralRewardsTrait;

    /** 激励视频分离配置：不复用旧 task_on、旧多级分销和强制广告。 */
    /**
     * 会话签名使用该小程序在微擎服务器端配置的 AppSecret。
     * 微擎旧框架建立数据库连接后会清理 $_W[config][db]，因此不能依赖数据库密码。
     * AppSecret 在每个小程序请求中由微擎 app/common/bootstrap.app.inc.php 的 uni_fetch 加载。
     * 密钥只参与服务端 HMAC，不返回、不记录到日志或客户端。
     */
    private function safeSigningKey() {
        global $_W;
        $account = isset($_W['account']) ? $_W['account'] : array();
        $appSecret = isset($account['secret']) ? trim((string)$account['secret']) : '';
        $appId = isset($account['key']) ? trim((string)$account['key']) : '';
        $auth = isset($_W['config']['setting']['authkey']) ? (string)$_W['config']['setting']['authkey'] : '';
        // 不回退到弱口令、客户端参数或常量密钥，配置缺失时拒绝签发。
        if (strlen($appSecret) < 16 || $appId === '') return '';
        return hash_hmac('sha256', 'sage-dksy:session:v3|'.(int)$_W['uniacid'].'|'.$appId.'|'.$auth, $appSecret);
    }
    private function safeToken($openid) {
        global $_W;
        $secret=$this->safeSigningKey();
        if (!$secret || !$openid) return '';
        $body=rtrim(strtr(base64_encode(json_encode(array('u'=>(int)$_W['uniacid'],'o'=>$openid,'e'=>time()+43200))),'+/','-_'),'=');
        return $body.'.'.hash_hmac('sha256',$body,$secret);
    }
    private function safeVerifiedUser() {
        global $_W,$_GPC;
        $token=isset($_GPC['safe_token']) ? (string)$_GPC['safe_token'] : '';
        if ($token) {
            $parts=explode('.',$token);
            $secret=$this->safeSigningKey();
            if (!$secret || count($parts)!==2 || !preg_match('/^[A-Za-z0-9_-]+$/',$parts[0]) || !preg_match('/^[a-f0-9]{64}$/',$parts[1])) return '';
            if (!hash_equals(hash_hmac('sha256',$parts[0],$secret),$parts[1])) return '';
            $body=json_decode(base64_decode(strtr($parts[0],'-_','+/')),true);
            if (!is_array($body) || empty($body['o']) || (int)$body['u']!==(int)$_W['uniacid'] || (int)$body['e']<=time()) return '';
            return (string)$body['o'];
        }
        // 已有的 wx.login code 可以在敏感操作时直接核验；不接受客户端自行填入的 OpenID。
        if (!empty($_GPC['code'])) {
            $result=$this->Getopenids($_GPC['code']);
            return !empty($result['toopenid']) ? $result['toopenid'] : '';
        }
        return '';
    }
    private function safeFailure($msg) { return json_encode(array('error'=>1,'msg'=>$msg),JSON_UNESCAPED_UNICODE); }
    private function safeError($msg='登录信息已过期，请重新进入小程序') {
        // 无参数是认证失败；带文字说明是可恢复的业务错误，客户端不强制退出。
        return json_encode(array('error'=>func_num_args()===0 ? 401 : 403,'msg'=>$msg),JSON_UNESCAPED_UNICODE);
    }
    /**
     * 允许安全展示广告：只放行首页及兑换列表 Banner。
     * 广告必须由微信广告组件渲染；不得自动插屏、强迫观看或使用非法广告位。
     * 后台其它开关即使误打开也不会被前端使用。
     */
    private function safeAdPolicy($adset) {
        $adset = is_array($adset) ? $adset : array();
        $id = isset($adset['banner_id']) ? trim((string)$adset['banner_id']) : '';
        $otherTypes = array('insert_id', 'video_id', 'custom_id', 'jvideo_id');
        $conflict = false;
        foreach ($otherTypes as $name) {
            if ($id !== '' && isset($adset[$name]) && trim((string)$adset[$name]) === $id) {
                $conflict = true; break;
            }
        }
        $valid = (bool)preg_match('/^adunit-[A-Za-z0-9]{8,64}$/', $id);
        // 最小权限策略：只返回允许的业务字段，绝不返回全部旧广告策略。
        // ID 类型需要在微信流量主后台额外人工核对，正则不能检测广告位真实类型。
        $enabled = $valid && !$conflict;
        return array(
            'banner_id' => $enabled ? $id : '',
            'banner_index_on' => ($enabled && !empty($adset['banner_index_on'])) ? 1 : 0,
            'banner_prize_on' => ($enabled && !empty($adset['banner_prize_on'])) ? 1 : 0,
            'reward_on' => 0,
            'jvideo_id' => '',
            'banner_status' => !$valid ? 'invalid_id' : ($conflict ? 'id_conflict' : 'ready')
        );
    }
    /** V3 display placements: allowlisted, default-off. No legacy auto interstitial. */
    private function safeV3AdSlots($legacy) {
        global $_W;
        $allowed=array(
            'prize_detail_banner'=>'banner',
            'trial_detail_banner'=>'banner',
            'prize_list_native'=>'native',
            'trial_list_native'=>'native',
            'user_center_banner'=>'banner',
            'tehui_detail_banner'=>'banner'
        );
        $result=array();
        foreach ($allowed as $scene=>$type) $result[$scene]=array('on'=>0,'unit'=>'','type'=>$type);
        if (!function_exists('pdo_tableexists') || !pdo_tableexists('sage_dksy_ad_slot')) return $result;
        $rows=pdo_getall('sage_dksy_ad_slot',array('uniacid'=>(int)$_W['uniacid']));
        if (!is_array($rows)) return $result;
        $legacy=is_array($legacy)?$legacy:array();
        $used=array();
        foreach (array('banner_id','insert_id','video_id','custom_id','jvideo_id') as $key) {
            if (!empty($legacy[$key])) $used[trim((string)$legacy[$key])]=1;
        }
        $bonus=pdo_get('sage_dksy_reward_config',array('uniacid'=>(int)$_W['uniacid']));
        if (!empty($bonus['adunit_id'])) $used[trim((string)$bonus['adunit_id'])]=1;
        foreach ($rows as $row) {
            $scene=isset($row['scene'])?(string)$row['scene']:'';
            $type=isset($row['ad_type'])?(string)$row['ad_type']:'';
            $unit=isset($row['adunit_id'])?trim((string)$row['adunit_id']):'';
            if (!isset($allowed[$scene]) || $allowed[$scene]!==$type ||
                empty($row['enabled']) || !preg_match('/^adunit-[a-zA-Z0-9]{8,64}$/',$unit) || isset($used[$unit])) continue;
            // A single ordinary display placement may be used per screen.
            if ($scene==='prize_list_native' && !empty($legacy['banner_prize_on'])) continue;
            $used[$unit]=1;
            $result[$scene]=array('on'=>1,'unit'=>$unit,'type'=>$type);
        }
        return $result;
    }
    /**
     * 专属安全配置：播放与奖励分别启用。
     * 默认不给金币，待微信真机验证与风控检查通过后由管理员手动决定。
     * 注意微信客户端 onClose.isEnded 不能提供可独立验证的服务端观看证明。
     */
    private function safeRewardSettings() {
        global $_W;
        $cfg=pdo_get('sage_dksy_reward_config',array('uniacid'=>(int)$_W['uniacid']));
        if (!is_array($cfg)) $cfg=array();
        $id=isset($cfg['adunit_id']) ? trim((string)$cfg['adunit_id']) : '';
        $valid=(bool)preg_match('/^adunit-[A-Za-z0-9]{8,64}$/',$id);
        $display=$valid && !empty($cfg['display_on']);
        $points=min(10,max(1,(int)(isset($cfg['reward_points'])?$cfg['reward_points']:5)));
        $limit=min(2,max(1,(int)(isset($cfg['daily_limit'])?$cfg['daily_limit']:1)));
        // 数据库奖池开关：不允许旧每日任务、旧广告开关直接打开本功能。
        $payout=$display && !empty($cfg['payout_on']);
        return array('on'=>$display?1:0,'payout_on'=>$payout?1:0,'unit'=>$display?$id:'',
            'points'=>$points,'limit'=>$limit);
    }
    private function safeBonusCount($openid,$dayStart) {
        global $_W;
        return (int)pdo_fetchcolumn('SELECT COUNT(*) FROM '.tablename('sage_dksy_reward_ticket').
            ' WHERE uniacid=:u AND openid=:o AND created_at>=:start AND created_at<:end AND status IN (1,2)',
            array(':u'=>(int)$_W['uniacid'],':o'=>$openid,':start'=>$dayStart,':end'=>$dayStart+86400));
    }
    private function safeBonusDay() { return strtotime(date('Y-m-d')); }
    public function doPageBonusstatus() {
        $user=$this->safeVerifiedUser(); if (!$user) return $this->safeError();
        $r=$this->safeRewardSettings();
        $count=$r['on'] ? $this->safeBonusCount($user,$this->safeBonusDay()) : 0;
        return json_encode(array('error'=>0,'enabled'=>$r['on'],'payout_enabled'=>$r['payout_on'],
            'unit'=>$r['unit'],'points'=>$r['points'],'limit'=>$r['limit'],'count'=>$count),JSON_UNESCAPED_UNICODE);
    }
    public function doPageBonusstart() {
        global $_W;
        $user=$this->safeVerifiedUser(); if (!$user) return $this->safeError();
        $r=$this->safeRewardSettings(); if (!$r['on']) return $this->safeError('激励视频尚未开放');
        $uid=(int)$_W['uniacid']; $now=time();
        pdo_begin();
        try {
            $owner=pdo_fetch('SELECT id FROM '.tablename('sage_dksy_user').
                ' WHERE uniacid=:u AND openid=:o FOR UPDATE',array(':u'=>$uid,':o'=>$user));
            if (!$owner) throw new Exception('登录用户不存在');
            $count=$this->safeBonusCount($user,$this->safeBonusDay());
            if ($count >= $r['limit']) throw new Exception('今日可观看次数已达上限');
            // 同一账号同一时间只能持有一张仍有效的待完成票据。
            $pending=pdo_fetch('SELECT id FROM '.tablename('sage_dksy_reward_ticket').
                ' WHERE uniacid=:u AND openid=:o AND status=0 AND created_at>=:cut LIMIT 1',
                array(':u'=>$uid,':o'=>$user,':cut'=>$now-600));
            if ($pending) throw new Exception('已有视频待完成，请稍后重试');
            $ticket=bin2hex(random_bytes(24));
            $ok=pdo_insert('sage_dksy_reward_ticket',array('uniacid'=>$uid,'openid'=>$user,
                'ticket_hash'=>hash('sha256',$ticket),'status'=>0,'created_at'=>$now,'finished_at'=>0));
            if (!$ok) throw new Exception('播放票据创建失败');
            pdo_commit();
            return json_encode(array('error'=>0,'ticket'=>$ticket,'payout_enabled'=>$r['payout_on'],
                'points'=>$r['payout_on']?$r['points']:0),JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            pdo_rollback(); return $this->safeFailure($e->getMessage());
        }
    }
    public function doPageBonuscancel() {
        global $_W,$_GPC;
        $user=$this->safeVerifiedUser(); if (!$user) return $this->safeError();
        $ticket=isset($_GPC['ticket'])?(string)$_GPC['ticket']:'';
        if (!preg_match('/^[a-f0-9]{48}$/',$ticket)) return $this->safeFailure('票据格式错误');
        pdo_update('sage_dksy_reward_ticket',array('status'=>3,'finished_at'=>time()),array(
            'uniacid'=>(int)$_W['uniacid'],'openid'=>$user,'ticket_hash'=>hash('sha256',$ticket),'status'=>0));
        return json_encode(array('error'=>0));
    }
    public function doPageBonusfinish() {
        global $_GPC,$_W;
        $user=$this->safeVerifiedUser(); if (!$user) return $this->safeError();
        $r=$this->safeRewardSettings(); if (!$r['on']) return $this->safeError('激励视频已关闭');
        $ticket=isset($_GPC['ticket']) ? (string)$_GPC['ticket'] : '';
        if (!preg_match('/^[a-f0-9]{48}$/',$ticket) || !isset($_GPC['isEnded']) || (string)$_GPC['isEnded']!=='1')
            return $this->safeError('没有检测到完整观看，未发放奖励');
        $uid=(int)$_W['uniacid'];$now=time();
        pdo_begin();
        try {
            $owner=pdo_fetch('SELECT id FROM '.tablename('sage_dksy_user').
                ' WHERE uniacid=:u AND openid=:o FOR UPDATE',array(':u'=>$uid,':o'=>$user));
            if (!$owner) throw new Exception('用户不存在');
            $t=pdo_fetch('SELECT * FROM '.tablename('sage_dksy_reward_ticket').
                ' WHERE uniacid=:u AND openid=:o AND ticket_hash=:h FOR UPDATE',
                array(':u'=>$uid,':o'=>$user,':h'=>hash('sha256',$ticket)));
            if (!$t || (int)$t['status']!==0 || (int)$t['created_at'] < $now-600 || (int)$t['created_at'] > $now-5)
                throw new Exception('观看凭证失效、重复使用或时间异常');
            $count=$this->safeBonusCount($user,$this->safeBonusDay());
            if ($count >= $r['limit']) throw new Exception('今日可观看次数已用完');
            // 已完播但不发金币的测试模式：status=2 计入当日观看次数。
            $payout=(int)$r['payout_on']; $points=$payout?$r['points']:0;
            $saved=pdo_update('sage_dksy_reward_ticket',array('status'=>$payout?1:2,'finished_at'=>$now),
                array('id'=>(int)$t['id'],'uniacid'=>$uid,'openid'=>$user,'status'=>0));
            if (!$saved) throw new Exception('观看记录已处理，请勿重复提交');
            if ($payout) {
                // 严格在事务内增加金币与写入流水；不调用旧任务分销奖励。
                $n=pdo_query('UPDATE '.tablename('sage_dksy_user').
                    ' SET num=num + :n WHERE id=:id AND uniacid=:u AND openid=:o',
                    array(':n'=>$points,':id'=>(int)$owner['id'],':u'=>$uid,':o'=>$user));
                if ($n!==1) throw new Exception('金币余额写入失败');
                $ok=pdo_insert('sage_dksy_num_log',array('uniacid'=>$uid,'openid'=>$user,
                    'title'=>'自愿观看激励视频额外奖励','num'=>$points,'static'=>1,'createtime'=>$now));
                if (!$ok) throw new Exception('金币流水写入失败');
            }
            pdo_commit();
            return json_encode(array('error'=>0,'credited'=>$payout,'integral'=>$points,
                'count'=>$count+1,'msg'=>$payout?'额外金币已到账':'激励视频播放测试完成，本次未发放金币'),JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) { pdo_rollback(); return $this->safeFailure($e->getMessage()); }
    }

	public function doPageTest(){
		global $_GPC, $_W;
		$errno = 0;
		$message = '返回消息';

		$url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendminiprogramhb';

		return $this->result($errno, $message, '');
	}
	public function doPageSet(){
		global $_GPC, $_W;
		$code = $_GPC["code"];
        $fromid= $_GPC["fromid"];

		$set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']));
        $set_share=pdo_get('sage_dksy_set_share',array('uniacid'=>$_W['uniacid']));

		//$logintime = strtotime(date('Y-m-d',TIMESTAMP));//当前日期时间戳
		$openids = $this->Getopenids($code);
        if (empty($openids['toopenid'])) return $this->safeError('微信登录失败，请稍后重试');
		$userinfo=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid']));
		if(empty($userinfo)){
			if(!empty($openids['toopenid'])){
				$datetime = strtotime(date('Y-m-d',TIMESTAMP));//当前日期时间戳
                if(false && !empty($fromid)){
                    $fromuser=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid']));
                    if(!empty($fromuser) || empty($set_share['fx_on'])){
                        $fromid='';
                    }
                }
				pdo_insert('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid'],'createtime'=>TIMESTAMP,'logintime'=>$datetime,'fromid'=>''));
                // 判断是否 为分销用户 增加积分
                if(false && !empty($set_share['fx_on']) && !empty($fromid)){
                    // 查询是否分享过
                    $share_user=pdo_get('sage_dksy_user_share',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid'],'fromid'=>$fromid));
                    if(empty($share_user)){
                        pdo_insert('sage_dksy_user_share',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid'],'createtime'=>TIMESTAMP,'fromid'=>$fromid,'integral'=>$set_share['fx_integral']));
                        // 判断二级分销
                        if(!empty($fromid)){
                            $fromuser_share=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$fromid));
                            if(!empty($fromuser_share)){
                                $top_user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],"openid"=>$fromuser_share['fromid']));
                                if(!empty($top_user)){
                                    pdo_insert('sage_dksy_user_share',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid'],'createtime'=>TIMESTAMP,'fromid'=>$openids['toopenid'],'fromid_tow'=>$top_user['openid'],'integral'=>$set_share['fx_integral_two'],'level'=>2));
                                    util::PlusNum($set_share['fx_integral_two'],$top_user['openid'],'二级推广获得奖励！');
                                }
                            }
                        }
                        util::PlusNum($set_share['fx_integral'],$fromid,'分享好友获得奖励！');
                    }

                }
			}
		}
		$user=pdo_get("sage_dksy_user",array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid']));
		if(empty($user['tel'])){
			$tel_on=0;
		}
		else{
			$tel_on=1;
		}
		$nav=pdo_getall('sage_dksy_navigation',array('uniacid'=>$_W['uniacid'],"isshow"=>1,"isother"=>0),array(),'',array("displayorder DESC"));
        foreach($nav as $k=>$v){
            $nav[$k]['icon']=toimage($v['icon']);
            $nav[$k]['iconactive']=toimage($v['iconactive']);
        }
		if(!empty($set['tehuiimg'])){
			$set['tehuiimg']=toimage($set['tehuiimg']);
		}
		if(!empty($set['liuchengimg'])){
			$set['liuchengimg']=toimage($set['liuchengimg']);
		}
		if(!empty($set['integral_img'])){
			$set['integral_img']=toimage($set['integral_img']);
		}
		if(empty($set['integral_title'])){
			$set['integral_title']="金币";
		}

		$set['daytime']=date('Y-m-d',time());
		$set['todaytime']=date('Y-m-d',time()+280*24*60*60);

        //判断当前是否开启每日任务
        $set['task_on']=0; // 旧版每日任务永不随激励视频开关恢复
        $set['share_on']=0;$set['hb_on']=0;
        $set['ad_set']=array();

        $authToken = $this->safeToken($openids['toopenid']);
        if (!$authToken) return $this->safeFailure('测试站小程序 AppSecret 配置不可用，请检查后台账号设置');
        $personal_res = json_encode(array('openid'=>$openids['toopenid'],'apptitle'=>$set['apptitle'],'setinfo'=>$set,'tabBar'=>$nav,'userinfo'=>$user,'tel_on'=>$tel_on,'auth_token'=>$authToken,'auth_version'=>'20261028-appsecret-v3'));
		return $personal_res;
	}
    public function doPageShare(){
        global $_W;
        $set_share=pdo_get('sage_dksy_set_share',array('uniacid'=>$_W['uniacid']));
        $set_share['share_img']=toimage($set_share['share_img']);
        $set_share['fx_on']=0;$set_share['poster_on']=0;
        return json_encode(['share'=>$set_share]);
	}

    public function doPageShareuser(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
        return $this->safeError('分享返积分功能已经停用');
        global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

        $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$safeUser));
        if(empty($user)){
            $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$user['fromid']));
            return json_encode(['user'=>$user,'user_share'=>'0']);
        }
        return json_encode(['user'=>'0']);
    }

    public function doPageQrcode(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
        global $_GPC, $_W;
        $code = $_GPC["code"];
        $openids = $this->Getopenids($code);
        $request=util::qrcode($openids['toopenid']);
        if(!empty($request['content'])){
            $filename = IA_ROOT.'/addons/sage_dksy/images/'.$openids['toopenid'].'.jpg'; // 自定义文件名
            file_put_contents($filename, $request['content']);
            return $_W['siteroot'].'addons/sage_dksy/images/'.$openids['toopenid'].'.jpg';
        }
        else{
            return '';
        }
//        return $_W['siteroot'].'addons/sage_dksy/images/'.$openids['toopenid'].'.jpg';

    }
    public function doPagePoster(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
        global $_W;
        $set=pdo_get('sage_dksy_set_share',array('uniacid'=>$_W['uniacid']));
        return toimage($set['poster_bg']);
    }
    //分销统计
    // 一级分销
    public function doPageSharelist(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
        global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

        $pages=$_GPC['pages'];
        $code = $_GPC["code"];
        $openid=$safeUser;

        $where=array('uniacid'=>$_W["uniacid"],'fromid'=>$openid,'level'=>1);
        $list=pdo_getall('sage_dksy_user_share', $where, array() , '' , 'createtime DESC' , array($pages,10));
        $total_one = pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_user_share') . " WHERE uniacid = :uniacid and fromid = :openid and level=1", array(':uniacid' => $_W['uniacid'],  ':openid'=>$openid));
        $total_two = pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_user_share') . " WHERE uniacid = :uniacid and fromid_tow = :openid and level=2", array(':uniacid' => $_W['uniacid'],  ':openid'=>$openid));
        if(empty($trial)){
            $page=0;
        }
        else{
            $page=1;
        }
        foreach($list as $key=>$v){
            $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$v['openid']));
            if(!empty($user['headimg'])){
                $list[$key]['headimg']=toimage($user['headimg']);
            }
            if(!empty($user['nickname'])){
                $list[$key]['nickname']=$user['nickname'];
            }
            else{
                $list[$key]['nickname']="未授权用户";
            }
            if(!empty($user['id'])){
                $list[$key]['user_id']=$user['id'];
            }
            else{
                $list[$key]['user_id']="";
            }

            $list[$key]['createtime']=date('Y-m-d H:i:s',$v['createtime']);
        }
        $personal_res = json_encode(array('list' => $list,'page'=>$page,'openid'=>$openid,'total_one'=>$total_one,'total_two'=>$total_two));
        return $personal_res;
    }
    // 二级分销列表
    public function doPageSharelisttwo(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
        global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

        $pages=$_GPC['pages'];
        $code = $_GPC["code"];
        $openid=$safeUser;

        $where=array('uniacid'=>$_W["uniacid"],'fromid_tow'=>$openid,'level'=>2);
        $list=pdo_getall('sage_dksy_user_share', $where, array() , '' , 'createtime DESC' , array($pages,10));

        $total_one = pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_user_share') . " WHERE uniacid = :uniacid and fromid = :openid and level=1", array(':uniacid' => $_W['uniacid'],  ':openid'=>$openid));
        $total_two = pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_user_share') . " WHERE uniacid = :uniacid and fromid_tow = :openid and level=2", array(':uniacid' => $_W['uniacid'],  ':openid'=>$openid));
        if(empty($trial)){
            $page=0;
        }
        else{
            $page=1;
        }
        foreach($list as $key=>$v){
            $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$v['openid']));
            if(!empty($user['headimg'])){
                $list[$key]['headimg']=toimage($user['headimg']);
            }
            if(!empty($user['nickname'])){
                $list[$key]['nickname']=$user['nickname'];
            }
            else{
                $list[$key]['nickname']="未授权用户";
            }
            if(!empty($user['id'])){
                $list[$key]['user_id']=$user['id'];
            }
            else{
                $list[$key]['user_id']="";
            }
            $userF=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$user['fromid']));
            if(!empty($userF)){
                $list[$key]['user_fromid']=$userF['id'];
            }
            $list[$key]['createtime']=date('Y-m-d H:i:s',$v['createtime']);
        }
        $personal_res = json_encode(array('list' => $list,'page'=>$page,'openid'=>$openid,'total_one'=>$total_one,'total_two'=>$total_two));
        return $personal_res;
    }

	public function doPageAdset(){
		global $_GPC, $_W;
		$legacyAd=pdo_get('sage_dksy_adset',array('uniacid'=>$_W['uniacid']));
        $adset=$this->safeAdPolicy($legacyAd);
        $adset['v3_slots']=$this->safeV3AdSlots($legacyAd);
        $bonus=$this->safeRewardSettings();
        $adset['reward_on']=$bonus['on']; $adset['jvideo_id']=$bonus['unit'];
		$personal_res = json_encode(array('adset'=>$adset,'daytime'=>''));
		return $personal_res;
	}
	public function doPageGetopenid(){
		global $_GPC, $_W;
		$code = $_GPC["code"];
		$openids = $this->Getopenids($code);
		$personal_res = json_encode(array('openid'=>$openids['toopenid']));
		return $personal_res;

	}
	public function doPageSettrial(){
		global $_GPC, $_W;
		$code = $_GPC["code"];

		$set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']));
		//$logintime = strtotime(date('Y-m-d',TIMESTAMP));//当前日期时间戳
		$openids = $this->Getopenids($code);
        if (empty($openids['toopenid'])) return $this->safeError('微信登录失败，请稍后重试');
		$userinfo=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid']));
		if(empty($userinfo)){
			if(!empty($openids['toopenid'])){
				$datetime = strtotime(date('Y-m-d',TIMESTAMP));//当前日期时间戳
				pdo_insert('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid'],'createtime'=>TIMESTAMP,'logintime'=>$datetime));
			}
		}
		$user=pdo_get("sage_dksy_user",array('uniacid'=>$_W['uniacid'],'openid'=>$openids['toopenid']));
		$nav=pdo_getall('sage_dksy_navigation',array('uniacid'=>$_W['uniacid'],"isshow"=>1,"isother"=>0));
		if(!empty($set['tehuiimg'])){
			$set['tehuiimg']=toimage($set['tehuiimg']);
		}
		$set['liuchengimg']=toimage($set['liuchengimg']);
		$set['daytime']=date('Y-m-d',time());
		$set['todaytime']=date('Y-m-d',time()+280*24*60*60);
		$set['share_on']=0;$set['hb_on']=0;
        $set['ad_set']=array();$set['task_on']=0;
        $authToken = $this->safeToken($openids['toopenid']);
        if (!$authToken) return $this->safeFailure('测试站小程序 AppSecret 配置不可用，请检查后台账号设置');
        $personal_res = json_encode(array('openid'=>$openids['toopenid'],'apptitle'=>$set['apptitle'],'setinfo'=>$set,'tabBar'=>$nav,'userinfo'=>$user,'auth_token'=>$authToken,'auth_version'=>'20261028-appsecret-v3'));
		return $personal_res;
	}

	//签到数据
	public function doPageQianinfo(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$openid=$safeUser;
		$datetime = util::beijingDay();//签到日统一按北京时间，不依赖服务器默认时区。
		//查看当前日期是否签到
		$today_qians=pdo_get('sage_dksy_qian',array('uniacid'=>$_W['uniacid'],'openid'=>$openid,'datetime'=>$datetime));
		if($today_qians){
			$fanbei=$today_qians['fanbei'];
			$today_qian=1;//已经签到
			$qianid=$today_qians['id'];
		}
		else{
			$fanbei=0;
			$today_qian=2;//没有签到
			$qianid=0;
		}
		//判断前一天是否签到了  既是否在连续签到
		$qd=util::getQian_last($openid);
		if($qd==1){
			$re=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
			$qian_num=intval($re['qian_num']);
		}
		elseif($qd==2){
			$qian_num=1;
		}
		else{
			$qian_num=0;
		}
		//订阅消息模板
		$template=pdo_getall("sage_dksy_template",array("uniacid"=>$_W['uniacid'],"typeid"=>1));
		$template_str=array();
		if(empty($template)){
			$template_on=0;
		}
		else{
			$template_on=count($template);
			for($i=0;$i<count($template);$i++){
				$template_str[$i]=$template[$i]['priTmplId'];
			}
		}
		return json_encode(array('qd'=>$qian_num,'today_qian'=>$today_qian,'qianid'=>$qianid,'fanbei'=>$fanbei,'ss'=>$qd,'openid'=>$openid,'template_on'=>$template_on,'template_str'=>$template_str));
	}

    public function doPageQian(){
        global $_W;
        $openid=$this->safeVerifiedUser(); if (!$openid) return $this->safeError();
        $uid=(int)$_W['uniacid'];
        pdo_begin();
        try {
            // 同一用户的签到请求串行处理，避免快速重复点击重复发金币。
            $locked=pdo_fetch('SELECT id FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND openid=:o FOR UPDATE',array(':u'=>$uid,':o'=>$openid));
            if (!$locked) throw new Exception('用户信息不存在');
            $set=pdo_get('sage_dksy_set',array('uniacid'=>$uid));
            $result=util::qian($openid,$set);
            if ((int)$result['error']!==0) {
                pdo_rollback();
                // An already-signed retry may recover a prior referral check; it must
                // never write another ordinary sign reward or trust a client amount.
                $reply=array('error'=>1,'msg'=>$result['msg'],'num'=>0);
                try { $reply['referral']=$this->v150SafeProcessUser($openid); }
                catch (\Throwable $referralError) {
                    error_log('[YX150] sign retry referral check pending');
                    $reply['referral']=array('state'=>'pending');
                }
                return json_encode($reply);
            }
            pdo_commit();
            $reply=array('error'=>0,'msg'=>'签到成功','num'=>$result['qian_num'],'qianid'=>$result['qianid']);
            // Referral settlement has its own transaction after the real sign commit.
            // Its failure cannot undo, duplicate, or misreport the ordinary sign-in.
            try { $reply['referral']=$this->v150SafeProcessUser($openid); }
            catch (\Throwable $referralError) {
                error_log('[YX150] signed referral check pending');
                $reply['referral']=array('state'=>'pending');
            }
            return json_encode($reply);
        } catch (Exception $e) {
            pdo_rollback(); return $this->safeFailure('签到暂未成功，请稍后重试');
        }
    }

    //每日任务当前日期签到次数
    public function doPageSettask(){
        global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

        $set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']),['task_on','task_integral','task_num','task_jvideo_id']);
        if(false && !empty($set) && $set['task_on']==1){
            $openid=$safeUser;
            $datetime = strtotime(date('Y-m-d',time()));//当前日期时间戳
            $task_count=pdo_count('sage_dksy_task',array('uniacid'=>$_W['uniacid'],'openid'=>$openid,'datetime'=>$datetime));
            return json_encode(array('error'=>0,'msg'=>'获取成功','task_count'=>$task_count));
        }
        return json_encode(array('error'=>1,'msg'=>'获取成功','task_count'=>0));
    }

    public function doPageAddtask(){
        return $this->safeError('原每日任务接口已停用，请使用新版自愿奖励流程');
        global $_W,$_GPC;
        $openid=$_GPC['openid'];
        $set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']),['task_on','task_integral','task_num','task_jvideo_id','task_time_on','task_time_start','task_time_end','task_day_on','task_distribution_one','task_distribution_two']);
        $set['task_on']=util::getTaskOn($set,$openid);
        if(!empty($set) && $set['task_on']==1 && !empty($openid)){
            $time=time();
            $datetime = strtotime(date('Y-m-d',$time));//当前日期时间戳
            $task_count=pdo_count('sage_dksy_task',array('uniacid'=>$_W['uniacid'],'openid'=>$openid,'datetime'=>$datetime));
            if($task_count>=$set['task_num']){
                return json_encode(array('error'=>1,'msg'=>'今日任务已完成'));
            }
            pdo_insert("sage_dksy_task",['uniacid'=>$_W['uniacid'],'openid'=>$openid,'datetime'=>$datetime,'integral'=>$set['task_integral'],'create_time'=>$time]);
            util::PlusNum($set['task_integral'],$openid,'每日任务获得奖励');
            //查看用户是否为合伙人
            $re=pdo_get('sage_dksy_user_share',array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
            if(!empty($re)){
                if(!empty($re['fromid'])){
                    //如果有一级推荐人
                    $partner=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$re['fromid']));
                    if(!empty($partner) && $partner['partner']==1) {
                        util::PlusNum($set['task_distribution_one'],$re['fromid'],'每日任务分销奖励');
                    }
                }
                if(!empty($re['fromid_tow'])){
                    //如果有一级推荐人
                    $partner=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$re['fromid_tow']));
                    if(!empty($partner) && $partner['partner']==1) {
                        util::PlusNum($set['task_distribution_two'],$re['fromid_tow'],'每日任务分销奖励');
                    }
                }
            }

            return json_encode(array('error'=>0,'msg'=>'获取成功','integral'=>$set['task_integral']));
        }
        return json_encode(array('error'=>2,'msg'=>'参数错误'));
    }

	//积分翻倍
	public function doPageFanbei(){
        return $this->safeError('旧版签到翻倍接口已停用');
		global $_W,$_GPC;
		$openid=$_GPC['openid'];
		$qianid=$_GPC['qianid'];
		$set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']));
		$qian=util::fanbei($openid,$set,$qianid);
		return json_encode(array('error'=>$qian['error'],'msg'=>$qian['msg'],'num'=>$qian['qian_num']));
	}

	//门店特惠
	public function doPageTehui(){
		global $_W,$_GPC;
		$pages=$_GPC['pages'];
		$where=array('uniacid'=>$_W["uniacid"]);
		$swiper=pdo_getall('sage_dksy_admassage',array("uniacid"=>$_W['uniacid']));
		if(empty($swiper)){
			$swiper=0;
		}
		else{
			foreach($swiper as $k=>$v){
				$swiper[$k]['picurl']=toimage($v['picurl']);
			}
		}

		$tehui=pdo_getall('sage_dksy_tehui', $where, array() , '' , 'id DESC' , array($pages,10));
		if(empty($tehui)){
			$page=0;
		}
		else{
			$page=1;
		}
		foreach($tehui as $key=>$v){
			$tehui[$key]['tag_title']=util::getTehuiTag($v['tagid'])['tag_title'];
			$tehui[$key]['tag_color']=util::getTehuiTag($v['tagid'])['tag_color'];
			$tehui[$key]['tag_bgcolor']=util::getTehuiTag($v['tagid'])['tag_bgcolor'];
		}

		$personal_res = json_encode(array('tehui' => $tehui,'page'=>$page,'swiper'=>$swiper));

		return $personal_res;
	}
	//特惠详情
	public function doPageTehuishow(){
		global $_W,$_GPC;
		$id=$_GPC['id'];
		$tehui_show=pdo_get("sage_dksy_tehui",array("uniacid"=>$_W['uniacid'],"id"=>$id));
		if(!empty($tehui_show)){
			pdo_update('sage_dksy_tehui',array('num'=>$tehui_show['num']+1),array("id"=>$id));
			$tehui_show['num']=$tehui_show['num']+$tehui_show['num_v']+1;
		}

		$tehui_show['createtime']=date("Y-m-d",$tehui_show['createtime']);
		$tehui_show['content']=str_replace('&nbsp;','　',$tehui_show['content']);

		$personal_res = json_encode(array('tehui_show' => $tehui_show));
		return $personal_res;
	}
	//试用中心
	public function doPageTrial(){
		global $_W,$_GPC;
		$pages=$_GPC['pages'];
		$where=array('uniacid'=>$_W["uniacid"]);
		$trial=pdo_getall('sage_dksy_trial_pro', $where, array() , '' , 'pro_id DESC' , array($pages,10));
		if(empty($trial)){
			$page=0;
		}
		else{
			$page=1;
		}
		foreach($trial as $key=>$v){
			$time=time();
			if($v['start_time']>$time){
				//活动未开始
				$trial[$key]['isyes']='0';
			}
			elseif($v['end_time']<$time){
				//活动已结束
				$trial[$key]['isyes']='2';
			}
			else{
				$trial[$key]['isyes']='1';
			}
			$trial[$key]['pro_picurl']=toimage($v['pro_picurl']);
			$trial[$key]['see_num']=(int)$v['see_num'];
			$trial[$key]['apply_num']=(int)$v['apply_num'];
			$trial[$key]['start_time']=date('Y-m-d H:i:s',$v['start_time']);
			$trial[$key]['end_time']=date('Y-m-d H:i:s',$v['end_time']);
			$trial[$key]['end_time']=date('Y-m-d H:i:s',$v['end_time']);
			$trial[$key]['createtime']=date('Y-m-d H:i:s',$v['createtime']);
		}
		$personal_res = json_encode(array('trial' => $trial,'page'=>$page));

		return $personal_res;
	}
	//试用详情
	public function doPageTrialshow(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$id=$_GPC['id'];
		$openid=$safeUser;
		$time=time();
		$trial_show=pdo_get("sage_dksy_trial_pro",array("uniacid"=>$_W['uniacid'],"pro_id"=>$id));
		if($trial_show['start_time']>$time){
			//活动未开始
			$trial_show['isyes']='0';
		}
		elseif($trial_show['end_time']<$time){
			//活动已结束
			$trial_show['isyes']='2';
		}
		else{
			$trial_show['isyes']='1';
		}
		$trial_show['pro_picurl']=toimage($trial_show['pro_picurl']);
		$trial_show['see_num']=(int)$trial_show['see_num'];
		$trial_show['apply_num']=(int)$trial_show['apply_num'];
		$trial_show['end_time_day']=date('Y-m-d',$trial_show['end_time']);
		$trial_show['baogao_time_day']=date('Y-m-d',$trial_show['baogao_time']);
		$trial_show['start_time']=date('Y-m-d H:i:s',$trial_show['start_time']);
		$trial_show['end_time']=date('Y-m-d H:i:s',$trial_show['end_time']);
		$trial_show['baogao_time']=date('Y-m-d H:i:s',$trial_show['baogao_time']);
		$trial_show['createtime']=date('Y-m-d H:i:s',$trial_show['createtime']);
		$tehui_show['content']=str_replace('&nbsp;','　',$trial_show['content']);
		if($trial_show['isyes']=='2' && (int)$trial_show['open_prize']===1){
			$trial_input=pdo_fetchall("SELECT * FROM " . tablename('sage_dksy_trial_input') . " WHERE uniacid = :uniacid AND pro_id=:pro_id AND prize_on=1 ORDER BY id DESC LIMIT 7", array(':uniacid' => $_W['uniacid'],":pro_id"=>$id));
			foreach($trial_input as $k=>$v){
				$trial_input[$k]=array('nickname'=>'已中选用户','headimg'=>'');
			}

		}
		else{
			$trial_input=array();
		}
		$trial_share=array(); // 停用邀请解锁及不必要的参与者个人信息展示。
		$personal_res = json_encode(array('trial_show' => $trial_show,'trial_input' => $trial_input,'trial_share' => $trial_share));
		return $personal_res;
	}

    public function doPageTrialprize(){
        global $_W,$_GPC;
        $id=(int)$_GPC['id'];
        $uid=(int)$_W['uniacid'];
        $pro=pdo_get('sage_dksy_trial_pro',array('uniacid'=>$uid,'pro_id'=>$id));
        if (!$pro || (int)$pro['open_prize']!==1 || (int)$pro['end_time']>=time()) {
            return json_encode(array('trial_input'=>array()),JSON_UNESCAPED_UNICODE);
        }
        $records=pdo_fetchall('SELECT id FROM '.tablename('sage_dksy_trial_input')
            .' WHERE uniacid=:u AND pro_id=:p AND prize_on=1 ORDER BY id DESC',array(':u'=>$uid,':p'=>$id));
        $list=array();
        foreach ((array)$records as $record) $list[]=array('nickname'=>'已中选用户','headimg'=>'');
        return json_encode(array('trial_input'=>$list),JSON_UNESCAPED_UNICODE);
    }

	public function doPageTrialinput(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$id=$_GPC['id'];
		$openid=$safeUser;
		$time=time();

		$trial_show=pdo_get("sage_dksy_trial_pro",array("uniacid"=>$_W['uniacid'],"pro_id"=>$id));
		if($trial_show['start_time']>$time){
			//活动未开始
			$trial_show['isyes']='0';
		}
		elseif($trial_show['end_time']<$time){
			//活动已结束
			$trial_show['isyes']='2';
		}
		else{
			$trial_show['isyes']='1';
		}
		$trial_show['see_num']=(int)$trial_show['see_num'];
		$trial_show['apply_num']=(int)$trial_show['apply_num'];
		$trial_show['pro_picurl']=toimage($trial_show['pro_picurl']);

		$address=util::addressGet(["uniacid"=>$_W['uniacid'],"openid"=>$openid]);
		$personal_res = json_encode(array('trial_show' => $trial_show,'addressinfo'=>$address,'openid'=>$openid));
		return $personal_res;
	}

	public function doPageTrialshare(){
        return $this->safeFailure('分享奖励与海报任务已停用，正常分享不影响使用');
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$id=$_GPC['id'];
		$openid=$safeUser;
		$trial_share=array(); // 分享任务停用
		$personal_res = json_encode(array('trial_share' => $trial_share));
		return $personal_res;
	}



    public function doPageTrialinput_save(){
        global $_W,$_GPC;
        $uid=(int)$_W['uniacid'];
        $openid=$this->safeVerifiedUser();
        if (!$openid) return $this->safeError();
        $id=(int)$_GPC['id'];
        $name=trim((string)$_GPC['username']);
        $tel=trim((string)$_GPC['tel']);
        $address=trim((string)$_GPC['address']);
        $birth=trim((string)$_GPC['borth']);
        // 报名无需姓名、电话或收货地址；仅在中选后主动填写资料。
        if ($id<1) return $this->safeFailure('活动参数不正确');
        if (($name || $tel || $address) && (!$name || !$tel || !$address)) return $this->safeFailure('联系资料可不填；若填写请完整填写');
        if (mb_strlen($name,'UTF-8')>45 || mb_strlen($tel,'UTF-8')>30 || mb_strlen($address,'UTF-8')>250 || mb_strlen($birth,'UTF-8')>30) return $this->safeFailure('填写内容过长');
        if ($tel && !preg_match('/^[0-9+()\-\s]{7,25}$/',$tel)) return $this->safeFailure('请核对联系电话格式');
        pdo_begin();
        try {
            $owner=pdo_fetch('SELECT id FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND openid=:o FOR UPDATE',array(':u'=>$uid,':o'=>$openid));
            if (!$owner) throw new Exception('账号未初始化');
            $trial=pdo_fetch('SELECT pro_id,start_time,end_time FROM '.tablename('sage_dksy_trial_pro').' WHERE uniacid=:u AND pro_id=:id FOR UPDATE',array(':u'=>$uid,':id'=>$id));
            if (!$trial || (int)$trial['start_time']>time() || (int)$trial['end_time']<time()) throw new Exception('活动不在报名时间内');
            $prior=pdo_get('sage_dksy_trial_input',array('uniacid'=>$uid,'openid'=>$openid,'pro_id'=>$id));
            if ($prior) throw new Exception('已经参与过本次活动');
            if (!pdo_insert('sage_dksy_trial_input',array('uniacid'=>$uid,'openid'=>$openid,'pro_id'=>$id,'address'=>$address,'username'=>$name,'tel'=>$tel,'borth'=>$birth,'createtime'=>time()))) throw new Exception('报名记录保存失败');
            pdo_query('UPDATE '.tablename('sage_dksy_trial_pro').' SET apply_num=apply_num+1 WHERE uniacid=:u AND pro_id=:id',array(':u'=>$uid,':id'=>$id));
            // 不重复持久化到共享地址簿：将个人信息限定在本次报名范围内。
            pdo_commit();
            return json_encode(array('error'=>0,'msg'=>'报名成功，中选后再填写收货资料'),JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            pdo_rollback();return $this->safeFailure($e->getMessage());
        }
    }

    public function doPageTrialaddress(){
        global $_W,$_GPC;
        $openid=$this->safeVerifiedUser(); if (!$openid) return $this->safeError();
        $id=(int)$_GPC['id'];$uid=(int)$_W['uniacid'];
        $name=trim((string)$_GPC['username']);$tel=trim((string)$_GPC['tel']);$addr=trim((string)$_GPC['address']);
        if (!$name || !$tel || !$addr) return $this->safeFailure('请完整填写收货资料');
        if (mb_strlen($name,'UTF-8')>45 || mb_strlen($addr,'UTF-8')>250 || !preg_match('/^[0-9+()\\-\\s]{7,25}$/',$tel)) return $this->safeFailure('请核对收货信息');
        $record=pdo_get('sage_dksy_trial_input',array('id'=>$id,'uniacid'=>$uid,'openid'=>$openid,'prize_on'=>1));
        if (!$record) return $this->safeFailure('当前没有可补充收货资料的中选记录');
        $activity=pdo_get('sage_dksy_trial_pro',array('uniacid'=>$uid,'pro_id'=>(int)$record['pro_id']));
        if (!$activity || (int)$activity['open_prize']!==1 || (int)$activity['end_time']>=time()) {
            return $this->safeFailure('活动中选结果尚未正式公布，暂不能填写收货资料');
        }
        $ok=pdo_update('sage_dksy_trial_input',array('username'=>$name,'tel'=>$tel,'address'=>$addr),array('id'=>$id,'uniacid'=>$uid,'openid'=>$openid,'prize_on'=>1));
        return json_encode(array('error'=>$ok===false?1:0,'msg'=>$ok===false?'保存失败，请重试':'收货资料已保存'),JSON_UNESCAPED_UNICODE);
    }

	//兑换奖品
	public function doPagePrize(){
		global $_W,$_GPC;
		$pages=$_GPC['pages'];
		$pindex = max(1, intval($_GPC['pages']));

		$psize=20;
		$limit = 'ORDER BY orderid DESC, prize_id DESC LIMIT ' . ($pindex - 1) * $psize . ", {$psize}";
		$prize = pdo_fetchall("SELECT * FROM " . tablename('sage_dksy_prize') . " WHERE uniacid = :uniacid AND prize_num > 0 {$limit}", array(':uniacid' => $_W['uniacid']));
		if(empty($prize)){
			$page=0;
		}
		else{
			$page=1;
		}
		if($prize){
			foreach($prize as &$v){
				$time=time();
				$v['prize_picurl']=toimage($v['prize_picurl']);
				$v['prize_exchange']=$v['prize_exchange']+$v['prize_exchange_x'];
			}
			unset($p);
		}
		$personal_res = json_encode(array('prize' => $prize,'page'=>$page));
		return $personal_res;
	}
	//兑换奖品
	public function doPageIndexprize(){
		global $_W,$_GPC;
		$pages=$_GPC['pages'];
		$pindex = max(1, intval($_GPC['pages']));

		$psize=20;
		$limit = 'ORDER BY orderid DESC, prize_id DESC LIMIT ' . ($pindex - 1) * $psize . ", {$psize}";
		$prize = pdo_fetchall("SELECT * FROM " . tablename('sage_dksy_prize') . " WHERE uniacid = :uniacid AND prize_num > 0 AND index_on=1 {$limit}", array(':uniacid' => $_W['uniacid']));
		if(empty($prize)){
			$page=0;
		}
		else{
			$page=1;
		}
		if($prize){
			foreach($prize as &$v){
				$time=time();
				$v['prize_picurl']=toimage($v['prize_picurl']);
				$v['prize_exchange']=$v['prize_exchange']+$v['prize_exchange_x'];
			}
			unset($p);
		}
		$personal_res = json_encode(array('prize' => $prize,'page'=>$page));
		return $personal_res;
	}

	public function doPagePrizeshow(){
		global $_W,$_GPC;
		$id=$_GPC['id'];
		$time=time();
		$prize_show=pdo_get("sage_dksy_prize",array("uniacid"=>$_W['uniacid'],"prize_id"=>$id));

		$prize_show['prize_picurl']=toimage($prize_show['prize_picurl']);
		$prize_pics = explode(",", $prize_show['prize_pics']);
		foreach($prize_pics as $k=>$v){
			$prize_pics[$k]=toimage($v);
		}
		$prize_show['prize_pics']=$prize_pics;
		$template=pdo_getall("sage_dksy_template",array("uniacid"=>$_W['uniacid'],"typeid"=>2));
		$template_str=array();
		if(empty($template)){
			$template_on=0;
		}
		else{
			$template_on=count($template);
			for($i=0;$i<count($template);$i++){
				$template_str[$i]=$template[$i]['priTmplId'];
			}
		}

		$personal_res = json_encode(array('prize_show' => $prize_show,'template_on'=>$template_on,'template_str'=>$template_str));
		return $personal_res;
	}
	//兑换订单

    public function doPageOrder(){
        global $_W,$_GPC;
        $user=$this->safeVerifiedUser(); if (!$user) return $this->safeError();
        $id=(int)$_GPC['id'];$uid=(int)$_W['uniacid'];
        if ($id<=0) return $this->safeFailure('请选择正确的商品');
        $address=trim((string)$_GPC['address']);$remark=trim((string)$_GPC['remark']);
        if (mb_strlen($address,'UTF-8')>255 || mb_strlen($remark,'UTF-8')>800) return $this->safeFailure('输入内容过长');
        pdo_begin();
        try {
            $owner=pdo_fetch('SELECT id,num FROM '.tablename('sage_dksy_user').' WHERE uniacid=:u AND openid=:o FOR UPDATE',array(':u'=>$uid,':o'=>$user));
            if (!$owner) throw new Exception('用户信息不存在，请重新进入');
            $p=pdo_fetch('SELECT * FROM '.tablename('sage_dksy_prize').' WHERE uniacid=:u AND prize_id=:id FOR UPDATE',array(':u'=>$uid,':id'=>$id));
            if (!$p || (int)$p['prize_num']<=0) throw new Exception('商品已经兑完了');
            if ((int)$p['prize_type']===0 && (!$address || $address==='请填写收货地址')) throw new Exception('请先选择收货地址');
            if ((int)$p['prize_type']===1 && !$remark) throw new Exception('请填写兑换备注');
            $need=(int)$p['prize_integral'];
            if ($need<=0 || $need>10000000) throw new Exception('兑换规则未配置');
            // 沿用旧逻辑 repeat_on=1 代表限制每人重复领取。
            if (!empty($p['repeat_on'])) {
                $old=pdo_get('sage_dksy_order',array('uniacid'=>$uid,'openid'=>$user,'prize_id'=>$id));
                if ($old) throw new Exception('您已经兑换过这件商品');
            }
            $ok=pdo_query('UPDATE '.tablename('sage_dksy_user').' SET num=num-:n WHERE uniacid=:u AND openid=:o AND num>=:n2',array(':n'=>$need,':n2'=>$need,':u'=>$uid,':o'=>$user));
            if ($ok!==1) throw new Exception('金币余额不足');
            $ok=pdo_query('UPDATE '.tablename('sage_dksy_prize').' SET prize_num=prize_num-1,prize_exchange=prize_exchange+1 WHERE uniacid=:u AND prize_id=:id AND prize_num>0',array(':u'=>$uid,':id'=>$id));
            if ($ok!==1) throw new Exception('商品库存不足');
            $ok=pdo_insert('sage_dksy_order',array('uniacid'=>$uid,'openid'=>$user,'prize_id'=>$id,'address'=>$address,'createtime'=>time(),'remark'=>$remark,'prize_type'=>(int)$p['prize_type']));
            if (!$ok) throw new Exception('创建兑换订单失败');
            $ok=pdo_insert('sage_dksy_num_log',array('uniacid'=>$uid,'openid'=>$user,'title'=>'兑换'.$p['prize_title'],'num'=>$need,'static'=>2,'createtime'=>time()));
            if (!$ok) throw new Exception('积分流水保存失败');
            pdo_commit();
            return json_encode(array('error'=>0,'msg'=>'兑换成功，请在兑换记录中查询处理进度'));
        } catch (Exception $e) {
            pdo_rollback(); return $this->safeFailure($e->getMessage());
        }
    }

	//兑换订单
	public function doPageUserorder(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$code = $_GPC["code"];
		$openid=$safeUser;

		$pindex = max(1, intval($_GPC['pages']));
		$psize=20;
		$limit = 'ORDER BY id DESC LIMIT ' . ($pindex - 1) * $psize . ", {$psize}";
		$userorder = pdo_fetchall("SELECT * FROM " . tablename('sage_dksy_order') . " WHERE uniacid = :uniacid AND openid=:openid {$limit}", array(':uniacid' => $_W['uniacid'],':openid'=>$openid));
		if(empty($userorder)){
			$page=0;
		}
		else{
			$page=1;
		}
		foreach ($userorder as $k=>$v) {
			$userorder[$k]['prize']=util::getPrize($v['prize_id']);
			if(empty($v['isyes'])){
				$userorder[$k]['isyes_name']="未处理";
			}
            elseif($v['isyes']==2){
				$userorder[$k]['isyes_name']="已退单";
			}
			else{
				$userorder[$k]['isyes_name']="已邮寄";
			}
			$userorder[$k]['createtime']=date("Y-m-d",$v['createtime']);
		}
		return json_encode(array('userorder' =>$userorder,'openid'=>$openid,'page'=>$page));
	}

	//金币记录
	public function doPageNumlog(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$code = $_GPC["code"];
		$openid=$safeUser;

		$pindex = max(1, intval($_GPC['pages']));
		$psize=10;
		$limit = 'ORDER BY id DESC LIMIT ' . ($pindex - 1) * $psize . ", {$psize}";
		$num_log = pdo_fetchall("SELECT * FROM " . tablename('sage_dksy_num_log') . " WHERE uniacid = :uniacid AND openid=:openid {$limit}", array(':uniacid' => $_W['uniacid'],':openid'=>$openid));
		if(empty($num_log)){
			$page=0;
		}
		else{
			$page=1;
		}
		foreach ($num_log as $k=>$v) {

			if($v['static']==1){
				$num_log[$k]['static_title']="增加";
			}
			else{
				$num_log[$k]['static_title']="扣除";
			}
			$num_log[$k]['createtime']=date("Y-m-d",$v['createtime']);
		}
		return json_encode(array('num_log' =>$num_log,'openid'=>$openid,'page'=>$page));
	}

    // 试用报名记录：报名、活动状态、正式中选结果是三个独立概念。
    public function doPageTriallist(){
        global $_W,$_GPC;
        $openid=$this->safeVerifiedUser();
        if (!$openid) return $this->safeError();
        $uid=(int)$_W['uniacid'];
        $filter=((int)$_GPC['prize_on']===1)?1:0;
        $page=max(1,min(100000,(int)$_GPC['pages']));
        $size=20;
        $now=time();
        $sql=' FROM '.tablename('sage_dksy_trial_input').' AS i INNER JOIN '
            .tablename('sage_dksy_trial_pro').' AS p ON p.pro_id=i.pro_id AND p.uniacid=i.uniacid'
            .' WHERE i.uniacid=:u AND i.openid=:o';
        $args=array(':u'=>$uid,':o'=>$openid);
        if ($filter===1) {
            // “已中选”仅展示活动结束、后台正式公布且被选中的记录。
            $sql.=' AND i.prize_on=1 AND p.open_prize=1 AND p.end_time<:now';
            $args[':now']=$now;
        }
        $limit=' ORDER BY i.id DESC LIMIT '.(($page-1)*$size).', '.$size;
        // 最小化返回字段：不把联系方式、住址或隐私字段下发到记录列表。
        $list=pdo_fetchall('SELECT i.id,i.pro_id,i.prize_on,i.createtime,p.end_time,p.open_prize,p.pro_title,p.pro_picurl '
                .$sql.$limit,$args);
        if (!is_array($list)) $list=array();
        $output=array();
        foreach ($list as $item) {
            $finished=((int)$item['end_time']<$now);
            $published=($finished && (int)$item['open_prize']===1);
            $selected=($published && (int)$item['prize_on']===1);
            $status=$published ? ($selected?'selected':'not_selected') : 'pending';
            $statusText=$status==='selected'?'已中选':($status==='not_selected'?'未中选':($finished?'待公布结果':'已报名 · 待公布'));
            $output[]=array(
                'id'=>(int)$item['id'],
                'pro_id'=>(int)$item['pro_id'],
                'trial_pro'=>array('pro_title'=>(string)$item['pro_title'], 'pro_picurl'=>toimage($item['pro_picurl'])),
                'createtime'=>date('Y-m-d',(int)$item['createtime']),
                // 旧版前端继续识别 prize_on 文本，不能让它误写“申请成功”。
                'prize_on'=>$statusText,
                'trial_status'=>$status,
                'status_text'=>$statusText,
                'can_complete'=>$selected?1:0
            );
        }
        return json_encode(array('error'=>0,'triallist'=>$output,'page'=>count($list)===$size?1:0),JSON_UNESCAPED_UNICODE);
    }

	//红包
	public function doPageHblist(){
        return json_encode(array('hblist'=>array(),'error'=>0)); // 现金红包奖励安全下线
		global $_W;
		$set=pdo_get("sage_dksy_set",array("uniacid"=>$_W['uniacid']));
		if(empty($set['hb_on'])){
			return json_encode(array('triallist' =>''));
		}

		$hblist=pdo_fetchall("SELECT * FROM ".tablename('sage_dksy_hb')." WHERE uniacid=:uniacid ORDER BY displayorder DESC, id DESC", array(":uniacid"=>$_W['uniacid']));
		foreach ($hblist as $k=>$v) {
			$hblist[$k]['icon']=toimage($v['icon']);
			$hblist[$k]['hb_fee']=$v['hb_fee']/100;
		}
		return json_encode(array('hblist' =>$hblist));
	}
	public function doPageGethb(){
        return $this->safeError('现金红包功能暂未开放');
		global $_W,$_GPC;
		$id=$_GPC['id'];
		$openid=$_GPC['openid'];
		if(empty($id) || empty($openid)){
			return json_encode(array('error' =>1,'msg'=>"参数错误！点击确定重试",'id'=>$id,"openid"=>$openid));
		}
		$time=time();
		$daytime = strtotime(date('Y-m-d',$time));//当前日期时间戳
		$hb_log=pdo_get("sage_dksy_hb_log",array("uniacid"=>$_W['uniacid'],"openid"=>$openid,"pid"=>$id,"daytime"=>$daytime));
		if(!empty($hb_log)){
			return json_encode(array('error' =>2,'msg'=>"您今天已经兑换过这个红包了"));
		}

		$hb= pdo_fetch("SELECT * FROM ".tablename('sage_dksy_hb')." WHERE  uniacid=:uniacid AND id=:id AND daytime<>:daytime LIMIT 1", array(":uniacid"=>$_W['uniacid'],":id"=>$id,":daytime"=>$daytime));
		if(empty($hb)){
			return json_encode(array('error' =>3,'msg'=>"红包已经被领光了，明天再来吧"));
		}

		$sendhongbao=util::sendhb($openid,$hb['hb_fee']);
		$sendhongbao['isok']=true;
		$hb_fee=$hb['hb_fee']/100;
		if ($sendhongbao['isok']) {
				pdo_insert('sage_dksy_hb_log',array("uniacid"=>$_W['uniacid'],"openid"=>$openid,"pid"=>$id,"daytime"=>$daytime,"hb_fee"=>$hb['hb_fee'],"createtime"=>$time));
				$total = pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_hb_log') . " WHERE uniacid = :uniacid AND pid=:pid AND daytime=:daytime", array(':uniacid' => $_W['uniacid'],":pid"=>$id,":daytime"=>$daytime));
				if($total==$hb['hb_num']){
					pdo_update("sage_dksy_hb",array("daytime"=>$daytime),array("uniacid"=>$_W['uniacid'],"id"=>$id));
				}
//				$sendhongbao['data']['package']='sendid=9e5ab0b96063d349c5a54783e186f4c073f50efc95e0d957aab3b9418a592e10&ver=8&sign=b1523430c67104180907fb258297f52950fcc3a1260644a5d0db38c7a3152c06c87bf945444bd1b89b33e649df7a9558697e84022428a7982887c12ad9aca2d3&mchid=16821475&spid=1417694802';
				$packet=util::sendBizRedPacket($sendhongbao['data']['package']);

				return json_encode(array('error' =>0,'msg'=>$hb_fee . "元红包\n红包已发放成功！",'package'=>$sendhongbao,'packet'=>$packet));
		} else {
				return json_encode(array('error' =>5,'msg'=>'红包发放失败！点击确定重试！','package'=>$sendhongbao));
		}


	}

	// 2026-10-28 合规整改：个人资料均为用户主动填写；由一次性登录 code 确认用户身份。
	public function doPageUpuserinfo(){
		global $_GPC, $_W;
		$openid = $this->reviewVerifiedOpenid();
		if (!$openid) return json_encode(array('error'=>1,'msg'=>'登录信息已失效，请重试'));
		$nickname = trim((string)$_GPC['nickname']);
		$headimg = trim((string)$_GPC['headimg']);
		$values = array('nickname'=>$this->emoji_encode(mb_substr($nickname,0,50,'UTF-8')),'headimg'=>mb_substr($headimg,0,255,'UTF-8'));
		$user = pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		if (empty($user)) {
			$values['uniacid']=$_W['uniacid']; $values['openid']=$openid; $values['createtime']=TIMESTAMP;
			$values['logintime']=strtotime(date('Y-m-d',TIMESTAMP));
			pdo_insert('sage_dksy_user',$values);
		} else {
			pdo_update('sage_dksy_user',$values,array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		}
		return json_encode(array('error'=>0,'msg'=>'保存成功'));
	}
	public function doPageUpuser(){
		global $_GPC, $_W;
		$openid=$this->reviewVerifiedOpenid();
		if (!$openid) return json_encode(array('error'=>1,'msg'=>'登录信息已失效，请重试'));
		$nickname=mb_substr(trim((string)$_GPC['nickname']),0,50,'UTF-8');
		$headimg=mb_substr(trim((string)$_GPC['headimg']),0,255,'UTF-8');
		pdo_update('sage_dksy_user',array('nickname'=>$this->emoji_encode($nickname),'headimg'=>$headimg),array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		return json_encode(array('error'=>0));
	}
	public function doPageUpface(){
		global $_GPC, $_W;
		$openid=$this->reviewVerifiedOpenid();
		if (!$openid) return $this->safeError();
		$f=isset($_FILES['file']) ? $_FILES['file'] : null;
		if (!$f || !isset($f['error']) || (int)$f['error']!==UPLOAD_ERR_OK || empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name']))
			return $this->safeFailure('微信头像文件未成功上传，请重试');
		if ((int)$f['size']<100 || (int)$f['size']>3*1024*1024) return $this->safeFailure('头像大小需小于3MB');
		$info=@getimagesize($f['tmp_name']);
		$types=array(IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_GIF=>'gif');
		$kind=is_array($info)&&isset($info[2]) ? (int)$info[2] : 0;
		if (!isset($types[$kind]) || empty($info[0]) || empty($info[1]) || $info[0]>4096 || $info[1]>4096)
			return $this->safeFailure('请选择 JPG、PNG 或 GIF 格式的头像');
		// 微信 chooseAvatar 临时文件名可能没有扩展名，微擎 file_upload 依赖文件名扩展名。
        $f['name']='yx_avatar.'.$types[$kind];
        // Detect the real attachment storage failure before calling microengine file_upload.
        // Do not chmod(777) or write avatars into the module's executable PHP directory.
        if (!defined('ATTACHMENT_ROOT') || !is_dir(ATTACHMENT_ROOT) || !is_writable(ATTACHMENT_ROOT))
            return $this->safeFailure('服务器附件根目录不可写：请在宝塔将 attachment 目录所有者设置为PHP运行用户，并检查目录写入权限');
        $avdir=rtrim(ATTACHMENT_ROOT,'/').'/images/'.(int)$_W['uniacid'].'/'.date('Y/m');
        if (!is_dir($avdir) && !@mkdir($avdir,0755,true))
            return $this->safeFailure('头像附件子目录无法创建：请在宝塔检查 attachment/images 及父目录写入权限');
        if (!is_writable($avdir))
            return $this->safeFailure('头像附件目录不可写：请检查 PHP 运行用户与文件夹所有者');
		load()->func('file');
		$res=file_upload($f,'image');
		if (empty($res['success']) || empty($res['path'])) {
			$reason=isset($res['message']) ? (string)$res['message'] : '附件存储失败';
			// 不将服务器内部文件路径、堆栈暴露给用户。
			if (strpos($reason,'大小')!==false || strpos($reason,'限制')!==false) return $this->safeFailure('头像超过微擎附件大小限制，请选择较小图片');
			if(strpos($reason,'文件上传失败')!==false || strpos($reason,'目录')!==false || strpos($reason,'权限')!==false) return $this->safeFailure('附件目录无法写入，请管理员检查 attachment 权限');
			if(strpos($reason,'不允许')!==false) return $this->safeFailure('服务器不允许此图片格式，请检查附件格式设置');
			return $this->safeFailure('头像保存失败：'.mb_substr(preg_replace('/[\r\n<>]/','',$reason),0,45,'UTF-8'));
		}
		$url=tomedia($res['path']);
		$ok=pdo_update('sage_dksy_user',array('headimg'=>$url),array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		if ($ok===false) return $this->safeFailure('头像文件已上传，但用户资料保存失败');
		return json_encode(array('error'=>0,'path'=>$url,'msg'=>'上传成功'),JSON_UNESCAPED_UNICODE);
	}
	public function doPageUsername(){
		global $_GPC, $_W;
		$openid=$this->reviewVerifiedOpenid();
		if (!$openid) return $this->safeError();
		$nickname=trim((string)($_GPC['nickname']??''));
		if ($nickname==='' || mb_strlen($nickname,'UTF-8')>30) return $this->safeFailure('请输入不超过30个字的昵称');
		$ok=pdo_update('sage_dksy_user',array('nickname'=>$this->emoji_encode($nickname)),array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		if ($ok===false) return $this->safeFailure('昵称保存失败，请稍后重试');
		return json_encode(array('error'=>0,'msg'=>'保存成功'),JSON_UNESCAPED_UNICODE);
	}
	// 本接口只返回自愿填写的展示资料，不再以头像、昵称是否存在判定是否允许体验。
	public function doPageGetuser(){
		global $_W;
		$openid=$this->reviewVerifiedOpenid();
		if (!$openid) return json_encode(array('error'=>1,'msg'=>'登录信息已失效，请重试'));
		$user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openid),array('nickname','headimg'));
		if (empty($user)) $user=array('nickname'=>'','headimg'=>'');
		$user['nickname']=$this->emoji_decode((string)($user['nickname']??''));
		return json_encode(array('error'=>0,'msg'=>'获取成功','userinfo'=>$user));
	}
	// 不在浏览页面自动请求手机号。旧接口仅在用户明确主动授权时可调用，且不用客户端提交的 sessionKey。
	public function doPageUpdatetel(){
		global $_W,$_GPC;
		if (empty($_GPC['code'])) return json_encode(array('error'=>1,'msg'=>'请先登录'));
		$wx=$this->Getopenids($_GPC['code']);
		$openid=isset($wx['toopenid']) ? $wx['toopenid'] : '';
		$key=isset($wx['res']['session_key']) ? $wx['res']['session_key'] : '';
		if (!$openid || !$key) return json_encode(array('error'=>1,'msg'=>'登录信息无效'));
		$user=pdo_get('sage_dksy_user',array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		if (empty($user)) return json_encode(array('error'=>1,'msg'=>'用户不存在'));
		if (!empty($user['tel'])) return json_encode(array('error'=>0,'msg'=>'手机号已绑定'));
		if (empty($_GPC['encryptedData']) || empty($_GPC['iv'])) return json_encode(array('error'=>1,'msg'=>'未主动授权手机号'));
		include_once POSETERH_ROOT.'inc/wxBizDataCrypt.php';
		$pc=new WXBizDataCrypt($_W['account']['key'],$key);
		$data='';
		$err=$pc->decryptData($_GPC['encryptedData'],$_GPC['iv'],$data);
		$info=json_decode($data,true);
		if ($err!==0 || empty($info['phoneNumber'])) return json_encode(array('error'=>1,'msg'=>'手机号授权失败'));
		pdo_update('sage_dksy_user',array('tel'=>$info['phoneNumber']),array('uniacid'=>$_W['uniacid'],'openid'=>$openid));
		return json_encode(array('error'=>0,'msg'=>'手机号绑定成功'));
	}
	// 本地私有身份核验：OpenID 不再由客户端任意指定。
	private function reviewVerifiedOpenid(){
		global $_GPC;
		// 用户主动编辑资料时优先验证本次 wx.login code；避免切换微信账号后误沿用旧令牌身份。
		if (!empty($_GPC['code'])) {
			$wx=$this->Getopenids((string)$_GPC['code']);
			if (!empty($wx['toopenid'])) return (string)$wx['toopenid'];
		}
		// 无 code 的兼容调用仍严格使用服务端签发并核验的登录令牌。
		return $this->safeVerifiedUser();
	}

	// YX_V12238: 仅把本小程序后台配置的订阅模板提供给已登录用户。
	public function doPageSubscribeconfig(){
		global $_W;
		$openid=$this->safeVerifiedUser();
		if (!$openid) return $this->safeError();
		$sign=pdo_getall('sage_dksy_template',array('uniacid'=>$_W['uniacid'],'typeid'=>1,'isyes'=>1),array('priTmplId'),'','id DESC',array(0,1));
		$order=pdo_getall('sage_dksy_template',array('uniacid'=>$_W['uniacid'],'typeid'=>2),array('priTmplId'),'','id DESC',array(0,3));
		$clean=function($rows){$out=array();foreach((array)$rows as $row){$id=trim((string)(isset($row['priTmplId'])?$row['priTmplId']:''));if($id!=='' && preg_match('/^[a-zA-Z0-9_-]{16,100}$/',$id) && !in_array($id,$out,true))$out[]=$id;}return $out;};
		return json_encode(array('error'=>0,'sign'=>$clean($sign),'order'=>$clean($order)),JSON_UNESCAPED_UNICODE);
	}
	//订阅消息
	public function doPageAdddy(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$openid=$safeUser;
		if(empty($openid)){
			return json_encode(array('error' =>1,'msg'=>'参数错误openid消失'));
		}
		if(empty($_GPC['priTmplId'])){
			return json_encode(array('error' =>1,'msg'=>'参数错误模板ID消失'));
		}
		$template=pdo_get("sage_dksy_template",array("uniacid"=>$_W['uniacid'],'priTmplId'=>$_GPC['priTmplId'],'typeid'=>1,'isyes'=>1));
		if(empty($template)){
			return json_encode(array('error' =>1,'msg'=>'模板不存在'));
		}
		$daytime = strtotime(date('Y-m-d',time()));//当前日期时间戳
		$data=array(
			"uniacid"=>$_W['uniacid'],
			"openid"=>$openid,
			"daytime"=>$daytime,
			"sendtime"=>$daytime+86400,
			"isyes"=>0,
			"pid"=>$template['id'],
			"issend"=>0
		);
		$dy=pdo_get('sage_dksy_dy',array("uniacid"=>$_W['uniacid'],"openid"=>$openid,'pid'=>$template['id']));
		if(empty($dy)){
			$data['createtime']=time();
			pdo_insert("sage_dksy_dy",$data);
		}
		else{
			if($dy['daytime']==$daytime && empty($dy['issend'])){
				return json_encode(array('error' =>1,'msg'=>'今天已经订阅'));
			}
			pdo_update("sage_dksy_dy",$data,array("id"=>$dy['id'],"openid"=>$openid));
		}
		return json_encode(array('error' =>0,'msg'=>'成功'));

	}
	//订单订阅消息
	public function doPageTemplate(){
		global $_W,$_GPC;
		$template=pdo_getall("sage_dksy_template",array("uniacid"=>$_W['uniacid'],"typeid"=>2));
		$template_str=array();
		if(empty($template)){
			$template_on=0;
		}
		else{
			$template_on=count($template);
			for($i=0;$i<count($template);$i++){
				$template_str[$i]=$template[$i]['priTmplId'];
			}
		}
		return json_encode(array('error' =>0,'template_on'=>$template_on,'template_str'=>$template_str));
	}

	//检查消息是否订阅
	public function doPageGetdy(){
		global $_W,$_GPC;
        $safeUser=$this->safeVerifiedUser(); if (!$safeUser) return $this->safeError();

		$is_template=0;
		$daytime = strtotime(date('Y-m-d',time()));//当前日期时间戳
		$openid=$safeUser;
		if(empty($openid)){
			return json_encode(array('error' =>1,'msg'=>'参数错误openid消失'));
		}
		//订阅消息模板
		$template=pdo_getall("sage_dksy_template",array("uniacid"=>$_W['uniacid'],"typeid"=>1,"isyes"=>1));
		foreach($template as $vo){
			$dy=pdo_get("sage_dksy_dy",array("uniacid"=>$_W['uniacid'],"pid"=>$vo['id'],'openid'=>$openid,'daytime'=>$daytime,'issend'=>0));
			if(empty($dy)){
				$is_template=1;
			}
		}
		if($is_template==1){
			return json_encode(array('error' =>1,'msg'=>'不存在可以弹出'));
		}
		else{
			return json_encode(array('error' =>0,'msg'=>'已经存在'));
		}

	}

    public function Getopenids($code)
    {
        global $_W;
        $appid=isset($_W['account']['key']) ? (string)$_W['account']['key'] : '';
        $secret=isset($_W['account']['secret']) ? (string)$_W['account']['secret'] : '';
        if (!$code || !$appid || !$secret) return array('openid'=>'','toopenid'=>'','res'=>array());
        $query=http_build_query(array('appid'=>$appid,'secret'=>$secret,'js_code'=>$code,'grant_type'=>'authorization_code'));
        $curl=curl_init('https://api.weixin.qq.com/sns/jscode2session?'.$query);
        curl_setopt($curl,CURLOPT_RETURNTRANSFER,true);
        curl_setopt($curl,CURLOPT_SSL_VERIFYPEER,true);
        curl_setopt($curl,CURLOPT_SSL_VERIFYHOST,2);
        curl_setopt($curl,CURLOPT_CONNECTTIMEOUT,5);
        curl_setopt($curl,CURLOPT_TIMEOUT,10);
        $res=curl_exec($curl);
        $status=curl_getinfo($curl,CURLINFO_HTTP_CODE);
        curl_close($curl);
        $data=is_string($res) ? json_decode($res,true) : null;
        if ($status!==200 || !is_array($data) || empty($data['openid']) || !empty($data['errcode'])) {
            return array('openid'=>'','toopenid'=>'','res'=>array());
        }
        return array('openid'=>md5($data['openid']),'toopenid'=>$data['openid'],'res'=>$data);
    }

	//对emoji表情转义
	public function emoji_encode($str){
		$strEncode = '';
		$length = mb_strlen($str,'utf-8');
		for ($i=0; $i < $length; $i++) {
			$_tmpStr = mb_substr($str,$i,1,'utf-8');
			if(strlen($_tmpStr) >= 4){
				$strEncode .= '[[EMOJI:'.rawurlencode($_tmpStr).']]';
			}else{
				$strEncode .= $_tmpStr;
			}
		}
		return $strEncode;
	}
	public function emoji_decode($str)
	{
		$strDecode = preg_replace_callback('|\[\[EMOJI:(.*?)\]\]|', function ($matches) {
			return rawurldecode($matches[1]);
		}, $str);
		return $strDecode;
	}
}
