const ops=require('../../utils/v1222ops.js');
Component({
 properties:{placement:{type:String,value:''}},
 data:{enabled:false,loaded:false,unitId:'',kind:'banner'},
 lifetimes:{attached(){this.yx22Alive=true;this.refresh();},detached(){this.yx22Alive=false;}},
 pageLifetimes:{show(){this.refresh();}},
 methods:{
  refresh(){ops.fetch().then(config=>{if(!this.yx22Alive)return;const s=(config.slots||{})[this.properties.placement];
    if(!s||Number(s.enabled)!==1||!/^adunit-[a-zA-Z0-9]{8,64}$/.test(s.unit_id||''))return this.setData({enabled:false,loaded:false});
    const kind=s.kind==='native'?'native':'banner';
    this.setData({enabled:true,unitId:s.unit_id,kind});
  });},
  onAdLoad(){if(this.yx22Alive)this.setData({loaded:true});},
  onAdError(){if(this.yx22Alive)this.setData({enabled:false,loaded:false});}
 }
});
