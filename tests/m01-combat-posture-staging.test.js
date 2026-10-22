import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as THREE from 'three';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,combatStagePlan,eastFrontPlan,seconds,clockText} from '../src/game/m01-simulation.js';
import {eastHoldStage,holdStageSlot} from '../src/game/m01-animation-presentation.js';
import {aimPoint} from '../src/game/m01-aim.js';
import {actorHitboxes,eyePosition,traceShot} from '../src/world/spatial.js';
import {actorPoseName,actorPose} from '../src/render/m01-actor-pose.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {buildTerrainEnvelope} from '../src/render/m01-terrain-envelope.js';
import {EYE_HEIGHT} from '../src/config.js';
import {route} from './helpers/m01-route.js';
import {json} from './helpers/m01-determinism.js';
import {gameplaySnapshot} from './helpers/m01-animation-contract.js';
import {rowTriples,lineQuads,closestPair} from './helpers/m01-staging.js';

// T38 M01-COMBAT-POSTURE-STAGING-V1. Nobody waits standing in a row under fire. Waiting positions are mission data (no RNG draw) and the
// posture is GAMEPLAY, so what is drawn, the hitboxes, the eye (line of sight), the aim point of a shot at the man and the origin of his own
// shots all agree:
//   grp_east_platoon  staggered hold.slots on the road deck, crouched (kneeling) while holding; stand and run at the withdrawal.
//   de_east_2..13     staggered gate positions against the 1912 portal, facing west, kneeling; they rise riseBeforeSec before a shot of their
//                     own and stay up holdAfterSec after it (so a shot, its line of sight and its origin are a standing man's).
//   grp_squad         behind the sandbags of the squad post (cv_squad_post), kneeling at their slot from the 04:34 bombing.
//   grp_sappers       kneeling at the cable at repair site 1; at the second cut crouched while working, prone (T07) when suppressed or waiting.
// Environment: M01_STAGING_SEEDS=19390901,1  run only these seeds (default: 12 seeds); M01_STAGING_REPORT=<file> writes the per-seed outcomes.
const E=name=>`evt_m01_${name}`;
const SEEDS=process.env.M01_STAGING_SEEDS?process.env.M01_STAGING_SEEDS.split(',').map(Number):[19390901,1,2,3,4,5,6,7,8,9,10,11];
const report={task:'M01-COMBAT-POSTURE-STAGING-V1',node:process.version,arch:process.arch,routes:[]};
after(()=>{if(process.env.M01_STAGING_REPORT)writeFileSync(process.env.M01_STAGING_REPORT,JSON.stringify(report,null,2)+'\n');});
const PLAN=combatStagePlan(),HOLD=eastHoldStage(),FRONT=eastFrontPlan();
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const d2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const platoon=sim=>Array.from({length:24},(_,i)=>sim.actor(`pl_east_${i}`));
const gates=sim=>Array.from({length:12},(_,k)=>sim.actor(`de_east_${k+2}`));
const SECTION=Object.keys(PLAN.squad.slots),SAPPERS=Object.keys(PLAN.sappers);

const spread=v=>{const m=v.reduce((n,x)=>n+x,0)/v.length;return Math.sqrt(v.reduce((n,x)=>n+(x-m)**2,0)/v.length);};
const closest=closestPair;
/** The very predicate of TczewWorld.move: would this actor, where he stands, be inside a solid obstacle? */
const collides=(world,a)=>world.obstacles.find(b=>a.y+1.45>b.min.y&&a.y+.1<b.max.y&&a.x+a.radius>b.min.x&&a.x-a.radius<b.max.x&&a.z+a.radius>b.min.z&&a.z-a.radius<b.max.z);
const inBox=(p,b,tol=0)=>p.x>=b.min.x-tol&&p.x<=b.max.x+tol&&p.y>=b.min.y-tol&&p.y<=b.max.y+tol&&p.z>=b.min.z-tol&&p.z<=b.max.z+tol;

// ---------------------------------------------------------------- data
test('stage data: staggered slots for every waiting group, validated when the module loads; a data error stops the game',()=>{
  assert.equal(FRONT.slots.length,24);assert.equal(HOLD.slots.length,24);assert.equal(HOLD.posture,'crouch');
  assert.deepEqual(HOLD.slots.map(({x,z})=>[x,z]),FRONT.slots.map(({x,z})=>[x,z]),'one source for the sim and the presentation');
  assert.equal(PLAN.gates.positions.length,12);assert.ok(PLAN.gates.riseBeforeSec>.05&&PLAN.gates.holdAfterSec>.05);
  assert.deepEqual(SECTION.sort(),['east_platoon_voice','jozef_bak','marek_zielinski','staszek_pawlak','szymon_kowal']);
  assert.deepEqual(SAPPERS.sort(),['pawel_krawiec','sapper_2','sapper_3']);
  assert.equal(PLAN.squad.underFireFrom,E('bombing_0434'));
  const edit=fn=>{const d=json(definition);fn(id=>d.groups.find(g=>g.id===id));return d;};
  const gate=g=>g('grp_de_east').firePositions.find(f=>f.id==='fp_m01_riflemen_gates');
  for(const [name,fn] of Object.entries({
    'a gate rifleman without a position':g=>{gate(g).positions.pop();},'a NaN gate position':g=>{gate(g).positions[3][1]=null;},
    'gate posture stand':g=>{gate(g).stage.posture='stand';},'no rise time':g=>{delete gate(g).stage.riseBeforeSec;},'a rise of a minute':g=>{gate(g).stage.riseBeforeSec=60;},
    'a section slot for a stranger':g=>{g('grp_squad').stage.slots.de_east_3=[-72,22,0];},'a section slot for Nowicki':g=>{g('grp_squad').stage.slots.tadeusz_nowicki=[17,3,0];},
    'a section slot of two numbers':g=>{g('grp_squad').stage.slots.jozef_bak=[-72,22];},'no under-fire event':g=>{g('grp_squad').stage.underFireFrom='evt_m01_nope';},
    'a sapper without a slot':g=>{delete g('grp_sappers').stage.slots.sapper_3;},'section posture prone':g=>{g('grp_squad').stage.posture='prone';},
    'no gate positions':g=>{delete gate(g).positions;},'no gate stage':g=>{delete gate(g).stage;},'no section stage':g=>{delete g('grp_squad').stage;},
    'no section slots':g=>{delete g('grp_squad').stage.slots;},'no sapper stage':g=>{delete g('grp_sappers').stage;},'a NaN section coordinate':g=>{g('grp_squad').stage.slots.jozef_bak[0]=NaN;},
    'a NaN sapper facing':g=>{g('grp_sappers').stage.slots.sapper_2[2]=null;},'no rkm stage':g=>{delete g('grp_squad').stage.rkm;},
    'an rkm hold shorter than the burst':g=>{g('grp_squad').stage.rkm.holdAfterSec=.5;},'an rkm gunner off the section':g=>{g('grp_squad').stage.rkm.actor='leon_dudek';},
  }))assert.throws(()=>combatStagePlan(edit(fn)),/M01 combat stage/,name);
  for(const [name,fn] of Object.entries({'no slots':g=>{delete g('grp_east_platoon').hold.slots;},'stand':g=>{g('grp_east_platoon').hold.stage.posture='stand';},
    'prone':g=>{g('grp_east_platoon').hold.stage.posture='prone';},'short yaw':g=>{g('grp_east_platoon').hold.stage.yaw.pop();},'wide yaw':g=>{g('grp_east_platoon').hold.stage.yaw[3]=.5;},
    'no stage':g=>{delete g('grp_east_platoon').hold.stage;},'NaN yaw':g=>{g('grp_east_platoon').hold.stage.yaw[5]=NaN;},'null yaw':g=>{g('grp_east_platoon').hold.stage.yaw[6]=null;},
    'a NaN slot coordinate':g=>{g('grp_east_platoon').hold.slots[9]=[1035,NaN];},'a slot of one number':g=>{g('grp_east_platoon').hold.slots[2]=[1030];}}))
    assert.throws(()=>eastHoldStage(edit(fn)),/M01 east hold stage/,name);
});

test('only a platoon man kneeling still on his own hold slot gets the staged body turn; nobody else, nothing else changes',()=>{
  const s=new M01Simulation(),a={...platoon(s)[7],active:true,crouched:true};
  assert.equal(holdStageSlot(a),7);assert.equal(holdStageSlot({...a,active:false}),-1,'off stage before the train');
  for(const [name,patch] of Object.entries({moving:{motion:{...a.motion,speed:.4}},standing:{crouched:false},wounded:{state:'WOUNDED'},carried:{carriedBy:'x'},
    dead:{alive:false},'off his slot':{x:a.x+.2},'on another man\'s slot':{x:HOLD.slots[8].x,z:HOLD.slots[8].z}}))assert.equal(holdStageSlot({...a,...patch}),-1,name);
  for(const x of s.actors.filter(x=>x.group!=='grp_east_platoon'))assert.equal(holdStageSlot({...x,x:a.x,z:a.z,active:true,crouched:true}),-1,x.id);
  assert.equal(holdStageSlot({...s.actor('de_spans_0'),id:'pl_east_7',group:'grp_de_spans',x:a.x,z:a.z,active:true,crouched:true}),-1,'a German with a platoon id');
});

test('no row: every waiting group is staggered (no close-order trio, no four on a line), spaced at least 0.9 m (platoon 1.2 m) and varied',()=>{
  const s=new M01Simulation(),groups={
    platoon:platoon(s),gates:gates(s),section:SECTION.map(id=>s.actor(id)),sappers:SAPPERS.map(id=>s.actor(id)),
  };
  // The detector does see the rows T38 removed: the old 6x4 grid, the old gate saw-tooth and the old section line.
  const grid=Array.from({length:24},(_,i)=>({x:1033+i%6*2,z:38.2+Math.floor(i/6)*1.2}));
  const saw=Array.from({length:12},(_,k)=>({x:1053+k%3*2,z:9.5+k*2}));
  const line=[0,3,4,6,10].map(i=>({x:-76-i*1.6,z:24+i%3*2}));
  for(const [name,old] of Object.entries({grid,saw,line}))assert.ok(rowTriples(old).length>0,`${name}: the old layout is a row`);
  assert.ok(lineQuads(grid).length>0,'the old grid also has four-man lines');
  // The old sapper places were on one line too, two of them 0.6 m apart: the spacing rule below catches that.
  assert.ok(closest([1,8,9].map(i=>({x:-42-i*.6,z:10})))<.9);
  for(const [name,men] of Object.entries(groups)){
    assert.deepEqual(rowTriples(men),[],`${name}: no close-order row`);assert.deepEqual(lineQuads(men),[],`${name}: no four on a line`);
    assert.ok(closest(men)>=(name==='platoon'?1.2:.9),`${name}: closest pair ${closest(men).toFixed(2)} m`);
    assert.ok(spread(men.map(a=>a.x))>.6&&spread(men.map(a=>a.z))>.5,`${name}: positions vary in x and z`);
    if(name!=='platoon')assert.equal(new Set(men.map(a=>a.facing)).size,men.length,`${name}: everyone has his own facing`);
  }
  assert.equal(new Set(HOLD.yaw).size,24,'the platoon kneels with 24 different body turns');
  // Seen from the west bank (z across the view, ground height up) the gate riflemen do not line up either: they kneel at different depths on
  // the slope (ground -1.4 .. -1 m, x >= 1053 as in T23 so the distant silhouettes stay visible), so no three are on one line within 0.1 m and
  // no four within 0.1 m with gaps <= 4 m.
  const west=groups.gates.map(a=>({x:a.z,z:a.y}));
  assert.deepEqual(rowTriples(west,{dev:.1}),[],'gates from the west: no row');assert.deepEqual(lineQuads(west,{dev:.1}),[],'gates from the west: no four on a line');
  assert.ok(Math.max(...groups.gates.map(a=>a.x))-Math.min(...groups.gates.map(a=>a.x))>=5,'at least 5 m of depth');
  assert.ok(new Set(groups.gates.map(a=>a.y)).size>=6,'at least six different ground heights');
  // Gate riflemen face the west bank; nobody of them stands where an MG34 gunner lies.
  for(const a of groups.gates){assert.ok(Math.abs(angle(a.facing-Math.PI))<.25,a.id);for(const mg of ['de_east_0','de_east_1'])assert.ok(d2(a,s.actor(mg))>=1.5,`${a.id} / ${mg}`);}
});

test('collisions: no staged man stands inside a world collider or on another man; all on the ground (or the deck), inside their area',()=>{
  const s=new M01Simulation();
  const staged=[...platoon(s),...gates(s),...SECTION.map(id=>s.actor(id)),...SAPPERS.map(id=>s.actor(id)),s.actor('tadeusz_nowicki')];
  for(const world of [s.world,(()=>{const w=new M01Simulation().world;w.refresh([E('bombing_0434'),E('train963_arrives')],{'m01.forward_post_state':'destroyed'});return w;})()])
    for(const a of staged){const hit=collides(world,a);assert.equal(hit,undefined,`${a.id} inside ${hit?.id}`);}
  for(const a of staged)assert.equal(a.y,a.id==='tadeusz_nowicki'?0:s.world.heightAt(a.x,a.z),`${a.id} stands on the ground`);
  // Nobody overlaps anybody (two radii), including the men who are not staged (Lipski, the MG34 gunners, Nowicki).
  for(const a of staged)for(const b of s.actors)if(a!==b&&b.active!==undefined&&d2(a,b)<a.radius+b.radius)assert.fail(`${a.id} overlaps ${b.id}`);
  // The Poles who wait on the west bank are inside the playable area (the platoon and the Germans are on the east bank by design, T23).
  const play=s.world.layout.bounds.playable;
  for(const a of [...SECTION.map(id=>s.actor(id)),...SAPPERS.map(id=>s.actor(id)),s.actor('tadeusz_nowicki')])
    assert.ok(a.x>=play.minX&&a.x<=play.maxX&&a.z>=play.minZ&&a.z<=play.maxZ,`${a.id} inside the playable bounds`);
  const post=s.world.covers.find(c=>c.id==='cv_squad_post'),forward=s.world.covers.find(c=>c.id==='cv_forward_post');
  for(const id of SECTION){const a=s.actor(id);assert.ok(a.x<post.min.x-a.radius&&a.x>post.min.x-4.5&&a.z>=post.min.z&&a.z<=post.max.z,`${id} is behind the squad-post sandbags, within their length`);}
  const nowicki=s.actor('tadeusz_nowicki');assert.ok(nowicki.x<forward.min.x&&nowicki.z>=forward.min.z&&nowicki.z<=forward.max.z,'Nowicki waits behind the forward-post sandbags');
  const portal=s.world.obstacles.find(o=>o.id==='COL_portal_lisewo_1912');
  for(const a of gates(s))assert.ok(a.x+a.radius<=portal.min.x&&a.x>=1053&&a.z>=6.5&&a.z<=31.5,`${a.id} is on the bank between the bridges, in front of the 1912 portal, x >= 1053`);
  // The terrain envelope (renderer) protects every staged place, read from the same data.
  const env=buildTerrainEnvelope(s.world),ids=env.regions.map(r=>r.id);
  for(const id of ['fire:fp_m01_riflemen_gates','stage:grp_squad','stage:grp_sappers','source:east-hold-slots'])assert.ok(ids.includes(id),id);
  for(const a of staged)assert.ok(env.regions.some(r=>a.x>=r.minX&&a.x<=r.maxX&&a.z>=r.minZ&&a.z<=r.maxZ),`${a.id} inside the terrain envelope`);
});

test('the gate riflemen keep their lines of sight: standing at his new place each sees exactly the west-bank probes he saw before T38',()=>{
  const s=new M01Simulation(),w=s.world,old=Array.from({length:12},(_,k)=>({x:1053+k%3*2,z:9.5+k*2}));
  const probes=[[-120,9],[-120,16.5],[-115,27],[-28,28],[-66,22],[-10,32],[30,40],[38,42.4],[16,2],[-147,11],[-274,21],[-292,26],[-460,140],[-262,70],[-248,80],
    [-300,30],[-275,27],[-322,30],[-170,22],[-15,40],[-123,8]].map(([x,z])=>({id:'p',space:'metres',x,y:w.heightAt(x,z),z,crouched:false}));
  const sees=(x,z)=>probes.map(p=>w.lineOfSight({id:'g',space:'metres',x,y:w.heightAt(x,z),z,crouched:false},p));
  // Each man, standing to shoot from his new place, sees exactly the probes his old place saw.
  gates(s).forEach((a,k)=>assert.deepEqual(sees(a.x,a.z),sees(old[k].x,old[k].z),`${a.id}: same lines of sight as from ${old[k].x},${old[k].z}`));
});

test('saves from before T38 load onto the new places: a man exactly on his old authored spot, sent nowhere, is re-seated; anyone else (and any fallen man) keeps his position',()=>{
  const fresh=new M01Simulation(),save=fresh.snapshot(),cast=definition.cast.filter(c=>c.id!=='jan_wrona').map(c=>c.id),at=id=>save.actors.find(a=>a.id===id);
  for(const id of SECTION){const i=cast.indexOf(id);Object.assign(at(id),{x:-76-i*1.6,y:-3,z:24+i%3*2,facing:0});}
  for(const id of SAPPERS){const i=cast.indexOf(id);Object.assign(at(id),{x:-42-i*.6,y:-2,z:10,facing:0});}
  for(let k=0;k<24;k++)Object.assign(at(`pl_east_${k}`),{x:1033+k%6*2,y:0,z:38.2+Math.floor(k/6)*1.2});
  for(let k=0;k<12;k++)Object.assign(at(`de_east_${k+2}`),{x:1053+k%3*2,y:-1,z:9.5+k*2,facing:0});
  Object.assign(at('jozef_bak'),{x:-80,z:30});Object.assign(at('sapper_3'),{target:{x:-121,z:10}});   // moved / already sent: untouched
  Object.assign(at('de_east_6'),{alive:false,health:0,state:'DOWN'});   // a gate rifleman who fell on his old place before T38: a corpse is not moved
  const s=new M01Simulation(5);s.restoreSnapshot(json(save));
  for(const id of SECTION.filter(id=>id!=='jozef_bak')){const a=s.actor(id),p=PLAN.squad.slots[id];assert.deepEqual([a.x,a.z,a.y,a.facing],[p.x,p.z,s.world.heightAt(p.x,p.z),p.facing],id);}
  assert.deepEqual([s.actor('jozef_bak').x,s.actor('jozef_bak').z],[-80,30],'a man who has moved keeps his place');
  for(const id of ['pawel_krawiec','sapper_2']){const a=s.actor(id),p=PLAN.sappers[id];assert.deepEqual([a.x,a.z],[p.x,p.z],id);}
  assert.deepEqual([s.actor('sapper_3').x,s.actor('sapper_3').z],[-42-cast.indexOf('sapper_3')*.6,10],'a sapper already sent keeps his place');
  platoon(s).forEach((a,k)=>assert.deepEqual([a.x,a.z,a.y],[FRONT.slots[k].x,FRONT.slots[k].z,0],a.id));
  gates(s).forEach((a,k)=>{
    if(a.id==='de_east_6'){assert.deepEqual([a.alive,a.x,a.z,a.y,a.facing],[false,1053+4%3*2,9.5+4*2,-1,0],'a fallen gate rifleman stays where he fell');return;}
    const p=PLAN.gates.positions[k];assert.deepEqual([a.x,a.z,a.y,a.facing],[p.x,p.z,s.world.heightAt(p.x,p.z),p.facing],a.id);});
  // a current save is restored byte for byte
  const c=new M01Simulation(5);c.restoreSnapshot(json(fresh.snapshot()));assert.deepEqual(c.snapshot(),fresh.snapshot());
});

test('kneeling and prone men are coherent: eye in the head box, aim point in the torso box, and the hitbox is the posture that is drawn',()=>{
  const s=new M01Simulation(),base=s.actor('pl_east_4');
  const stand={...base,crouched:false,posture:'stand'},kneel={...base,crouched:true,posture:'crouch'};
  const prone={...s.actor('pawel_krawiec'),crouched:true,posture:'prone',postureProgress:1,facing:.7};
  for(const [name,a,pose] of [['stand',stand,'standing'],['kneel',kneel,'crouched'],['prone',prone,'prone']]){
    const boxes=Object.fromEntries(actorHitboxes(a).map(b=>[b.part,b]));
    assert.ok(inBox(eyePosition(a),boxes.head,1e-9),`${name}: eye ${JSON.stringify(eyePosition(a))} in the head box`);
    assert.ok(inBox(aimPoint(a),boxes.torso,1e-9),`${name}: aim point in the torso box`);
    assert.equal(actorPoseName(a,0),pose,`${name}: the renderer draws this posture`);
  }
  const top=a=>Math.max(...actorHitboxes(a).map(b=>b.max.y))-a.y;
  assert.ok(Math.abs(top(stand)-1.88)<1e-9&&Math.abs(top(kneel)-1.4)<1e-9&&top(prone)<.6,'head tops: 1.88 standing, 1.40 kneeling, low prone');
  assert.equal(eyePosition(kneel).y-kneel.y,1.08);assert.equal(eyePosition(stand).y-stand.y,EYE_HEIGHT);
  // A gate rifleman, drawn kneeling, is hit exactly where the kneeling body is: a level shot from 20 m west at his kneeling head hits him;
  // the same shot at a standing man's head height passes over him. Standing (rising to shoot) he is hit at the standing height.
  const g=gates(s)[5],kneeler={...g,active:true,crouched:true},riser={...g,active:true,crouched:false};
  const shot=(target,h)=>traceShot(s.world,{x:target.x-20,y:target.y+h,z:target.z},{x:1,y:0,z:0},[target],30);
  assert.equal(shot(kneeler,1.2)?.actor,kneeler);assert.equal(shot(kneeler,1.2).part,'head');
  assert.notEqual(shot(kneeler,1.68)?.actor,kneeler,'over the kneeling man');
  assert.equal(shot(riser,1.68)?.actor,riser);assert.equal(shot(riser,1.68).part,'head');
});

test('behind the sandbags the kneeling section is hidden from every German position; Kowal rising with the rkm sees the Lisewo gates',()=>{
  const s=new M01Simulation();s.world.refresh([E('bombing_0434'),E('train963_arrives')],s.flags);
  const germans=Array.from({length:40},(_,i)=>({...s.actor(`de_east_${i}`),active:true}));
  for(const id of SECTION){const a={...s.actor(id),crouched:true};
    for(const g of germans){assert.ok(!s.world.lineOfSight(g,a),`${g.id} sees kneeling ${id}`);assert.ok(!s.world.lineOfSight(a,g),`kneeling ${id} sees ${g.id}`);}}
  const up={...s.actor('szymon_kowal'),crouched:false};
  for(const g of germans.slice(0,14))assert.ok(s.world.lineOfSight(up,g)&&s.world.lineOfSight(g,up),`Kowal up and ${g.id} see each other`);
});

test('renderer: Kowal kneels behind the sandbags (rkm crouched idle) and is drawn standing only for his burst; the magazine change still plays',()=>{
  const c=new M01Characters(new THREE.Scene());
  for(const [name,duration] of [['rkm_fire_burst',.8],['rkm_aim',2],['rkm_crouched_idle',3],['rkm_standing_idle',4],['rkm_reload',3.4]])c.clips.set(name,new THREE.AnimationClip(name,duration,[]));
  const k={id:'szymon_kowal',active:true,alive:true,team:'ally',role:'SUPPORT',state:'GUARD',x:-71.1,y:-3,z:23.3,facing:0,bodyYaw:0,shot:0,firedAt:10,rounds:17,cooldown:3,
    crouched:true,posture:'crouch',postureProgress:0,postureSince:1,suppressedUntil:0,motion:{speed:0,odometer:0,gait:'idle',gaitSince:0}};
  try{
    assert.equal(c.sample(k,12).clip,'rkm_crouched_idle','kneeling, not aiming upright');
    assert.equal(c.sample({...k,crouched:false,posture:'stand'},10.3).clip,'rkm_fire_burst','up for the burst');
    assert.equal(c.sample({...k,crouched:false,posture:'stand'},13).clip,'rkm_aim','up and aiming before the next burst');
    assert.equal(c.sample({...k,rounds:20,cooldown:4},11.5).clip,'rkm_reload','the magazine change is drawn kneeling');
  }finally{c.dispose();}
});

// ---------------------------------------------------------------- the real route, per seed
const sec=t=>seconds(t);
function stagedRoute(seed,support=false){
  const st={platoonKneel:0,platoonTurned:0,gateKneel:0,gateUp:0,gateShots:0,gateShotsUp:0,attritionGate:0,sectionKneel:0,kowalShots:0,
    sapperCable:0,sapperWork:0,sapperLag:0,sapperWest:0,kowalUp:0,attritionDike:0,sapperProneWait:0,sapperProneSuppressed:0,hitboxChecks:0},deaths={},saves=[];
  let holdTicks=0,withdrawFlag=null,seenRounds=new Set();
  let lastClock=0;const lastSup=new Map();   // suppression of every German at the end of the previous tick
  const onStep=({sim,events})=>{
    const clock=sim.clock;
    if(sim.holdingEast()){
      holdTicks++;
      for(const a of platoon(sim)){
        if(!a.active||!a.alive)continue;const i=Number(a.id.slice(8));
        assert.equal(a.crouched,true,`${a.id} kneels in gameplay while holding`);assert.equal(a.posture,'crouch');
        assert.equal(a.motion.speed,0);assert.equal(holdStageSlot(a),i,`${a.id} on his own slot`);st.platoonKneel++;
        if(clock-a.postureSince>=1&&a.bodyYaw===angle(a.facing+HOLD.yaw[i]))st.platoonTurned++;
      }
      if(holdTicks%1500===300&&saves.length<3)saves.push(sim.snapshot());
    }
    for(const a of gates(sim)){
      if(!a.alive||!a.active||sim.mission.phase==='OUTRO')continue;
      // He kneels unless suppressed-free and about to shoot / just shot, or a fixed-time attrition volley is due (T23) until 2.5 s after the fall.
      const volley=sim.holdingEast()&&FRONT.attrition.some(e=>{const v=sim.actor(e.victim);return sim.battleClock>=e.at&&sim.battleClock<e.cutoff&&v.active&&(v.alive||clock-v.diedAt<PLAN.gates.holdAfterSec);});
      const kneels=clock<a.suppressedUntil||(a.cooldown>PLAN.gates.riseBeforeSec&&clock-a.firedAt>=PLAN.gates.holdAfterSec&&!volley);
      assert.equal(a.crouched,kneels,`${a.id} kneels unless he is about to shoot or has just shot`);
      assert.equal(a.posture,a.crouched?'crouch':'stand');if(a.crouched)st.gateKneel++;else st.gateUp++;
      // The renderer never draws a kneeling (gameplay) rifleman with his rifle shouldered upright: he only aims while he is up.
      if(a.crouched)assert.equal(actorPose(a,clock).aiming,false,`${a.id} drawn aiming while kneeling`);
    }
    for(const r of sim.enemyFire.rounds){
      if(seenRounds.has(r.id))continue;seenRounds.add(r.id);
      const by=sim.actor(r.by),k=Number(r.by.split('_').at(-1)),h=+(r.oy-by.y).toFixed(9);
      // An attrition round (T23) leaves from the eye of a man drawn standing (a kneeling gate rifleman never takes that shot).
      if(r.kind==='attrition'){assert.equal(h,EYE_HEIGHT,`${r.id} by ${r.by}: a standing man's eye`);
        // He stood for the shot (h above). He still stands afterwards unless this very tick pinned him down after it (a suppression that began now), the same ordering the
        // ordinary rounds below allow: the shot is issued before the allies' fire of the tick is resolved. Found when the pilot's route moved by 23 ticks (D44, amendment 04).
        assert.ok(by.crouched===false||((lastSup.get(by.id)??0)<=lastClock&&by.suppressedUntil>clock),`${r.id} by ${r.by} is kneeling although nothing pinned him down in this tick`);
        // Combat AI slice 1 (integration 2026-10-18, both sides kept): a ckm or rkm near miss landing later in the SAME tick may pin him after the shot (seed 7: de_east_2 at 404.3 s on
        // the combat branch); he is down at the end of the tick exactly when that suppression began in this very tick.
        assert.equal(by.crouched,by.suppressedAt===sim.clock&&sim.clock<by.suppressedUntil,`${r.id} by ${r.by}: kneeling iff pinned in this tick`);
        if(k<14)st.attritionGate++;else st.attritionDike++;continue;}
      if(by.group!=='grp_de_east'||k<2||k>=14)continue;
      // The origin of a gate rifleman's own round is his standing eye: he rose riseBeforeSec earlier (Kowal may pin him down again in the
      // same tick, after the shot).
      assert.ok(r.ox===by.x&&r.oz===by.z,`${r.id} leaves from ${r.by}`);
      st.gateShots++;assert.equal(h,EYE_HEIGHT,`${by.id} stands to shoot (${r.kind})`);st.gateShotsUp++;
    }
    // From the tick after the bombing event (it is consumed after the actors move in its own tick).
    if(sim.consumedEvent(E('bombing_0434'))&&sim.clock>sim.consumed[E('bombing_0434')]&&sim.mission.phase!=='OUTRO')for(const id of SECTION){
      const a=sim.actor(id),slot=PLAN.squad.slots[id];
      if(a.alive&&a.active&&!a.task&&a.state!=='WOUNDED'&&d2(a,slot)<.5&&!(a.target&&d2(a.target,a)>=.8)){
        // Everyone kneels behind the sandbags; Kowal rises over them for his rkm burst only (rkm.riseBeforeSec before, holdAfterSec after).
        const rkm=PLAN.squad.rkm,up=id===rkm.actor&&sim.consumedEvent(E('train963_arrives'))&&!sim.consumedEvent(E('east_demolition'))&&
          (a.cooldown<=rkm.riseBeforeSec||clock-a.firedAt<rkm.holdAfterSec);
        assert.equal(a.crouched,!up,`${id} ${up?'up for the rkm':'kneels at his slot under fire'}`);assert.equal(a.posture,up?'stand':'crouch',`${id} posture`);
        if(up)st.kowalUp++;else st.sectionKneel++;
      }else if(d2(a,slot)>=1&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED'&&!a.task&&a.motion.speed>0)assert.equal(a.crouched,false,`${id} stands up to move`);
    }
    for(const e of events)if(e.type==='npc-shot'&&e.weapon==='rkm_wz28'){
      const k=sim.actor('szymon_kowal');assert.deepEqual(e.point,eyePosition(k));
      assert.equal(+(e.point.y-k.y).toFixed(9),EYE_HEIGHT,'Kowal fires standing over the sandbags');assert.equal(k.crouched,false);st.kowalShots++;
    }
    const site=sim.world.point('repair_site_2');
    for(const id of SAPPERS){
      const a=sim.actor(id);if(!a.alive||!a.active||sim.mission.phase==='OUTRO')continue;
      if(!a.target){assert.equal(a.crouched,true,`${id} kneels at the cable`);assert.equal(a.posture,clock<a.suppressedUntil?'prone':'crouch');st.sapperCable++;continue;}
      if(clock<a.suppressedUntil){assert.equal(a.posture,'prone',`${id} lies prone under fire`);st.sapperProneSuppressed++;}
      else if(a.crouched&&sim.consumedEvent(E('east_demolition'))){assert.equal(a.posture,'crouch',`${id} kneels in the west after the retreat`);st.sapperWest++;}
      else if(a.crouched){assert.equal(a.posture,'crouch',`${id} works crouched`);
        // The tick he is called away from the cable, and the tick the repair is done, the change comes after the actors moved: one tick late.
        if(sim.active('cover_repair')&&d2(a,site)<6)st.sapperWork++;else st.sapperLag++;}
      else if(a.state==='GUARD'&&a.motion.speed===0){assert.equal(a.posture,'prone',`${id} waits prone`);if(d2(a,site)<6)st.sapperProneWait++;}
      else assert.equal(a.posture,'stand',`${id} moves upright`);
    }
    // Hitboxes follow the gameplay posture: kneeling head top 1.4 m, prone head below 0.6 m once he is down.
    if(sim.clock%1<.05)for(const a of sim.actors.filter(x=>x.alive&&x.active&&!x.displayOnly&&!x.mg34Prone&&!x.carriedBy)){
      const top=Math.max(...actorHitboxes(a).map(b=>b.max.y))-a.y;
      if(a.posture==='prone'&&a.postureProgress===1)assert.ok(top<.6,`${a.id} prone hitbox`);
      else if(a.posture!=='prone')assert.ok(Math.abs(top-(a.crouched?1.4:1.88))<1e-9,`${a.id} ${a.posture} hitbox top ${top}`);
      st.hitboxChecks++;
    }
    for(const a of platoon(sim))if(!a.alive&&deaths[a.id]===undefined)deaths[a.id]=sim.battleClock;
    if(withdrawFlag===null&&sim.consumedEvent(E('east_platoon_withdraws'))){
      withdrawFlag=sim.flags['m01.east_platoon_survivors'];
      for(const a of platoon(sim).slice(0,18))assert.equal(a.crouched,false,`${a.id} stands to run at the withdrawal`);
    }
    lastClock=clock;for(const a of sim.enemies)lastSup.set(a.id,a.suppressedUntil);
  };
  const r=route(seed,{support,onStep}),s=r.sim;
  const times=Object.fromEntries(Object.entries(s.consumed).map(([k,v])=>[k.replace('evt_m01_',''),v]));
  return {r,s,st,deaths,saves,holdTicks,withdrawFlag,times};
}
// Before T38 (ef35c7a, x86, these 12 seeds, both routes) every attrition reserve fell 1 to 4 s of battle clock after its fixed time; T38 keeps that.
const FALL_WINDOW=5;
for(const seed of SEEDS)test(`staged route seed ${seed}: kneeling platoon, gates, section and prone sappers; the mission keeps every invariant`,()=>{
  const {s,st,deaths,saves,holdTicks,withdrawFlag}=stagedRoute(seed);
  assert.equal(s.mission.complete,true);assert.equal(s.battleClock,sec('07:05:00'));
  assert.deepEqual(s.checkpointsReached,['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_c_engenheiros','cp_m01_d_retirada']);
  assert.equal(withdrawFlag,18,'18 survivors at the withdrawal');
  assert.equal(s.flags['m01.east_platoon_survivors'],12,'without covering fire the rule of 20 s takes the platoon to its minimum, as before T38');
  for(const e of FRONT.attrition){const t=deaths[e.victim];assert.ok(t>=e.at&&t<e.at+FALL_WINDOW,`${e.victim} falls at ${clockText(e.at)} (+${(t-e.at).toFixed(2)} s)`);}
  assert.equal(Object.keys(deaths).filter(id=>Number(id.slice(8))>=18&&deaths[id]<sec('06:00:00')).length,6,'the six reserves, and only they, fall during the hold');
  for(const id of ['deliver_message','take_cover','follow_sergeant','find_sappers','fetch_material','cover_repair','hold_access','cover_withdrawal','leave_bridge','hold_corridor','reach_shelter'])
    assert.equal(s.objectives[`obj_m01_${id}`].state,'done',id);
  // Rule of 20 s and dlg_m01_049 as before; nobody stuck on the east spans.
  assert.ok(s.dialogueConsumed.includes('dlg_m01_049'),'dlg_m01_049 is said');
  assert.ok(s.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive).every(a=>a.x<660),'no survivor east of the blown spans');
  assert.ok(st.platoonKneel>holdTicks*12&&st.platoonTurned>holdTicks*10,JSON.stringify({st,holdTicks}));
  assert.ok(st.gateKneel>st.gateUp,'the gate riflemen spend most of the time kneeling');assert.ok(st.gateShots>20&&st.gateShotsUp===st.gateShots,JSON.stringify(st));
  assert.ok(st.sapperLag<=2*SAPPERS.length,`a sapper changes posture at most one tick late at each of the two transitions (${st.sapperLag})`);
  assert.ok(st.sapperWest>0&&st.kowalUp>0,JSON.stringify(st));
  assert.ok(st.sectionKneel>1000&&st.kowalShots>10&&st.sapperCable>100&&st.sapperWork>100&&st.sapperProneWait>0&&st.sapperProneSuppressed>0,JSON.stringify(st));
  // The yaw stage is presentation only: forcing the plain body turn from saves inside the hold changes no gameplay byte, event or draw.
  assert.ok(saves.length>=2);
  for(const save of saves){
    const a=new M01Simulation(1),b=new (class extends M01Simulation{tick(dt,c){for(const x of this.actors)if(x.group==='grp_east_platoon')x.bodyYaw=x.facing;return super.tick(dt,c);}})(1);
    for(const x of [a,b]){x.restoreSnapshot(json(save));x.drainEvents();}
    for(let t=0;t<40;t++){a.tick(.05,{});b.tick(.05,{});assert.deepEqual(b.drainEvents(),a.drainEvents());
      assert.equal(JSON.stringify(gameplaySnapshot(b.snapshot(false))),JSON.stringify(gameplaySnapshot(a.snapshot(false))));}
    assert.equal(b.rng.state,a.rng.state);
  }
  report.routes.push({seed,support:false,deaths:Object.fromEntries(Object.entries(deaths).map(([k,v])=>[k,clockText(v)])),
    times:Object.fromEntries(Object.entries(s.consumed).map(([k,v])=>[k.replace('evt_m01_',''),+v.toFixed(2)])),stats:st,rng:s.rng.state,rounds:s.enemyFire.nextId,survivors:s.flags['m01.east_platoon_survivors']});
});

test('staged route with covering fire (support route, seed 7): the player still covers the withdrawal and the platoon keeps all eighteen',()=>{
  const {s,st,withdrawFlag}=stagedRoute(7,true);
  assert.equal(s.mission.complete,true);assert.equal(withdrawFlag,18);assert.equal(s.checkpointsReached.length,4);
  assert.equal(s.flags['m01.east_platoon_survivors'],18,'covering fire keeps all eighteen, as before T38');
  assert.ok(st.gateShots>0&&st.gateShotsUp===st.gateShots);
});

test('the hold window used above is the mission\'s own: from train 963 to the 06:00 withdrawal',()=>{
  const at=id=>seconds(definition.events.find(e=>e.id===id).trigger.at);
  assert.ok(at(E('train963_arrives'))<at(E('east_platoon_withdraws')));
});
