var api=require('../view_helpers.js'),nativeAddress=require('../../../utils/v12235_choose_address.js');
Page({data:{id:0,busy:false,submissionUnknown:false,error:'',yx35Name:'',yx35Tel:'',yx35Address:'',submitted:false,recipient:null,trialRecord:null},onLoad:function(q){this.setData({id:Number(q.id)||0});if(!this.data.id)this.setData({error:'申请链接无效，请返回试用记录重新进入'});var self=this;try{var channel=this.getOpenerEventChannel&&this.getOpenerEventChannel();if(channel&&channel.on)channel.on('trialRecipientContext',function(row){if(row&&String(row.id)===String(self.data.id))self.setData({trialRecord:row});});}catch(_){}},
 yx35PickAddress:function(){if(!this.data.busy&&!this.data.submissionUnknown&&!this.data.submitted)nativeAddress.chooseForTrial(this);},
 productImageError:function(){this.setData({productImageFailed:true});},
 goHistory:function(){wx.redirectTo({url:'/sage_dksy/pages/user/trial_list'});},
 save:function(event){if(this.data.busy||this.data.submitted||this.data.submissionUnknown||!this.data.id)return;var self=this,d=event.detail.value||{},name=String(d.username||'').trim(),tel=String(d.tel||'').trim(),address=String(d.address||'').trim();
 if(!name||!tel||!address){this.setData({error:'请完整填写收件人、联系方式和收货地址'});return;}
 if(!/^[0-9+() -]{6,25}$/.test(tel)){this.setData({error:'请检查联系电话是否填写正确'});return;}
 this.setData({busy:true,error:''});api.request('trialaddress',{id:this.data.id,username:name,tel:tel,address:address}).then(function(x){if(x.error!==0&&x.error!=='0')throw new Error('提交结果尚未确认，请查看试用记录');self.setData({busy:false,submitted:true,recipient:{name:name,phone:tel.length>7?tel.slice(0,3)+'****'+tel.slice(-4):'****'+tel.slice(-2),address:address}});wx.setNavigationBarTitle({title:'资料提交成功'});}).catch(function(e){var unknown=e.kind!=='business';self.setData({busy:false,submissionUnknown:unknown,error:unknown?'提交结果尚未确认，请先返回试用记录核对后再操作':api.text(e)});});}
});
