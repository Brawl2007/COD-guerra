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
export class M01AmbientDirector{
 constructor(seed=19390901){this.seed=seed;this.lastState=null;}
 sampleHorizonFlash(clock=0,battleClock=16200,quality='medium'){
  if(quality==='low')return {active:false,intensity:0};
  const slot=Math.floor(Math.max(0,clock)/4.5),a=seededVisualRandom(this.seed,slot*3),
   b=seededVisualRandom(this.seed,slot*3+1),c=seededVisualRandom(this.seed,slot*3+2);
  const duration=.2+b*.26,age=clock-slot*4.5-a*3.2;
  if(age<0||age>=duration)return {active:false,intensity:0};
  return {active:true,intensity:Math.sin(age/duration*Math.PI)*clamp(1-(battleClock-16200)/9300*.55,.35,1),
    azimuthDeg:-25+c*63,distance:1400+b*1800,color:'#ff9e52'};
 }
 sample(sim,quality='medium'){
  const clock=sim.clock,battleClock=sim.battleClock,player=sim.player;
  const sector=player.x<-40?'west_embankment':player.x<=420?'bridge_spans':'station_yard';
  const bedPhase=battleClock<17100?'bed_pre_dawn_tension':battleClock<19800?'bed_opening_bombardment':
    battleClock<22200?'bed_0530_raid_and_assault':'bed_bridge_demolition_withdrawal';
  this.lastState={clock,battleClock,sector,bedPhase,quality,horizonFlash:this.sampleHorizonFlash(clock,battleClock,quality)};
  return this.lastState;
 }
 get diagnostics(){return this.lastState?structuredClone(this.lastState):null;}
}
