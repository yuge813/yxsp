var CATEGORIES=[
 {id:'all',label:'全部',intro:'',path:'',action:''},
 {id:'coins',label:'金币',intro:'签到与广告奖励均以实际金币明细为准。',path:'/sage_dksy/pages/user/integral',action:'查看金币明细'},
 {id:'read',label:'阅读激励',intro:'文章免费阅读，激励视频由你自愿选择。',path:'/sage_dksy/pages/v12/list',action:'前往阅读文章'},
 {id:'growth',label:'成长礼遇',intro:'开启7天计划，查看独立成长进度与实际礼遇。',path:'/sage_dksy/pages/growth/index',action:'查看7天成长礼遇'},
 {id:'invite',label:'一级推广',intro:'专属邀请建立直属一级关系，归属由后台核验。',path:'/sage_dksy/pages/v11/promote',action:'前往一级推广'},
 {id:'redeem',label:'兑换',intro:'兑换前核对商品、库存、金币和收货信息。',path:'/sage_dksy/pages/prize/index',action:'查看金币好礼'},
 {id:'trial',label:'试用',intro:'申请不等于中选，以活动实际公布结果为准。',path:'/sage_dksy/pages/user/trial_list',action:'查看试用记录'}
];
var QUESTIONS=[
 {id:1,category:'coins',number:'01',question:'看完广告，金币什么时候到账？',answer:'自愿完整观看后，系统会核验本次奖励。以金币明细中的实际到账为准；提前关闭不发放本次奖励。',tip:'状态核验中？稍后刷新金币明细。'},
 {id:2,category:'coins',number:'02',question:'每天签到的金币都一样吗？',answer:'每天的奖励由当前活动规则决定。每日签到页面展示已同步的7天奖励；尚未同步时不会显示推测金额。实际到账可在金币明细核对。'},
 {id:6,category:'read',number:'03',question:'阅读文章需要先看广告吗？',answer:'不需要。文章可以直接免费阅读；阅读页的广告激励由你自愿选择。不观看、拒绝或提前关闭广告，都不会阻止正常阅读。'},
 {id:7,category:'read',number:'04',question:'阅读激励怎样领取，有次数限制吗？',answer:'在阅读列表或文章详情查看当前广告奖励状态，主动选择完整观看原生激励视频。奖励金额、剩余次数、冷却与可参与资格按页面实时状态显示，最终以服务端核验和金币明细为准。仅打开文章、滚动、收藏或分享不会直接获得金币。',tip:'完整观看后仍在核验时，请稍后核对明细；不要把处理中当作已到账。'},
 {id:8,category:'growth',number:'05',question:'7天成长礼遇与每日签到有什么区别？',answer:'先在成长页开启7天计划，再每日签到并查看本轮成长进度。成长计划与连续签到分别统计，不能用连续签到天数代替本轮成长天数。基础签到金币与成长额外礼遇独立结算。'},
 {id:9,category:'growth',number:'06',question:'第3天、第7天礼遇怎样领取？',answer:'成长页按实际活动配置展示第3天、第7天节点及金额。只有后台确认节点已达成、奖励开放且可领取时，才可点击领取；已领取不会重复发放。活动未开放或金额未同步时，不承诺额外金币。实际到账请查看金币明细。'},
 {id:10,category:'growth',number:'07',question:'成长中断或一轮结束后怎样处理？',answer:'本轮开始和结束时间、已完成天数及可重新开启状态，以成长页实际记录为准。是否达标由后台核验；没有开放的重启或补领奖励不在客户端自行补算。新一轮仅在页面允许开启时发起。'},
 {id:11,category:'invite',number:'08',question:'什么是一级推广，好友怎样归属？',answer:'一级好友是由你的专属邀请入口直接邀请、经后台核验建立关系的直属好友。好友需主动打开有效邀请入口并正常完成首次登录，已有邀请归属不会被覆盖；不能邀请自己。好友再邀请的人不计入你的一级好友。',tip:'是否绑定成功与归属，以后台返回的一级好友记录为准。'},
 {id:5,category:'invite',number:'09',question:'邀请好友后会立即获得奖励吗？',answer:'分享、保存海报或建立邀请关系本身不代表金币立即到账。只有已正式发布并启用的推广活动，才按实际条件核验奖励；金额、资格、次数等以该活动说明及真实到账记录为准，不承诺固定提成或多级奖励。'},
 {id:12,category:'invite',number:'10',question:'一级好友记录与好友同行有什么区别？',answer:'一级好友记录展示后台确认的直属邀请关系。7天成长中的好友同行是双方自愿参与的进度陪伴，两者分别记录。分享海报不会自动确认奖励，同行也不会自动建立或覆盖一级邀请归属。'},
 {id:3,category:'redeem',number:'11',question:'兑换商品需要准备什么？',answer:'请先确认所需金币、库存与商品说明。实物商品需要选择有效收货地址；虚拟商品按说明填写接收信息。确认扣除前请核对，提交后前往兑换记录查看进度。'},
 {id:4,category:'trial',number:'12',question:'申请试用就一定能中选吗？',answer:'申请不代表中选。请在报名截止后查看活动实际公布的名单和我的试用记录。中选后按页面要求补充资料，是否提交成功以实际状态为准。'}
];
Page({
 data:{categories:CATEGORIES,activeCategory:'all',activeTopic:CATEGORIES[0],expanded:1,questions:QUESTIONS,visibleQuestions:QUESTIONS},
 onLoad:function(options){this.selectCategory(options&&options.category||'all');},
 selectCategory:function(value){
  var category=CATEGORIES.find(function(c){return c.id===value;});if(!category)return;
  var visible=QUESTIONS.filter(function(q){return category.id==='all'||q.category===category.id;});
  var expanded=visible.some(function(q){return q.id===this.data.expanded;},this)?this.data.expanded:(visible[0]&&visible[0].id||0);
  this.setData({activeCategory:category.id,activeTopic:category,visibleQuestions:visible,expanded:expanded});
 },
 chooseCategory:function(e){this.selectCategory(e.currentTarget.dataset.category);},
 toggleQuestion:function(e){var id=Number(e.currentTarget.dataset.id);if(!this.data.visibleQuestions.some(function(q){return q.id===id;}))return;this.setData({expanded:this.data.expanded===id?0:id});}
});
