import test from 'node:test';
import assert from 'node:assert/strict';
import {patternMatchesUrl,classifyHarnessState,waitForState,isBenignNavigationAbort} from './browser/helpers/harness.js';

test('forced asset glob matching is deterministic and path-specific',()=>{
  assert.equal(patternMatchesUrl('**/m01_mg34_prone_animations.glb','http://127.0.0.1:4173/COD-guerra/assets/models/provisional/m01/weapons/mg34-prone/m01_mg34_prone_animations.glb'),true);
  assert.equal(patternMatchesUrl('**/m01_mg34_prone_animations.glb','http://127.0.0.1:4173/COD-guerra/assets/other.glb'),false);
  assert.equal(patternMatchesUrl('**/m01_ju87_b1_lod*.glb','http://127.0.0.1:4173/COD-guerra/assets/models/m01_ju87_b1_lod2.glb'),true);
  assert.equal(patternMatchesUrl('**/m01-wagons/*.glb','http://127.0.0.1:4173/COD-guerra/assets/models/m01-wagons/wagon_lod0.glb'),true);
});

test('hang classification distinguishes crash, paused, pointer lock, required assets and generic wait',()=>{
  assert.equal(classifyHarnessState({crashed:true}),'BROWSER_CRASHED');
  assert.equal(classifyHarnessState({pageClosed:true}),'PAGE_CLOSED');
  assert.equal(classifyHarnessState({readyState:'loading'}),'PAGE_NOT_READY');
  assert.equal(classifyHarnessState({readyState:'complete',ui:{error:{visible:true}}}),'ERROR_MODAL_VISIBLE');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:null,pendingAssets:[{url:'http://test/optional.glb'}],diagnostics:{paused:true,m01:{requiredAssetFailures:[],assetFailures:[]}}}),'ASSET_REQUEST_PENDING');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:null,pendingAssets:[],diagnostics:{paused:true,m01:{requiredAssetFailures:[],assetFailures:[]}}}),'SIMULATION_PAUSED');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:null,diagnostics:{paused:false,m01:{requiredAssetFailures:[],assetFailures:[]}}}),'POINTER_LOCK_MISSING');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:'game',diagnostics:{paused:false,m01:{requiredAssetFailures:[{path:'bridge.glb'}],assetFailures:[]}}}),'REQUIRED_ASSET_FAILURE');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:'game',diagnostics:{paused:false,m01:{requiredAssetFailures:[],assetFailures:[{path:'optional.glb'}]}}}),'OPTIONAL_ASSET_FAILURE_PRESENT');
  assert.equal(classifyHarnessState({readyState:'complete',pointerLockId:'game',diagnostics:{paused:false,m01:{requiredAssetFailures:[],assetFailures:[]}}}),'WAIT_CONDITION_UNMET');
});

test('waitForState accepts a condition reached exactly at the timeout boundary without extending the budget',async()=>{
  let evaluations=0;
  const page={
    waitForFunction:async()=>{throw new Error('Timeout 120000ms exceeded');},
    evaluate:async()=>{evaluations+=1;return true;}
  };
  assert.equal(await waitForState(page,'boundary-state',()=>true,null,{timeout:120000}),true);
  assert.equal(evaluations,1);
});


test('only ERR_ABORTED owned by an active main-frame navigation is benign',()=>{
  assert.equal(isBenignNavigationAbort('net::ERR_ABORTED',{navigating:true}),true);
  assert.equal(isBenignNavigationAbort('net::ERR_ABORTED',{navigating:false}),false);
  assert.equal(isBenignNavigationAbort('net::ERR_FAILED',{navigating:true}),false);
  assert.equal(isBenignNavigationAbort(null,{navigating:true}),false);
});
