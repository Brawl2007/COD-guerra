export class Weapon {
  constructor(config) { this.config=config; this.mag=config.magazine; this.reserve=config.reserve; this.lastShot=-Infinity; this.reloadUntil=0; this.reloadStarted=0; }
  get reloading(){return this.reloadUntil>0;}
  shoot(now) { if(this.reloading||this.mag<=0||now-this.lastShot<this.config.fireDelay)return false; this.mag--;this.lastShot=now;return true; }
  reload(now) { if(this.reloading||this.mag===this.config.magazine||this.reserve===0)return false;this.reloadStarted=now;this.reloadUntil=now+this.config.reloadMs;return true; }
  reloadProgress(now){return this.reloading?Math.max(0,Math.min(1,(now-this.reloadStarted)/this.config.reloadMs)):0;}
  update(now) { if(this.reloadUntil&&now>=this.reloadUntil){const needed=this.config.magazine-this.mag,taken=Math.min(needed,this.reserve);this.mag+=taken;this.reserve-=taken;this.reloadUntil=0;return true;}return false; }
}
