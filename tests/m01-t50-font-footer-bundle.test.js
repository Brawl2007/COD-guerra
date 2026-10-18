import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative} from 'node:path';
import {M01LoadingController} from '../src/ui/m01-loading-controller.js';
import {beginAsset,finishAsset,clearAssetsForOwner} from '../src/assets/asset-progress.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('T50 Barlow is self-hosted with OFL licence, source and matching hashes',()=>{
  const dir='assets/fonts/barlow/';
  const src=JSON.parse(read(dir+'SOURCE.json'));
  assert.equal(src.family,'Barlow');
  assert.match(src.author,/Tribby/);
  assert.match(src.source,/github\.com\/google\/fonts/);
  assert.match(read(dir+'OFL.txt'),/SIL Open Font License, Version 1\.1/);
  for(const [file,hash] of Object.entries(src.files))
    assert.equal(createHash('sha256').update(readFileSync(new URL('../'+dir+file,import.meta.url))).digest('hex'),hash,file);
  assert.ok(existsSync(new URL('../'+dir+'Barlow-Regular.ttf',import.meta.url)));
});

test('T50 @font-face blocks (no FOUT), file resolves, index preloads it, credits mention OFL',()=>{
  const css=read('src/styles.css');
  const rule=css.match(/@font-face\{[^}]*Barlow[^}]*\}/)?.[0];
  assert.ok(rule,'@font-face for Barlow');
  assert.match(rule,/font-display:block/);
  const url=rule.match(/url\('([^']+)'\)/)[1];
  assert.ok(existsSync(resolve(new URL('../src/',import.meta.url).pathname,url)),'font file resolves from styles.css');
  assert.match(css,/:root\{font-family:'Barlow'/);
  const html=read('index.html');
  assert.match(html,/<link rel="preload"[^>]*Barlow-Regular\.ttf[^>]*as="font"[^>]*crossorigin/);
  assert.match(read('ASSET_CREDITS.md'),/Barlow[\s\S]{0,400}OFL|OFL[\s\S]{0,400}Barlow/);
});

function fakeRoot(){
  const els={};
  const mk=()=>({textContent:'',style:{},dataset:{},attrs:{},classes:new Set(),
    classList:{toggle(c,on){on?this.o.add(c):this.o.delete(c);},o:null},
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(){}});
  for(const id of ['#m01-loading','#m01-loading-percent','#m01-loading-bar','#m01-loading-stage','#mission-status','#m01-loading-retry']){
    const e=mk();e.classList.o=e.classes;els[id]=e;}
  return {els,querySelector:s=>els[s]??null};
}

test('T50 menu footer reflects loading state (loading, ready, error, non-M01)',()=>{
  const root=fakeRoot();const c=new M01LoadingController(root);
  try{
    c.begin();
    assert.match(root.els['#mission-status'].textContent,/^A CARREGAR M01 · 0%/);
    beginAsset('t50f:a','a.glb');finishAsset('t50f:a',true);beginAsset('t50f:b','b.glb');
    assert.match(root.els['#mission-status'].textContent,/^A CARREGAR M01 · \d+% · 1\/2 MODELOS/);
    assert.equal(root.els['#m01-loading'].dataset.phase,'loading');
    c.ready();
    assert.equal(root.els['#mission-status'].textContent,'PRONTO PARA INICIAR · TCZEW 04:30');
    assert.equal(root.els['#m01-loading-percent'].textContent,'100%');
    c.fail(new Error('rede'));
    assert.match(root.els['#mission-status'].textContent,/^FALHA DE CARREGAMENTO/);
    assert.equal(root.els['#m01-loading-retry'].classes.has('hidden'),false);
    c.selectMission(false);
    assert.equal(root.els['#m01-loading'].classes.has('hidden'),true);
  }finally{c.dispose();clearAssetsForOwner('t50f');}
});

test('T50 entry static import graph excludes three and the game graph (kept behind import())',()=>{
  const seen=new Set();const bad=[];
  const walk=file=>{
    if(seen.has(file))return;seen.add(file);
    const code=readFileSync(file,'utf8');
    for(const m of code.matchAll(/(?:^|[;\n])\s*(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]/g)){
      const spec=m[1];
      if(spec==='three'||spec.startsWith('three/'))bad.push(relative('.',file)+' -> '+spec);
      if(!spec.startsWith('.'))continue;
      const target=resolve(dirname(file),spec);
      if(/\.css$/.test(target))continue;
      if(/src\/(game|render|sim)\//.test(target.replace(/\\/g,'/')))bad.push(relative('.',file)+' -> '+spec);
      else walk(target);
    }
  };
  walk(resolve('src/main.js'));
  assert.deepEqual(bad,[]);
  assert.ok(seen.size>=3);
  assert.match(read('src/main.js'),/await import\('\.\/game\/game\.js'\)/);
  const cfg=read('vite.config.js');
  assert.match(cfg,/three-core/);assert.match(cfg,/three-loaders/);
  assert.match(read('package.json'),/"verify:bundle":\s*"node tools\/verify-t50-bundle\.mjs"/);
});
