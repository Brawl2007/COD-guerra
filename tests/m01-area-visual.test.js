import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01AreaSimulation} from '../src/game/m01-area-sim.js';
import {areaReliefOffset,AREA_FLAT_MARGIN_M,AREA_RISE_M,AREA_UNDULATION_M,AREA_LIFT_M} from '../src/render/m01-area-field.js';
import {buildMoundGeometry,buildBermGeometry,buildClodGeometry,buildCraterRimGeometry} from '../src/render/m01-area-earthworks.js';
import {buildTreeLine,treeDrawRange,TREE_SHARE} from '../src/render/m01-area-trees.js';
import {buildWreckGeometry} from '../src/render/m01-area-wreck.js';

// VII-a visual package: pure geometry/relief rules of the area's presentation (no WebGL). The browser evidence is tests/browser/m01-act-vii-a-visual.spec.js.
const world=new M01AreaSimulation(19390901,{difficulty:'recruta'}).world,L=world.area,P=L.bounds.playable;   // the act's world: parapet, wreck and the German turned earth
const arr=c=>({min:[c.min.x,c.min.y,c.min.z],max:[c.max.x,c.max.y,c.max.z]});

test('relief rule: the drawn ground is exactly the simulation ground on the fought-over strip, never below the terrain, bounded, 0 at the field border',()=>{
  let inside=0,max=0;
  for(let x=P.minX-AREA_FLAT_MARGIN_M;x<=P.maxX+AREA_FLAT_MARGIN_M;x+=4)for(let z=P.minZ-AREA_FLAT_MARGIN_M;z<=P.maxZ+AREA_FLAT_MARGIN_M;z+=4){inside++;assert.equal(areaReliefOffset(L,x,z),0,`offset at ${x},${z}`);}
  assert.ok(inside>5000);
  const F=L.ground;
  for(let x=F.minX;x<=F.maxX;x+=6)for(let z=F.minZ;z<=F.maxZ;z+=6){const o=areaReliefOffset(L,x,z);assert.ok(o>=0&&Number.isFinite(o));max=Math.max(max,o);}
  for(let t=0;t<=1;t+=.05){for(const [x,z] of [[F.minX,F.minZ+(F.maxZ-F.minZ)*t],[F.maxX,F.minZ+(F.maxZ-F.minZ)*t],[F.minX+(F.maxX-F.minX)*t,F.minZ],[F.minX+(F.maxX-F.minX)*t,F.maxZ]])assert.equal(areaReliefOffset(L,x,z),0);}
  assert.ok(max<=AREA_RISE_M+AREA_UNDULATION_M+AREA_LIFT_M+1e-9,`max ${max}`);
  assert.ok(max>1.2,'the north rise exists');
  // the sim's flat region is the terrain region: the simulation height there is the area's ground, whatever is drawn beyond
  assert.equal(world.terrainHeightAt(-400,-1200),L.groundY);
  // the rise grows toward the tree line (north = -z) and the trees stand on it
  const north=[-1360,-1380,-1400,-1420,-1440].map(z=>areaReliefOffset(L,-400,z));
  for(let i=1;i<north.length;i++)assert.ok(north[i]>north[i-1]);
});

test('mounds: a unit heap whose crest is the box top and whose base footprint is the box footprint x1.1 (never higher than the sim box)',()=>{
  const g=buildMoundGeometry(3);g.computeBoundingBox();const b=g.boundingBox;
  assert.ok(b.max.y<=1+1e-9&&b.max.y>.99,`crest ${b.max.y}`);assert.ok(b.min.y>=-.05);
  assert.ok(b.max.x<=1.06&&b.min.x>=-1.06&&b.max.z<=1.06&&b.min.z>=-1.06,'footprint within 6 % of the unit box');
  assert.ok(g.index.count/3<=250,'a heap is a small mesh (it is instanced for every cover)');
  const covers=world.areaCovers.filter(c=>c.coverType==='EARTH');
  assert.ok(covers.length>=40);
});

test('berm: crest exactly the parapet box top (never above), toe within 0.35 m of the box in z, runs the boxes\' length, a saddle at the nest front',()=>{
  const par=world.areaCovers.filter(c=>c.coverType==='PARAPET'),g=buildBermGeometry(par);g.computeBoundingBox();const b=g.boundingBox;
  const top=Math.max(...par.map(c=>c.max.y)),z0=Math.min(...par.map(c=>c.min.z)),z1=Math.max(...par.map(c=>c.max.z));
  assert.ok(b.max.y<=top+1e-6&&b.max.y>top-.12,`crest ${b.max.y} vs ${top}`);
  assert.ok(b.min.z>=z0-.35&&b.max.z<=z1+.35,`toe z ${b.min.z}..${b.max.z} vs ${z0}..${z1}`);
  assert.ok(b.min.x>=Math.min(...par.map(c=>c.min.x))-1e-6&&b.max.x<=Math.max(...par.map(c=>c.max.x))+1e-6);
  // the nest front is the low box: over its centre the berm is as low as that box (+ the lump), well under the crest
  const nest=par.find(c=>c.id==='np_parapet_nest'),pos=g.attributes.position;let high=-Infinity;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i);if(Math.abs(x-(nest.min.x+nest.max.x)/2)<.01)high=Math.max(high,pos.getY(i));}
  assert.ok(high<=nest.max.y+1e-6,`nest crest ${high} vs ${nest.max.y}`);
  assert.ok(g.index.count/3<5000);
});

test('wreck: a generic hull, drawn from the two sim boxes: sits on the ground, no vertex above the casemate box by more than the hatch lid, no model name in the source',()=>{
  const h=arr(world.areaCovers.find(c=>c.id==='np_wreck_hull')),u=arr(world.areaCovers.find(c=>c.id==='np_wreck_upper')),g=buildWreckGeometry(h,u);g.computeBoundingBox();const b=g.boundingBox;
  assert.ok(Math.abs(b.min.y-h.min[1])<.06,'on the ground');
  assert.ok(b.max.y<=u.max[1]+.5,'the open hatch lid is the only thing above the casemate');
  assert.ok(b.max.x-b.min.x<h.max[0]-h.min[0]+2.5&&b.max.z-b.min.z<h.max[2]-h.min[2]+3,'the hull plus its debris stay near the boxes');
  assert.ok(g.index.count/3<400);
  for(const f of ['m01-area-wreck.js','m01-area-dressing.js','m01-area-earthworks.js','m01-area-trees.js','m01-area-field.js']){
    const text=readFileSync(new URL('../src/render/'+f,import.meta.url),'utf8');
    for(const banned of [/Panzer(?!zug)/i,/PzKpfw|Pz\.?\s?Kpfw/i,/Sd\.?\s?Kfz/i,/Panzerspäh/i,/\bTiger\b|\bPanther\b/,/Totenkopf|Waffen-SS|\bSS-[A-Z]/,/\bMP\s?40\b|\bMG\s?42\b/,/\bPz\.?\s?(II|III|IV|35|38)\b/])assert.doesNotMatch(text,banned,`${f} ${banned}`);
  }
});

test('tree line: deterministic, varied, one geometry; a prefix of whole trees per tier; every tree has its own height (the ground callback is read per tree)',()=>{
  const seen=[],a=buildTreeLine(L.treeLine,(x,z)=>{seen.push(x);return L.groundY;}),b=buildTreeLine(L.treeLine,()=>L.groundY);
  assert.equal(a.total,L.treeLine.count);assert.deepEqual([...a.geometry.attributes.position.array.slice(0,300)],[...b.geometry.attributes.position.array.slice(0,300)],'deterministic');
  assert.ok(a.geometry.index.count/3<40000,`${a.geometry.index.count/3} triangles`);
  const high=treeDrawRange(a.trees,TREE_SHARE.high),low=treeDrawRange(a.trees,TREE_SHARE.low);
  assert.equal(high.count,a.geometry.index.count);assert.ok(low.trees<high.trees&&low.count<high.count&&low.trees>=Math.floor(a.total*.5));
  // heights vary: crown tops are not all alike
  const pos=a.geometry.attributes.position;let maxY=-Infinity,minTop=Infinity;
  for(const t of a.trees){let top=-Infinity;for(let i=t.firstIndex;i<t.firstIndex+t.indexCount;i++)top=Math.max(top,pos.getY(a.geometry.index.getX(i)));maxY=Math.max(maxY,top);minTop=Math.min(minTop,top);}
  assert.ok(maxY-minTop>4,`tree heights ${minTop}..${maxY}`);
  // the line stays where the layout puts it (x range, z band) apart from crown spread
  for(let i=0;i<pos.count;i+=17){assert.ok(pos.getX(i)>=L.treeLine.minX-12&&pos.getX(i)<=L.treeLine.maxX+12);assert.ok(Math.abs(pos.getZ(i)-L.treeLine.z)<L.treeLine.depthM/2+12);}
});

test('clods and crater rims are small instanced meshes; the soldier lift is a plain colour multiplier, not a shader change',()=>{
  assert.ok(buildClodGeometry().index.count/3<=100);assert.ok(buildCraterRimGeometry().index.count/3<=300);
  const variation=readFileSync(new URL('../src/render/m01-soldier-variation.js',import.meta.url),'utf8');
  assert.match(variation,/setLift\(lift\)\{[^}]*m\.color\.setScalar\(lift\)/);
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  assert.match(view,/areaDressing\?\.replaces\(b\.id\)/,'the plain boxes of the solids the dressing draws are skipped');
});
