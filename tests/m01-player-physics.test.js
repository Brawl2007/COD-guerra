import test from 'node:test';
import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {indexSolids} from '../src/world/m01-collision-layout.js';
import {movePlayer,supportAt,deepestWall,fallDamage,PLAYER_PHYSICS as P,SAFE_LANDING_SPEED,LETHAL_LANDING_SPEED} from '../src/world/m01-player-physics.js';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {compareContinuation} from './helpers/m01-determinism.js';
import {freshSim,drive} from './helpers/m01-collision-probe.js';

const R=P.radius;
/** A world with extra player solids (synthetic walls) added to the real one. */
function withSolids(extra){
  const world=new TczewWorld();
  const finish=b=>{const c=Math.cos(b.yaw??0),s=Math.sin(b.yaw??0),ex=Math.abs(c)*b.hx+Math.abs(s)*b.hz,ez=Math.abs(s)*b.hx+Math.abs(c)*b.hz;
    return {kind:'obstacle',yaw:0,...b,c,s,minX:b.cx-ex,maxX:b.cx+ex,minZ:b.cz-ez,maxZ:b.cz+ez};};
  world.playerSolids=[...world.playerSolids,...extra.map(finish)];world.solidIndex=indexSolids(world.playerSolids);
  return world;
}
const body=(world,x,z,extra={})=>({x,z,y:world.heightAt(x,z),radius:R,crouched:false,...extra});
const walk=(world,p,dx,dz,ticks,dt=.05)=>{const path=[];for(let i=0;i<ticks;i++){const landing=movePlayer(world,p,dx,dz,dt);path.push({x:p.x,y:p.y,z:p.z,landing});}return path;};

// The open patch between the embankments: no solid of any kind (asserted), terrain only.
const PATCH={x0:-130,x1:-90,z0:8,z1:26},O={x:-110,z:16};   // O: the middle of the patch, flat ground at -3

test('open ground: the new movement is bit-identical to the movement it replaced (so free-space routes and goldens do not move)',()=>{
  const world=new TczewWorld();
  for(const b of world.playerSolids)assert.ok(b.maxX<PATCH.x0-2||b.minX>PATCH.x1+2||b.maxZ<PATCH.z0-2||b.minZ>PATCH.z1+2,`${b.id} intrudes on the open patch`);
  // The previous implementation (TczewWorld.move, still used by the NPCs), driven on a second copy of the same actor.
  let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const a=body(world,-110,16),b={...a};
  for(let i=0;i<4000;i++){
    const angle=rnd()*Math.PI*2,speed=[0,3.8,6,2.3][Math.floor(rnd()*4)],dt=[.05,.013,.031][Math.floor(rnd()*3)];
    const dx=Math.cos(angle)*speed*dt,dz=Math.sin(angle)*speed*dt;
    // keep the pair inside the patch: turn back when near its edge
    const tx=(a.x<PATCH.x0+3?1:a.x>PATCH.x1-3?-1:Math.sign(dx))*Math.abs(dx),tz=(a.z<PATCH.z0+3?1:a.z>PATCH.z1-3?-1:Math.sign(dz))*Math.abs(dz);
    world.move(b,tx,tz);
    assert.equal(movePlayer(world,a,tx,tz,dt),null);
    if(a.x!==b.x||a.z!==b.z||a.y!==b.y)assert.fail(`diverged at step ${i}: new ${a.x},${a.z},${a.y} vs old ${b.x},${b.z},${b.y}`);
  }
  assert.ok(Math.hypot(a.x+110,a.z-16)>1,'the walk went somewhere');
});

test('a ledge up to 0.45 m is stepped onto and stood on; 0.5 m is a wall',()=>{
  const world=withSolids([{id:'low',cx:O.x+5,cz:O.z-2,hx:.5,hz:3,y0:-3,y1:-3+.4},{id:'high',cx:O.x+5,cz:O.z+6,hx:.5,hz:3,y0:-3,y1:-3+.5}]);
  const a=body(world,O.x,O.z-2),b=body(world,O.x,O.z+6);
  walk(world,a,.3,0,30);walk(world,b,.3,0,30);
  assert.ok(a.x>O.x+5.4,`crossed the 0.4 m ledge (x ${a.x})`);assert.equal(a.y,-3,'and stepped down on the far side');
  assert.ok(b.x<=O.x+5-.5-R+1e-6,`stopped by the 0.5 m wall (x ${b.x})`);
  const c=body(world,O.x+4,O.z-2);walk(world,c,.1,0,6);   // standing on the lid: y is the lid, no fall, no event
  assert.ok(Math.abs(c.y-(-3+.4))<1e-9&&!c.fall);
});

test('walls are slid along, not stuck on: a diagonal approach keeps its along-wall speed (axis-aligned and rotated)',()=>{
  for(const yaw of [0,.35,-.6,1.2]){
    // The wall's own frame: its local z axis runs along the wall, local x across it. world = centre + [cos sin; -sin cos] * local.
    const c=Math.cos(yaw),s=Math.sin(yaw),to=(lx,lz)=>[O.x+lx*c+lz*s,O.z-lx*s+lz*c];
    const world=withSolids([{id:'wall',cx:O.x,cz:O.z,hx:.2,hz:60,yaw,y0:-3,y1:3}]);
    const [sx,sz]=to(-4,-10),a=body(world,sx,sz);
    const step=.3,[dx,dz]=[step*.707*(c)+step*.707*s,step*.707*(-s)+step*.707*c];   // local (+.707, +.707) * step, in the world
    const path=walk(world,a,dx,dz,40);
    const local=(p)=>{const ox=p.x-O.x,oz=p.z-O.z;return [ox*c-oz*s,ox*s+oz*c];};
    const [lx,lz]=local(a);
    assert.ok(lx<=-.2-R+.01&&lx>=-.2-R-.02,`yaw ${yaw}: stands off the wall face (local x ${lx.toFixed(3)})`);
    assert.ok(lz-(-10)>40*step*.707*.97,`yaw ${yaw}: slid ${(lz+10).toFixed(2)} of ${(40*step*.707).toFixed(2)} m along the wall`);
    assert.ok(path.every(p=>local(p)[0]<=-.2-R+.011),'never inside');
  }
});

test('a 0.18 m fence never lets a sprinting body through, whatever the approach angle',()=>{
  const world=withSolids([{id:'fence',cx:O.x,cz:O.z,hx:1.5,hz:.09,y0:-3,y1:-1.8}]);
  let closest=Infinity,runs=0;
  for(let deg=0;deg<360;deg+=3){
    const a=body(world,O.x+Math.cos(deg*Math.PI/180)*3,O.z+Math.sin(deg*Math.PI/180)*3),ang=(deg+180)*Math.PI/180;
    for(let i=0;i<30;i++){
      movePlayer(world,a,Math.cos(ang)*.3,Math.sin(ang)*.3,.05);
      closest=Math.min(closest,Math.hypot(Math.max(Math.abs(a.x-O.x)-1.5,0),Math.max(Math.abs(a.z-O.z)-.09,0)));   // distance of the centre to the fence footprint
    }
    runs++;
  }
  assert.ok(closest>=R-.002,`the centre came within ${closest.toFixed(3)} m of the fence (radius ${R})`);assert.equal(runs,120);
});

test('a body placed inside a wall (an old save, a scripted placement) is pushed out within a tick, never trapped',()=>{
  const world=withSolids([{id:'crate',cx:O.x,cz:O.z,hx:1,hz:.5,y0:-3,y1:-1.5}]);
  for(const [x,z] of [[0,0],[.7,.1],[-.9,.4],[0,.45]]){
    const a=body(world,O.x+x,O.z+z);movePlayer(world,a,0,0,.05);
    const dx=Math.max(Math.abs(a.x-O.x)-1,0),dz=Math.max(Math.abs(a.z-O.z)-.5,0);
    assert.ok(Math.hypot(dx,dz)>=R-1e-3,`(${x},${z}) -> (${(a.x-O.x).toFixed(3)},${(a.z-O.z).toFixed(3)}) is still inside`);
  }
});

test('crouching passes under a 1.5 m beam that stops a standing body',()=>{
  const world=withSolids([{id:'beam',cx:O.x+5,cz:O.z,hx:.5,hz:3,y0:-3+1.5,y1:-3+2}]);
  const standing=body(world,O.x,O.z),crouched=body(world,O.x,O.z,{crouched:true});
  walk(world,standing,.3,0,30);walk(world,crouched,.3,0,30);
  assert.ok(standing.x<=O.x+5-.5-R+1e-6,`standing stopped (${standing.x})`);assert.ok(crouched.x>O.x+6,`crouched passed (${crouched.x})`);
});

test('an overhead ceiling (the bridge deck seen from below) is walked under',()=>{
  const world=new TczewWorld();
  const a=body(world,14,2);   // lowland under the first rail span (deck slab at -0.5..0, z +-4.6)
  assert.equal(a.y,0,'heightAt would put the body on the deck');a.y=-3;
  walk(world,a,.15,0,20);
  assert.ok(a.x>16&&a.y===-3,`walked under the deck at the lowland level (x ${a.x}, y ${a.y})`);
});

// ---------------------------------------------------------------- gravity
test('free fall follows y = y0 - g t^2 / 2 and lands with the energy speed, from 10 m',()=>{
  const world=new TczewWorld(),ground=world.heightAt(-110,16);
  const a=body(world,-110,16,{y:ground+10});a.fall={vy:0,vx:0,vz:0,startY:ground+10,t:0};
  let t=0,landing=null;const trace=[];
  for(let i=0;i<80&&!landing;i++){landing=movePlayer(world,a,0,0,.05);t+=.05;trace.push([t,a.y]);if(!landing)assert.ok(Math.abs(a.y-(ground+10-.5*P.gravity*t*t))<1e-9,`tick ${i}`);}
  assert.ok(landing,'it lands');assert.equal(a.y,ground);assert.equal(a.fall,undefined);
  assert.ok(Math.abs(landing.speed-Math.sqrt(2*P.gravity*10))<1e-6,`${landing.speed}`);
  assert.equal(landing.surface,'ground');assert.equal(landing.damage,100,'10 m is past the lethal height');
  assert.ok(Math.abs(landing.drop-10)<1e-9);
});

test('terminal speed caps a very long fall',()=>{
  const world=new TczewWorld(),ground=world.heightAt(-110,16),a=body(world,-110,16,{y:ground+600});a.fall={vy:0,vx:0,vz:0,startY:ground+600,t:0};
  let landing=null,fastest=0,last=a.y;
  for(let i=0;i<600&&!landing;i++){landing=movePlayer(world,a,0,0,.05);fastest=Math.max(fastest,(last-a.y)/.05);last=a.y;}
  assert.ok(landing.speed<=P.terminalSpeed+1e-9&&landing.damage===100&&fastest<=P.terminalSpeed+.1);
});

test('walking off a ledge keeps the walking momentum through the fall (the body arcs out, it does not drop straight down)',()=>{
  const world=new TczewWorld();
  // rail abutment east edge x=11.9, top -0.35, lowland -3 (outside the deck footprint z=8)
  const a=body(world,10.9,8),path=walk(world,a,.19,0,40);   // 3.8 m/s
  const landing=path.find(p=>p.landing).landing,flight=Math.sqrt(2*2.65/P.gravity);
  assert.ok(a.x>11.9+3.8*flight*.7,`carried ${a.x-11.9} m beyond the edge, flight ${flight.toFixed(2)} s`);
  assert.ok(Math.abs(landing.speed-Math.sqrt(2*P.gravity*2.65))<.4&&landing.damage===0&&landing.surface==='ground');
});

test('falling off the river bank lands in the water: a splash, no damage, y at the river level',()=>{
  const world=new TczewWorld(),a=body(world,23,20);   // lowland ends at x=25, the channel is 7 m lower
  const path=walk(world,a,.19,0,60),landing=path.find(p=>p.landing)?.landing;
  assert.ok(landing,'a landing');assert.equal(landing.surface,'water');assert.equal(landing.damage,0);
  assert.ok(Math.abs(landing.drop-7)<.01&&Math.abs(a.y-(-10))<1e-9);
});

test('the fall damage curve: nothing up to 3 m, lethal from 9 m, increasing in between',()=>{
  assert.equal(fallDamage(0),0);assert.equal(fallDamage(SAFE_LANDING_SPEED),0);assert.equal(fallDamage(Math.sqrt(2*P.gravity*2.99)),0);
  assert.equal(fallDamage(LETHAL_LANDING_SPEED),100);assert.equal(fallDamage(60),100);
  let last=0;for(let v=SAFE_LANDING_SPEED;v<=LETHAL_LANDING_SPEED;v+=.25){const d=fallDamage(v);assert.ok(d>=last);last=d;}
  assert.ok(fallDamage(Math.sqrt(2*P.gravity*5))>=30&&fallDamage(Math.sqrt(2*P.gravity*5))<=50);
});

// ---------------------------------------------------------------- through the simulation
test('the landing is one transient event with the numbers the presentation needs; a stair makes none',()=>{
  const sim=freshSim(),events=[];
  const path=drive(sim,{x:10.6,z:8,y:-.35,angle:0,ticks:40,sprint:false});
  for(const p of path)events.push(...(p.events??[]));
  const landings=events.filter(e=>e.type==='player-landing');
  assert.equal(landings.length,1);
  const e=landings[0];
  assert.deepEqual(Object.keys(e).sort(),['damage','drop','point','speed','surface','type']);
  assert.ok(Number.isFinite(e.speed)&&e.speed>7&&e.speed<7.5&&e.drop>2.6&&e.drop<2.7&&Number.isFinite(e.point.x)&&e.point.y===-3);
  // stepping down the 0.35 m abutment lip (a stair): no event
  const stair=freshSim(),p2=drive(stair,{x:-26,z:2,y:0,angle:0,ticks:30,sprint:false}).flatMap(q=>q.events??[]);
  assert.deepEqual(p2.filter(x=>x.type==='player-landing'),[]);
});

test('a fatal fall kills through the simulation: the checkpoint is restored with the reason',()=>{
  const sim=freshSim(),p=sim.player;
  Object.assign(p,{x:-200,z:30,y:sim.world.heightAt(-200,30)+12,health:100});
  p.fall={vy:0,vx:0,vz:0,startY:p.y,t:0};
  const events=[];for(let i=0;i<70;i++){sim.tick(.05,{});events.push(...sim.drainEvents());if(events.some(e=>e.type==='restored'))break;}
  assert.ok(events.some(e=>e.type==='player-landing'&&e.damage===100),'a lethal landing');
  assert.ok(events.some(e=>e.type==='restored'),'restored');
  assert.ok(events.some(e=>e.type==='message'&&/altura fatal/.test(e.message)),'the reason is announced');
  assert.equal(sim.player.alive,true);assert.equal(sim.player.fall,undefined);
});

test('an airborne save restores and continues bit for bit; a grounded save carries no fall field; bad fall records are rejected',()=>{
  const sim=freshSim();
  assert.equal(sim.snapshot().player.fall,undefined,'a grounded player is saved exactly as before');
  Object.assign(sim.player,{x:10.9,z:8,y:-.35,angle:0});
  for(let i=0;i<6;i++)sim.tick(.05,{forward:1});
  assert.ok(sim.player.fall,'airborne after walking off the edge');
  const snap=sim.snapshot();assert.ok(snap.player.fall&&Object.keys(snap.player.fall).length===5);validateM01Snapshot(structuredClone(snap));
  compareContinuation(sim,{label:'airborne save',ticks:90,input:t=>t<40?{forward:1,sprint:t%2===0}:{}});
  for(const bad of [{...snap.player.fall,vy:3},{...snap.player.fall,vx:NaN},{...snap.player.fall,extra:1},{vy:-1}]){
    const s=structuredClone(snap);s.player.fall=bad;assert.throws(()=>validateM01Snapshot(s),/queda|número/);
  }
  const legacy=structuredClone(snap);delete legacy.player.fall;validateM01Snapshot(legacy);   // a save without the field is simply grounded
  const again=new M01Simulation(1);again.restoreSnapshot(legacy);assert.equal(again.player.fall,undefined);
});

test('support: a deck is reachable only from within a step of it; the terrain is the fallback, so the lowland under a span stays walkable',()=>{
  const world=new TczewWorld();
  assert.equal(supportAt(world,14,2,0),0,'on the first rail span');
  assert.equal(supportAt(world,14,2,-3),-3,'under it, at the lowland level, the terrain holds');
  assert.equal(supportAt(world,14,2,-.2),0,'a body 0.2 m under the deck top steps onto it');
  assert.equal(supportAt(world,60,0,0),0,'on the span over the river');
  assert.equal(supportAt(world,60,0,-3),-10,'under the span over the river is the river: not a floor at the deck');
});

// ---------------------------------------------------------------- review fixes (F1 horseshoe release, air speed, escort gravity)
test('air control steers a share of the momentum but never makes the body faster than it took off or than the ground input',()=>{
  const world=new TczewWorld();
  const flight=(vx,input,ticks=20)=>{   // just past the rail abutment edge (x 11.9, 2.65 m up) with a take-off speed vx, while the walking input keeps pressing
    const a=body(world,12.2,8,{y:-.35});a.fall={vy:0,vx,vz:0,startY:-.35,t:0};
    let fastest=0,airborne=0;for(let i=0;i<ticks&&a.fall;i++){const x0=a.x,z0=a.z;movePlayer(world,a,input*.05,0,.05);fastest=Math.max(fastest,Math.hypot(a.x-x0,a.z-z0)/.05);airborne++;}
    return {fastest,airborne};
  };
  const walking=flight(3.8,3.8);assert.ok(walking.airborne>=8,'a real flight');
  assert.ok(walking.fastest<=3.8+1e-9,`walking off the edge and holding forward: ${walking.fastest.toFixed(3)} m/s in the air (it was 4.75 m/s with the 25 % added on top)`);
  const sprinted=flight(6,3.8);assert.ok(sprinted.fastest<=6+1e-9,`a sprint released in the air stays at most 6 m/s (${sprinted.fastest.toFixed(3)})`);
  const lunged=flight(0,3.8);assert.ok(lunged.fastest>0&&lunged.fastest<=3.8+1e-9,`pressing forward from a standstill steers without exceeding the ground speed (${lunged.fastest.toFixed(3)})`);
});

test('the escort push does not advance gravity a second time in a tick (an airborne player falls at the same rate with and without it)',()=>{
  const make=()=>{const sim=freshSim();Object.assign(sim.player,{x:-91,z:16,y:sim.world.heightAt(-91,16)+10,angle:0,health:100});   // east of x -95, where the escort push stops
    sim.player.fall={vy:0,vx:0,vz:0,startY:sim.player.y,t:0};return sim;};
  const plain=make(),escorted=make();
  Object.assign(escorted.actor('marek_zielinski'),{x:-90,z:16});escorted.timers.escort=true;
  for(let i=0;i<12;i++){plain.tick(.05,{});escorted.tick(.05,{});plain.drainEvents();escorted.drainEvents();}
  assert.ok(plain.player.fall&&escorted.player.fall,'both still falling');
  assert.equal(escorted.player.fall.vy,plain.player.fall.vy,'the same fall speed');assert.equal(escorted.player.y,plain.player.y,'the same height');
  assert.ok(Math.abs(plain.player.fall.vy+P.gravity*12*.05)<1e-9,`g t after 0.6 s: ${plain.player.fall.vy}`);
});

test('the ckm sandbag ring holds a body on its north, south and front sides, has a door at the rear, and a save made inside it is restored where it was made',()=>{
  // 2026-10-18 (phys x npc integration): the ring has a door in its back wall (one table for renderer, NPC navigation and player: src/world/m01-nav-layout.js). It used to be
  // closed on four sides, so a save holding the player inside it was released on restore at (9.6, 25.5) (review fix F1); with the door that release would teleport a player who
  // walked in and saved there, so it is gone and this test checks the door premise instead: the walls still hold, the door lets the body out, the position is kept.
  const held=freshSim();Object.assign(held.player,{x:6.5,z:25.5,y:-3,angle:0});for(let i=0;i<60;i++)held.tick(.05,{forward:1,sprint:true});
  assert.ok(held.player.x<9.07,`walking east the front wall holds him, x ${held.player.x}`);
  const north=freshSim();Object.assign(north.player,{x:6.5,z:25.5,y:-3,angle:-Math.PI/2});for(let i=0;i<60;i++)north.tick(.05,{forward:1,sprint:true});
  assert.ok(north.player.z>=24-1e-6+R-.01,`walking north the north wall holds him, z ${north.player.z}`);
  const south=freshSim();Object.assign(south.player,{x:6.5,z:25.5,y:-3,angle:Math.PI/2});for(let i=0;i<60;i++)south.tick(.05,{forward:1,sprint:true});
  assert.ok(south.player.z<=27.2+1e-6-R+.01,`walking south the south wall holds him, z ${south.player.z}`);
  assert.equal(deepestWall(held.world,4.67,25.5,-3,R,1.8),null,'the rear door is free of every solid');
  for(const [x,z] of [[6.5,25.5],[5.3,24.4],[8.2,26.8],[7.17,26]]){
    const sim=freshSim();Object.assign(sim.player,{x,z,y:-3});delete sim.player.fall;
    const saved=structuredClone(sim.snapshot());
    const back=new M01Simulation(3);back.restoreSnapshot(saved);
    assert.deepEqual([back.player.x,back.player.z,back.player.y],[x,z,-3],`restored where it was saved, from ${x},${z}`);
    assert.equal(back.player.fall,undefined);assert.equal(back.player.alive,true);
    // and it walks out by the door: to the middle of the doorway, then west
    const door={x:4.67,z:25.5};back.player.angle=Math.atan2(door.z-z,door.x-x);
    for(let i=0;i<40&&Math.hypot(back.player.x-door.x,back.player.z-door.z)>.2;i++)back.tick(.05,{forward:1});
    back.player.angle=Math.PI;for(let i=0;i<30;i++)back.tick(.05,{forward:1});
    assert.ok(back.player.x<4,`out of the ring through the rear door, at x ${back.player.x.toFixed(2)} (the back wall is at x 4.47..4.87)`);
  }
  // A body saved overlapping a wall of the ring is pushed out by its first move, as any body overlapping a new solid is.
  const over=freshSim();Object.assign(over.player,{x:6.5,z:24.1,y:-3,angle:0});delete over.player.fall;
  const o2=new M01Simulation(3);o2.restoreSnapshot(structuredClone(over.snapshot()));assert.deepEqual([o2.player.x,o2.player.z],[6.5,24.1]);
  assert.ok(deepestWall(o2.world,6.5,24.1,-3,R,1.8),'the saved place overlaps the north wall');
  o2.tick(.05,{forward:1});assert.equal(deepestWall(o2.world,o2.player.x,o2.player.z,o2.player.y,R,1.8),null,'free after one move');
  // after the west demolition the ring is gone and nothing holds the body
  const gone=freshSim();gone.consumed['evt_m01_west_demolition']=gone.clock;Object.assign(gone.player,{x:6.5,z:25.5,y:-3});
  const g=new M01Simulation(3);g.restoreSnapshot(structuredClone(gone.snapshot()));assert.deepEqual([g.player.x,g.player.z],[6.5,25.5],'no ring after the west demolition');
  assert.equal(deepestWall(g.world,4.67,24,-3,R,1.8),null,'the jamb is gone with the demolition');
});
