import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCodexLegacySave,M02_CODEX_LEGACY_SAVE_KEY} from '../src/game/m02-legacy-save-inspection.js';

function storage(raw){
 let reads=0;
 return {getItem(key){assert.equal(key,M02_CODEX_LEGACY_SAVE_KEY);reads++;return raw;},
  setItem(){assert.fail('inspection must not write');},removeItem(){assert.fail('inspection must not delete');},get reads(){return reads;}};
}
test('legacy save detection reports only a possible migration, without writing or changing bytes',()=>{
 for(const [rng,hasRngState] of [[123,true],[undefined,false]]){
  const raw=JSON.stringify({version:1,id:'cp_m02_b_acesso',snapshot:{schema:'m02-01-bench-snapshot-v1',rngState:rng}}),s=storage(raw);
  assert.deepEqual(inspectCodexLegacySave(s),{status:'requires-review',checkpointId:'cp_m02_b_acesso',hasRngState});
  assert.equal(s.getItem(M02_CODEX_LEGACY_SAVE_KEY),raw);
 }
});
test('missing, malformed, unsupported and unreadable storage are distinguished without mutation',()=>{
 const snapshot={schema:'m02-01-bench-snapshot-v1'};
 assert.equal(inspectCodexLegacySave(storage(null)).status,'missing');
 assert.equal(inspectCodexLegacySave(storage('{')).status,'invalid');
 assert.equal(inspectCodexLegacySave(storage(JSON.stringify({version:1,id:'cp',snapshot:{...snapshot,rngState:-1}}))).status,'invalid');
 assert.equal(inspectCodexLegacySave(storage(JSON.stringify({version:1,id:'cp',snapshot:{schema:'unknown'}}))).status,'unsupported');
 assert.equal(inspectCodexLegacySave({getItem(){throw Error('denied');}}).status,'unavailable');
});
