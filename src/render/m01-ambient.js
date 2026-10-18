import ambience from '../../missions/m01-tczew/battlefield-ambience.json' with {type:'json'};
// T21 adapted from Gemini's uploaded proof-of-concept. Presentation-only; no simulation writes.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=s=>[...String(s??'')].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
export function seededVisualRandom(seed,step=0){
 let x=((seed>>>0)+Math.imul(step+1,0x9e3779b1))>>>0;
 x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
 return (x>>>0)/4294967296;
}
export function resolveSquadLivingMotion(actor,clock=0,blasts=[]){
 const h=hash(actor?.id),phaseOffset=(h%1000)/1000,cadenceScale=.92+(h%17)*.01;
 let blastFlinch=0,blastDirectionYaw=0;
 if(actor?.alive)for(const b of blasts){
   const age=clock-(b.started??b.start??-100),radius=b.demolition?160:75;
   if(age<0||age>1.4)continue;
   const dx=(actor.x??0)-(b.x??0),dz=(actor.z??0)-(b.z??0),dist=Math.hypot(dx,dz);
   const power=dist<radius?(1-dist/radius)*Math.sin((1-age/1.4)*Math.PI/2):0;
   if(power>blastFlinch){blastFlinch=power;blastDirectionYaw=Math.atan2(dz,dx);}
 }
 return {cadenceScale,phaseOffset,swayYaw:Math.sin(clock*1.7+phaseOffset*6.283185)*.035,
 blastFlinch:clamp(blastFlinch,0,1),blastDirectionYaw,shockedCrouch:blastFlinch>.35};
}
const FLASH=ambience.flash,SLOT=ambience.slotSeconds;
/** Own seeded stream (hash of seed+step): never touches sim.rng and keeps no mutable generator state, so a restore replays the same flashes. */
export class M01AmbientDirector{
 constructor(seed=ambience.seed){this.seed=seed;this.lastState=null;this.flashes=0;this.lastFlashSlot=-1;this.readoutAt=-Infinity;this.readout=null;}
 sampleHorizonFlash(clock=0,battleClock=16200,quality='medium',boost=0){
  if(quality==='low')return {active:false,intensity:0};
  const slot=Math.floor(Math.max(0,clock)/SLOT),a=seededVisualRandom(this.seed,slot*3),
   b=seededVisualRandom(this.seed,slot*3+1),c=seededVisualRandom(this.seed,slot*3+2);
  const [d0,d1]=FLASH.durationSeconds,duration=d0+b*(d1-d0),age=clock-slot*SLOT-a*FLASH.startSpreadSeconds;
  if(age<0||age>=duration)return {active:false,intensity:0};
  const [m0,m1]=FLASH.distanceMeters;
  return {active:true,slot,intensity:Math.min(1,Math.sin(age/duration*Math.PI)*clamp(1-(battleClock-16200)/9300*.55,.35,1)*(1+boost)),
    azimuthDeg:FLASH.northAzimuthDeg+(c*2-1)*FLASH.halfSpreadDeg,distance:m0+b*(m1-m0),color:FLASH.color};
 }
 /** Reads T22's battleReadout (never writes it), throttled; returns the brightness boost 0..boostMax from the strongest sector intensity. */
 readBoost(sim){
  if(sim.clock-this.readoutAt<ambience.readout.refreshSeconds&&sim.clock>=this.readoutAt)return this.readout?.boost??0;
  this.readoutAt=sim.clock;
  try{const r=sim.battleReadout,peak=Math.max(0,...Object.values(r?.sectors??{}).map(s=>s.intensity??0));
   this.readout={peak,recentBlasts:r?.recentBlasts?.length??0,boost:peak*ambience.readout.boostMax};}
  catch{this.readout={peak:0,recentBlasts:0,boost:0};}
  return this.readout.boost;
 }
 sample(sim,quality='medium'){
  const clock=sim.clock,battleClock=sim.battleClock,player=sim.player;
  const sector=player.x<-40?'west_embankment':player.x<=420?'bridge_spans':'station_yard';
  const bedPhase=battleClock<17100?'bed_pre_dawn_tension':battleClock<19800?'bed_opening_bombardment':
    battleClock<22200?'bed_0530_raid_and_assault':'bed_bridge_demolition_withdrawal';
  const horizonFlash=this.sampleHorizonFlash(clock,battleClock,quality,this.readBoost(sim));
  if(horizonFlash.active&&horizonFlash.slot!==this.lastFlashSlot){this.lastFlashSlot=horizonFlash.slot;this.flashes++;}
  this.lastState={clock,battleClock,sector,bedPhase,quality,horizonFlash,flashes:this.flashes,readout:this.readout};
  return this.lastState;
 }
 get diagnostics(){return this.lastState?structuredClone(this.lastState):null;}
}
