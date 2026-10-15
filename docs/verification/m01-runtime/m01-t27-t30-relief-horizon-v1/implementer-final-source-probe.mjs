import * as THREE from 'three';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {TczewWorld} from '../../../src/world/tczew-world.js';
import {M01TerrainRelief} from '../../../src/render/m01-terrain-relief.js';
import {M01FarLandscape} from '../../../src/render/m01-far-landscape.js';
const run='.agent/runs/M01-T27-T30-20261012',hash=a=>createHash('sha256').update(a).digest('hex');
const authority=JSON.parse(readFileSync(`${run}/authority-baseline.json`));
const immutable=authority.paths.filter(p=>p!=='src/render/m01-view.js'&&p!=='tests/m01-material-authority.test.js');
for(const p of immutable)assert.equal(hash(readFileSync(p)),authority.sha256[p],p);
const world=new TczewWorld(),material=new THREE.MeshBasicMaterial(),parent=new THREE.Group();
// Independent direct transcription of unchanged baseline M01View.buildTerrain, not candidate helper.
const legacy=new THREE.PlaneGeometry(2000,650,400,130);legacy.rotateX(-Math.PI/2);legacy.translate(300,0,40);
const lp=legacy.attributes.position;for(let i=0;i<lp.count;i++)lp.setY(i,world.terrainHeightAt(lp.getX(i),lp.getZ(i)));legacy.computeVertexNormals();
const before=JSON.parse(readFileSync(`${run}/legacy-ground.json`));
for(const [key,a]of Object.entries({positionHash:legacy.attributes.position.array,normalHash:legacy.attributes.normal.array,uvHash:legacy.attributes.uv.array,indexHash:legacy.index.array}))assert.equal(hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength)),before[key],key);
const relief=new M01TerrainRelief(parent,world,material),far=new M01FarLandscape(parent,world),e=relief.envelope;
const buckets=Array.from({length:400*130},()=>[]),retained=new Set();let haloVertices=0,legacyTriangles=0,skirtTriangles=0;
const sample=(g,ids,x,z)=>{
 const p=g.attributes.position,a=ids[0],b=ids[1],c=ids[2],ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),cx=p.getX(c),cz=p.getZ(c),den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
 const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den,w=1-u-v;if(Math.min(u,v,w)<-1e-9)return null;
 return ['position','normal','uv'].map(name=>{const attr=g.attributes[name];return Array.from({length:attr.itemSize},(_,k)=>u*attr.array[a*attr.itemSize+k]+v*attr.array[b*attr.itemSize+k]+w*attr.array[c*attr.itemSize+k]);}).flat();
};
for(const m of relief.meshes){const g=m.geometry,p=g.attributes.position;if(g.userData.kind!=='legacy-lattice'){skirtTriangles+=g.index.count/3;continue;}legacyTriangles+=g.index.count/3;
 const src=g.userData.sourceIndices;
 for(let v=0;v<src.length;v++)if(e.distance(lp.getX(src[v]),lp.getZ(src[v]))<=30){haloVertices++;for(const name of ['position','normal','uv']){const a=g.attributes[name],b=legacy.attributes[name];for(let k=0;k<a.itemSize;k++)assert.equal(a.array[v*a.itemSize+k],b.array[src[v]*a.itemSize+k],`${name} source ${src[v]}`);}}
 for(let t=0;t<g.index.count;t+=3){const ids=[g.index.getX(t),g.index.getX(t+1),g.index.getX(t+2)];retained.add(ids.map(v=>src[v]).join(','));
 const xs=ids.map(v=>p.getX(v)),zs=ids.map(v=>p.getZ(v));const x0=Math.max(0,Math.floor((Math.min(...xs)+700)/5)),x1=Math.min(399,Math.ceil((Math.max(...xs)+700)/5)-1),z0=Math.max(0,Math.floor((Math.min(...zs)+285)/5)),z1=Math.min(129,Math.ceil((Math.max(...zs)+285)/5)-1);
 for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++)buckets[j*400+i].push([g,ids]);
 }}
let crossing=0;for(let t=0;t<legacy.index.count;t+=3){const ids=[legacy.index.getX(t),legacy.index.getX(t+1),legacy.index.getX(t+2)],xs=ids.map(v=>lp.getX(v)),zs=ids.map(v=>lp.getZ(v));if(e.regions.some(r=>Math.min(...xs)<=r.maxX+30&&Math.max(...xs)>=r.minX-30&&Math.min(...zs)<=r.maxZ+30&&Math.max(...zs)>=r.minZ-30)){crossing++;assert.ok(retained.has(ids.join(',')),`10m halo crossing ${t/3}`);}}
let grid=0,maxAttributeDelta=0;
for(let z=-285;z<=365;z++)for(let x=-700;x<=1300;x++)if(e.contains(x,z)){
 const i=Math.min(399,Math.floor((x+700)/5)),j=Math.min(129,Math.floor((z+285)/5)),base=j*401+i,idsA=[base,base+401,base+1],idsB=[base+401,base+402,base+1];const original=sample(legacy,idsA,x,z)??sample(legacy,idsB,x,z);
 const actual=buckets[j*400+i].map(([g,ids])=>sample(g,ids,x,z)).find(Boolean);assert.ok(actual,`surface missing ${x},${z}`);for(let k=0;k<actual.length;k++){maxAttributeDelta=Math.max(maxAttributeDelta,Math.abs(original[k]-actual[k]));assert.ok(Math.abs(original[k]-actual[k])<=1e-10,`actual surface/normal/uv ${x},${z} component ${k}`);}grid++;
}
parent.updateMatrixWorld(true);const baselineMesh=new THREE.Mesh(legacy,material);baselineMesh.updateMatrixWorld(true);let rays=0,maxRayDelta=0;
for(const x of [-460,-340,-270,-260,-150,-90,-30,0,20,30,100,260,265,690,1035,1040,1050,1055,1076,1097,1300])for(const z of [-80,-10,0,20,40,73,100,140])if(e.contains(x,z)){
 const ray=new THREE.Raycaster(new THREE.Vector3(x,50,z),new THREE.Vector3(0,-1,0),0,100);const a=ray.intersectObject(baselineMesh,false)[0],b=ray.intersectObjects(relief.meshes,false)[0];assert.ok(a&&b,`ray ${x},${z}`);maxRayDelta=Math.max(maxRayDelta,Math.abs(a.distance-b.distance));assert.ok(Math.abs(a.distance-b.distance)<1e-9);rays++;
 const cutoff=a.distance-.001;const clipped=new THREE.Raycaster(ray.ray.origin,ray.ray.direction,0,cutoff);assert.equal(clipped.intersectObject(baselineMesh,false).length,clipped.intersectObjects(relief.meshes,false).length);
}
// Far owner triangle interiors, not just its vertex guard: a triangle rectangle must miss every raw hull + margin.
let farTriangles=0,farPasses=0;for(const m of far.meshes){const g=m.geometry,p=g.attributes.position;assert.equal(g.groups.length,0);farPasses+=m.material.transparent&&m.material.side===THREE.DoubleSide&&!m.material.forceSinglePass?2:1;
 for(let t=0;t<g.index.count;t+=3){const ids=[g.index.getX(t),g.index.getX(t+1),g.index.getX(t+2)],xs=ids.map(v=>p.getX(v)),zs=ids.map(v=>p.getZ(v));assert.ok(!e.regions.some(r=>Math.min(...xs)<=r.maxX+20&&Math.max(...xs)>=r.minX-20&&Math.min(...zs)<=r.maxZ+20&&Math.max(...zs)>=r.minZ-20),`${m.userData.m01FarKind} triangle intersects hull margin`);farTriangles++;}}
assert.ok(farPasses<=10);
let terrainDisposes=0,farGeometryDisposes=0,farMaterialDisposes=0,borrowedDisposes=0;
for(const g of relief.geometries)g.addEventListener('dispose',()=>terrainDisposes++);for(const m of far.meshes)m.geometry.addEventListener('dispose',()=>farGeometryDisposes++);for(const m of Object.values(far.materials))m.addEventListener('dispose',()=>farMaterialDisposes++);material.addEventListener('dispose',()=>borrowedDisposes++);
const expectedTerrain=relief.geometries.length,refGeometries=relief.geometries.slice(),refFar=far.meshes.map(m=>m.geometry);relief.sync(world,'high');far.sync(world,'high',10,{fog:{color:[.1,.2,.3]},daylight:.5});const revisions=[relief.revision,far.revision];for(let i=0;i<1000;i++){relief.sync(world,'high');far.sync(world,'high',10,{fog:{color:[.1,.2,.3]},daylight:.5});}assert.deepEqual([relief.revision,far.revision],revisions);assert.deepEqual(relief.geometries,refGeometries);assert.deepEqual(far.meshes.map(m=>m.geometry),refFar);
relief.dispose();relief.dispose();far.dispose();far.dispose();assert.equal(terrainDisposes,expectedTerrain);assert.equal(farGeometryDisposes,5);assert.equal(farMaterialDisposes,5);assert.equal(borrowedDisposes,0);
const report={status:'PASS_SOURCE_GEOMETRY_ONLY',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),immutablePaths:immutable.length,actualBaseline:{triangles:legacy.index.count/3,vertices:lp.count,bufferHashesMatched:true},protected:{haloMeters:10,haloVertexCopiesChecked:haloVertices,actualCrossingTrianglesRetained:crossing,actualGeometry1mGridSamples:grid,maxInterpolatedAttributeDelta:maxAttributeDelta,verticalRangeRays:rays,maxRayDistanceDelta:maxRayDelta},terrain:{legacyTriangles,skirtTriangles,totalTriangles:legacyTriangles+skirtTriangles},far:{triangles:farTriangles,objects:5,actualMaximumPassesIncludingDoubleSidedMist:farPasses,triangleInteriorsOutsideHullMargin:true},resources:{terrainDisposes,farGeometryDisposes,farMaterialDisposes,borrowedDisposes,steadySyncs:1000},runtimeAcceptance:'PENDING_REAL_BROWSER_AND_EXACT_HEAD_CI'};
writeFileSync(`${run}/implementer-final-source-probe.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));legacy.dispose();material.dispose();
