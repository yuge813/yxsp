<?php
/**
 * Created by PhpStorm.
 * User: zhang
 * Date: 2020/7/1
 * Time: 10:56
 */
class util
{
    static function insert_navigation()
    {
        global $_W;
        $navigation = array(
            array(
                'uniacid' => $_W['uniacid'],
                'icon' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-1.png',
                'iconactive' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-1-active.png',
                'title' => '首页',
                'titlecolor' => '#fc4517',
                'url' => '/sage_dksy/pages/index/index',
                'displayorder' => 5,
                'isshow' => 1
            ),
            array(
                'uniacid' => $_W['uniacid'],
                'icon' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-6.png',
                'iconactive' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-6-active.png',
                'title' => '兑换中心',
                'titlecolor' => '#fc4517',
                'url' => '/sage_dksy/pages/prize/index',
                'displayorder' => 4,
                'isshow' => 1
            ),
            array(
                'uniacid' => $_W['uniacid'],
                'icon' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-3.png',
                'iconactive' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-3-active.png',
                'title' => '试用中心',
                'titlecolor' => '#fc4517',
                'url' => '/sage_dksy/pages/trial/trial',
                'displayorder' => 3,
                'isshow' => 1
            ),
            array(
                'uniacid' => $_W['uniacid'],
                'icon' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-4.png',
                'iconactive' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-4-active.png',
                'title' => '个人中心',
                'titlecolor' => '#fc4517',
                'url' => '/sage_dksy/pages/user/index',
                'displayorder' =>2,
                'isshow' => 1
            ),
            array(
                'uniacid' => $_W['uniacid'],
                'icon' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-5.png',
                'iconactive' => $_W['siteroot'] . 'addons/sage_dksy/images/icon/icon-5-active.png',
                'title' => '工具箱',
                'titlecolor' => '#fc4517',
                'url' => '/sage_dksy/pages/tool/tool',
                'displayorder' => 1,
                'isshow' => 0
            ),
        );
        pdo_delete('sage_dksy_navigation', array('uniacid' => $_W['uniacid']));
        foreach ($navigation as $vo) {
            pdo_insert('sage_dksy_navigation', $vo);
        }
    }

    // All sign-in records use the same Beijing calendar day on every server.
    static function beijingDay($timestamp=null){
        $now=$timestamp===null?time():(int)$timestamp;
        return (int)(floor(($now+28800)/86400)*86400-28800);
    }

    static function qian($openid,$set){
        global $_W;
        $datetime = self::beijingDay();
        $rs=pdo_get("sage_dksy_qian",array("uniacid"=>$_W["uniacid"],"openid"=>$openid,'datetime'=>$datetime));
        if(!empty($rs)){
            return array('error'=>1,'msg'=>'已经签到');
        }
        else{
            $result = pdo_insert("sage_dksy_qian",array("uniacid"=>$_W["uniacid"],"openid"=>$openid,'datetime'=>$datetime));
            if (!empty($result)) {
                $qinid = pdo_insertid();
            } else {
                return array('error'=>1,'msg'=>'今日已经签到，请勿重复提交','qian_num'=>0,'qianid'=>0);
            }
            $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W["uniacid"],'openid'=>$openid));
            $t_day=self::getQian_last($openid);
            if($t_day==1){
                if(empty($set['day_on'])){
                    if($user['qian_num']>6){
                        pdo_query("UPDATE ".tablename('sage_dksy_user')." SET qian_num = 1 WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
                    }
                    else{
                        pdo_query("UPDATE ".tablename('sage_dksy_user')." SET qian_num = qian_num + 1 WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
                    }
                }
                else{
                    pdo_query("UPDATE ".tablename('sage_dksy_user')." SET qian_num = qian_num + 1 WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
                }
            }
            else{
                pdo_query("UPDATE ".tablename('sage_dksy_user')." SET qian_num = 1 WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
            }
            $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W["uniacid"],'openid'=>$openid));
            switch($user['qian_num']){
                case 1:
                    $qian_num=$set['day1'];
                    break;
                case 2:
                    $qian_num=$set['day2'];
                    break;
                case 3:
                    $qian_num=$set['day3'];
                    break;
                case 4:
                    $qian_num=$set['day4'];
                    break;
                case 5:
                    $qian_num=$set['day5'];
                    break;
                case 6:
                    $qian_num=$set['day6'];
                    break;
                case 7:
                    $qian_num=$set['day7'];
                    break;
                default:
                    $qian_num=$set['days'];
                    break;
            }

            self::PlusNum($qian_num,$openid,'签到成功获得奖励');
            self::UpdateDy($openid);
            self::fansTotal($openid);
            return array('error'=>0,'msg'=>'签到成功','qian_num'=>$qian_num,'qianid'=>$qinid);
        }
    }

    static function fanbei($openid,$set,$qianid){
        return array('error'=>1,'msg'=>'暂未开放该奖励','qian_num'=>0);
        global $_W;
        $user=pdo_get('sage_dksy_user',array('uniacid'=>$_W["uniacid"],'openid'=>$openid));
        switch($user['qian_num']){
            case 1:
                $qian_num=$set['day1'];
                break;
            case 2:
                $qian_num=$set['day2'];
                break;
            case 3:
                $qian_num=$set['day3'];
                break;
            case 4:
                $qian_num=$set['day4'];
                break;
            case 5:
                $qian_num=$set['day5'];
                break;
            case 6:
                $qian_num=$set['day6'];
                break;
            case 7:
                $qian_num=$set['day7'];
                break;
            default:
                $qian_num=$set['days'];
                break;
        }
        $rs=pdo_get("sage_dksy_qian",array("id"=>$qianid,"fanbei"=>0));
        if(!empty($rs)){
            pdo_update("sage_dksy_qian",array("fanbei"=>1),array("id"=>$qianid));
            self::PlusNum($qian_num,$openid,'签到看视频翻倍奖励');
        }
        return array('error'=>0,'msg'=>'获得签到翻倍奖励','qian_num'=>$qian_num);

    }
    //粉丝打卡总数更新
    static function fansTotal($openid){
        global $_W;
        pdo_query("UPDATE ".tablename('sage_dksy_user')." SET qian_total =  qian_total + 1 WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
        return true;
    }
    //增加积分
    static function PlusNum($num,$openid,$text){
        global $_W;
        if($num>0){
            pdo_query("UPDATE ".tablename('sage_dksy_user')." SET num = num + ".$num." WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid"=>$_W["uniacid"],":openid"=>$openid));
            pdo_insert("sage_dksy_num_log",array("uniacid"=>$_W["uniacid"],"openid"=>$openid,"title"=>$text,"num"=>$num,"static"=>1,"createtime"=>TIMESTAMP));
        }
    }
    //减少积分
    static function ReduceNum($num,$openid,$text){
        global $_W;
        if($num>0) {
            pdo_query("UPDATE " . tablename('sage_dksy_user') . " SET num = num-" . $num . " WHERE uniacid = :uniacid AND openid = :openid", array(":uniacid" => $_W["uniacid"], ":openid" => $openid));
            pdo_insert("sage_dksy_num_log", array("uniacid" => $_W["uniacid"], "openid" => $openid, "title" => $text, "num" => $num, "static" => 2,"createtime"=>TIMESTAMP));
        }
    }
    //修改订阅状态
    static function UpdateDy($openid){
        global $_W;
        $template=pdo_get("sage_dksy_template",array("uniacid"=>$_W['uniacid'],"isyes"=>1));
        if(empty($template)){
            return false;
        }
        pdo_update("sage_dksy_dy",array("isyes"=>1),array('uniacid'=>$_W['uniacid'],'openid'=>$openid,'pid'=>$template['id']));
        return true;
    }
    // V13.1.2：准确按记录存在性识别昨天/今天签到；SELECT 不应使用 pdo_query 的受影响行数作为判断。
    static function getQian_last($openid){
        global $_W;
        $uid=(int)$_W['uniacid'];
        $today=self::beijingDay();
        $yesterday=$today-86400;
        $prev=pdo_get('sage_dksy_qian',array('uniacid'=>$uid,'openid'=>$openid,'datetime'=>$yesterday),array('id'));
        if ($prev) return 1;
        $now=pdo_get('sage_dksy_qian',array('uniacid'=>$uid,'openid'=>$openid,'datetime'=>$today),array('id'));
        return $now?2:3;
    }
    //判断用户分享是否增加 是否可以兑奖
    static function fromopenid($openid,$fromopenid,$pro_id){
        return false; // 邀请不再影响参与/获奖资格。
        global $_W;
        $set=pdo_get('sage_dksy_set',array('uniacid'=>$_W['uniacid']));
        $trial_pro=pdo_get("sage_dksy_trial_pro",array("uniacid"=>$_W['uniacid'],"pro_id"=>$pro_id));
        if(empty($set['share_on'])){
            return false;
        }
        $trial_input=pdo_get("sage_dksy_trial_input",array("uniacid"=>$_W['uniacid'],"openid"=>$fromopenid,"pro_id"=>$pro_id));
        if(empty($trial_input)){
            return false;
        }
        $share_num=$trial_input['share_num']+1;
        $success=0;

        if(!empty($trial_pro['share_num'])){
            if($trial_pro['share_num']==$share_num){
                $success=1;
            }
        }
        elseif($set['share_num']){
            if($trial_pro['share_num']==$share_num){
                $success=1;
            }
        }
        if(!empty($success)){
            pdo_update("sage_dksy_trial_input",array("prize_on"=>1),array("uniacid"=>$_W['uniacid'],"openid"=>$fromopenid,"pro_id"=>$pro_id));
        }
        pdo_insert("sage_dksy_trial_share",array("uniacid"=>$_W['uniacid'],"openid"=>$openid,"pro_id"=>$pro_id,"fromopenid"=>$fromopenid,"createtime"=>time()));
        pdo_query("UPDATE ".tablename('sage_dksy_trial_input')." SET share_num = ".$share_num." WHERE uniacid = :uniacid AND openid=:openid AND pro_id = :pro_id", array(":uniacid"=>$_W["uniacid"],":openid"=>$fromopenid,":pro_id"=>$pro_id));

        return false;
    }
    //获取用户信息
    static function getUserInfo($openid){
        global $_W;
        $rs=pdo_get('sage_dksy_user',array("uniacid"=>$_W['uniacid'],"openid"=>$openid));
        $rs['nickname']=self::emoji_decode($rs['nickname']);
        return $rs;
    }
    //获取兑换产品信息
    static function getPrize($prize_id){
        global $_W;
        $rs=pdo_get('sage_dksy_prize',array("uniacid"=>$_W['uniacid'],"prize_id"=>$prize_id));
        $rs['prize_picurl']=toimage($rs['prize_picurl']);
        return $rs;
    }
    //获取试用产品
    static function getTrial($pro_id){
        global $_W;
        $rs=pdo_get('sage_dksy_trial_pro',array("uniacid"=>$_W['uniacid'],"pro_id"=>$pro_id));
        $rs['pro_picurl']=toimage($rs['pro_picurl']);
        return $rs;
    }
    static function getInputNum($pro_id){
        global $_W;
        $user_dy=pdo_fetchcolumn("SELECT COUNT(*) FROM " . tablename('sage_dksy_trial_input') . " WHERE uniacid = :uniacid AND pro_id=:pro_id ", array(':uniacid' => $_W['uniacid'],':pro_id' => $pro_id));
        return $user_dy;
    }
    //获取特惠标签名称
    static function getTehuiTag($id){
        global $_W;
        $rs=pdo_get("sage_dksy_tag",array("uniacid"=>$_W['uniacid'],"id"=>$id));
        return $rs;
    }

    /**
     * 发送红包
     * @param $openid
     * @param $fee
     * @return mixed
     */
    static function sendhb($openid,$fee){
        global $_W;
        $sql = "SELECT * FROM " . tablename('sage_dksy_set_hb') . " WHERE uniacid = :uniacid";
        $params = array(':uniacid' => $_W['uniacid']);
        $api = pdo_fetch($sql, $params);
        $api = unserialize($api['set']);
        if (empty($api)) {
            // $this->message(array("success" => 2, "msg" => $fee), "");
            return error(-2, '红包没有配置好！');
        }
        if(empty($openid)){
            return error(-3, '用户openid不存在！');
        }

        $url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendminiprogramhb';
        $pars = array();
        $pars['nonce_str'] = random(32);//随机字符串
        $pars['mch_billno'] = $api['mchid'] . date('Ymd') . sprintf('%d', time());//商户订单号
        $pars['mch_id'] = $api['mchid'];//商户号
        $pars['wxappid'] = $api['appid'];//公众账号appid
        $pars['send_name'] = $api['sname'];//商户名称
        $pars['re_openid'] = $openid;//用户openid
        $pars['total_amount'] = $fee;//红包金额，单位为分;
        $pars['total_num'] = 1;//红包发放人数
        $pars['wishing'] = $api['wishing'];//红包祝福语
        $pars['act_name'] = $api['actname'];//活动名称
        $pars['remark'] = '恭喜您的' .($fee/100) . '元红包已经发放，请注意查收';//备注
        $pars['notify_way'] ='MINI_PROGRAM_JSAPI';//通知用户形式
        $pars['act_name'] = $api['actname'];

        ksort($pars, SORT_STRING);//升序排序

        //生成签名
        $string1 = '';
        foreach ($pars as $k => $v) {
            $string1 .= "{$k}={$v}&";
        }
        $string1 .= "key={$api['password']}";//拼接密钥
        $pars['sign'] = strtoupper(md5($string1));

        $xml = array2xml($pars);//转换xml
        $extras = array();
        $extras['CURLOPT_SSLCERT'] = POSETERH_ROOT . '/cert/apiclient_cert.pem.' . $_W['uniacid'];
        $extras['CURLOPT_SSLKEY'] = POSETERH_ROOT . '/cert/apiclient_key.pem.' . $_W['uniacid'];
        load()->func('communication');
//        return array("pars"=>$pars,'string1'=>$string1,'xml'=>$xml);
        $procResult = null;
        $resp = ihttp_request($url, $xml, $extras);//post提交

        if (is_error($resp)) {
            $packpage = $resp;
        }
        else {
            $procResult=self::xmlToArray($resp['content']);
            if($procResult['result_code']=="FAIL"){
                $packpage['isok']=false;
            }
            elseif($procResult['result_code']=="SUCCESS" && $procResult['result_code']=="SUCCESS"){
                $packpage['isok'] = true;

            }
            $packpage['data']=$procResult;
        }
        if (is_error($packpage)) {
//            print_r($procResult);
            $packpage['isok'] = false;

        } else {
            $packpage['isok'] = true;

        }
        return $packpage;
    }

    //生成小程序领取参数
    static function sendBizRedPacket($package){
        global $_W;
        $sql = "SELECT * FROM " . tablename('sage_dksy_set_hb') . " WHERE uniacid = :uniacid";
        $params = array(':uniacid' => $_W['uniacid']);
        $api = pdo_fetch($sql, $params);
        $api = unserialize($api['set']);
        $pars=array(
            "appId"=>$api['appid'],
            "timeStamp"=>time()."",
            "nonceStr"=>random(32),
            "package"=>urlencode($package),
        );
//        $pars=array(
//            "appId"=>$api['appid'],
//            "timeStamp"=>1594093983,
//            "nonceStr"=>'rpH2LSLO2GBGeEFqnU2Hm5LMPfMbfrV2',
//            "package"=>'1000041701202007073005855654342',
//        );

        ksort($pars, SORT_STRING);
        $string1 = '';
        foreach ($pars as $k => $v) {
            $string1 .= "{$k}={$v}&";
        }
        $string1 .= "key={$api['password']}";//拼接密钥
        $pars['paySign'] = md5($string1);
        $pars['signType']='MD5';
        $pars['package_s']=$package;
        return $pars;

    }
    static function emoji_decode($str)
    {
        $strDecode = preg_replace_callback('|\[\[EMOJI:(.*?)\]\]|', function ($matches) {
            return rawurldecode($matches[1]);
        }, $str);
        return $strDecode;
    }

    //获取订阅消息模版
    static function getTemplateList(){
        global $_W;
        $url='https://api.weixin.qq.com/wxaapi/newtmpl/gettemplate?access_token='.self::getAccessToken();
        $response = ihttp_request($url);
        return $response;

    }
    // YX_V12238: 仅微信 errcode=0 才视为订阅消息真正发出。
    static function sendTemplate($openid,$template_id,$content,$path='',$orderid=0){
        $openid=trim((string)$openid);
        $template_id=trim((string)$template_id);
        if ($openid==='' || $template_id==='') return array('errno'=>-1,'message'=>'订阅模板或接收用户为空');
        $token=self::getAccessToken();
        if (is_error($token) || !is_string($token) || $token==='') return array('errno'=>-1,'message'=>'获取微信凭据失败');
        $send_data=array(
            'touser'=>$openid,
            'template_id'=>$template_id,
            'page'=>(string)$path,
            'data'=>self::getTemplateArray($content,$orderid)
        );
        $result=ihttp_request('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token='.rawurlencode($token),json_encode($send_data,JSON_UNESCAPED_UNICODE));
        if (is_error($result)) return $result;
        if (!is_array($result) || (int)(isset($result['code'])?$result['code']:0)!==200) return array('errno'=>-1,'message'=>'微信发送 HTTP 异常');
        $body=json_decode(isset($result['content'])?$result['content']:'',true);
        if (!is_array($body) || !isset($body['errcode'])) return array('errno'=>-1,'message'=>'微信发送响应无效');
        if ((int)$body['errcode']!==0) return array('errno'=>(int)$body['errcode'],'message'=>'微信拒绝发送订阅消息','wechat_errcode'=>(int)$body['errcode']);
        return array('errno'=>0,'message'=>'发送成功','wechat_errcode'=>0);
    }
    //解析模版消息内容 成数组
    static function getTemplateArray($content,$orderid=0){
        $data=array();
        $r = explode("\n", $content);
        foreach($r as $k=>$v){
            if(!empty($v)){
                $v=str_replace("\r","",$v);
                $t = explode(":", $v, 2);
                if (count($t)!==2) continue;
                $field=trim($t[0]);
                if (!preg_match('/^[a-zA-Z_]+[0-9]+$/', $field)) continue;
                $value=self::ReplaceText($t[1],$orderid);
                // 微信订阅模板字符上限，避免商品名称过长导致整条发货通知被拒。
                if (preg_match('/^thing[0-9]+$/',$field)) $value=mb_substr(trim($value),0,20,'UTF-8');
                if (preg_match('/^phrase[0-9]+$/',$field)) $value=mb_substr(trim($value),0,5,'UTF-8');
                $data[$field]=array('value'=>$value);
            }
        }
        return $data;
    }
    /**
     * 获取模版内容形成字符串
     * @param $content
     * @return string
     */
    static function getTemplateValue($priTmplId){
        global $_W;
        $r=self::getTemplateList();
        if(is_error($r)){
            return $r;
        }
        $r=json_decode($r['content'],true)['data'];

        $template=self::filter_by_value($r,'priTmplId',$priTmplId);
        $t= "/\{{(.*).DATA}}/u";
        $data_array="";
        preg_match_all($t,$template['content'],$match);
        foreach($match[1] as $v){
            $data_array .=$v.":{value}\n";
        }
        $template['data_str']=$data_array;
        return $template;
    }
    /*
     * 根据二维数组某个字段的值查找数组
    */
    static function filter_by_value ($array, $index, $value){
        $newarray=array();
        if(is_array($array) && count($array)>0)
        {
            foreach(array_keys($array) as $key){
                $temp[$key] = $array[$key][$index];
                if ($temp[$key] == $value){
                    $newarray[] = $array[$key];
                }
            }
        }
        return $newarray[0];
    }
    //获取access_token
    static function getAccessToken()
    {

        global $_W;
//        $appid = $_W["account"]["key"];
//        $secret = $_W["account"]["secret"];
//        $cachekey = "accesstoken:{$appid}";
//        $cache = cache_load($cachekey);
//        if (!empty($cache) && !empty($cache['token']) && $cache['expire'] > TIMESTAMP) {
//            $_W["account"]['access_token'] = $cache;
//            return $cache['token'];
//        }
//        if (empty($appid) || empty($secret)) {
//            return error('-1', '未填写小程序的 appid 或 appsecret！');
//        }
//        $url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={$appid}&secret={$secret}";
//        $response = ihttp_request($url);
//        $response=json_decode($response['content'],true);
//        $record = array();
//        $record['token'] = $response['access_token'];
//        $record['expire'] = TIMESTAMP + $response['expires_in'] - 200;
//        $_W["account"]['access_token'] = $record;
//        cache_write($cachekey, $record);
//
//        return $record['token'];
        $account_api = WeAccount::create();
        $token = $account_api->getAccessToken();
        return $token;
    }

    static function xmlToArray($xml) {
        if (empty($xml)) {
            return array();
        }
        $result = array();

//        $xmlobj = isimplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        libxml_disable_entity_loader(true);
        $xmlobj = simplexml_load_string($xml, "SimpleXMLElement", LIBXML_NOCDATA, '', FALSE);
        if($xmlobj instanceof SimpleXMLElement) {
            $result = json_decode(json_encode($xmlobj), true);
            if (is_array($result)) {
                return $result;
            } else {
                return '';
            }
        } else {
            return $result;
        }
    }
    //替换文字动态参数
    static function ReplaceText($content,$orderid=0){
        global $_W;
        $content=str_replace('{value}','',$content);
        $weekarray=array("日","一","二","三","四","五","六");
        $content=str_replace('{#星期#}','星期'.$weekarray[date("w")],$content);
        $content=str_replace('{#日期#}',date('Y年m月d日',time()),$content);
        $content=str_replace('{#时间#}',date('Y年m月d日 H:i',time()),$content);
        if(!empty($orderid)){
            $order=pdo_get("sage_dksy_order",array("uniacid"=>$_W['uniacid'],"id"=>$orderid));
            if(!empty($order)){
                $prize=pdo_get("sage_dksy_prize",array("uniacid"=>$_W['uniacid'],"prize_id"=>$order['prize_id']));
                $content=str_replace('{#商品名称#}',$prize['prize_title'],$content);
                $isyes='';
                if($order['isyes']==2){
                    $isyes="已退单";
                }
                elseif(!empty($order['expressage_number'])){
                    $isyes="已发货";
                }
                else{
                    $isyes="已处理";
                }
                $content=str_replace('{#订单状态#}',$isyes,$content);
                $content=str_replace('{#订单时间#}',date("Y-m-d H:i"),$content);
                if($order['isyes']==2){
                    $content=str_replace('{#订单备注#}',"信息填写不全不能发放！积分已经退还",$content);
                }
                else{
                    if(empty($order['prize_type'])){
                        $content=str_replace('{#订单备注#}',$order['address'],$content);
                    }
                    else{
                        $content=str_replace('{#订单备注#}',$order['remark'],$content);
                    }
                }


            }
        }

        return $content;
    }

    static function request_post($url = '',$xml = '' ,$extras='')
    {
        $ch=curl_init();
        curl_setopt($ch,CURLOPT_CONNECTTIMEOUT,0);
        curl_setopt($ch,CURLOPT_TIMEOUT,60);
        curl_setopt($ch,CURLOPT_RETURNTRANSFER,1);
        curl_setopt($ch,CURLOPT_URL,$url);
        curl_setopt($ch,CURLOPT_SSL_VERIFYPEER,false);
        curl_setopt($ch,CURLOPT_SSL_VERIFYHOST,false);
        curl_setopt($ch,CURLOPT_SSLVERSION,1);
        curl_setopt($ch,CURLOPT_SSLCERT,$extras['CURLOPT_SSLCERT']);
        curl_setopt($ch,CURLOPT_SSLKEY,$extras['CURLOPT_SSLKEY']);

        curl_setopt($ch,CURLOPT_POST,1);
        curl_setopt($ch,CURLOPT_POSTFIELDS,$xml);
        $data=curl_exec($ch);

        if($data){
            curl_close($ch);
            return array('errno'=>0,"data"=>$data);
        }else{
            $error = curl_errno($ch);
            curl_close($ch);
            return array('errno'=>-1,'msg'=>$error);
        }
    }

    static function sendUniformMessage($openid,$prize_id){
        global $_W;
        $set=pdo_get("sage_dksy_set",array("uniacid"=>$_W['uniacid']),array('apptitle','wx_appid','set_order_id'));
        $prize=pdo_get("sage_dksy_prize",array("uniacid"=>$_W['uniacid'],'prize_id'=>$prize_id));
        if(empty($set['set_order_id']) || empty($set['wx_appid'])){
            return false;
        }

        $url="https://api.weixin.qq.com/cgi-bin/message/wxopen/template/uniform_send?access_token=".self::getAccessToken();
        $send_data=array(
            "touser"=>$openid,
            "mp_template_msg"=>array(
                "appid"=>$set['wx_appid'],
                "template_id"=>$set['set_order_id'],
                "url"=>$_W['siteroot'],
                "miniprogram"=>array(
                    "appid"=>$_W["account"]["key"],
                    "pagepath"=>"sage_dksy/index/index"
                ),
                "data"=>array(
                    "first"=>array("value"=>$set['apptitle']."提醒您！您兑换的《".$prize['prize_title']."》已经发货！","color"=>"#173177"),
                    "keyword1"=>array("value"=>$prize['prize_title'],"color"=>"#173177"),
                    "keyword2"=>array("value"=>$prize['createtime'],"color"=>"#173177"),
                    "keyword3"=>array("value"=>date('Y-m-d H:i',$prize['createtime']),"color"=>"#173177"),
                    "remark"=>array("value"=>"感谢您的参与！","color"=>"#173177"),
                )
            ),
        );
        $rs=ihttp_request($url,json_encode($send_data));
        return $rs;
    }

    //退回订单积分
    static function orderReduceNum($order){
        if(empty($order)){
            return false;
        }
        $prize=pdo_get("sage_dksy_prize",array("prize_id"=>$order['prize_id']));
        if(empty($prize)){
            return false;
        }
        self::PlusNum($prize['prize_integral'],$order['openid'],"退订单".$prize['prize_title']."积分");
        return true;
    }


    //试用提交地址保存
    static function addressAdd($data){
        if(empty($data['openid'])){
            return false;
        }
        $r=pdo_get("sage_dksy_address",array("uniacid"=>$data['uniacid'],"openid"=>$data['openid']));
        if(empty($r)){
            pdo_insert("sage_dksy_address",$data);
        }
        else{
            pdo_update("sage_dksy_address",$data,array("uniacid"=>$data['uniacid'],"openid"=>$data['openid']));
        }
        return true;
    }
    //获取试用地址
    static function addressGet($data){
        $r=pdo_get("sage_dksy_address",array("uniacid"=>$data['uniacid'],"openid"=>$data['openid']));
        if(!empty($r)){
            return $r;
        }
        else{
            return ["username"=>'',"tel"=>'',"address"=>''];
        }
    }

    //判断当前每日任务是否开启
    static function getTaskOn($set,$openid){
        if(empty($set)){
            return 0;
        }
        if(empty($set['task_on'])){
            return 0;
        }
        if (!empty($set['task_time_on'])){
            if(!empty($set['task_time_start'])){
                $start=strtotime(date('Y-m-d').' '.$set['task_time_start']);
                if(TIMESTAMP < $start){
                    return 0;
                }
            }
            if(!empty($set['task_time_start'])){
                $end=strtotime(date('Y-m-d').' '.$set['task_time_end']);
                if(TIMESTAMP > $end){
                    return 0;
                }
            }
        }
        if(!empty($set['task_day_on'])){
            $task=pdo_fetch("SELECT * FROM ".tablename('sage_dksy_task')." WHERE openid = :openid order by create_time asc", array(':openid' => $openid));
            if(!empty($task)){
                if($task['create_time']<=(TIMESTAMP-2592000)){
                    return 0;
                }
            }
        }
        return 1;
    }

    /**
     * 返回月开始和结束的时间戳
     *
     * @return array
     */
    static function month($date = '')
    {
        if(empty($date)){
            $datet=date('Y-m-t');
        }
        else{
            $datet=date('Y-m-t',$date);
        }
        list($y, $m, $t) = explode('-', $datet);
        return [
            mktime(0, 0, 0, $m, 1, $y),
            mktime(23, 59, 59, $m, $t, $y)
        ];
    }

    /**
     * 生成参数二维码
     */
    static function qrcode($scene="")
    {
        //https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=ACCESS_TOKEN
        $url = "https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=" . self::getAccessToken();
        $user=pdo_get('sage_dksy_user', array('openid' => $scene));
        $data = [
            'page' => 'sage_dksy/pages/index/index',
            'scene' => '!'.$scene,
//            'env_version'=>'develop'
        ];
        $res= ihttp_post($url, json_encode($data));
        return $res;
    }

}
