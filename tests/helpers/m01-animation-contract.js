import {createHash} from 'node:crypto';
import {PRESENTATION_FIELDS} from '../../src/game/m01-animation-presentation.js';

// Remove only the new actor keys. All legacy gameplay keys/numbers and transient events remain exact.
export function gameplaySnapshot(raw){
  const s=JSON.parse(JSON.stringify(raw));
  for(const a of s.actors)for(const k of PRESENTATION_FIELDS)delete a[k];
  if(s.resumeCheckpoint)s.resumeCheckpoint=gameplaySnapshot(s.resumeCheckpoint);
  return s;
}
export function gameplayFrame(sim,events=[]){
  return {state:gameplaySnapshot(sim.snapshot(false)),checkpoint:gameplaySnapshot(sim.checkpoint),events};
}
export class GameplayDigest {
  constructor(){this.ticks=0;this.blocks=[];this.hash=createHash('sha256');}
  add(frame){
    this.hash.update(JSON.stringify(frame)+'\n');this.ticks++;
    if(this.ticks%512===0)this.flush();
  }
  flush(){this.blocks.push({tick:this.ticks,sha256:this.hash.digest('hex')});this.hash=createHash('sha256');}
  finish(){if(this.ticks%512)this.flush();return {ticks:this.ticks,blocks:this.blocks};}
}
