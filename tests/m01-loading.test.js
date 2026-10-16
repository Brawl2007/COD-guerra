import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {AssetManager} from '../src/assets/asset-manager.js';
import {getAssetProgressSnapshot,subscribeAssetProgress} from '../src/assets/asset-progress.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('T50 real transfer events, cache deduplication, session validity and disposal are observable',async()=>{
 const a=new AssetManager(),gate=deferred(),history=[];let calls=0,progress;
 const unsubscribe=subscribeAssetProgress(s=>history.push(s));
 a.fetchAsset=(path,onProgress)=>{calls++;progress=onProgress;return gate.promise;};
 const epoch=a.beginSession(),one=a.load('model','test.glb'),two=a.load('model','test.glb');assert.equal(calls,1);assert.equal(a.current(epoch),true);
 progress({loaded:20,total:100});assert.equal(getAssetProgressSnapshot().bytesLoaded,20);assert.equal(getAssetProgressSnapshot().ratio,.2);
 progress({loaded:70,total:100});assert.equal(getAssetProgressSnapshot().ratio,.7);
 const value={scene:{traverse(){}}};gate.resolve(value);assert.equal(await one,value);assert.equal(await two,value);assert.equal(getAssetProgressSnapshot().completedItems,1);
 await a.load('model','test.glb');assert.equal(calls,1);assert.equal(getAssetProgressSnapshot().totalItems,1);
 a.beginSession();assert.equal(a.current(epoch),false);a.dispose();assert.equal(getAssetProgressSnapshot().totalItems,0);unsubscribe();assert.ok(history.some(s=>s.bytesLoaded===20));
});
test('T50 rejection retries use fresh record; dispose suppresses late progress and releases late values once',async()=>{
 const a=new AssetManager(),gate=deferred();a.fetchAsset=()=>Promise.reject(Error('broken'));
 await assert.rejects(a.load('bad','bad.glb'));assert.equal(a.failures.length,1);assert.equal(getAssetProgressSnapshot().failedCount,1);
 let onProgress,releases=0;a.fetchAsset=(p,cb)=>{onProgress=cb;return gate.promise;};a.release=()=>releases++;
 const pending=a.load('bad','bad.glb');assert.equal(getAssetProgressSnapshot().failedCount,0);assert.equal(getAssetProgressSnapshot().totalItems,1);
 a.dispose();const disposedReleases=releases;onProgress({loaded:5,total:10});gate.resolve({});await assert.rejects(pending,/cancelado/);
 assert.equal(releases,disposedReleases+1);assert.equal(getAssetProgressSnapshot().totalItems,0);assert.equal(a.assets.size,0);
 await assert.rejects(a.load('late','late.glb'),/descartado/);
});

test('T50 authorized AssetManager revision preserves exact predecessor provenance',()=>{
 const manifest=JSON.parse(readFileSync('tests/fixtures/m01-t40-t50-source-revisions.json'));
 for(const [path,revision]of Object.entries(manifest.files)){
  const hash=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(hash(execFileSync('git',['show',`${manifest.base}:${path}`])),revision.originalSha256,path+' predecessor');
  assert.equal(hash(readFileSync(path)),revision.currentSha256,path+' current reviewed source');
 }
});
test('T50 ships the actual selfhosted Barlow font and complete OFL with pinned SHA',()=>{
 const provenance=JSON.parse(readFileSync('assets/fonts/barlow/SOURCE.json'));
 for(const [file,sha]of Object.entries(provenance.files))assert.equal(createHash('sha256').update(readFileSync('assets/fonts/barlow/'+file)).digest('hex'),sha);
 const font=readFileSync('assets/fonts/barlow/Barlow-Regular.ttf');assert.ok(font.length>10000);assert.ok(font.includes(Buffer.from('004200610072006c006f0077','hex')),'Barlow name table');
 const license=readFileSync('assets/fonts/barlow/OFL.txt','utf8');assert.ok(license.length>4000);assert.match(license,/SIL OPEN FONT LICENSE Version 1.1/);assert.match(license,/TERMINATION/);
});
