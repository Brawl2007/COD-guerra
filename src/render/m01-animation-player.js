import * as THREE from 'three';

// Applies the resolver's clip stack to one AnimationMixer. Presentation only.
// - One persistent AnimationAction per clip for the lifetime of the actor's mixer (mixer.clipAction caches it).
// - Every action's time and weight are written from sim time each frame and the mixer is advanced by 0 seconds, so no
//   wall-clock or accumulated mixer time exists: the same stack at the same sim time gives the same bone transforms.
// - Actions are activated in stack order and retired last-in first-out, which keeps the mixer's evaluation order a function
//   of the stack (a fresh instance rebuilt mid-fade evaluates exactly like one that lived through the fade).
// - Retiring uses action.stop() on that one action. The mixer-wide stop is never used on the generic path.
export class AnimationPlayer {
  constructor(mixer){
    this.mixer=mixer;this.actions=new Map();this.active=[];this.target=null;
  }
  actionFor(clip){
    let action=this.actions.get(clip.uuid);
    if(!action){action=this.mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);this.actions.set(clip.uuid,action);}
    return action;
  }
  /** @param {Array<{clip:THREE.AnimationClip,time:number,weight:number,target?:boolean}>} layers oldest first */
  apply(layers){
    const next=layers.map(l=>({action:this.actionFor(l.clip),layer:l}));
    let common=0;
    while(common<next.length&&common<this.active.length&&this.active[common]===next[common].action)common++;
    for(let i=this.active.length-1;i>=common;i--)this.active[i].stop();
    this.active.length=common;
    for(let i=common;i<next.length;i++){next[i].action.play();this.active.push(next[i].action);}
    this.target=null;
    for(const {action,layer} of next){
      action.enabled=true;action.paused=false;action.time=layer.time;action.weight=layer.weight;
      if(layer.target)this.target=action;
    }
    this.mixer.update(0);
    return this.target;
  }
  /** Releases every action bound to the root; uncacheRoot deactivates them, so no mixer-wide stop is needed. */
  dispose(){
    this.mixer.uncacheRoot(this.mixer.getRoot());
    this.actions.clear();this.active.length=0;this.target=null;
  }
}
