import test from 'node:test';
import assert from 'node:assert/strict';
import {beginAsset,progressAsset,finishAsset,clearAssetsForOwner,getAssetProgressSnapshot,subscribeAssetProgress} from '../src/assets/asset-progress.js';
import {AssetManager,assetUrl} from '../src/assets/asset-manager.js';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('T50 leaves V7 loader public contract intact',()=>{
  const a=new AssetManager();
  for(const k of ['beginSession','current','load','fetchAsset','get','animate','release','dispose'])
    assert.equal(typeof a[k],'function',k);
  assert.equal(assetUrl('assets/a.glb').endsWith('/assets/a.glb'),true);
  a.dispose();
});
test('T50 tracks actual asset requests and partial known byte counts',()=>{
  const reports=[];const stop=subscribeAssetProgress(s=>reports.push(s));
  beginAsset('testA:mesh','bridge.glb');
  progressAsset('testA:mesh',{loaded:48,total:96});
  assert.equal(getAssetProgressSnapshot().bytesLoaded,48);
  assert.equal(getAssetProgressSnapshot().knownBytes,1);
  finishAsset('testA:mesh',true);
  assert.equal(getAssetProgressSnapshot().completedItems,1);
  assert.ok(reports.length>=4);
  stop();clearAssetsForOwner('testA');
});
test('T50 observes the original GLTF loader response shape, cache and same-name reuse',async()=>{
  const m=new AssetManager();
  let count=0;
  m.fetchAsset=async()=>{count++;return {scene:{traverse(){}},animations:[]};};
  const a=await m.load('proof','assets/proof.glb');
  const b=await m.load('proof','assets/proof.glb');
  assert.equal(a,b);assert.equal(m.get('proof'),a);assert.equal(count,1);
  assert.equal(getAssetProgressSnapshot().failedCount,0);m.dispose();
});
test('T50 retry is bounded to transient failures and does not swallow required failures',async()=>{
  const m=new AssetManager();
  let n=0;
  m.fetchAsset=async()=>{if(++n<=2)throw Error('503 temporary');return {scene:{traverse(){}},animations:[]};};
  await m.load('flaky','assets/flaky.glb');assert.equal(n,3);
  let missing=0;
  m.fetchAsset=async()=>{missing++;throw Error('404 missing');};
  await assert.rejects(m.load('required','assets/missing.glb'),/404/);
  assert.equal(missing,1);
  assert.ok(m.failures.some(x=>x.path==='assets/missing.glb'));
  m.dispose();
});

test('T50 preserves V7 session, cache, animate and ownership/dispose code byte-for-byte',()=>{
  const root=new URL('../src/assets/asset-manager.js',import.meta.url);
  const current=readFileSync(root,'utf8');
  const baseline=execFileSync('git',['show','4c6f7bebee27b68af3bea8ad086da1dffbca0084:src/assets/asset-manager.js'],{encoding:'utf8'});
  for(const [from,to] of [
    ['  beginSession(){','  async load('],
    ['  get(name){','  dispose(){']
  ]){
    const slice=(text)=>text.slice(text.indexOf(from),text.indexOf(to,text.indexOf(from)));
    assert.ok(current.includes(from)&&baseline.includes(from));
    assert.equal(slice(current),slice(baseline),from+' must retain original V7 implementation');
  }
});
