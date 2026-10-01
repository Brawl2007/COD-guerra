import profile from '../../research/weapons/kb_wz29.profile.json' with { type: 'json' };

export class Wz29 {
  constructor(){this.profile={id:profile.id,label:profile.name,type:'bolt_action',damage:profile.gameplay.damage,
    range:profile.gameplay.rangeM.maxEngage,reload:{duration:profile.gameplay.reloadClipSec*1000}};
    this.mag=5;this.reserve=40;this.state='READY';this.until=0;this.started=0;this.lastShot=-1e9;
    this.shotCount=0;this.sight=300;this.reloadMode=null;}
  get reloading(){return this.state.startsWith('RELOAD');}
  get boltCycling(){return this.state==='BOLT_CYCLE';}
  reloadProgress(now){return this.reloading?Math.min(1,(now-this.started)/(this.until-this.started)):0;}
  reload(now){
    if(this.state!=='READY'||this.mag===5||!this.reserve)return false;
    this.reloadMode=this.mag===0?'clip':'single';this.state=this.mag===0?'RELOAD_CLIP':'RELOAD_SINGLE';
    this.started=now;this.until=now+(this.mag===0?profile.gameplay.reloadClipSec:profile.gameplay.reloadSingleRoundSec)*1000;return true;
  }
  update(now){
    if(this.state==='READY'||now<this.until)return false;
    if(this.state==='BOLT_CYCLE'){this.state='READY';this.until=0;return true;}
    const take=Math.min(this.state==='RELOAD_CLIP'?5:1,5-this.mag,this.reserve);
    this.mag+=take;this.reserve-=take;
    if(this.state==='RELOAD_SINGLE'&&this.mag<5&&this.reserve){this.started=this.until;this.until+=profile.gameplay.reloadSingleRoundSec*1000;}
    else{this.state='READY';this.until=0;this.reloadMode=null;}return true;
  }
  shoot(now){
    this.update(now);
    if(this.state==='RELOAD_SINGLE'&&this.mag){this.state='READY';this.until=0;this.reloadMode=null;}
    if(this.state!=='READY'||!this.mag)return false;
    this.mag--;this.lastShot=now;this.shotCount++;this.state='BOLT_CYCLE';this.started=now;
    this.until=now+profile.gameplay.boltCycleSec*1000;return true;
  }
  adjustSight(){const presets=profile.gameplay.ballistics.sightPresetsM;this.sight=presets[(presets.indexOf(this.sight)+1)%presets.length];return this.sight;}
  shotDirection(angle,pitch,aiming,moving,random){
    // Documented fallback: straight ray with angular dispersion. Sight remains a range reference;
    // do not pretend the prototype implements drag/drop or invent measured ballistics.
    const spread=(aiming?profile.gameplay.spreadDeg.aim+(moving?profile.gameplay.spreadDeg.aimMovingAdd:0):profile.gameplay.spreadDeg.hip)*Math.PI/180;
    return {angle:angle+(random()-.5)*spread,pitch:pitch+(random()-.5)*spread};
  }
  snapshot(){return {id:this.profile.id,mag:this.mag,reserve:this.reserve,state:this.state,until:this.until,
    started:this.started,lastShot:this.lastShot,shotCount:this.shotCount,sight:this.sight,reloadMode:this.reloadMode};}
  restore(s){Object.assign(this,s);return this;}
}
