export const WEAPON_PROFILES=Object.freeze({
  m1_carbine:Object.freeze({id:'m1_carbine',label:'M1 CARBINE',type:'semi_auto',damage:38,fireDelay:180,magazine:15,reserve:60,range:16000,spread:.009,recoil:{vertical:.028,horizontal:.012,recovery:9},reload:{duration:1500,blockStart:.05,blockEnd:.92},audio:{shot:'shot',reload:'reload'},model:'assets/models/m1-carbine.obj',animations:{fire:'fire',reload:'reload',sprint:'sprint'}}),
});

export class WeaponSystem {
  constructor(profile='m1_carbine'){this.equip(profile);}
  equip(profile){this.profile=typeof profile==='string'?WEAPON_PROFILES[profile]:profile;if(!this.profile)throw new Error('Perfil de arma desconhecido');this.config={...this.profile,magazine:this.profile.magazine,reloadMs:this.profile.reload.duration,recoil:this.profile.recoil.vertical};this.mag=this.profile.magazine;this.reserve=this.profile.reserve;this.lastShot=-1e9;this.reloadUntil=0;this.reloadStarted=0;this.shotCount=0;}
  get reloading(){return this.reloadUntil>0;}
  reloadProgress(now){return this.reloading?Math.max(0,Math.min(1,(now-this.reloadStarted)/this.profile.reload.duration)):0;}
  shoot(now){if(this.reloading||this.mag<=0||now-this.lastShot<this.profile.fireDelay)return false;this.mag--;this.lastShot=now;this.shotCount++;return true;}
  shotDirection(angle,pitch=0){const seed=Math.sin(this.shotCount*91.17)*43758.5453,spread=(seed-Math.floor(seed)-.5)*this.profile.spread;return{angle:angle+spread,pitch:pitch+spread*.55};}
  reload(now){if(this.reloading||this.mag===this.profile.magazine||this.reserve===0)return false;this.reloadStarted=now;this.reloadUntil=now+this.profile.reload.duration;return true;}
  update(now){if(this.reloadUntil&&now>=this.reloadUntil){const needed=this.profile.magazine-this.mag,taken=Math.min(needed,this.reserve);this.mag+=taken;this.reserve-=taken;this.reloadUntil=0;return true;}return false;}
}

export class Weapon extends WeaponSystem {
  constructor(config){super({...config,id:'test',label:'TEST',type:'semi_auto',range:config.range??620,spread:config.spread??0,recoil:{vertical:config.recoil??.02,horizontal:.01,recovery:9},reload:{duration:config.reloadMs,blockStart:0,blockEnd:1},audio:{},model:'',animations:{}});}
}
