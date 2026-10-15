import {train963Kinematics} from '../render/m01-locomotive.js';
import {panzerzugKinematics} from '../render/m01-panzerzug.js';

export const SOUND_SPEED_MS=343.0;

export function computeAcousticDelay(sourceX,sourceZ,player={x:-320,z:20}){
  const distanceM=Math.hypot(sourceX-(player?.x??-320),sourceZ-(player?.z??20));
  return {
    distanceM:+distanceM.toFixed(2),
    delaySec:+(distanceM/SOUND_SPEED_MS).toFixed(4),
    attenuation:+Math.max(0.06,Math.min(1.0,950.0/(distanceM+180.0))).toFixed(4),
  };
}

export class M01TrainAudioController {
  constructor({audio=null}={}){
    this.audio=audio;
    this.queue=[];
    this.dispatched=[];
    this.firedOneShots=new Set();
    this.lastChuffClock=-Infinity;
    this.lastClatterClock=-Infinity;
    this.lastPzChuffClock=-Infinity;
  }

  scheduleCue(eventId,battleClock,sourceX,sourceZ,player,extra={}){
    const {distanceM,delaySec,attenuation}=computeAcousticDelay(sourceX,sourceZ,player);
    const cue={
      id:eventId,
      emittedAt:battleClock,
      audibleAt:+(battleClock+delaySec).toFixed(4),
      delaySec,
      distanceM,
      gain:+(attenuation*(extra.gainScale??1.0)).toFixed(4),
      position:[sourceX,1.6,sourceZ],
      ...extra,
    };
    this.queue.push(cue);
    return cue;
  }

  update(battleClock,player={x:-320,z:20},flags={}){
    const kin963=train963Kinematics(battleClock,Boolean(flags.train963));
    const kinPz=panzerzugKinematics(battleClock,Boolean(flags.panzerzug));

    // Train 963 one-shot & cadence cues
    if(kin963.arriving&&!this.firedOneShots.has('veh.train.approach')){
      this.firedOneShots.add('veh.train.approach');
      this.scheduleCue('veh.train.approach',battleClock,kin963.x,kin963.z,player,{train:'train963',gainScale:0.85});
    }
    if(kin963.whistleActive&&!this.firedOneShots.has(`veh.train.whistle@${Math.floor(battleClock/20)}`)){
      this.firedOneShots.add(`veh.train.whistle@${Math.floor(battleClock/20)}`);
      this.scheduleCue('veh.train.whistle',battleClock,kin963.x,kin963.z,player,{train:'train963',gainScale:0.95});
    }
    if(kin963.arriving&&kin963.speed>0.25){
      const chuffPeriod=Math.max(0.24,1.0/Math.max(0.8,kin963.chuffRateHz));
      if(battleClock-this.lastChuffClock>=chuffPeriod){
        this.lastChuffClock=battleClock;
        this.scheduleCue('veh.train.chuff',battleClock,kin963.x,kin963.z,player,{train:'train963',speed:kin963.speed,gainScale:0.72});
      }
      const clatterPeriod=Math.max(0.38,12.0/Math.max(1.2,kin963.speed*4.0));
      if(battleClock-this.lastClatterClock>=clatterPeriod){
        this.lastClatterClock=battleClock;
        this.scheduleCue('veh.train.clatter',battleClock,kin963.x+24,kin963.z,player,{train:'train963',speed:kin963.speed,gainScale:0.64});
      }
    }
    if(kin963.brakeIntensity>0.25&&!this.firedOneShots.has('veh.train.brake_squeal')){
      this.firedOneShots.add('veh.train.brake_squeal');
      this.scheduleCue('veh.train.brake_squeal',battleClock,kin963.x,kin963.z,player,{train:'train963',brakeIntensity:kin963.brakeIntensity,gainScale:0.88});
    }
    if(kin963.stopped&&battleClock>=17100&&!this.firedOneShots.has('veh.train.steam_blowdown')){
      this.firedOneShots.add('veh.train.steam_blowdown');
      this.scheduleCue('veh.train.steam_blowdown',battleClock,kin963.x,kin963.z,player,{train:'train963',gainScale:0.90});
    }

    // Panzerzug 7 cues (04:51:00 -> 04:52:00)
    if(kinPz.arriving&&!this.firedOneShots.has('veh.train.panzerzug_arrive')){
      this.firedOneShots.add('veh.train.panzerzug_arrive');
      this.scheduleCue('veh.train.panzerzug_arrive',battleClock,kinPz.x,kinPz.z,player,{train:'panzerzug',gainScale:0.88});
    }
    if(kinPz.hornActive&&!this.firedOneShots.has(`veh.train.panzerzug_horn@${Math.floor(battleClock/15)}`)){
      this.firedOneShots.add(`veh.train.panzerzug_horn@${Math.floor(battleClock/15)}`);
      this.scheduleCue('veh.train.panzerzug_horn',battleClock,kinPz.x,kinPz.z,player,{train:'panzerzug',gainScale:0.92});
    }
    if(kinPz.arriving&&kinPz.speed>0.3&&battleClock-this.lastPzChuffClock>=0.45){
      this.lastPzChuffClock=battleClock;
      this.scheduleCue('veh.train.chuff',battleClock,kinPz.x+38,kinPz.z,player,{train:'panzerzug',speed:kinPz.speed,gainScale:0.68});
    }
    if(kinPz.stopped&&battleClock>=17520&&!this.firedOneShots.has('veh.train.panzerzug_stopped')){
      this.firedOneShots.add('veh.train.panzerzug_stopped');
      this.scheduleCue('veh.train.brake_squeal',battleClock,kinPz.x,kinPz.z,player,{train:'panzerzug',gainScale:0.82});
    }

    // Dispatch cues whose acoustic propagation delay has elapsed
    for(let i=this.queue.length-1;i>=0;i--){
      const cue=this.queue[i];
      if(battleClock>=cue.audibleAt){
        this.queue.splice(i,1);
        this.dispatched.push(cue);
        if(this.audio&&typeof this.audio.emit==='function'){
          try{this.audio.emit(cue.id,cue);}catch{}
        }
      }
    }
    if(this.dispatched.length>64){
      this.dispatched.splice(0,this.dispatched.length-64);
    }
  }

  get diagnostics(){
    return {
      queued:this.queue.length,
      dispatchedCount:this.dispatched.length,
      lastDispatched:this.dispatched.at(-1)??null,
    };
  }
}
