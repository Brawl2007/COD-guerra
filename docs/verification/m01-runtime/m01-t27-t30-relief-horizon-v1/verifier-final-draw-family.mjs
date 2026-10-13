import * as THREE from 'three';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {M01Simulation} from '../../../src/game/m01-simulation.js';
import {M01TerrainRelief,reliefOffset} from '../../../src/render/m01-terrain-relief.js';
import {M01FarLandscape} from '../../../src/render/m01-far-landscape.js';
import {lightingModel} from '../../../src/render/m01-lighting.js';
const run='.agent/runs/M01-T27-T30-20261012',dir='docs/verification/m01-runtime/m01-t27-t30-relief-horizon-v1',sim=new M01Simulation(),world=sim.world,parent=new THREE.Group(),material=new THREE.MeshBasicMaterial(),terrain=new M01TerrainRelief(parent,world,material),far=new M01FarLandscape(parent,world,{surfaceY:(x,z)=>terrain.surfaceHeightAt(x,z)}),e=terrain.envelope;
const untouched=JSON.stringify(sim.snapshot(false)),checkpoint=JSON.stringify(sim.checkpoint),worldData=JSON.stringify(world),rng=JSON.stringify(sim.rng);
let familySamples=0;const raw=(x,z,id)=>{assert.ok(e.regions.some(r=>x>=r.minX-1e-6&&x<=r.maxX+1e-6&&z>=r.minZ-1e-6&&z<=r.maxZ+1e-6),`${id}: ${x},${z}`);familySamples++;};
for(const a of [sim.player,...sim.actors])raw(a.x,a.z,a.id);
for(const n of world.layout.coverNodes)raw(n.position[0],n.position.at(-1),n.id);
for(const feature of world.layout.features){if(feature.point||feature.pickup){const a=feature.point??feature.pickup;raw(a[0],a.at(-1),feature.id);}}
// Source destination families transcribed from immutable Simulation, separately from candidate envelope code.
for(let i=0;i<24;i++)for(const [x,z] of [[1040+i%4*2,38+i%4*.65],[-322-i%4*1.6,30+Math.floor(i/4)%6*1.3],[12,37.8+i%2*.35],[-110,40],[-235,30],[655,37.8+i%2*.35]])raw(x,z,`platoon/${i}`);
for(let i=0;i<10;i++)for(const x of [1050+i*3,690,1080])raw(x,39.6+i%3*1.1,`spans/${i}`);
for(let i=0;i<3;i++)for(const [x,z]of [[10,40],[-14,40],[-170-i*1.6,22+i*1.2]])raw(x,z,`ckm/${i}`);
for(const [x,z] of [[-300-1.4-.92,30+2.3+.92],[-332-2-.92,24+2.2-.92],[-332+.9,24+.7],[-262.8,73.6],[-261.2,73.9],[-259.6,73.9],[-258,73.6],[-263.2,71.6],[-256.9,71.6],[-262.9,69.6],[-257.1,69.6],[-550,60],[-500,-1100],[-500,-1300]])raw(x,z,'phase/fire');
const site=world.point('repair_site_2');sim.actors.filter(a=>a.role==='ENGINEER').forEach((a,i)=>raw(site.x-1.5-i*1.2,site.z+1+i%2,`engineer/${i}`));
parent.updateMatrixWorld(true);const views=JSON.parse(readFileSync(`${dir}/captures/same-paused-views.json`)),draws=[];
for(const v of views){const c=v.camera,camera=new THREE.PerspectiveCamera(c.fov,c.aspect,c.near,c.far);camera.position.fromArray(c.position);camera.quaternion.fromArray(c.quaternion);camera.updateMatrixWorld(true);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 terrain.beginFrame(camera,v.clock);far.beginFrame(camera);for(const m of terrain.meshes)if(frustum.intersectsObject(m))m.onBeforeRender(null,null,camera,m.geometry);for(const m of far.meshes)if(frustum.intersectsObject(m))m.onBeforeRender(null,null,camera,m.geometry);
 assert.equal(terrain.triangles,v.diagnostics.m01.terrainRelief.triangles,v.name);assert.equal(terrain.draws,v.diagnostics.m01.terrainRelief.draws,v.name);assert.equal(far.draws,v.diagnostics.m01.farLandscape.draws,v.name);assert.equal(far.triangles,v.diagnostics.m01.farLandscape.triangles,v.name);assert.ok(terrain.triangles<=52000);assert.ok(far.draws<=10);draws.push({view:v.name,groundTriangles:terrain.triangles,groundSubmissions:terrain.draws,farTriangles:far.triangles,farSubmissions:far.draws});}
for(const m of far.meshes){assert.equal(m.geometry.groups.length,0);assert.ok(!m.material.transparent||m.material.side!==THREE.DoubleSide||m.material.forceSinglePass);const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(p.getX(i)<-460||p.getX(i)>1800);}
const tg=terrain.geometries.slice(),fg=far.meshes.map(m=>m.geometry),fm=Object.values(far.materials),light=lightingModel(5,95);for(let i=0;i<1000;i++){terrain.sync(world,'high');far.sync(world,'high',i*.05,light);}assert.deepEqual(terrain.geometries,tg);assert.deepEqual(far.meshes.map(m=>m.geometry),fg);assert.deepEqual(Object.values(far.materials),fm);assert.equal(JSON.stringify(sim.snapshot(false)),untouched);assert.equal(JSON.stringify(sim.checkpoint),checkpoint);assert.equal(JSON.stringify(sim.rng),rng);assert.equal(JSON.stringify(world),worldData);
const candidatePoint={x:550,z:-135,inside:e.contains(550,-135),reliefOffset:reliefOffset(e,550,-135),actualSurface:terrain.surfaceHeightAt(550,-135)};assert.equal(candidatePoint.inside,false);assert.ok(candidatePoint.actualSurface>20);
const report={status:'PASS',head:'4e5389b314f3e02b3197139cca953b79a5464d8f',familySamples,sourceParticipantHullCount:e.regions.length,draws,shaderSinglePass:far.materials.mist.forceSinglePass,groundAndFarNoStateWrites:true,steadySyncs:1000,resourcesRetainExactReferences:true,ridgeExample:candidatePoint,limitations:'Frustum reconstruction corroborates recorded actual browser callbacks; this is a separate CPU probe, not a fresh GL/FPS measurement.'};writeFileSync(`${run}/verifier-final-draw-family.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));far.dispose();terrain.dispose();material.dispose();
