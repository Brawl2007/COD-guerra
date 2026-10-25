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
// demolition waits for the deck to clear, enemy_down_by_player, the section's 120-round ammo box at the deck post, the 5 s MG34 pin and the review fixes). The combat AI golden above is history since then (it pins the simulation of 5d13d32 =
// 9cd2aca); the golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 08 after its lockstep audit, is this one.
import deck from './fixtures/m01-deck-assault-gameplay-baseline.json' with {type:'json'};
const DECK_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen\.who$/;   // the named delta of amendment 08, as measured (tools/verification/m01-integration-golden-audit.mjs)
const REARGUARD_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen$/,REARGUARD_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.x$/;   // amendment 11, as measured
const D0535_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen$/,D0535_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|ai\.target)$/;   // amendment 12, as measured
const CKMJAM_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.(ckm|ckmFire)(\.|$)/,CKMJAM_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.(suppressedUntil|crouched)$/;   // amendment 15, as measured
// M01-NAV-QUEUE-V1 (golden amendment 09, 2026-10-19, branch claude/busy-ritchie-3fkvk2-navq): at most one route() per tick, work buffers reused, the navigator's solid list built before the first
// plan, the neighbour queries on reused storage. It moves the SOURCE LOCK only: not one tick of either golden route differs from the deck assault golden (the tool's lockstep finds no difference,
// and the digests equal amendment 08's, block for block). The deck assault golden above is history since then (it pins the simulation of c7c82ee); the golden of the live simulation,
// regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 09, is this one.
import nav from './fixtures/m01-nav-queue-gameplay-baseline.json' with {type:'json'};
// M01-DIALOGUE-V1 (golden amendment 10, 2026-10-19, branch claude/busy-ritchie-3fkvk2-dlgwire): the reactive dialogue. 55 reviewed lines (dlg_m01_100-154; 114/115 unwired), the six orphan
// lines wired, a deterministic director (src/game/m01-barks.js) with cooldowns, repeats, rotation and substitution against the callouts, a priority queue with a two-voice limit in line(),
// the cover rotation and the guide as voices. It changes what is SAID and nothing that HAPPENS: with the dialogue state stripped from both frames not one tick of either golden route
// differs from the navigator queue golden above, which is history since then (it pins the simulation of 167dccc, byte for byte below); the golden of the live simulation, regenerated
// on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 10 after its lockstep audit against that exact predecessor, is this one.
import dialogue from './fixtures/m01-dialogue-gameplay-baseline.json' with {type:'json'};
// M01-REARGUARD-V1 (golden amendment 11, 2026-10-19, branch claude/busy-ritchie-3fkvk2-rear): combat slice 2b, the Polish rearguard of the deck assault (pl_east_0..2 hold the deck at
// x 165-175 while the gate holds the clock at 06:09:30 and fire real kb wz.29 rounds), with the bark director review fixes (B1: the peek lines read the AI's own sight, ai.seen, written
// for riflemen too; N1: reactive lines counted when shown; N3: 030 to Kowal). The dialogue golden above is history since then (it pins the simulation of c1a3ecf); the golden of
// the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 11 after its lockstep audit against that exact predecessor, is this one.
import rearguard from './fixtures/m01-rearguard-gameplay-baseline.json' with {type:'json'};
// M01-H9-D2-DIFFICULTY-0535-V1 (golden amendment 12, 2026-10-19, branch claude/busy-ritchie-3fkvk2-d2): the H9 D2 level wiring (recruta, the level of these routes, keeps every number
// and writes no new key) and the 05:35 fill (a dike rifleman who sees the player at the deck post from hold_access to the east demolition may take him as a target). The rearguard
// golden above is history since then (it pins the simulation of a59c129); the golden of the live simulation, regenerated on x86 by
// tools/verification/m01-integration-golden-audit.mjs --amendment 12 after its lockstep audit against that exact predecessor, is this one.
import difficulty0535 from './fixtures/m01-difficulty-0535-gameplay-baseline.json' with {type:'json'};
// M01-H9-D3-D4-DEATH-V1 (golden amendment 13, 2026-10-22, branch wp1-difficulty): H9 D3/D4 and the rest of D5. Every death has a cause and one player-down event, CP-B2 "Reparo" exists on soldado
// and veterano only, no lethal wound in a cutscene on those two levels (F4), lowerDifficulty re-levels a checkpoint to a lower level, veterano has no regeneration (owner decision) and the soldado /
// veterano rows are recalibrated. recruta, the level of these routes, keeps every number and writes no new key, so the amendment moves the source lock and the inputs and NOT ONE TICK of either route
// (identical, like amendment 09). The difficulty + 05:35 golden above is history since then (it pins the simulation of efb8eb00); the D3/D4 golden, regenerated on x86 by
// tools/verification/m01-integration-golden-audit.mjs --amendment 13 after its lockstep audit against that exact predecessor, is history since amendment 14 (it pins the simulation of 3eb21b38).
import difficultyD3D4 from './fixtures/m01-difficulty-d3-d4-gameplay-baseline.json' with {type:'json'};
// M01-SP08-ESCORT-COORDINATION-V1 (golden amendment 14, 2026-10-22, branch wp3-escort, owner order «Corrigir a escolta SP-08 e a coordenação dos soldados»): the corridor becomes a task
// (count, escort of Dudek with Bąk under real fire, Zieliński's head beat; B4 unchanged) and the section falls back by bounds with callouts (slice 3). The H9 D3/D4 golden above
// is history since then (it pins the simulation of 3eb21b38, candidate #80 + WP1); the golden regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs
// --amendment 14 after its lockstep audit against that exact predecessor is history since amendment 15 (it pins the simulation of c99a4326, candidate #80 + WP1 + WP3). (Written first as amendment 14 against amendment 12 at 4e2588fa, then re-based at integration onto the amendment 13 tree.)
import escort from './fixtures/m01-escort-coordination-gameplay-baseline.json' with {type:'json'};
const ESCORT_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,ESCORT_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.x$/;   // amendment 14, as measured
// M01-CKM-JAM-V1 (golden amendment 15, 2026-10-22, owner decision; written first as amendment 13 on the WP2 branch and re-based at integration onto the amendment 14 tree): the ckm wz.30 stops (CKM_STOPPAGES: before the 14th and the 45th burst, 3.8 and 4.6 s), the loader clears it, the voices say
// 114 and 115 on the events. The escort + coordination golden above is history since then (it pins the simulation of c99a4326); the golden of the live simulation, regenerated on x86 by
// tools/verification/m01-integration-golden-audit.mjs --amendment 15 after its lockstep audit against that exact predecessor, is this one.
import ckmJam from './fixtures/m01-ckm-jam-gameplay-baseline.json' with {type:'json'};
// M01-BOMB-EFFECTS-V1 (golden amendment 16, 2026-10-23, R1-a; owner playtest «os soldados junto dos bombardeamentos sobrevivem sem consequências; a guerra devia sentir-se desde as 04:34»): an aerial bomb kills, wounds
// and shakes the men beside it (src/game/m01-blast.js; the cast, the east platoon, the ckm crew and the station-yard scenery are only shaken), the player is never hurt by a bomb but is stunned near one, and the 04:34 raid
// goes on with eleven more impacts until 04:43:10 (mission.json raidTargets0434, timers.raidSchedule0434). The ckm stoppage golden above is history since then (it pins the simulation of e7f5f28); the golden of the live
// simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 16 after its lockstep audit against that exact predecessor, is history since amendment 17 (it pins the simulation of c66436d4).
// Regenerated the same day (R1-a follow-up, decisions of the Captain): six unnamed men of the west garrison (pl_west_0..5, displayOnly) join the roster, so that the bombs have men to kill and wound and the
// player sees them fall, and the three sappers of the cable camp run for the sandbags of the section when Nowicki warns them (grp_sappers.stage.shelter) instead of kneeling 1.6 m from the bomb. The
// first difference from the predecessor is therefore the first of the new actors, appended to the roster on the very first tick; the first BEHAVIOUR difference (with the garrison, the schedule and the stun
// records stripped from both frames) is the first step of Krawiec towards the sandbags at 04:33:30.
import bombs from './fixtures/m01-bomb-effects-gameplay-baseline.json' with {type:'json'};
const BOMBS_DELTA=/^\$\.(state|checkpoint)\.actors\.(9[7-9]|10[0-2])$/,BOMBS_BEHAVIOUR=/^\$\.(state|checkpoint)\.(player|actors\.\d+)\.x$/;   // amendment 16, as measured
// M01-SQUAD-COORDINATION-V1 (golden amendment 17, 2026-10-24, R2-a; owner complaint «aliados e inimigos mostram pouca inteligência; os polacos fazem pouco para contrariar o ataque; os aliados só coordenam na
// retirada»): from the first bomb of 04:34 to the east demolition the Polish section sees, calls, reacts and is ordered (src/game/m01-section.js, slice 4 on the machinery of slice 3): callouts of a new threat, a
// reaction of every man within hearing drawn from five streams of its own, orders of the sergeant (focus, hold, shift, return, deck, sector), a pair that walks between authored posts. The bomb effects golden above
// is history since then (it pins the simulation of c66436d4); the golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 17 after its lockstep audit
// against that exact predecessor, is history since amendment 18 (it pins the simulation of 33896528). It moves no German, no round and no byte of the player's route: the plot, the real-time clock of every event and
// the tick count are the predecessor's on both routes.
import squad from './fixtures/m01-squad-coordination-gameplay-baseline.json' with {type:'json'};
const SQUAD_DELTA=/^\$\.(state|checkpoint)\.timers\.section$/,SQUAD_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|crouched)$/;   // amendment 17, as measured
// M01-GERMAN-AI-V1 (golden amendment 18, 2026-10-24, R2-b; owner complaint «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): from the deck assault (06:05)
// the Polish section fires REAL rounds at the Germans of the deck (the model of the rearguard's rifles), the German assault closes in stages down to safeX (250, it was 450) while the Poles who hold the deck are under
// fire, falls back a line on a casualty, bounds on the two girders in turn, takes the Poles for targets, searches and throws a stick grenade at a Pole it cannot hit (src/game/m01-section.js, src/game/m01-deck-assault.js,
// mission.json deckAssault.tactics). The squad coordination golden above is history since then (it pins the simulation of 33896528); the golden of the live simulation, regenerated on x86 by
// tools/verification/m01-integration-golden-audit.mjs --amendment 18 after its lockstep audit against that exact predecessor, is history since amendment 19 (it pins the simulation of 3c8e576d). The plot, the
// 12 objectives, CP-A..D and the survivors are the predecessor's; the real-time clock of the events from the deck fight on moves (the fight is longer on the control route), which the account lists (movedEvents);
// the battle-clock anchors do not.
import german from './fixtures/m01-german-ai-gameplay-baseline.json' with {type:'json'};
const GERMAN_DELTA=/^\$\.(state|checkpoint)\.actors\.\d+\.playerSuppressedUntil$/,GERMAN_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|crouched)$/;   // amendment 18, as measured
// M01-SAPPERS-OPERATION-V1 (golden amendment 19, 2026-10-24, R3-a; owner complaint «os sapadores parecem homens a picar o chão repetidamente, sem trabalho visível»): the three sappers of the cable camp carry out a
// staged technical operation (src/game/m01-sappers.js, mission.json grp_sappers.operation): they follow the cable to the fault, wait for the box, examine, splice and test the line; the first test gives no passage
// (one failure, the same on every level and seed) and sends them along the cable to a second cut, where they examine, splice and test again; the leader reports, they wait for the order and look at the blasts.
// The repair keeps its 150 s of work and every historical anchor; a pin or a bomb stops the stage (the one gate there always was) and the sappers lie down or run to a cover within 8 m, then resume. The German AI
// golden above is history since then (it pins the simulation of 3c8e576d); the golden of the live simulation, regenerated on x86 by tools/verification/m01-integration-golden-audit.mjs --amendment 19 after its
// lockstep audit against that exact predecessor, is this one. No random draw and no new saved state but the optional validated actor flag coverRun; the plot, the 12 objectives, CP-A..D and the survivors are the
// predecessor's; what moves is the real-time clock of the events: the repair by a few seconds and, from the deck fight on, by the fight itself (the control route's is 57 s shorter, the support route's 21 s
// longer: the same chaotic divergence of the fight that amendment 18 recorded), which the account lists (movedEvents); the battle-clock anchors do not move.
import sappers from './fixtures/m01-sappers-gameplay-baseline.json' with {type:'json'};
const SAPPERS_DELTA=/^\$\.state\.mission\.(text|status)$/,SAPPERS_BEHAVIOUR=/^\$\.(state|checkpoint)\.actors\.\d+\.x$/;   // amendment 19, as measured
const current=sappers;   // the golden of the live simulation
/** 2026-10-24 (golden amendment 18, R2-b): the deck module (the closing lines and the tactics) and the level table (the words of the death by a stick grenade) moved with it, so the older goldens that record them are
 *  history for those two files: they are still recorded, and no longer the live bytes. Every other module a history test names is still compared with the live file. */
const MOVED_BY_18=new Set(['src/game/m01-deck-assault.js','src/game/m01-difficulty.js']);
function unchangedSince(recorded,files,live,label='and'){
  for(const f of files){
    if(MOVED_BY_18.has(f)){assert.ok(recorded[f],`${f} is recorded`);assert.notEqual(recorded[f],live('../'+f),`${f} moved with amendment 18`);}
    else assert.equal(recorded[f],live('../'+f),`${label} ${f}`);
  }
}
const liveSha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
import {AUXILIARY_IDS} from '../src/game/m01-yard-life.js';
import {M01Simulation,validateM01Snapshot,GARRISON_IDS} from '../src/game/m01-simulation.js';
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

test('schema 2 initializes all 103 IDs; diagnostics are detached, small presentation records',()=>{
  const s=new M01Simulation(),ids=s.actors.map(a=>a.id),diag=s.animationPresentation;
  // 2026-10-23 (R1-a follow-up, golden amendment 16): 97 -> 103. The six unnamed men of the west garrison (pl_west_0..5, displayOnly) join the roster, so that the bombs of 04:34 have
  // somebody to kill and wound (the cast is only ever shaken). The roster was 97 only by the count of the groups before them; nothing else about the 97 changed.
  assert.equal(s.snapshot().schema,2);assert.equal(ids.length,103);assert.deepEqual(ids.slice(-GARRISON_IDS.length),[...GARRISON_IDS]);assert.deepEqual(diag.actors.map(a=>a.id),ids);
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

test('the deck assault golden (amendment 08) chains to the combat AI golden, pins the simulation of c7c82ee and cites its lockstep account',()=>{
  const account=integrationAmendment(deck,{amendment:'08',task:'M01-COMBAT-DECK-ASSAULT-V1',delta:'deck-assault',previous:combat,previousFile:'m01-combat-ai-gameplay-baseline.json',
    predecessor:'9cd2aca86c377e74ff6cc4f9444431a2ff1aa7ec',deltaFields:DECK_DELTA});
  // History since the navigator queue (amendment 09): this golden pins the simulation of c7c82ee (the deck assault with its review fixes, slice-2 branch), not the live one.
  assert.equal(deck.sourceSha256,'d3725c9991094d919cee93e725dfbf290973409c4ef504e656d0854ffae43e23','the deck assault golden pins the simulation of c7c82ee');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),deck.sourceSha256,'the deck assault golden is history: the navigator queue moved the simulation source');
  unchangedSince(deck.inputsSha256,['src/game/m01-deck-assault.js'],liveSha,'and the deck module');   // (history since amendment 18: the deck module moved)
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
test('the navigator queue golden (amendment 09) chains to the deck assault golden, moves the source lock only, pins the simulation of 167dccc and cites its lockstep account',()=>{
  identicalAmendment(nav,{amendment:'09',task:'M01-NAV-QUEUE-V1',delta:'nav-queue',previous:deck,previousFile:'m01-deck-assault-gameplay-baseline.json',predecessor:'c7c82ee6a2c44318b06bd674dbe94dc1ff43aa1d'});
  // History since the reactive dialogue (amendment 10): this golden pins the simulation of 167dccc (the navigator queue merged on the slice-2 tree), not the live one.
  assert.equal(nav.sourceSha256,'4a44a6338d9911e8bf0679e91936ea819a9a96f5e29ee3baa36d970165c3e374','the navigator queue golden pins the simulation of 167dccc');
  assert.notEqual(createHash('sha256').update(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url))).digest('hex'),nav.sourceSha256,'the navigator queue golden is history: the dialogue moved the simulation source');
  unchangedSince(nav.inputsSha256,['src/game/m01-deck-assault.js'],liveSha,'and the deck module');   // (history since amendment 18: the deck module moved)
});

test('the reactive dialogue golden (amendment 10) chains to the navigator queue golden, pins the live simulation, the director and the mission data, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(dialogue,{amendment:'10',task:'M01-DIALOGUE-V1',delta:'dialogue',previous:nav,previousFile:'m01-nav-queue-gameplay-baseline.json',
    predecessor:'167dccc9194b6062947d02e0a0cc30176cc57461',deltaFields:/^\$\.(state|checkpoint)\.(dialogueConsumed|dialogueQueue|subtitle|timers\.(barks|guide|guideDist))(\.|$)/});
  // History since the rearguard (amendment 11): this golden pins the simulation of c1a3ecf (the dialogue on the navigator-queue tree), not the live one.
  assert.equal(dialogue.sourceSha256,'c9118414abd2be8cbfe3db449756e522d25420ebb5b82efdb7eeac650eb43119','the dialogue golden pins the simulation of c1a3ecf');
  assert.notEqual(sha('../src/game/m01-simulation.js'),dialogue.sourceSha256,'the dialogue golden is history: the rearguard moved the simulation');
  unchangedSince(dialogue.inputsSha256,['src/game/m01-deck-assault.js'],sha,'and the deck module');   // (history since amendment 18: the deck module moved)
  // What the amendment is: the dialogue only. With the dialogue state (queue, subtitle, consumed tokens, timers.barks / guide / guideDist) and the two HUD messages that became voices stripped
  // from both frames, the live simulation and the predecessor are byte identical on EVERY tick of both routes; the first raw difference is the dialogue itself.
  assert.equal(account.noBehaviourDifference,true);
  assert.deepEqual(account.stripped,['dialogueConsumed','dialogueQueue','subtitle','timers.barks','timers.guide','timers.guideDist','events: message «Zieliński chama-o da trincheira…»','events: message «Zieliński: …mude de cobertura»']);
  for(const r of account.routes){
    assert.equal(r.firstDifference.battleClock,'04:33:10','evt_m01_planes_heard: the orphan line 067 is now said');assert.match(r.firstDifference.path,/\.dialogueConsumed\.\d+$/);
    assert.equal(r.firstBehaviourDifference,null,'not one tick differs once the dialogue is stripped');
    assert.deepEqual(r.movedEvents,[],'no consumed event moved by a tick');
  }
});

test('the rearguard golden (amendment 11) chains to the dialogue golden, pins the live simulation, the rearguard, the director and the mission data, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(rearguard,{amendment:'11',task:'M01-REARGUARD-V1',delta:'rearguard',previous:dialogue,previousFile:'m01-dialogue-gameplay-baseline.json',
    predecessor:'c1a3ecf304f1e8a30283d251d2ff8ec174e0ba93',deltaFields:REARGUARD_DELTA});
  // History since amendment 12 (H9 D2 + the 05:35 fill): this golden pins the simulation of a59c129, not the live one.
  assert.equal(rearguard.sourceSha256,'fc818782531d6c643330ad0bf2d6de608211f6c27e6b74798ad4ee3298da0dbf','the rearguard golden pins the simulation of a59c129');
  assert.notEqual(sha('../src/game/m01-simulation.js'),rearguard.sourceSha256,'the rearguard golden is history: amendment 12 moved the simulation');
  // 2026-10-22 (amendments 13 to 15): the rearguard and deck modules did not move.
  // 2026-10-24 (golden amendment 18, R2-b): the deck module moved; the rearguard module did not.
  unchangedSince(rearguard.inputsSha256,['src/game/m01-rearguard.js','src/game/m01-deck-assault.js'],sha,'and (unchanged)');
  // History since amendments 13, 14 and 15 (2026-10-22): the director (the squadMove trigger, the ckm stoppage triggers) and the mission data (the CP-B2 entry, the squad lines, the rules of 114 / 115) moved with them.
  // They were still the bytes of this golden when amendment 12 was written (its golden records the same hashes), so the chain is exact: nothing moved between amendments 11 and 12.
  for(const f of ['src/game/m01-barks.js','missions/m01-tczew/mission.json']){
    assert.ok(rearguard.inputsSha256[f],`${f} is recorded`);assert.equal(rearguard.inputsSha256[f],difficulty0535.inputsSha256[f],`${f} did not move with amendment 12`);
    assert.notEqual(rearguard.inputsSha256[f],sha('../'+f),`${f} moved since`);
  }
  // The first difference is B1's new sighting record of a gate rifleman (ai.seen, 04:45:16, de_east_2 sees the player); with the new state stripped (the dialogue state, ai.seen,
  // the rearguard's records), the first BEHAVIOUR difference is the rearguard itself: pl_east_0 leaves the platoon file for his post the tick the gate holds the clock (06:09:30).
  assert.equal(account.behaviourFields,REARGUARD_BEHAVIOUR.source);
  for(const r of account.routes){
    assert.equal(r.firstDifference.actor,'de_east_2');assert.match(r.firstDifference.path,/\.ai\.seen$/);
    assert.match(r.firstBehaviourDifference.path,REARGUARD_BEHAVIOUR);assert.match(r.firstBehaviourDifference.actor,/^pl_east_[0-2]$/);
    assert.equal(r.firstBehaviourDifference.battleClock,'06:09:30');assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
  }
});

test('the difficulty + 05:35 golden (amendment 12) chains to the rearguard golden, pins the simulation of efb8eb00 (history since amendment 13), the level table and the mission data of that tree, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(difficulty0535,{amendment:'12',task:'M01-H9-D2-DIFFICULTY-0535-V1',delta:'difficulty+0535',previous:rearguard,previousFile:'m01-rearguard-gameplay-baseline.json',
    predecessor:'a59c129609ea4aef182ede0a172f745967d0cb30',deltaFields:D0535_DELTA});
  // History since amendment 13 (H9 D3/D4, 2026-10-22): this golden pins the simulation of efb8eb00 (the candidate head 4e2588fa plus a CI-only commit), not the live one. The level table (m01-difficulty.js)
  // and the mission data moved with it, and amendments 14 and 15 moved the director, so they are no longer compared with the live files; the two modules none of them touched still are.
  assert.equal(difficulty0535.sourceSha256,'d7f6afec8494c47cc7afd42d9150c19bcadc1d81e55fb383a8e2faff8b43e5da','the difficulty + 05:35 golden pins the simulation of efb8eb00');
  assert.notEqual(sha('../src/game/m01-simulation.js'),difficulty0535.sourceSha256,'the difficulty + 05:35 golden is history: amendment 13 moved the simulation');
  unchangedSince(difficulty0535.inputsSha256,['src/game/m01-rearguard.js','src/game/m01-deck-assault.js'],sha);   // (2026-10-24, amendment 18: the deck module moved)
  for(const f of ['src/game/m01-barks.js','missions/m01-tczew/mission.json']){assert.ok(difficulty0535.inputsSha256[f],`${f} is recorded`);assert.notEqual(difficulty0535.inputsSha256[f],sha('../'+f),`${f} moved since`);}
  // The D2 wiring alone moves nothing on these (recruta) routes: the first difference is the 05:35 fill, a dike rifleman's sighting of the player at the deck post after 05:30
  // (hold_access); with the sightings and the dialogue state stripped, the first BEHAVIOUR difference is a dike rifleman turning to (taking) the player.
  assert.equal(account.behaviourFields,D0535_BEHAVIOUR.source);
  for(const r of account.routes){
    assert.match(r.firstDifference.actor,/^de_east_(1[4-9]|[2-9]\d)$/);assert.match(r.firstDifference.path,/\.ai\.seen$/);assert.ok(r.firstDifference.battleClock>='05:30:00');
    assert.match(r.firstBehaviourDifference.path,D0535_BEHAVIOUR);assert.match(r.firstBehaviourDifference.actor,/^de_east_(1[4-9]|[2-9]\d)$/);
    assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
  }
});

test('the H9 D3/D4 golden (amendment 13) chains to the difficulty + 05:35 golden, moves the source lock and the inputs only, pins the simulation of 3eb21b38 (history since amendment 14), the level table and the mission data of that tree, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  identicalAmendment(difficultyD3D4,{amendment:'13',task:'M01-H9-D3-D4-DEATH-V1',delta:'death+cp-b2+fair-death',previous:difficulty0535,previousFile:'m01-difficulty-0535-gameplay-baseline.json',
    predecessor:'efb8eb00d37a3370018e6193c4c0b158094f0241'});
  // History since amendment 14 (2026-10-22, SP-08 escort + squad coordination): this golden pins the simulation of 3eb21b38, not the live one. The director, the audio events and the mission data moved since, so they are
  // no longer compared with the live files; the level table and the rearguard and deck modules amendments 14 and 15 did not touch still are.
  assert.equal(difficultyD3D4.sourceSha256,'b52dff98f0466dfd1081332a7052e59ae3c04ab53ee94b982325780afd78215d','the D3/D4 golden pins the simulation of 3eb21b38');
  assert.notEqual(sha('../src/game/m01-simulation.js'),difficultyD3D4.sourceSha256,'the D3/D4 golden is history: amendment 14 moved the simulation');
  unchangedSince(difficultyD3D4.inputsSha256,['src/game/m01-difficulty.js','src/game/m01-rearguard.js','src/game/m01-deck-assault.js'],sha);   // (2026-10-24, amendment 18: the level table and the deck module moved)
  // What moved and what did not: the level table and the mission data (the CP-B2 entry) are new bytes; the two recruta routes are the previous golden's, every block of every tick (identicalAmendment).
  for(const f of ['src/game/m01-difficulty.js','missions/m01-tczew/mission.json'])assert.notEqual(difficultyD3D4.inputsSha256[f],difficulty0535.inputsSha256[f],`${f} moved`);
});

test('the escort + coordination golden (amendment 14) chains to the H9 D3/D4 golden, pins the simulation of c99a4326 (history since amendment 15), the corridor and squad modules and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(escort,{amendment:'14',task:'M01-SP08-ESCORT-COORDINATION-V1',delta:'escort+coordination',previous:difficultyD3D4,previousFile:'m01-difficulty-d3-d4-gameplay-baseline.json',
    predecessor:'3eb21b387205140e3e6ea9ef13cf9f8f296a6c87',deltaFields:ESCORT_DELTA});
  // History since amendment 15 (the ckm stoppages, 2026-10-22): this golden pins the simulation of c99a4326, not the live one. The director, the audio events and the mission data moved with the
  // stoppages, so they are no longer compared with the live files (they still have to be recorded); the corridor, squad, level table, rearguard and deck modules did not move.
  assert.equal(escort.sourceSha256,'12b40d86616fdd75459c758ed397d704814fae011577e8f656c684b862413fc2','the escort golden pins the simulation of c99a4326');
  assert.notEqual(sha('../src/game/m01-simulation.js'),escort.sourceSha256,'the escort golden is history: amendment 15 moved the simulation');
  // 2026-10-24 (R2-a, golden amendment 17): the squad module moved too, by one clause (suppression brings a bound forward but never the scripted first order, line 155: the pair now holds the road deck
  // until the demolition, in view of the deck assault, so it can be pinned on that very tick). The golden still records the module it was written against; it is only no longer the live file.
  // (2026-10-24, amendment 18: the level table and the deck module moved too.)
  unchangedSince(escort.inputsSha256,['src/game/m01-corridor.js','src/game/m01-difficulty.js','src/game/m01-rearguard.js','src/game/m01-deck-assault.js'],sha);
  for(const f of ['src/game/m01-barks.js','src/game/m01-squad.js','missions/m01-tczew/mission.json']){assert.ok(escort.inputsSha256[f],`${f} is recorded`);assert.notEqual(escort.inputsSha256[f],sha('../'+f),`${f} moved with amendment 15 or 17`);}
  // Nothing moves before the east demolition: the first difference is the section at 06:10:00, Kowal holding his slot at the squad post where he used to set off for the single
  // retreat point (x -170, z 22). It is behaviour at once (no new record precedes it in the frame), so the first behaviour difference is the same path.
  assert.equal(account.behaviourFields,ESCORT_BEHAVIOUR.source);
  for(const r of account.routes){
    assert.equal(r.firstDifference.battleClock,'06:10:00');assert.equal(r.firstDifference.actor,'szymon_kowal');assert.match(r.firstDifference.path,ESCORT_DELTA);
    assert.match(r.firstBehaviourDifference.path,ESCORT_BEHAVIOUR);assert.match(r.firstBehaviourDifference.actor,/^(szymon_kowal|staszek_pawlak|east_platoon_voice)$/);
    assert.equal(r.endState.objectives.hold_corridor,'done');assert.equal(r.endState.live.survivors,r.endState.predecessorOwnRoute.survivors);
  }
});

test('the ckm stoppage golden (amendment 15) chains to the escort + coordination golden, pins the simulation of e7f5f28 (history since amendment 16), the director and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(ckmJam,{amendment:'15',task:'M01-CKM-JAM-V1',delta:'ckm-jam',previous:escort,previousFile:'m01-escort-coordination-gameplay-baseline.json',
    predecessor:'c99a4326ea6f83e03c5bf5ea1df01a299ad055db',deltaFields:CKMJAM_DELTA});
  // History since amendment 16 (the bombs of the 04:34 raid, 2026-10-23): this golden pins the simulation of e7f5f28 (candidate #80 before the bomb effects), not the live one. The audio events and the mission data
  // moved with the bombs, so they are no longer compared with the live files (they still have to be recorded); the level table, the rearguard and the deck module did not move. 2026-10-23 (R1-a follow-up,
  // the west garrison): the director moved too, by one clause (the westWait rule, «Esperamos o Bąk», ignores displayOnly men like readiness(west_demolition) does).
  assert.equal(ckmJam.sourceSha256,'1bba0f944ff597b63bd8bbec07b8a99a31537a0b919cfb728a85a4a850b9f73f','the ckm stoppage golden pins the simulation of e7f5f28');
  assert.notEqual(sha('../src/game/m01-simulation.js'),ckmJam.sourceSha256,'the ckm stoppage golden is history: amendment 16 moved the simulation');
  unchangedSince(ckmJam.inputsSha256,['src/game/m01-difficulty.js','src/game/m01-rearguard.js','src/game/m01-deck-assault.js'],sha);   // (2026-10-24, amendment 18: the level table and the deck module moved)
  for(const f of ['src/game/m01-barks.js','src/game/m01-audio-events.js','missions/m01-tczew/mission.json']){assert.ok(ckmJam.inputsSha256[f],`${f} is recorded`);assert.notEqual(ckmJam.inputsSha256[f],sha('../'+f),`${f} moved with amendment 16`);}
  // The first difference is the stoppage itself: on the tick the gun would have fired its 14th burst (04:58:43 on the control route, 04:59:03 with the covering-fire pilot) the predecessor's gunner
  // is in fire_burst and the live one in `stoppage`; until then the two simulations are byte identical, tick for tick (13 blocks of 512 ticks on both routes). With the gun's own records, the
  // dialogue state and the gun's events stripped from both frames, the first BEHAVIOUR difference is the rounds that are not there: a rifleman of the gate group the burst would have pinned is not.
  assert.equal(account.behaviourFields,CKMJAM_BEHAVIOUR.source);
  for(const r of account.routes){
    assert.equal(r.firstDifference.actor,'ckm_gunner');assert.match(r.firstDifference.path,/\.ckm\.phase$/);
    assert.equal(r.firstDifference.predecessor,'fire_burst');assert.equal(r.firstDifference.live,'stoppage');
    assert.ok(r.firstDifference.battleClock>='04:46:00'&&r.firstDifference.battleClock<'06:09:30','inside the window of fire');
    assert.ok(r.identicalBlocks>=Math.floor((r.firstDifference.tick-1)/512)&&r.identicalBlocks<=Math.ceil(r.firstDifference.tick/512),'the blocks before the first difference are the previous golden\'s');
    assert.match(r.firstBehaviourDifference.path,CKMJAM_BEHAVIOUR);assert.match(r.firstBehaviourDifference.actor,/^de_east_(\d|1[0-3])$/);
    assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
  }
});

test('the bomb effects golden (amendment 16) chains to the ckm stoppage golden, pins the simulation of c66436d4 (history since amendment 17), the blast module and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(bombs,{amendment:'16',task:'M01-BOMB-EFFECTS-V1',delta:'bomb-effects',previous:ckmJam,previousFile:'m01-ckm-jam-gameplay-baseline.json',
    predecessor:'e7f5f2879b1bdbddad7c94ae12fad97627758758',deltaFields:BOMBS_DELTA});
  // History since amendment 17 (the Polish section of the main combat, 2026-10-24): this golden pins the simulation of c66436d4 (candidate #80 + R1-a), not the live one. The director, the audio events and the
  // mission data moved with the section, so they are no longer compared with the live files (they still have to be recorded); the blast module, the garrison, the level table, the rearguard, the deck module
  // and the yard did not move.
  assert.equal(bombs.sourceSha256,'945a2bf53ca089d3e3ecb420ec8bb0e455b934dc3eecf60ae7630560c91ca7b9','the bomb effects golden pins the simulation of c66436d4');
  assert.notEqual(sha('../src/game/m01-simulation.js'),bombs.sourceSha256,'the bomb effects golden is history: amendment 17 moved the simulation');
  // (2026-10-24, amendment 18: the level table and the deck module moved too.)
  unchangedSince(bombs.inputsSha256,['src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-difficulty.js','src/game/m01-rearguard.js','src/game/m01-deck-assault.js','src/game/m01-yard-life.js'],sha);
  for(const f of ['src/game/m01-barks.js','src/game/m01-audio-events.js','missions/m01-tczew/mission.json']){assert.ok(bombs.inputsSha256[f],`${f} is recorded`);assert.notEqual(bombs.inputsSha256[f],sha('../'+f),`${f} moved with amendment 17`);}
  assert.equal(bombs.inputsSha256['src/game/m01-section.js'],undefined,'the section module did not exist');
  assert.equal(ckmJam.inputsSha256['src/game/m01-blast.js'],undefined,'the predecessor had no blast module');assert.equal(ckmJam.inputsSha256['src/game/m01-garrison.js'],undefined,'nor a garrison');
  // The two simulations differ from the very first tick: the six men of the west garrison are appended to the roster (actors 97..102, which the predecessor does not have); with those men and the other new
  // records stripped from both frames (the schedule, the player's concussion, the craters' concussion, the events' concussion and effects) the first BEHAVIOUR difference is Krawiec's first step towards the sandbags
  // at 04:33:30 (tick 756): the sappers run for cover when Nowicki warns them, 30 s of battle time before the planes. Nothing else moved before it.
  assert.equal(account.behaviourFields,BOMBS_BEHAVIOUR.source);
  for(const r of account.routes){
    assert.equal(r.firstDifference.tick,1);assert.equal(r.firstDifference.actor,null);assert.match(r.firstDifference.path,BOMBS_DELTA);assert.equal(r.firstDifference.predecessor,null);
    assert.equal(r.firstDifference.live.id,'pl_west_0');assert.equal(r.firstDifference.live.group,'grp_west_garrison');assert.equal(r.firstDifference.live.displayOnly,true);
    assert.equal(r.identicalBlocks,0,'the roster differs on the first tick');
    assert.match(r.firstBehaviourDifference.path,BOMBS_BEHAVIOUR);assert.equal(r.firstBehaviourDifference.actor,'pawel_krawiec');assert.equal(r.firstBehaviourDifference.battleClock,'04:33:30');
    assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);assert.ok(r.firstBehaviourDifference.live<r.firstBehaviourDifference.predecessor,'the first step west, towards the sandbags of the section (x from -41.4 downwards)');
    // the plot is the predecessor's: the tool proved the 12 objective states, CP-A..D, consumed events, plot flags and survivors identical; nobody of the cast is touched (the audit of the routes: BOMB_EFFECTS_ROUTES.json)
    assert.equal(r.endState.objectives.cover_repair,'done');assert.equal(r.endState.live.survivors,r.endState.predecessorOwnRoute.survivors);
  }
});

test('the squad coordination golden (amendment 17) chains to the bomb effects golden, pins the simulation of 33896528 (history since amendment 18), the section, the squad, the director and the mission data, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(squad,{amendment:'17',task:'M01-SQUAD-COORDINATION-V1',delta:'squad-coordination',previous:bombs,previousFile:'m01-bomb-effects-gameplay-baseline.json',
    predecessor:'c66436d444e94fa4a9f083c303a58185c4177d85',deltaFields:SQUAD_DELTA});
  // History since amendment 18 (the German AI and the Polish fire of the deck, 2026-10-24): this golden pins the simulation of 33896528 (candidate #80 + R1-a + R2-a), not the live one. The section, the deck
  // module, the audio events, the level table and the mission data moved with R2-b, so they are no longer compared with the live files (they still have to be recorded); the squad module, the director, the blast
  // module, the garrison, the rearguard and the yard did not move.
  assert.equal(squad.sourceSha256,'5236c1730015940ae7cd9168fb3e6eda76f6c5d720bf58ff7b0618ebb62c3217','the squad coordination golden pins the simulation of 33896528');
  assert.notEqual(sha('../src/game/m01-simulation.js'),squad.sourceSha256,'the squad coordination golden is history: amendment 18 moved the simulation');
  for(const f of ['src/game/m01-squad.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-rearguard.js','src/game/m01-yard-life.js'])
    assert.equal(squad.inputsSha256[f],sha('../'+f),`and ${f}`);
  // (2026-10-24, amendment 19, R3-a: the director gained the `sapperStage` condition, so it moved too; amendment 18 left it as amendment 17 had it.)
  for(const f of ['src/game/m01-section.js','src/game/m01-deck-assault.js','src/game/m01-audio-events.js','src/game/m01-difficulty.js','missions/m01-tczew/mission.json','src/game/m01-barks.js']){assert.ok(squad.inputsSha256[f],`${f} is recorded`);assert.notEqual(squad.inputsSha256[f],sha('../'+f),`${f} moved with amendment 18 or 19`);}
  assert.equal(bombs.inputsSha256['src/game/m01-section.js'],undefined,'the predecessor had no section module');
  for(const f of ['src/game/m01-barks.js','src/game/m01-audio-events.js','missions/m01-tczew/mission.json'])assert.notEqual(squad.inputsSha256[f],bombs.inputsSha256[f],`${f} moved`);
  // The two simulations are byte identical, tick for tick, until 04:34:00 (tick 1355: the first bomb of the raid); the first difference is the section's own saved record, created by the first tick of the window
  // (missing in the predecessor). With that record, the director's, the dialogue state, the section's events (calls, orders, the display-grade rifle shots of its men) and the HUD fallback of the cover order
  // stripped from both frames, the first BEHAVIOUR difference is the sergeant himself, tick 1481 (04:34:22): Zieliński turns to the man who calls the first man down by the raid (actors.0.facing).
  // The Germans, the player and the plot are the predecessor's on both routes: the same ticks, the same real-time clock for every event, the same survivors and the same German rounds per minute.
  assert.equal(account.behaviourFields,SQUAD_BEHAVIOUR.source);assert.equal(account.behaviourActors,'^(marek_zielinski|szymon_kowal|staszek_pawlak|east_platoon_voice|jozef_bak)$');
  for(const r of account.routes){
    assert.equal(r.firstDifference.tick,1356);assert.equal(r.firstDifference.battleClock,'04:34:00');assert.equal(r.firstDifference.actor,null);assert.equal(r.firstDifference.path,'$.state.timers.section');
    assert.equal(r.firstDifference.predecessor,null);assert.equal(r.firstDifference.missing,true);assert.equal(r.firstDifference.live.v,1);assert.deepEqual(Object.keys(r.firstDifference.live.rng),['marek_zielinski','szymon_kowal','staszek_pawlak','east_platoon_voice','jozef_bak']);
    assert.equal(r.identicalBlocks,2,'two blocks of 512 ticks are the predecessor\'s');
    assert.match(r.firstBehaviourDifference.path,SQUAD_BEHAVIOUR);assert.equal(r.firstBehaviourDifference.actor,'marek_zielinski');assert.equal(r.firstBehaviourDifference.battleClock,'04:34:22');assert.equal(r.firstBehaviourDifference.tick,1481);
    assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
    assert.equal(r.newTicks,r.oldTicks,'the same number of ticks');assert.deepEqual(r.endState.live,r.endState.predecessorOwnRoute,'the same end of the mission, to the real second');
    assert.deepEqual(r.movedEvents,[],'no event moves, in real or in battle time');assert.equal(r.measured.germanRoundsPerRealMin.live,r.measured.germanRoundsPerRealMin.predecessor);
    assert.equal(r.endState.objectives.hold_corridor,'done');
  }
  for(const r of account.otherRoutes)assert.equal(r.real.live,r.real.predecessor,`seed ${r.seed} support ${r.support}: the same real time`);
});

test('the German AI golden (amendment 18) chains to the squad coordination golden, pins the simulation of 3c8e576d (history since amendment 19), the section, the deck assault and the mission data, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(german,{amendment:'18',task:'M01-GERMAN-AI-V1',delta:'german-ai',previous:squad,previousFile:'m01-squad-coordination-gameplay-baseline.json',
    predecessor:'3389652895ac52d0bbf191301b4bce55e8e3b673',deltaFields:GERMAN_DELTA});
  // History since amendment 19 (the sappers' operation, 2026-10-24): this golden pins the simulation of 3c8e576d (candidate #80 + R1-a + R2-a + R2-b), not the live one. The director and the mission data moved with
  // the sappers, so they are no longer compared with the live files (they still have to be recorded); the section, the squad module, the audio events, the blast module, the garrison, the level table, the
  // rearguard, the deck module and the yard did not move.
  assert.equal(german.sourceSha256,'14e14803b7cf7e369a143258d74820d35c246ee1774765519b507af05b678d95','the German AI golden pins the simulation of 3c8e576d');
  assert.notEqual(sha('../src/game/m01-simulation.js'),german.sourceSha256,'the German AI golden is history: amendment 19 moved the simulation');
  for(const f of ['src/game/m01-section.js','src/game/m01-squad.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-difficulty.js','src/game/m01-rearguard.js',
    'src/game/m01-deck-assault.js','src/game/m01-yard-life.js'])
    assert.equal(german.inputsSha256[f],sha('../'+f),`and ${f}`);
  for(const f of ['src/game/m01-barks.js','missions/m01-tczew/mission.json']){assert.ok(german.inputsSha256[f],`${f} is recorded`);assert.notEqual(german.inputsSha256[f],sha('../'+f),`${f} moved with amendment 19`);}
  assert.deepEqual(account.changedGameplayInputsSincePredecessor,['src/game/m01-simulation.js','missions/m01-tczew/mission.json','src/game/m01-deck-assault.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js','src/game/m01-section.js'],
    'what moved since 33896528: the simulation, the mission data, the deck module, the level table\'s death words, the audio events and the section; the squad module, the director and the rearguard did not');
  for(const f of ['src/game/m01-section.js','src/game/m01-deck-assault.js','src/game/m01-audio-events.js','src/game/m01-difficulty.js','missions/m01-tczew/mission.json'])assert.notEqual(german.inputsSha256[f],squad.inputsSha256[f],`${f} moved`);
  for(const f of ['src/game/m01-squad.js','src/game/m01-barks.js','src/game/m01-rearguard.js'])assert.equal(german.inputsSha256[f],squad.inputsSha256[f],`${f} did not move`);
  // The two simulations are byte identical, tick for tick, until the deck assault (06:05:00 of the battle clock: tick 12123 on the control route, 11707 with the covering-fire pilot); the first difference is the key
  // every man of the deck gets at the entry (playerSuppressedUntil, 0; missing in the predecessor). With the new records stripped from both frames (that key, the lines and the grenade count of the deck record, the
  // deck men's sight record, the grenade timer, the section's record, the director's, the dialogue state and the section's and the assault's own events) the first BEHAVIOUR difference is a man of the pair: the platoon
  // voice turns to fire his first real round (control, tick 12372, 06:06:40, facing) or kneels under the first pin of the assault (support, tick 11758, 06:05:20, crouched).
  assert.equal(account.behaviourFields,GERMAN_BEHAVIOUR.source);assert.equal(account.behaviourActors,'^(marek_zielinski|szymon_kowal|staszek_pawlak|east_platoon_voice|jozef_bak)$');
  const expected={false:{first:12123,behaviour:12372,at:'06:06:40',field:'facing',blocks:23,old:23402,now:25126,shift:91.25},true:{first:11707,behaviour:11758,at:'06:05:20',field:'crouched',blocks:22,old:23354,now:21886,shift:-69.15}};
  for(const r of account.routes){
    const e=expected[r.support];
    assert.equal(r.firstDifference.tick,e.first);assert.equal(r.firstDifference.battleClock,'06:05:00','the deck assault is where the two simulations part');assert.equal(r.firstDifference.actor,'de_spans_0');
    assert.equal(r.firstDifference.path,'$.state.actors.52.playerSuppressedUntil');assert.equal(r.firstDifference.predecessor,null);assert.equal(r.firstDifference.missing,true);assert.equal(r.firstDifference.live,0);
    assert.equal(r.identicalBlocks,e.blocks);
    assert.match(r.firstBehaviourDifference.path,GERMAN_BEHAVIOUR);assert.equal(r.firstBehaviourDifference.actor,'east_platoon_voice');assert.equal(r.firstBehaviourDifference.tick,e.behaviour);
    assert.equal(r.firstBehaviourDifference.battleClock,e.at);assert.ok(r.firstBehaviourDifference.path.endsWith('.'+e.field));assert.ok(r.firstBehaviourDifference.tick>r.firstDifference.tick);
    assert.equal(r.oldTicks,e.old);assert.equal(r.newTicks,e.now);
    // The plot and the anchors are the predecessor's: the 12 objectives, CP-A..D, the consumed events, the survivors (12 control, 18 support) and the final battle clock; the battle-clock time of every event is the
    // same (the east demolition is at 22200 = 06:10:00 on both sides). What moves is the REAL time of the events from the deck fight on, because the fight is longer when nobody suppresses the Germans (control +91.25 s)
    // and shorter when the pilot does (support -69.15 s); the account lists them.
    assert.equal(r.endState.live.survivors,r.endState.predecessorOwnRoute.survivors);assert.equal(r.endState.live.to0600,r.endState.predecessorOwnRoute.to0600,'nothing moves before 06:00');
    assert.deepEqual(r.movedEvents.map(m=>m.event),['evt_m01_debrief','evt_m01_dudek_retrieves_bak','evt_m01_east_demolition','evt_m01_kozliny_attack_distant','evt_m01_roll_call','evt_m01_west_demolition']);
    for(const m of r.movedEvents)assert.equal(m.battle.live,m.battle.predecessor,`${m.event}: the same battle-clock time`);
    const blast=r.movedEvents.find(m=>m.event==='evt_m01_east_demolition');assert.equal(blast.battle.live,22200);assert.ok(Math.abs((blast.real.live-blast.real.predecessor)-e.shift)<.01,`the east demolition moves ${blast.real.live-blast.real.predecessor} s in real time`);
    assert.equal(r.endState.objectives.hold_corridor,'done');assert.equal(r.measured.clipping,0);assert.equal(r.measured.stacked,0);
    assert.ok(Math.abs(r.measured.germanRoundsPerRealMin.live-r.measured.germanRoundsPerRealMin.predecessor)<3,'German rounds per real minute: the same order');
  }
  for(const r of account.otherRoutes){assert.equal(r.survivors.live,r.survivors.predecessor);assert.deepEqual(Object.values(r.same),[true,true,true,true],`seed ${r.seed} support ${r.support}: the plot of the predecessor`);}
});

test('the sappers golden (amendment 19) chains to the German AI golden, pins the live simulation, the sapper module, the director and the mission data, and cites its lockstep account',()=>{
  const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
  const account=integrationAmendment(sappers,{amendment:'19',task:'M01-SAPPERS-OPERATION-V1',delta:'sapper-operation',previous:german,previousFile:'m01-german-ai-gameplay-baseline.json',
    predecessor:'3c8e576dfdfefa7a2158a50dffb74fed4695385f',deltaFields:SAPPERS_DELTA});
  assert.equal(sha('../src/game/m01-simulation.js'),sappers.sourceSha256,'the golden pins the live simulation');
  for(const [f,h] of Object.entries(sappers.inputsSha256))if(h!==null)assert.equal(h,sha('../'+f),`and ${f}`);
  assert.ok(sappers.inputsSha256['src/game/m01-sappers.js'],'the sapper module is a recorded input');assert.equal(german.inputsSha256['src/game/m01-sappers.js'],undefined,'the predecessor had no sapper module');
  assert.deepEqual(account.changedGameplayInputsSincePredecessor,['src/game/m01-simulation.js','src/game/m01-pacing.js','missions/m01-tczew/mission.json','src/game/m01-animation-presentation.js','src/game/m01-barks.js','src/game/m01-sappers.js'],
    'what moved since 3c8e576d: the simulation, the status line of the pacing, the mission data (the operation and the stage lines), the posture of a sapper on the way to cover, the director (the sapperStage condition) and the new module; the section, the squad module, the deck module, the rearguard, the level table and the audio events did not');
  for(const f of ['src/game/m01-section.js','src/game/m01-squad.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-difficulty.js','src/game/m01-rearguard.js','src/game/m01-deck-assault.js','src/game/m01-yard-life.js'])
    assert.equal(sappers.inputsSha256[f],german.inputsSha256[f],`${f} did not move with amendment 19`);
  for(const f of ['src/game/m01-barks.js','missions/m01-tczew/mission.json'])assert.notEqual(sappers.inputsSha256[f],german.inputsSha256[f],`${f} moved`);
  // The two simulations are byte identical, tick for tick, until 04:36:54 (tick 2348), when the player has called the sappers: the first difference is the status line of the objective panel («Os sapadores procuram o
  // corte», where the predecessor showed none). With that HUD text stripped from both frames the first BEHAVIOUR difference is the leader himself, the next tick (2349): Krawiec follows the cable at the searching pace of
  // the operation (a step of 0.09 m) where the predecessor walked on at 0.18 m per tick (actors.1.x -42.352 against -42.442). Everything before the call (the camp, the bombs of 04:34, the shelter) is the predecessor's.
  assert.equal(account.behaviourFields,SAPPERS_BEHAVIOUR.source);assert.equal(account.behaviourActors,'^(pawel_krawiec|sapper_2|sapper_3)$');
  // What follows is timing, never the plot. The real-time clock of every event moves (the repair by a few seconds, then, from the deck fight on, by the fight itself: the control route's fight is 57 s shorter, the
  // support route's 21 s longer: the account lists them); the battle-clock anchors do not, but the one the repair itself sets (repair_complete). The 12 objectives, CP-A..D and the survivors are the predecessor's (the tool proved it).
  const expected={false:{old:25126,now:23890,real:1194.5,early:.45,east:-56.65,debrief:-61.8,repair:{real:.65,battle:5.85}},true:{old:21886,now:22409,real:1120.45,early:-4.65,east:20.8,debrief:26.15,repair:{real:-7,battle:-63}}};
  for(const r of account.routes){
    const e=expected[r.support];
    assert.equal(r.firstDifference.tick,2348);assert.equal(r.firstDifference.battleClock,'04:36:54','the call to the sappers is where the two simulations part');assert.equal(r.firstDifference.actor,null);
    assert.equal(r.firstDifference.path,'$.state.mission.status');assert.equal(r.firstDifference.predecessor,'');assert.equal(r.firstDifference.live,'Os sapadores procuram o corte');assert.equal(r.firstDifference.missing,false);
    assert.equal(r.identicalBlocks,4,'four blocks of 512 ticks are the predecessor\'s');assert.equal(r.identicalTicksBeforeIt,2347);
    assert.match(r.firstBehaviourDifference.path,SAPPERS_BEHAVIOUR);assert.equal(r.firstBehaviourDifference.actor,'pawel_krawiec');assert.equal(r.firstBehaviourDifference.tick,2349);assert.equal(r.firstBehaviourDifference.battleClock,'04:36:54');
    assert.equal(r.firstBehaviourDifference.path,'$.state.actors.1.x');assert.ok(Math.abs(Math.abs(r.firstBehaviourDifference.predecessor-r.firstBehaviourDifference.live)-.09)<.001,'one step of 0.09 m of difference: 1.8 m/s against 3.6 m/s');
    assert.equal(r.oldTicks,e.old);assert.equal(r.newTicks,e.now);assert.equal(r.endState.live.real,e.real);
    assert.equal(r.endState.live.survivors,r.endState.predecessorOwnRoute.survivors);assert.ok(Math.abs(r.endState.live.to0600-r.endState.predecessorOwnRoute.to0600)<5,'06:00 is reached within seconds of where it was');
    const ev=Object.fromEntries(r.movedEvents.map(m=>[m.event,m])),shift=id=>+(ev[id].real.live-ev[id].real.predecessor).toFixed(2);
    assert.deepEqual(r.movedEvents.map(m=>m.event),['evt_m01_bak_wounded','evt_m01_bombing_0530','evt_m01_debrief','evt_m01_dudek_retrieves_bak','evt_m01_east_demolition','evt_m01_east_platoon_withdraws','evt_m01_germans_on_east_spans','evt_m01_kozliny_attack_distant','evt_m01_north_contact_distant','evt_m01_order_demolish','evt_m01_repair_complete','evt_m01_roll_call','evt_m01_runner_pressure_report','evt_m01_west_demolition']);
    for(const m of r.movedEvents)if(m.event!=='evt_m01_repair_complete')assert.equal(m.battle.live,m.battle.predecessor,`${m.event}: the same battle-clock time`);
    assert.equal(ev.evt_m01_east_demolition.battle.live,22200,'the east demolition is at 06:10:00 on both sides');
    assert.ok(Math.abs(shift('evt_m01_order_demolish')-e.early)<.01&&Math.abs(shift('evt_m01_germans_on_east_spans')-e.early)<.01,'the order and the deck assault move by what the repair moved');
    assert.ok(Math.abs(shift('evt_m01_east_demolition')-e.east)<.01&&Math.abs(shift('evt_m01_debrief')-e.debrief)<.01,'the deck fight moves the demolitions in real time');
    assert.ok(Math.abs(shift('evt_m01_repair_complete')-e.repair.real)<.01&&Math.abs(ev.evt_m01_repair_complete.battle.live-ev.evt_m01_repair_complete.battle.predecessor-e.repair.battle)<.01,'the repair completes within seconds of where it did');
    assert.ok(ev.evt_m01_repair_complete.battle.live<19800,'the repair is complete before the order of 05:30 (19800 s of the battle clock)');assert.equal(ev.evt_m01_order_demolish.battle.live,19800,'the order is at 05:30:00 on both sides');
    assert.equal(r.endState.objectives.cover_repair,'done');assert.equal(r.endState.objectives.hold_corridor,'done');assert.equal(r.measured.clipping,0);assert.equal(r.measured.stacked,0);
    assert.ok(Math.abs(r.measured.germanRoundsPerRealMin.live-r.measured.germanRoundsPerRealMin.predecessor)<6,'German rounds per real minute: the same order');
  }
  for(const r of account.otherRoutes){assert.equal(r.survivors.live,r.survivors.predecessor);assert.deepEqual(Object.values(r.same),[true,true,true,true],`seed ${r.seed} support ${r.support}: the plot of the predecessor`);
    assert.ok(Math.abs(r.repairComplete.live-r.repairComplete.predecessor)<10,`seed ${r.seed} support ${r.support}: the repair is complete within seconds of where it was (${r.repairComplete.predecessor} -> ${r.repairComplete.live})`);}
});

for(const expected of current.routes)test(`all gameplay bytes hashed each tick against the live golden (${current.task}, ${current.amendment}): seed ${expected.seed}, support ${expected.support}`,()=>{
  const trace=new GameplayDigest(),seen=new Set();let maxSpeed=0;
  const result=route(expected.seed,{support:expected.support,onStep:({sim,events})=>{
    trace.add(gameplayFrame(sim,events));
    for(const a of sim.actors){maxSpeed=Math.max(maxSpeed,a.motion.speed);for(const k of ['hitAt','diedAt','suppressedAt'])if(a[k]!==undefined&&a[k]!==-1e9)seen.add(k);}
  }});
  assert.deepEqual(trace.finish(),{ticks:expected.ticks,blocks:expected.blocks});
  assert.equal(result.sim.actors.length,103);assert.equal(result.sim.checkpointsReached.length,4);   // 2026-10-23 (R1-a, amendment 16): 97 + the six men of the west garrison
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
    // 2026-10-23 (R1-a, amendment 16): a true legacy save has neither the auxiliaries nor the west garrison; both come back whole on restore (97 -> 103 with the six men of the garrison).
    const legacy=gameplaySnapshot(completed.checkpoints.cp_m01_b_reorganizacao);legacy.actors=legacy.actors.filter(a=>!AUXILIARY_IDS.includes(a.id)&&!GARRISON_IDS.includes(a.id));
    if(count===86)legacy.actors=legacy.actors.filter(a=>!a.ckm);
    const before=json(legacy),s=new M01Simulation();s.restoreSnapshot(legacy);
    assert.deepEqual(legacy,before);assert.equal(s.rng.state,legacy.rng);assert.equal(s.actors.length,103);
    assert.deepEqual(s.actors.slice(0,86).map(a=>a.id),legacy.actors.slice(0,86).map(a=>a.id));
    // 2026-10-23 (R1-a, golden amendment 16): CP-B now falls after the first bombs, which shake the men beside them (suppressedUntil > 0 in the save). initializePresentation derives the unknown
    // suppressedAt of such a man from his saved suppressedUntil (a documented rule: 1.5 s before it, at most the clock); everyone else, and every diedAt and hitAt, is the unknown history -1e9 as before.
    for(const a of s.actors){assert.equal(a.motion.odometer,0);assert.equal(a.motion.speed,0);assert.equal(a.bodyYaw,a.facing);
      assert.equal(a.diedAt,-1e9);assert.equal(a.hitAt,-1e9);assert.equal(a.suppressedAt,a.suppressedUntil>0?Math.max(0,Math.min(legacy.clock,a.suppressedUntil-1.5)):-1e9,a.id);}
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
