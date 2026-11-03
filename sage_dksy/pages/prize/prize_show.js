var yx29AddressBook=require("../../utils/v12229_address.js");
var yx35WechatAddress=require("../../utils/v12235_choose_address.js"); /* YX_V12235_WECHAT_CHOOSE_ADDRESS */
var v10=require("../../utils/v10.js");
var v3gate=require("../../utils/v3_ad_gate.js");
var e = getApp(), t = require("../../wxParse/wxParse.js");

Page({
    data: {
        v3Unit:"", v3Ready:false,loading:true,pageError:"",balance:null,priceReady:false,stockReady:false,accountReady:false,submitting:false,confirmVisible:false,orderSuccess:false,orderUnknown:false,orderMessage:"",shortfall:null,balanceAfter:null,prize_show:null,detailView:'product',relatedGoods:[],photoIndex:0,resultBalance:null,
        template_on: 0,
        address: "请填写收货地址",
        selectedAddress:null,
        remark: "",
        share:{title:"分享"}
    },
    onLoad:function(query){var id=Number(query&&query.id);this.setData({id:id,v10source:query&&query.source||'detail'});if(!id||id<1){this.setData({loading:false,pageError:'这件好礼暂时无法查看'});return;}this.loadDetail();this.getadset(1);this.getShare();this.v10Config();if(query.source)v10.track('share_landing','prize',id,query.source);},
    onShow:function(){this.yx29RefreshAddress();if(this._didShow&&this.data.id&&!this.data.submitting&&!this.data.orderSuccess)this.loadDetail();this._didShow=true;},
    onPullDownRefresh:function(){this.loadDetail();},
    request:function(name,data,done){e.secureRequest({url:e.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,success:function(res){var b=res&&res.data;if(res&&res.statusCode&&Number(res.statusCode)!==200||!b||typeof b!=='object'||b.error!==undefined&&Number(b.error)!==0){done(null,b&&b.msg);return;}done(b);},fail:function(){done(null);}});},
    loadDetail:function(){if(this._loading||!this.data.id)return;this._loading=true;this.setData({loading:true,pageError:'',accountReady:false});var self=this;wx.login({success:function(auth){if(!auth.code){self.detailFail();return;}self.request('set',{code:auth.code},function(b){if(!b||!b.userinfo){self.detailFail();return;}var raw=b.userinfo.num,value=raw===null||raw===undefined||typeof raw==='boolean'||typeof raw==='object'||String(raw).trim()===''?NaN:Number(raw);self.setData({setinfo:b.setinfo||{},userinfo:b.userinfo,openid:b.openid||'',balance:isFinite(value)&&value>=0?value:null,accountReady:true});if(b.openid)wx.setStorageSync('openid',b.openid);self.yx29RefreshAddress();self.yx38LoadSubscribeConfig();self.request('prizeshow',{openid:b.openid,id:self.data.id},function(data){self._loading=false;wx.stopPullDownRefresh();if(!data||!data.prize_show||!data.prize_show.prize_title){self.setData({loading:false,pageError:'好礼详情暂时没有加载出来'});return;}var p=data.prize_show,imgs=p.prize_pics||[];if(typeof imgs==='string'){try{imgs=JSON.parse(imgs);}catch(_){imgs=[];}}if(!Array.isArray(imgs))imgs=[];imgs=imgs.map(function(x){return typeof x==='string'?x:x&&(x.url||x.src||x.picurl)||'';}).filter(Boolean);if(!imgs.length&&p.prize_picurl)imgs=[p.prize_picurl];p=Object.assign({},p,{prize_pics:imgs});var rawCost=p.prize_integral,cost=rawCost===null||rawCost===undefined||typeof rawCost==='boolean'||typeof rawCost==='object'||String(rawCost).trim()===''?NaN:Number(rawCost),rawStock=p.prize_num,stock=rawStock===null||rawStock===undefined||typeof rawStock==='boolean'||typeof rawStock==='object'||String(rawStock).trim()===''?NaN:Number(rawStock),balance=self.data.balance;self.setData({detailView:isFinite(stock)&&stock<=0?'soldout':(self.data.detailView==='shortfall'&&balance!==null&&isFinite(cost)&&balance<cost?'shortfall':'product'),prize_show:p,template_on:data.template_on||0,template_str:data.template_str||'',loading:false,pageError:'',priceReady:isFinite(cost)&&cost>=0,stockReady:isFinite(stock)&&stock>=0,shortfall:balance!==null&&isFinite(cost)?Math.max(0,cost-balance):null,balanceAfter:balance!==null&&isFinite(cost)?Math.max(0,balance-cost):null});t.wxParse('content','html',p.content||'',self,0);self.loadRelated();});});},fail:function(){self.detailFail();}});},
    detailFail:function(){this._loading=false;this.setData({loading:false,pageError:'暂时连接不上，请重试',accountReady:false});wx.stopPullDownRefresh();},
    retry:function(){this.loadDetail();},
    onProductImageError:function(ev){var i=Number(ev.currentTarget.dataset.index),p=Object.assign({},this.data.prize_show),images=(p.prize_pics||[]).slice();images.splice(i,1);p.prize_pics=images;this.setData({prize_show:p});},
    onReady: function() {},
    getShare:function(){var self=this;this.request('share',{},function(b){if(b)self.setData({share:b.share||{}});});},
    onShareAppMessage:function(){var p=this.data.prize_show||{},id=Number(this.data.id);v10.track('share_entry','prize',id,'friend');return {title:this.data.v10shareTitle||p.prize_title||'元享兑换好礼',path:'/sage_dksy/pages/prize/prize_show?id='+id+'&source=friend',imageUrl:v10.shareCover(this.data.v10shareCover||p.prize_picurl||'')};},
    onShareTimeline:function(){var p=this.data.prize_show||{},id=Number(this.data.id);v10.track('share_entry','prize',id,'timeline');return {title:this.data.v10shareTitle||p.prize_title||'元享兑换好礼',query:'id='+id+'&source=timeline',imageUrl:v10.shareCover(this.data.v10shareCover||p.prize_picurl||'')};},
    v10Poster:function(){
        var p=this.data.prize_show||{},gallery=p.prize_pics||[],src=p.prize_picurl||'';
        if(typeof gallery==='string'){try{gallery=JSON.parse(gallery);}catch(ex){gallery=[];}}
        if(!Array.isArray(gallery))gallery=[];
        // 仅使用真实商品图与已配置分享封面，去掉空值、重复地址。
        var seen={},imgs=[src].concat(gallery.map(function(x){return typeof x==='string'?x:(x&&(x.url||x.src||x.picurl||x.image)||'');}),[this.data.v10shareCover||'']).filter(function(x){
            if(!x||typeof x!=='string'||seen[x])return false;
            seen[x]=true;return true;
        });
        try{wx.setStorageSync('v10_poster_source_prize_'+this.data.id,{image:src,images:imgs,at:Date.now()});}catch(ex){}
        v10.poster('prize',this.data.id);
    },
    v10Config:function(){var self=this;v10.api('v10config',{},function(c){self.setData({v10shareOn:!!(c&&c.share_on),v10posterOn:!!(c&&c.posters_on)});if(!c||!c.share_on)wx.hideShareMenu();else wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});});v10.api('v10featured',{},function(r){var row=((r&&r.items)||[]).filter(function(x){return x.kind==='prize'&&Number(x.id)===Number(self.data.id);})[0];if(row)self.setData({v10shareTitle:row.share_title,v10shareCover:row.share_cover});});},
    trialprize: function(e) {
        e.currentTarget.dataset.id;
        wx.navigateTo({
            url: "/sage_dksy/pages/trial/trial_prize"
        });
    },
    imgHeight: function(e) {
        var t = wx.getSystemInfoSync().windowWidth * e.detail.height / e.detail.width + "px";
        console.log(t), this.setData({
            Height: t
        });
    },
    /* YX_V12229_ADDRESS_CARD: never invokes wx.chooseAddress */
    yx29RefreshAddress:function(){
        var entry=yx29AddressBook.getSelected(this.data.openid);
        this.setData({selectedAddress:entry ? Object.assign({},entry,{viewAddress:yx29AddressBook.formatView(entry),viewPhone:yx29AddressBook.phoneMask(entry.phone)}) : null});
    },
    yx35PickWechatAddress:function(){
        yx35WechatAddress.chooseForOrder(this,yx29AddressBook,false);
    },
    yx29OpenAddressBook:function(){
        var uid=yx29AddressBook.accountId(this.data.openid);
        if(!uid){wx.showToast({title:'请先完成账号登录',icon:'none'});return;}
        try { wx.setStorageSync('openid',uid); } catch(ex) {}
        wx.navigateTo({url:'/sage_dksy/pages/address/list?mode=select'});
    },
    buildManualAddress:function(){
        var entry=yx29AddressBook.getSelected(this.data.openid);
        if(!entry){wx.showToast({title:'请选择收货地址',icon:'none'});return '';}
        return yx29AddressBook.formatOrder(entry);
    },

    yx38LoadSubscribeConfig:function(){
        var self=this;
        var app=getApp();
        app.secureRequest({
            url:app.util.url('entry/wxapp/subscribeconfig')+'m=sage_dksy',
            method:'POST',data:{},
            success:function(r){
                var v=r&&r.data||{};
                if(Number(v.error)===0 && Array.isArray(v.order)){
                    self.setData({yx38OrderTemplateIds:v.order.filter(function(id){return typeof id==='string'&&id.length>=16;}).slice(0,3)});
                }
            }
        });
    },
    yx37GetOrderTemplateIds:function(){
        return Array.isArray(this.data.yx38OrderTemplateIds)?this.data.yx38OrderTemplateIds:[];
    },
    yx37RequestOrderSubscribe:function(done){
        var sent=false;
        function next(){ if(sent)return;sent=true;if(typeof done==='function')done(); }
        var ids=this.yx37GetOrderTemplateIds();
        if(typeof wx.requestSubscribeMessage!=='function' || !ids.length){ next(); return; }
        // 点击“立即兑换”直接触发，用户拒绝也不阻止兑换。
        try{ wx.requestSubscribeMessage({tmplIds:ids,complete:next}); }
        catch(err){next();}
    },

    duihuan:function(){
        if(this.data.orderUnknown){this.goOrders();return;}
        if(this.data.submitting||this.data.orderSuccess||this.data.loading||!this.data.accountReady||!this.data.priceReady||!this.data.stockReady||this.data.balance===null)return;
        var p=this.data.prize_show||{};
        if(Number(p.prize_num)<=0){this.openSoldout();return;}
        if(this.data.balance!==null&&Number(p.prize_integral)>this.data.balance){this.openShortfall();return;}
        var address='';
        if(Number(p.prize_type)===0){address=this.buildManualAddress();if(!address)return;}
        if(Number(p.prize_type)===1&&!String(this.data.remark||'').trim()){wx.showToast({title:'请填写接收信息',icon:'none'});return;}
        this.setData({address:address,confirmVisible:true});
    },
    closeConfirmation:function(){if(!this.data.submitting)this.setData({confirmVisible:false});},
    stopTouch:function(){},
    confirmRedeem:function(){
        if(this.data.submitting||!this.data.confirmVisible||this.data.orderSuccess||this.data.orderUnknown)return;
        var current=this.data.prize_show||{};
        if(!this.data.accountReady||!this.data.priceReady||!this.data.stockReady||!isFinite(Number(current.prize_num))||Number(current.prize_num)<=0||this.data.balance===null||Number(current.prize_integral)>this.data.balance){this.setData({confirmVisible:false});wx.showToast({title:'兑换状态已变化，请刷新后重试',icon:'none'});return;}
        if(Number(current.prize_type)===0&&!this.buildManualAddress()){this.setData({confirmVisible:false});return;}
        this.setData({submitting:true,orderMessage:''});
        var self=this,p=this.data.prize_show||{},address=this.data.address;
        this.yx37RequestOrderSubscribe(function(){
            wx.login({success:function(auth){if(!auth.code){self.orderFailed('账号连接暂时不可用，请重试');return;}
                e.secureRequest({url:e.util.url('entry/wxapp/order')+'m=sage_dksy',method:'POST',timeout:15000,data:{code:auth.code,id:self.data.id,address:address,type:p.prize_type,remark:self.data.remark||''},success:function(res){
                    var b=res&&res.data;
                    if(!res||res.statusCode&&Number(res.statusCode)!==200||!b||typeof b!=='object'||b.error===undefined||b.error===null){self.setData({orderUnknown:true});self.orderFailed('未能确认兑换结果，请先查看兑换记录');return;}
                    if(b.error!==0&&b.error!=='0'){self.orderFailed(b&&typeof b.msg==='string'?b.msg:'兑换暂未成功，请稍后重试');return;}
                    v10.track('participation','prize',self.data.id,self.data.v10source||'detail');
                    self.setData({confirmVisible:false,submitting:false,orderSuccess:true,orderMessage:'兑换申请已提交，请在兑换记录中查看处理进度。'});self.refreshResultBalance();
                },fail:function(){self.setData({orderUnknown:true});self.orderFailed('连接中断，结果暂时未能确认。请先查看兑换记录，避免重复提交。');}});
            },fail:function(){self.orderFailed('账号连接暂时不可用，请重试');}});
        });
    },
    orderFailed:function(message){var text=String(message||'兑换暂未成功，请稍后重试');if(/php|json|mysql|sqlstate|微擎|fatal|exception|token|openid/i.test(text))text='暂时无法完成兑换，请稍后重试';this.setData({submitting:false,confirmVisible:false,orderMessage:text});wx.showModal({title:'请核对兑换结果',content:text,confirmText:'兑换记录',cancelText:'留在这里',success:function(result){if(result.confirm)wx.navigateTo({url:'/sage_dksy/pages/user/order'});}});},
    onGalleryChange:function(ev){this.setData({photoIndex:Number(ev.detail.current)||0});},
    openShortfall:function(){var p=this.data.prize_show||{};if(this.data.balance===null||!this.data.priceReady||Number(p.prize_integral)<=this.data.balance)return;var gap=Math.max(0,Number(p.prize_integral)-this.data.balance),percent=Number(p.prize_integral)>0?Math.max(0,Math.min(100,this.data.balance/Number(p.prize_integral)*100)):0;this.setData({detailView:'shortfall',shortfall:gap,progressPercent:percent});wx.setNavigationBarTitle({title:'金币还差一点'});wx.pageScrollTo({scrollTop:0,duration:0});},
    openSoldout:function(){if(!this.data.stockReady||Number((this.data.prize_show||{}).prize_num)>0)return;this.setData({detailView:'soldout'});wx.setNavigationBarTitle({title:'商品已售罄'});wx.pageScrollTo({scrollTop:0,duration:0});},
    viewProduct:function(){this.setData({detailView:'product'});wx.setNavigationBarTitle({title:'好礼详情'});wx.pageScrollTo({scrollTop:0,duration:0});},
    goSign:function(){wx.redirectTo({url:'/sage_dksy/pages/v14/sign/index'});},
    loadRelated:function(){var self=this;this.request('prize',{openid:this.data.openid,pages:1},function(b){if(!b||!Array.isArray(b.prize))return;self.setData({relatedGoods:b.prize.filter(function(p){return Number(p.prize_id)!==Number(self.data.id)&&Number(p.prize_num)>0;}).slice(0,4)});});},
    openRelated:function(ev){var id=Number(ev.currentTarget.dataset.id);if(id>0)wx.redirectTo({url:'/sage_dksy/pages/prize/prize_show?id='+id});},
    relatedImageError:function(ev){var id=String(ev.currentTarget.dataset.id);this.setData({relatedGoods:(this.data.relatedGoods||[]).map(function(p){return String(p.prize_id)===id?Object.assign({},p,{_imageFailed:true}):p;})});},
    refreshResultBalance:function(){var self=this;wx.login({success:function(auth){if(!auth.code)return;self.request('set',{code:auth.code},function(b){var raw=b&&b.userinfo&&b.userinfo.num,n=raw===null||raw===undefined||typeof raw==='boolean'||typeof raw==='object'||String(raw).trim()===''?NaN:Number(raw);if(isFinite(n)&&n>=0)self.setData({resultBalance:n,balance:n});});}});},
    goOrders:function(){wx.redirectTo({url:'/sage_dksy/pages/user/order'});},
    goGifts:function(){wx.redirectTo({url:'/sage_dksy/pages/prize/index'});},
    goTasks:function(){wx.redirectTo({url:'/sage_dksy/pages/v14/tasks/index'});},
    navtiaozhuan: function(e) {
        var t = e.currentTarget.dataset.appid, a = "";
        e.currentTarget.dataset.path && (a = e.currentTarget.dataset.path), wx.showToast({title:"请使用本小程序内服务",icon:"none"}); /* 外链功能已关闭 */ false && wx.navigateToMiniProgram({
            appId: t,
            path: a,
            envVersion: "develop",
            success: function(e) {},
            fail: function(e) {
                console.log(e);
            }
        });
    },
    v3Set: function (slots) {
        var c = slots && slots['prize_detail_banner'];
        var eligible = v3gate.available(slots, 'prize_detail_banner');
        this.setData({v3Unit: eligible ? c.unit : '', v3Ready: eligible});
    },
    onV3AdLoad: function () {v3gate.loaded('prize_detail_banner');},
    onV3AdError: function () {this.setData({v3Ready:false,v3Unit:''});},
    getadset:function(){var self=this;this.request('adset',{},function(b){if(!b)return;var ad=b.adset||{};self.v3Set(ad.v3_slots||{});self.setData({adset:ad});});},
    beizhu: function(e) {
        this.setData({
            remark: e.detail.value
        });
    }
});