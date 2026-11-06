import {M01AudioDirector} from '../game/audio-director-m01.js';
import {m02AudioLayout} from './m02-audio-layout.js';

// Reuse only the M01 distance/stride samplers. M02 never impersonates an M01
// simulation or activates its mission emitters, trains or music conductor.
export class M02Footsteps {
 constructor(audio){
  this.audio=audio;this.core=audio.core??null;this.audioWorld=null;this.step={ready:false,x:0,z:0,dist:0,count:0,side:1};
  this.npcSteps=new Map();this.clk=new Float64Array([NaN]);this.npcStats={played:0,capped:0};this.spatialOut={pan:0,distance:0,front:1};
  this.sample={player:{},actors:[],clock:0};
 }
 _spatial(x,z,player){
  const result=M01AudioDirector.prototype._spatial.call(this,x,z,player),world=this.audioWorld;
  if(world?.lineOfSight){
   const source={x,y:world.heightAt?.(x,z)??0,z,space:'metres',eyeHeight:.2};
   this.audio.setOcclusion?.(world.lineOfSight(player,source,{includeFoliage:false})?null:{hz:1200,gain:.4});
  }
  return result;
 }
 reset(){this.step.ready=false;this.step.dist=0;this.npcSteps.clear();this.clk[0]=NaN;}
 update(player,actors,clock,world=null){
  if(world&&world!==this.audioWorld){this.audio.setLayout?.(m02AudioLayout(world));this.audioWorld=world;}
  this.audio.setListener?.(player.x,player.y??0,player.z);
  Object.assign(this.sample.player,player,{carrying:player.carryingVolumeId??player.carrying});this.sample.actors=actors;this.sample.clock=clock;
  this.audio.setOcclusion?.(null);
  try{
   M01AudioDirector.prototype._footsteps.call(this,this.sample);
   M01AudioDirector.prototype._npcFootsteps.call(this,this.sample);
  }finally{this.audio.setOcclusion?.(null);}
 }
 get diagnostics(){return {playerSteps:this.step.count,npcSteps:this.npcStats.played,capped:this.npcStats.capped};}
}
