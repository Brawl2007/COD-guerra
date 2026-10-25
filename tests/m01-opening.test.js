// R1-b (2026-10-25, golden amendment 20): the opening life of Act I (src/game/m01-opening.js). Until the first bomb of 04:34 the men of the post are not a row of men standing still: each does something that fits
// the minute, the news of 04:31 changes the post, the planes of 04:33:10 make every man react in his own way and at his own moment. These tests pin the data, the draw-free state machines, the runner and the
// sapper team, the order of the tensions, the end at the first bomb (the garrison stands where R1-a's bombs found it), the save (mid-act, legacy, invalid) and what the old tests rely on.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot,seconds} from '../src/game/m01-simulation.js';
import {OPENING,OPENING_ACTS,TENSIONS,openingPlan,openingDataErrors,tensionOf,closeOpening} from '../src/game/m01-opening.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

const E=name=>'evt_m01_'+name,STEP=.05;
const fresh=(seed=19390901)=>{const s=new M01Simulation(seed);s.tick(STEP,{skip:true});s.drainEvents();return s;};
const run=(s,sec,each=null)=>{const n=Math.round(sec/STEP);for(let i=0;i<n;i++){s.tick(STEP,{});s.drainEvents();if(each)each(s,i);}};
const until=(s,done,limitSec=240)=>{for(let i=0;i<limitSec/STEP&&!done(s);i++){s.tick(STEP,{});s.drainEvents();}assert.ok(done(s),'the condition is reached');};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const GARRISON=['pl_west_0','pl_west_1','pl_west_2','pl_west_3','pl_west_4','pl_west_5'],SAPPERS=['pawel_krawiec','sapper_2','sapper_3'];
const planActs=(id,tension)=>new Set((OPENING.men[id].plans[tension]??OPENING.men[id].plans.calm).map(e=>e.act));
const clone=()=>structuredClone(definition);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('data: the plan loads, every act is one the renderer draws, every man exists, the stops are on free ground and the recipients are two to three metres from them',()=>{
  const s=new M01Simulation(),ids=new Set(s.actors.map(a=>a.id));
  assert.deepEqual(TENSIONS,['calm','warned','planes']);
  assert.ok(OPENING.order.length>=20,`${OPENING.order.length} men have a life`);
  for(const id of OPENING.order)assert.ok(ids.has(id),`${id} is in the roster`);
  for(const [id,m] of Object.entries(OPENING.men))for(const t of Object.keys(m.plans))for(const e of m.plans[t]){
    assert.ok(Object.hasOwn(OPENING_ACTS,e.act)&&!OPENING_ACTS[e.act].walk,`${id}.${t}: ${e.act}`);assert.ok(e.w>0&&e.sec[0]>0&&e.sec[1]>=e.sec[0]);
  }
  const nav=s.navigator,world=s.world;
  assert.deepEqual(openingDataErrors({blockedAt:(x,z,r,y)=>nav.blockedAt(x,z,r,y),heightAt:(x,z)=>world.heightAt(x,z),actors:s.actors}),[]);
  // the sappers' release is the time the shelter of the old logic begins; Nowicki is the man who runs for them
  assert.equal(OPENING.sappers.release,seconds(definition.groups.find(g=>g.id==='grp_sappers').stage.shelter.from));
  assert.equal(OPENING.planesRun.man,'tadeusz_nowicki');
  // the data says what it is
  assert.equal(definition.openingLife.classification,'GAMEPLAY_DRAMATIZATION');assert.equal(definition.openingLife.presence,'RECONSTRUCTED');
});

test('data: a malformed plan is refused with its reason, a mistyped act or man stops the game before it starts',()=>{
  const bad=(mutate,re)=>{const d=clone();mutate(d.openingLife);assert.throws(()=>openingPlan(d),re);};
  assert.doesNotThrow(()=>openingPlan(clone()));
  bad(o=>{delete o.version;},/version/);bad(o=>{o.classification='RECONSTRUCTED';},/classification/);bad(o=>{o.presence='DOCUMENTED';},/classification/);
  bad(o=>{o.events.raid='evt_m01_nowhere';},/events\.raid/);bad(o=>{o.reactSec=[3,1];},/reactSec/);bad(o=>{o.men.marek_zielinski.calm[0][0]='dance';},/marek_zielinski\.calm/);
  bad(o=>{o.men.marek_zielinski.calm[0][0]='errand';},/marek_zielinski\.calm/);bad(o=>{o.men.marek_zielinski.calm[0][1]=0;},/marek_zielinski\.calm/);
  bad(o=>{o.men.marek_zielinski.calm[0][2]=[9,3];},/marek_zielinski\.calm/);bad(o=>{o.men.marek_zielinski.calm[0][3]='never';},/marek_zielinski\.calm/);
  bad(o=>{o.men.nobody={calm:[['idle',1,[1,2]]]};},/nobody/);bad(o=>{delete o.men.marek_zielinski.calm;},/calm plan/);
  bad(o=>{o.men.marek_zielinski.calm=o.men.marek_zielinski.calm.map(e=>[e[0],e[1],e[2],'first']);},/only first/);
  bad(o=>{o.men.pl_west_2.driver='courier';},/exactly one man has driver/);bad(o=>{o.men.pl_west_1.driver='pilot';},/driver/);bad(o=>{o.men.marek_zielinski.react=[2,1];},/react/);
  bad(o=>{o.courier.errands=[];},/courier/);bad(o=>{o.courier.errands[0].stops[0].to='nobody';},/errands/);bad(o=>{o.courier.errands[0].stops[0].at=[1];},/errands/);
  bad(o=>{delete o.men.sapper_3;},/three men have driver/);bad(o=>{o.sappers.helper='sapper_3';},/sappers/);bad(o=>{o.sappers.releaseAt='04:33:00';},/releaseAt/);
  bad(o=>{o.sappers.stops=[];},/sappers/);bad(o=>{o.planesRun.man='nobody';},/planesRun/);
});

test('source: the module draws no random number and reads no wall clock; the main stream is only read, once per act, to seed the man\'s own',()=>{
  const source=readFileSync(new URL('../src/game/m01-opening.js',import.meta.url),'utf8');
  assert.ok(!/Math\.random|Date\.now|performance\.now|new Date|\.rng\.next|\.random\(/.test(source),'no random source, no wall clock');
  for(const m of source.matchAll(/sim\.rng(\.\w+)?/g))assert.equal(m[1],'.state',`only sim.rng.state is touched: ${m[0]}`);
  assert.ok(!/rng\.state\s*=[^=]/.test(source),'the state is never written');
});

test('Act I draws nothing from the main random stream and leaves its state alone, to the minute of the first bomb',()=>{
  const s=new M01Simulation(19390901),r0=s.rng.state,next=s.rng.next.bind(s.rng);let draws=0;s.rng.next=()=>{draws++;return next();};
  s.tick(STEP,{skip:true});
  until(s,x=>x.battleClock>=seconds('04:33:50'));
  assert.equal(draws,0);assert.equal(s.rng.state,r0);
  assert.ok(s.timers.opening,'the opening was running all along');
});

test('from the first seconds every man of the plan is doing something of his calm plan, each differently, and nobody changes act in step with a neighbour',()=>{
  const s=fresh(),changes=new Map(OPENING.order.map(id=>[id,[]])),last=new Map();
  run(s,14,(sim,i)=>{for(const id of OPENING.order){const a=sim.actor(id);if(!a.act)continue;if(last.has(id)&&last.get(id)!==a.act.n)changes.get(id).push(i);last.set(id,a.act.n);}});
  for(const id of OPENING.order){
    const a=s.actor(id),m=OPENING.men[id];assert.ok(a.act,`${id} has an act`);
    if(m.driver)continue;
    assert.ok(planActs(id,a.act.tn?'warned':'calm').has(a.act.k)||a.act.k==='idle',`${id}: ${a.act.k} is not in his plan of tension ${a.act.tn} (a man the runner has told is on alert at once)`);
  }
  const kinds=new Set(OPENING.order.map(id=>s.actor(id).act.k));
  assert.ok(kinds.size>=7,`at least seven different things are going on at once: ${[...kinds]}`);
  const garrison=new Set(GARRISON.map(id=>s.actor(id).act.k));assert.ok(garrison.size>=3,`the six men of the garrison do ${garrison.size} different things: ${[...garrison]}`);
  let worst=0;
  for(const a of OPENING.order)for(const b of OPENING.order)if(a<b){const both=changes.get(a).filter(t=>changes.get(b).includes(t)).length;worst=Math.max(worst,both);}
  assert.ok(worst<=1,`no two men change act on the same tick more than once (worst ${worst})`);
});

test('the same seed is the same Act I tick for tick; another seed is another one (every man draws from a stream of his own)',()=>{
  const trace=seed=>{const s=fresh(seed),out=[];run(s,60,sim=>out.push(OPENING.order.map(id=>sim.actor(id).act?.k+':'+sim.actor(id).act?.n).join(' ')));return out;};
  assert.deepEqual(trace(19390901),trace(19390901));
  assert.notDeepEqual(trace(19390901),trace(7));
});

test('what turns a man from outside is respected: the act writes his facing when it wants something else, not every tick (a test, a scripted turn, a later system)',()=>{
  const s=fresh(),a=s.actor('marek_zielinski');
  Object.assign(a,{bodyYaw:0,facing:Math.PI/2});s.tick(STEP);
  assert.equal(a.facing,Math.PI/2,'the turn is kept');assert.ok(Math.abs(a.bodyYaw-Math.PI/6)<1e-12,'and the body follows it (idle bodyYaw, 180 degrees a second, a third of a half-turn behind)');
  // a man who only stands keeps the very bits of the facing he was given
  const b=fresh();for(const id of GARRISON)assert.equal(b.actor(id).facing,new M01Simulation().actor(id).facing,`${id} keeps his facing exactly`);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the news of 04:31 changes the post: the line is dead, the sergeant orders eyes to the east, every man takes up a watching act within three seconds and the runner carries the word',()=>{
  const s=fresh();run(s,3);
  assert.equal(tensionOf(s),0);
  until(s,x=>x.consumedEvent(E('railway_worker_report')),30);
  const at=s.clock;run(s,3.2);
  assert.equal(tensionOf(s),1);
  for(const id of OPENING.order){
    const a=s.actor(id),m=OPENING.men[id];if(m.driver)continue;
    assert.equal(a.act.tn,1,`${id} knows`);
    assert.ok(planActs(id,'warned').has(a.act.k)||a.act.k==='idle',`${id}: ${a.act.k} is not in his warned plan`);
  }
  // the telephone: Pawlak finds the line dead (the first act of his warned plan), then the sergeant orders (after the line), the runner is armed by the order
  const q=s.timers.opening;assert.ok(q.flags.lineDead!==undefined&&q.flags.lineDead-at<4,'the line is called dead at once');
  until(s,x=>x.timers.opening.flags.order!==undefined,40);
  assert.ok(s.timers.opening.flags.order-q.flags.lineDead>=1,'the order comes after the line');
  run(s,12);assert.ok(s.timers.opening.courier.e>=1||s.timers.opening.courier.leg!=='post','the second errand was taken or is under way');
});

test('the voices of the alert chain, with the player at the post: the runner\'s order, Pawlak\'s dead line, the sergeant\'s order 3-5 s later, the runner\'s alert; each once, nothing at the planes but the scripted lines',()=>{
  const s=fresh(),said=[];
  Object.assign(s.player,{x:-66,z:22,y:s.world.heightAt(-66,22)});
  run(s,150,sim=>{for(const t of sim.dialogueConsumed)if(!said.some(x=>x.t===t))said.push({t,clock:sim.clock});});
  const ids=said.map(x=>x.t).filter(t=>/^(co_m01_opening|dlg_m01_21)/.test(t));
  assert.deepEqual(ids,['co_m01_opening_order#1','dlg_m01_210#1','dlg_m01_211#1','co_m01_opening_alert#1'],'in the order of the chain, once each');
  const at=Object.fromEntries(said.map(x=>[x.t,x.clock]));
  assert.ok(at['dlg_m01_211#1']-at['dlg_m01_210#1']>=2.7&&at['dlg_m01_211#1']-at['dlg_m01_210#1']<6,'the order follows the dead line by 2.7-6 s: the director\'s follow-up gap');
  assert.ok(at['dlg_m01_210#1']<seconds('04:31:30')-seconds('04:30:44')+10,'within a minute of control the war is spoken of');
  const lines=definition.dialogue.filter(l=>/^dlg_m01_21\d$/.test(l.id)).map(l=>l.id).sort();assert.deepEqual(lines,['dlg_m01_210','dlg_m01_211','dlg_m01_212'],'three new lines in the dialogue (the planes have theirs already: 012, 013, 066, 067)');
  assert.deepEqual(definition.callouts.lines.filter(l=>/^co_m01_opening/.test(l.id)).map(l=>l.id),['co_m01_opening_order','co_m01_opening_alert'],'and two callouts of the runner');
  for(const l of [...definition.dialogue.filter(l=>/^dlg_m01_21\d$/.test(l.id)),...definition.callouts.lines.filter(l=>/^co_m01_opening/.test(l.id))])
    assert.match(l.note,/^PL: .+ \| 2026-10-25 \(R1-b, abertura\): texto original escrito por agente de IA; polaco por rever por falante nativo\.$/,`${l.id}: Polish flagged for a native speaker`);
});

test('the runner: waits at his post, runs the east errand by the simulation\'s walk, tells the two men he is sent to (who are alert at once), comes back and stands exactly on his post',()=>{
  const s=fresh(),c=s.actor(OPENING.courier.id),post={x:c.x,z:c.z},legs=[],told=[];
  let idle=0;
  until(s,x=>{
    const q=x.timers.opening.courier;if(!legs.length||legs.at(-1)!==q.leg+q.e)legs.push(q.leg+q.e);
    if(c.act?.k==='deliver'&&!told.includes(c.act.to))told.push(c.act.to);
    if(q.leg==='post'&&q.e===0)idle++;
    return q.e>=1&&q.leg==='post';
  },120);
  assert.ok(idle>=4/STEP-2,'he waited at the post first (the first errand starts 4-10 s after control)');
  assert.deepEqual(told,['pl_west_0','ckm_reserve'],'he told the two men of the east errand');
  assert.deepEqual(legs.filter((l,i)=>l!==legs[i-1]),['post0','run0','deliver0','run0','deliver0','back0','post1']);
  assert.ok(Math.hypot(c.x-post.x,c.z-post.z)<1e-9,'back exactly on his post');assert.equal(c.target,null);assert.equal(c.act.k,'idle');
  // each man he told was on alert the moment he was told (tn 1 with a reaction delay of his own), before the news of 04:31 had reached the post
});

test('the planes: each man reacts after a delay of his own (look up, point, shout, cover), the runner goes back to his post at once and the garrison stands where the bombs will find it',()=>{
  const s=fresh();
  until(s,x=>x.timers.opening.courier.leg==='deliver',60);   // (away from his post: the first stop is 9 m from it)
  const c=s.actor(OPENING.courier.id),post={x:c.act.hx,z:c.act.hz},crewFacing=['ckm_gunner','ckm_loader'].map(id=>s.actor(id).facing);
  s.consume(E('planes_heard'));
  assert.equal(tensionOf(s),2);run(s,.1);
  assert.equal(s.timers.opening.courier.leg,'cover','the runner runs for his post at once');
  run(s,3.2);assert.deepEqual(['ckm_gunner','ckm_loader'].map(id=>s.actor(id).facing),crewFacing,'the ckm crew is turned by nothing: its body stays on the gun (the acts of the crew move the head only)');
  for(const id of OPENING.order){
    const a=s.actor(id),m=OPENING.men[id];if(m.driver)continue;
    assert.equal(a.act.tn,2,`${id} heard them`);
    assert.ok(planActs(id,'planes').has(a.act.k),`${id}: ${a.act.k} is not in his planes plan`);
  }
  const started=new Set(OPENING.order.filter(id=>!OPENING.men[id].driver).map(id=>s.actor(id).act.at.toFixed(2)));
  assert.ok(started.size>=8,`the men reacted at ${started.size} different moments (a delay of their own each)`);
  until(s,x=>x.timers.opening.courier.leg==='post',60);
  assert.ok(Math.hypot(c.x-post.x,c.z-post.z)<1e-9,'the runner is exactly on his post');
  const kinds=new Set(OPENING.order.map(id=>s.actor(id).act.k));assert.ok(kinds.has('look_up')||kinds.has('point')||kinds.has('shout'));
});

test('Nowicki looks up and points for five seconds at the post, then runs for the sappers (dlg_m01_012/013 are said at the planes, the order of the run is the same)',()=>{
  const s=fresh(),n=s.actor('tadeusz_nowicki'),site=s.world.point('repair_site_1');
  run(s,2);s.consume(E('planes_heard'));const at=s.clock;
  run(s,4.8);assert.ok(!n.target,'still at the post');assert.ok(['look_up','point'].includes(n.act.k),n.act.k);
  run(s,.5);assert.deepEqual({x:n.target.x,z:n.target.z},{x:site.x,z:site.z},'then the old run');assert.equal(n.act,undefined,'the act is let go');
  assert.ok(s.clock-at<5.6);assert.equal(s.timers.opening.flags.nowickiGone,true);
});

test('the sappers walk the cable before the bomb: out to a joint, kneel and test it, the helper holds the coil, the watch keeps his eyes east; home at the planes, exactly, before the shelter takes them',()=>{
  const s=fresh(),L=s.actor(OPENING.sappers.leader),H=s.actor(OPENING.sappers.helper),W=s.actor(OPENING.sappers.watch);
  const home={L:{x:L.x,z:L.z},H:{x:H.x,z:H.z},W:{x:W.x,z:W.z}},seen=new Set();let far=0,knelt=false,held=false;
  until(s,x=>{
    seen.add(x.timers.opening.sap.leg);far=Math.max(far,dist(L,home.L));
    if(x.timers.opening.sap.leg==='inspect'){knelt||=L.crouched&&L.act.k==='cable_inspect';held||=H.act.k==='cable_hold'&&H.crouched;}
    return x.timers.opening.sap.leg==='back'||x.timers.opening.sap.leg==='home';
  },240);
  assert.ok(seen.has('out')&&seen.has('inspect'),[...seen].join());assert.ok(far>8,`the leader walked ${far.toFixed(1)} m along the cable`);assert.ok(knelt&&held);
  assert.equal(W.act.k,'cable_watch');assert.equal(W.crouched,true);assert.equal(dist(W,home.W),0,'the watch never leaves the camp');
  const stops=OPENING.sappers.stops;assert.ok(stops.some(p=>dist(L,p)<.9)||seen.has('back'));
  // the planes: they go home at a good pace and are on their places, to the bit, well before the shelter time
  s.battleClock=seconds('04:33:10');s.consume(E('planes_heard'));
  until(s,x=>x.battleClock>=seconds('04:33:29'),60);
  for(const [a,h] of [[L,home.L],[H,home.H],[W,home.W]])assert.ok(Math.hypot(a.x-h.x,a.z-h.z)<1e-9,`${a.id} is on his place`);
  assert.equal(s.timers.opening.sap.leg,'home');assert.equal(L.act.k,'cover');assert.ok(L.crouched&&H.crouched&&W.crouched,'the three kneel at their places');
  run(s,1.2);assert.equal(s.timers.opening.flags.sapReleased,true,'at 04:33:30 the old shelter logic has them');assert.equal(L.act,undefined);
});

test('an order that is not the opening\'s own is never overridden: a sapper sent elsewhere by somebody else lets the whole team go at once, his target stands and the old logic walks him there',()=>{
  // (the team's own targets are its joints, the helper's place beside one and the camp; anything else is somebody else's: a scripted run, a system after the opening, a test)
  const s=fresh(),H=s.actor(OPENING.sappers.helper),L=s.actor(OPENING.sappers.leader),W=s.actor(OPENING.sappers.watch);
  run(s,3);assert.ok(s.timers.opening&&!s.timers.opening.flags.sapReleased,'the team is held');assert.ok(L.act&&H.act&&W.act);
  const goal={x:H.x-30,z:H.z+12},x0=H.x;H.target={...goal};H.state='GUARD';
  s.tick(STEP,{});s.drainEvents();
  assert.equal(s.timers.opening.flags.sapReleased,true,'released in the very tick');
  assert.deepEqual({x:H.target.x,z:H.target.z},goal,'his order stands, untouched');assert.ok(!L.act&&!H.act&&!W.act,'no act on the three');
  run(s,2);assert.ok(H.x<x0-.5,`and the old logic walks him (${(x0-H.x).toFixed(2)} m in two seconds)`);
  validateM01Snapshot(s.snapshot());
  // the team's own targets are not foreign: a whole outing (out, inspect, back) never releases it
  const t=fresh();let legs=new Set();until(t,x=>{legs.add(x.timers.opening.sap.leg);return x.timers.opening.sap.leg==='back';},240);
  assert.ok(legs.has('out')&&legs.has('inspect'));assert.equal(t.timers.opening.flags.sapReleased,undefined,'the machine\'s own targets never released the team');
});

test('the first bomb ends it: no act on anybody, no record, and the six men of the garrison are on their posts to the bit (R1-a\'s bombs find them where they always found them)',()=>{
  const posts=new Map(new M01Simulation().actors.filter(a=>GARRISON.includes(a.id)).map(a=>[a.id,{x:a.x,z:a.z}])),s=fresh();
  until(s,x=>x.battleClock>=seconds('04:33:59.9'),260);const kneeling=new Map(s.actors.map(a=>[a.id,a.crouched]));   // the postures a tick before the bomb
  until(s,x=>x.consumedEvent(E('bombing_0434')),5);
  for(const a of s.actors)assert.equal(a.crouched,kneeling.get(a.id),`${a.id}: nobody stands up (or kneels) for the first bomb: the opening lets the posture be`);
  assert.equal(s.timers.opening,undefined);assert.ok(s.actors.every(a=>a.act===undefined),'nobody has an act');
  for(const id of GARRISON){const a=s.actor(id),p=posts.get(id);assert.ok(Math.hypot(a.x-p.x,a.z-p.z)<1e-9,`${id} on his post`);assert.equal(a.crouched,false);}
  validateM01Snapshot(s.snapshot());run(s,5);assert.equal(s.timers.opening,undefined,'and it does not come back');
  // the same by the event alone (a test consumes it at once: the record and the event are never held together)
  const t=fresh();run(t,2);t.consume(E('bombing_0434'));assert.equal(t.timers.opening,undefined);validateM01Snapshot(t.snapshot());
  closeOpening(t);assert.equal(t.timers.opening,undefined);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('a save in the middle of any act goes on exactly as the run does, also after double reloads: calm, the runner on his errand, the sappers out, the warning, the planes',()=>{
  const cases=[['calm',s=>run(s,6)],
    ['runner running',s=>until(s,x=>x.timers.opening.courier.leg==='run',60)],
    ['runner telling',s=>until(s,x=>x.timers.opening.courier.leg==='deliver',60)],
    ['sappers kneeling',s=>until(s,x=>x.timers.opening.sap.leg==='inspect',120)],
    ['warned',s=>{until(s,x=>x.consumedEvent(E('railway_worker_report')),30);run(s,6);}],
    ['planes',s=>{s.consume(E('planes_heard'));run(s,2.5);}],
    ['planes, the runner running home',s=>{until(s,x=>x.timers.opening.courier.leg==='run',60);s.consume(E('planes_heard'));run(s,1.5);}]];
  for(const [label,go] of cases){
    const s=fresh(5);go(s);validateM01Snapshot(s.snapshot());
    const r=compareContinuation(s,{label,ticks:160,doubleAt:[10,60],dt:t=>t%7===0?.031:STEP,input:()=>({})});assert.equal(r.firstDivergence,null,label);
  }
});

test('legacy saves: one made before the opening life has no record and no act; it loads, invents no event and draws nothing, and the opening begins from where the men stand',()=>{
  const s=fresh();run(s,20);const raw=json(s.snapshot());delete raw.timers.opening;for(const a of raw.actors)delete a.act;
  validateM01Snapshot(raw);const before=JSON.stringify(raw),r=new M01Simulation(1);r.restoreSnapshot(raw);
  assert.equal(JSON.stringify(raw),before,'restore does not edit the save');assert.equal(r.rng.state,raw.rng);assert.deepEqual(r.drainEvents(),[]);
  assert.equal(r.timers.opening,undefined);assert.ok(r.actors.every(a=>a.act===undefined));
  const draws0=r.rng.state;run(r,12);
  assert.ok(r.timers.opening&&r.actor('marek_zielinski').act,'the opening starts on the next tick');assert.equal(r.rng.state,draws0,'and draws nothing');
  validateM01Snapshot(r.snapshot());
  // a save made after the first bomb has none and gets none
  const t=fresh();t.consume(E('bombing_0434'));run(t,3);const late=json(t.snapshot());assert.equal(late.timers.opening,undefined);
  const u=new M01Simulation(1);u.restoreSnapshot(late);run(u,3);assert.equal(u.timers.opening,undefined);
});

test('a corrupt record or act is refused, whole, and the simulation it was offered to is not touched',()=>{
  const s=fresh();until(s,x=>x.timers.opening.sap.leg==='out'||x.timers.opening.sap.leg==='inspect',120);const good=json(s.snapshot());validateM01Snapshot(good);
  const act=(x,id='marek_zielinski')=>x.actors.find(a=>a.id===id).act;
  const bad=[
    ['a key more',x=>{x.timers.opening.extra=1;},/abertura/],['no flags',x=>{delete x.timers.opening.flags;},/abertura/],['version',x=>{x.timers.opening.v=2;},/abertura/],
    ['a flag nobody sets',x=>{x.timers.opening.flags.bogus=true;},/abertura bandeiras/],['a line dead in the future',x=>{x.timers.opening.flags.lineDead=x.clock+9;},/abertura bandeiras/],
    ['a leg of the runner',x=>{x.timers.opening.courier.leg='fly';},/abertura estafeta/],['an errand that is not',x=>{x.timers.opening.courier.e=9;},/abertura estafeta/],
    ['a leg of the sappers',x=>{x.timers.opening.sap.leg='dance';},/abertura sapadores/],['a joint that is not',x=>{x.timers.opening.sap.k=9;},/abertura sapadores/],
    ['after the first bomb',x=>{x.consumed[E('bombing_0434')]=x.clock;},/abertura janela/],
    ['an act that is not',x=>{act(x).k='dance';},/acto marek_zielinski valores/],['an act without its stream',x=>{delete act(x).s;},/acto marek_zielinski chaves/],
    ['an act with a key more',x=>{act(x).extra=1;},/acto marek_zielinski chaves/],['an act that ends in the far future',x=>{act(x).until=x.clock+500;},/acto marek_zielinski valores/],
    ['an act that began in the future',x=>{act(x).at=x.clock+1;},/acto marek_zielinski valores/],['a stream out of range',x=>{act(x).rng=-1;},/acto marek_zielinski valores/],
    ['a tension that is not',x=>{act(x).tn=3;},/acto marek_zielinski valores/],['a wished look that is not an angle',x=>{act(x).w=9;},/acto marek_zielinski olhar/],
    ['a recipient that is not an id',x=>{act(x,'pl_west_1').to='A B';},/acto pl_west_1 destinat/],['a pace that is not',x=>{act(x,'pl_west_1').spd=99;},/acto pl_west_1 passo/],
    ['an act on a man the opening never meets',x=>{x.actors.find(a=>a.id==='de_east_0').act=json(act(x));},/acto de_east_0 sem registo/],
    ['an act without its record',x=>{delete x.timers.opening;},/acto \S+ sem registo/],
  ];
  for(const [label,mutate,re] of bad){
    const x=json(good);mutate(x);assert.throws(()=>validateM01Snapshot(x),re,label);
    const target=new M01Simulation(2),was=JSON.stringify(target.snapshot());assert.throws(()=>target.restoreSnapshot(x),re,label);assert.equal(JSON.stringify(target.snapshot()),was,`${label}: atomic`);
  }
});
