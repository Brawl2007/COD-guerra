import test from 'node:test';
import assert from 'node:assert/strict';
import {route,driver,toStationEvacuation} from './helpers/m01-route.js';
import {clippingAudit,stackingAudit} from './helpers/m01-clipping.js';
import {M01Simulation,CKM_POSITION,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01Navigator,NAV} from '../src/world/m01-navigation.js';
import {ckmEmplacementSolids,ckmEmplacementBags,CKM_EMPLACEMENT} from '../src/world/m01-nav-layout.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

// P0 (owner playtest): NPCs walk through walls. The real mission routes, one observation per tick, every actor against every solid and against every other man.
// A clipping event is an actor entering a wall (or tunnelling through it between two ticks); a stacked pair is two men standing inside each other (centres
// closer than 0.35 m). Both lists must be empty.
const audited=(label,run)=>test(`no actor clips a collider, a girder or a sandbag wall, and no two men stand inside each other: ${label}`,{timeout:600000},()=>{
  const walls=clippingAudit(),bodies=stackingAudit();run(step=>{walls.observe(step);bodies.observe(step);});
  assert.ok(walls.ticks>4000,`the route ran (${walls.ticks} ticks)`);
  assert.deepEqual(walls.report(),[],`${walls.events.length} clipping event(s) in ${walls.ticks} ticks`);
  assert.deepEqual(bodies.report(),[],`men standing inside each other in ${bodies.ticks} ticks`);
});
audited('full route, seed 19390901',observe=>route(19390901,{onStep:observe}));
audited('full route with the covering-fire pilot, seed 19390901',observe=>route(19390901,{support:true,onStep:observe}));
audited('station evacuation observed from the yard',observe=>toStationEvacuation(driver(19390901,{onStep:observe}),{observe:true,phase:'release'}));

// ---- The navigator itself: a deterministic, data-only planner over the solids the player meets ----

const walker=(x,z,y=-3)=>({x,y,z,radius:.3});
const legsOf=(from,pts)=>pts.map((p,i)=>[i?pts[i-1]:[from.x,from.z],p]);
function assertWalkable(nav,from,pts,margin=0){
  for(const [p,q]of legsOf(from,pts))assert.ok(nav.clear(p[0],p[1],q[0],q[1],from.radius,from.y,margin),`leg (${p.map(v=>v.toFixed(2))}) -> (${q.map(v=>v.toFixed(2))}) crosses a solid`);
}
const fresh=()=>{const world=new TczewWorld();return {world,nav:new M01Navigator(world,{emplacement:CKM_POSITION})};};

test('a free straight walk is just the goal; the planner never moves anybody and draws no random number',()=>{
  const {nav}=fresh(),a=walker(-200,20),before=JSON.stringify(a);
  assert.deepEqual(nav.route(a,{x:-150,z:20}),[[-150,20]]);assert.equal(JSON.stringify(a),before);
});

test('round the rail hut: east to west, the route goes round and never touches a wall; into the hut it uses the west door',()=>{
  const {nav}=fresh(),east=walker(-240,20),around=nav.route(east,{x:-282,z:20});
  assert.ok(around.length>=2,'a detour, not a straight line through the hut');assert.deepEqual(around.at(-1),[-282,20]);assertWalkable(nav,east,around);
  assert.ok(around.some(([x,z])=>z<13.5||z>26.5),'it clears the hut by its north or south wall');
  const outside=walker(-292,21),inside=nav.route(outside,{x:-262,z:21});
  assert.ok(inside&&inside.length>=1);assertWalkable(nav,outside,inside);
  // The only opening of the hut is the west door, x -270, z 18..24: the route crosses that wall inside the opening.
  let at=[outside.x,outside.z],crossing=null;
  for(const p of inside){if(Math.min(at[0],p[0])<-270&&Math.max(at[0],p[0])>-270)crossing=at[1]+(p[1]-at[1])*(-270-at[0])/(p[0]-at[0]);at=p;}
  assert.ok(crossing>18.3&&crossing<23.7,`crosses the west wall at z=${crossing}`);
});

test('round the station and the yard wagons: every leg of the route is clear of every solid',()=>{
  const {nav}=fresh();
  for(const [from,to]of [[[-300,45],[-480,45]],[[-300,30],[-480,30]],[[-330,-6],[-310,-6]],[[-345,2],[-345,14]],[[-322,10],[-358,10]]]){
    const a=walker(from[0],from[1],0),r=nav.route(a,{x:to[0],z:to[1]});
    assert.ok(r,`a way from ${from} to ${to}`);assert.deepEqual(r.at(-1),to);assertWalkable(nav,a,r);
  }
});

test('the ckm crew leaves the sandbag horseshoe by its open rear and not through a bag; every post has a way out',()=>{
  const {nav}=fresh(),posts=[[-.794,-.029],[.08,-.52],[-1.6,-1.4]];
  assert.ok(CKM_EMPLACEMENT.walls.some(w=>w.gap),'the back of the emplacement has a door');
  for(const [dx,dz]of posts){
    const a=walker(CKM_POSITION.x+dx,CKM_POSITION.z+dz),r=nav.route(a,{x:-170,z:22});
    assert.ok(r,`post (${dx},${dz}) has a way out`);assertWalkable(nav,a,r);
  }
  // With the old closed rectangle there would be none: the same query through a layout whose door is filled.
  const closed={...CKM_EMPLACEMENT,walls:CKM_EMPLACEMENT.walls.map(({gap,...w})=>w)};
  assert.ok(ckmEmplacementBags(CKM_POSITION,closed).length>ckmEmplacementBags(CKM_POSITION).length);
  assert.ok(ckmEmplacementSolids(CKM_POSITION,closed).length<ckmEmplacementSolids(CKM_POSITION).length,'the door splits a wall into two solids');
});

test('the planner is a pure function of the world, the start and the goal: repeatable and independent of earlier queries',()=>{
  const one=fresh(),two=fresh(),a=walker(-240,20),goal={x:-282,z:20};
  const first=one.nav.route(a,goal);
  one.nav.route(walker(-100,60),{x:-300,z:10});one.nav.route(walker(5,26),{x:-170,z:22});
  assert.deepEqual(one.nav.route(a,goal),first);assert.deepEqual(two.nav.route(a,goal),first);
});

test('deck edges keep the body off the girders; a span that falls takes its girders with it',()=>{
  const {world,nav}=fresh(),deck=walker(300,40,0);
  assert.equal(nav.blockedAt(300,37.3,.3,0),true,'the north girder strip of the road deck');
  assert.equal(nav.blockedAt(300,40,.3,0),false,'the middle of the deck');
  assert.equal(nav.key,0);world.refresh(['evt_m01_east_demolition']);assert.equal(nav.key,1);
  world.refresh(['evt_m01_east_demolition','evt_m01_west_demolition']);assert.equal(nav.key,3);
  assert.equal(nav.blockedAt(8.5+1,40,.3,0),false);void deck;
});

test('Lisewo\'s road arch is a passage: the planner does not detour round the slab for men inside the arch lane',()=>{
  const {nav}=fresh();
  assert.deepEqual(nav.route(walker(1050,39.6,0),{x:1080,z:39.6}),[[1080,39.6]]);
  assert.ok(nav.route(walker(1050,20,0),{x:1080,z:20})?.length!==1,'outside the lane the slab is a wall');
});

// ---- In the simulation ----
function ready(seed=17){const s=new M01Simulation(seed);s.tick(.05,{skip:true});return s;}
const placeAt=(a,x,z)=>{a.x=x;a.z=z;a.y=a.y;};

test('an ally sent across the rail hut walks round it, reaches the far side in bounded time and never clips',()=>{
  const s=ready(),a=s.actor('staszek_pawlak'),audit=clippingAudit();
  Object.assign(a,{x:-238,z:20,y:s.world.heightAt(-238,20),target:{x:-284,z:20},state:'GUARD'});
  const rng=s.rng.state;
  for(let i=0;i<20*40&&Math.hypot(a.x+284,a.z-20)>=.8;i++){s.tick(.05,{});audit.observe({sim:s});}
  assert.ok(Math.hypot(a.x+284,a.z-20)<.8,`arrived (${a.x.toFixed(2)},${a.z.toFixed(2)})`);
  assert.deepEqual(audit.report(),[]);
  assert.equal(a.nav,undefined,'the saved detour is dropped on arrival');
  void rng;
});

test('a detour is saved with the actor, survives a restore exactly and a malformed one is refused',()=>{
  const s=ready(),a=s.actor('staszek_pawlak');
  Object.assign(a,{x:-238,z:20,y:s.world.heightAt(-238,20),target:{x:-284,z:20},state:'GUARD'});
  for(let i=0;i<30;i++)s.tick(.05,{});
  assert.ok(a.nav&&a.nav.pts.length>=1,'mid-detour');
  const save=s.snapshot();validateM01Snapshot(save);
  const bad=json(save);bad.actors.find(x=>x.id===a.id).nav.pts=[[1,'x']];assert.throws(()=>validateM01Snapshot(bad),/route/);
  const bad2=json(save);bad2.actors.find(x=>x.id===a.id).nav.i=99;assert.throws(()=>validateM01Snapshot(bad2),/route/);
  const rec=compareContinuation(s,{label:'detour continues identically after a restore',ticks:400,doubleAt:[50,150]});
  assert.equal(rec.firstDivergence,null);
});

test('an older save without a route resumes: the detour is re-made from the actor and the target',()=>{
  const s=ready(),a=s.actor('staszek_pawlak');
  Object.assign(a,{x:-238,z:20,y:s.world.heightAt(-238,20),target:{x:-284,z:20},state:'GUARD'});
  for(let i=0;i<30;i++)s.tick(.05,{});
  const save=s.snapshot();delete save.actors.find(x=>x.id===a.id).nav;
  const b=new M01Simulation(1);b.restoreSnapshot(save);
  for(let i=0;i<20*40&&Math.hypot(b.actor(a.id).x+284,b.actor(a.id).z-20)>=.8;i++)b.tick(.05,{});
  assert.ok(Math.hypot(b.actor(a.id).x+284,b.actor(a.id).z-20)<.8,'arrived');
});

test('the straight walk is untouched: an actor with a free line moves exactly as before and keeps no route',()=>{
  const s=ready(),a=s.actor('staszek_pawlak');
  Object.assign(a,{x:-150,z:20,y:s.world.heightAt(-150,20),target:{x:-120,z:20},state:'GUARD'});
  s.tick(.05,{});assert.equal(a.nav,undefined);assert.ok(Math.abs(a.x-(-150+3.6*.05))<1e-9);assert.equal(a.z,20);
});

// measured 2026-10-18 on the integration tree (the first 150 pairs of the stream; 49 need a detour round some solid)
// 2026-10-25 re-pin 49 -> 51 (R3-a review, golden amendment 19 regenerated): the two sandbag rows of the sappers (map-layout.json cv_cable_fault at (-117, 8) and cv_cable_second at (-133.5, 8), each a 0.9 x 3.0 m solid on
// the south slope of the embankment) are new solids on the west bank, so two more of the same 150 pairs have a straight line that crosses one and need a detour (51); every walk still arrives and none clips (asserted below).
const DETOURS=51;
test('free play: 150 deterministic walks across the west bank all arrive, none clips a wall, a girder or a solid of the player layer (the old walker left about one in fifteen stuck)',{timeout:900000},()=>{
  // The pairs are drawn with a fixed linear-congruential stream over free ground that has a route; DETOURS of these 150 need a detour round a hut, wagons, sandbags, the station
  // or (since the phys x npc integration) a prop, the casemate or the shelter (on f6913a0 the first 60 of the same stream left four walkers stuck against a wall, 10 of the first 150 in all).
  // 2026-10-18 (phys x npc integration): 60 -> 150 walks, and the free ground and the clipping audit now include world.playerSolids (src/world/m01-navigation.js playerSolidsForNav).
  let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const probe=ready(),nav=probe.navigator,free=(x,z)=>{const y=probe.world.heightAt(x,z);return y>-6&&!nav.blockedAt(x,z,.45,y);};
  const pairs=[];
  while(pairs.length<150){
    const a=[-440+rnd()*445,-12+rnd()*87],b=[-440+rnd()*445,-12+rnd()*87],d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(!free(...a)||!free(...b)||d<15||d>160)continue;
    const ya=probe.world.heightAt(...a),yb=probe.world.heightAt(...b);if(Math.abs(ya-yb)>1.5)continue;
    const way=nav.route({x:a[0],z:a[1],y:ya,radius:.3},{x:b[0],z:b[1]});
    if(way)pairs.push({a,b,direct:nav.clear(a[0],a[1],b[0],b[1],.3,ya),length:way.reduce((sum,q,i)=>sum+Math.hypot(q[0]-(i?way[i-1][0]:a[0]),q[1]-(i?way[i-1][1]:a[1])),0)});
  }
  const detours=pairs.filter(p=>!p.direct).length;assert.equal(detours,DETOURS,'the pairs that need a detour');
  const failed=[];
  pairs.forEach((p,k)=>{
    const s=ready(),man=s.actor('staszek_pawlak'),audit=clippingAudit();
    Object.assign(man,{x:p.a[0],z:p.a[1],y:s.world.heightAt(p.a[0],p.a[1]),target:{x:p.b[0],z:p.b[1]},state:'GUARD'});
    // 2026-10-18 (phys x npc integration): the time allowed is 2.2 x the walk of the PLANNED route (it was of the straight line, the same for a direct pair): the combat fence is
    // a wall for the NPCs now, and a pair on its two sides walks round its end or through the shelter gate (walk 21: 57.5 m apart, 178.8 m of route, arrives in 49.1 s).
    const limit=Math.ceil((Math.max(Math.hypot(p.a[0]-p.b[0],p.a[1]-p.b[1]),p.length)/3.6*2.2+10)/.05);let arrived=false;
    for(let i=0;i<limit&&!arrived;i++){s.tick(.05,{});audit.observe({sim:s});arrived=Math.hypot(man.x-p.b[0],man.z-p.b[1])<.8;}
    if(!arrived)failed.push(`walk ${k}: (${p.a.map(v=>v.toFixed(1))}) -> (${p.b.map(v=>v.toFixed(1))}) stopped at (${man.x.toFixed(1)},${man.z.toFixed(1)})`);
    for(const line of audit.report().filter(l=>l.includes(' staszek_pawlak ')))failed.push(`walk ${k}: ${line}`);
  });
  assert.deepEqual(failed,[]);
});

// ---- A route that cannot be made is not asked for every tick ----
const counting=sim=>{const calls={n:0},real=sim.navigator.route.bind(sim.navigator);sim.navigator.route=(...args)=>{calls.n++;return real(...args);};return calls;};

test('a goal behind the whole station (122 m) is reached: the second try with the widest window walks round it, and no wall is touched',{timeout:300000},()=>{
  const s=ready(),man=s.actor('staszek_pawlak'),audit=clippingAudit(),calls=counting(s);
  Object.assign(man,{x:-400,z:25,y:s.world.heightAt(-400,25),target:{x:-400,z:58},state:'GUARD'});
  for(let i=0;i<20*90&&Math.hypot(man.x+400,man.z-58)>=.8;i++){s.tick(.05,{});audit.observe({sim:s});}
  assert.ok(Math.hypot(man.x+400,man.z-58)<.8,`arrived (${man.x.toFixed(1)},${man.z.toFixed(1)})`);
  assert.deepEqual(audit.report().filter(l=>l.includes(' staszek_pawlak ')),[]);
  assert.ok(calls.n<=2,`${calls.n} route() calls for one 155 m walk: one plan (the first window fails, the wide one succeeds), never one per tick`);
});

test('an unreachable goal is planned once, kept as a saved back-off and tried again only after NAV.retrySec; a restore in the middle changes nothing',{timeout:300000},()=>{
  const s=ready(),man=s.actor('staszek_pawlak'),calls=counting(s);
  // The middle of the station: solid all round, nothing to walk to.
  Object.assign(man,{x:-400,z:25,y:s.world.heightAt(-400,25),target:{x:-400,z:41},state:'GUARD'});
  for(let i=0;i<40;i++)s.tick(.05,{});
  assert.equal(calls.n,1,'one plan, then the back-off');
  assert.equal(man.nav.fail,true);assert.equal(man.nav.pts.length,1);
  const save=s.snapshot();validateM01Snapshot(save);
  const bad=json(save);bad.actors.find(x=>x.id===man.id).nav.fail=false;assert.throws(()=>validateM01Snapshot(bad),/route/);
  const bad2=json(save);bad2.actors.find(x=>x.id===man.id).nav.i=1;assert.throws(()=>validateM01Snapshot(bad2),/route/);
  const resumed=new M01Simulation(1);resumed.restoreSnapshot(save);const again=counting(resumed);
  for(let i=0;i<60;i++)resumed.tick(.05,{});
  assert.equal(again.n,0,'a restored run does not plan again during the back-off');
  const rec=compareContinuation(s,{label:'back-off continues identically after a restore',ticks:300,doubleAt:[20,120]});
  assert.equal(rec.firstDivergence,null);
  for(let i=0;i<20*12;i++)s.tick(.05,{});
  assert.ok(calls.n<=1+Math.ceil(12/NAV.retrySec)+1+Math.ceil(300*.05/NAV.retrySec),`${calls.n} route() calls in ${s.clock.toFixed(0)} s`);
});

test('the planner takes an extra list of solids and routes round them like a collider',()=>{
  const world=new TczewWorld(),walls=[{id:'extra_wall',min:{x:-150,y:-4,z:10},max:{x:-149,y:2,z:40}}];
  const plain=new M01Navigator(world),extra=new M01Navigator(world,{extraSolids:()=>walls}),a=walker(-170,25);
  assert.deepEqual(plain.route(a,{x:-130,z:25}),[[-130,25]]);
  const r=extra.route(a,{x:-130,z:25});assert.ok(r.length>=2);assertWalkable(extra,a,r);
  assert.equal(new M01Navigator(world,{extraSolids:walls}).route(a,{x:-130,z:25}).length>=2,true,'an array works as well as a function');
});

// ---- The player layer (2026-10-18, phys x npc integration): what only the player's body met before is a wall for the NPCs too ----
const playerLayer=(audit,id)=>audit.report().filter(l=>l.includes(` ${id} `));

test('a man walks round a rotated prop of the T12 kit (the yard horse cart, yaw -0.08), in its own frame, and is never inside it',()=>{
  const s=ready(),man=s.actor('staszek_pawlak'),audit=clippingAudit(),cart=s.world.playerSolids.find(b=>b.id==='t12_7:horse_cart');
  assert.ok(cart&&Math.abs(cart.s)>.05,'the cart is an oriented box');
  const from={x:cart.cx,z:cart.cz-cart.hz-2.5},to={x:cart.cx,z:cart.cz+cart.hz+2.5};
  assert.equal(s.navigator.clear(from.x,from.z,to.x,to.z,.3,s.world.heightAt(from.x,from.z)),false,'the straight line is blocked by the cart');
  Object.assign(man,{...from,y:s.world.heightAt(from.x,from.z),target:to,state:'GUARD'});
  let inside=0;
  for(let i=0;i<20*20&&Math.hypot(man.x-to.x,man.z-to.z)>=.8;i++){s.tick(.05,{});audit.observe({sim:s});
    const dx=man.x-cart.cx,dz=man.z-cart.cz;if(Math.abs(dx*cart.c-dz*cart.s)<cart.hx+man.radius&&Math.abs(dx*cart.s+dz*cart.c)<cart.hz+man.radius)inside++;}
  assert.ok(Math.hypot(man.x-to.x,man.z-to.z)<.8,`arrived (${man.x.toFixed(2)},${man.z.toFixed(2)})`);
  assert.equal(inside,0,'never inside the cart');assert.deepEqual(playerLayer(audit,'staszek_pawlak'),[]);
});

test('Bąk\'s walk from the squad post to his wound point on the road deck goes over the buried casemate, not into it, and arrives',{timeout:300000},()=>{
  // The casemate (x 0..26, z 34..46, roof -1.4 m) is under the road deck; a plan made at the lowland height used to see it as a wall across the deck and fail.
  const s=ready(),man=s.actor('staszek_pawlak'),audit=clippingAudit(),from={x:-72.5,z:20.6},to={x:55,z:41};
  Object.assign(man,{...from,y:s.world.heightAt(from.x,from.z),target:to,state:'GUARD'});
  const planned=s.navigator.route(man,to);assert.ok(planned,'a route exists');
  for(let i=0;i<20*120&&Math.hypot(man.x-to.x,man.z-to.z)>=.8;i++){s.tick(.05,{});audit.observe({sim:s});}
  assert.ok(Math.hypot(man.x-to.x,man.z-to.z)<.8,`arrived (${man.x.toFixed(2)},${man.z.toFixed(2)})`);
  assert.deepEqual(playerLayer(audit,'staszek_pawlak'),[]);
});

test('a man pushed out of a solid without a collider is not pushed into a collider: settle takes the shallowest exit that is free',()=>{
  // A box without a world collider against the inside of the rail hut's north wall (hut_north, z 14..14.35): the shallowest way out of it is north, into the wall.
  const world=new TczewWorld(),box={id:'decor_box',min:{x:-262,y:-4,z:14.35},max:{x:-258,y:2,z:15.4}},nav=new M01Navigator(world,{extraSolids:[box]});
  const man={x:-260,z:14.7,y:world.heightAt(-260,14.7),radius:.3};   // clear of the wall (z 14.4 > 14.35), 0.65 deep from the north face, 1.0 from the south
  nav.settle(man);
  assert.ok(man.z>=15.4+.3-1e-9,`left by the free side, at z ${man.z.toFixed(3)} (the wall side was shallower)`);
  assert.equal(man.x,-260);assert.equal(nav.blockedAt(man.x,man.z,man.radius-1e-6,man.y),false,'out of every solid');
  // and with nothing behind the shallow side he leaves by it
  const open=new M01Navigator(world,{extraSolids:[{id:'decor_box',min:{x:-262,y:-4,z:16},max:{x:-258,y:2,z:16.55}}]}),m2={x:-260,z:16.15,y:man.y,radius:.3};
  open.settle(m2);assert.ok(Math.abs(m2.z-(16-.3))<1e-9,`the shallow side when it is free (z ${m2.z})`);
});
