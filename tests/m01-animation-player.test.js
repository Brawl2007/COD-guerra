import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {AnimationPlayer} from '../src/render/m01-animation-player.js';
import {FADE,genericCandidate} from '../src/render/m01-animation-resolver.js';
import {actorPose} from '../src/render/m01-actor-pose.js';

// A synthetic rig: no GLB, so this stays light. Every clip sets a distinct hips height, a distinct hips roll and a hips x that
// ramps over the clip, which makes weights, clip times and slerp blending observable on real bone transforms.
const SPEC={standing_idle:[4,.9,.0,{}],crouched_idle:[3,.5,.4,{}],aim:[2,.88,.1,{}],fire_bolt:[1.17,.86,.15,{}],pinned:[2.4,.4,.6,{}],
  walk:[1,.85,.2,{speed_mps:1.1}],run:[.68,.8,.3,{speed_mps:3.251}],fallen:[1.4,.15,1.4,{}],wounded:[2,.2,1.2,{}]};
function rig(){
  const root=new THREE.Group();root.name='m01_soldier_pl';root.userData={sockets:{muzzle:[0,.032,-.765]},weapons:{wz29:{muzzle:[0,.032,-.765]}}};
  const bone=new THREE.Bone();bone.name='root';root.add(bone);
  const hips=new THREE.Bone();hips.name='hips';bone.add(hips);
  for(const name of ['weapon','carry_socket','foot_l','foot_r']){const b=new THREE.Bone();b.name=name;hips.add(b);}
  return root;
}
function clipFor(name,[duration,height,roll,extras]){
  const q=axis=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),axis);
  const a=q(roll),b=q(roll+.3);
  const clip=new THREE.AnimationClip(name,duration,[
    new THREE.VectorKeyframeTrack('hips.position',[0,duration],[0,height,0,1,height,0]),
    new THREE.QuaternionKeyframeTrack('hips.quaternion',[0,duration],[a.x,a.y,a.z,a.w,b.x,b.y,b.z,b.w])]);
  clip.userData=extras;return clip;
}
function characters(){
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false});
  for(const lod of [1,2])c.sources.set(`pl:${lod}`,{scene:rig(),animations:[]});
  for(const [name,spec] of Object.entries(SPEC))c.clips.set(name,clipFor(name,spec));
  return c;
}
const actor=(extra={})=>({id:'sample',active:true,alive:true,team:'ally',role:'RIFLEMAN',state:'GUARD',x:4,y:0,z:0,facing:0,shot:0,crouched:false,
  posture:'stand',postureSince:1,motion:{speed:0,odometer:0,gait:'idle',gaitSince:1},...extra});
const near=(x,y=0)=>({x:x,z:y});
const hips=(c,id='sample')=>c.instances.get(id).root.getObjectByName('hips');
const matrices=(c,id='sample')=>{const out=[];c.instances.get(id).root.traverse(n=>out.push(...n.matrixWorld.elements));return out;};
const close=(a,b,e=1e-9)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=e);
const stats=(c,id='sample')=>c.stats.actors.find(a=>a.id===id);
const sum=blend=>blend.reduce((s,b)=>s+b.weight,0);
/** Run `fn` while any mixer-wide stop throws: the generic path must never need it. */
function forbidStopAll(fn){
  const original=THREE.AnimationMixer.prototype.stopAllAction;let calls=0;
  THREE.AnimationMixer.prototype.stopAllAction=function(){calls++;throw new Error('stopAllAction on the generic path');};
  try{fn();}finally{THREE.AnimationMixer.prototype.stopAllAction=original;}
  return calls;
}

test('stand to crouch blends skeleton transforms over 0.3 s of sim time instead of cutting between poses',()=>{
  const c=characters(),a=actor();let previous=null,worst=0;const heights=[];
  try{
    forbidStopAll(()=>{
      for(let i=0;i<=90;i++){
        const t=20+i/60;
        if(t>=21-1e-9&&!a.crouched){a.crouched=true;a.posture='crouch';a.postureSince=21;}
        c.update([a],t,near(0));const y=hips(c).position.y;heights.push(y);
        if(previous!==null)worst=Math.max(worst,Math.abs(y-previous));previous=y;
        assert.ok(Math.abs(sum(stats(c).blend)-1)<1e-9);
      }
    });
    // Standing hips 0.9, crouched 0.5: a hard cut moves 0.4 in one frame; smoothstep over 0.3 s peaks at 1.5*0.4/(0.3*60).
    assert.ok(worst<=1.5*.4/(FADE.posture*60)+1e-6,`largest per-frame hips step ${worst}`);
    assert.ok(Math.abs(heights[0]-.9)<1e-6&&Math.abs(heights.at(-1)-.5)<1e-6,'float32 keyframes');
    const v=c.instances.get('sample');assert.equal(v.clip,'crouched_idle');assert.equal(v.player.active.length,1,'finished fade retires the old action');
    assert.ok(heights.some(y=>y>.55&&y<.85),'passes through intermediate poses');
  }finally{c.dispose();}
});

test('actions are persistent: the same AnimationAction objects serve every transition and none is recreated',()=>{
  const c=characters(),a=actor();
  try{
    const seen=new Map();
    forbidStopAll(()=>{
      for(let i=0;i<=300;i++){
        const t=30+i/60,phase=Math.floor(i/60);
        a.crouched=phase%2===1;a.posture=a.crouched?'crouch':'stand';a.postureSince=30+phase;
        c.update([a],t,near(0));
        const v=c.instances.get('sample');
        for(const [uuid,action] of v.player.actions){if(seen.has(uuid))assert.equal(seen.get(uuid),action);seen.set(uuid,action);}
        assert.ok(v.player.active.length<=2);
      }
    });
    assert.equal(seen.size,2,'only standing_idle and crouched_idle were ever needed');
    assert.equal(new Set(c.instances.get('sample').mixer._actions.map(x=>x.getClip().name)).size,2);
  }finally{c.dispose();}
});

test('death plays the fall over sim time from diedAt, fading out of the live pose; without diedAt it keys on first sight',()=>{
  for(const withStamp of [true,false]){
    const c=characters(),a=actor();
    try{
      forbidStopAll(()=>{
        const trace=[];
        for(let i=0;i<=150;i++){
          const t=40+i/60;
          if(t>=41-1e-9&&a.alive){a.alive=false;if(withStamp){a.diedAt=41;a.deathYaw=0;}}
          c.update([a],t,near(0));const v=c.instances.get('sample'),s=stats(c);
          trace.push({t,clip:v.clip,time:v.action.time,y:hips(c).position.y,blend:s.blend});
          assert.ok(Math.abs(sum(s.blend)-1)<1e-9);
        }
        assert.equal(trace[0].clip,'standing_idle');
        const after=trace.filter(f=>f.t>=41-1e-9);
        assert.ok(after.every(f=>f.clip==='fallen'));
        for(const f of after)assert.ok(Math.abs(f.time-Math.min(1.4,f.t-41))<1e-6,`fall time ${f.time} at ${f.t}`);
        let worst=0;for(let i=1;i<trace.length;i++)worst=Math.max(worst,Math.abs(trace[i].y-trace[i-1].y));
        assert.ok(worst<=1.5*.75/(FADE.death*60)+1e-6,`hips never snap (peak step ${worst}); a hard cut moves .75 m in one frame`);
        assert.ok(Math.abs(trace.at(-1).y-.15)<1e-6&&trace.at(-1).time===1.4,'ends on the final frame of fallen');
        assert.equal(trace.at(-1).blend.length,1);
      });
    }finally{c.dispose();}
  }
  // A body the renderer never saw alive is the final pose at full weight immediately (legacy losses, restores).
  const c=characters();
  try{
    c.update([actor({alive:false})],60,near(0));const s=stats(c);
    assert.equal(c.instances.get('sample').clip,'fallen');assert.equal(c.instances.get('sample').action.time,1.4);assert.deepEqual(s.blend.map(b=>b.weight),[1]);
  }finally{c.dispose();}
});

test('pause freezes the pose: repeating the same sim time never changes a bone, a weight or the blend record',()=>{
  const c=characters(),a=actor({crouched:true,posture:'crouch',postureSince:50});
  try{
    forbidStopAll(()=>{
      c.update([actor()],49.99,near(0)); // standing just before the crouch
      for(const t of [50.1,50.16]){
        c.update([a],t,near(0));
        const frozen=matrices(c),blend=structuredClone(stats(c).blend),record=structuredClone(c.anim.get('sample'));
        for(let i=0;i<40;i++){
          c.update([a],t,near(0));
          assert.deepEqual(matrices(c),frozen,`bones at ${t}, repeat ${i}`);assert.deepEqual(stats(c).blend,blend);assert.deepEqual(c.anim.get('sample'),record);
        }
        assert.ok(blend.length===2,'caught mid-fade');
      }
    });
  }finally{c.dispose();}
});

test('LOD swap in the middle of a fade keeps the blend and gives identical bone matrices',()=>{
  const c=characters(),a=actor();
  try{
    forbidStopAll(()=>{
      for(let i=0;i<=12;i++){
        const t=80+i/60;
        if(t>=80.1-1e-9){a.crouched=true;a.posture='crouch';a.postureSince=80.1;}
        c.update([a],t,near(0));
      }
      const t=80+12/60,blendBefore=structuredClone(stats(c).blend);
      assert.equal(blendBefore.length,2,'inside the fade');
      const before=matrices(c),oldInstance=c.instances.get('sample');
      c.update([a],t,near(40)); // far: LOD 2
      const swapped=c.instances.get('sample');
      assert.notEqual(swapped,oldInstance);assert.equal(swapped.key,'pl:2');
      assert.deepEqual(stats(c).blend,blendBefore,'the cross-fade survives the swap');
      assert.deepEqual(matrices(c),before,'bit-identical bones after the LOD swap');
      c.update([a],t,near(0)); // and back to LOD 1
      assert.equal(c.instances.get('sample').key,'pl:1');assert.deepEqual(matrices(c),before);
      // The fade then completes on the new instance exactly as it would have.
      c.update([a],80.5,near(0));assert.equal(stats(c).blend.length,1);assert.equal(c.instances.get('sample').clip,'crouched_idle');
    });
  }finally{c.dispose();}
});

test('a reloaded renderer rebuilds posture, death and steady frames to the same bone matrices from sim data alone',()=>{
  const live=characters(),a=actor();
  try{
    const frames=[];
    for(let i=0;i<=40;i++){
      const t=90+i/60;
      if(t>=90.1-1e-9){a.crouched=true;a.posture='crouch';a.postureSince=90.1;}
      live.update([a],t,near(0));frames.push({t,actor:structuredClone(a),bones:matrices(live),blend:structuredClone(stats(live).blend)});
    }
    for(const f of frames){
      const reloaded=characters();
      try{
        reloaded.update([structuredClone(f.actor)],f.t,near(0));
        assert.ok(close(matrices(reloaded),f.bones,1e-9),`posture frame at ${f.t}`);
        for(let k=0;k<f.blend.length;k++){assert.equal(stats(reloaded).blend[k].clip,f.blend[k].clip);assert.ok(Math.abs(stats(reloaded).blend[k].weight-f.blend[k].weight)<1e-9);}
      }finally{reloaded.dispose();}
    }
    const steady=frames.at(-1);assert.equal(steady.blend.length,1);
  }finally{live.dispose();}
  const d=characters(),dead=actor();
  try{
    const frames=[];
    for(let i=0;i<=60;i++){
      const t=100+i/60;
      if(t>=100.2-1e-9&&dead.alive){dead.alive=false;dead.diedAt=100.2;dead.deathYaw=0;}
      d.update([dead],t,near(0));frames.push({t,actor:structuredClone(dead),bones:matrices(d)});
    }
    for(const f of frames.filter((_,i)=>i%3===0)){
      const reloaded=characters();
      try{reloaded.update([structuredClone(f.actor)],f.t,near(0));assert.ok(close(matrices(reloaded),f.bones,1e-9),`death frame at ${f.t}`);}
      finally{reloaded.dispose();}
    }
  }finally{d.dispose();}
});

test('locomotion phase follows the saved odometer: the clip advances only as far as the body does',()=>{
  const c=characters(),a=actor({state:'ADVANCE',group:'grp_east_platoon'});
  try{
    forbidStopAll(()=>{
      let odo=0,previous=null;const errors=[];
      const speeds=[[3.6,2],[0,1],[1.4,1],[0,.5]];let t=110;
      for(const [speed,seconds] of speeds){
        for(let i=0;i<seconds*60;i++){
          t+=1/60;odo+=speed/60;
          const gait=speed===0?'idle':speed<=2.2?'walk':'run';
          if(a.motion.gait!==gait)a.motion={...a.motion,gait,gaitSince:t};
          a.motion={...a.motion,speed,odometer:odo};a.state=speed===0?'GUARD':'ADVANCE';
          c.update([a],t,near(0));
          const s=stats(c),own=s.blend.find(b=>b.clip===s.clip),info=SPEC[own.clip];
          if(previous&&previous.clip===own.clip&&speed>0&&info[3].speed_mps){
            let cycles=(own.time-previous.time)/info[0];cycles-=Math.round(cycles);
            errors.push(Math.abs(cycles*info[3].speed_mps*info[0]*60-speed));
          }
          previous={clip:own.clip,time:own.time};
        }
      }
      assert.ok(errors.length>150);
      const mean=errors.reduce((x,y)=>x+y,0)/errors.length;
      assert.ok(mean<=.10,`mean foot drift ${mean} m/s`);
    });
    // Standing still: the phase stops, so a paused/idle actor's feet do not run on the spot.
    assert.equal(c.instances.get('sample').clip,'standing_idle');
  }finally{c.dispose();}
});

test('instances leaving range and the whole renderer disposing never use a mixer-wide stop; stale records expire',()=>{
  const c=characters(),a=actor();
  const calls=forbidStopAll(()=>{
    c.update([a],5,near(0));assert.ok(c.anim.has('sample'));
    c.update([a],5.5,near(500)); // out of range: instance released, record kept briefly
    assert.equal(c.instances.size,0);assert.ok(c.anim.has('sample'));
    c.update([],7,near(0)); // longer than the gap: the record is dropped
    assert.equal(c.anim.size,0);
    c.update([a],7.1,near(0));c.dispose();
  });
  assert.equal(calls,0);assert.equal(c.anim.size,0);
});

test('AnimationPlayer keeps evaluation order identical to the stack order and writes time/weight without touching mixer time',()=>{
  const root=rig(),mixer=new THREE.AnimationMixer(root),player=new AnimationPlayer(mixer);
  const A=clipFor('a',SPEC.standing_idle),B=clipFor('b',SPEC.crouched_idle),C=clipFor('c',SPEC.aim);
  player.apply([{clip:A,time:1,weight:1,target:true}]);
  player.apply([{clip:A,time:1.1,weight:.75},{clip:B,time:.5,weight:.25,target:true}]);
  assert.deepEqual(mixer._actions.slice(0,mixer._nActiveActions).map(x=>x.getClip().name),['a','b']);
  player.apply([{clip:B,time:.6,weight:.6},{clip:C,time:.2,weight:.4,target:true}]);
  assert.deepEqual(mixer._actions.slice(0,mixer._nActiveActions).map(x=>x.getClip().name),['b','c'],'retired first, rebuilt in stack order');
  assert.equal(mixer.time,0,'mixer time never advances');
  const hip=root.getObjectByName('hips');
  assert.ok(Math.abs(hip.position.y-(.5*.6+.88*.4))<1e-6);
  // Same stack, same numbers -> same bones, however many times it is applied.
  const first=hip.quaternion.toArray();for(let i=0;i<5;i++)player.apply([{clip:B,time:.6,weight:.6},{clip:C,time:.2,weight:.4,target:true}]);
  assert.deepEqual(hip.quaternion.toArray(),first);
  assert.equal(player.target.getClip().name,'c');
  player.dispose();assert.equal(player.active.length,0);
});

test('the resolver generic selection mirrors the untouched M01Characters.sample() tail for ordinary soldiers',()=>{
  // sample() stays byte-identical to the approved base (tests/m01-soldier-visual-variation.test.js), so the pure mirror is held to it here.
  const c=characters();
  try{
    const t=200,offset=c.sample(actor(),t,[actor()],actorPose(actor(),t),0).time-t;
    const scenarios=[actor(),actor({crouched:true}),actor({state:'ADVANCE'}),actor({state:'ADVANCE',group:'grp_east_platoon'}),actor({state:'RETREAT'}),
      actor({state:'SUPPRESS',shot:.1,firedAt:t-.5}),actor({state:'SUPPRESS',shot:0,firedAt:t-2}),actor({state:'GUARD',role:'SUPPORT'}),actor({suppressedUntil:t+3,team:'ally'}),
      actor({state:'ADVANCE',suppressedUntil:t+3,team:'ally'}),actor({crouched:true,state:'SUPPRESS',shot:.1,firedAt:t-.2})];
    const seen=new Set();
    for(const a of scenarios){
      const pose=actorPose(a,t);if(pose.name==='pinned')continue;
      const s=c.sample(a,t,[a],pose,0),g=genericCandidate(a,pose,t,0,c.clipView);seen.add(g.clip);
      assert.equal(g.clip,s.clip,JSON.stringify(a));assert.equal(g.loop,s.loop);
      assert.ok(Math.abs(s.time-g.time-(g.loop?offset:0))<1e-12,`${g.clip} time`);
    }
    for(const clip of ['standing_idle','crouched_idle','aim','fire_bolt','walk','run'])assert.ok(seen.has(clip),`scenario coverage: ${clip}`);
  }finally{c.dispose();}
});
