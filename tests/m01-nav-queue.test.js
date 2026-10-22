import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,CKM_POSITION,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01Navigator,NAV,playerSolidsForNav} from '../src/world/m01-navigation.js';
import {clippingAudit} from './helpers/m01-clipping.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

// Navigator work (2026-10-19): one route() per tick through the roster order, work buffers kept and reused between plans, the solid list built before the first plan, and the
// neighbour queries of a walking man (bodiesNear, steerAround, exits, near) on reused storage. None of it may change what a man does: every test below compares with the
// behaviour the code had before (a fresh navigator, or a reference copy of the old routine written out here), never with a number written for the new code.

const ready=(seed=17)=>{const s=new M01Simulation(seed);s.tick(.05,{skip:true});return s;};
// Five allies on the east side of the rail hut, each sent to its far side: every one of them needs a detour on the very same tick.
const CROWD=['tadeusz_nowicki','staszek_pawlak','east_platoon_voice','generic_rifleman','sapper_2'];
function crowd(s){
  const men=CROWD.map(id=>s.actor(id));
  men.forEach((m,k)=>Object.assign(m,{x:-238-k*.9,z:19+k*.8,y:s.world.heightAt(-238-k*.9,19+k*.8),target:{x:-284,z:20+k*.5},state:'GUARD'}));
  return men;
}
// route() calls, with the tick (clock) and the man each belongs to.
function logRoutes(s){
  const calls=[],real=s.navigator.route.bind(s.navigator);
  s.navigator.route=(a,g)=>{calls.push({tick:Math.round(s.clock/.05),id:a.id});return real(a,g);};
  return calls;
}
const perTick=calls=>{const n=new Map();for(const c of calls)n.set(c.tick,(n.get(c.tick)??0)+1);return n;};

test('at most one route() per tick: the man the roster reaches first plans, the others keep the straight walk and are served one tick apart in roster order',{timeout:300000},()=>{
  const s=ready(),men=crowd(s),calls=logRoutes(s),audit=clippingAudit();
  const order=men.map(m=>m.id).sort((p,q)=>s.actors.indexOf(s.actor(p))-s.actors.indexOf(s.actor(q)));
  const x0=men.map(m=>m.x);
  s.tick(.05,{});audit.observe({sim:s});
  assert.equal(NAV.routesPerTick,1);
  assert.equal(calls.length,1,'one plan in the first tick, though five men need one');
  assert.equal(calls[0].id,order[0],'the lowest roster index first');
  assert.ok(s.actor(order[0]).nav,'he has his route');
  for(const id of order.slice(1)){const m=s.actor(id);assert.equal(m.nav,undefined,`${id} waits with nothing saved`);assert.ok(m.x<x0[CROWD.indexOf(id)],`${id} keeps walking (the straight walk) while he waits`);}
  for(let i=0;i<60;i++){s.tick(.05,{});audit.observe({sim:s});}
  const byTick=perTick(calls);
  assert.equal(Math.max(...byTick.values()),1,'never two route() calls in one tick');
  assert.deepEqual(calls.map(c=>c.id),order,'served in roster order, one per tick');
  assert.deepEqual(calls.map(c=>c.tick),[1,2,3,4,5].map(k=>calls[0].tick+k-1),'on consecutive ticks');
  for(let i=0;i<20*60&&men.some(m=>Math.hypot(m.x+284,m.z-(20+CROWD.indexOf(m.id)*.5))>=.8);i++){s.tick(.05,{});audit.observe({sim:s});}
  for(const m of men)assert.ok(Math.hypot(m.x+284,m.z-(20+CROWD.indexOf(m.id)*.5))<.8,`${m.id} arrived (${m.x.toFixed(2)},${m.z.toFixed(2)})`);
  assert.deepEqual(audit.report().filter(l=>CROWD.some(id=>l.includes(` ${id} `))),[],'and none of them clips a wall on the way');
  assert.ok(Math.max(...perTick(calls).values())<=1);
});

test('the number of routes per tick is NAV.routesPerTick, nothing else',{timeout:300000},()=>{
  const was=NAV.routesPerTick;
  try{
    NAV.routesPerTick=2;
    const s=ready(),men=crowd(s),calls=logRoutes(s);void men;
    for(let i=0;i<40;i++)s.tick(.05,{});
    assert.equal(Math.max(...perTick(calls).values()),2);assert.equal(calls.length,5);
    const first=calls[0].tick;assert.deepEqual(calls.map(c=>c.tick),[first,first,first+1,first+1,first+2]);
  }finally{NAV.routesPerTick=was;}
});

test('the queue is derived, not saved: a run restored in the middle of it makes the same choices as the run that was not interrupted',{timeout:300000},()=>{
  const s=ready();crowd(s);
  for(let i=0;i<2;i++)s.tick(.05,{});   // two men are served, three still wait
  const waiting=CROWD.map(id=>s.actor(id)).filter(m=>m.nav===undefined).map(m=>m.id);
  assert.equal(waiting.length,3,'three men are waiting for a slot at the moment of the save');
  const save=s.snapshot();validateM01Snapshot(save);
  for(const m of save.actors)if(waiting.includes(m.id))assert.equal(Object.hasOwn(m,'nav'),false,'nothing about the queue is in the save');
  const keys=Object.keys(save).sort();assert.ok(!keys.some(k=>/^(nav|route|plan|slot|queue)/i.test(k)),`no queue field in the save (${keys.join(',')})`);
  // The routes that follow, in the original run and in a restore of the save.
  const original=logRoutes(s),restored=new M01Simulation(1);restored.restoreSnapshot(json(save));const copy=logRoutes(restored);
  for(let i=0;i<30;i++){s.tick(.05,{});restored.tick(.05,{});}
  assert.deepEqual(copy,original,'the restored run plans for the same men on the same ticks');
  assert.deepEqual(original.map(c=>c.id),waiting.sort((p,q)=>s.actors.indexOf(s.actor(p))-s.actors.indexOf(s.actor(q))),'the three that waited, in roster order');
  // And the whole state, tick by tick, with a restore of the restore (and a second one) in the middle of the queue.
  const t=ready();crowd(t);t.tick(.05,{});
  const rec=compareContinuation(t,{label:'a detour queue continues identically after a restore',ticks:250,doubleAt:[1,2,3,60]});
  assert.equal(rec.firstDivergence,null);
});

test('a save made while men wait resumes: the four who have no route plan, one per tick',()=>{
  const s=ready();crowd(s);s.tick(.05,{});
  const save=s.snapshot();
  const b=new M01Simulation(1);b.restoreSnapshot(save);const calls=logRoutes(b);
  for(let i=0;i<10;i++)b.tick(.05,{});
  assert.equal(calls.length,4,'the four who had no route plan, one per tick');assert.ok(Math.max(...perTick(calls).values())<=1);
});

// ---- Reused buffers carry nothing from one plan to the next ----
const world=new TczewWorld();
const make=(w=world)=>new M01Navigator(w,{emplacement:CKM_POSITION,extraSolids:playerSolidsForNav});
const walker=(x,z,w=world)=>({x,z,y:w.heightAt(x,z),radius:.3});
// A small plan (the rail hut), a long one over the river reach, a wide one (the station is 122 m long), one with no answer (the middle of the station), and the casemate walk.
const QUERIES=[
  ['hut',walker(-240,20),{x:-282,z:20}],
  ['casemate walk',walker(-72.5,20.6),{x:55,z:41}],
  ['behind the station',walker(-400,25),{x:-400,z:58}],
  ['no way',walker(-400,25),{x:-400,z:41}],
  ['yard wagons',walker(-300,30),{x:-480,z:30}],
  ['straight line',walker(-200,20),{x:-150,z:20}],
  ['west bank to the deck',walker(-30,38),{x:90,z:40}],
];
const reference=QUERIES.map(([,a,g])=>make().route({...a},g));
const poison=nav=>{const b=nav.buf;if(!b)return;b.blocked.fill(255);b.groundY.fill(1234.5);b.g.fill(0);b.parent.fill(7);b.closed.fill(1);
  b.heap.f.fill(-1);b.heap.i.fill(3);b.heap.n=7;};   // seven entries left in the heap, cheaper than anything the next plan pushes

test('the reference answers are real: some detour, some fail, one is a straight line',()=>{
  assert.equal(reference[0].length>=2,true);assert.equal(reference[3],null);assert.deepEqual(reference[5],[[-150,20]]);assert.ok(reference[2]);assert.ok(reference[1]);
});

test('reused buffers do not leak: every plan, after any other plan, is identical to the same plan on a fresh navigator',{timeout:300000},()=>{
  const nav=make();
  const sequences=[[0,1,2,3,4,5,6],[3,2,1,0],[2,0,2,0],[6,5,4,3,2,1,0],[0,0,1,1]];
  for(const seq of sequences)for(const k of seq){
    const [label,a,g]=QUERIES[k];assert.deepEqual(nav.route({...a},g),reference[k],`${label} after ${seq.join(',')}`);
  }
});

test('reused buffers do not leak: even buffers full of garbage between two plans change nothing',{timeout:300000},()=>{
  const nav=make();
  for(const k of [0,2,1,3,4,5,6,3,0,2,6,1]){
    const [label,a,g]=QUERIES[k];poison(nav);
    assert.deepEqual(nav.route({...a},g),reference[k],`${label} on poisoned buffers`);
  }
});

test('the buffers are kept: no grid is allocated for a plan that fits, and they only ever grow',{timeout:300000},()=>{
  const nav=make(),names=['blocked','groundY','g','parent','closed'],run=k=>nav.route({...QUERIES[k][1]},QUERIES[k][2]);
  assert.equal(nav.buf,null,'nothing is allocated before the first plan');
  run(0);const first=nav.buf,held=names.map(k=>first[k]);assert.ok(first.cap>=1);
  run(0);run(0);assert.equal(nav.buf,first,'the same grids for the same plan');names.forEach((k,i)=>assert.equal(nav.buf[k],held[i],k));
  let cap=first.cap;
  for(const k of [2,3,4,1,0,6,0,5]){run(k);assert.ok(nav.buf.cap>=cap,'the grids only grow');cap=nav.buf.cap;}
  assert.ok(cap>first.cap,'a wide window needed more cells than the rail hut');assert.ok(cap<=NAV.maxCells*1.25,`and they stay bounded (${cap} cells)`);
  const big=nav.buf;for(const k of [0,1,5,6,0,3,2])run(k);
  assert.equal(nav.buf,big,'no new grids for plans that fit');assert.equal(nav.buf.cap,cap);
});

test('the solid list is built before the first plan: at construction and after a load',()=>{
  const s=new M01Simulation(17);
  assert.equal(s.navigator.built,s.world.revision,'built at construction');const solids=s.navigator.solids,buckets=s.navigator.buckets;assert.ok(solids.length>100);
  Object.assign(s.actor('staszek_pawlak'),{x:-240,z:20,y:s.world.heightAt(-240,20)});
  assert.ok(s.navigator.route(s.actor('staszek_pawlak'),{x:-282,z:20}).length>=2);
  assert.equal(s.navigator.solids,solids,'the first plan used the list that was already there');assert.equal(s.navigator.buckets,buckets);
  // A load: the world is refreshed to the saved events, and the navigator is warmed after that refresh.
  const t=new M01Simulation(1);t.restoreSnapshot(json(ready().snapshot()));
  assert.equal(t.navigator.built,t.world.revision,'built after the load');
  const east=ready();east.world.refresh(['evt_m01_east_demolition']);assert.notEqual(east.navigator.built,east.world.revision,'a world that moved after the warm-up is rebuilt on its next use');
  east.navigator.near(0,0,1,1,0);assert.equal(east.navigator.built,east.world.revision);
});

// ---- Neighbour queries on reused storage behave as the routines they replace ----
let seed=424242;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

test('exits: the faces in the stable order of their depth, for axis-aligned and rotated boxes, ties included',()=>{
  // The routine before 2026-10-19, written out: four fresh records, Array.prototype.sort on the depth (stable).
  const toLocal=(o,x,z)=>{const dx=x-o.cx,dz=z-o.cz;return [dx*o.c-dz*o.s,dx*o.s+dz*o.c];};
  const old=(a,s)=>{
    const r=a.radius;
    if(s.obb){const o=s.obb,[lx,lz]=toLocal(o,a.x,a.z),d=[lx+r+o.hx,o.hx-(lx-r),lz+r+o.hz,o.hz-(lz-r)];
      if(d.some(v=>v<=0))return null;
      const at=(px,pz)=>({x:o.cx+px*o.c+pz*o.s,z:o.cz-px*o.s+pz*o.c});
      return [{depth:d[0],...at(-o.hx-r,lz)},{depth:d[1],...at(o.hx+r,lz)},{depth:d[2],...at(lx,-o.hz-r)},{depth:d[3],...at(lx,o.hz+r)}].sort((p,q)=>p.depth-q.depth);}
    const d=[a.x+r-s.min.x,s.max.x-(a.x-r),a.z+r-s.min.z,s.max.z-(a.z-r)];
    if(d.some(v=>v<=0))return null;
    return [{depth:d[0],x:s.min.x-r,z:a.z},{depth:d[1],x:s.max.x+r,z:a.z},{depth:d[2],x:a.x,z:s.min.z-r},{depth:d[3],x:a.x,z:s.max.z+r}].sort((p,q)=>p.depth-q.depth);
  };
  const nav=make(),plain={min:{x:-10,y:-4,z:-6},max:{x:-4,y:2,z:2}},yaw=.7,o={cx:20,cz:5,hx:3,hz:1.5,c:Math.cos(yaw),s:Math.sin(yaw)},rotated={obb:o,min:{x:0,y:0,z:0},max:{x:0,y:0,z:0}};
  let overlaps=0,ties=0;
  for(let k=0;k<4000;k++){
    const r=rnd()<.5?.3:.36;let a;
    if(k%4===0)a={x:-7,z:-2,radius:r};                                        // the exact centre of the plain box: equal depths on both axes
    else if(k%4===1)a={x:o.cx,z:o.cz,radius:r};                               // the centre of the rotated box
    else a={x:(k%2?-10:19)+(rnd()-.5)*10,z:(k%2?-2:5)+(rnd()-.5)*8,radius:r};
    for(const s of [plain,rotated]){
      const want=old(a,s),got=nav.exits(a,s);
      if(want===null){assert.equal(got,null);continue;}
      overlaps++;assert.equal(got.length,4);
      assert.deepEqual(got.map(e=>[e.depth,e.x,e.z]),want.map(e=>[e.depth,e.x,e.z]),`exits at (${a.x},${a.z})`);
      if(want[0].depth===want[1].depth)ties++;
    }
  }
  assert.ok(overlaps>1000&&ties>200,`the cases cover overlaps (${overlaps}) and ties (${ties})`);
});

test('near() fills the list it is given and returns it; lists of different callers do not touch each other',()=>{
  const nav=make(),mine=[99,98];
  assert.equal(nav.near(-300,10,-250,30,-3,false,mine),mine);assert.ok(mine.length>0&&!mine.includes(99),'emptied first');
  assert.deepEqual(nav.near(-300,10,-250,30,-3),mine,'the same answer without a list of your own');
  const other=[];nav.near(300,30,330,50,0,true,other);assert.notDeepEqual(other,mine);assert.deepEqual(nav.near(-300,10,-250,30,-3,false,[]),mine);
  // settle() holds its list while pushFree() asks again: a man inside a decor box next to a collider still comes out the free side (the tests of m01-npc-navigation cover the geometry).
  assert.ok(nav.nearSettle!==nav.nearPush&&nav.nearClear!==nav.nearPlan&&nav.nearBlocked!==nav.nearClear);
});

test('the mark counter wraps without a solid being listed twice or missed',()=>{
  const nav=make();nav.sync();const before=nav.near(-300,10,-250,30,-3,false,[]);
  nav.stamp=0x3fffffff;const after=nav.near(-300,10,-250,30,-3,false,[]);
  assert.deepEqual(after,before);assert.ok(nav.stamp<10);assert.deepEqual(nav.near(-300,10,-250,30,-3,false,[]),before);
});

// The routines of m01-simulation.js before 2026-10-19, written out.
const SLACK=.1;   // SEPARATION_SLACK
const oldBodies=(s,a,x,z,reach)=>{
  const out=[];
  for(const b of s.actors){
    if(b===a||!b.alive||!b.active||b.carriedBy||a.carriedBy===b.id||Math.abs(b.y-a.y)>1.5)continue;
    if(Math.abs(b.x-x)<=reach&&Math.abs(b.z-z)<=reach)out.push(b);
  }
  const p=s.player;if(p.alive&&Math.abs(p.y-a.y)<=1.5&&Math.abs(p.x-x)<=reach&&Math.abs(p.z-z)<=reach)out.push(p);
  return out;
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function oldSteer(s,a,wanted,step){
  const near=oldBodies(s,a,a.x,a.z,step+1.2);if(!near.length)return wanted;
  const at=(h)=>({x:a.x+Math.cos(h)*step,z:a.z+Math.sin(h)*step});
  const blocker=(h)=>{const p=at(h);return near.find(b=>{const n=dist(b,p);return n<a.radius+b.radius-SLACK&&n<dist(b,a);});};
  const first=blocker(wanted);if(!first)return wanted;
  const cross=Math.cos(wanted)*(first.z-a.z)-Math.sin(wanted)*(first.x-a.x),side=Math.abs(cross)>1e-3?(cross>0?-1:1):(s.actors.indexOf(a)%2?1:-1);
  for(const turn of [.6,-.6,1.2,-1.2]){const h=wanted+side*turn;if(!blocker(h))return h;}
  return null;
}
function crowded(){
  const s=ready(),men=s.actors.filter(a=>!a.displayOnly);
  // Everybody on a patch of ground 14 m by 14 m near the hut: living and dead, present and absent, carried, on two levels, some on the very same spot.
  for(const m of men){
    const x=-250+rnd()*14,z=14+rnd()*14;
    Object.assign(m,{x,z,y:s.world.heightAt(x,z)+(rnd()<.15?2:0),alive:rnd()<.85,active:rnd()<.8,carriedBy:rnd()<.05?'jozef_bak':null,radius:.3+rnd()*.05});
    if(rnd()<.05){m.x=Math.round(m.x*2)/2;m.z=Math.round(m.z*2)/2;}
  }
  return {s,men};
}

test('bodiesNear / gatherBodies: the same men in the same (roster) order as the routine they replaced, and the player last',()=>{
  const {s,men}=crowded();let nonEmpty=0,queries=0;
  s.player.x=-243;s.player.z=21;s.player.y=s.world.heightAt(-243,21);
  for(let k=0;k<3000;k++){
    const a=men[Math.floor(rnd()*men.length)],reach=rnd()<.5?1:.8+rnd()*2,x=rnd()<.5?a.x:a.x+(rnd()-.5)*2,z=rnd()<.5?a.z:a.z+(rnd()-.5)*2;
    const want=oldBodies(s,a,x,z,reach),got=s.bodiesNear(a,x,z,reach),n=s.gatherBodies(a,x,z,reach);queries++;
    assert.equal(got.length,want.length);for(let i=0;i<want.length;i++)assert.equal(got[i],want[i],`query ${k}, place ${i}`);
    assert.equal(n,want.length,'gatherBodies counts the same men');
    if(want.length)nonEmpty++;
    if(k%500===0)s.player.alive=!s.player.alive;
  }
  assert.ok(nonEmpty>1000,`${nonEmpty} of ${queries} queries found somebody`);
  // bodiesNear hands out an array of its own each time; what a walker asks every tick (gatherBodies) allocates none.
  const a=men[3];assert.notEqual(s.bodiesNear(a,a.x,a.z,3),s.bodiesNear(a,a.x,a.z,3));assert.ok(Array.isArray(s.bodiesNear(a,a.x,a.z,3)));
});

// separate() before 2026-10-19, written out (the fresh list, the same pushes).
function oldSeparate(s,a){
  for(const b of oldBodies(s,a,a.x,a.z,1)){
    const space=a.radius+b.radius-SLACK;let dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);
    if(d>=space)continue;
    if(d<1e-6){const angle=(s.actors.indexOf(a)-Math.max(0,s.actors.indexOf(b)))*2.399963;dx=Math.cos(angle);dz=Math.sin(angle);d=1;}
    const push=Math.min(.15,(space-Math.min(d,space))*(b.state==='ADVANCE'?.5:1));
    s.world.move(a,dx/d*push,dz/d*push);s.navigator.settle(a);
  }
}
test('separate: the same pushes as the routine it replaced, over a crowd',()=>{
  const {s,men}=crowded();let pushed=0;
  s.player.x=-243;s.player.z=21;s.player.y=s.world.heightAt(-243,21);
  for(let k=0;k<1500;k++){
    const a=men[Math.floor(rnd()*men.length)];if(!a.alive||!a.active)continue;
    const keep={x:a.x,z:a.z,y:a.y};
    oldSeparate(s,a);const want={x:a.x,z:a.z,y:a.y};Object.assign(a,keep);
    s.separate(a);
    assert.deepEqual({x:a.x,z:a.z,y:a.y},want,`separate ${k}`);
    if(want.x!==keep.x||want.z!==keep.z)pushed++;
    Object.assign(a,keep);   // the crowd stays where it was
  }
  assert.ok(pushed>150,`${pushed} men were pushed`);
});

test('steerAround: the same heading (or stop) as the routine it replaced, over a crowd',()=>{
  const {s,men}=crowded();let turned=0,stopped=0,straight=0;
  s.player.x=-243;s.player.z=21;s.player.y=s.world.heightAt(-243,21);
  for(let k=0;k<4000;k++){
    const a=men[Math.floor(rnd()*men.length)];if(!a.alive||!a.active)continue;
    const wanted=(rnd()-.5)*2*Math.PI,step=[.18,.275,.1,0][Math.floor(rnd()*4)];
    const want=oldSteer(s,a,wanted,step),got=s.steerAround(a,wanted,step);
    assert.ok(Object.is(got,want),`steer ${k}: ${got} vs ${want}`);
    if(want===null)stopped++;else if(want===wanted)straight++;else turned++;
  }
  assert.ok(turned>100&&stopped>20&&straight>100,`turned ${turned}, stopped ${stopped}, straight ${straight}`);
});
