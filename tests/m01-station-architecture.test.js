import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {M01StationArchitecture,STATION_ENVELOPE,STATION_VOLUMES,buildStationMeshes,stationLod,stationOpenings} from '../src/render/m01-station-architecture.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {buildM01EnvironmentProps} from '../src/render/m01-environment-props.js';
import {driver,toStationEvacuation} from './helpers/m01-route.js';

const fingerprint=levels=>createHash('sha256').update(Buffer.concat(levels.flatMap(l=>Object.values(l.geometries).flatMap(g=>Object.values(g.attributes).map(a=>Buffer.from(a.array.buffer)))))).digest('hex');
const free=levels=>levels.forEach(l=>Object.values(l.geometries).forEach(g=>g.dispose()));
test('Station mesh vertices remain inside the authorised visual envelope at all LODs',()=>{
  const levels=[0,1,2].map(buildStationMeshes);
  for(const [lod,l]of levels.entries()){
    assert.equal(l.openings,140);assert.ok(l.triangles<35000);
    for(const [kind,g]of Object.entries(l.geometries)){
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++)for(const [axis,k]of ['x','y','z'].map((s,i)=>[s,i])){
        const n=p['get'+axis.toUpperCase()](i);assert.ok(Number.isFinite(n));
        assert.ok(n>=STATION_ENVELOPE.min[k]-.0001&&n<=STATION_ENVELOPE.max[k]+.0001,`${kind} LOD${lod} ${axis}=${n}`);
      }
    }
  }
  assert.ok(levels[2].triangles<levels[0].triangles*.5);free(levels);
});
test('the facade has real missing wall faces, deep closed reveals and physical parallax',()=>{
  const scene=new THREE.Scene(),station=new M01StationArchitecture(scene,new TczewWorld());station.sync({x:-427,z:26},'high');scene.updateMatrixWorld(true);
  const o=stationOpenings(STATION_VOLUMES[1],'front').find(o=>!o.door&&o.bottom<0);
  const origin=new THREE.Vector3(o.x+.30,(o.bottom+o.spring)/2,o.z-1),ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,1),0,3);
  const visible=station.levels[0].group.children;
  assert.equal(ray.intersectObject(visible.find(m=>m.name.includes('_brick_'))).length,0,'masonry is absent inside the aperture');
  const hit=ray.intersectObjects(visible).find(h=>h.distance>=.99);
  assert.ok(hit.distance>1.7&&hit.distance<2.0,`inset pane depth ${hit?.distance}`);
  const angled=new THREE.Raycaster(origin,new THREE.Vector3(.9,0,1).normalize(),0,3).intersectObjects(visible)[0];
  assert.ok(angled.distance<hit.distance,'oblique ray meets the recessed jamb before the backing');
  station.dispose();
});
test('silhouette, roofs and openings survive quality switches; detail and allocation stay bounded',()=>{
  const scene=new THREE.Scene(),station=new M01StationArchitecture(scene,new TczewWorld()),geometryCount=station.diagnostics.geometries;
  for(const q of ['low','medium','high','low','high']){
    station.sync({x:-399,z:26},q);assert.equal(station.levels.filter(l=>l.group.visible).length,1);
    assert.equal(station.diagnostics.openings,140);assert.equal(station.diagnostics.volumes,5);assert.equal(station.diagnostics.geometries,geometryCount);
    assert.equal(station.diagnostics.collidersAdded,0);assert.equal(station.diagnostics.textures,10);
    assert.ok(station.diagnostics.drawCalls<=7);
  }
  assert.equal(stationLod(0,'high'),0);assert.equal(stationLod(0,'medium'),1);assert.equal(stationLod(0,'low'),2);assert.equal(stationLod(300,'high'),2);
  for(const level of station.levels){const ys=Array.from(level.geometries.roof.attributes.position.array).filter((_,i)=>i%3===1);for(const v of STATION_VOLUMES)assert.ok(ys.some(y=>Math.abs(y-v.ridge)<.0001));}
  station.dispose();
});
test('geometry and material maps regenerate byte for byte without random state or external assets',()=>{
  // Three.js allocates random UUIDs. Compare render content, excluding resource identity.
    const a=[0,1,2].map(buildStationMeshes),b=[0,1,2].map(buildStationMeshes);assert.equal(fingerprint(a),fingerprint(b));free(a);free(b);
    const x=new M01StationArchitecture(new THREE.Scene(),new TczewWorld()),y=new M01StationArchitecture(new THREE.Scene(),new TczewWorld());
    assert.equal(x.diagnostics.source,'original-mesh-no-external-asset-dependency');
    x.maps.forEach((map,i)=>assert.deepEqual(map.image.data,y.maps[i].image.data));x.dispose();y.dispose();
});
test('Station construction/sync preserves all anchors, colliders, props and save/RNG/evacuation authority',()=>{
  const d=toStationEvacuation(driver(),{phase:'drag'}),sim=d.sim,world=sim.world;
  const snapshot=sim.snapshot(),obstacles=structuredClone(world.obstacles),features=structuredClone([...world.features]),props=buildM01EnvironmentProps(world),revision=world.revision;
  const station=new M01StationArchitecture(new THREE.Scene(),world);
  for(const q of ['low','medium','high'])station.sync(sim.player,q);
  assert.deepEqual(sim.snapshot(),snapshot);assert.deepEqual(world.obstacles,obstacles);assert.deepEqual([...world.features],features);assert.equal(world.revision,revision);
  assert.deepEqual(buildM01EnvironmentProps(world),props);
  // Same continued evacuation future while the presentation is repeatedly sampled/recreated.
  const copy=new M01Simulation();copy.restoreSnapshot(snapshot);
  for(let i=0;i<1800;i++){sim.tick(.05);copy.tick(.05);if(i%150===0)station.sync(sim.player,['low','medium','high'][i/150%3]);}
  assert.deepEqual(sim.snapshot(),copy.snapshot());assert.equal(sim.stationEvacuation.delivered,true);station.dispose();
});
test('platform and awning preserve walking clearance in the existing facade and evacuation strips',()=>{
  const world=new TczewWorld(),station=new M01StationArchitecture(new THREE.Scene(),world);
  const actor={x:-461,y:-3,z:25,radius:.35};world.move(actor,124,0);assert.ok(actor.x>-338);
  const a={x:-318,y:-3,z:30,radius:.35};world.move(a,-16,0);assert.ok(a.x<-333);
  for(const x of [-459,-435,-410,-399,-370,-340]){
    const ray=new THREE.Raycaster(new THREE.Vector3(x,-1.35,25),new THREE.Vector3(0,0,1),0,1.05);
    station.group.updateMatrixWorld(true);assert.equal(ray.intersectObjects(station.levels[0].group.children).length,0,'no upright visual blockage before the wall');
  }
  station.dispose();
});
test('dispose is idempotent; recreate replaces one root and frees owned geometry/material/texture resources once',()=>{
  const scene=new THREE.Scene();let expected;
  for(let i=0;i<3;i++){
    const station=new M01StationArchitecture(scene,new TczewWorld());assert.equal(scene.children.length,1);
    const resources=[...station.levels.flatMap(l=>l.group.children.map(m=>m.geometry)),...Object.values(station.materials),...station.maps];
    let released=0;resources.forEach(r=>r.addEventListener('dispose',()=>released++));expected=resources.length;
    station.dispose();station.dispose();assert.equal(scene.children.length,0);assert.equal(released,expected);assert.equal(station.ready,false);
  }
});
test('unexpected or missing Station anchors fail safely before attaching any replacement root',()=>{
  const scene=new THREE.Scene(),world=new TczewWorld();world.buildings.find(b=>b.id==='station').min.x++;
  assert.throws(()=>new M01StationArchitecture(scene,world),/approved anchors/);assert.equal(scene.children.length,0);
  assert.throws(()=>new M01StationArchitecture(scene,{buildings:[]}),/missing/);assert.equal(scene.children.length,0);
});
test('V3 preserves the V2 five-volume and 140-aperture contract and outward roof normals',()=>{
  const contract={volumes:STATION_VOLUMES,openings:STATION_VOLUMES.flatMap(v=>['front','rear'].flatMap(side=>stationOpenings(v,side)))};
  const approved='fbcf9d8e7de9e942e46e304296ac4cd9a9c0a5868c34d77f65396f43e3f4ebaa';
  assert.equal(createHash('sha256').update(JSON.stringify(contract)).digest('hex'),approved);
  const levels=[0,1,2].map(buildStationMeshes);
  for(const {geometries}of levels){
    const normal=geometries.roof.attributes.normal;
    for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>.8,'roof and canopy outward normals');
    const p=geometries.metal.attributes.position;
    for(const v of STATION_VOLUMES){
      const z=(v.z0-.22+v.z1)/2,edgeY=v.ridge+.008,planeY=v.ridge-(v.ridge-v.eave)*.10/((v.z1-v.z0+.22)/2);
      assert.ok(edgeY-planeY>.01,'ridge side edges clear the shallow roof');
      let found=false;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-edgeY)<.0001&&Math.abs(Math.abs(p.getZ(i)-z)-.1)<.0001)found=true;
      assert.ok(found);
    }
  }
  free(levels);
});
test('V3 resource budget remains seven shared batches and ten maps across all quality levels',()=>{
  const station=new M01StationArchitecture(new THREE.Scene(),new TczewWorld()),d=station.diagnostics;
  assert.equal(d.fidelity,'v3');assert.equal(d.drawCalls,7);assert.equal(d.geometries,21);assert.equal(d.instances,0);assert.equal(d.textureBytes,1441792);
  assert.ok(d.geometryBytes<11000000);
  assert.ok(d.trianglesByLod[0]<35000&&d.trianglesByLod[1]<30500&&d.trianglesByLod[2]<17000);
  for(const level of station.levels)for(const mesh of level.group.children)assert.equal(mesh.material,station.materials[mesh.name.split('_')[1]]);
  station.dispose();
});
test('V3 varying panes, roughness and relief stay deterministic and Station shader scope stays private',()=>{
  const station=new M01StationArchitecture(new THREE.Scene(),new TczewWorld());
  const glass=station.levels[0].geometries.glass.attributes.color.array;
  assert.ok(new Set(Array.from(glass).map(v=>v.toFixed(3))).size>30,'pane finish has location-dependent values');
  for(const map of station.maps.filter((_,i)=>i%2===1)){
    const a=map.image.data;let distinct=false;for(let i=0;i<a.length;i+=4)if(a[i]!==a[i+1]){distinct=true;break;}
    assert.ok(distinct,'roughness and height are independent channels');
  }
  for(const [kind,m]of Object.entries(station.materials)){
    const shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};m.onBeforeCompile(shader);
    assert.equal(m.customProgramCacheKey(),`m01-station-v3-${kind}`);
    assert.match(shader.vertexShader,/vStationWorld/);assert.match(shader.fragmentShader,/stationNoise/);assert.doesNotMatch(shader.fragmentShader,/uniform.*time/i);
  }
  station.dispose();
});
