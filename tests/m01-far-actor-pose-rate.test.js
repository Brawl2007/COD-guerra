import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {ACTOR_POSE_QUANTA,ACTOR_POSE_NEAR_M,actorPoseQuantum,actorPoseDue} from '../src/render/m01-lod-policy.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';

const assets=await nodeCharacterAssets();
const proto=new M01Simulation().actors;
const rifleman=(team,id,x)=>({...proto.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN'),id,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0});
function characters(){const c=new M01Characters(new THREE.Scene(),{visualVariation:true});c.sources=new Map(assets.sources);c.clips=assets.clips;return c;}
const player={x:0,z:0};
const bones=v=>{const out=[];v.root.traverse(n=>{if(n.isBone)out.push(...n.matrixWorld.elements);});return out;};

test('actorPoseQuantum / actorPoseDue: pure policy — every frame inside 120 m, 2nd..4th frame beyond, absolute-time buckets',()=>{
  assert.equal(ACTOR_POSE_NEAR_M,120);
  for(const d of [0,14,45,119.9])assert.equal(actorPoseQuantum(d),0);
  assert.deepEqual([120,150,199,200,250,279,280,350].map(actorPoseQuantum),[.034,.034,.034,.05,.05,.05,.067,.067]);
  assert.deepEqual(ACTOR_POSE_QUANTA.map(q=>q.from),[120,200,280]);
  // at 60 fps the quanta are every 2nd, 3rd and 4th frame
  for(const [q,frames] of [[.034,2],[.05,3],[.067,4]]){
    let applied=0,last=-Infinity;for(let f=0;f<240;f++){const t=f/60;if(actorPoseDue(t,last,q,0)){applied++;last=t;}}
    assert.ok(Math.abs(240/applied-frames)<.15,`quantum ${q}: every ${240/applied} frames`);
  }
  // never posed / clock went backwards (restore) / no quantum: always due; same time: never due
  assert.equal(actorPoseDue(5,-Infinity,.05),true);assert.equal(actorPoseDue(4,5,.05),true);assert.equal(actorPoseDue(5,4.99,0),true);assert.equal(actorPoseDue(5,5,.05,.01),false);
  // the decision is a pure function of its inputs (repeated calls at the same time agree)
  assert.equal(actorPoseDue(5.02,5,.05,.03),actorPoseDue(5.02,5,.05,.03));
});

test('far actors re-pose every 2nd..4th frame, staggered, and the applied pose is exactly the pose of an unthrottled update at that sim time',()=>{
  const staggered=characters(),reference=characters();reference.poseHeld=()=>false;   // reference: every actor posed every frame
  try{
    const ids=['far_a','far_b','far_c','far_d','far_e','far_f'],mk=()=>ids.map((id,i)=>rifleman(i%2?'enemy':'ally',id,[150,170,230,260,300,330][i]*(i%2?-1:1)));
    const frames=180,dt=1/60,appliedAt=Object.fromEntries(ids.map(id=>[id,[]]));
    let held=0,checked=0;
    for(let f=0;f<frames;f++){
      const t=20+f*dt,a=mk(),b=mk();
      const before=Object.fromEntries(ids.map(id=>[id,staggered.instances.get(id)?.appliedTime]));
      staggered.update(a,t,player,'high');reference.update(b,t,player,'high');
      for(const id of ids){
        const v=staggered.instances.get(id),r=reference.instances.get(id);assert.ok(v&&r,`${id} drawn`);
        if(v.appliedTime===t){
          appliedAt[id].push(f);
          assert.equal(v.action.time,r.action.time,`${id} frame ${f}: clock time of the applied pose`);
          assert.deepEqual(bones(v),bones(r),`${id} frame ${f}: bones`);checked++;
        }else{
          held++;assert.equal(v.appliedTime,before[id],`${id}: a held frame keeps the last applied pose`);
          const lag=t-v.appliedTime;assert.ok(lag>0&&lag<=.067+1e-9,`${id}: held at most one quantum (lag ${lag})`);
        }
      }
      assert.equal(staggered.stats.active,ids.length);
    }
    assert.ok(held>frames*ids.length*.4,`most far frames are held (held ${held})`);
    assert.equal(staggered.stats.heldPoses+staggered.stats.poseUpdates,frames*ids.length,'every far actor is either posed or held each frame');
    assert.equal(reference.stats.poseUpdates,frames*ids.length);
    assert.ok(staggered.stats.poseUpdates<reference.stats.poseUpdates*.7);
    // per-actor rates: 150/170 m ~ every 2nd frame, 230/260 m ~ every 3rd, 300/330 m ~ every 4th
    const rate=id=>frames/appliedAt[id].length;
    assert.ok(rate('far_a')<2.3&&rate('far_a')>1.7,String(rate('far_a')));assert.ok(rate('far_c')<3.4&&rate('far_c')>2.6,String(rate('far_c')));assert.ok(rate('far_e')<4.5&&rate('far_e')>3.5,String(rate('far_e')));
    // staggered: the actors of one band do not all refresh on the same frames
    assert.ok(new Set(ids.map(id=>appliedAt[id].join())).size>=3,'the actors do not share one refresh schedule');
    for(let f=10;f<frames;f++)assert.ok(ids.some(id=>!appliedAt[id].includes(f)),`frame ${f}: not every far actor is re-posed on the same frame (no pulse)`);
  }finally{staggered.dispose();reference.dispose();}
});

test('repeating update() at the same sim time is stable: it refreshes any stale pose to the exact pose of that time (pause / second render)',()=>{
  const c=characters(),ref=characters();ref.poseHeld=()=>false;
  try{
    const mk=()=>[rifleman('enemy','far_x',-200),rifleman('ally','far_y',180),rifleman('ally','far_z',125)];
    let t=10;for(let f=0;f<7;f++){t+=1/60;c.update(mk(),t,player,'high');}
    c.update(mk(),t,player,'high');                      // same clock again (paused re-render)
    ref.update(mk(),t,player,'high');
    for(const id of ['far_x','far_y']){const v=c.instances.get(id),r=ref.instances.get(id);assert.equal(v.appliedTime,t);assert.equal(v.action.time,r.action.time);assert.deepEqual(bones(v),bones(r));}
    const stats={...c.stats};c.update(mk(),t,player,'high');c.update(mk(),t,player,'high');
    assert.equal(c.stats.poseUpdates,stats.poseUpdates,'an exact pose at the same clock is not re-applied');
    // a quality tier / IK switch changes the pose pipeline: no actor is held across it, even at the same clock
    const applied=c.stats.poseUpdates;c.update(mk(),t,player,'medium');assert.ok(c.stats.poseUpdates>applied,'a tier switch re-poses the far actors (125 m is inside the medium range)');
    // clock going backwards (checkpoint restore) re-poses at once
    c.update(mk(),t-5,player,'high');assert.equal(c.instances.get('far_x').appliedTime,t-5);
  }finally{c.dispose();ref.dispose();}
});

test('near actors, carriers/carried and MG crews are never held; a teleport re-poses at once',()=>{
  const c=characters();
  try{
    const near=rifleman('ally','near_a',60),far=rifleman('enemy','far_a',200),carried={...rifleman('ally','far_carried',-200),carriedBy:'far_carrier'},carrier=rifleman('ally','far_carrier',-200.5);
    let t=3;const mk=()=>[near,far,carried,carrier];
    for(let f=0;f<30;f++){t+=1/60;c.update(mk(),t,player,'high');
      for(const id of ['near_a','far_carried','far_carrier'])assert.equal(c.instances.get(id).appliedTime,t,`${id} is posed every frame`);}
    assert.ok(c.stats.heldPoses>0,'the plain far rifleman was held at some frames');
    const v=c.instances.get('far_a');t+=1/240;const x=far.x;far.x=x+40;c.update(mk(),t,player,'high');assert.equal(v.appliedTime,t,'a 40 m jump is not a normal frame');
  }finally{c.dispose();}
});

test('bone-matrix upload: a held pose is not recomputed or re-uploaded, an applied pose always is, once',()=>{
  const c=characters();
  try{
    const far=rifleman('enemy','far_a',250),mk=()=>[far];let t=1;
    c.update(mk(),t,player,'high');
    const v=c.instances.get('far_a'),skeletons=[...new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton))];
    const render=()=>{for(const s of skeletons)s.update();};      // what WebGLObjects does for each rendered skinned mesh
    c.poseStats.boneUploads=c.poseStats.boneSkips=0;
    render();assert.equal(c.poseStats.boneUploads,skeletons.length,'the first pose is uploaded');
    let uploadsSeen=skeletons.length,skips=0;
    for(let f=0;f<24;f++){
      t+=1/60;c.update(mk(),t,player,'high');
      const applied=v.appliedTime===t,before={...c.poseStats};render();
      if(applied)assert.equal(c.poseStats.boneUploads-before.boneUploads,skeletons.length,`frame ${f}: new pose uploaded`);
      else{assert.equal(c.poseStats.boneUploads,before.boneUploads,`frame ${f}: held pose not uploaded`);skips+=skeletons.length;assert.equal(c.poseStats.boneSkips-before.boneSkips,skeletons.length);}
      uploadsSeen=c.poseStats.boneUploads;
    }
    assert.ok(skips>0&&uploadsSeen<24*skeletons.length);
    // a pose that was applied but never rendered (no render() call) must still be uploaded by the next render, even when the next frame is held
    do{t+=1/60;c.update(mk(),t,player,'high');}while(v.appliedTime!==t);
    const uploads=c.poseStats.boneUploads;
    t+=1/240;c.update(mk(),t,player,'high');          // 4 ms later: held
    assert.notEqual(v.appliedTime,t);render();assert.equal(c.poseStats.boneUploads-uploads,skeletons.length,'the unrendered pose was uploaded by the next render');
  }finally{c.dispose();}
});
