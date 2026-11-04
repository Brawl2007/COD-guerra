import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arch} from 'node:os';
import {M01AreaSimulation,AREA_ACTS,AREA_SAVE_SCHEMA,PROFILE_DEFAULTS,areaActPlan,areaPlanOf,areaRoster,debriefChain,debriefWith,defaultCarry,makeProfile,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {M01ActRunner,ACTS,ACT_ALIASES,actOf,carryFrom,nextSeed,validateCarry} from '../src/game/m01-acts.js';
import {ckmCrewStage,inBand,makeWithdrawalPlan,validWithdrawalRecord,freshWithdrawalRecord} from '../src/game/m01-withdrawal.js';
import {M01AreaWorld} from '../src/world/m01-area-world.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {lightingModel,phaseAt,sunState,keyElevationDeg} from '../src/render/m01-lighting.js';
import {actCardFrame,cinematicFrame} from '../src/ui/m01-hud.js';
import {areaClippingAudit} from './helpers/m01-act-audit.js';
import {stackingAudit} from './helpers/m01-clipping.js';
import {actRoute} from './helpers/m01-act-route.js';
import {actBRoute} from './helpers/m01-act-b-route.js';
import {ACT_C_TICK,actCControls,actCRoute} from './helpers/m01-act-c-route.js';
import {ACT_C_GOLDEN_FIXTURE,actCGoldenText} from './helpers/m01-act-c-golden.js';
import act from '../missions/m01-tczew/areas/np/act-vii-c.json' with {type:'json'};
import actB from '../missions/m01-tczew/areas/np/act-vii-b.json' with {type:'json'};
import layout from '../missions/m01-tczew/areas/np/layout.json' with {type:'json'};
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};

// R4 INC-3 (2026-11-04): Act VII-c «Ordem ~17:00 e retirada» (docs/direction/M01_R4_VII_BC_DESIGN.md §3, features F6, F7, F8 complete, F9). Not a playtest: deterministic checks of its data, its cards, its courier,
// its two sets of bounds, its end, its light, its saves, its text and its chain with VII-b. The routes (pilots x levels x seeds) are in tests/m01-act-vii-c-routes.test.js.
const ID='act_vii_c_withdrawal',strip=s=>JSON.parse(JSON.stringify(s));
const newSim=(seed=19390901,difficulty='soldado')=>new M01AreaSimulation(seed,{difficulty,actId:ID});
/** A save made at this very moment (the live snapshot, with the checkpoint it resumes inside it), in the schema 3 envelope: what the browser spec stores. runner.envelope(sim) is the last CHECKPOINT. */
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
const pastCards=sim=>{for(let i=0;i<80&&sim.scene;i++)sim.tick(ACT_C_TICK,{skip:true});assert.equal(sim.scene,null);return sim;};
const driveTo=(sim,done,mode='prompt',max=30000)=>{const state={};for(let i=0;i<max&&!done(sim);i++){sim.tick(ACT_C_TICK,actCControls(sim,mode,state));sim.drainEvents();}assert.ok(done(sim),'the moment was reached');return sim;};
const CP_J='cp_npc_j_ordem',CP_K='cp_npc_k_retirada';

test('the data of VII-c: a valid plan with a withdrawal and no assault, a courier, three teams of the line, a rear guard, an exit band inside the slice, CP-J by a card and CP-K by a flag',()=>{
  const plan=areaActPlan(ID);
  assert.equal(plan.actId,ID);assert.equal(AREA_ACTS[ID].layout,layout,'the same slice as VII-a and VII-b: layout.json is not changed');assert.deepEqual(Object.keys(AREA_ACTS),['act_vii_a_north','act_vii_b_north_day',ID]);
  assert.equal(plan.assault,null);assert.equal(plan.barrages,null);assert.equal(plan.medics,null,'nobody on the other side, no shell, no bearer');
  const W=plan.withdrawal;assert.ok(W);
  assert.deepEqual(W.ids.line,['pl_np_4','pl_np_5','pl_np_6','ckm_gunner','ckm_loader','pl_np_3','pl_np_0','pl_np_1','pl_np_2'],'the line\'s seven riflemen and the ckm crew, in three teams');
  assert.deepEqual(W.ids.rear,['staszek_pawlak','szymon_kowal','marek_zielinski'],'the rear guard is the section, its leader last');
  assert.deepEqual(plan.squad.teams,[['marek_zielinski'],['staszek_pawlak'],['szymon_kowal']],'the section goes up leader first');
  assert.equal(W.line.teams.length,3);assert.equal(W.line.moves.length,6,'three teams, two bounds each');assert.equal(W.rear.moves.length,6);
  assert.deepEqual(plan.waveTrigger,{type:'order',note:act.events.find(e=>e.id==='evt_npc_order').trigger.note});assert.equal(plan.waveAt,null);
  assert.deepEqual(act.checkpoints.map(c=>[c.id,c.label]),[[CP_J,'CP-J'],[CP_K,'CP-K']]);assert.deepEqual(act.checkpoints[0].trigger,{type:'sceneEnd',scene:'cs_npc_dusk'});
  assert.deepEqual(plan.triggers,[{id:CP_K,type:'flag',flag:'m01npc.lineOut'}],'CP-K is taken in the tick the line is out');
  assert.equal(areaRoster(plan).length,3+7+2+1,'the roster: the section, the line, the ckm crew, the courier');assert.equal(areaRoster(plan).at(-1),'np_mensageiro');
  assert.equal(plan.clockStart,19*3600);assert.equal(act.clock.label,'ANOITECER');assert.deepEqual(act.clock.sun.keyframes,[{clock:'18:39',altitudeDeg:-0.9,azimuthDeg:286},{clock:'19:00',altitudeDeg:-3.8,azimuthDeg:290},{clock:'19:16',altitudeDeg:-6,azimuthDeg:293}]);
  // the exit band is the SW corner of the slice, inside `playable`; every final slot of both squads is inside it with room to spare, and nobody shares a slot
  const pb=layout.bounds.playable,e=W.exit;
  assert.deepEqual(e,{minX:-600,maxX:-560,minZ:-1068,maxZ:-1056});assert.ok(e.minX>=pb.minX&&e.maxX<=pb.maxX&&e.minZ>=pb.minZ&&e.maxZ<=pb.maxZ&&e.maxZ<=-1050,'inside the playable area, z <= -1050');
  const finals=[...Object.entries(W.line.posts.at(-1).slots),...Object.entries(W.rear.posts.at(-1).slots)];assert.equal(finals.length,12);
  for(const [id,[x,z]] of finals)assert.ok(inBand(e,{x,z},.95),`${id} at least 0.95 m inside the band`);
  for(let i=0;i<finals.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(finals[i][1][0]-finals[j][1][0],finals[i][1][1]-finals[j][1][1])>=1.3,`${finals[i][0]} and ${finals[j][0]} do not share a slot`);
  assert.ok(Math.hypot(W.messenger.to[0]-layout.points.command_post.x,W.messenger.to[1]-layout.points.command_post.z)<1e-9,'the courier brings the order to the command post of the layout');
  // a start with nobody on the other side: no German anywhere, no wave
  const sim=newSim();assert.equal(sim.enemies.length,0);assert.equal(sim.timers.wave,null);assert.equal(sim.flags['m01np.wave'],undefined);assert.equal(sim.flags['m01npc.wave'],undefined);
  assert.deepEqual(sim.actors.filter(a=>!a.active).map(a=>a.id),['np_mensageiro'],'the courier waits off the field');
  assert.equal(sim.actor('np_mensageiro').essential,true);assert.equal(sim.actor('np_mensageiro').role,'RIFLEMAN');assert.deepEqual(Object.keys(sim.timers).filter(k=>['withdrawal','line','rear','squad','barrage','medics'].includes(k)).sort(),['line','rear','squad','withdrawal']);
  // where the crew of the ckm stands when the act opens is exactly the stage of the line's squad plan for them
  for(const [id,p] of Object.entries(ckmCrewStage(plan.ckm.root,['ckm_gunner','ckm_loader'])))assert.deepEqual([sim.actor(id).x,sim.actor(id).z],[p.x,p.z],id);
  for(const id of W.ids.line)assert.deepEqual([sim.actor(id).x,sim.actor(id).z],[W.lineStage[id].x,W.lineStage[id].z],`${id} starts at his stage slot`);
  for(const id of W.ids.rear)assert.deepEqual([sim.actor(id).x,sim.actor(id).z],[plan.stageSlots[id].x,plan.stageSlots[id].z],`${id} starts at the command post`);
});

test('F1 profile of VII-c; D-5 is left out: the probe flag is in the data and is refused when true; a typo in the withdrawal stops the game instead of changing it',()=>{
  const p=areaActPlan(ID).profile;
  assert.deepEqual({...p},{label:'VII-c',phasePrefix:'NPC',flagPrefix:'m01npc',markerLabel:'Parapeito',marker:'trench_post',entryCard:'cs_npc_dusk',endCard:'cs_npc_end',arrivalObjective:'obj_npc_cover',holdObjective:'obj_npc_withdraw',
    coverObjective:null,cardEndEvent:'evt_npc_card_end',waveEvent:'evt_npc_order',arrivalCheckpoint:CP_J,statusLabel:'Retirada',repelledText:'Retirada concluída',ordinals:false,arrivalNeedsReserve:false});
  assert.deepEqual(Object.keys(PROFILE_DEFAULTS).filter(k=>!(k in act.profile)),[],'every key of the profile is given');
  assert.deepEqual(act.withdrawal.probe.enabled,false);assert.match(act.withdrawal.probe.note,/D-5/);assert.deepEqual(areaActPlan(ID).withdrawal.probe,{enabled:false});
  const planOf=mutate=>{const x=strip(act);mutate(x);return areaPlanOf(ID,{layout,act:x});};
  assert.ok(planOf(()=>{}));
  const cases=[
    ['the probe turned on',x=>{x.withdrawal.probe.enabled=true;},/probe\.enabled: D-5/],['the probe that is not an object',x=>{x.withdrawal.probe=true;},/probe: \{enabled: false, note\}/],
    ['an assault AND a withdrawal',x=>{x.groups.push(strip(actB.groups.find(g=>g.id==='grp_np_de')));},/an assault \(grp_np_de\) or a withdrawal/],['neither',x=>{delete x.withdrawal;},/an assault \(grp_np_de\) or a withdrawal|trigger is battleClock or barrageEnd/],
    ['a stray key',x=>{x.withdrawal.pursuit={};},/unknown key pursuit/],['an exit band outside the slice',x=>{x.withdrawal.exit.minX=-700;},/exit \{minX/],['an exit band too small',x=>{x.withdrawal.exit.maxX=-585;},/at least 20 x 6/],
    ['an exit band beyond the south edge',x=>{x.withdrawal.exit.maxZ=-1040;},/exit \{minX/],['a courier that is not np_...',x=>{x.withdrawal.messenger.id='mensageiro';},/messenger\.id \(np_/],
    ['a courier who starts at the command post',x=>{x.withdrawal.messenger.from=[-425,-1105];},/at least 10 m apart/],['a courier outside the slice',x=>{x.withdrawal.messenger.from=[-700,-1056];},/messenger from \/ to/],
    ['a courier slower than a walk',x=>{x.withdrawal.messenger.pace=.5;},/pace 1-8/],['a man missing from the line',x=>{x.withdrawal.line.teams[0].pop();},/line: its teams are exactly/],
    ['a man twice in the line',x=>{x.withdrawal.line.teams[1].push('pl_np_4');},/a man in two teams/],['the leader missing from the rear',x=>{x.withdrawal.rear.teams=[['staszek_pawlak'],['szymon_kowal']];x.withdrawal.rear.moves=x.withdrawal.rear.moves.filter(m=>m.team<2);},/rear: its teams are exactly/],
    ['a final slot outside the band',x=>{x.withdrawal.line.posts[2].slots.pl_np_0=[-560.2,-1064];},/inside the exit band/],['a final slot outside the area',x=>{x.withdrawal.rear.posts[2].slots.szymon_kowal=[-700,-1059];},/outside the area/],
    ['two men on one slot',x=>{x.withdrawal.line.posts[1].slots.pl_np_1=[-490.2,-1126.4];},/less than 1\.3 m apart/],['two men on one slot in the band, line and rear',x=>{x.withdrawal.rear.posts[2].slots.szymon_kowal=[-597,-1064.5];},/less than 1\.3 m apart/],
    ['a team that never reaches the exit',x=>{x.withdrawal.line.moves.pop();},/last move goes to the last post/],['a bound with two triggers',x=>{x.withdrawal.line.moves[0].afterArrivalSec=1;},/exactly one of/],
    ['no grace for a man who is stuck',x=>{delete x.withdrawal.outGraceSec;},/outGraceSec/],['a call that is never made',x=>{x.withdrawal.lag.distanceM=1;},/lag \{distanceM/],
    ['the order event is not an order',x=>{x.events.find(e=>e.id==='evt_npc_order').trigger={type:'battleClock',at:'19:01:00'};},/the order event trigger is \{type: order\}/],
    ['an order card that is not a card',x=>{x.cards.order.lines=[];},/cards\.order/],['an order card with no id',x=>{x.cards.order.id='';},/cards\.order/],
    ['a barrage in an act with no assault',x=>{x.barrages=strip(actB.barrages);},/barrages and medics belong to an act with an assault/],
    ['CP-K on an echelon that does not exist',x=>{x.checkpoints[1].trigger={type:'echelonBroken',echelon:0};},/echelonBroken: the index of an echelon that another follows/],
    ['CP-K on a flag of another act',x=>{x.checkpoints[1].trigger={type:'flag',flag:'m01npb.lineOut'};},/flag: a flag of the act/],
    ['a section whose squads do not move its leader',x=>{const sq=x.groups.find(g=>g.id==='grp_np_section').squad;sq.teams=[['staszek_pawlak'],['szymon_kowal']];sq.moves=sq.moves.filter(m=>m.team<2);x.withdrawal.rear.teams=[['staszek_pawlak'],['szymon_kowal']];x.withdrawal.rear.moves=x.withdrawal.rear.moves.filter(m=>m.team<2);},/moves its leader too/],
  ];
  for(const [name,mutate,re] of cases)assert.throws(()=>planOf(mutate),re,name);
  // the plan builder alone, with the context it is given
  const pb=layout.bounds.playable,ctx=areaActPlan(ID),build=(mutate)=>{const w=strip(act.withdrawal);mutate(w);return makeWithdrawalPlan(w,{playable:pb,label:'t',lineIds:ctx.withdrawal.ids.line,lineStage:ctx.withdrawal.lineStage,section:ctx.squad});};
  assert.ok(build(()=>{}));assert.throws(()=>makeWithdrawalPlan(null,{playable:pb,lineIds:[],lineStage:{},section:ctx.squad}),/an object, or leave it out/);
  assert.throws(()=>build(w=>{delete w.line;}),/./);assert.throws(()=>build(w=>{w.lag.afterSec=-1;}),/lag \{distanceM/);
});

test('F7: the order card and then «Ao anoitecer»; the area appears only behind the second; CP-J is taken when the second ends; the courier waits off the field until then; the HUD shows the label and no hour',()=>{
  const sim=newSim();
  assert.equal(sim.scene.id,'cs_npc_order');assert.equal(sim.scene.card.kind,'order');assert.equal(sim.mission.phase,'NPC_ENTRY');assert.equal(sim.clockLabel,'ANOITECER');assert.equal(sim.objectiveMarker,null,'no marker under a card');
  assert.deepEqual(sim.scene.card.lines,act.cards.order.lines);assert.equal(sim.scene.card.lines[0],'Por volta das 17:00');assert.equal(sim.scene.card.seconds,9);assert.deepEqual(sim.sceneDone,[]);
  sim.tick(ACT_C_TICK,{});sim.tick(ACT_C_TICK,{skip:true});assert.equal(sim.scene.id,'cs_npc_order','the card cannot be skipped in its first 0.6 s');
  // the order card is black through to its end; the entry card lets the area appear in its last 1.2 s
  assert.equal(actCardFrame({id:'cs_npc_order',elapsed:0,card:{kind:'order',lines:['a'],seconds:9}}).black,1);assert.equal(actCardFrame({id:'cs_npc_order',elapsed:8.9,card:{kind:'order',lines:['a'],seconds:9}}).black,1);
  assert.equal(actCardFrame({id:'cs_npc_dusk',elapsed:2,card:{kind:'entry',lines:['a'],seconds:6}}).black,1);assert.equal(actCardFrame({id:'cs_npc_dusk',elapsed:6,card:{kind:'entry',lines:['a'],seconds:6}}).black,0);
  assert.deepEqual(cinematicFrame({id:'cs_npc_order',elapsed:3,card:{kind:'order',lines:['a'],seconds:9}}),actCardFrame({id:'cs_npc_order',elapsed:3,card:{kind:'order',lines:['a'],seconds:9}}));
  for(let i=0;i<20&&sim.scene?.id==='cs_npc_order';i++)sim.tick(ACT_C_TICK,{skip:true});
  assert.equal(sim.scene.id,'cs_npc_dusk');assert.equal(sim.scene.card.kind,'entry');assert.deepEqual(sim.sceneDone,['cs_npc_order']);assert.deepEqual(sim.checkpointsReached,[],'CP-J is not taken at the end of the order card');
  assert.equal(sim.timers.withdrawal.messenger,'idle');assert.equal(sim.actor('np_mensageiro').active,false);assert.equal(sim.objectives.obj_npc_cover.state,'locked');
  for(let i=0;i<10;i++)sim.tick(ACT_C_TICK,{});assert.equal(sim.timers.withdrawal.messenger,'idle','under the cards nobody moves');
  for(let i=0;i<30&&sim.scene;i++)sim.tick(ACT_C_TICK,{skip:true});
  assert.equal(sim.scene,null);assert.deepEqual(sim.sceneDone,['cs_npc_order','cs_npc_dusk']);assert.deepEqual(sim.checkpointsReached,[CP_J]);assert.equal(sim.respawn.label,'CP-J');assert.equal(sim.mission.phase,'NPC_ARRIVAL');
  assert.equal(sim.objectives.obj_npc_cover.state,'active');assert.equal(sim.mission.text,'Cubra a saída da linha');assert.equal(sim.objectiveMarker.label,'Parapeito');assert.deepEqual([sim.objectiveMarker.x,sim.objectiveMarker.z],[-410,-1159.2]);
  assert.ok(sim.drainEvents().some(e=>e.type==='checkpoint'&&e.id===CP_J));assert.ok([sim.subtitle,...sim.dialogueQueue].some(d=>/esperamos ordens do batalhão/.test(d?.text??'')),'Zieliński says to wait for the battalion');
  assert.equal(sim.timers.withdrawal.messenger,'walking','the courier is on his way from the first tick after the card');assert.equal(sim.actor('np_mensageiro').active,true);
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);validateAreaSnapshot(strip(sim.checkpoint),sim.plan);
  // after a restore to CP-J the courier is off the field again and the card of the order is not shown again
  const r=newSim();pastCards(r);driveTo(r,s=>s.timers.withdrawal.messenger==='speaking');r.player.alive=false;r.player.health=0;r.playerDown('bounds');r.tick(ACT_C_TICK,{});
  assert.ok(r.drainEvents().some(e=>e.type==='restored'));assert.equal(r.respawn.label,'CP-J');assert.equal(r.scene,null);assert.equal(r.timers.withdrawal.messenger,'idle');assert.equal(r.actor('np_mensageiro').active,false);assert.deepEqual(r.sceneDone,['cs_npc_order','cs_npc_dusk']);
});

test('F8: the light of the act comes from its data (18:39, 19:00, 19:16) and only in this act; at 19:00 the model is the blue hour with the sun to the west-northwest; the light never goes below the blue hour',()=>{
  const bw=new TczewWorld(),a=new M01AreaWorld(layout,{}),b=new M01AreaWorld(layout,{sun:actB.clock.sun}),c=new M01AreaWorld(layout,{sun:act.clock.sun});
  assert.deepEqual(a.layout.sun,bw.layout.sun,'VII-a: map-layout\'s sun, exactly');assert.equal(bw.layout.sun.keyframes.length,7,'map-layout.json is not changed');assert.equal(b.layout.sun.keyframes.length,1,'VII-b: one keyframe, 13:00');
  assert.deepEqual(c.layout.sun.keyframes,act.clock.sun.keyframes);assert.equal(c.layout.sun.source,'C01 (método)');
  for(const clock of [4*3600+30*60,4*3600+34*60,6*3600+10*60,7*3600+5*60,7*3600+5*60+10])assert.deepEqual(sunState(a.layout.sun.keyframes,clock),sunState(bw.layout.sun.keyframes,clock),'VII-a and the current act share one sun');
  assert.equal(newSim().world.layout.sun.keyframes.length,3);assert.equal(new M01AreaSimulation().world.layout.sun.keyframes.length,7,'a VII-a world keeps the current act\'s sun');
  assert.equal(new M01AreaSimulation(1,{actId:'act_vii_b_north_day'}).world.layout.sun.keyframes.length,1);
  // 19:00: -3.8 deg at 290 deg, the blue-hour anchor, a key light that is not pitch black
  const s=sunState(c.layout.sun.keyframes,19*3600);assert.ok(Math.abs(s.altDeg+3.8)<1e-9&&Math.abs(s.azDeg-290)<1e-9,`${s.altDeg} ${s.azDeg}`);
  const m=lightingModel(s.altDeg,s.azDeg);assert.equal(m.phase,'blue-hour');assert.equal(phaseAt(s.altDeg),'blue-hour');
  assert.ok(m.sun.keyDir[0]<-.5&&m.sun.keyDir[2]<0,'the sun is in the west (x < 0), a little to the north (z < 0): the direction of the game space');
  assert.ok(Math.abs(s.dir[0]-Math.sin(290*Math.PI/180)*Math.cos(3.8*Math.PI/180))<1e-9&&s.dir[1]<0);
  // before 18:39 and after 19:16 the sun stays where the nearest keyframe puts it
  assert.deepEqual(sunState(c.layout.sun.keyframes,18*3600).altDeg,-0.9);assert.deepEqual(sunState(c.layout.sun.keyframes,18*3600+39*60).azDeg,286);
  assert.ok(Math.abs(sunState(c.layout.sun.keyframes,19*3600+8*60).altDeg-(-4.9))<1e-9,'half-way to 19:16');assert.deepEqual(sunState(c.layout.sun.keyframes,20*3600).altDeg,-6);
  // night legibility: the lighting model has no anchor below the blue hour, so the light at 19:16 and after is the blue hour's (the key light, the sky light and the exposure do not fall)
  const late=lightingModel(-6,293);for(const [k,v] of [['sun',m.sun.intensity],['hemi',m.hemi.intensity],['exposure',m.exposure]])assert.equal(k==='sun'?late.sun.intensity:k==='hemi'?late.hemi.intensity:late.exposure,v,`${k} at 19:16 is the blue hour's`);
  assert.ok(late.hemi.intensity>=1.3&&late.exposure>=1.3&&late.sun.intensity>=.9,'the sky light and the exposure that make the dawn of 04:30 playable');assert.equal(late.phase,'blue-hour');assert.ok(keyElevationDeg(-6)>=11&&keyElevationDeg(-6)<12,'the key light keeps its twilight floor (11.4 deg: the floor of 12 deg less a quarter of a degree per degree of the sun below the dawn\'s -3.7)');
  // the whole act, minutes of it, lies between the keyframes of 19:00 and 19:16
  const sim=newSim();assert.equal(sim.battleClock,19*3600);const r=actCRoute(sim,{mode:'laggard',maxSec:900});assert.ok(r.complete);assert.ok(sim.battleClock<19*3600+16*60,'the act ends before 19:16 internal');
});

test('F7: the courier — off the field, then walking from the SW corner to the command post at his pace; on arrival the order (flag, event, two lines in the right mouths), a few seconds of speech, and back where he came from',()=>{
  const sim=pastCards(newSim()),W=sim.plan.withdrawal,M=W.messenger,R=sim.timers.withdrawal,m=sim.actor(M.id),z=sim.actor('marek_zielinski');
  const walk=Math.hypot(M.to[0]-M.from[0],M.to[1]-M.from[1])/M.pace,t0=sim.clock;
  assert.ok(Math.hypot(m.x-M.from[0],m.z-M.from[1])<=M.pace*ACT_C_TICK*2,'he has just left the corner');let nearest=Infinity;const said=[];const say=sim.say.bind(sim);sim.say=on=>{const r=say(on);if(r)said.push([on,sim.clock]);return r;};
  for(let i=0;i<4000&&R.messenger==='walking';i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();for(const id of W.ids.rear){const a=sim.actor(id);nearest=Math.min(nearest,Math.hypot(a.x-m.x,a.z-m.z));}}
  assert.equal(R.messenger,'speaking');assert.ok(Math.abs(sim.clock-t0-walk)<=ACT_C_TICK*2,`he arrives ${walk.toFixed(2)} s after the card (${(sim.clock-t0).toFixed(2)})`);
  assert.ok(Math.hypot(m.x-M.to[0],m.z-M.to[1])<.06);assert.equal(R.orderAt,sim.clock);assert.equal(R.since,R.orderAt);assert.equal(sim.flags['m01npc.order'],true);assert.ok(sim.consumedEvent('evt_npc_order'));assert.equal(sim.mission.phase,'NPC_ORDER');
  assert.deepEqual(said.map(x=>x[0]),['order_given','order_section'],'the courier first, then Zieliński');assert.ok(nearest>=1.5,`the courier does not walk through the section (${nearest.toFixed(2)} m)`);
  const first=sim.subtitle??sim.dialogueQueue[0];assert.equal(first.speaker,'Mensageiro');assert.match(first.text,/^Ordem do comandante do batalhão/);
  assert.ok(Math.abs(m.facing-Math.atan2(z.z-m.z,z.x-m.x))<1e-9,'he faces Zieliński, who faces him');
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);
  const spoke=sim.clock;for(let i=0;i<400&&R.messenger==='speaking';i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();}
  assert.equal(R.messenger,'leaving');assert.ok(Math.abs(sim.clock-spoke-M.speakSec)<=ACT_C_TICK*2+1e-9);assert.equal(m.active,true);
  for(let i=0;i<4000&&R.messenger==='leaving';i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();}
  assert.equal(R.messenger,'gone');assert.equal(m.active,false);assert.ok(Math.hypot(m.x-M.from[0],m.z-M.from[1])<=.06,'back at the corner he came from (within 5 cm)');assert.equal(R.orderAt,spoke,'the order was given when he arrived');
});

test('F6: the section goes up to the parapet with the order (the leader first, then Pawlak, then Kowal) and kneels there facing north; nothing moves before the order',()=>{
  const sim=pastCards(newSim()),P=sim.plan,R=sim.timers.withdrawal;
  const at=id=>[sim.actor(id).x,sim.actor(id).z];const stage={...P.stageSlots};
  for(let i=0;i<400&&R.orderAt===null;i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();for(const id of P.squad.teams.flat())assert.deepEqual(at(id),[stage[id].x,stage[id].z],`${id} waits at the command post before the order`);}
  assert.equal(R.orderAt,null,'the courier has not arrived yet') ;
  driveTo(sim,s=>s.timers.withdrawal.orderAt!==null);const order=R.orderAt;
  const left={};for(let i=0;i<2000;i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();for(const id of P.squad.teams.flat())if(left[id]===undefined&&Math.hypot(sim.actor(id).x-stage[id].x,sim.actor(id).z-stage[id].z)>.01)left[id]=sim.clock-order;
    if(sim.timers.squad.move>=3&&!sim.timers.squad.moving&&P.squad.teams.flat().every(id=>Math.hypot(sim.actor(id).x-P.squad.posts[1].slots[id][0],sim.actor(id).z-P.squad.posts[1].slots[id][1])<=.05))break;}
  assert.ok(left.marek_zielinski>=1.5&&left.marek_zielinski<2,`the leader goes 1.5 s after the order (${left.marek_zielinski})`);assert.ok(left.staszek_pawlak>left.marek_zielinski&&left.szymon_kowal>left.staszek_pawlak,'then Pawlak, then Kowal');
  sim.tick(ACT_C_TICK,{});sim.drainEvents();   // the tick after the last man arrived: he kneels
  for(const id of P.squad.teams.flat()){const a=sim.actor(id);assert.ok(Math.hypot(a.x-P.squad.posts[1].slots[id][0],a.z-P.squad.posts[1].slots[id][1])<=.05,`${id} at his place on the parapet (within 5 cm)`);assert.equal(a.crouched,true,`${id} kneels`);assert.equal(a.facing,-Math.PI/2,`${id} faces north`);assert.equal(a.atPost,true);}
  assert.ok(P.squad.posts[1].slots.marek_zielinski[1]===-1159.2&&Math.abs(P.squad.posts[1].slots.szymon_kowal[0])>0,'the places are the parapet\'s of VII-a and VII-b');
});

test('F6: the line and the ckm crew leave by bounds — three teams, two bounds each, the others kneeling where they were; the crew is on its retreat phase from its first step; each man leaves the field in the exit band; CP-K when the last is out',()=>{
  const sim=pastCards(newSim(19390901,'recruta')),W=sim.plan.withdrawal,R=sim.timers.withdrawal,cps=[],said=[];
  const emit=sim.emit.bind(sim);sim.emit=e=>{if(e.type==='checkpoint')cps.push([e.id,sim.clock,R.lineOutAt]);emit(e);};const say=sim.say.bind(sim);sim.say=on=>{const r=say(on);if(r)said.push([on,sim.clock]);return r;};
  const stage=W.lineStage,moved=id=>Math.hypot(sim.actor(id).x-stage[id].x,sim.actor(id).z-stage[id].z)>.01,left={},outAt={},clip=areaClippingAudit(),stack=stackingAudit();
  const state={};let kneeling=true;
  for(let i=0;i<30000&&R.lineOutAt===null;i++){
    sim.tick(ACT_C_TICK,actCControls(sim,'prompt',state));sim.drainEvents();clip.observe({sim});stack.observe({sim});
    for(const id of W.ids.line){if(left[id]===undefined&&moved(id))left[id]=sim.clock;if(outAt[id]===undefined&&R.out.includes(id))outAt[id]=sim.clock;}
    // before the first man leaves, the whole line kneels at its posts (the others cover)
    if(left.pl_np_4===undefined)kneeling&&=sim.plan.line.men.every(id=>sim.actor(id).crouched);
  }
  assert.ok(kneeling,'the line kneels at its posts until the first bound');
  assert.ok(left.pl_np_4===left.pl_np_5&&left.pl_np_5===left.pl_np_6,'team 1 (the east wing) goes together');assert.ok(left.ckm_gunner===left.pl_np_3&&left.ckm_loader===left.ckm_gunner,'team 2 (the ckm crew and the man of the centre) together');
  assert.ok(left.pl_np_0===left.pl_np_1&&left.pl_np_1===left.pl_np_2,'team 3 (the west wing) together');assert.ok(left.pl_np_4<left.ckm_gunner&&left.ckm_gunner<left.pl_np_0,'in order: east wing, crew, west wing');
  assert.ok(Math.abs(left.pl_np_4-R.orderAt-3)<=ACT_C_TICK+1e-9,'the first bound goes 3 s after the order');assert.ok(said.some(([on,t])=>on==='line_go'&&Math.abs(t-left.pl_np_4)<=ACT_C_TICK+1e-9),'«Primeira equipa, lanço!» when it starts');
  assert.ok(left.ckm_gunner-left.pl_np_4<=W.line.stallSec+.2&&left.pl_np_0-left.ckm_gunner<=W.line.stallSec+.2,'a team starts after the one before it has arrived or after stallSec at the most');
  // while the east wing is on the way, nobody else has moved
  assert.deepEqual(Object.keys(outAt).sort(),[...W.ids.line].sort(),'every man of the line left the field');assert.equal(R.out.length,9);
  for(const id of W.ids.line){const a=sim.actor(id);assert.equal(a.active,false);assert.ok(a.alive);assert.ok(inBand(W.exit,a),`${id} left the field inside the exit band`);assert.ok(Math.hypot(a.x-W.line.posts[2].slots[id][0],a.z-W.line.posts[2].slots[id][1])<=W.line.arriveM+1e-9,`${id} left within arriveM of his slot`);}
  assert.equal(R.lineOutAt,sim.clock);assert.equal(R.lineOutAt,Math.max(...Object.values(outAt)));assert.equal(sim.flags['m01npc.lineOut'],true);assert.equal(sim.mission.phase,'NPC_REAR');
  assert.equal(sim.objectives.obj_npc_cover.state,'done');assert.equal(sim.objectives.obj_npc_withdraw.state,'active');assert.equal(sim.mission.text,'Recue com a secção até à saída');assert.equal(sim.objectiveMarker.label,'Saída');assert.deepEqual([sim.objectiveMarker.x,sim.objectiveMarker.z],[-580,-1062]);
  assert.equal(sim.mission.status,'Retirada · a secção recua por lanços');assert.ok(said.some(([on])=>on==='line_out'));
  assert.deepEqual(cps.map(c=>c[0]),[CP_K],'(CP-J was taken before the wrapper was put on, at the end of the dusk card)');assert.equal(cps[0][1],R.lineOutAt,'CP-K in the tick the line is out');assert.equal(sim.respawn.label,'CP-K');assert.deepEqual(sim.checkpointsReached,[CP_J,CP_K]);
  // the ckm crew: on its retreat phase from its first step (the gun is drawn in its abandoned pose, the crew walks), never before; the gun stays visible at the nest
  for(const id of ['ckm_gunner','ckm_loader'])assert.equal(sim.actor(id).ckm.phase,'retreat',id);assert.ok(Math.abs(sim.actor('ckm_gunner').ckm.startedAt-left.ckm_gunner)<=ACT_C_TICK+1e-9);assert.equal(sim.actor('ckm_gunner').ckm.visible,true);
  assert.deepEqual(clip.report(),[],'no clipping');assert.equal(stack.summary().pairs,0,'no men inside each other');
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);validateAreaSnapshot(strip(sim.checkpoint),sim.plan);
});

test('F6: the rear guard — it leaves only when the line is out and the section stands at the parapet, Pawlak first and Zieliński last, by bounds to the band; the act ends when the player is in the band and the rear guard is out, not before',()=>{
  const sim=pastCards(newSim(19390901,'recruta')),W=sim.plan.withdrawal,R=sim.timers.withdrawal;
  // the section is at the parapet well before the line is out; the rear guard goes after, 2 s after the line (rear.moves[0].orderAfterSec)
  driveTo(sim,s=>s.timers.withdrawal.lineOutAt!==null);assert.ok(sim.sectionAtParapet(),'at the parapet when the line is out');assert.equal(R.rearGoAt,R.lineOutAt,'the rear guard is on when the line is out');
  const hold={};for(const id of W.ids.rear){const a=sim.actor(id);hold[id]=[a.x,a.z];}
  const left={};
  for(let i=0;i<3000&&R.rearOutAt===null;i++){
    sim.tick(ACT_C_TICK,actCControls(sim,'prompt',{}));sim.drainEvents();
    for(const id of W.ids.rear){const a=sim.actor(id);if(left[id]===undefined&&Math.hypot(a.x-hold[id][0],a.z-hold[id][1])>.01)left[id]=sim.clock;}
    if(R.rearOutAt!==null)break;
    if(R.exitedAt!==null)break;
    // the player is in the band (the prompt pilot runs there) but the rear guard is not out: the act does not end
    if(inBand(W.exit,sim.player))assert.equal(R.exitedAt,null,'the player in the band does not end the act while the rear guard is on the field');
  }
  assert.ok(left.staszek_pawlak>=R.lineOutAt+2-ACT_C_TICK&&left.staszek_pawlak<R.lineOutAt+2+ACT_C_TICK*2,'Pawlak leaves 2 s after the line is out');assert.ok(left.staszek_pawlak<left.szymon_kowal&&left.szymon_kowal<left.marek_zielinski,'Pawlak, Kowal, Zieliński');
  assert.deepEqual(R.out.slice(-3).sort(),[...W.ids.rear].sort());assert.equal(R.out.at(-1),'marek_zielinski','the leader is the last man out');assert.equal(R.rearOutAt,sim.clock);
  // the end: the player in the band, the rear guard out
  assert.equal(R.exitedAt,sim.clock,'the prompt pilot is already in the band: the act ends in the very tick the rear guard is out');assert.equal(sim.flags['m01npc.exited'],true);assert.equal(sim.objectives.obj_npc_withdraw.state,'done');assert.equal(sim.mission.phase,'NPC_EXIT');assert.equal(sim.mission.status,'');
  assert.ok(!sim.mission.complete&&sim.timers.endAt===sim.clock+sim.plan.act.endBeatSec,'the end beat');assert.equal(sim.mission.text,'Retirada concluída');assert.equal(sim.objectiveMarker,null);
  for(let i=0;i<200&&!sim.scene;i++){sim.tick(ACT_C_TICK,{});sim.drainEvents();}
  assert.equal(sim.scene.id,'cs_npc_end');assert.equal(sim.scene.card.kind,'end');assert.deepEqual(sim.scene.card.lines,act.cards.end.lines);
  for(let i=0;i<400&&!sim.mission.complete;i++){sim.tick(ACT_C_TICK,{skip:true});sim.drainEvents();}
  assert.equal(sim.mission.complete,true);assert.equal(sim.mission.phase,'NPC_END');assert.equal(sim.flags['m01npc.completed'],true);
  // a player who is NOT in the band when the rear guard is out ends the act when he gets there, not before
  const slow=pastCards(newSim());driveTo(slow,s=>s.timers.withdrawal.rearOutAt!==null,'laggard');const SR=slow.timers.withdrawal;
  assert.equal(SR.exitedAt,null);assert.ok(!inBand(W.exit,slow.player));for(let i=0;i<200;i++){slow.tick(ACT_C_TICK,{});slow.drainEvents();}assert.equal(SR.exitedAt,null,'standing away from the band, the act waits');assert.ok(!slow.mission.complete);
  Object.assign(slow.player,{x:-580,z:-1062});slow.tick(ACT_C_TICK,{});assert.equal(SR.exitedAt,slow.clock,'one tick after he enters the band');
  // he cannot end it by being in the band while the line is still leaving (the exit has nothing to do with the objective of the line)
  const early=pastCards(newSim());driveTo(early,s=>s.timers.withdrawal.orderAt!==null);Object.assign(early.player,{x:-580,z:-1062});for(let i=0;i<100;i++){early.tick(ACT_C_TICK,{});early.drainEvents();}
  assert.equal(early.timers.withdrawal.exitedAt,null);assert.equal(early.objectives.obj_npc_withdraw.state,'locked');
});

test('the call to a man who lags: Pawlak calls when the player is more than 50 m behind the last man of the rear guard, with the line\'s own rest; nobody fails and nothing is restored',()=>{
  const said=[];const mk=()=>{const s=pastCards(newSim());const say=s.say.bind(s);s.say=on=>{const r=say(on);if(r)said.push([on,s.clock]);return r;};return s;};
  // a player who goes with the rear guard is never called
  const near=mk();said.length=0;actCRoute(near,{mode:'prompt',maxSec:900});assert.equal(said.filter(([on])=>on==='lag').length,0,'with the section: no call');
  // one who stays at the spawn is called, again after the cooldown, and the act waits for him
  said.length=0;const far=mk();const r=actCRoute(far,{mode:'laggard',maxSec:900});assert.equal(r.deaths,0);assert.ok(r.complete);
  const calls=said.filter(([on])=>on==='lag').map(x=>x[1]);assert.ok(calls.length>=1,'called at least once');
  for(let i=1;i<calls.length;i++)assert.ok(calls[i]-calls[i-1]>=25-1e-9,'not more often than the cooldown of the line');
  assert.ok(calls[0]>=far.timers.withdrawal.rearGoAt+far.plan.withdrawal.lag.afterSec-1e-9,'not before afterSec');
  assert.equal(far.actor('staszek_pawlak').alive,true);assert.equal(far.player.alive,true);assert.equal(far.respawn.label,'CP-K','the checkpoints are the arrival\'s and the line\'s: a lagging player loses nothing');
});

test('the bounds still apply: a player who walks out of the slice for 8 s dies of it and the act returns to CP-J (before the line is out) or CP-K (after): the men who left the field stay out',()=>{
  const sim=pastCards(newSim());driveTo(sim,s=>s.timers.withdrawal.orderAt!==null&&s.clock>s.timers.withdrawal.orderAt+10);
  const before=sim.timers.withdrawal.out.length;assert.equal(before,0);sim.player.x=-700;const causes=[];
  for(let i=0;i<260&&sim.player.alive;i++){sim.tick(ACT_C_TICK,{});for(const e of sim.drainEvents())if(e.type==='player-down')causes.push(e.cause);}
  assert.deepEqual(causes,['bounds']);assert.equal(sim.player.alive,false);sim.tick(ACT_C_TICK,{});assert.ok(sim.drainEvents().some(e=>e.type==='restored'));assert.equal(sim.respawn.label,'CP-J');assert.equal(sim.timers.withdrawal.orderAt,null,'back before the order');
  // after the line is out
  const k=pastCards(newSim());driveTo(k,s=>s.timers.withdrawal.lineOutAt!==null);const out=[...k.timers.withdrawal.out];k.player.x=-700;
  for(let i=0;i<260&&k.player.alive;i++){k.tick(ACT_C_TICK,{});k.drainEvents();}
  assert.equal(k.player.alive,false);k.tick(ACT_C_TICK,{});assert.ok(k.drainEvents().some(e=>e.type==='restored'));assert.equal(k.respawn.label,'CP-K');assert.deepEqual(k.timers.withdrawal.out,out,'the line is still out');
  assert.equal(k.player.alive,true);assert.equal(k.timers.boundary,0);for(const id of out)assert.equal(k.actor(id).active,false);
  validateAreaSnapshot(strip(k.snapshot()),k.plan);
});

test('no stream is drawn: the main stream and every man\'s own stream are what they were at the start after a whole act, and the same route twice gives the same act, tick for tick',()=>{
  const a=newSim(),streams=a.actors.map(x=>x.ai.rng),main=a.rng.state;actCRoute(a,{mode:'prompt',maxSec:900});
  assert.equal(a.rng.state,main,'the simulation\'s main stream is not drawn');assert.deepEqual(a.actors.map(x=>x.ai.rng),streams,'the per-man streams (seeded per actor) are not drawn either');assert.equal(a.enemyFire.nextId,0,'nobody fires');
  const run=(seed,mode)=>{const s=newSim(seed);actCRoute(s,{mode,maxSec:900});return JSON.stringify(s.snapshot());};
  assert.equal(run(19390901,'prompt'),run(19390901,'prompt'));assert.equal(run(3,'laggard'),run(3,'laggard'));assert.notEqual(run(3,'prompt'),run(19390901,'prompt'),'another seed, another act (its streams)');
  // the men's trajectories do not depend on the seed or on the level: the same withdrawal every time
  const track=(seed,d)=>{const s=newSim(seed,d),out=[];actCRoute(s,{mode:'prompt',maxSec:900,onStep:x=>{if(x.tick%20===0)out.push(x.sim.actors.map(m=>[m.x,m.z,m.active]));}});return JSON.stringify(out);};
  assert.equal(track(7,'veterano'),track(19390901,'recruta'));
});

/**
 * The simulation that played up to a moment and the simulation restored from a save made there tick the same controls and stay equal: the events of every tick and the whole snapshot every `every` ticks.
 * The restored game against the ORIGINAL that went on playing (the form of tests/m01-acts.test.js for VII-a), not against a second load of the same text.
 */
function sameFuture(sim,runner,plan,ticks=900,every=3,envelope=null){
  const env=strip(envelope??live(sim));assert.equal(env.schema,3);assert.equal(env.act,ID);assert.equal(env.actSave.schema,AREA_SAVE_SCHEMA);validateAreaSnapshot(env.actSave,plan);
  const r=runner.load(JSON.stringify(env));assert.equal(r.ok,true,r.error);const copy=r.sim;
  assert.equal(JSON.stringify(copy.snapshot()),JSON.stringify(sim.snapshot()),"the restored state is the original's");
  const sa={},sb={};
  for(let i=0;i<ticks;i++){
    const ca=actCControls(sim,'prompt',sa),cb=actCControls(copy,'prompt',sb);assert.deepEqual(cb,ca,`controls at tick ${i}`);
    sim.tick(ACT_C_TICK,ca);copy.tick(ACT_C_TICK,cb);
    assert.deepEqual(copy.drainEvents(),sim.drainEvents(),`events at tick ${i}`);
    if(i%every===0)assert.equal(JSON.stringify(copy.snapshot()),JSON.stringify(sim.snapshot()),`tick ${i}`);
  }
  assert.equal(copy.mission.status,sim.mission.status);assert.deepEqual(copy.checkpointsReached,sim.checkpointsReached);
}
test('saves: a schema 3 save of VII-c restores to the same state and the same future as the game that went on playing, tick for tick — in the order card, the dusk card, at CP-J, with the courier on his way and speaking, with the section going up, in the middle of the line\'s bounds, at CP-K, in the middle of the rear guard\'s, with the rear guard out and in the end beat',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-c'}),plan=areaActPlan(ID);
  const STAGES=[
    ['in the order card',s=>s.scene?.id==='cs_npc_order'&&s.scene.elapsed>.5,200,5],
    ['in the dusk card',s=>s.scene?.id==='cs_npc_dusk',200,5],
    ['at CP-J (the card just ended)',s=>s.checkpointsReached.length===1,900,3],
    ['the courier walking',s=>s.timers.withdrawal.messenger==='walking'&&s.clock>15,900,3],
    ['the order has been given',s=>s.timers.withdrawal.messenger==='speaking',900,3],
    ['the section going up',s=>s.timers.squad.move===1&&s.timers.squad.moving,900,3],
    ['the first bound of the line',s=>s.timers.line.move===1&&s.timers.line.moving,900,3],
    ['the line\'s second bounds, five men out',s=>s.timers.withdrawal.out.length>=5&&s.timers.withdrawal.lineOutAt===null,900,3],
    ['CP-K (the line just out)',s=>s.checkpointsReached.includes(CP_K),900,3],
    ['the rear guard\'s third bound',s=>s.timers.rear.move===3&&s.timers.rear.moving,900,3],
    ['the rear guard out',s=>s.timers.withdrawal.rearOutAt!==null,900,3],
    ['the end beat',s=>s.timers.endAt!==null,400,3],
  ];
  for(const [name,done,ticks,every] of STAGES){
    const sim=newSim(19390901,'soldado'),state={};
    for(let i=0;i<40000&&!done(sim);i++){sim.tick(ACT_C_TICK,actCControls(sim,'prompt',state));sim.drainEvents();}
    assert.ok(done(sim),name);
    sameFuture(sim,runner,plan,ticks,every);
  }
  // the checkpoints the game keeps (what runner.envelope stores): CP-J and CP-K, restored and played on identically to the game that took them
  for(const [name,done] of [['CP-J',s=>s.checkpointsReached.length===1],['CP-K',s=>s.checkpointsReached.includes(CP_K)]]){
    const sim=newSim(19390901,'soldado'),state={};for(let i=0;i<40000&&!done(sim);i++){sim.tick(ACT_C_TICK,actCControls(sim,'prompt',state));sim.drainEvents();}
    assert.ok(done(sim),name);const env=runner.envelope(sim);assert.deepEqual(env.actSave.checkpointsReached,sim.checkpointsReached,name);
    // the checkpoint is taken inside the tick (CP-J when the card ends, before the tick's steps; CP-K after them), so the live state of that tick is not it: the game that takes the checkpoint and dies goes back to it
    assert.equal(JSON.stringify(strip(env.actSave)),JSON.stringify(strip(sim.checkpoint)),`${name}: the envelope is the checkpoint`);
    sim.restoreCheckpoint();sim.drainEvents();
    sameFuture(sim,runner,plan,name==='CP-J'?900:1500,6,env);
  }
});

test('saves: tampered or foreign records are refused with a message — the withdrawal, its squads, the men who left, the flags and objectives that must agree with it, the card, the roster, the wave a VII-c save cannot have',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-c'}),sim=pastCards(newSim(19390901,'soldado'));driveTo(sim,s=>s.timers.withdrawal.out.length>=4&&s.timers.withdrawal.lineOutAt===null);
  const good=strip(live(sim));assert.equal(runner.load(JSON.stringify(good)).ok,true);
  const bad=(name,mutate,re=/inválid/)=>{const e=strip(good);mutate(e.actSave);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,re,`${name}: ${r.error}`);};
  const man=(s,id)=>s.actors.find(a=>a.id===id);
  bad('no record of the withdrawal',s=>{delete s.timers.withdrawal;},/registo da retirada/);bad('a stray key in the record',s=>{s.timers.withdrawal.extra=1;},/registo da retirada/);bad('a messenger state that does not exist',s=>{s.timers.withdrawal.messenger='flying';},/registo da retirada/);
  bad('an order that was never given, with the messenger gone',s=>{s.timers.withdrawal.orderAt=null;},/registo da retirada/);bad('the messenger on the field when the record says gone',s=>{man(s,'np_mensageiro').active=true;},/registo da retirada/);
  bad('an order in the future',s=>{s.timers.withdrawal.orderAt=s.clock+10;},/registo da retirada/);bad('a line out before the order',s=>{s.timers.withdrawal.orderAt=s.clock-1;s.timers.withdrawal.lineOutAt=s.clock-5;},/registo da retirada/);
  bad('the line out while men are still on the field',s=>{s.timers.withdrawal.lineOutAt=s.clock;s.flags['m01npc.lineOut']=true;s.objectives.obj_npc_cover.state='done';s.objectives.obj_npc_withdraw.state='active';},/registo da retirada/);
  bad('the rear guard out before it left',s=>{s.timers.withdrawal.rearOutAt=s.clock;},/registo da retirada/);bad('an exit before the rear guard is out',s=>{s.timers.withdrawal.exitedAt=s.clock;},/registo da retirada/);
  bad('a man who is not of the plan among those who left',s=>{s.timers.withdrawal.out.push('pl_np_9');},/registo da retirada/);bad('a man twice among those who left',s=>{s.timers.withdrawal.out.push(s.timers.withdrawal.out[0]);},/registo da retirada/);
  bad('a man who left but is still on the field',s=>{man(s,s.timers.withdrawal.out[0]).active=true;},/registo da retirada/);bad('a man on the field who is not on the list',s=>{const id=s.timers.withdrawal.out.pop();man(s,id).active=false;s.timers.withdrawal.out.push(id);s.timers.withdrawal.out.splice(0,1);},/registo da retirada/);
  bad('a man who left outside the band',s=>{man(s,s.timers.withdrawal.out[0]).x=-450;},/registo da retirada/);
  bad('the order flag without the order',s=>{s.flags['m01npc.order']=false;},/a flag order e o registo discordam/);bad('the line-out flag without the line out',s=>{s.flags['m01npc.lineOut']=true;},/a flag lineOut e o registo discordam/);
  bad('the exit flag without the exit',s=>{s.flags['m01npc.exited']=true;},/a flag exited e o registo discordam/);bad('the objective of the line done without the line out',s=>{s.objectives.obj_npc_cover.state='done';},/os objetivos e o registo discordam/);
  bad('the objective of the exit active before the line is out',s=>{s.objectives.obj_npc_withdraw.state='active';},/os objetivos e o registo discordam/);bad('the objective of the exit done without the exit',s=>{s.objectives.obj_npc_withdraw.state='done';},/os objetivos e o registo discordam/);
  bad('a record of the line\'s squad missing',s=>{delete s.timers.line;},/registo dos lanços da retirada/);bad('a record of the rear guard\'s squad missing',s=>{delete s.timers.rear;},/registo dos lanços da retirada/);
  bad('a squad that has done more bounds than it has',s=>{s.timers.line.move=7;},/registo dos lanços da retirada/);bad('a squad moving past its last bound',s=>{s.timers.rear.move=6;s.timers.rear.moving=true;},/registo dos lanços da retirada/);
  bad('a squad record with a stray key',s=>{s.timers.line.extra=1;},/registo dos lanços da retirada/);bad('a squad bound that began in the future',s=>{s.timers.line.since=s.clock+5;},/registo dos lanços da retirada/);
  bad('a German',s=>{man(s,'pl_np_0').team='enemy';},/ator pl_np_0/);bad('a wave record in an act with no assault',s=>{s.timers.wave={at:1};},/este ato não tem ataque/);bad('a wave flag in an act with no assault',s=>{s.flags['m01npc.wave']='pending';},/este ato não tem ataque/);
  bad('the courier missing from the roster',s=>{s.actors.pop();},/elenco/);bad('the roster in another order',s=>{s.actors.reverse();},/elenco/);
  bad('CP-K without the line out',s=>{s.checkpointsReached=[CP_J,CP_K];},/checkpoint cp_npc_k_retirada sem a flag m01npc\.lineOut/);bad('CP-K before CP-J',s=>{s.checkpointsReached=[CP_K];s.flags['m01npc.lineOut']=true;},/registo da retirada|checkpoint/);
  bad('CP-J without the dusk card done',s=>{s.sceneDone=['cs_npc_order'];s.checkpointsReached=[CP_J];},/checkpoint cp_npc_j_ordem sem o cartão|cartão/);
  bad('a card that is not the next one',s=>{s.sceneDone=['cs_npc_order'];s.scene={id:'cs_npc_end',elapsed:1,card:{kind:'end',lines:act.cards.end.lines,seconds:9},skippable:true};},/cartão/);bad('the end card before the exit',s=>{s.scene={id:'cs_npc_end',elapsed:1,card:{kind:'end',lines:act.cards.end.lines,seconds:9},skippable:true};},/o cartão de fim sem a saída/);bad('cards done out of order',s=>{s.sceneDone=['cs_npc_dusk','cs_npc_order'];},/cartão/);
  bad('a card with another kind',s=>{s.sceneDone=['cs_npc_order'];s.scene={id:'cs_npc_dusk',elapsed:1,card:{kind:'end',lines:act.cards.entry.lines,seconds:6},skippable:true};},/cartão/);
  bad('a card with other lines',s=>{s.sceneDone=['cs_npc_order'];s.scene={id:'cs_npc_dusk',elapsed:1,card:{kind:'entry',lines:['x'],seconds:6},skippable:true};},/cartão/);bad('a card that has been on for ever',s=>{s.sceneDone=['cs_npc_order'];s.scene={id:'cs_npc_dusk',elapsed:60,card:{kind:'entry',lines:act.cards.entry.lines,seconds:6},skippable:true};},/cartão/);
  bad('a card already done and on screen',s=>{s.scene={id:'cs_npc_order',elapsed:1,card:{kind:'order',lines:act.cards.order.lines,seconds:9},skippable:true};},/cartão/);bad('another act\'s name',s=>{s.act='act_vii_b_north_day';},/inválid/);
  // a VII-a or VII-b save with a record of the withdrawal, and a VII-c save loaded as VII-b
  const a=new M01AreaSimulation(),ea=strip(live(a));assert.equal(runner.load(JSON.stringify(ea)).ok,true,'a plain VII-a save loads');
  const withW=strip(ea);withW.actSave.timers.withdrawal=freshWithdrawalRecord();assert.match(runner.load(JSON.stringify(withW)).error,/registo da retirada/);
  const withL=strip(ea);withL.actSave.timers.line={move:0,moving:false,since:0};assert.match(runner.load(JSON.stringify(withL)).error,/registo dos lanços da retirada/);
  const asB=strip(good);asB.act='act_vii_b_north_day';asB.actSave.act='act_vii_b_north_day';assert.equal(runner.load(JSON.stringify(asB)).ok,false);
  // a VII-a save of the old kind (no cards done yet at CP-E? it has its entry card) still loads; its card state is the machine's own
  const e0=new M01AreaSimulation();for(let i=0;i<40&&e0.scene;i++)e0.tick(ACT_C_TICK,{skip:true});assert.equal(runner.load(JSON.stringify(strip(live(e0)))).ok,true);
  const pure=freshWithdrawalRecord();assert.equal(validWithdrawalRecord(areaActPlan(ID).withdrawal,pure,0,newSim().actors),true);
});

test('F2: the chain BW -> VII-a -> VII-b -> VII-c: carry keeps the BW events and the flags of the two acts before (m01np*, m01npb*), the seed is derived without drawing, the debrief of VII-c has all three area paragraphs in order, and the debrief follows VII-c',()=>{
  assert.deepEqual(ACTS.order,['act_bw_0430_0705','act_vii_a_north','act_vii_b_north_day',ID]);assert.deepEqual(ACTS.order.map(id=>ACTS.entries[id].next),['act_vii_a_north','act_vii_b_north_day',ID,null],'the chain ends at VII-c, where the debrief follows');
  assert.equal(ACTS.enabled,false,'acts.json enabled=false until the owner accepts the new acts');assert.equal(ACT_ALIASES['vii-c'],ID);assert.equal(ACT_ALIASES[ID],ID);
  const runner=new M01ActRunner({enabled:true}),a=new M01AreaSimulation(19390901,{difficulty:'soldado',carry:{...defaultCarry('soldado'),events:['evt_m01_east_demolition','evt_m01_west_demolition']}});actRoute(a,{mode:'passive',maxSec:700});
  const b=runner.enter(a);actBRoute(b,{mode:'passive',maxSec:900});assert.ok(b.mission.complete);assert.equal(b.flags['m01npb.completed'],true);const before=JSON.stringify(b.snapshot());
  assert.equal(runner.next(b),ID,'VII-b hands over to VII-c');assert.equal(new M01ActRunner({enabled:false}).next(b),null);
  const carry=carryFrom(b,ID);validateCarry(carry);assert.equal(carry.seed,nextSeed(b.rng.state,ID));assert.equal(carry.from,'act_vii_b_north_day');assert.equal(carry.flags['m01np.completed'],true,'VII-a\'s flags');assert.equal(carry.flags['m01npb.completed'],true,'and VII-b\'s');
  assert.deepEqual(carry.weapon,{mag:b.weapon.mag,reserve:b.weapon.reserve});assert.equal(carry.grenades,b.grenades.ammo);assert.deepEqual(carry.events,a.carry.events,'the bridges as the demolitions left them');
  const c=runner.enter(b);assert.equal(JSON.stringify(b.snapshot()),before,'entering reads, never writes');
  assert.ok(c instanceof M01AreaSimulation);assert.equal(actOf(c),ID);assert.equal(c.scene.id,'cs_npc_order','the chain opens VII-c on the card of the order');assert.equal(c.weapon.reserve,b.weapon.reserve);assert.equal(c.difficulty,'soldado');assert.ok(c.world.events.includes('evt_m01_west_demolition'));
  assert.equal(c.flags['m01npb.completed'],true);assert.equal(c.flags['m01npc.wave'],undefined);
  const ids=c.definition.debrief.paragraphs.filter(p=>p.enabled).map(p=>p.id);
  assert.deepEqual(ids.slice(0,7),['db_01','db_02','db_03','db_np_01','db_npb_01','db_04','db_npc_01'],'db_01..db_03, VII-a\'s, VII-b\'s, db_04, VII-c\'s, then the rest');assert.ok(ids.length>7&&ids.slice(7).every(id=>/^db_0[5-7]b?$/.test(id)),`the rest of the current act's paragraphs follow: ${ids.slice(7)}`);
  assert.equal(ids.length,definition.debrief.paragraphs.length+3);assert.deepEqual(c.renderState.debrief.map(p=>p.id),ids);
  for(const p of definition.debrief.paragraphs)assert.equal(c.definition.debrief.paragraphs.find(q=>q.id===p.id).text,p.text,'the paragraphs of the current act are untouched');
  assert.deepEqual(debriefChain(ID,carry).map(x=>x.paragraphs[0].id),['db_np_01','db_npb_01','db_npc_01']);assert.equal(debriefWith(...debriefChain(ID,carry)).length,definition.debrief.paragraphs.length+3);
  // the QA start at VII-c (nothing played before): its own paragraph goes after db_04
  const q=new M01ActRunner({enabled:true,startAct:'vii-c'}).createInitial({difficulty:'recruta'});assert.equal(actOf(q),ID);assert.equal(q.scene.id,'cs_npc_order');
  assert.deepEqual(q.definition.debrief.paragraphs.map(p=>p.id).slice(0,6),['db_01','db_02','db_03','db_04','db_npc_01','db_05']);assert.deepEqual(q.carry,defaultCarry('recruta'));
  // a stored envelope of VII-c opens through the runner; the chain ends here: the debrief follows VII-c
  const env=runner.envelope(c);assert.equal(runner.load(JSON.stringify(env)).ok,true);
  c.mission.complete=true;assert.equal(runner.next(c),null,'no act after VII-c: the debrief');assert.equal(runner.enter(c),null,'and there is nothing to enter');
  assert.equal(new M01ActRunner({enabled:true,startAct:'vii-b'}).createInitial().scene.id,'cs_npb_entry','the QA start at VII-b is as it was');
});

test('F9: nothing on screen of VII-c gives an exact hour but the one of the order card, a calibre, an insignia, the name of a historical officer or a count; its cards say what is documented, what is reconstruction and what is unknown',()=>{
  const ONSCREEN=[...act.cards.entry.lines,act.clock.label,...act.callouts.map(c=>c.text),...act.objectives.map(o=>o.text),act.resupply.text,'Retirada concluída'];
  const BANNED=[[/\d{1,2}:\d{2}/,'an hour'],[/\d+\s?(?:cm|mm|kg)\b|\bcalibre\s+\d|obus(?:es)?\s+de\b|\bhaubit/i,'a calibre'],[/\bSS\b|SS-|Heimwehr|Totenkopf|Waffen/,'an insignia'],[/Janik|Juchtman|Faterkowski|Pszczółki/,'a historical officer or place of the fight'],
    [/Panzer|Pz\.?\s?Kpfw|Stuka|Ju\s?87|Bofors/i,'a vehicle, an aircraft or a gun of a type'],[/n\.º|N\.º/,'n.º'],[/\b(?:um|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+(?:ataques?|investidas?|vagas?|barragens?|obuses?|salvas?|baterias?|disparos?|homens?)\b/i,'a count']];
  for(const text of ONSCREEN)for(const [re,what] of BANNED)assert.doesNotMatch(text,re,`${what}: ${text}`);
  // the cards: the only hours are the order's («Por volta das 17:00»), the documented window and sunset of the end card (each with its source), and never an hour with seconds
  for(const text of [...act.cards.order.lines,...act.cards.entry.lines,...act.cards.end.lines,act.debrief.paragraphs[0].text,...act.history.map(h=>h.text)])assert.doesNotMatch(text,/\d{1,2}:\d{2}:\d{2}/,`an exact hour: ${text}`);
  assert.deepEqual(act.cards.entry.lines.join(' ').match(/\d{1,2}:\d{2}/g),null,'«Ao anoitecer» gives no hour');
  const order=act.cards.order.lines,end=act.cards.end.lines;assert.equal(order[0],'Por volta das 17:00');assert.deepEqual(order.join(' ').match(/\d{1,2}:\d{2}/g),['17:00'],'one hour on the order card');assert.match(order[1],/Ordem do comandante do batalhão/);assert.match(order[1],/Swarożyn–Starogard/);assert.match(order[2],/T03, resumo, certeza média/);
  assert.match(order[2],/desconhecidos/);assert.match(order[3],/dramatização/);
  assert.deepEqual(end.join(' ').match(/\d{1,2}:\d{2}/g),['18:00','20:00','18:39']);assert.match(end[0],/2\.º Batalhão deixou Tczew/);assert.match(end[1],/T03, resumo, certeza média/);assert.match(end[2],/C01/);assert.match(end[2],/desconhecidos/);assert.match(end[3],/dramatização/);
  // every line fits the card: the HUD shows each as ONE line clipped at 82 vw (the 1st holds about 40 characters, the 2nd about 95, the others about 110, at 1280 px): nothing of what the cards say is cut off
  for(const [file,area] of [['act',null],['act-vii-b',null],['act-vii-c',null]]){const a=JSON.parse(readFileSync(new URL(`../missions/m01-tczew/areas/np/${file}.json`,import.meta.url),'utf8'));for(const [name,card] of Object.entries(a.cards))card.lines.forEach((text,i)=>assert.ok(text.length<=[38,88,104,104,104][i],`${file} ${name} card, line ${i} is ${text.length} characters: ${text}`));}
  for(const [name,lines] of [['order',order],['entry',act.cards.entry.lines],['end',end]])lines.forEach((text,i)=>assert.ok(text.length<=[38,88,104,104][i],`${name} card, line ${i} is ${text.length} characters (${[38,88,104,104][i]} at most): ${text}`));
  assert.equal(act.cards.entry.lines[0],'Ao anoitecer');assert.match(act.cards.entry.lines.join(' '),/reconstrução e dramatização/);assert.match(act.cards.entry.lines.join(' '),/C01/);
  // the classification of what the act says and does
  const hist=Object.fromEntries(act.history.map(h=>[h.id,h]));
  assert.equal(hist.h_npc_order.classification,'DOCUMENTED');assert.deepEqual(hist.h_npc_order.sources,['T03']);assert.match(hist.h_npc_order.certainty,/MÉDIA/);assert.ok(hist.h_npc_order.gaps.some(g=>/quem transmitiu/.test(g)));
  assert.equal(hist.h_npc_withdrawal.classification,'DOCUMENTED');assert.deepEqual(hist.h_npc_withdrawal.sources,['T03']);assert.equal(hist.h_npc_sunset.classification,'DOCUMENTED (cálculo)');assert.deepEqual(hist.h_npc_sunset.sources,['C01']);
  assert.equal(hist.h_npc_dramatization.classification,'GAMEPLAY_DRAMATIZATION');assert.deepEqual(hist.h_npc_dramatization.sources,[]);assert.match(hist.h_npc_dramatization.text,/nenhuma fonte fala de contacto/);
  assert.equal(act.clock.sun.source,'C01 (método)');assert.match(act.clock.sun.note,/RECONSTRUCTED/);assert.match(act.clock.classification,/GAMEPLAY_DRAMATIZATION/);
  const d=act.debrief;assert.equal(d.insertAfter,'db_04');assert.equal(d.paragraphs[0].id,'db_npc_01');assert.deepEqual(d.paragraphs[0].sources,['T03','C01']);assert.match(d.paragraphs[0].text,/^Por volta das 17:00 chegou a ordem de deixar Tczew ao anoitecer, rumo a Swarożyn–Starogard; o 2\.º Batalhão retirou-se entre as 18:00 e as 20:00\. O Sol pôs-se às 18:39\./);
  assert.match(d.paragraphs[0].text,/não estão confirmados/);assert.match(d.paragraphs[0].text,/reconstrução para o jogo/);assert.doesNotMatch(d.paragraphs[0].text,/ocupação|reféns|quartel/,'nothing about the occupation, hostages or the barracks (T30 is outside M01)');
  // the voices are European Portuguese, every key the simulation says has a line, the speakers are named, the courier has no name or rank
  for(const on of ['arrive_card_end','order_given','order_section','line_go','line_out','lag','exit']){const c=act.callouts.find(x=>x.on===on);assert.ok(c,on);assert.doesNotMatch(c.text,/\b(você|tu|ônibus|trem)\b/i,'not Brazilian Portuguese');assert.ok(act.speakers[c.speaker],`${on}: a named speaker`);}
  assert.equal(act.speakers.np_mensageiro,'Mensageiro');assert.equal(new Set(act.callouts.map(c=>c.id)).size,act.callouts.length,'callout ids are unique');
  // the same on the status line, the objective text and the subtitles during the whole route (strings the simulation writes)
  const sim=newSim(7,'soldado'),seen=new Set();
  actCRoute(sim,{mode:'prompt',maxSec:900,onStep:({sim:s})=>{seen.add(s.mission.status);seen.add(s.mission.text);if(s.subtitle)seen.add(s.subtitle.text);}});
  for(const text of seen)if(text)for(const [re,what] of BANNED)assert.doesNotMatch(text,re,`${what}: ${text}`);
  assert.deepEqual([...seen].filter(t=>/^Retirada/.test(t)).sort(),['Retirada concluída','Retirada · a linha sai por lanços','Retirada · a secção recua por lanços'].sort());
  assert.ok([...seen].includes('Cubra a saída da linha')&&[...seen].includes('Recue com a secção até à saída'));
});

test('the act modules stay out of the renderer, the UI, the browser and the wall clock, and draw from no stream: the withdrawal module is checked like the shell module',()=>{
  const code=readFileSync(new URL('../src/game/m01-withdrawal.js',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  for(const [re,what] of [[/(?<![.$\w])document\./,'DOM'],[/(?<![.$\w])window\./,'window'],[/\bMath\.random\b/,'Math.random'],[/\bDate\.now\b|\bperformance\.now\b/,'wall clock'],[/\blocalStorage\b/,'storage'],[/\bnew Random\b|\.next\(\)/,'a stream']])assert.doesNotMatch(code,re,what);
  assert.doesNotMatch(code,/from '\.\.\/(?:render|ui)\//);
});

test('the golden of Act VII-c: both routes regenerate byte for byte (x86_64; tools/verification/m01-act-vii-c-golden.mjs)',{skip:arch()!=='x64'&&'x86_64 only',timeout:1800000},()=>{
  assert.equal(actCGoldenText(),readFileSync(new URL(`../${ACT_C_GOLDEN_FIXTURE}`,import.meta.url),'utf8'));
});

test('VII-c: every player control after the cards (fire, grenade, reload, E, sight, crouch, aim) ticks without throwing (review 2026-11-04: firing threw on plan.assault null)',()=>{
  const base={lookX:0,lookY:0,forward:0,side:0,sprint:false,aim:false,fire:false,reload:false,grenade:false,interact:false,skip:false,crouch:false,sight:false};
  for(const key of ['fire','grenade','reload','interact','sight','crouch','aim']){
    const sim=newSim();
    while(sim.scene)sim.tick(ACT_C_TICK,{...base,skip:sim.scene.elapsed>1});
    const mag=sim.weapon.mag;
    for(let i=0;i<40;i++)sim.tick(ACT_C_TICK,{...base,[key]:i===0});
    if(key==='fire')assert.equal(sim.weapon.mag,mag-1,'the shot was really fired');
    sim.snapshot();   // validates itself (validateAreaSnapshot)
  }
});
