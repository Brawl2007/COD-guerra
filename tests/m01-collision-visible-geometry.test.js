import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import propsManifest from '../assets/models/provisional/m01/props/manifest.json' with {type:'json'};
import structures from '../assets/models/provisional/m01/structures/manifest.json' with {type:'json'};
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01_PROP_FOOTPRINTS,M01_STRUCTURE_SOLIDS,ckmEmplacementSolids,HUT_BARRELS,CKM_EMPLACEMENT_ROOT} from '../src/world/m01-collision-layout.js';
import {PLAYER_PHYSICS} from '../src/world/m01-player-physics.js';
import {CKM_POSITION} from '../src/game/m01-simulation.js';
import {rayBox} from '../src/world/spatial.js';
import {M01Environment} from '../src/render/m01-environment.js';

// The player's solids are derived from the data the renderer draws. These tests close the loop against the DRAWN geometry itself: the lod0 GLBs of the prop kit
// and of the field structures, and the sandbag/barrel instances the environment puts. A collider that is smaller than the drawing lets the camera sink into it;
// one that is larger is an invisible wall.
globalThis.ProgressEvent??=class{constructor(type,props){Object.assign(this,props);}};
const load=async path=>{
  const b=readFileSync(new URL('../'+path,import.meta.url)),loader=new GLTFLoader();
  loader.register(()=>({name:'node_no_texture_decode',loadTexture:()=>Promise.resolve(null)}));
  return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
};
const STEP=PLAYER_PHYSICS.stepUp,HEAD=PLAYER_PHYSICS.standHeight;
/** Points sampled on the surface of every triangle (a flat 3 m board has no vertex near its middle). */
function surfacePoints(scene,spacing=.03){
  const out=[];scene.updateMatrixWorld(true);
  scene.traverse(m=>{
    if(!m.isMesh)return;
    const pos=m.geometry.attributes.position,index=m.geometry.index,v=i=>new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);
    for(let t=0;t<(index?index.count:pos.count)/3;t++){
      const a=v(index?index.getX(3*t):3*t),b=v(index?index.getX(3*t+1):3*t+1),c=v(index?index.getX(3*t+2):3*t+2);
      const k=Math.max(1,Math.min(60,Math.ceil(Math.sqrt(new THREE.Triangle(a,b,c).getArea())/spacing)));
      for(let i=0;i<=k;i++)for(let j=0;j<=k-i;j++){const u=i/k,w=j/k,s=1-u-w;out.push([a.x*s+b.x*u+c.x*w,a.y*s+b.y*u+c.y*w,a.z*s+b.z*u+c.z*w]);}
    }
  });
  return out;
}

// Ankle-high clutter the player's foot goes through: too small or too ragged to stand on (a 0.26 m tin box, a 0.36 m hand lantern, a scatter of burst sandbags).
const ANKLE_CLUTTER=new Set(['ammo_tin_box','railway_lantern','sandbag_burst']);
test('every prop of the kit is classified: a wall or a ledge with a footprint from the GLB, ankle-high clutter, or overhead',async()=>{
  const failures=[];
  for(const def of propsManifest.props){
    const {scene}=await load('assets/models/provisional/m01/props/'+def.files.lod0.file),pts=surfacePoints(scene);
    let top=-Infinity,bottom=Infinity;for(const p of pts){top=Math.max(top,p[1]);bottom=Math.min(bottom,p[1]);}
    const rows=M01_PROP_FOOTPRINTS[def.id],wall=pts.some(p=>p[1]>=STEP+.02&&p[1]<=HEAD);
    if(!wall&&bottom>=HEAD-.02){assert.equal(rows,undefined,`${def.id} is overhead and must not be solid`);continue;}
    if(!wall&&ANKLE_CLUTTER.has(def.id)){assert.equal(rows,undefined,`${def.id} is ankle clutter`);assert.ok(top<=STEP+.02);continue;}
    // wall: the body band; ledge: everything from the ankle to the top
    const band=wall?pts.filter(p=>p[1]>=STEP&&p[1]<=HEAD):pts.filter(p=>p[1]>=.08);
    if(!rows){failures.push(`${def.id}: geometry in the body band but no footprint`);continue;}
    const inRow=(r,p,tol)=>p[0]>=r[0]-tol&&p[0]<=r[1]+tol&&p[2]>=r[2]-tol&&p[2]<=r[3]+tol;
    const outside=band.filter(p=>!rows.some(r=>inRow(r,p,.03)));
    if(outside.length)failures.push(`${def.id}: ${outside.length} drawn points outside the footprint, e.g. ${outside[0].map(v=>v.toFixed(2))}`);
    for(const [i,r] of rows.entries()){
      const mine=band.filter(p=>inRow(r,p,.12));
      if(!mine.length){failures.push(`${def.id} row ${i}: nothing drawn inside it (invisible wall)`);continue;}
      const bb=[Math.min(...mine.map(p=>p[0])),Math.max(...mine.map(p=>p[0])),Math.min(...mine.map(p=>p[2])),Math.max(...mine.map(p=>p[2]))];
      if(r[0]<bb[0]-.12||r[1]>bb[1]+.12||r[2]<bb[2]-.12||r[3]>bb[3]+.12)failures.push(`${def.id} row ${i}: [${r.slice(0,4)}] is larger than the drawing [${bb.map(v=>v.toFixed(3))}] (invisible wall)`);
      if(Math.abs(r[4]-top)>.01)failures.push(`${def.id} row ${i}: top ${r[4]} vs drawn top ${top.toFixed(3)}`);
    }
    assert.equal(wall,rows[0][4]>STEP,`${def.id}: a wall is taller than the step height, a ledge is not`);
  }
  assert.deepEqual(failures,[]);
  assert.deepEqual(Object.keys(M01_PROP_FOOTPRINTS).filter(t=>!propsManifest.props.some(p=>p.id===t)),[],'every footprint names a kit type');
});

/** First-hit distance along a horizontal ray against a mesh (null = nothing) and against the player's solids (null = nothing). */
function firstMesh(raycaster,meshes,origin,dir){raycaster.set(origin,dir);raycaster.far=80;const h=raycaster.intersectObjects(meshes,false);return h.length?h[0].distance:null;}
function firstSolid(solids,origin,dir){
  let best=null;
  for(const b of solids){const d=rayBox(origin,dir,{x:b.minX,y:b.y0,z:b.minZ},{x:b.maxX,y:b.y1,z:b.maxZ},80);if(d!==null&&(best===null||d<best))best=d;}
  return best;
}

for(const [id,rays,near] of [['rail_shed',[.6,1.4],22],['shelter',[.6,1.4],14],['casemate',[.7,1.2,1.7],16]]){
  test(`the player's solids of the ${id} meet the drawn walls: first hit of horizontal rays differs by at most 12 cm`,async()=>{
    const def=structures.structures.find(s=>s.id===id),file=def.files.intact_lod0??Object.values(def.files).find(f=>f.lod===0&&f.variant==='intact');
    const {scene}=await load('assets/models/provisional/m01/structures/'+file.file);
    scene.position.fromArray(def.anchor);scene.updateMatrixWorld(true);
    const meshes=[];scene.traverse(n=>{if(n.isMesh)meshes.push(n);});
    const world=new TczewWorld(),[ax,ay,az]=def.anchor,centre=id==='casemate'?{x:ax,z:az}:{x:ax,z:az};
    const solids=world.playerSolids.filter(b=>['obstacle','structure'].includes(b.kind)&&Math.hypot(b.cx-centre.x,b.cz-centre.z)<near);
    assert.ok(solids.length>=1,'solids found near the structure');
    const raycaster=new THREE.Raycaster(),failures=[];let compared=0;
    for(const above of rays)for(let k=0;k<48;k++){
      const a=k/48*Math.PI*2,dir={x:-Math.cos(a),y:0,z:-Math.sin(a)},R=50;
      const y=(id==='casemate'?-3:id==='shelter'?-4:-3)+above,origin={x:centre.x+Math.cos(a)*R,y,z:centre.z+Math.sin(a)*R};
      // The casemate's west entrance (x 0, z 38.5..41.5, below world y -2) opens into the road abutment's mass (x -22..10), not into the air: a ray through it is not a way in.
      if(id==='casemate'&&k===24&&y<-2){compared++;continue;}
      const m=firstMesh(raycaster,meshes,new THREE.Vector3(origin.x,origin.y,origin.z),new THREE.Vector3(dir.x,0,dir.z));
      const c=firstSolid(solids,origin,dir);
      compared++;
      if(m===null&&c===null)continue;
      if(m===null||c===null||Math.abs(m-c)>.12)failures.push(`${id} ray ${k} @${above} m: mesh ${m?.toFixed(2)??'none'} vs solid ${c?.toFixed(2)??'none'}`);
    }
    assert.equal(compared,rays.length*48);
    assert.deepEqual(failures.slice(0,10),[],`${failures.length}/${compared} rays disagree`);
  });
}

test('the ckm emplacement solids contain every sandbag the environment draws round the gun, and nothing else',()=>{
  assert.deepEqual([...CKM_EMPLACEMENT_ROOT],[CKM_POSITION.x,CKM_POSITION.y,CKM_POSITION.z],'same root as the renderer and the crew');
  const e=Object.create(M01Environment.prototype),bags=[];
  e.put=(kind,material,p,size,rotation)=>{if(kind==='bag')bags.push({p,size,rotation});};
  e.buildEmplacement();
  assert.ok(bags.length>=30);
  const geom=new THREE.CapsuleGeometry(.5,.4,3,7),box=new THREE.Box3(),m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pos=new THREE.Vector3(),eul=new THREE.Euler();
  geom.computeBoundingBox();
  const solids=ckmEmplacementSolids();
  const boxes=bags.map(b=>{
    m.compose(pos.set(...b.p),q.setFromEuler(eul.set(...b.rotation)),s.set(...b.size));
    return box.copy(geom.boundingBox).applyMatrix4(m).clone();
  });
  // every bag is inside a solid (3 cm), and each solid is exactly filled by its bags on x/z and top (4 cm)
  for(const [i,b] of boxes.entries()){
    assert.ok(solids.some(o=>b.min.x>=o.cx-o.hx-.03&&b.max.x<=o.cx+o.hx+.03&&b.min.z>=o.cz-o.hz-.03&&b.max.z<=o.cz+o.hz+.03&&b.max.y<=o.y1+.03&&b.min.y>=o.y0-.05),`bag ${i} sticks out of every solid`);
  }
  for(const o of solids){
    const inside=boxes.filter(b=>b.min.x>=o.cx-o.hx-.03&&b.max.x<=o.cx+o.hx+.03&&b.min.z>=o.cz-o.hz-.03&&b.max.z<=o.cz+o.hz+.03);
    assert.ok(inside.length>=4,`${o.id} holds ${inside.length} bags`);
    const x0=Math.min(...inside.map(b=>b.min.x)),x1=Math.max(...inside.map(b=>b.max.x)),z0=Math.min(...inside.map(b=>b.min.z)),z1=Math.max(...inside.map(b=>b.max.z)),top=Math.max(...inside.map(b=>b.max.y));
    assert.ok(Math.abs(x0-(o.cx-o.hx))<.04&&Math.abs(x1-(o.cx+o.hx))<.04,`${o.id} x extent ${x0.toFixed(2)}..${x1.toFixed(2)} vs ${(o.cx-o.hx).toFixed(2)}..${(o.cx+o.hx).toFixed(2)}`);
    assert.ok(Math.abs(z0-(o.cz-o.hz))<.04&&Math.abs(z1-(o.cz+o.hz))<.04,`${o.id} z extent`);
    assert.ok(Math.abs(top-o.y1)<.04,`${o.id} top ${top.toFixed(3)} vs ${o.y1.toFixed(3)}`);
  }
  geom.dispose();
});

test('the hut barrels are the always-drawn metal drums beside the west door',()=>{
  const e=Object.create(M01Environment.prototype),drums=[];
  e.world=new TczewWorld();e.group=null;e.put=(kind,material,p,size)=>{if(kind==='trunk'&&material==='metal'&&p[2]===14)drums.push({p,size});};
  const warn=console.warn;console.warn=()=>{};try{e.buildArchitecture();}finally{console.warn=warn;}
  assert.deepEqual(drums.map(d=>[d.p[0],d.p[2]]).sort((a,b)=>a[0]-b[0]),[...HUT_BARRELS].map(([x,z])=>[x,z]).sort((a,b)=>a[0]-b[0]));
  const world=new TczewWorld();
  for(const d of drums){
    const solid=world.playerSolids.find(b=>b.kind==='prop'&&b.id.startsWith('hut_barrel')&&Math.abs(b.cx-d.p[0])<.01);
    assert.ok(solid,'a solid for each drum');
    const radius=Math.max(d.size[0],d.size[2])*1;   // CylinderGeometry(.72, 1): the widest radius is the bottom one, 1 * scale
    assert.ok(solid.hx>=radius*.8&&solid.hx<=radius*1.05,`drum radius ${radius.toFixed(2)} vs solid half-width ${solid.hx}`);
    assert.ok(solid.y1>=d.p[1]+d.size[1]/2-.05);
  }
});

test('the structure table is what the generator draws: the casemate cap overhangs the walls and is a head-bumper only for a standing body',()=>{
  const hull=M01_STRUCTURE_SOLIDS.find(b=>b.id==='casemate_hull'),cap=M01_STRUCTURE_SOLIDS.find(b=>b.id==='casemate_cap');
  const bounds=structures.structures.find(s=>s.id==='casemate').featureBounds;
  assert.deepEqual([hull.cx-hull.hx,hull.cz-hull.hz,hull.cx+hull.hx,hull.cz+hull.hz],[bounds.min[0],bounds.min[2],bounds.max[0],bounds.max[2]],'the hull is the manifest envelope');
  assert.ok(cap.hx>hull.hx&&cap.hz>hull.hz,'the earth cap overhangs the walls');
  assert.ok(cap.y0<-3+HEAD&&cap.y0>-3+1.25,'the cap hangs between a crouching and a standing head');
});
