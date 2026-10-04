#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

export const DEFAULT_FILES=[
  'src/render/m01-view.js',
  'src/render/m01-environment.js',
  'src/render/m01-atmosphere.js',
  'src/render/m01-surfaces.js',
  'src/render/m01-characters.js',
  'src/render/m01-viewmodel.js',
  'src/render/m01-train-wagons.js',
  'src/render/three-renderer.js',
];

export const PATTERNS=[
  ['box_geometry',/new\s+THREE\.BoxGeometry\b|mesh\(\s*['"]box['"]/],
  ['sphere_geometry',/new\s+THREE\.SphereGeometry\b|mesh\(\s*['"]sphere['"]/],
  ['cylinder_geometry',/new\s+THREE\.CylinderGeometry\b|mesh\(\s*['"]cylinder['"]/],
  ['plane_geometry',/new\s+THREE\.PlaneGeometry\b/],
  ['capsule_geometry',/new\s+THREE\.CapsuleGeometry\b/],
  ['instanced_mesh',/new\s+THREE\.InstancedMesh\b/],
  ['asset_load',/assets\.load\s*\(|\.glb['"`]/],
  ['fallback_word',/\bfallback\b/i],
  ['proxy_word',/\bproxy\b/i],
  ['placeholder_word',/\bplaceholder\b/i],
  ['procedural_word',/\bprocedural\b/i],
];

const read=p=>fs.readFileSync(p,'utf8');

export function scanText(file,text){
  const findings=[];
  text.split(/\r?\n/).forEach((line,index)=>{
    for(const [kind,re]of PATTERNS)if(re.test(line))findings.push({file,line:index+1,kind,text:line.trim()});
  });
  return findings;
}

export function scanRepository(root=process.cwd(),files=DEFAULT_FILES){
  const missing=[],findings=[];
  for(const rel of files){
    const abs=path.join(root,rel);
    if(!fs.existsSync(abs)){missing.push(rel);continue;}
    findings.push(...scanText(rel,read(abs)));
  }
  const assetsRoot=path.join(root,'assets/models/provisional');
  const glbs=[];
  if(fs.existsSync(assetsRoot)){
    const walk=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(ent.name.endsWith('.glb'))glbs.push(path.relative(root,p));}};
    walk(assetsRoot);
  }
  return {
    ok:missing.length===0,
    filesScanned:files.length-missing.length,
    missing,
    counts:Object.fromEntries(PATTERNS.map(([k])=>[k,findings.filter(f=>f.kind===k).length])),
    findings,
    glbCount:glbs.length,
    glbs:glbs.sort(),
    note:'Scanner candidates are not semantic quality verdicts. Review every primitive/fallback in runtime context.',
  };
}

export function selfTest(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'m01-visual-placeholder-audit-'));
  try{
    const rel=DEFAULT_FILES[0],abs=path.join(root,rel);fs.mkdirSync(path.dirname(abs),{recursive:true});
    fs.writeFileSync(abs,"const box=new THREE.BoxGeometry(1,1,1);\nthis.mesh('sphere','smoke',[0,0,0],[1,1,1]);\ntry{await this.assets.load('x','assets/models/x.glb')}catch{/* fallback proxy */}");
    const direct=scanText(rel,read(abs));
    assert.ok(direct.some(x=>x.kind==='box_geometry'));
    assert.ok(direct.some(x=>x.kind==='sphere_geometry'));
    assert.ok(direct.some(x=>x.kind==='asset_load'));
    assert.ok(direct.some(x=>x.kind==='fallback_word'));
    assert.ok(direct.some(x=>x.kind==='proxy_word'));
    const partial=scanRepository(root,[rel,'src/render/missing.js']);
    assert.equal(partial.ok,false);assert.deepEqual(partial.missing,['src/render/missing.js']);
    fs.mkdirSync(path.join(root,'assets/models/provisional/m01'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets/models/provisional/m01/test.glb'),'fixture');
    const complete=scanRepository(root,[rel]);assert.equal(complete.ok,true);assert.equal(complete.glbCount,1);
    return {ok:true,cases:3,findings:direct.length};
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

if(import.meta.url===`file://${process.argv[1]}`){
  if(process.argv.includes('--self-test')){console.log(JSON.stringify(selfTest(),null,2));process.exit(0);}
  const report=scanRepository(process.cwd());
  console.log(JSON.stringify(report,null,2));process.exitCode=report.ok?0:1;
}
