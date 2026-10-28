import {validateM02Snapshot} from '../game/m02-01-simulation.js';
export const M02_SAVE_KEY='cod-guerra:checkpoint:m02:v1';

// Browser lifecycle owns pause/storage/UI. No wall-clock state is introduced
// into the deterministic mission or its snapshots.
export class M02Session {
 constructor(sim,renderer,storage=globalThis.localStorage){this.sim=sim;this.renderer=renderer;this.storage=storage;this.state='menu';this.lastCheckpoint=null;this.message='';}
 get playing(){return this.state==='playing';}
 get saveAvailable(){try{return Boolean(this.storage.getItem(M02_SAVE_KEY));}catch{return false;}}
 start(){const options={...this.sim.audiovisual.accessibility};this.sim.checkpoints.clear();this.sim.reset('C01');this.sim.setAccessibilityOptions(options);const initial=this.sim.checkpoints.get('cp_m02_a_preparacao');if(initial)initial.audiovisual=this.sim.audiovisual.snapshot();this.lastCheckpoint=null;this.state='playing';this.renderer.presentation.unlockAudio();this.save();}
 pause(){if(this.playing){this.state='paused';this.renderer.presentation.audio.suspend();}}
 resume(){if(this.state==='paused'){this.state='playing';this.renderer.presentation.unlockAudio();}}
 save(){
  let latest=null;
  for(const [id,snapshot] of this.sim.checkpoints)if(snapshot.clock<=this.sim.clock&&(!latest||snapshot.clock>=latest.snapshot.clock))latest={id,snapshot};
  if(!latest)return;
  try{this.storage.setItem(M02_SAVE_KEY,JSON.stringify({version:1,id:latest.id,snapshot:latest.snapshot}));this.lastCheckpoint=latest.snapshot;this.message='Checkpoint guardado';}catch{this.message='Não foi possível guardar neste navegador.';}
 }
 continue(){
  try{
   const value=JSON.parse(this.storage.getItem(M02_SAVE_KEY));
   if(value?.version!==1||typeof value.id!=='string'||!validateM02Snapshot(value.snapshot).valid)throw Error('O checkpoint guardado não é válido.');
   this.sim.restoreSnapshot(value.snapshot);this.sim.checkpoints.clear();this.sim.checkpoints.set(value.id,value.snapshot);
   this.lastCheckpoint=value.snapshot;this.state='playing';this.renderer.presentation.unlockAudio();this.message='';return true;
  }catch(error){this.message=error.message;return false;}
 }
 restart(){
  let best=null;
  for(const [id,snapshot]of this.sim.checkpoints)if(snapshot.clock<=this.sim.clock&&(!best||snapshot.clock>=best.snapshot.clock))best={id,snapshot};
  if(!best)return this.start();
  this.sim.restoreSnapshot(best.snapshot);this.state='playing';this.renderer.presentation.unlockAudio();
 }
 nextEpilogue(){this.epilogueIndex++;if(this.epilogueIndex>=3)this.state='debrief';}
 afterFrame(){
  if(!this.playing)return;
  if(this.sim.player.health<=0){this.state='dead';this.renderer.presentation.audio.suspend();return;}
  if(this.sim.areaC?.c12Completed){this.state='epilogue';this.epilogueIndex=0;this.sim.saveCheckpoint('cp_m02_completed');this.save();return;}
  for(const snapshot of this.sim.checkpoints.values())if(snapshot!==this.lastCheckpoint&&snapshot.clock<=this.sim.clock&&(!this.lastCheckpoint||snapshot.clock>=this.lastCheckpoint.clock)){this.save();break;}
 }
}
