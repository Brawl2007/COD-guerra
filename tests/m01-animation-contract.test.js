import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import historicalGolden from './fixtures/m01-anim-gameplay-baseline.json' with {type:'json'};
import partialsGolden from './fixtures/m01-partials-gameplay-baseline.json' with {type:'json'};
// T38 (M01-COMBAT-POSTURE-STAGING-V1) changes gameplay by design; its golden was regenerated on x86 by tools/verification/
// m01-combat-posture-staging-audit.mjs after the invariant audit against the exact predecessor (whose simulation the partials golden pins). Since the merge of T47 (3c9cab7)
// it is history: the golden of the staging 8c6328c (candidate #80 + #89 + T48 + T40 + T38), pinned here by sha256 and no longer the golden of the live simulation.
import t38Golden from './fixtures/m01-t38-gameplay-baseline.json' with {type:'json'};
// T47 (M01-T47-CKM-LIVE-FIRE-V1) was merged onto that staging: its golden, regenerated on x86 by tools/verification/m01-t47-ckm-fire-audit.mjs after the per-tick delta audit
// against the exact staging predecessor, is the golden of the live simulation.
import golden from './fixtures/m01-t47-gameplay-baseline.json' with {type:'json'};
// M01-NPC-NAVIGATION-V1 (golden amendment 05, 2026-10-18, phys x npc integration): the actors got a deterministic navigation round every solid (the colliders and the player's
// layer) and local avoidance, so the simulation moved again. The T47 golden above is history since then (it pins the simulation of the physics tree c7d8341 = 98f094f, byte for
// byte below); the golden of the live simulation, regenerated on x86 by tools/verification/m01-npc-navigation-golden-audit.mjs after its lockstep audit against that exact
// predecessor, is this one.
import live from './fixtures/m01-npc-navigation-gameplay-baseline.json' with {type:'json'};
// M01-P2-PACING-V1 (golden amendment 06, 2026-10-18, integration claude/busy-ritchie-3fkvk2-integ-pc): the hold clock compresses once the player holds the deck, the objective panel
// and status lines changed and the continuity cues are gated. The NPC navigation golden above is history since then (it pins the simulation of 66e47b2, byte for byte below); the
// golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 06 after its lockstep audit against that exact predecessor, is this one.
import pacing from './fixtures/m01-pacing-gameplay-baseline.json' with {type:'json'};
// M01-COMBAT-AI-V1 (golden amendment 07, 2026-10-18, same integration): combat AI slice 1 (actor.ai, peeks, MG34 burst groups, threat, suppression, Kowal bursts). The pacing golden
// above is history since then (it pins the simulation of 5d99df8); the golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs
// --amendment 07 after its lockstep audit against that exact predecessor, is this one.
import combat from './fixtures/m01-combat-ai-gameplay-baseline.json' with {type:'json'};
// M01-COMBAT-DECK-ASSAULT-V1 (golden amendment 08, 2026-10-18, branch claude/busy-ritchie-3fkvk2-slice2): combat slice 2, the deck assault (grp_de_spans to mid-deck and back, the east
// demolition waits for the deck to clear, enemy_down_by_player, the platoon's two clips). The combat AI golden above is history since then (it pins the simulation of 5d13d32 =
// 9cd2aca); the golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 08 after its lockstep audit, is this one.
import deck from './fixtures/m01-deck-assault-gameplay-baseline.json' with {type:'json'};
const DECK_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen\.who$/;   // the named delta of amendment 08, as measured (tools/verification/m01-integration-golden-audit.mjs)
// M01-NAV-QUEUE-V1 (golden amendment 09, 2026-10-19, branch claude/busy-ritchie-3fkvk2-navq): at most one route() per tick, work buffers reused, the navigator's solid list built before the first
// plan, the neighbour queries on reused storage. It moves the SOURCE LOCK only: not one tick of either golden route differs from the deck assault golden (the tool's lockstep finds no difference,
// and the digests equal amendment 08's, block for block). The deck assault golden above is history since then (it pins the simulation of ff65255); the golden of the live simulation,
// regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 09, is this one.
import nav from './fixtures/m01-nav-queue-gameplay-baseline.json' with {type:'json'};
const current=nav;   // the golden of the live simulation
import {AUXILIARY_IDS} from '../src/game/m01-yard-life.js';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {PRESENTATION_FIELDS} from '../src/game/m01-animation-presentation.js';
import {actorHitboxes,eyePosition,mg34ProneGeometry} from '../src/world/spatial.js';
import {route,driver,toStationEvacuation} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';
import {gameplaySnapshot,gameplayFrame,GameplayDigest} from './helpers/m01-animation-contract.js';

const report={task:'M01-ANIM-CONTRACT-SIM-V1',cases:[]};
after(()=>{if(process.env.M01_ANIM_CONTRACT_REPORT)writeFileSync(process.env.M01_ANIM_CONTRACT_REPORT,JSON.stringify(report,null,2)+'\n');});
const record=(s,options)=>report.cases.push(compareContinuation(s,options));
let completed;
const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
const active=()=>{const s=new M01Simulation(17);s.tick(.05,{skip:true});return s;};

test('schema 2 initializes all 97 IDs; diagnostics are detached, small presentation records',()=>{
  const s=new M01Simulation(),ids=s.actors.map(a=>a.id),diag=s.animationPresentation;
  assert.equal(s.snapshot().schema,2);assert.equal(ids.length,97);assert.deepEqual(diag.actors.map(a=>a.id),ids);
  for(const a of s.actors){assert.deepEqual(a.motion,{speed:0,odometer:0,gait:'idle',gaitSince:0});assert.equal(a.bodyYaw,a.facing);
    assert.equal(a.posture,'stand');assert.equal(a.postureSince,0);assert.equal(a.hitAt,-1e9);assert.equal(a.diedAt,-1e9);assert.equal(a.suppressedAt,-1e9);}
  diag.actors[0].motion.odometer=99;assert.equal(s.actors[0].motion.odometer,0);
  assert.ok(diag.actors.every(a=>!Object.hasOwn(a,'health')&&!Object.hasOwn(a,'target')));
  validateM01Snapshot(s.snapshot());
});

test('historical approved golden remains immutable; the partials golden and the T38 golden (amendments 01 and 02) stay pinned as history',()=>{
  assert.equal(historicalGolden.base,'61ecd77b099d5921bd025275eafd9c3157536bb7');
  assert.equal(historicalGolden.sourceSha256,'792fdc9a7a56a09bda599669f7349e3bb6fad0e3e13d67eed03f1474eeef07b6');
  assert.equal(historicalGolden.approvedIntegration.task,'M01-CONTINUITY-RAID-INTEGRATION-V1');
  assert.equal(historicalGolden.approvedIntegration.base,'2d65dd0b9837d5e6f21fe24dd8a8b167ca76df55');
  assert.equal(historicalGolden.approvedIntegration.sourceSha256,'e988fcd9b923a429657d1deeb820054694b5e9b046ff904faa190e14e020c4a6');
  // H9-D1 moved only the source lock (per-tick routes unchanged); that record is now historical provenance as well.
  assert.equal(historicalGolden.sourceLock.task,'M01-H9-D1-DIFFICULTY-DATA-V1');
  assert.equal(historicalGolden.sourceLock.previousTask,historicalGolden.approvedIntegration.task);
  assert.equal(historicalGolden.sourceLock.previousSourceSha256,historicalGolden.approvedIntegration.sourceSha256);
  assert.equal(historicalGolden.sourceLock.sourceSha256,'57c81b31acf4920f6259db47faadb94ac33a10916db5befaadf2d35e0f988506');
  // The partials golden is the golden of the predecessor of T38 (the candidate #80 + #89 + T48, 5a169ba) and is history too: byte for byte the file T48 committed with
  // its amendment 02 (German retreat), whose own pre-change copy (the golden of the candidate #80 alone) is kept byte for byte as well.
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  assert.equal(sha('./fixtures/m01-partials-gameplay-baseline.json'),'a29c1ac9a4a5ae729bc2330a7b57ed430403311a3160174a9995efc3c54a8f07');
  assert.equal(sha('./fixtures/m01-partials-gameplay-baseline-before-amendment-02.json'),'83a907ca00389f17723ffc97f1c42dca7d80f9a956d07ca7f39b8ae58fe87b79');
  assert.equal(partialsGolden.task,'M01-PARTIALS-COMPLETION-INTEGRATION-V1');assert.equal(partialsGolden.sourceSha256,'c06c1b1be4e2d1eddffa14b791d661d95bb1d0aefbae7cb4e80f37ecf92083a2');
  assert.equal(t38Golden.task,'M01-COMBAT-POSTURE-STAGING-V1');assert.equal(t38Golden.predecessor,'5a169babb638d1d09608f9a2bb84d1528f1aab4b');
  assert.equal(t38Golden.predecessorSourceSha256,partialsGolden.sourceSha256);
  assert.equal(t38Golden.partialsGoldenSha256,'a29c1ac9a4a5ae729bc2330a7b57ed430403311a3160174a9995efc3c54a8f07');
  assert.equal(t38Golden.historicalGoldenSha256,createHash('sha256').update(readFileSync(new URL('./fixtures/m01-anim-gameplay-baseline.json',import.meta.url))).digest('hex'));
  assert.deepEqual(t38Golden.routes.map(r=>[r.seed,r.support]),partialsGolden.routes.map(r=>[r.seed,r.support]),'the same two routes');
  // The T38 golden pins the simulation of the staging 8c6328c (the source the T47 golden names as its predecessor, below), not the live one: it is history since the merge of T47.
  assert.equal(sha('./fixtures/m01-t38-gameplay-baseline.json'),'d21fa94e0ad2bb4c161939f5ba9db319dc36e4ef2665d1e2b21767dfe978df6c');
  assert.equal(t38Golden.sourceSha256,'c470d1447c925419ad9e99237fa7f0c2c8fb4d8f9238c86e29bc4d9cd1ed33a9');
  // Amendment 01 (docs/verification/m01-runtime/t38-combat-posture-staging-v1/GOLDEN_AMENDMENT_01.json): the T38 golden was regenerated by the audit
  // tool after the twelve gate-rifleman places moved. The golden it replaced is kept byte for byte, and the amendment record names both files. The golden it
  // produced is the one amendment 02 replaced, so it is kept byte for byte too (the T38 head 65145c9), and it is pinned here.
  const record=name=>JSON.parse(readFileSync(new URL(`../docs/verification/m01-runtime/t38-combat-posture-staging-v1/${name}`,import.meta.url),'utf8'));
  const amendment=record('GOLDEN_AMENDMENT_01.json'),replaced=JSON.parse(readFileSync(new URL('./fixtures/m01-t38-gameplay-baseline-before-amendment-02.json',import.meta.url),'utf8'));
  assert.equal(sha('./fixtures/m01-t38-gameplay-baseline-before-amendment-01.json'),'2dd919178de1c54da42589ae926cd42c116a248b07c7e4c3cebab15250d2b397');
  assert.equal(amendment.beforeFixtureSha256,'2dd919178de1c54da42589ae926cd42c116a248b07c7e4c3cebab15250d2b397');
  assert.equal(sha('./fixtures/m01-t38-gameplay-baseline-before-amendment-02.json'),'89baff905da88e8bc1f8fd9dcfc40686779d77dc22246ab2b1bafb236b0ad5a2');
  assert.equal(amendment.afterFixtureSha256,'89baff905da88e8bc1f8fd9dcfc40686779d77dc22246ab2b1bafb236b0ad5a2','amendment 01 names the golden that amendment 02 replaced');
  assert.equal(amendment.beforeSourceSha256,replaced.sourceSha256,'amendment 01 changed gameplay data only: the simulation source is the one both of its goldens pin');
  // Amendment 02 (GOLDEN_AMENDMENT_02.json, generated by the same audit tool with --amendment 02): the T48 German retreat joined the T38 simulation (merge f02e06b),
  // so the golden was regenerated for the combined simulation. The golden it replaced is kept byte for byte; the record names both files and the simulations they pin.
  const amendment2=record('GOLDEN_AMENDMENT_02.json');
  assert.equal(amendment2.amendment,'amendment-02');assert.equal(amendment2.beforeCommit,'65145c905209d47da6931aad11c0beeebe597291');
  assert.equal(amendment2.beforeFixtureSha256,'89baff905da88e8bc1f8fd9dcfc40686779d77dc22246ab2b1bafb236b0ad5a2');
  assert.equal(amendment2.beforeSourceSha256,'344a932f82a21bc4efe138968193a999f1d0efc17eceffea5ceb9a3d09a933a0');
  assert.equal(amendment2.beforeSourceSha256,replaced.sourceSha256);
  assert.equal(amendment2.afterFixtureSha256,sha('./fixtures/m01-t38-gameplay-baseline.json'),'the amendment names the T38 golden, the last of its chain');
  assert.equal(amendment2.afterSourceSha256,t38Golden.sourceSha256);assert.notEqual(t38Golden.sourceSha256,replaced.sourceSha256,'amendment 02 moved the simulation source');
});

test('the T47 golden of the combined tree chains to the staging, pins the simulation of the physics tree, cites its per-tick delta audit, and keeps amendments 01 to 03 as history',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  // The original partials golden (the candidate #80 alone, the predecessor of T47 amendment 01 and of T48) is kept as ...-before-amendment-02.json: an immutable record, pinned here.
  const original='./fixtures/m01-partials-gameplay-baseline-before-amendment-02.json',partialsOriginal=JSON.parse(readFileSync(new URL(original,import.meta.url),'utf8'));
  assert.equal(partialsOriginal.task,'M01-PARTIALS-COMPLETION-INTEGRATION-V1');assert.equal(partialsOriginal.predecessor,'bc8f6a21a57ccd926d4e0655481908d90d6b1978');
  assert.equal(partialsOriginal.sourceSha256,'00964436e079373887ca89c2128e8aa7f81a7f4ee9522c63b070f0e14f833f2a');
  assert.equal(partialsOriginal.historicalGoldenSha256,sha('./fixtures/m01-anim-gameplay-baseline.json'),'the historical golden file is byte-identical to the one the partials golden pinned');
  assert.equal(sha(original),'83a907ca00389f17723ffc97f1c42dca7d80f9a956d07ca7f39b8ae58fe87b79');
  // T47 on the staging: the per-tick golden below is the audited candidate; the chain is task -> predecessor -> source lock, as for every golden before it.
  assert.equal(golden.task,'M01-T47-CKM-LIVE-FIRE-V1');
  assert.equal(golden.predecessor,'8c6328c947e92041f237b5990142dd110aee8e71');
  assert.equal(golden.predecessorSourceSha256,t38Golden.sourceSha256,'the audited predecessor is the staging: exactly the simulation the T38 golden pins');
  assert.equal(golden.previousGolden.task,t38Golden.task);assert.equal(golden.previousGolden.file,'tests/fixtures/m01-t38-gameplay-baseline.json');
  assert.equal(golden.previousGolden.sha256,sha('./fixtures/m01-t38-gameplay-baseline.json'));
  assert.equal(golden.historicalGoldenSha256,t38Golden.historicalGoldenSha256);
  assert.deepEqual(golden.routes.map(r=>[r.seed,r.support]),t38Golden.routes.map(r=>[r.seed,r.support]),'the same routes are audited');
  // History since the NPC navigation (amendment 05): this golden pins the simulation of the physics tree (c7d8341, the same file as 98f094f), not the live one.
  assert.equal(golden.sourceSha256,'64523d0c78cddde49c0e87eac38790f55738743cd4bc6d562853c8d2a5f39482','the T47 golden pins the simulation of the physics tree');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),golden.sourceSha256,'the T47 golden is history: the NPC navigation moved the simulation');
  assert.equal(sha('./fixtures/m01-t47-gameplay-baseline.json'),live.previousGolden.sha256,'and it is kept byte for byte');
  assert.notEqual(golden.sourceSha256,t38Golden.sourceSha256,'the T38 golden is history: T47 moved the simulation');
  assert.equal(sha('../docs/verification/m01-runtime/ckm-fire-live-2026-10-16/PREDECESSOR_DELTA_AUDIT.json'),golden.auditSha256,'the delta audit that justifies this golden is the committed one');
  // Amendment 04 (the player's body physics, docs/verification/m01-runtime/player-collision-2026-10-18/README.md): the player collides with every visible solid, steps, slides and falls under
  // gravity, and the scripted pilot (tests/helpers/m01-route.js) walks where a player can walk. The golden and delta audit it replaces (f6913a0, amendment 03) are kept as byte copies, the
  // chain is pinned here, and tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 04 wrote the account (GOLDEN_AMENDMENT_04.json). Amendments 03, 02 and 01 live in the kept goldens.
  const kept4='./fixtures/m01-t47-gameplay-baseline-before-amendment-04.json',gold3=JSON.parse(readFileSync(new URL(kept4,import.meta.url),'utf8')),amendment4=golden.amendment04;
  assert.equal(amendment4.task,golden.task);assert.equal(amendment4.beforeCommit,'f6913a0dae3ae227ab0421c6b59f992e8685e9a6');assert.equal(golden.amendment03,undefined);
  assert.equal(sha(kept4),'92a69ba178bdf3e8071940135db873c34f6269b9c7c2427d4e8efd845c58b1ff');
  assert.equal(sha(kept4),amendment4.beforeFixtureSha256,'the T47 golden of amendment 03 is kept byte for byte');
  assert.equal(gold3.sourceSha256,amendment4.beforeSourceSha256);assert.notEqual(gold3.sourceSha256,golden.sourceSha256,'amendment 04 moved the source lock');
  assert.equal(gold3.task,golden.task);assert.equal(gold3.predecessor,golden.predecessor);assert.equal(gold3.predecessorSourceSha256,golden.predecessorSourceSha256);assert.equal(gold3.amendment04,undefined);
  assert.equal(gold3.previousGolden.sha256,golden.previousGolden.sha256,'amendment 04 keeps the chain to the staging golden');
  assert.equal(sha('../'+amendment4.beforeAudit),'6480330aff018fa53e89d2ad379ba6cff22e628bc522d2d38a89ab92e0922d4f');
  assert.equal(sha('../'+amendment4.beforeAudit),amendment4.beforeAuditSha256);assert.equal(gold3.auditSha256,amendment4.beforeAuditSha256,'the replaced golden cites the kept delta audit');
  const account4=JSON.parse(readFileSync(new URL('../'+amendment4.audit,import.meta.url)));
  assert.equal(account4.amendment,'amendment-04');assert.equal(account4.beforeCommit,amendment4.beforeCommit);assert.equal(account4.predecessor,golden.predecessor);
  assert.equal(account4.beforeFixtureSha256,amendment4.beforeFixtureSha256);assert.equal(account4.beforeSourceSha256,amendment4.beforeSourceSha256);assert.equal(account4.beforeAuditSha256,amendment4.beforeAuditSha256);
  assert.equal(account4.afterSourceSha256,golden.sourceSha256);assert.equal(account4.afterAuditSha256,golden.auditSha256);
  assert.equal(account4.afterFixtureSha256,sha('./fixtures/m01-t47-gameplay-baseline.json'),'the account describes this very golden');
  assert.deepEqual(account4.routes.map(r=>[r.seed,r.support]),golden.routes.map(r=>[r.seed,r.support]));
  account4.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,gold3.routes[i].ticks);assert.equal(r.newTicks,golden.routes[i].ticks);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(golden.routes[i].blocks[b],gold3.routes[i].blocks[b],'the blocks before the first difference are the replaced golden\'s');
    if(r.identicalBlocks<Math.min(gold3.routes[i].blocks.length,golden.routes[i].blocks.length))assert.notDeepEqual(golden.routes[i].blocks[r.identicalBlocks],gold3.routes[i].blocks[r.identicalBlocks],'and the next block differs');
    // The old pilot is held by the geometry it used to walk through, on the new simulation: its player parts from the old simulation's at a named tick, and its own walk() gives up.
    const held=r.oldPilotOnNewSimulation;
    assert.ok(held.firstTickPlayerDiffers&&held.firstTickPlayerDiffers.tick>0,'the old pilot touches the new geometry');assert.equal(held.oldPilotCompletesOnNewSimulation,false);assert.match(held.stopped,/^Movement blocked en route to /);
  });
  // Amendment 03 (D43, docs/verification/m01-runtime/ckm-fire-live-2026-10-16/T47_T38_INTERACTION.md): the T47 x T38 interaction fix moved the simulation again, on the same
  // staging predecessor. The golden and delta audit it replaces (bc4523f, amendment 02) are kept as byte copies, the chain is pinned here, and
  // tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 03 wrote the account (GOLDEN_AMENDMENT_03.json). Amendments 02 and 01 live in the kept goldens.
  const kept3='./fixtures/m01-t47-gameplay-baseline-before-amendment-03.json',prev=JSON.parse(readFileSync(new URL(kept3,import.meta.url),'utf8')),amendment3=gold3.amendment03;
  assert.equal(amendment3.task,gold3.task);assert.equal(amendment3.beforeCommit,'bc4523fc2e8161846828b77e7c1a49697f3372e8');assert.equal(gold3.amendment02,undefined);
  assert.equal(sha(kept3),'664df540ec94e2e51b6fcab20e766f9a5db1f2fd695b23e5075ebd786fced24f');
  assert.equal(sha(kept3),amendment3.beforeFixtureSha256,'the T47 golden of amendment 02 is kept byte for byte');
  assert.equal(prev.sourceSha256,amendment3.beforeSourceSha256);assert.notEqual(prev.sourceSha256,gold3.sourceSha256,'amendment 03 moved the source lock');
  assert.equal(prev.task,gold3.task);assert.equal(prev.predecessor,gold3.predecessor);assert.equal(prev.predecessorSourceSha256,gold3.predecessorSourceSha256);assert.equal(prev.amendment03,undefined);
  assert.equal(prev.previousGolden.sha256,gold3.previousGolden.sha256,'amendment 03 keeps the chain to the staging golden');
  assert.equal(sha('../'+amendment3.beforeAudit),'61a12ae5d14268e99ed26fb09e4b658d420b9eb2197a363159b929e99aa53d1a');
  assert.equal(sha('../'+amendment3.beforeAudit),amendment3.beforeAuditSha256);assert.equal(prev.auditSha256,amendment3.beforeAuditSha256,'the replaced golden cites the kept delta audit');
  const account3=JSON.parse(readFileSync(new URL('../'+amendment3.audit,import.meta.url)));
  assert.equal(account3.amendment,'amendment-03');assert.equal(account3.beforeCommit,amendment3.beforeCommit);assert.equal(account3.predecessor,gold3.predecessor);
  assert.equal(account3.beforeFixtureSha256,amendment3.beforeFixtureSha256);assert.equal(account3.beforeSourceSha256,amendment3.beforeSourceSha256);assert.equal(account3.beforeAuditSha256,amendment3.beforeAuditSha256);
  assert.equal(account3.afterSourceSha256,gold3.sourceSha256);assert.equal(account3.afterAuditSha256,gold3.auditSha256);
  assert.equal(account3.afterFixtureSha256,sha(kept4),'the account describes the golden that amendment 04 replaced');
  assert.deepEqual(account3.routes.map(r=>[r.seed,r.support]),gold3.routes.map(r=>[r.seed,r.support]));
  account3.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,prev.routes[i].ticks);assert.equal(r.newTicks,gold3.routes[i].ticks);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(gold3.routes[i].blocks[b],prev.routes[i].blocks[b],'the blocks before the first difference are the replaced golden\'s');
    if(r.identicalBlocks<Math.min(prev.routes[i].blocks.length,gold3.routes[i].blocks.length))assert.notDeepEqual(gold3.routes[i].blocks[r.identicalBlocks],prev.routes[i].blocks[r.identicalBlocks],'and the next block differs');
    assert.equal(r.cadenceFirstDifferenceAfter.difference.path,'$.state.timers.withdrawalCasualty','D43: the named cadence delta first changes only the withdrawal timer');
  });
  // D43 (b): the S2 visibility count of tests/m01-ckm-live-fire.test.js, re-measured with tools/m01-ckm-fire-arc.mjs on both sides of the amendment.
  assert.equal(account3.s2Visibility.before.strictClearEntries,270);assert.equal(account3.s2Visibility.after.strictClearEntries,271);
  // Amendment 02 (history): T47 joined the staging, so the golden moved from the candidate #80 + T47 to the staging + T47. The golden and the delta audit it replaced (the T47
  // head 602a5ee, amendment 01) are kept as byte copies; the account (GOLDEN_AMENDMENT_02.json) describes the golden that amendment 03 replaced (`prev`) and is re-checked
  // byte for byte by tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 02, with the simulation and pilot of bc4523f extracted from git.
  const kept2='./fixtures/m01-t47-gameplay-baseline-before-amendment-02.json',old=JSON.parse(readFileSync(new URL(kept2,import.meta.url),'utf8')),amendment2=prev.amendment02;
  assert.equal(amendment2.task,golden.task);assert.equal(amendment2.beforeCommit,'602a5ee89920283d360a1bdad6177922666b2936');
  assert.equal(sha(kept2),'0556f0e3704f79764acce35144bb847aeeb901edfc6ce1faf318169378dba663');
  assert.equal(sha(kept2),amendment2.beforeFixtureSha256,'the T47 golden of amendment 01 is kept byte for byte');
  assert.equal(old.sourceSha256,amendment2.beforeSourceSha256);assert.notEqual(old.sourceSha256,prev.sourceSha256,'amendment 02 moved the source lock');
  assert.equal(old.task,golden.task);assert.equal(old.predecessor,'813f163deceb551e0e4504b30958580cb67d3a76');assert.equal(old.amendment02,undefined);
  assert.equal(old.previousGolden.sha256,sha(original),'amendment 01 was built on the original partials golden');assert.equal(old.predecessorSourceSha256,partialsOriginal.sourceSha256);
  assert.equal(sha('../'+amendment2.beforeAudit),'2a7dd733454a4a3598dba3f400488a81b756ac2fb8bf2c2f1886f02a7e45fb29');
  assert.equal(sha('../'+amendment2.beforeAudit),amendment2.beforeAuditSha256);assert.equal(old.auditSha256,amendment2.beforeAuditSha256,'the replaced golden cites the kept delta audit');
  const account2=JSON.parse(readFileSync(new URL('../'+amendment2.audit,import.meta.url)));
  assert.equal(account2.amendment,'amendment-02');assert.equal(account2.beforeCommit,amendment2.beforeCommit);assert.equal(account2.predecessor,golden.predecessor);
  assert.equal(account2.beforeFixtureSha256,amendment2.beforeFixtureSha256);assert.equal(account2.beforeSourceSha256,amendment2.beforeSourceSha256);assert.equal(account2.beforeAuditSha256,amendment2.beforeAuditSha256);
  assert.equal(account2.afterSourceSha256,prev.sourceSha256);assert.equal(account2.afterAuditSha256,prev.auditSha256);
  assert.equal(account2.afterFixtureSha256,sha(kept3),'the account describes the golden that amendment 03 replaced');
  assert.deepEqual(account2.routes.map(r=>[r.seed,r.support]),prev.routes.map(r=>[r.seed,r.support]));
  account2.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,old.routes[i].ticks);assert.equal(r.newTicks,prev.routes[i].ticks);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(prev.routes[i].blocks[b],old.routes[i].blocks[b],'the blocks before the first difference are the replaced golden\'s');
    if(r.identicalBlocks<Math.min(old.routes[i].blocks.length,prev.routes[i].blocks.length))assert.notDeepEqual(prev.routes[i].blocks[r.identicalBlocks],old.routes[i].blocks[r.identicalBlocks],'and the next block differs');
  });
  // Amendment 01 (history, on the candidate #80): the critical review moved the T47 golden once (the first one was written from ab98199). The first golden and its delta audit are kept as
  // byte copies, the chain is pinned here, and the account was written by tools/verification/m01-t47-golden-amendment-audit.mjs at 602a5ee (GOLDEN_AMENDMENT_01.json). It lives in `old`.
  const amendment=old.amendment01,first=JSON.parse(readFileSync(new URL('./fixtures/m01-t47-gameplay-baseline-before-amendment-01.json',import.meta.url)));
  assert.equal(amendment.task,old.task);assert.equal(amendment.beforeCommit,'ab98199c7b50a6682a5deef2e461dc83b7737247');
  assert.equal(sha('./fixtures/m01-t47-gameplay-baseline-before-amendment-01.json'),amendment.beforeFixtureSha256,'the first T47 golden is kept byte for byte');
  assert.equal(first.sourceSha256,amendment.beforeSourceSha256);assert.notEqual(first.sourceSha256,old.sourceSha256,'the amendment moved the source lock');
  assert.equal(first.task,old.task);assert.equal(first.predecessor,old.predecessor);assert.equal(first.previousGolden.sha256,old.previousGolden.sha256,'the same chain to the immutable goldens');
  assert.equal(first.amendment01,undefined);
  assert.equal(sha('../'+amendment.beforeAudit),amendment.beforeAuditSha256);assert.equal(first.auditSha256,amendment.beforeAuditSha256,'the first golden cites the kept first delta audit');
  const account=JSON.parse(readFileSync(new URL('../'+amendment.audit,import.meta.url)));
  assert.equal(account.beforeFixtureSha256,amendment.beforeFixtureSha256);assert.equal(account.beforeSourceSha256,amendment.beforeSourceSha256);assert.equal(account.beforeAuditSha256,amendment.beforeAuditSha256);
  assert.equal(account.afterSourceSha256,old.sourceSha256);assert.equal(account.afterAuditSha256,old.auditSha256);assert.equal(account.afterFixtureSha256,sha(kept2),'the account describes the golden that amendment 02 replaced');
  assert.deepEqual(account.routes.map(r=>[r.seed,r.support]),old.routes.map(r=>[r.seed,r.support]));
  account.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,first.routes[i].ticks);assert.equal(r.newTicks,old.routes[i].ticks);assert.equal(r.complete,true);assert.equal(r.checkpoints.length,4);
    if(r.firstDivergenceTick===null)return assert.deepEqual(old.routes[i],first.routes[i],'a route that did not move is byte-identical');
    assert.equal(r.firstDifferenceWeapon,'mg34','the only thing the amendment changes is what a ckm round does to an MG34 gunner');assert.equal(r.firstMg34Effect.tick,r.firstDivergenceTick);
    assert.equal(r.identicalTicksBeforeIt,r.firstDivergenceTick-1);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(old.routes[i].blocks[b],first.routes[i].blocks[b],'the blocks before the first difference are the first golden\'s');
  });
});

test('the NPC navigation golden (amendment 05) chains to the T47 golden, pins the simulation of 66e47b2 and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  assert.equal(live.task,'M01-NPC-NAVIGATION-V1');assert.equal(live.predecessor,'c7d834126e9f94195379b331370b14ebb465224c');
  assert.equal(live.predecessorSourceSha256,golden.sourceSha256,'the audited predecessor is exactly the simulation the T47 golden pins');
  // The T47 golden is history: kept byte for byte where it was, pinned here.
  assert.equal(live.previousGolden.task,golden.task);assert.equal(live.previousGolden.file,'tests/fixtures/m01-t47-gameplay-baseline.json');
  assert.equal(live.previousGolden.sha256,sha('./fixtures/m01-t47-gameplay-baseline.json'));
  assert.equal(live.historicalGoldenSha256,golden.historicalGoldenSha256);
  assert.deepEqual(live.routes.map(r=>[r.seed,r.support]),golden.routes.map(r=>[r.seed,r.support]),'the same two routes are audited');
  // History since the P2 pacing (amendment 06): this golden pins the simulation of the integration tree 66e47b2 (phys + npc + skin + anim + audio), not the live one.
  assert.equal(live.sourceSha256,'e961cc5566a0acad80115dff5f2ad1be971b86a7604c6f62800b2fe13075c2b8','the NPC navigation golden pins the simulation of 66e47b2');
  assert.notEqual(sha('../src/game/m01-simulation.js'),live.sourceSha256,'the NPC navigation golden is history: the pacing moved the simulation');assert.notEqual(live.sourceSha256,golden.sourceSha256);
  assert.equal(sha('./fixtures/m01-npc-navigation-gameplay-baseline.json'),pacing.previousGolden.sha256,'and it is kept byte for byte');
  // The account written by the audit tool from real runs of the predecessor and the live tree, with nothing typed by hand.
  assert.equal(live.audit,'docs/verification/m01-runtime/npc-navigation-2026-10-18/GOLDEN_AMENDMENT_05.json');assert.equal(sha('../'+live.audit),live.auditSha256);
  const account=JSON.parse(readFileSync(new URL('../'+live.audit,import.meta.url)));
  assert.equal(account.task,live.task);assert.equal(account.amendment,'amendment-05');assert.equal(account.predecessor,live.predecessor);
  assert.equal(account.sourceSha256,live.sourceSha256);assert.equal(account.predecessorSourceSha256,golden.sourceSha256);
  assert.equal(account.previousGolden.sha256,live.previousGolden.sha256);
  assert.deepEqual(account.routes.map(r=>[r.seed,r.support]),live.routes.map(r=>[r.seed,r.support]));
  account.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,golden.routes[i].ticks);assert.equal(r.newTicks,live.routes[i].ticks);
    assert.match(r.firstDifference.path,new RegExp(account.navigationFields),'the first difference from the predecessor is a navigation field of one actor');
    assert.equal(r.identicalTicksBeforeIt,r.firstDifference.tick-1);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(live.routes[i].blocks[b],golden.routes[i].blocks[b],'the blocks before the first difference are the T47 golden\'s');
    if(r.identicalBlocks<Math.min(golden.routes[i].blocks.length,live.routes[i].blocks.length))assert.notDeepEqual(live.routes[i].blocks[r.identicalBlocks],golden.routes[i].blocks[r.identicalBlocks]);
    // Mission invariants against the predecessor on its own route: 12 objectives, four checkpoints, the same consumed events, the survivors and the final battle clock.
    assert.deepEqual(r.endState.identical,{objectives:true,checkpoints:true,consumedEventIds:true,survivors:true,finalBattleClock:true,complete:true});
    // The measured effect: nobody in a wall, a girder or a solid of the player layer, nobody inside another man, on the live route.
    assert.equal(r.measured.clipping.live.events,0);assert.equal(r.measured.stacked.live.pairs,0);
  });
  // The same measured effect on seeds 3 and 7, with and without the covering-fire pilot.
  assert.deepEqual(account.otherRoutes.map(r=>[r.seed,r.support]),[[3,false],[3,true],[7,false],[7,true]]);
  for(const r of account.otherRoutes){assert.equal(r.clipping.live.events,0);assert.equal(r.stacked.live.pairs,0);}
});

/** An integration amendment (06 pacing, 07 combat AI) written by tools/verification/m01-integration-golden-audit.mjs: chain, source lock, account and invariants. */
function integrationAmendment(g,{amendment,task,delta,previous,previousFile,predecessor,deltaFields}){
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  assert.equal(g.task,task);assert.equal(g.amendment,`amendment-${amendment}`);assert.equal(g.delta,delta);assert.equal(g.predecessor,predecessor);
  assert.equal(g.predecessorSourceSha256,previous.sourceSha256,'the audited predecessor is exactly the simulation the previous golden pins');
  assert.equal(g.previousGolden.task,previous.task);assert.equal(g.previousGolden.file,'tests/fixtures/'+previousFile);
  assert.equal(g.previousGolden.sha256,sha('./fixtures/'+previousFile),'the previous golden is kept byte for byte');
  assert.equal(g.historicalGoldenSha256,previous.historicalGoldenSha256);
  assert.deepEqual(g.routes.map(r=>[r.seed,r.support]),previous.routes.map(r=>[r.seed,r.support]),'the same two routes are audited');
  assert.notEqual(g.sourceSha256,previous.sourceSha256,'the simulation moved');
  assert.equal(sha('../'+g.audit),g.auditSha256,'the account is the committed one');
  const account=JSON.parse(readFileSync(new URL('../'+g.audit,import.meta.url)));
  assert.equal(account.task,task);assert.equal(account.amendment,g.amendment);assert.equal(account.delta,delta);assert.equal(account.predecessor,predecessor);
  assert.equal(account.sourceSha256,g.sourceSha256);assert.equal(account.previousGolden.sha256,g.previousGolden.sha256);assert.equal(account.deltaFields,deltaFields.source);
  account.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,previous.routes[i].ticks);assert.equal(r.newTicks,g.routes[i].ticks);
    assert.match(r.firstDifference.path,deltaFields,`the first difference from the predecessor is a path of the named delta ${delta}`);
    assert.equal(r.identicalTicksBeforeIt,r.firstDifference.tick-1);
    for(let b=0;b<r.identicalBlocks;b++)assert.deepEqual(g.routes[i].blocks[b],previous.routes[i].blocks[b],'the blocks before the first difference are the previous golden\'s');
    if(r.identicalBlocks<Math.min(previous.routes[i].blocks.length,g.routes[i].blocks.length))assert.notDeepEqual(g.routes[i].blocks[r.identicalBlocks],previous.routes[i].blocks[r.identicalBlocks]);
    // The plot is the predecessor's: 12 objectives done or expired as before, CP-A..D, 07:05 (the tool also proved consumed events, survivors and plot flags identical).
    assert.equal(Object.keys(r.endState.objectives).length,12);assert.equal(r.endState.checkpoints.length,4);assert.equal(r.endState.finalBattleClock,'07:05:00');
    assert.equal(r.endState.live.survivors,r.endState.predecessorOwnRoute.survivors);
    // Fixed battle-clock beats stay at their historical time (non-gated: within one tick at 30x).
    for(const e of r.battleClockEvents)if(e.fixed&&!e.jump)assert.ok(Math.abs(e.battle.live-e.battle.predecessor)<=1.5,`${e.id} ${e.at}`);
    assert.equal(r.measured.clipping,0);assert.equal(r.measured.stacked,0);
  });
  assert.deepEqual(account.otherRoutes.map(r=>[r.seed,r.support]),[[3,false],[3,true],[7,false],[7,true]]);
  for(const r of account.otherRoutes){assert.equal(r.clipping,0);assert.equal(r.stacked,0);}
  return account;
}
test('the pacing golden (amendment 06) chains to the NPC navigation golden, pins the simulation of 5d99df8 and cites its lockstep account',()=>{
  const account=integrationAmendment(pacing,{amendment:'06',task:'M01-P2-PACING-V1',delta:'pacing',previous:live,previousFile:'m01-npc-navigation-gameplay-baseline.json',
    predecessor:'66e47b239a9e0bc586375481fb1a554e46b845e2',deltaFields:/^\$\.state\.mission\.(text|status)$/});
  // History since the combat AI (amendment 07): this golden pins the simulation of 5d99df8 (the pacing on phys + npc + skin + anim + audio), not the live one.
  assert.equal(pacing.sourceSha256,'a220e2935efe4bdd54e855e33e095b69d00c5fd6651449965164e13da6782292','the pacing golden pins the simulation of 5d99df8');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),pacing.sourceSha256,'the pacing golden is history: the combat AI moved the simulation');
  // What the pacing is for: the player in position reaches 06:00 sooner in real time, on both golden routes.
  for(const r of account.routes)assert.ok(r.endState.live.to0600<r.endState.predecessorOwnRoute.to0600,`06:00 sooner (${r.endState.predecessorOwnRoute.to0600} -> ${r.endState.live.to0600} s)`);
});

test('the combat AI golden (amendment 07) chains to the pacing golden, pins the live simulation and cites its lockstep account',()=>{
  const account=integrationAmendment(combat,{amendment:'07',task:'M01-COMBAT-AI-V1',delta:'combat-ai',previous:pacing,previousFile:'m01-pacing-gameplay-baseline.json',
    predecessor:'5d99df87875b4e8712c6378fbd4d0b19b3395aa7',deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai$/});
  // History since the deck assault (amendment 08): this golden pins the simulation of 5d13d32 / 9cd2aca (combat AI slice 1), not the live one.
  assert.equal(combat.sourceSha256,'571042afd816fd3d66278d02d87af89057b21406cc338afb3b12b68fe99dcaae','the combat AI golden pins the simulation of 5d13d32');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),combat.sourceSha256,'the combat AI golden is history: the deck assault moved the simulation');
  // The first difference is the new saved record (actor.ai); the first BEHAVIOUR difference (actor.ai stripped from both frames) is a combat field of a man the AI drives.
  assert.equal(account.behaviourFields,'^\\$\\.(state|checkpoint)\\.actors\\.\\d+\\.(shot|cooldown|firedAt|rounds)$');
  for(const r of account.routes){assert.equal(r.firstDifference.missing,true,'actor.ai is new');assert.match(r.firstBehaviourDifference.path,new RegExp(account.behaviourFields));
    assert.match(r.firstBehaviourDifference.actor,new RegExp(account.behaviourActors));assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);}
});

test('the deck assault golden (amendment 08) chains to the combat AI golden, pins the simulation of ff65255 and cites its lockstep account',()=>{
  const account=integrationAmendment(deck,{amendment:'08',task:'M01-COMBAT-DECK-ASSAULT-V1',delta:'deck-assault',previous:combat,previousFile:'m01-combat-ai-gameplay-baseline.json',
    predecessor:'9cd2aca86c377e74ff6cc4f9444431a2ff1aa7ec',deltaFields:DECK_DELTA});
  // History since the navigator queue (amendment 09): this golden pins the simulation of ff65255 (the deck assault on the integration tree), not the live one.
  assert.equal(deck.sourceSha256,'7e85d7a7b42aef4f8d85a234a3ea76885e9dd00f0b7fdf65e137d5894bf6d416','the deck assault golden pins the simulation of ff65255');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),deck.sourceSha256,'the deck assault golden is history: the navigator queue moved the simulation source');
  assert.equal(deck.inputsSha256['src/game/m01-deck-assault.js'],createHash('sha256').update(readFileSync(new URL('../src/game/m01-deck-assault.js',import.meta.url))).digest('hex'),'and the deck module');
  // The first difference is the review fix's new key of a sighting (ai.seen.who, the rail-gate MG sees the player after train 963); with it stripped, the first BEHAVIOUR
  // difference is the 5 s MG pin of a working sapper (control route) or the new enemy_down_by_player event (support route, the pilot kills the gate MG gunner).
  assert.equal(account.behaviourFields,'^\\$\\.((state|checkpoint)\\.actors\\.\\d+\\.suppressedUntil|events\\.\\d+\\.type)$');
  for(const r of account.routes){assert.equal(r.firstDifference.missing,true,'ai.seen.who is new');assert.equal(r.firstDifference.actor,'de_east_1');
    assert.match(r.firstBehaviourDifference.path,new RegExp(account.behaviourFields));assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
    if(r.firstBehaviourDifference.actor!==null)assert.match(r.firstBehaviourDifference.actor,new RegExp(account.behaviourActors));else assert.equal(r.firstBehaviourDifference.live,'enemy_down_by_player');}
});

/** An amendment that moves the source lock and nothing else (09), written by tools/verification/m01-integration-golden-audit.mjs: chain, source lock, account, and that no tick moved. */
function identicalAmendment(g,{amendment,task,delta,previous,previousFile,predecessor}){
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  assert.equal(g.task,task);assert.equal(g.amendment,`amendment-${amendment}`);assert.equal(g.delta,delta);assert.equal(g.predecessor,predecessor);
  assert.equal(g.predecessorSourceSha256,previous.sourceSha256,'the audited predecessor is exactly the simulation the previous golden pins');
  assert.equal(g.previousGolden.task,previous.task);assert.equal(g.previousGolden.file,'tests/fixtures/'+previousFile);
  assert.equal(g.previousGolden.sha256,sha('./fixtures/'+previousFile),'the previous golden is kept byte for byte');
  assert.equal(g.historicalGoldenSha256,previous.historicalGoldenSha256);
  assert.deepEqual(g.routes,previous.routes,'the two routes, every block of every tick digest: the previous golden\'s, byte for byte');
  assert.notEqual(g.sourceSha256,previous.sourceSha256,'the simulation source moved');
  assert.equal(sha('../'+g.audit),g.auditSha256,'the account is the committed one');
  const account=JSON.parse(readFileSync(new URL('../'+g.audit,import.meta.url)));
  assert.equal(account.task,task);assert.equal(account.amendment,g.amendment);assert.equal(account.delta,delta);assert.equal(account.predecessor,predecessor);assert.equal(account.identical,true);
  assert.equal(account.sourceSha256,g.sourceSha256);assert.equal(account.previousGolden.sha256,g.previousGolden.sha256);assert.equal(account.deltaFields,undefined);
  account.routes.forEach((r,i)=>{
    assert.equal(r.oldTicks,previous.routes[i].ticks);assert.equal(r.newTicks,g.routes[i].ticks);assert.equal(r.oldTicks,r.newTicks);
    assert.equal(r.firstDifference,null,'not one tick of the route differs from the predecessor');assert.equal(r.identicalTicksBeforeIt,r.newTicks);
    assert.equal(r.identicalBlocks,g.routes[i].blocks.length,'every block');
    assert.equal(Object.keys(r.endState.objectives).length,12);assert.equal(r.endState.checkpoints.length,4);assert.equal(r.endState.finalBattleClock,'07:05:00');
    assert.deepEqual(r.endState.live,r.endState.predecessorOwnRoute,'the same end of the mission, tick for tick');
    assert.deepEqual(r.movedEvents,[],'no consumed event moved by a tick');
    assert.equal(r.measured.clipping,0);assert.equal(r.measured.stacked,0);
  });
  assert.deepEqual(account.otherRoutes.map(r=>[r.seed,r.support]),[[3,false],[3,true],[7,false],[7,true]]);
  for(const r of account.otherRoutes){assert.equal(r.clipping,0);assert.equal(r.stacked,0);assert.deepEqual(r.same,{objectives:true,checkpoints:true,consumedEventIds:true,finalBattleClock:true});assert.deepEqual(r.survivors.live,r.survivors.predecessor);assert.equal(r.real.live,r.real.predecessor);}
  return account;
}
test('the navigator queue golden (amendment 09) chains to the deck assault golden, moves the source lock only, pins the live simulation and cites its lockstep account',()=>{
  identicalAmendment(nav,{amendment:'09',task:'M01-NAV-QUEUE-V1',delta:'nav-queue',previous:deck,previousFile:'m01-deck-assault-gameplay-baseline.json',predecessor:'ff65255c7a40497a74ceb1ba4bd666e838266dc1'});
  assert.equal(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),nav.sourceSha256,'the golden pins the live simulation');
  assert.equal(nav.inputsSha256['src/game/m01-deck-assault.js'],createHash('sha256').update(readFileSync(new URL('../src/game/m01-deck-assault.js',import.meta.url))).digest('hex'),'and the deck module');
});

for(const expected of current.routes)test(`all gameplay bytes hashed each tick against the live golden (${current.task}, ${current.amendment}): seed ${expected.seed}, support ${expected.support}`,()=>{
  const trace=new GameplayDigest(),seen=new Set();let maxSpeed=0;
  const result=route(expected.seed,{support:expected.support,onStep:({sim,events})=>{
    trace.add(gameplayFrame(sim,events));
    for(const a of sim.actors){maxSpeed=Math.max(maxSpeed,a.motion.speed);for(const k of ['hitAt','diedAt','suppressedAt'])if(a[k]!==undefined&&a[k]!==-1e9)seen.add(k);}
  }});
  assert.deepEqual(trace.finish(),{ticks:expected.ticks,blocks:expected.blocks});
  assert.equal(result.sim.actors.length,97);assert.equal(result.sim.checkpointsReached.length,4);
  assert.ok(seen.has('hitAt')&&seen.has('diedAt')&&seen.has('suppressedAt'));
  assert.ok(maxSpeed<=8,'published locomotion speed is bounded; actual odometer remains measured');
  report.cases.push({label:'gameplay-baseline',seed:expected.seed,support:expected.support,ticks:trace.ticks,blocks:trace.blocks.length,maxSpeed});
  if(!expected.support)completed=result;
});

test('odometer equals accumulated effective XZ displacement, including collision slide; gait is real speed',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-24,z:a.z+8};
  let odometer=a.motion.odometer;
  for(let i=0;i<150;i++){
    const before={x:a.x,z:a.z},dt=i%3===0?.013:.05;s.tick(dt);
    const distance=Math.hypot(a.x-before.x,a.z-before.z);odometer+=distance;
    assert.equal(a.motion.speed,distance/dt);assert.equal(a.motion.odometer,odometer);
    assert.equal(a.motion.gait,distance===0?'idle':a.motion.speed<=2.2?'walk':a.motion.speed<=4.4?'run':'sprint');
    assert.ok(a.motion.gaitSince<=s.clock);
  }
  assert.ok(odometer>0);
});

test('blocked ADVANCE publishes idle and zero speed instead of commanded speed',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-10,z:a.z};s.world.move=()=>{};
  s.tick(.05);assert.equal(a.state,'ADVANCE');assert.equal(a.motion.speed,0);assert.equal(a.motion.odometer,0);assert.equal(a.motion.gait,'idle');
});

test('direct German spans movement, platoon sprint and crouch walk publish distinct effective gaits',()=>{
  const s=active(),span=s.actor('de_spans_6'),platoon=s.actor('pl_east_0'),crouched=s.actor('marek_zielinski');
  Object.assign(span,{active:true,cooldown:100});platoon.active=true;crouched.crouched=true;crouched.target={x:crouched.x-10,z:crouched.z};
  s.tick(.05);assert.equal(span.motion.gait,'walk');assert.ok(Math.abs(span.motion.speed-1.5)<1e-10);
  assert.equal(platoon.motion.gait,'sprint');assert.ok(Math.abs(platoon.motion.speed-5.5)<1e-10);
  assert.equal(crouched.motion.gait,'crouch_walk');assert.equal(crouched.posture,'crouch');assert.equal(crouched.postureSince,s.clock);
  const at=span.motion.gaitSince;s.tick(.05);assert.equal(span.motion.gaitSince,at);
  span.suppressedUntil=s.clock+5;s.tick(.05);assert.equal(span.motion.gait,'idle');assert.equal(span.motion.gaitSince,s.clock);
});

test('idle bodyYaw follows the shortest arc at 180 degrees/s and preserves combat facing',()=>{
  for(const [from,to] of [[0,Math.PI/2],[0,Math.PI],[0,-Math.PI/2],[3.1,-3.1],[-3.1,3.1]]){
    const a=active(),b=active(),left=a.actor('marek_zielinski'),right=b.actor('marek_zielinski');
    Object.assign(left,{bodyYaw:from,facing:to});Object.assign(right,{bodyYaw:from,facing:to});
    let expected=Math.abs(wrap(to-from))<=Math.PI*.05?to:wrap(from+Math.sign(wrap(to-from))*Math.PI*.05);if(Math.abs(wrap(to-expected))>Math.PI/3)expected=wrap(to-Math.sign(wrap(to-expected))*Math.PI/3);
    a.tick(.05);b.tick(.05);assert.equal(left.bodyYaw,expected);assert.equal(left.bodyYaw,right.bodyYaw);assert.equal(left.facing,to);
  }
});

test('moving bodyYaw turns at 360 degrees/s; hitboxes and eye geometry still use authoritative facing',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-12,z:a.z};s.tick(.05);
  assert.ok(a.motion.speed>0);assert.equal(a.facing,Math.PI);assert.equal(a.bodyYaw,Math.PI*2*.05);
  const plain=json(a);for(const k of PRESENTATION_FIELDS)delete plain[k];
  assert.deepEqual(actorHitboxes(a),actorHitboxes(plain));assert.deepEqual(eyePosition(a),eyePosition(plain));
});

test('pause/invalid dt does not touch timestamps, motion, yaw, RNG, checkpoint or events',()=>{
  const s=active();s.actor('marek_zielinski').target={x:-160,z:24};s.tick(.05);s.drainEvents();
  const before=s.snapshot();for(const dt of [0,-1,NaN,Infinity])s.tick(dt,{forward:1,fire:true,grenade:true,crouch:true,lookX:500});
  assert.deepEqual(s.snapshot(),before);assert.deepEqual(s.drainEvents(),[]);
});

test('real script wounds and demolition deaths have stable timestamps; unseen reserve losses have unknown history',()=>{
  const s=active();s.clock=10;s.consume('evt_m01_wounded_dragged');
  const patient=s.actor('generic_rifleman');assert.equal(patient.hitAt,10);assert.equal(patient.hitYaw,patient.facing);
  s.consume('evt_m01_east_platoon_withdraws');assert.equal(s.actor('pl_east_23').diedAt,-1e9);
  s.clock=11;s.consume('evt_m01_east_demolition');
  for(let i=0;i<4;i++){const a=s.actor('de_spans_'+i);assert.equal(a.diedAt,11);assert.equal(a.deathYaw,0);}
  s.clock=12;s.consume('evt_m01_east_demolition');assert.equal(s.actor('de_spans_0').diedAt,11);
});

test('actual grenade damage records only exposed living actors; repeat ticks do not replay impacts',()=>{
  const s=active(),shielded=s.actor('de_east_0'),exposed=s.actor('de_east_1'),inactive=s.actor('de_east_2');
  Object.assign(shielded,{x:707,y:0,z:0,active:true});Object.assign(exposed,{x:696,y:0,z:0,active:true,health:10});
  Object.assign(inactive,{x:700,y:0,z:2});s.world.obstacles.push({id:'test_solid_cover',min:{x:704,y:-1,z:-1},max:{x:705,y:3,z:1},material:'stone'});
  s.grenades.active=[{id:'test_grenade',x:700,y:0,z:0,vx:0,vy:0,vz:0,fuse:.01}];
  s.updateGrenades(.02,false);assert.equal(shielded.hitAt,-1e9);assert.equal(inactive.hitAt,-1e9);
  assert.equal(exposed.hitAt,s.clock);assert.equal(exposed.diedAt,s.clock);assert.equal(exposed.hitYaw,0);
  const at=exposed.hitAt;s.tick(.05);assert.equal(exposed.hitAt,at);assert.equal(exposed.diedAt,at);
});

test('player rifle hit/death and real near-miss suppression stamp only the existing combat outcomes',()=>{
  const s=active(),a=s.actor('de_east_14');s.clock=5;
  Object.assign(a,{x:696,y:0,z:0,active:true});Object.assign(s.player,{x:690,y:0,z:0,angle:0,pitch:Math.atan2(-.5,6),aiming:true});
  s.fire();assert.equal(a.health,0);assert.equal(a.state,'DOWN');assert.equal(a.hitAt,5);assert.equal(a.diedAt,5);assert.equal(a.hitYaw,Math.PI);
  s.clock=7;s.weapon.update(7000);s.fire();assert.equal(a.hitAt,5);assert.equal(a.diedAt,5);
  const near=active(),target=near.actor('de_east_14');near.clock=5;
  Object.assign(target,{x:696,y:0,z:2,active:true});Object.assign(near.player,{x:690,y:0,z:0,angle:0,pitch:0,aiming:true});
  near.fire();assert.equal(target.health,100);assert.equal(target.hitAt,-1e9);assert.equal(target.suppressedAt,5);assert.equal(target.suppressedUntil,10);
  near.tick(0);assert.equal(target.suppressedAt,5);
});

test('gait and bodyYaw resume identically at each real CP-A..D, including death recovery',()=>{
  for(const [id,cp] of Object.entries(completed.checkpoints)){
    const s=new M01Simulation();s.restoreSnapshot(cp);assert.deepEqual(s.snapshot(false),cp);
    record(s,{label:id,ticks:180,doubleAt:[1,40,100],dt:t=>t%17===0?0:t%3===0?.013:.05,
      input:t=>({forward:t<30?1:0,lookX:t%15===0?12:0,fire:t===10,reload:t===40}),
      fault:(t,a)=>{if(t===80){a.player.health=0;a.player.alive=false;}}});
  }
});

for(const phase of ['grab','drag','release'])test(`station ${phase} adapter retains exact data and motion after pause/double restore`,()=>{
  const {sim}=toStationEvacuation(driver(29),{phase}),patient=sim.actor('generic_rifleman'),medic=sim.actor('leon_dudek');
  assert.equal(patient.bodyYaw,patient.facing);assert.equal(patient.stationDrag.phase,phase);
  if(phase==='drag'){assert.equal(medic.motion.gait,'drag');assert.equal(patient.motion.gait,'drag');}
  record(sim,{label:'station-'+phase,ticks:120,doubleAt:[1,30,80],dt:t=>t%9===0?0:.05});
});

test('Bąk carry and CKM/MG34 specialized adapters do not lose identity, timestamps or presentation on reload',()=>{
  const s=new M01Simulation();s.restoreSnapshot(completed.checkpoints.cp_m01_d_retirada);
  for(let i=0;i<6000&&!s.actor('jozef_bak').carriedBy;i++)s.tick(.05);
  const bak=s.actor('jozef_bak');assert.equal(bak.carriedBy,'leon_dudek');assert.ok(['idle','carry'].includes(bak.motion.gait));assert.ok(bak.carry&&['pickup','carry','putdown'].includes(bak.carry.phase));assert.equal(bak.bodyYaw,bak.facing);
  record(s,{label:'bak-carry',ticks:180,doubleAt:[1,50,100]});
  const gun=new M01Simulation(29);gun.scene=null;Object.assign(gun.actor('de_east_0'),{active:true,cooldown:100});
  for(let i=0;i<40;i++)gun.tick(.05);
  const a=gun.actor('de_east_0');assert.equal(a.posture,'prone');assert.equal(a.bodyYaw,a.facing);
  gun.burst(a,{x:100,y:0,z:22},'area',{rounds:7});const raw=json(a);for(const k of PRESENTATION_FIELDS)delete raw[k];
  assert.deepEqual(mg34ProneGeometry(a,gun.clock),mg34ProneGeometry(raw,gun.clock));
  record(gun,{label:'mg34-prone-burst',ticks:100,doubleAt:[1,15,40],dt:()=>.025});
  assert.ok(s.actors.filter(a=>a.ckm).every(a=>a.id.startsWith('ckm_')));
});

test('legacy 86/89 schema-2 saves initialize without inventing events, mutating input or drawing RNG',()=>{
  for(const count of [86,89]){
    const legacy=gameplaySnapshot(completed.checkpoints.cp_m01_b_reorganizacao);legacy.actors=legacy.actors.filter(a=>!AUXILIARY_IDS.includes(a.id));
    if(count===86)legacy.actors=legacy.actors.filter(a=>!a.ckm);
    const before=json(legacy),s=new M01Simulation();s.restoreSnapshot(legacy);
    assert.deepEqual(legacy,before);assert.equal(s.rng.state,legacy.rng);assert.equal(s.actors.length,97);
    assert.deepEqual(s.actors.slice(0,86).map(a=>a.id),legacy.actors.slice(0,86).map(a=>a.id));
    for(const a of s.actors){assert.equal(a.motion.odometer,0);assert.equal(a.motion.speed,0);assert.equal(a.bodyYaw,a.facing);
      assert.equal(a.diedAt,-1e9);assert.equal(a.hitAt,-1e9);assert.equal(a.suppressedAt,-1e9);}
    record(s,{label:'legacy-'+count,ticks:160,doubleAt:[1,50,100],input:t=>({fire:t===2,reload:t===50})});
  }
});

test('optional partial migration preserves present fields byte for byte and defaults only missing fields',()=>{
  const raw=json(completed.checkpoints.cp_m01_b_reorganizacao),a=raw.actors[0];
  delete a.posture;delete a.postureSince;const oldMotion=json(a.motion),oldYaw=a.bodyYaw,s=new M01Simulation();
  s.restoreSnapshot(raw);assert.deepEqual(s.actors[0].motion,oldMotion);assert.equal(s.actors[0].bodyYaw,oldYaw);
  assert.equal(s.actors[0].postureSince,Math.max(0,s.clock-1));assert.equal(s.snapshot().schema,2);
});

test('corrupt presentation rejects atomically in current state and nested checkpoint',()=>{
  const source=completed.checkpoints.cp_m01_b_reorganizacao;
  const changes=[a=>a.motion=null,a=>a.motion=[],a=>a.motion.speed=-1,a=>a.motion.speed=null,a=>a.motion.odometer=-.1,
    a=>a.motion.gait='teleport',a=>a.motion.gaitSince=-1,a=>a.motion.gaitSince=source.clock+1,a=>delete a.motion.speed,
    a=>a.motion.unknown=1,a=>a.motion.health=0,a=>a.bodyYaw='0',a=>a.bodyYaw=null,a=>a.posture='flying',
    a=>a.postureSince=-1,a=>a.suppressedAt=source.clock+1,a=>a.hitAt=-1,a=>{delete a.hitAt;a.hitYaw=1;},
    a=>a.diedAt=source.clock,a=>{delete a.diedAt;a.deathYaw=1;},a=>a.hitAt=source.clock+1,a=>a.deathYaw=null];
  for(const nested of [false,true])for(const [i,change] of changes.entries()){
    const target=active(),bad=json(source);if(nested)bad.resumeCheckpoint=json(source);
    change((nested?bad.resumeCheckpoint:bad).actors[0]);const before=target.snapshot(),input=json(bad);
    assert.throws(()=>target.restoreSnapshot(bad),/Checkpoint M01 inválido/);
    assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,input);
    if(i===0)record(target,{label:'atomic-'+nested,ticks:40,input:t=>({forward:t<5?1:0})});
  }
  report.cases.push({label:'corruption',mutations:changes.length*2,atomic:true});
});
