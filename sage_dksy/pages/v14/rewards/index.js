var QUESTIONS=[
 {id:1,category:'coins',number:'01',question:'看完广告，金币什么时候到账？',answer:'自愿完整观看后，系统会核验本次奖励。以金币明细中的实际到账为准；提前关闭不发放本次奖励。',tip:'状态核验中？稍后刷新金币明细。'},
 {id:2,category:'coins',number:'02',question:'每天签到的金币都一样吗？',answer:'每天的奖励由当前活动规则决定。每日签到页面会展示已同步的7天奖励；尚未同步时不会显示推测金额。实际到账可在金币明细核对。'},
 {id:3,category:'redeem',number:'03',question:'兑换商品需要准备什么？',answer:'请先确认所需金币、库存与商品说明。实物商品需要选择有效收货地址；虚拟商品按说明填写接收信息。确认扣除前请核对，提交后前往兑换记录查看进度。'},
 {id:4,category:'trial',number:'04',question:'申请试用就一定能中选吗？',answer:'申请不代表中选。请在报名截止后查看活动实际公布的名单和我的试用记录。中选后按页面要求补充资料，是否提交成功以实际状态为准。'},
 {id:5,category:'invite',number:'05',question:'邀请好友后会立即获得奖励吗？',answer:'分享或邀请本身不代表奖励立即到账。好友自愿使用并经系统确认后建立有效关系；仅在正式活动启用时，按活动条件和实际到账记录计算奖励。'}
];
Page({data:{activeCategory:'all',expanded:1,questions:QUESTIONS,visibleQuestions:QUESTIONS},onLoad:function(){},
 chooseCategory:function(e){var category=e.currentTarget.dataset.category;if(['all','coins','redeem','trial'].indexOf(category)<0)return;this.setData({activeCategory:category,visibleQuestions:QUESTIONS.filter(function(q){return category==='all'||q.category===category;})});},
 toggleQuestion:function(e){var id=Number(e.currentTarget.dataset.id);if(!QUESTIONS.some(function(q){return q.id===id;}))return;this.setData({expanded:this.data.expanded===id?0:id});}
});
