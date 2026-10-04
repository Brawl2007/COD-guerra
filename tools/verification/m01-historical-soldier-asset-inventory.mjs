#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

export const TARGETS=[
  {id:'soldiers',manifest:'assets/models/provisional/m01/characters/manifest.json',lodFamilies:[
    ['m01_soldier_pl_lod0.glb','m01_soldier_pl_lod1.glb','m01_soldier_pl_lod2.glb'],
    ['m01_soldier_de_lod0.glb','m01_soldier_de_lod1.glb','m01_soldier_de_lod2.glb']
  ],required:['m01_soldier_animations.glb'],licenseSource:'ASSET_CREDITS.md + assets/licenses/MakeHuman-CC0.md'},
  {id:'rkm_wz28',manifest:'assets/models/provisional/m01/weapons/rkm_wz28/manifest.json',lodFamilies:[['m01_rkm_wz28_lod0.glb','m01_rkm_wz28_lod1.glb','m01_rkm_wz28_lod2.glb']],required:['m01_rkm_wz28_animations.glb']},
  {id:'ckm_wz30',manifest:'assets/models/provisional/m01/weapons/ckm_wz30/manifest.json',lodFamilies:[['m01_ckm_wz30_lod0.glb','m01_ckm_wz30_lod1.glb','m01_ckm_wz30_lod2.glb']],required:['m01_ckm_wz30_animations.glb']},
  {id:'mg34',manifest:'assets/models/provisional/m01/weapons/mg34/manifest.json',lodFamilies:[['m01_mg34_lod0.glb','m01_mg34_lod1.glb','m01_mg34_lod2.glb']],required:['m01_mg34_animations.glb']},
  {id:'mg34_prone',manifest:'assets/models/provisional/m01/weapons/mg34-prone/manifest.json',lodFamilies:[],required:['m01_mg34_prone_animations.glb']},
  {id:'station_drag',manifest:'assets/models/provisional/m01/characters/station-drag-transitions/manifest.json',lodFamilies:[],required:['m01_station_drag_transitions.glb']},
];

const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const exists=p=>fs.existsSync(p);
const filesObject=m=>m.files&&typeof m.files==='object'&&!Array.isArray(m.files)?m.files:{};

export function audit(root=process.cwd()){
  const errors=[],warnings=[],assets=[],seen=new Map();
  for(const target of TARGETS){
    const mp=path.join(root,target.manifest);
    if(!exists(mp)){errors.push({code:'MISSING_MANIFEST',target:target.id,path:target.manifest});continue;}
    let m;try{m=json(mp);}catch(e){errors.push({code:'INVALID_JSON',target:target.id,path:target.manifest,message:e.message});continue;}
    const dir=path.dirname(mp),declared=filesObject(m),names=Object.keys(declared);
    const expected=[...target.lodFamilies.flat(),...(target.required||[])];
    for(const name of expected){
      if(!names.includes(name))errors.push({code:'MISSING_REFERENCE',target:target.id,file:name});
      const disk=path.join(dir,name);
      if(!exists(disk))errors.push({code:'MISSING_FILE',target:target.id,file:path.relative(root,disk)});
    }
    for(const name of names){
      const key=path.relative(root,path.join(dir,name));
      if(seen.has(key))errors.push({code:'DUPLICATE_FILE_ID',file:key,targets:[seen.get(key),target.id]});
      else seen.set(key,target.id);
      if(!exists(path.join(dir,name)))errors.push({code:'BROKEN_DECLARED_PATH',target:target.id,file:key});
    }
    for(const family of target.lodFamilies){
      const present=family.filter(n=>names.includes(n)&&exists(path.join(dir,n)));
      if(present.length!==3)errors.push({code:'INCOMPLETE_LOD',target:target.id,expected:family,present});
    }
    const explicitLicense=typeof m.license==='string'&&m.license.trim().length>0;
    if(!explicitLicense&&!target.licenseSource)warnings.push({code:'LICENSE_FIELD_MISSING',target:target.id,path:target.manifest});
    assets.push({
      id:target.id,manifest:target.manifest,
      declaredFiles:names,expectedFiles:expected,
      explicitLicense,licenseSource:target.licenseSource??(explicitLicense?'manifest':null),
      author:m.author??null,status:m.status??null,
      sourceKeys:m.sources?Object.keys(m.sources):[],
      estimatedMeasures:Array.isArray(m.measures)?m.measures.filter(x=>x?.estimated===true).length:0,
      totalMeasures:Array.isArray(m.measures)?m.measures.length:0
    });
  }
  for(const required of ['ASSET_CREDITS.md','assets/licenses/MakeHuman-CC0.md','tools/assets/m01-soldiers/makehuman.lock.json'])
    if(!exists(path.join(root,required)))errors.push({code:'MISSING_PROVENANCE_FILE',path:required});
  return {ok:errors.length===0,errors,warnings,assets};
}

function makeFixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'m01-asset-audit-'));
  fs.mkdirSync(path.join(root,'assets/licenses'),{recursive:true});
  fs.mkdirSync(path.join(root,'tools/assets/m01-soldiers'),{recursive:true});
  fs.writeFileSync(path.join(root,'ASSET_CREDITS.md'),'fixture');
  fs.writeFileSync(path.join(root,'assets/licenses/MakeHuman-CC0.md'),'CC0');
  fs.writeFileSync(path.join(root,'tools/assets/m01-soldiers/makehuman.lock.json'),'{}');
  for(const t of TARGETS){
    const dir=path.join(root,path.dirname(t.manifest));fs.mkdirSync(dir,{recursive:true});
    const files={};for(const n of [...t.lodFamilies.flat(),...(t.required||[])]){files[n]={};fs.writeFileSync(path.join(dir,n),'fixture');}
    const m={files,...(t.licenseSource?{}:{license:'fixture project-original'}),sources:{}};
    fs.writeFileSync(path.join(root,t.manifest),JSON.stringify(m));
  }
  return root;
}

export function selfTest(){
  const root=makeFixture();
  try{
    const clean=audit(root);assert.equal(clean.ok,true);assert.equal(clean.errors.length,0);
    const victim=path.join(root,'assets/models/provisional/m01/weapons/mg34/m01_mg34_lod1.glb');
    fs.unlinkSync(victim);
    const broken=audit(root);assert.equal(broken.ok,false);
    assert.ok(broken.errors.some(e=>e.code==='MISSING_FILE'&&e.target==='mg34'));
    assert.ok(broken.errors.some(e=>e.code==='INCOMPLETE_LOD'&&e.target==='mg34'));
    fs.writeFileSync(victim,'fixture');
    const mp=path.join(root,'assets/models/provisional/m01/weapons/rkm_wz28/manifest.json');
    fs.writeFileSync(mp,'{bad');const invalid=audit(root);
    assert.ok(invalid.errors.some(e=>e.code==='INVALID_JSON'&&e.target==='rkm_wz28'));
    return {ok:true,cases:3};
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const args=new Set(process.argv.slice(2));
  if(args.has('--self-test')){console.log(JSON.stringify(selfTest(),null,2));process.exit(0);}
  const result=audit(process.cwd());console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
}
