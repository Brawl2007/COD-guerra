// V-1 (2026-11-06): historical fidelity of M01 (docs/direction/M01_VIBE_FIDELITY_PLAN.md). The owner's rule: at least 80 % of what the player lives,
// per act and overall, is DOCUMENTED or RECONSTRUCTED (missions/m01-tczew/history-context.json, tools/verification/m01-fidelity-audit.mjs).
// Static: no simulation runs here (the weights come from tools/verification/m01-fidelity-measure.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContext,loadData,sourceIds,validate,missingCoverage,fidelity,resolveRef,requiredRefs,THRESHOLD} from '../tools/verification/m01-fidelity-audit.mjs';

const ctx=loadContext(),data=loadData(),fid=fidelity(ctx);

// The first audit (V-1, 2026-11-06) measured every act below 80 %. These are the measured values, recorded so that the threshold
// assertions stay visible as `todo` (the owner decides the corrections case by case) and any change of the data shows up here.
// When an act reaches 80 %, delete its line: its threshold assertion becomes a hard one.
const BELOW_THRESHOLD_V1=Object.freeze({
  act_bw_0430_0705:.6458,
  act_vii_a_north:.4605,
  act_vii_b_north_day:.4075,
  act_vii_c_withdrawal:.3853,
  TOTAL:.5917,
});

test('history-context.json: schema, classifications, sources from research/SOURCES.md and refs that resolve', ()=>{
  assert.equal(ctx.schemaVersion,1);
  assert.ok(ctx.entries.length>100);
  const errors=validate(ctx,data,sourceIds());
  assert.deepEqual(errors,[],errors.join('\n'));
});

test('the validator rejects an unknown source, a missing classification and a ref that does not resolve', ()=>{
  const bad=structuredClone(ctx);
  bad.entries[0].sources=['T99'];delete bad.entries[1].classification;bad.entries[2].refs=['mission.json#events/evt_does_not_exist'];
  const errors=validate(bad,data,sourceIds());
  assert.ok(errors.some(e=>e.includes('source T99')),errors.join('\n'));
  assert.ok(errors.some(e=>e.includes('classification')),errors.join('\n'));
  assert.ok(errors.some(e=>e.includes('does not resolve')),errors.join('\n'));
  assert.equal(resolveRef(data,'mission.json#events/evt_m01_bombing_0434').id,'evt_m01_bombing_0434');
});

test('coverage: every event, objective, group, cast member, cutscene, card, dialogue line, callout, history note and debrief paragraph has an entry', ()=>{
  assert.ok(requiredRefs(data).length>250);
  const missing=missingCoverage(ctx,data);
  assert.deepEqual(missing,[],`ids without an entry in history-context.json:\n${missing.join('\n')}`);
});

test('every split element has a #facto and a #jogo half and dramatizations never claim a source as fact', ()=>{
  for(const e of ctx.entries){
    if(e.splitOf)assert.ok(ctx.entries.some(x=>x.splitOf===e.splitOf&&x.id!==e.id),`${e.id}: split without its other half`);
    if(e.classification==='DOCUMENTED')assert.ok(e.sources.length,`${e.id}: DOCUMENTED without sources`);
  }
});

for(const [act,value] of [...Object.entries(fid.acts),['TOTAL',fid.overall]]){
  const measured=value.fidelity,known=BELOW_THRESHOLD_V1[act];
  if(known!==undefined){
    test(`${act}: the measured fidelity is still the V-1 value ${known} (update BELOW_THRESHOLD_V1 when the data change)`, ()=>{
      assert.ok(Math.abs(measured-known)<5e-4,`${act}: measured ${measured.toFixed(4)}, recorded ${known}`);
    });
    test(`${act}: fidelity >= ${THRESHOLD}`, {todo:`V-1 measured ${(measured*100).toFixed(1)} %: below the owner's 80 % rule; corrections await the owner's decision (docs/verification/m01-runtime/fidelity-audit-2026-11-06/README.md)`}, ()=>{
      assert.ok(measured>=THRESHOLD,`${act}: ${(measured*100).toFixed(1)} %`);
    });
  }else{
    test(`${act}: fidelity >= ${THRESHOLD}`, ()=>{assert.ok(measured>=THRESHOLD,`${act}: ${(measured*100).toFixed(1)} %`);});
  }
}
