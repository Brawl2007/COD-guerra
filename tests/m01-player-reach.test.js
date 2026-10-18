import test from 'node:test';
import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {supportAt,groundOk,deepestWall,PLAYER_PHYSICS as P} from '../src/world/m01-player-physics.js';

// Solid props, structures and the fence must never wall the mission off. A breadth-first search over a 1 m grid with the body's own rules
// (the ground may rise at most a step, no wall at the new place, a drop of more than a stair is a fall and not a walk) from the squad post
// must reach every place the mission sends the player.
const R=P.radius,H=P.standHeight;

/** Breadth-first flood of the places the body can walk to. `cell` metres, inside `region`; one level per half metre of height. */
function flood(world,start,{cell=2,region={x0:-470,x1:62,z0:-90,z1:150}}={}){
  const X0=region.x0,Z0=region.z0,key=(i,j,l)=>(i*4000+j)*64+l,level=y=>Math.round((y+16)*2),seen=new Map(),queue=[];
  const push=(i,j,y)=>{const k=key(i,j,level(y));if(seen.has(k))return;seen.set(k,{i,j,y});queue.push(k);};
  push(Math.round((start.x-X0)/cell),Math.round((start.z-Z0)/cell),start.y);
  for(let q=0;q<queue.length;q++){
    const {i,j,y}=seen.get(queue[q]);
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const ni=i+di,nj=j+dj,x=X0+ni*cell,z=Z0+nj*cell;
      if(x<region.x0||x>region.x1||z<region.z0||z>region.z1)continue;
      if(!groundOk(world,x,z,y,R))continue;
      const ground=supportAt(world,x,z,y);
      if(y-ground>P.snapDown)continue;                       // that is a fall
      if(deepestWall(world,x,z,y,R,H))continue;
      push(ni,nj,ground);
    }
  }
  const cells=[...seen.values()].map(c=>({x:X0+c.i*cell,z:Z0+c.j*cell,y:c.y}));
  return {size:seen.size,cells,near:(x,z,radius=cell*1.6)=>cells.some(c=>Math.hypot(c.x-x,c.z-z)<=radius)};
}

// Places the player's mission sends him to, with why each is expected (map-layout features + the places the simulation moves people to).
const SENTINELS=[
  ['squad_post',-70,22],['forward_post (the sandbag cover at the rail portal)',18,3],['repair_site_1',-40,10],['repair_site_2',-120,9],['rally_point',-150,14],
  ['rail_hut pickup (inside, by the west door)',-262,22],['firing_point',-290,22],['aid_position',-8,48],['shelter (interior by the bench)',-262,71],['station yard (EVACUATION)',-332,24],
  ['sandbag cover mid_1',-25,18],['sandbag cover mid_2',-25,28],['trench 1',-45,15],['trench 2',-60,22],['west end of the combat fence (x<-320)',-325,66],['east end of the combat fence',-40,66],
  ['gate in the combat fence',-261,66],['by the casemate (north)',13,30],['by the casemate (south)',13,52],['between the bridges at the bank',20,20]];

for(const [name,consumed] of [['at the start',[]],['after the west demolition',['evt_m01_west_demolition']]]){
  test(`every place of the mission is reachable on foot from the squad post (${name})`,()=>{
    const world=new TczewWorld();if(consumed.length)world.refresh(consumed,{});
    const start={x:-66,z:22,y:world.heightAt(-66,22)},reach=flood(world,start);
    assert.ok(reach.size>7000,`a large connected area (${reach.size} cells of 2 m)`);
    const missing=SENTINELS.filter(([,x,z])=>!reach.near(x,z,3.4)).map(([n])=>n);
    assert.deepEqual(missing,[]);
    // Bąk's wound point is on the road deck (55,41), the forward post on the rail line: both are reached by walking up the abutments' west ends
    if(!consumed.length){   // the west demolition takes the first two spans away
      assert.ok(reach.near(55,41,3.4)&&reach.cells.some(c=>c.y===0&&c.x>40&&c.z>36&&c.z<44),'the road deck is reachable');
      assert.ok(reach.cells.some(c=>c.y===0&&c.x>20&&Math.abs(c.z)<4),'the rail deck is reachable');
    }
  });
}

test('the sealed places stay sealed: the ckm horseshoe (until the west demolition), the casemate interior and the abutment tops from the side',()=>{
  const world=new TczewWorld(),start={x:-66,z:22,y:world.heightAt(-66,22)},fine={cell:.5,region:{x0:-65,x1:34,z0:14,z1:62}};
  // a fine flood round the bridgehead, seeded from open ground well west of it
  const seed={x:-50,z:26,y:world.heightAt(-50,26)},before=flood(world,seed,fine);
  assert.equal(before.near(7.17,26,.8),false,'nobody walks into the gun position');
  assert.equal(before.cells.some(c=>c.x>2&&c.x<24&&c.z>35&&c.z<45&&c.y<-3.5),false,'nobody walks into the casemate');
  assert.ok(before.near(7.17,22,.8)&&before.near(14,30,.8)&&before.near(14,50,.8),'the ground round the horseshoe and the casemate is open');
  world.refresh(['evt_m01_west_demolition'],{});
  const after=flood(world,seed,fine);
  assert.equal(after.near(7.17,26,.8),true,'the horseshoe goes with the west demolition and the ground is free');
  void start;
});

test('the narrow ways stay open: the shelter passage, the hut door and the gate in the combat fence (0.5 m grid)',()=>{
  const world=new TczewWorld();
  const shelter=flood(world,{x:-263,z:58,y:world.heightAt(-263,58)},{cell:.5,region:{x0:-275,x1:-248,z0:52,z1:80}});
  assert.ok(shelter.near(-263,60,.4)&&shelter.near(-263,66,.4)&&shelter.near(-263,70,.4),'from the road crest through the gate and the L passage into the shelter');
  assert.ok(shelter.near(-259,72,.5),'and across its floor');
  const hut=flood(world,{x:-282,z:21,y:world.heightAt(-282,21)},{cell:.5,region:{x0:-290,x1:-246,z0:8,z1:32}});
  assert.ok(hut.near(-268,21,.4)&&hut.near(-262,22,.5),'in by the west door to the crate');
});
