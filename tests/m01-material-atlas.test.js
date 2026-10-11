import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { generateAtlas } from '../tools/assets/m01-materials/generate.mjs';
import { decodePng } from '../tools/assets/m01-materials/src/png.mjs';
import { M01_MATERIAL_MANIFEST as manifest, M01_MATERIAL_REGISTRY as registry, m01MaterialDescriptor, M01MaterialLibrary } from '../src/render/materials.js';
import { TERRAIN_TEXTURE_SETS } from '../src/render/m01-terrain-material.js';
import { MASK_SIZES } from '../src/render/m01-terrain-mask.js';
const dir=new URL('../assets/textures/m01/atlas/',import.meta.url),decoded=new Map(manifest.files.map(file=>[file.file,decodePng(readFileSync(new URL(file.file,dir)))]));

test('atlas generation is deterministic and shipped PNGs match generated pixels and provenance',()=>{
  const a=generateAtlas(),b=generateAtlas();assert.deepEqual(a.manifest,b.manifest);assert.deepEqual(a.manifest,manifest);
  assert.equal(manifest.license,'CC0-1.0');assert.equal(manifest.author,'COD-guerra project, original procedural');assert.equal(manifest.files.length,6);
  for(let i=0;i<a.textures.length;i++){
    const t=a.textures[i],file=manifest.files[i],bytes=readFileSync(new URL(t.file,dir)),png=decoded.get(t.file);
    assert.deepEqual(t.png,b.textures[i].png);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
    assert.equal(bytes.length,file.bytes);assert.deepEqual([png.width,png.height],file.size);assert.equal(file.decodedBytes,png.width*png.height*4);
    assert.deepEqual(png.pixels,t.pixels);assert.equal(file.colorSpace,t.role==='albedo'?'sRGB':'linear');
  }
});
test('sixteen material cells cover the requested families, preserve periodic gutters and safe UV bounds',()=>{
  assert.equal(Object.keys(registry).length,16);
  for(const id of ['field','meadow','mud','track','ballast','brick','stone','wood','painted-steel','rusted-steel','canvas','roof-tile','asphalt'])assert.ok(registry[id]);
  for(const spec of Object.values(registry)){
    assert.equal(m01MaterialDescriptor(spec.id),spec);assert.ok(Object.isFrozen(spec));assert.equal(spec.scaleProvenance,'artistic estimate');assert.ok(spec.tileMetres>0);
    const [u,v,w,h]=spec.uv,[cx,cy]=spec.cell;assert.ok(u>cx/4&&v>cy/4&&u+w<(cx+1)/4&&v+h<(cy+1)/4);
    for(const file of manifest.files){
      const {pixels,width}=decoded.get(file.file),cell=width/4,gutter=file.tier==='high'?4:2,n=cell-gutter*2;
      const px=(x,y,c)=>pixels[((cy*cell+y)*width+cx*cell+x)*4+c];
      for(let y=0;y<cell;y++)for(let g=0;g<gutter;g++)for(let c=0;c<4;c++){
        assert.equal(px(g,y,c),px(n+g,y,c),`${spec.id} ${file.role} left gutter`);
        assert.equal(px(cell-gutter+g,y,c),px(gutter+g,y,c),`${spec.id} ${file.role} right gutter`);
        assert.equal(px(y,g,c),px(y,n+g,c),`${spec.id} ${file.role} top gutter`);
        assert.equal(px(y,cell-gutter+g,c),px(y,gutter+g,c),`${spec.id} ${file.role} bottom gutter`);
      }
    }
  }
  assert.throws(()=>m01MaterialDescriptor('missing'),RangeError);
});
test('normal/ORM maps carry normalized relief and material-specific roughness and metalness',()=>{
  for(const tier of ['high','low']){
    const n=tier==='high'?1024:512,normal=decoded.get(`materials-normal-${n}.png`).pixels,orm=decoded.get(`materials-orm-${n}.png`).pixels;
    for(let i=0;i<normal.length;i+=4*37){const x=normal[i]/127.5-1,y=normal[i+1]/127.5-1,z=normal[i+2]/127.5-1;assert.ok(Math.abs(Math.hypot(x,y,z)-1)<.014);assert.equal(normal[i+3],255);assert.equal(orm[i+3],255);}
    const mean=(id,c)=>{const [x,y]=registry[id].cell,cell=n/4;let sum=0;for(let row=4;row<cell-4;row++)for(let col=4;col<cell-4;col++)sum+=orm[((y*cell+row)*n+x*cell+col)*4+c];return sum/(cell-8)**2;};
    assert.ok(mean('painted-steel',2)>100);assert.ok(mean('rusted-steel',2)<mean('painted-steel',2));assert.equal(mean('wood',2),0);
    assert.ok(mean('mud',1)<mean('field',1));assert.ok(mean('canvas',1)>230);
  }
});
test('all High textures including terrain and macro mask fit 40 MiB decoded',()=>{
  const terrain=JSON.parse(readFileSync(new URL('../assets/textures/m01/terrain/terrain.manifest.json',import.meta.url),'utf8'));
  const terrainFiles=new Set(Object.values(TERRAIN_TEXTURE_SETS.high));
  const atlas=manifest.files.filter(f=>f.tier==='high').reduce((n,f)=>n+f.decodedBytes,0),detail=terrain.files.filter(f=>terrainFiles.has(f.file)).reduce((n,f)=>n+f.decodedBytes,0),mask=MASK_SIZES.high.width*MASK_SIZES.high.height*4;
  assert.equal(atlas,12*1048576);assert.ok(atlas+detail+mask<=40*1048576);assert.equal(manifest.budget.totalHighDecodedBytes,atlas+detail+mask);
});
test('shared registry owns three textures once, patches all five material maps, and safely cleans partial load failures',async()=>{
  const images=[];const load=async()=>{const image={width:1024,height:1024,closes:0,close(){this.closes++;}};images.push(image);return image;};
  const library=await M01MaterialLibrary.load({load}),brick=library.createMaterial('brick'),wood=library.createMaterial('wood');
  assert.equal(brick.map,wood.map);assert.equal(brick.normalMap,wood.normalMap);assert.equal(brick.aoMap,brick.roughnessMap);assert.equal(brick.roughnessMap,brick.metalnessMap);
  const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};brick.onBeforeCompile(shader);
  for(const slot of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])assert.match(shader.fragmentShader,new RegExp(`m01AtlasSample\\(${slot},`));
  assert.ok(shader.fragmentShader.includes('textureGrad(tex,p,dx*cap,dy*cap)'));assert.equal(shader.uniforms.m01AtlasMaxGradient.value,4/1024);
  let count=0;for(const resource of [brick,wood,...Object.values(library.maps)])resource.addEventListener('dispose',()=>count++);
  library.dispose();library.dispose();assert.equal(count,5);assert.ok(images.every(image=>image.closes===1));assert.equal(library.diagnostics.loaded,false);assert.throws(()=>library.createMaterial('brick'),/disposed/);
  const partial=[];await assert.rejects(M01MaterialLibrary.load({load:async url=>{if(url.includes('-normal-'))throw new Error('404');const image={width:512,height:512,closed:0,close(){this.closed++;}};partial.push(image);return image;}}),/404/);assert.ok(partial.every(image=>image.closed===1));
});
