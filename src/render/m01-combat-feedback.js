const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const finiteDirection=value=>Number.isFinite(value)?clamp(value,-1,1):null;

export const M01_FEEDBACK_CAPS=Object.freeze({
  suppressionVisual:1,
  hitImpulse:1,
  nearMissImpulse:.72,
  impactImpulse:.5,
  explosionImpulse:1,
  cameraOffset:.02,
  cameraRoll:.012,
  overlayAlpha:.42
});

const QUALITY=Object.freeze({
  low:{camera:.62,overlay:.78,flash:0},
  medium:{camera:1,overlay:1,flash:1},
  high:{camera:1.08,overlay:1.06,flash:1.08}
});

const PROFILE=Object.freeze({
  hit:{duration:.46,suppressionDuration:1.15,suppression:.48},
  nearMiss:{duration:.34,suppressionDuration:1.05,suppression:.26},
  impact:{duration:.32,suppressionDuration:.9,suppression:.18},
  explosion:{duration:.82,suppressionDuration:1.4,suppression:.42},
  direction:{duration:.42,suppressionDuration:.7,suppression:.08}
});

const envelope=(age,duration)=>age<0||age>=duration?0:(1-age/duration)**2;

export class M01CombatFeedback {
  constructor(){this.reset();}
  reset(){
    this.events=[];this.counts={playerHit:0,nearMiss:0,nearImpact:0,explosion:0,directional:0};
    this.lastHitDirection=null;this.lastDirection=null;this.sequence=0;
  }
  add(kind,clock,intensity=1,direction=null,detail=null){
    if(!PROFILE[kind]||!Number.isFinite(clock)||intensity<=0)return false;
    const event={kind,clock,intensity:clamp(intensity,0,1.5),direction:finiteDirection(direction),detail,sequence:this.sequence++};
    this.events.push(event);if(this.events.length>48)this.events.splice(0,this.events.length-48);
    if(event.direction!==null)this.lastDirection=event.direction;
    return true;
  }
  playerHit(clock,direction=null){
    this.counts.playerHit++;const d=finiteDirection(direction);if(d!==null)this.lastHitDirection=d;
    return this.add('hit',clock,1,d,'player-hit');
  }
  directionalHit(clock,direction){
    const d=finiteDirection(direction);if(d===null)return false;
    this.counts.directional++;this.lastHitDirection=d;return this.add('direction',clock,.5,d,'hit-origin');
  }
  roundImpact({clock,distance=Infinity,crack=false,direction=null,weapon=null,material=null}={}){
    const d=Math.max(0,Number(distance)||0),mg=weapon==='mg34';
    if(crack){this.counts.nearMiss++;this.add('nearMiss',clock,mg?1.05:.88,direction,{weapon,material});}
    if(d<46){
      const strength=(1-d/46)*(mg?1.12:1);if(strength>.04){this.counts.nearImpact++;this.add('impact',clock,strength,direction,{weapon,material,distance:d});}
    }
  }
  explosion({clock,distance=Infinity,direction=null}={}){
    const d=Math.max(0,Number(distance)||0),strength=clamp(1-d/180,0,1);
    if(strength<=.02)return false;this.counts.explosion++;return this.add('explosion',clock,strength,direction,{distance:d});
  }
  sample(clock,quality='medium'){
    const q=QUALITY[quality]??QUALITY.medium;
    let hit=0,near=0,impact=0,explosion=0,suppression=0,dirSum=0,dirWeight=0;
    const active=[];
    for(const event of this.events){
      const age=Math.max(0,clock-event.clock),profile=PROFILE[event.kind],main=envelope(age,profile.duration),sup=envelope(age,profile.suppressionDuration);
      if(!main&&!sup)continue;active.push(event);
      const value=event.intensity*main;
      if(event.kind==='hit')hit+=value;
      else if(event.kind==='nearMiss')near+=value;
      else if(event.kind==='impact')impact+=value;
      else if(event.kind==='explosion')explosion+=value;
      suppression+=event.intensity*profile.suppression*sup;
      if(event.direction!==null&&value>0){dirSum+=event.direction*value;dirWeight+=value;}
    }
    this.events=active;
    hit=clamp(hit,0,M01_FEEDBACK_CAPS.hitImpulse);near=clamp(near,0,M01_FEEDBACK_CAPS.nearMissImpulse);
    impact=clamp(impact,0,M01_FEEDBACK_CAPS.impactImpulse);explosion=clamp(explosion,0,M01_FEEDBACK_CAPS.explosionImpulse);
    suppression=clamp(suppression,0,M01_FEEDBACK_CAPS.suppressionVisual);
    const direction=dirWeight?clamp(dirSum/dirWeight,-1,1):0;
    const rawShake=.013*hit+.009*near+.006*impact+.018*explosion+.004*suppression;
    const shake=clamp(rawShake*q.camera,0,M01_FEEDBACK_CAPS.cameraOffset);
    const phase=clock*71.3+this.sequence*.37;
    const cameraX=clamp((Math.sin(phase)*.45+direction*.42)*shake,-M01_FEEDBACK_CAPS.cameraOffset,M01_FEEDBACK_CAPS.cameraOffset);
    const cameraY=clamp(Math.sin(phase*1.31+.8)*shake,-M01_FEEDBACK_CAPS.cameraOffset,M01_FEEDBACK_CAPS.cameraOffset);
    const roll=clamp((direction*(.006*hit+.0045*near+.003*impact)+Math.sin(phase*.73)*.0025*suppression)*q.camera,
      -M01_FEEDBACK_CAPS.cameraRoll,M01_FEEDBACK_CAPS.cameraRoll);
    const overlayAlpha=clamp((.28*hit+.13*near+.08*impact+.16*explosion+.075*suppression)*q.overlay,0,M01_FEEDBACK_CAPS.overlayAlpha);
    const exposureFlash=q.flash?clamp((.11*explosion+.035*hit)*q.flash,0,.13):0;
    return {suppressionVisual:suppression,hitImpulse:hit,nearMissImpulse:near,impactImpulse:impact,explosionImpulse:explosion,
      direction,cameraX,cameraY,roll,shakeStrength:shake,overlayAlpha,exposureFlash,activeOverlay:overlayAlpha>.005,activeEvents:active.length};
  }
  diagnostics(clock,quality='medium'){return {...this.sample(clock,quality),lastHitDirection:this.lastHitDirection,lastDirection:this.lastDirection,
    counts:{...this.counts},caps:{...M01_FEEDBACK_CAPS},quality};}
}
