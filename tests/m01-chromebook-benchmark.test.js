import test from 'node:test';
import assert from 'node:assert/strict';
import {percentile,frameDeltasFromTimestamps,summariseFrameDeltas,detectSoftwareRenderer,rendererClass,normalisePerformanceMemory,serialiseBenchmark} from '../tools/m01-chromebook-benchmark.mjs';

test('FPS and frame-time percentiles use deterministic requestAnimationFrame deltas',()=>{
  const m=summariseFrameDeltas([10,20,30,40]);
  assert.equal(m.frames,4);assert.equal(m.durationMs,100);assert.equal(m.fpsAverage,40);assert.equal(m.frameTimeAverageMs,25);
  assert.equal(m.frameTimeMinMs,10);assert.equal(m.frameTimeMaxMs,40);assert.equal(m.p50Ms,25);assert.equal(m.p90Ms,37);assert.equal(m.p95Ms,38.5);assert.equal(m.p99Ms,39.7);
  assert.equal(percentile([4,1,3,2],.5),2.5);
});

test('slow-frame buckets are strict >16.67/>33.33/>50/>100 ms and stalls are sorted',()=>{
  const m=summariseFrameDeltas([16.67,16.68,33.33,33.34,50,50.01,100,100.01]);
  assert.deepEqual([m.framesOver16_67ms,m.framesOver33_33ms,m.framesOver50ms,m.framesOver100ms],[7,5,3,1]);
  assert.deepEqual(m.largestStalls.slice(0,3).map(x=>x.ms),[100.01,100,50.01]);
});

test('warm-up timestamps are discarded before measurement deltas',()=>{
  const timestamps=[0,10,20,30,40,50,60,70,80];
  assert.deepEqual(frameDeltasFromTimestamps(timestamps,{warmupMs:30,measurementMs:30}),[10,10,10]);
});

test('performance.memory is optional',()=>{
  assert.equal(normalisePerformanceMemory(undefined),null);assert.equal(normalisePerformanceMemory({}),null);
  assert.deepEqual(normalisePerformanceMemory({usedJSHeapSize:12,totalJSHeapSize:20,jsHeapSizeLimit:100,noise:9}),{usedJSHeapSize:12,totalJSHeapSize:20,jsHeapSizeLimit:100});
});

test('SwiftShader/software renderers are explicit and missing renderer remains unknown',()=>{
  assert.equal(detectSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'),true);
  assert.equal(rendererClass('llvmpipe (LLVM 17.0)'), 'software');
  assert.equal(detectSoftwareRenderer('ANGLE (Intel, Intel UHD Graphics 620)'),false);assert.equal(rendererClass('ANGLE (Intel, Intel UHD Graphics 620)'),'hardware');
  assert.equal(detectSoftwareRenderer(null),null);assert.equal(rendererClass(null),'unknown');
});

test('JSON serialization rejects NaN/Infinity and produces valid structured output',()=>{
  const value={schemaVersion:1,metrics:summariseFrameDeltas([16,17,18]),memory:null};
  const text=serialiseBenchmark(value);assert.deepEqual(JSON.parse(text),value);assert.ok(!text.includes('NaN'));assert.ok(!text.includes('Infinity'));
  assert.throws(()=>serialiseBenchmark({bad:NaN}),/Non-finite/);assert.throws(()=>serialiseBenchmark({bad:Infinity}),/Non-finite/);
});

test('empty or invalid frame samples fail with clear errors',()=>{
  assert.throws(()=>summariseFrameDeltas([]),/empty/i);assert.throws(()=>summariseFrameDeltas([16,0]),/non-finite or non-positive/i);assert.throws(()=>summariseFrameDeltas([16,NaN]),/non-finite/i);
});
