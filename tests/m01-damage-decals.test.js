import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {makeRound,traceRound} from '../src/game/m01-fire.js';
import {traceShot,eyePosition} from '../src/world/spatial.js';
import {M01Environment} from '../src/render/m01-environment.js';
import {solidTreeSpecies} from '../src/render/m01-vegetation-layout.js';
import {driver,toRepair} from './helpers/m01-route.js';
import {M01DamageDecals,M01_DAMAGE_DECAL_LIMITS as LIMITS,M01_SURFACE_PROFILES,M01_DAMAGED_ABUTMENTS,M01_PORTALS,m01VisualSurface,m01BlastResidue,
  m01BlastKind,m01DecalAtlas,m01SurfaceTop,renderedTerrainHeight,deckSurfaceAt,fitMark} from '../src/render/m01-damage-decals.js';

// Presentation-only battle damage. These are state/geometry tests of the renderer module fed with the simulation's
// own events; they are not a playtest and measure no frame rate.
const SEED=19390901;
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);for(const v of Object.values(o))deepFreeze(v);}return o;};
const solidTrees=world=>{
  // Use the integrated foliage's real matrix/colour builder, not the old scalar-only tree fixture.
  const maker=Object.assign(Object.create(M01Environment.prototype),{
    treeColor:new THREE.Color(),treeDummy:new THREE.Object3D(),
    treeStart:new THREE.Vector3(),treeEnd:new THREE.Vector3(),
    treeDirection:new THREE.Vector3(),treeUp:new THREE.Vector3(0,1,0)
  });
  return world.trees.map((t,i)=>({...maker.makeTreeDescriptor({...t,solid:true,species:solidTreeSpecies(t),edge:0},i),lod:'near'}));
};
const markData=m=>({sequence:m.sequence,key:m.key,kind:m.kind,cell:m.cell,flip:m.flip,position:m.position,normal:m.normal,axisU:m.axisU,axisV:m.axisV,
  sizeU:m.sizeU,sizeV:m.sizeV,start:m.start,life:m.life,tint:m.tint});
const residueData=d=>{const g=d.residueGeometry;return ['position','normal','uv','color','residueStart'].map(k=>Array.from(g.attributes[k]?.array??[]));};

// The real route to the start of obj_m01_hold_access (Kowal's crate, the repair under MG fire, four scripted bombs),
// with the route's support pilot firing back at the MG, so both German rounds and the player's own shots occur.
// Every authoritative round-impact/player-shot goes to the decals exactly as Game.handleM01Event does, deep-frozen.
function repairRoute(instances=[]){
  let trees=null,impacts=0,playerShots=0;
  const d=driver(SEED,{support:true,onStep:({sim,events})=>{
    if(!instances.length)return;
    trees??=solidTrees(sim.world);
    for(const e of events){
      if(e.type!=='round-impact'&&e.type!=='player-shot')continue;
      impacts++;if(e.type==='player-shot')playerShots++;
      const event=deepFreeze(structuredClone(e)),shooter=e.type==='round-impact'?sim.actor(e.by)??null:sim.player;
      for(const decals of instances)decals.impact(event,{world:sim.world,trees,player:sim.player,shooter,clock:sim.clock,quality:'medium'});
    }
    const state=sim.renderState;
    for(const decals of instances)decals.update({state,time:sim.clock,world:sim.world,trees,quality:'medium',camera:eyePosition(sim.player)});
  }});
  toRepair(d);d.walk(-120,16.5);d.until(()=>d.sim.active('hold_access'),500);
  return {sim:d.sim,trees,impacts,playerShots};
}

// A throw-away simulation posed like the browser fixture; impacts are the simulation's own traces.
function bench(quality='medium'){
  const sim=new M01Simulation(SEED),decals=new M01DamageDecals(new THREE.Scene()),trees=solidTrees(sim.world),results=[];
  const pose=(x,z,crouched=false)=>{const p=sim.player;p.x=x;p.z=z;p.y=sim.world.heightAt(x,z);p.crouched=crouched;p.moveBlend=0;};
  function playerShot(target){
    const eye=eyePosition(sim.player),dx=target.x-eye.x,dy=target.y-eye.y,dz=target.z-eye.z,l=Math.hypot(dx,dy,dz);
    const hit=traceShot(sim.world,eye,{x:dx/l,y:dy/l,z:dz/l},[],1200);if(!hit)return null;
    const event=deepFreeze({type:'player-shot',point:hit.point,material:hit.material,hit:false,weapon:'kb_wz29'});
    sim.clock+=.04;const result=decals.impact(event,{world:sim.world,trees,player:sim.player,shooter:sim.player,clock:sim.clock,quality});
    results.push({event,result});return result;
  }
  function enemyRound(aim,by){
    const a=sim.actor(by),origin={x:a.x,y:a.y+1.35,z:a.z};
    const r=makeRound({id:`bench_${results.length}`,by,weapon:'kar98k',kind:'player',origin,aim,firedAt:sim.clock,bias:[0,0],cone:[0,0],gauss:()=>0});
    const hit=traceRound(sim.world,r,[]);
    const event=deepFreeze({type:'round-impact',kind:'player',by,point:hit.point,material:hit.material??'earth',crack:false,distance:0,victim:null,pinned:[]});
    sim.clock+=.04;const result=decals.impact(event,{world:sim.world,trees,player:sim.player,shooter:a,clock:sim.clock,quality});
    results.push({event,result});return result;
  }
  const ground=(x,z)=>({x,y:sim.world.heightAt(x,z),z});
  const update=(time=sim.clock)=>decals.update({state:sim.renderState,time,world:sim.world,trees,quality,camera:eyePosition(sim.player)});
  return {sim,decals,trees,results,pose,playerShot,enemyRound,ground,update};
}
// Shots on every kind of drawn receiver along the bridgehead, the yard and the spans.
function mixedVolley(b){
  b.pose(4.5,-5.4);for(const [y,z] of [[.9,-5],[1.5,-5.8],[2.2,-4.9],[.6,-6.3],[2.6,-5.5],[1.2,-4.6]])b.playerShot({x:-1.5,y,z});   // rail portal brick
  b.pose(4,31);for(const [x,z] of [[8,33],[9.2,34.5],[10.4,32.2],[7.4,35.6]])b.playerShot(b.ground(x,z));                       // west abutment stone
  b.pose(-260,10);for(const [x,y] of [[-263.4,-1.6],[-261.8,-.9],[-260.2,-2.1],[-258.6,-.5]])b.playerShot({x,y,z:14});           // hut timber wall
  b.pose(-36,-5.4);for(const y of [.2,.9,-.4])b.playerShot({x:-36,y,z:-9});                                                     // tree bark
  const rail=b.sim.world.features.get('rail_embankment_west').polyline,[a,c]=rail,L=Math.hypot(c[0]-a[0],c[2]-a[2]),ux=(c[0]-a[0])/L,uz=(c[2]-a[2])/L;
  b.pose(-81,4.2);for(const [d,o,h] of [[86.4,.72,.15],[87.75,.2,.09],[85,-.4,.03],[88.6,-.72,.15],[86.85,-1,.03]])
    b.playerShot({x:a[0]+ux*d-uz*o,y:h,z:a[2]+uz*d+ux*o});                                                                     // rail, sleeper, ballast
  b.pose(136.5,-1.6);for(const [x,z] of [[140.4,-2.3],[141.2,-1.1],[140.8,-3.1]])b.playerShot({x,y:0,z});                        // metal expansion joint
  b.pose(-106,20);for(const [x,z] of [[-111,17.5],[-112.5,18.6],[-110,19.2],[-113.6,17.2]])b.enemyRound(b.ground(x,z),'de_east_7');  // earth slope
  b.pose(16,40);for(const [x,z] of [[22,39.2],[24,41.1],[21,40.4],[23,42.75]])b.enemyRound({x,y:x===23?.2:0,z},'de_spans_0');        // road deck, kerb
  b.pose(4.5,-5.4);for(const [y,z] of [[1.4,-8.2],[2.4,-8.9]])b.enemyRound({x:-1.5,y,z},'de_east_2');                            // portal tower
}

test('damage decals never write simulation state: the real repair route stays bit-identical with them attached',()=>{
  const plain=repairRoute(),a=new M01DamageDecals(new THREE.Scene()),b=new M01DamageDecals(new THREE.Scene()),fed=repairRoute([a,b]);
  assert.deepEqual(fed.sim.snapshot(false),plain.sim.snapshot(false));
  assert.ok(fed.impacts>80&&fed.playerShots>0,`${fed.impacts} authoritative impacts, ${fed.playerShots} player shots reached the decals`);
  assert.ok(a.counts.placed>15&&a.marks.length>0&&a.marks.length<=LIMITS.quality.medium.marks,JSON.stringify(a.counts));
  // Two instances fed the same frozen events are identical: variation is a hash of event data, not a random source.
  assert.deepEqual(a.marks.map(markData),b.marks.map(markData));assert.deepEqual(a.counts,b.counts);
  assert.deepEqual(residueData(a),residueData(b));assert.deepEqual(a.diagnostics,b.diagnostics);
  // All four scripted bombs of the route (saved in sectors.damage) left persistent residue.
  const ids=fed.sim.sectors.damage.map(d=>d.id);
  assert.deepEqual(ids,['station_bomb','forward_post','repair_crater','raid_0530']);
  assert.deepEqual(a.residue.map(r=>r.id),ids);
  for(const r of a.residue)assert.ok(r.polys.length>0&&r.debris.length>0,`${r.id}: ${r.polys.length} polygons, ${r.debris.length} debris`);
  assert.ok(a.residueTriangles>0&&a.residueTriangles<=LIMITS.residueTriangles);
});

test('damage decal sources stay presentation-only: no RNG, no simulation writes, a single Game hook',()=>{
  const module=source('../src/render/m01-damage-decals.js'),view=source('../src/render/m01-view.js'),game=source('../src/game/game.js');
  assert.doesNotMatch(module,/Math\.random|src\/core\/random|\.rng\b|performance\.now|Date\.now/);
  assert.doesNotMatch(module,/\b(world|sim|state|event|player|shooter|damage)\.[A-Za-z_]+(\[[^\]]+\])?\s*(=(?!=)|\+=|-=|\+\+|--)/);
  assert.doesNotMatch(module,/\b(world|sim|state|event|damage)\.[A-Za-z_.]+\.(push|splice|pop|shift|unshift|sort|reverse)\(/);
  assert.equal(game.match(/surfaceDamage/g)?.length,1);
  assert.match(game,/if\(event\.type==='round-impact'\|\|event\.type==='player-shot'\)this\.renderer\.m01\.surfaceDamage\(event,this\.sim\);/);
  const hook=view.slice(view.indexOf('  surfaceDamage(event,sim){'),view.indexOf('\n  }',view.indexOf('  surfaceDamage(event,sim){')));
  assert.ok(hook.length>40);assert.doesNotMatch(hook,/\bsim\.[A-Za-z_.]+\s*=(?!=)|\bevent\.[A-Za-z_.]+\s*=(?!=)/);
  assert.match(view,/this\.damageDecals\.update\(\{state,time,world:sim\.world/);assert.match(view,/resetEffects\(\)\{[^}]*this\.damageDecals\.reset\(\)/);
  assert.match(view,/this\.damageDecals\.dispose\(\)/);
});

test('marks sit on the drawn receiver with a fixed lift, differ per material and never z-fight',()=>{
  const b=bench('high');mixedVolley(b);
  const placed=b.results.filter(r=>r.result?.placed),kinds=new Set(b.decals.marks.map(m=>m.kind));
  for(const kind of ['brick','stone','wood','bark','rail','sleeper','ballast','metal','earth','road'])assert.ok(kinds.has(kind),`no ${kind} mark: ${[...kinds]}`);
  assert.ok(placed.length>=30,`${placed.length} of ${b.results.length} impacts placed`);
  assert.ok(b.decals.marks.filter(m=>m.receiver.type==='tower'||m.receiver.type==='portal').length>=6);
  const world=b.sim.world;
  for(const m of b.decals.marks){
    assert.ok(Math.abs(Math.hypot(m.normal.x,m.normal.y,m.normal.z)-1)<1e-9);
    assert.ok(Math.abs(m.axisU.x*m.normal.x+m.axisU.y*m.normal.y+m.axisU.z*m.normal.z)<1e-9);
    const r=m.receiver;
    if(r.type==='terrain'){
      // Lifted .008 m (plus at most the .012 m crease allowance) above the very terrain triangle that is drawn.
      const h=renderedTerrainHeight(world,m.position.x,m.position.z),gap=(m.position.y-h)*m.normal.y;
      assert.ok(gap>=.0079&&gap<=.0205,`terrain mark ${gap.toFixed(4)} m off the drawn mesh`);
    }else if(r.type==='box'||r.type==='abutment-face'){
      assert.ok(Math.abs(m.position[r.axis]-(r.value+r.sign*.004))<1e-9,`${r.id} mark not 4 mm off its face`);
    }else if(r.type==='deck'||r.type==='abutment'){
      const top=deckSurfaceAt(world,m.position.x,m.position.z)??M01_DAMAGED_ABUTMENTS.find(a=>a.id===r.id);
      assert.ok(Math.abs(m.position.y-top.y-.004)<1e-9,`${r.id} mark not 4 mm over its strip`);
    }
  }
  // Same receiver, different materials: each kind keeps its own art cells and size class.
  const signature=k=>JSON.stringify([M01_SURFACE_PROFILES[k].cells,M01_SURFACE_PROFILES[k].size,M01_SURFACE_PROFILES[k].aspect]);
  assert.equal(new Set(Object.keys(M01_SURFACE_PROFILES).map(signature)).size,Object.keys(M01_SURFACE_PROFILES).length);
  for(const [a,c] of [['brick','stone'],['metal','rail'],['earth','ballast'],['wood','metal'],['road','stone']])
    assert.equal(M01_SURFACE_PROFILES[a].cells.some(x=>M01_SURFACE_PROFILES[c].cells.includes(x)),false,`${a}/${c} share art`);
  for(const material of [b.decals.markMaterial,b.decals.residueMaterial]){
    assert.equal(material.depthWrite,false);assert.equal(material.polygonOffset,true);
    assert.ok(material.polygonOffsetFactor<0&&material.polygonOffsetUnits<0);assert.ok(material.alphaTest>0);
  }
  assert.ok(b.decals.marksMesh.renderOrder<0&&b.decals.residueMesh.renderOrder<b.decals.marksMesh.renderOrder);
  // Bark marks match the near-LOD trunk polygon only: they are drawn while that tree is near and hidden otherwise.
  const tree=b.trees.find(t=>t.id==='m01_tree_0'),bark=b.decals.marks.filter(m=>m.tree==='m01_tree_0').length;assert.ok(bark>0);
  tree.lod='near';b.update();const drawn=b.decals.marksMesh.count;tree.lod='far';b.update();
  assert.equal(b.decals.marksMesh.count,drawn-bark);
  // A round that misses every drawn surface (open air over the river) leaves nothing rather than a floating mark.
  assert.equal(b.decals.impact(deepFreeze({type:'round-impact',by:'de_east_2',point:{x:120,y:6,z:20},material:'earth'}),
    {world,trees:b.trees,player:b.sim.player,shooter:b.sim.actor('de_east_2'),clock:b.sim.clock}).placed,false);
  assert.equal(b.decals.impact(deepFreeze({type:'round-impact',point:{x:-30,y:0,z:20},material:'character'}),{world,clock:b.sim.clock}),null);
});

test('portal wall marks stay on masonry: never across the arch opening or below its apex',()=>{
  const world=new M01Simulation(SEED).world,rail=M01_PORTALS.rail,brick=M01_SURFACE_PROFILES.brick.size[1];
  const extent=(f,axis)=>Math.abs(f.axisU[axis])*f.sizeU/2+Math.abs(f.axisV[axis])*f.sizeV/2;
  for(const [y,z] of [[2,-4.21],[3.1,4.22],[1,-4.5],[6.2,4.25],[8.45,0],[8.5,-1.2]]){
    const s=m01VisualSurface(world,{x:-1.5,y,z},{dir:{x:-1,y:0,z:0},material:'stone'});
    assert.ok(s?.receiver.part==='wall',`no wall surface at ${y},${z}`);
    for(const roll of [0,.4,.79,1.2]){
      const f=fitMark(world,s,{sizeU:brick,sizeV:brick,roll});assert.ok(f,`no fit at ${y},${z}`);
      const local=f.position.z-rail.axisZ,beside=Math.abs(local)-extent(f,'z')>=rail.opening-1e-9,above=f.position.y-extent(f,'y')>=rail.apex-1e-9;
      assert.ok(beside||above,`mark at ${f.position.y.toFixed(3)},${f.position.z.toFixed(3)} overhangs the opening`);
    }
  }
});

test('the west bridgehead marks the drawn embankment, never the walkable abutment buried under it',()=>{
  const b=bench();b.pose(-40,1.5);
  // The simulation's march stops on the walkable abutment top (-0.35) that the drawn terrain covers at x -20…-12.
  for(const x of [-17,-15,-13]){const r=b.playerShot({x,y:-.35,z:2.5});assert.ok(r?.placed,JSON.stringify(r));}
  for(const m of b.decals.marks){
    const top=m01SurfaceTop(b.sim.world,m.position.x,m.position.z);
    assert.ok(m.position.y>=top.y,`mark ${m.position.y.toFixed(3)} under the drawn ${top.type} ${top.y.toFixed(3)}`);
    assert.notEqual(m.receiver.type,'abutment');
  }
});

test('mark pools, spall, debris and embers stay within the declared per-quality budget',()=>{
  for(const quality of ['low','medium','high']){
    const b=bench(quality),L=LIMITS.quality[quality];
    for(let round=0;round<6;round++){mixedVolley(b);b.update();}
    // Saturation: keep shooting the slope until the pool must evict.
    b.pose(-106,20);for(let i=0;i<180;i++)b.playerShot(b.ground(-118+(i%30)*.9,13+Math.floor(i/30)*1.3));
    for(const id of ['evt_m01_bombing_0434','evt_m01_nowicki_lost'])b.sim.consume(id);
    b.update(b.sim.clock+2);
    const d=b.decals.diagnostics;
    assert.ok(d.marks<=L.marks&&b.decals.marks.length===d.marks,`${quality}: ${d.marks} marks`);
    assert.ok(b.decals.counts.evicted>0,`${quality}: pool never saturated`);
    assert.ok(b.decals.spall.length<=Math.floor(L.debris*(1-LIMITS.residueDebrisShare)));
    assert.ok(d.debris<=L.debris&&d.embers<=L.embers&&d.residueTriangles<=LIMITS.residueTriangles);
    assert.ok(d.drawCalls<=LIMITS.drawCalls);
    const textures=new Set([b.decals.markMaterial,b.decals.residueMaterial,b.decals.debrisMaterial].flatMap(m=>[m.map,m.bumpMap]).concat(b.decals.emberMaterial.uniforms.map.value).filter(Boolean));
    assert.equal(textures.size,LIMITS.textures);
    assert.equal(b.decals.marksMesh.instanceMatrix.count,LIMITS.quality.high.marks);   // fixed GPU capacity, never grown
    // No receiver collects more than `cluster` marks inside the cluster radius.
    for(const m of b.decals.marks){
      const radius=m.kind==='earth'||m.kind==='ballast'?LIMITS.earthClusterRadius:LIMITS.clusterRadius;
      const near=b.decals.marks.filter(o=>o.key===m.key&&Math.hypot(o.position.x-m.position.x,o.position.y-m.position.y,o.position.z-m.position.z)<radius);
      assert.ok(near.length<=L.cluster,`${quality}: ${near.length} marks clustered on ${m.key}`);
    }
  }
});

test('marks expire on the mission clock and are dropped deterministically when time runs backwards',()=>{
  const b=bench();mixedVolley(b);b.update();
  const before=b.decals.marks.length,longest=Math.max(...b.decals.marks.map(m=>m.start+m.life));assert.ok(before>20);
  const earthEnd=Math.max(...b.decals.marks.filter(m=>m.kind==='earth').map(m=>m.start+m.life));
  b.update(earthEnd+.01);
  assert.equal(b.decals.marks.filter(m=>m.kind==='earth').length,0);assert.ok(b.decals.marks.length>0);   // stone/brick outlive soil
  b.update(longest+.01);assert.equal(b.decals.marks.length,0);assert.equal(b.decals.spall.length,0);assert.equal(b.decals.marksMesh.count,0);
  assert.equal(b.decals.counts.expired,before);
  // A restore to an earlier clock removes marks from the restored-away future.
  const c=bench();c.pose(-106,20);for(let i=0;i<5;i++)c.playerShot(c.ground(-112+i,18));c.update();
  const first=c.decals.marks[0].start;c.update(first-.5);assert.equal(c.decals.marks.length,0);
  // Distance budget: a mark too small to cover a pixel at that range is never spawned.
  const far=bench();far.pose(-250,20);
  const r=far.decals.impact(deepFreeze({type:'player-shot',point:far.ground(-120,18),material:'earth'}),
    {world:far.sim.world,player:far.sim.player,shooter:far.sim.player,clock:1,quality:'medium'});
  assert.equal(r.placed,false);assert.equal(r.reason,'out-of-range');
});

test('blast residue lies on drawn surfaces, skips destroyed decks and the station interior, and is deterministic',()=>{
  const blasts=[['evt_m01_bombing_0434','station_bomb'],['evt_m01_nowicki_lost','repair_crater'],['evt_m01_west_demolition','west_demolition'],
    ['evt_m01_east_demolition','east_demolition']];
  for(const [event,id] of blasts){
    const sim=new M01Simulation(SEED);
    // Bombs keep 30 m from the player (M01Simulation.safeImpact): stand away from where they fall.
    sim.player.x=-120;sim.player.z=60;sim.player.y=sim.world.heightAt(-120,60);
    sim.consume(event);
    const damage=sim.sectors.damage.find(d=>d.id===id);assert.ok(damage,`${event} saved no ${id}`);
    const world=sim.world,residue=m01BlastResidue(world,damage),again=m01BlastResidue(world,structuredClone(damage));
    assert.deepEqual(residue,again);assert.equal(residue.kind,m01BlastKind(id));
    assert.ok(residue.polys.length>0&&residue.debris.length>0,`${id}: ${residue.polys.length} polygons`);
    const triangles=residue.polys.reduce((n,p)=>n+p.points.length-2,0);assert.ok(triangles<=LIMITS.residueTriangles/2,`${id}: ${triangles} triangles`);
    for(const p of residue.polys){
      assert.equal(p.points.length,p.uvs.length);
      if(p.kind==='terrain')for(const q of p.points){
        // Terrain residue is the drawn triangle itself, lifted 12 mm along its normal.
        const h=renderedTerrainHeight(world,q.x-p.normal.x*.012,q.z-p.normal.z*.012);
        assert.ok(Math.abs(q.y-p.normal.y*.012-h)<1e-6,`${id}: residue vertex ${q.y.toFixed(4)} vs terrain ${h.toFixed(4)}`);
      }
      if(p.kind==='deck-end'){
        const deck=world.decks.find(c=>p.points.every(q=>q.x>=c.min.x-1e-6&&q.x<=c.max.x+1e-6&&q.z>=c.min.z-1e-6&&q.z<=c.max.z+1e-6));
        assert.ok(deck,`${id}: soot off any remaining deck`);
        assert.ok(p.points.every(q=>q.x<=deck.min.x+9+1e-6||q.x>=deck.max.x-9-1e-6),`${id}: soot beyond the last 9 m`);
      }
      const station=world.buildings.find(s=>s.id==='station');
      assert.ok(!p.points.every(q=>q.x>station.min.x+.01&&q.x<station.max.x-.01&&q.z>station.min.z+.01&&q.z<station.max.z-.01),`${id}: residue inside the station`);
    }
    for(const piece of residue.debris){
      const top=m01SurfaceTop(world,piece.x,piece.z,piece.y);assert.ok(top,`${id}: debris over nothing`);
      assert.ok(Math.abs(piece.y-piece.size*.3-top.y)<1e-9,`${id}: debris not resting on the drawn ${top.type}`);
    }
    if(id.endsWith('_demolition')){
      const destroyed=new M01Simulation(SEED).world.decks.filter(c=>c.id.includes('_deck_')&&!world.decks.some(k=>k.id===c.id));assert.ok(destroyed.length>=4);
      // Nothing is drawn at deck height where a demolished span used to be (the ground under it may be scorched).
      for(const p of residue.polys)if(p.kind!=='terrain')
        assert.ok(!destroyed.some(c=>p.points.every(q=>q.x>c.min.x-1e-6&&q.x<c.max.x+1e-6&&q.z>c.min.z-1e-6&&q.z<c.max.z+1e-6&&Math.abs(q.y-c.max.y)<.6)),
          `${id}: ${p.kind} residue on a fallen deck`);
      assert.ok(residue.polys.some(p=>p.kind==='deck-end'),`${id}: no soot on the remaining deck ends`);
    }
    if(id==='station_bomb')assert.ok(residue.polys.some(p=>p.kind==='window-soot')&&residue.polys.some(p=>p.kind==='terrain'));
  }
});

test('reset clears every transient mark and the residue rebuilds identically from saved damage; restore follows the save',()=>{
  const scene=new THREE.Scene(),a=new M01DamageDecals(scene),fed=repairRoute([a]),sim=fed.sim;
  const update=()=>a.update({state:sim.renderState,time:sim.clock,world:sim.world,trees:fed.trees,quality:'medium'});
  update();const residue=residueData(a),triangles=a.residueTriangles,debris=a.residueDebris.length;
  assert.ok(a.marks.length>0&&triangles>0);
  a.reset();
  assert.equal(a.marks.length,0);assert.equal(a.spall.length,0);assert.equal(a.residue.length,0);assert.equal(a.residueTriangles,0);
  for(const mesh of [a.marksMesh,a.debrisMesh,a.emberMesh])assert.equal(mesh.count,0);assert.equal(a.residueMesh.visible,false);
  update();
  assert.deepEqual(residueData(a),residue);assert.equal(a.residueTriangles,triangles);assert.equal(a.residueDebris.length,debris);
  assert.equal(a.marks.length,0);   // bullet marks are transient: never resurrected from a save
  // Restoring the checkpoint (a fresh world object) rebuilds the residue for the restored damage list only.
  sim.restoreCheckpoint();update();
  assert.deepEqual(a.residue.map(r=>r.id),sim.sectors.damage.slice(-LIMITS.blasts).map(d=>d.id));
  const fresh=new M01DamageDecals(new THREE.Scene());fresh.update({state:sim.renderState,time:sim.clock,world:sim.world,trees:fed.trees,quality:'medium'});
  assert.deepEqual(residueData(a),residueData(fresh));
  // A presentation failure is counted for diagnostics and reported once; reset clears it.
  const report=console.error;let reported=0;console.error=()=>reported++;
  try{a.fail(new Error('probe'));a.fail(new Error('again'));}finally{console.error=report;}
  assert.equal(a.diagnostics.counts.errors,2);assert.equal(a.diagnostics.lastError,'again');assert.equal(reported,1);
  a.reset();assert.equal(a.diagnostics.counts.errors,0);assert.equal(a.diagnostics.lastError,null);
  a.dispose();assert.equal(scene.getObjectByName('m01-damage-decals'),undefined);
});

test('marks on a demolished span or a lowered cover are invalidated; marks elsewhere persist',()=>{
  const b=bench();
  b.pose(700,0);for(const [x,z] of [[704,-2],[705,2],[706,-2.2]])b.playerShot({x,y:-.15,z});   // rail deck span 6 planks
  b.pose(-106,20);for(const [x,z] of [[-111,17.5],[-112.5,18.6]])b.playerShot(b.ground(x,z));    // embankment soil
  b.update();
  const onSpan=b.decals.marks.filter(m=>m.receiver.id==='rail_collider_deck_span_06').length,elsewhere=b.decals.marks.length-onSpan;
  assert.ok(onSpan>=2&&elsewhere>=2,JSON.stringify(b.decals.marks.map(m=>m.receiver)));
  // Every consumed mission event refreshes the world; residue is rebuilt only when what it lies on changes.
  const geometry=b.decals.residueGeometry,revision=b.sim.world.revision,damage=b.sim.sectors.damage.length;
  b.sim.consume('evt_m01_railway_worker_report');b.update();
  assert.ok(b.sim.world.revision>revision);assert.equal(b.decals.residueGeometry,geometry);assert.equal(b.decals.counts.invalidated,0);
  // Same damage list, different receivers (the forward post's cover lowered): rebuilt.
  b.sim.world.refresh(Object.keys(b.sim.consumed),{...b.sim.flags,'m01.forward_post_state':'destroyed'});b.update();
  assert.equal(b.sim.sectors.damage.length,damage);assert.notEqual(b.decals.residueGeometry,geometry);
  b.sim.world.refresh(Object.keys(b.sim.consumed),b.sim.flags);
  b.sim.consume('evt_m01_east_demolition');b.update();
  assert.equal(b.decals.marks.filter(m=>m.receiver.id==='rail_collider_deck_span_06').length,0);
  assert.equal(b.decals.marks.length,elsewhere);assert.equal(b.decals.counts.invalidated,onSpan);
  // The forward post's sandbags drop to 0.45 m when it is destroyed: marks above the new top go with them.
  const c=bench(),post=c.sim.world.covers.find(k=>k.id==='cv_forward_post');assert.ok(post);
  c.pose(post.min.x-4,(post.min.z+post.max.z)/2);
  for(const y of [.25,.7,1.05])c.playerShot({x:post.min.x,y:post.min.y+y,z:(post.min.z+post.max.z)/2+.3});
  c.update();const marks=c.decals.marks.filter(m=>m.receiver.id==='cv_forward_post'),high=marks.filter(m=>m.position.y>post.min.y+.45).length;
  assert.ok(high>0&&high<marks.length,JSON.stringify(marks.map(m=>m.position.y-post.min.y)));
  c.pose(-60,20);c.sim.consume('evt_m01_forward_post_bombed');   // the real event, with the player over 30 m away
  assert.equal(c.sim.flags['m01.forward_post_state'],'destroyed');c.update();
  const left=c.decals.marks.filter(m=>m.receiver.id==='cv_forward_post');
  assert.equal(left.length,marks.length-high);assert.ok(left.every(m=>m.position.y<post.min.y+.45));
});

test('the first frame compiles the decal programs and draws every mesh once invisibly; later frames hide empty meshes',()=>{
  const b=bench(),compiled=[],renderer={compile:(group,camera,scene)=>compiled.push([group,camera,scene])},view=new THREE.PerspectiveCamera();
  const frame=()=>b.decals.update({state:b.sim.renderState,time:b.sim.clock,world:b.sim.world,trees:b.trees,quality:'high',renderer,view});
  frame();
  assert.equal(compiled.length,1);assert.equal(compiled[0][0],b.decals.group);assert.equal(compiled[0][2],b.decals.scene);
  for(const mesh of [b.decals.marksMesh,b.decals.debrisMesh,b.decals.emberMesh]){
    assert.equal(mesh.visible,true);assert.equal(mesh.count,1);
    const m=new THREE.Matrix4();mesh.getMatrixAt(0,m);assert.equal(m.determinant(),0);   // zero-size instance: no pixels
  }
  assert.equal(b.decals.residueMesh.visible,true);assert.equal(b.decals.residueTriangles,0);
  const p=b.decals.residueGeometry.attributes.position.array;assert.ok(p.length===9&&p.every(v=>v===0));   // degenerate triangle
  frame();
  assert.equal(compiled.length,1);
  for(const mesh of [b.decals.marksMesh,b.decals.debrisMesh,b.decals.emberMesh,b.decals.residueMesh])assert.equal(mesh.visible,false);
  assert.equal(b.decals.diagnostics.drawCalls,0);
});

test('the decal atlas is original, deterministic art with bounded size',()=>{
  const a=m01DecalAtlas(),b=m01DecalAtlas();
  assert.equal(a,b);assert.equal(a.width,512);assert.equal(a.height,256);assert.equal(a.color.length,512*256*4);assert.equal(a.heightMap.length,512*256);
  assert.equal(typeof a.checksum,'number');
  // Every small cell keeps a transparent border, so neighbouring art does not bleed in at the first mip levels.
  for(let cell=0;cell<16;cell++){
    const ox=(cell%8)*64,oy=Math.floor(cell/8)*64;
    for(let i=0;i<64;i++)for(const [x,y] of [[ox+i,oy],[ox+i,oy+63],[ox,oy+i],[ox+63,oy+i]])assert.equal(a.color[(y*512+x)*4+3],0);
  }
});
