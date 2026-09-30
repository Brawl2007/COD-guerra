export const BATTLE_STATES=Object.freeze({CALM:'CALM',BUILDUP:'BUILDUP',COMBAT:'COMBAT',INTENSE:'INTENSE',AFTERMATH:'AFTERMATH'});

export class BattleDirector {
  constructor(enemies,audio,onMessage=()=>{}){this.enemies=enemies;this.audio=audio;this.onMessage=onMessage;this.state=BATTLE_STATES.CALM;this.elapsed=0;this.ambientTimer=4;this.wave=0;enemies.forEach((enemy,index)=>{enemy.group=Math.floor(index/4);enemy.active=enemy.group===0;enemy.role=['guard','rifleman','support','flanker'][index%4];});}
  update(dt,player,mission,world){this.elapsed+=dt;this.ambientTimer-=dt;const active=this.enemies.filter(e=>e.active&&e.alive),remaining=this.enemies.filter(e=>e.alive);
    if(mission.complete)this.state=BATTLE_STATES.AFTERMATH;else if(active.length>=4)this.state=BATTLE_STATES.INTENSE;else if(active.length)this.state=BATTLE_STATES.COMBAT;else if(remaining.length)this.state=BATTLE_STATES.BUILDUP;else this.state=BATTLE_STATES.AFTERMATH;
    if(this.ambientTimer<=0){const intense=this.state===BATTLE_STATES.INTENSE;this.audio.ambience(Math.random()<(intense?.62:.35)?'gunfire':'artillery',(Math.random()*2-1)*.85);this.ambientTimer=(intense?2.5:5)+Math.random()*5;}
    if(active.length<=1&&this.wave<2&&mission.phase>=1)this.deployWave(this.wave+1,player,world);
    return this.state;
  }
  deployWave(group,player,world){const candidates=this.enemies.filter(e=>e.group===group&&!e.active),safe=candidates.filter(e=>!world.lineOfSight(player,e)||Math.hypot(e.x-player.x,e.y-player.y)>430);if(!safe.length)return false;for(const enemy of candidates)enemy.active=true;this.wave=group;this.state=BATTLE_STATES.BUILDUP;this.onMessage(group===1?'SGT. HALE: MOVIMENTO NAS CASAS!':'SGT. HALE: REFORÇOS JUNTO À CAPELA!');return true;}
}
