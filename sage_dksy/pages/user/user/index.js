/* YX V13.1.2: explicit user-selected avatar/nickname; safe login-code verification. */
var app = getApp();
Page({
  data:{openid:'',userinfo:{},nickname:'',profileBusy:false,avatarBusy:false,profileError:'',avatarPreview:'',profileLoaded:false},
  onLoad:function(){ this.refreshProfile(); },
  onShow:function(){ if(!this.data.profileLoaded && !this.data.profileBusy && !this.data.avatarBusy) this.refreshProfile(); },
  skipProfile:function(){if(getCurrentPages().length>1){wx.navigateBack({delta:1});}else{wx.reLaunch({url:'/sage_dksy/pages/index/index'});}},
  api:function(name,params,done){
    var endpoint=app.util.url('entry/wxapp/'+name)+'m=sage_dksy';
    app.secureRequest({url:endpoint,method:'POST',data:params||{},timeout:15000,
      success:function(r){var x=r&&r.data||{};if(typeof x==='string'){try{x=JSON.parse(x);}catch(e){x={error:1,msg:'资料暂时没有读取到，请重试'};}}if(!x||typeof x!=='object'||(r.statusCode||0)<200||(r.statusCode||0)>=300) x={error:1,msg:'资料暂时不可用，请稍后重试'};done(x);},
      fail:function(err){done({error:1,msg:'网络暂时没有连接上，请重试'});}
    });
  },
  withCode:function(done,onfail){
    wx.login({success:function(r){if(r&&r.code)done(r.code);else{if(typeof onfail==='function')onfail();wx.showToast({title:'登录失败，请重试',icon:'none'});}},fail:function(){if(typeof onfail==='function')onfail();wx.showToast({title:'登录失败，请重试',icon:'none'});}});
  },
  refreshProfile:function(){
    if(this.data.profileBusy)return;
    var page=this;this.setData({profileBusy:true,profileError:''});
    this.withCode(function(code){
      if(!code){page.setData({profileBusy:false,profileError:'登录失败，请重试'});return;}
      page.api('getuser',{code:code},function(r){
        page.setData({profileBusy:false});
        if(Number(r.error)===0&&r.userinfo){
          page.setData({userinfo:r.userinfo,nickname:r.userinfo.nickname||'',avatarPreview:'',profileLoaded:true});
        }else{
          var msg=r.msg||'资料读取失败';page.setData({profileError:msg});
          if(Number(r.error)===401) app.clearAuth();
        }
      });
    },function(){page.setData({profileBusy:false,profileError:'微信登录失败'});});
  },
  upface:function(e){
    var tmp=e&&e.detail&&e.detail.avatarUrl;
    if(!tmp||this.data.avatarBusy)return;
    this.uploadSelectedAvatar(tmp);
  },
  chooseAlbumAvatar:function(){
    if(this.data.avatarBusy)return;
    var page=this;
    function picked(path){if(path)page.uploadSelectedAvatar(path);}
    if(typeof wx.chooseMedia==='function'){
      wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album'],sizeType:['compressed'],
        success:function(res){var item=res&&res.tempFiles&&res.tempFiles[0];picked(item&&(item.tempFilePath||item.path));},
        fail:function(err){var m=String(err&&err.errMsg||'');if(!/cancel/i.test(m))wx.showToast({title:'相册选择失败，请重试',icon:'none'});}
      });
    }else if(typeof wx.chooseImage==='function'){
      wx.chooseImage({count:1,sizeType:['compressed'],sourceType:['album'],
        success:function(res){picked(res&&res.tempFilePaths&&res.tempFilePaths[0]);},
        fail:function(err){var m=String(err&&err.errMsg||'');if(!/cancel/i.test(m))wx.showToast({title:'相册选择失败，请重试',icon:'none'});}
      });
    }else wx.showToast({title:'当前微信版本不支持选择图片',icon:'none'});
  },
  uploadSelectedAvatar:function(tmp){
    if(!tmp||this.data.avatarBusy)return;
    var page=this,previous=this.data.avatarPreview;
    this.setData({avatarPreview:tmp,avatarBusy:true,profileError:''});
    this.withCode(function(code){
      if(!code){page.setData({avatarBusy:false,avatarPreview:previous,profileError:'登录失败，请重试'});return;}
      var submitAvatar=function(avatarPath){wx.uploadFile({url:app.util.url('entry/wxapp/upface')+'m=sage_dksy',filePath:avatarPath,name:'file',formData:{code:code},timeout:20000,
        success:function(res){
          var b;try{b=JSON.parse(String(res.data||''));}catch(err){b=null;}
          if(res.statusCode===200&&b&&Number(b.error)===0&&b.path){
            page.setData({'userinfo.headimg':b.path,avatarPreview:'',profileError:''});
            wx.showToast({title:'头像已保存',icon:'success'});
          }else{
            var reason=b&&b.msg || '头像暂时没有保存成功，请重试';
            page.setData({avatarPreview:previous,profileError:reason});
            wx.showToast({title:reason.slice(0,24),icon:'none'});
          }
        },
        fail:function(err){
          var why='头像暂时没有保存成功，请检查网络后重试';
          page.setData({avatarPreview:previous,profileError:why});
          wx.showToast({title:'头像上传失败，请检查网络',icon:'none'});
        },complete:function(){page.setData({avatarBusy:false});}
      });};
      // Reduces common microengine attachment-size failures without weakening server validation.
      if (typeof wx.compressImage==='function') {
        wx.compressImage({src:tmp,quality:72,success:function(r){submitAvatar(r && r.tempFilePath ? r.tempFilePath : tmp);},fail:function(){submitAvatar(tmp);}});
      } else {submitAvatar(tmp);}
    },function(){page.setData({avatarBusy:false,avatarPreview:previous,profileError:'微信登录失败'});});
  },
  changename:function(e){this.setData({nickname:(e.detail&&e.detail.value)||''});},
  nicknamereview:function(e){this.changename(e);},
  tijiao:function(){
    if(this.data.profileBusy||this.data.avatarBusy)return;
    var nick=String(this.data.nickname||'').trim();
    if(!nick){wx.showToast({title:'请填写昵称',icon:'none'});return;}
    if(Array.from(nick).length>30){wx.showToast({title:'昵称最多30个字',icon:'none'});return;}
    var page=this;this.setData({profileBusy:true,profileError:''});
    this.withCode(function(code){
      if(!code){page.setData({profileBusy:false,profileError:'登录失败，请重试'});return;}
      page.api('username',{code:code,nickname:nick},function(r){
        page.setData({profileBusy:false});
        if(Number(r.error)===0){
          page.setData({'userinfo.nickname':nick});wx.showToast({title:'资料已保存',icon:'success'});
          setTimeout(function(){page.skipProfile();},450);
        }else{
          if(Number(r.error)===401)app.clearAuth();
          var msg=r.msg||'昵称保存失败';page.setData({profileError:msg});wx.showToast({title:msg.slice(0,24),icon:'none'});
        }
      });
    },function(){page.setData({profileBusy:false,profileError:'微信登录失败'});});
  }
});
