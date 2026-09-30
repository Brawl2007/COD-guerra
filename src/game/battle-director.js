export const BATTLE_STATES=Object.freeze({CALM:'CALM',BUILDUP:'BUILDUP',COMBAT:'COMBAT',INTENSE:'INTENSE',AFTERMATH:'AFTERMATH'});

export class BattleDirector {
  constructor(enemies,audio,onMessage=()=>{},random=Math.random){
    this.enemies=enemies;this.audio=audio;this.onMessage=onMessage;this.random=random;
    this.state=BATTLE_STATES.CALM;this.elapsed=0;this.ambientTimer=4;this.wave=0;
    enemies.forEach((enemy,index)=>{enemy.group=Math.floor(index/4);enemy.active=enemy.group===0;enemy.role=['guard','rifleman','support','flanker'][index%4];});
  }
  update(dt,player,mission,world){
    this.elapsed+=dt;
    const active=this.enemies.filter(e=>e.active&&e.alive),remaining=this.enemies.filter(e=>e.alive);
    if(mission.complete)this.state=BATTLE_STATES.AFTERMATH;
    else if(active.length>=4)this.state=BATTLE_STATES.INTENSE;
    else if(active.length)this.state=BATTLE_STATES.COMBAT;
    else if(remaining.length)this.state=BATTLE_STATES.BUILDUP;
    else this.state=BATTLE_STATES.AFTERMATH;
    // All real groups are eligible, including an incomplete fourth group.
    if(active.length<=1&&mission.phase>=1){
      const groups=[...new Set(this.enemies.filter(e=>e.alive&&!e.active).map(e=>e.group))];
      for(const group of groups)if(this.deployWave(group,player,world))break;
    }
    return this.state;
  }
  deployWave(group,player,world){
    const safe=this.enemies.filter(e=>e.alive&&e.group===group&&!e.active&&
      (!world.lineOfSight(player,e)||Math.hypot(e.x-player.x,e.y-player.y)>430));
    if(!safe.length)return false;
    for(const enemy of safe)enemy.active=true;
    this.wave=Math.max(this.wave,group);this.state=BATTLE_STATES.BUILDUP;
    this.onMessage(group===1?'SGT. HALE: MOVIMENTO NAS CASAS!':'SGT. HALE: REFORÇOS JUNTO À CAPELA!');return true;
  }
}
