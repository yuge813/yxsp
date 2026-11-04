<?php
require_once __DIR__.'/bootstrap.php';
if(!defined('IN_IA'))define('IN_IA',true);
require_once qaBackend().'/class/v150_referral_rewards.trait.php';
class TestReferralHost {
    use DksyV150ReferralRewardsTrait;
    public $auth='qa-B';
    protected function v150Now(){return QA::$now;}
    protected function safeVerifiedUser(){return $this->auth;}
    protected function safeError(){return json_encode(array('error'=>401,'msg'=>'请先登录'));}
}
function qaHost($auth='qa-B'){$h=new TestReferralHost();$h->auth=$auth;return $h;}
function qaSummary($h){return json_decode($h->doPageV150referralsummary(),true,512,JSON_THROW_ON_ERROR);}
