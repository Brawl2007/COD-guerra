import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {buildM01EnvironmentProps,M01_PROP_CLUSTERS,propCountsForQuality} from '../src/render/m01-environment-props.js';

const segmentDistance=(p,a,b)=>{
  const dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;
  const t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[2]-a[2])*dz)/den)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[2]-a[2]-t*dz);
};
const lineDistance=(p,line)=>Math.min(...line.slice(1).map((b,i)=>segmentDistance(p,line[i],b)));

test('M01 environment prop layout is deterministic, uniquely identified and grounded',()=>{
  const world=new TczewWorld(),a=buildM01EnvironmentProps(world),b=buildM01EnvironmentProps(world);
  assert.deepEqual(a,b);assert.equal(new Set(a.map(p=>p.id)).size,a.length);
  assert.equal(new Set(a.map(p=>p.cluster)).size,M01_PROP_CLUSTERS.length);
  for(const p of a){
    const ground=world.terrainHeightAt(p.p[0],p.p[2]);
    assert.ok(p.p[1]>=ground-.01,`${p.id} buried below terrain`);
    assert.ok(p.p[1]-ground<1.1,`${p.id} floating too high`);
  }
});

test('visual prop generation cannot consume gameplay RNG or mutate world colliders/save state',()=>{
  const sim=new M01Simulation(0x39),rng=sim.rng.state,snapshot=sim.snapshot(false);
  const obstacles=JSON.stringify(sim.world.obstacles),revision=sim.world.revision;
  buildM01EnvironmentProps(sim.world);
  assert.equal(sim.rng.state,rng);
  assert.equal(sim.world.revision,revision);
  assert.equal(JSON.stringify(sim.world.obstacles),obstacles);
  assert.deepEqual(sim.snapshot(false),snapshot);
});

test('critical rail, road and station access corridors remain visually clear',()=>{
  const world=new TczewWorld(),props=buildM01EnvironmentProps(world);
  const railIds=['rail_embankment_west','rail_line_southwest','rail_line_east'];
  const rails=railIds.map(id=>world.features.get(id).polyline);
  const road=world.features.get('road_approach_west').polyline;
  for(const p of props){
    const rail=Math.min(...rails.map(line=>lineDistance(p.p,line)));
    assert.ok(rail>4,`${p.id} too close to a rail centreline: ${rail.toFixed(2)}m`);
    assert.ok(lineDistance(p.p,road)>5,`${p.id} too close to the road route`);
    const [x,,z]=p.p;
    assert.ok(!(x>=-462&&x<=-336&&z>=23&&z<=30),`${p.id} intrudes on the station facade access strip`);
  }
});

test('Low, Medium and High preserve composition while scaling detail coherently',()=>{
  const items=buildM01EnvironmentProps(new TczewWorld());
  const low=propCountsForQuality(items,'low'),medium=propCountsForQuality(items,'medium'),high=propCountsForQuality(items,'high');
  assert.ok(low.total>45);assert.ok(medium.total>low.total);assert.ok(high.total>medium.total);
  assert.ok(low.total/medium.total>.45,'Low should retain the major composition rather than become empty');
  assert.ok(high.total/medium.total<1.75,'High micro-detail growth must remain bounded');
  for(const area of ['station-yard','railway-approach','bridge-approach','combat-area']){
    assert.ok(low.byArea[area]>0,`${area} missing from Low`);
    assert.ok(medium.byArea[area]>low.byArea[area]);
    assert.ok(high.byArea[area]>medium.byArea[area]);
  }
});

test('rebuilding the visual layout is idempotent and does not create logical duplicates',()=>{
  const world=new TczewWorld();
  const first=buildM01EnvironmentProps(world),second=buildM01EnvironmentProps(world);
  assert.equal(first.length,second.length);
  assert.deepEqual(first.map(p=>[p.id,p.cluster,p.quality,p.p]),second.map(p=>[p.id,p.cluster,p.quality,p.p]));
  for(const cluster of M01_PROP_CLUSTERS){
    assert.ok(first.some(p=>p.cluster===cluster.id));
    assert.equal(first.filter(p=>p.cluster===cluster.id).length,second.filter(p=>p.cluster===cluster.id).length);
  }
});
