import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ANIMATION_PROFILE,deterministicVariation,createAnimationState,selectLocomotionSemantic,playbackForLocomotion,
  resolveAnimationFrame,animationFidelityPolicy,snapshotAnimationState,validateAnimationState,restoreAnimationState,
  semanticPlanFingerprint,prototypeInput,runPrototypeScenarios,shortestAngle
} from '../tools/verification/m01-soldier-animation-state-prototype.mjs';

const step=(state,overrides)=>resolveAnimationFrame(state,prototypeInput({actorId:state.actorId,...overrides}));

test('idle -> walk selects locomotion from authoritative world speed',()=>{
  let s=createAnimationState('a');let r=step(s,{now:.1});assert.equal(r.plan.baseLocomotion,'idle');s=r.state;
  r=step(s,{now:.2,actor:{worldSpeedMps:1.8,posture:'STAND'},intent:{movementYaw:0,desiredPosture:'STAND',aimYaw:0}});
  assert.equal(r.plan.baseLocomotion,'walk');assert.equal(r.plan.playback.rate,1);
});

test('walk -> run changes gait instead of stretching walk beyond safe speed',()=>{
  let s=createAnimationState('a');s=step(s,{now:.1,actor:{worldSpeedMps:1.8}}).state;
  const r=step(s,{now:.2,actor:{worldSpeedMps:4.2},intent:{movementYaw:0,desiredPosture:'STAND',aimYaw:0}});
  assert.equal(r.plan.baseLocomotion,'run');assert.equal(r.plan.playback.rate,1);
});

test('stand -> crouch creates a timed presentation transition without changing actor gameplay state',()=>{
  const actor={posture:'CROUCH',worldSpeedMps:0,health:100};const input=prototypeInput({actorId:'c',now:.1,actor});const before=structuredClone(input.actor);
  const r=resolveAnimationFrame(createAnimationState('c'),input);
  assert.equal(r.plan.acceptedPosture,'CROUCH');assert.equal(r.plan.posture,'STAND');assert.equal(r.plan.postureTransition.from,'STAND');assert.equal(r.plan.postureTransition.to,'CROUCH');
  assert.deepEqual(input.actor,before);
});

test('crouched actor moving selects crouch_walk semantic state',()=>{
  const input=prototypeInput({actorId:'c',now:.1,actor:{posture:'CROUCH',worldSpeedMps:1.2},intent:{desiredPosture:'CROUCH',movementYaw:0,aimYaw:0}});
  assert.equal(resolveAnimationFrame(createAnimationState('c'),input).plan.baseLocomotion,'crouch_walk');
});

test('prone AI request is pending until authoritative posture accepts it',()=>{
  let input=prototypeInput({actorId:'p',now:.1,actor:{posture:'STAND',worldSpeedMps:0},intent:{desiredPosture:'PRONE',aimYaw:0}});
  let r=resolveAnimationFrame(createAnimationState('p'),input);assert.equal(r.plan.postureRequestPending,true);assert.equal(r.plan.baseLocomotion,'idle');
  input=prototypeInput({actorId:'p',now:.2,actor:{posture:'PRONE',worldSpeedMps:.4},intent:{desiredPosture:'PRONE',movementYaw:0,aimYaw:0}});
  r=resolveAnimationFrame(r.state,input);assert.equal(r.plan.postureRequestPending,false);assert.equal(r.plan.baseLocomotion,'prone_crawl');
});

test('stationary large authoritative yaw change requests turn-in-place and limits visual turn rate',()=>{
  const r=resolveAnimationFrame(createAnimationState('turn',{bodyYaw:0}),prototypeInput({actorId:'turn',now:.2,actor:{facing:Math.PI/2,worldSpeedMps:0},intent:{aimYaw:Math.PI/2,desiredPosture:'STAND'}}));
  assert.equal(r.plan.turnInPlace,'turn_left');assert.ok(Math.abs(r.plan.visualBodyYaw-60*Math.PI/180)<1e-9,'300 deg/s for 0.2 s');
});

test('aim twist is bounded and reports body follow when desired aim exceeds limit',()=>{
  const r=resolveAnimationFrame(createAnimationState('aim'),prototypeInput({actorId:'aim',now:.1,actor:{facing:0,worldSpeedMps:0},intent:{aimYaw:Math.PI,desiredPosture:'STAND'}}));
  assert.equal(r.plan.aimOffset.needsBodyFollow,true);assert.ok(Math.abs(r.plan.aimOffset.yaw)<=DEFAULT_ANIMATION_PROFILE.maxUpperBodyTwist+1e-12);
});

test('small aim offset stays inside body twist and needs no body follow',()=>{
  const aim=25*Math.PI/180,r=resolveAnimationFrame(createAnimationState('aim2'),prototypeInput({actorId:'aim2',now:.1,actor:{facing:0},intent:{aimYaw:aim}}));
  assert.equal(r.plan.aimOffset.needsBodyFollow,false);assert.ok(Math.abs(r.plan.aimOffset.yaw-aim)<1e-9);
});

test('movement speed maps to playback rate with a bounded safe range',()=>{
  assert.deepEqual(playbackForLocomotion('walk',1.8),{rate:1,rawRate:1,withinSafeBand:true,nominalSpeedMps:1.8,cycleDuration:1});
  const slow=playbackForLocomotion('walk',.9);assert.equal(slow.rawRate,.5);assert.equal(slow.rate,.8);assert.equal(slow.withinSafeBand,false);
  const fast=playbackForLocomotion('walk',3.6);assert.equal(fast.rawRate,2);assert.equal(fast.rate,1.2);assert.equal(fast.withinSafeBand,false);
});

test('direction relative to body selects strafe/backpedal semantics without moving actor',()=>{
  const actor={alive:true,posture:'STAND',facing:0,worldSpeedMps:1.5};
  assert.equal(selectLocomotionSemantic(actor,{movementYaw:Math.PI/2}),'strafe_right');
  assert.equal(selectLocomotionSemantic(actor,{movementYaw:-Math.PI/2}),'strafe_left');
  assert.equal(selectLocomotionSemantic(actor,{movementYaw:Math.PI}),'backpedal');
});

test('deterministic actor-ID variation is stable and does not use gameplay RNG',()=>{
  assert.deepEqual(deterministicVariation('pl_east_3'),deterministicVariation('pl_east_3'));
  assert.notDeepEqual(deterministicVariation('pl_east_3'),deterministicVariation('pl_east_4'));
});

test('camera input is ignored by semantic animation state',()=>{
  const s=createAnimationState('cam'),base={actorId:'cam',now:.1,actor:{worldSpeedMps:1.8},intent:{movementYaw:0,aimYaw:.2,desiredPosture:'STAND'}};
  const a=resolveAnimationFrame(s,prototypeInput({...base,camera:{x:0,y:2,z:0,yaw:0}})).plan;
  const b=resolveAnimationFrame(s,prototypeInput({...base,camera:{x:999,y:99,z:-300,yaw:2.8}})).plan;
  assert.equal(semanticPlanFingerprint(a),semanticPlanFingerprint(b));
});

test('quality input is ignored by core state; fidelity policy is a separate presentation decision',()=>{
  const s=createAnimationState('q'),base={actorId:'q',now:.1,actor:{worldSpeedMps:1.8},intent:{movementYaw:0,aimYaw:0}};
  const low=resolveAnimationFrame(s,prototypeInput({...base,quality:'low'})).plan,high=resolveAnimationFrame(s,prototypeInput({...base,quality:'high'})).plan;
  assert.equal(semanticPlanFingerprint(low),semanticPlanFingerprint(high));
  assert.notEqual(animationFidelityPolicy({quality:'low',distance:5}).tier,animationFidelityPolicy({quality:'high',distance:5}).tier);
});

test('pause freezes phase, posture transition progress and visual yaw while simulation state is frozen',()=>{
  let s=createAnimationState('pause');s=step(s,{now:1,actor:{worldSpeedMps:1.2,posture:'CROUCH'},intent:{movementYaw:0,aimYaw:0,desiredPosture:'CROUCH'}}).state;
  s=step(s,{now:1.1,actor:{worldSpeedMps:1.2,posture:'CROUCH'},intent:{movementYaw:0,aimYaw:0,desiredPosture:'CROUCH'}}).state;const before=snapshotAnimationState(s);
  const r=step(s,{now:10,paused:true,actor:{worldSpeedMps:1.2,posture:'CROUCH'},intent:{movementYaw:0,aimYaw:0,desiredPosture:'CROUCH'}});
  assert.equal(r.state.lastNow,before.lastNow);assert.equal(r.state.phaseCycles,before.phaseCycles);assert.equal(r.state.visualBodyYaw,before.visualBodyYaw);assert.deepEqual(r.state.postureTransition,before.postureTransition);
});

test('snapshot/restore reproduces the same next animation state',()=>{
  let s=createAnimationState('save');s=step(s,{now:.2,actor:{worldSpeedMps:1.8,facing:.2},intent:{aimYaw:.4,movementYaw:.2}}).state;
  const snap=snapshotAnimationState(s);assert.equal(validateAnimationState(snap),true);
  const a=step(s,{now:.4,actor:{worldSpeedMps:4.2,facing:.3},intent:{aimYaw:.5,movementYaw:.3}});
  const target=createAnimationState('save');restoreAnimationState(target,snap);const b=step(target,{now:.4,actor:{worldSpeedMps:4.2,facing:.3},intent:{aimYaw:.5,movementYaw:.3}});
  assert.deepEqual(b,a);
});

test('invalid animation restore is rejected before mutating target',()=>{
  const s=createAnimationState('bad'),before=snapshotAnimationState(s),bad=snapshotAnimationState(s);bad.phaseCycles=Infinity;
  assert.throws(()=>restoreAnimationState(s,bad),/numbers/);assert.deepEqual(s,before);
});

test('fire is an upper-body overlay while locomotion remains selected',()=>{
  const r=resolveAnimationFrame(createAnimationState('fire'),prototypeInput({actorId:'fire',now:.1,actor:{worldSpeedMps:1.8},intent:{movementYaw:0,aimYaw:0,fireMode:'SINGLE'},weapon:{firing:true}}));
  assert.equal(r.plan.baseLocomotion,'walk');assert.equal(r.plan.upperBody.state,'fire');assert.equal(r.plan.upperBody.recoilAdditive,true);
});

test('reload occupies weapon layer without animation cancelling authoritative locomotion',()=>{
  const r=resolveAnimationFrame(createAnimationState('reload'),prototypeInput({actorId:'reload',now:.1,actor:{worldSpeedMps:1.8},intent:{movementYaw:0,aimYaw:0},weapon:{reloading:true,reloadPolicy:{allowLocomotion:'slow'}}}));
  assert.equal(r.plan.baseLocomotion,'walk');assert.equal(r.plan.upperBody.state,'reload');assert.equal(r.plan.upperBody.allowLocomotion,'slow');assert.deepEqual(r.plan.upperBody.blocks,['aim','fire']);
});

test('visual hit reaction never changes authoritative HP or death state',()=>{
  const input=prototypeInput({actorId:'hit',now:.1,actor:{health:63,alive:true},condition:{hitReaction:{direction:{x:-1,z:0},intensity:.8,startedAt:.05}}}),before=structuredClone(input.actor);
  const r=resolveAnimationFrame(createAnimationState('hit'),input);assert.equal(r.plan.reaction.state,'hit');assert.deepEqual(input.actor,before);assert.equal(input.actor.health,63);assert.equal(input.actor.alive,true);
});

test('suppression reaction reflects condition but does not invent lower authoritative posture',()=>{
  const r=resolveAnimationFrame(createAnimationState('sup'),prototypeInput({actorId:'sup',now:.1,actor:{posture:'STAND'},intent:{desiredPosture:'CROUCH'},condition:{suppressed:true,pinned:true,sourceDirection:{x:1,z:0}}}));
  assert.equal(r.plan.reaction.state,'pinned-flinch');assert.equal(r.plan.acceptedPosture,'STAND');assert.equal(r.plan.postureRequestPending,true);
});

test('cover metadata passes through animation plan without deciding cover/tactics',()=>{
  const cover={kind:'window',side:'left',height:1.2,peek:'left'},r=resolveAnimationFrame(createAnimationState('cover'),prototypeInput({actorId:'cover',now:.1,intent:{cover,aimYaw:0}}));
  assert.deepEqual(r.plan.cover,cover);
});

test('weapon socket IK targets are copied as presentation data and input remains unchanged',()=>{
  const sockets={grip_r:[1,2,3],grip_l:[4,5,6],butt:[7,8,9]},input=prototypeInput({actorId:'ik',now:.1,weapon:{sockets}}),before=structuredClone(input);
  const r=resolveAnimationFrame(createAnimationState('ik'),input);assert.deepEqual(r.plan.ik.rightHand,[1,2,3]);assert.deepEqual(r.plan.ik.leftHand,[4,5,6]);assert.deepEqual(r.plan.ik.butt,[7,8,9]);assert.deepEqual(input,before);
});

test('LOD/fidelity policy never alters actor transform or gameplay fields',()=>{
  const actor={position:{x:10,y:2,z:3},facing:.7,health:88,alive:true,posture:'STAND'},before=structuredClone(actor);
  for(const quality of ['low','medium','high'])for(const distance of [5,30,100])animationFidelityPolicy({quality,distance});
  assert.deepEqual(actor,before);
});

test('death state comes from authoritative alive flag, never from reaction layer',()=>{
  const alive=selectLocomotionSemantic({alive:true,posture:'STAND',facing:0,worldSpeedMps:0},{}),dead=selectLocomotionSemantic({alive:false,posture:'STAND',facing:0,worldSpeedMps:0},{});
  assert.equal(alive,'idle');assert.equal(dead,'fallen');
});

test('specialized system marker is carried through without generic state owning its phase',()=>{
  const marker={kind:'mg34-prone',phase:'fire_burst',startedAt:4},r=resolveAnimationFrame(createAnimationState('mg'),prototypeInput({actorId:'mg',now:4.1,specialized:marker}));
  assert.deepEqual(r.plan.specialized,marker);
});

test('shortest angle never requests a 180-degree-plus torso path',()=>{
  for(const a of [-8,-4,-Math.PI,Math.PI,4,8])assert.ok(Math.abs(shortestAngle(a))<=Math.PI+1e-12);
});

test('prototype scenario covers idle, walk, run, crouch and turning contracts',()=>{
  const r=runPrototypeScenarios();assert.equal(r.idle,'idle');assert.deepEqual(r.walk,{semantic:'walk',rate:1});assert.deepEqual(r.run,{semantic:'run',rate:1});assert.equal(r.crouch.semantic,'crouch_walk');assert.ok(r.turn.semantic.startsWith('turn_'));
});
