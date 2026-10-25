// M01 integration golden AMENDMENTS 06 (P2 pacing), 07 (combat AI slice 1), 08 (combat slice 2), 09 (navigator queue), 10 (reactive dialogue), 11 (rearguard + director review), 12 (H9 D2 difficulty wiring + the 05:35 fill) 13 (H9 D3/D4: death with a cause, CP-B2, the fair-death rules, no veterano regen; recruta unchanged) 14 (SP-08 escort + slice-3 squad coordination, re-based on the amendment 13 tree), 15 (ckm wz.30 stoppages, re-based on the amendment 14 tree) 16 (R1-a: the bombs of the 04:34 raid hurt the men beside them and stun the player; the raid goes on to 04:44), 17 (R2-a: the Polish section sees, calls, reacts and is ordered in the main combat), 18 (R2-b: the Polish section fires real rounds at the deck, the German deck assault closes in stages, throws stick grenades and searches) and 19 (R3-a: the sappers carry out a staged technical operation along the cable) of the combined tree. Not invoked by npm test.
//
// Same method as amendment 05 (tools/verification/m01-npc-navigation-golden-audit.mjs), with the two checks of the reverted branch tools that only an integration can make:
// each branch (claude/busy-ritchie-3fkvk2-pacing, -combat) wrote its own golden against f6913a0 and the Captain reverted it (5316718, a580b09) so the golden is moved once, here,
// on the integration tree, against the EXACT predecessor commit of the merge:
//   06  predecessor 66e47b2 (phys + npc + skin + anim + audio; its simulation is the one the NPC navigation golden, amendment 05, pins), named delta `pacing`;
//   07  predecessor = the amendment 06 commit (its simulation is the one the pacing golden pins), named delta `combat-ai`.
// The previous golden is KEPT byte for byte where it is and pinned by sha256; the new golden is a new fixture. Proof, per golden route (the two routes of the T47 golden):
//   0. PILOT. The predecessor's simulation, extracted from git with its own data, driven by the live test pilot (tests/helpers/m01-route.js), reproduces the previous golden.
//   1. LOCKSTEP. The predecessor runs on the SAME controls as the live simulation; every tick the two gameplay frames are compared. The first difference must be a path of the
//      named delta (CFG.deltaFields, measured and then pinned, never a catch-all) and until then the two are byte identical.
//   2. WHAT FOLLOWS is timing, never the plot: each side then runs on its own route; the 12 objective states, the four checkpoints in order, the consumed event ids, the plot
//      flags (m01.suggested_cover excluded: a rotating cover hint, one per salvo), the survivors and the final battle clock 07:05:00 must be identical. Every event with a
//      battle-clock trigger fires at a battle clock >= its historical time (non-gated: within one tick, 0.05 s x 30), outside the 06:45-07:05 jump.
//   3. NAVIGATION GUARD (amendment 05 kept): on the live route no clipping event and no men standing inside each other; same on seeds 3 and 7 with and without support.
//   4. RECORD: first difference, ticks, real seconds to 06:00 and to the end, the real-clock and battle-clock shift of every consumed event, German rounds per real minute (enemyFire.nextId).
// Deterministic JSON (no clocks, no paths). x86_64 only (D11/D30).
//   node tools/verification/m01-integration-golden-audit.mjs --amendment 06|07|08|09|10|11|12|13|14|15|16|17|18|19 [--write]
// Amendment 09 (`identical`) moves the source lock and nothing else: the navigator queue (one route() per tick, reused work buffers, a warmed solid list) changes the bytes of the simulation
// and of the navigator but not one byte of what a tick computes on the golden routes. Its lockstep must therefore find NO difference in any tick of either route (a first difference is a failure
// there, as its absence is a failure for the others), the digests of the live simulation must equal the previous golden's, and the new golden is the old one with the new source lock.
// Amendment 10 (`noBehaviourDifference`) is the dialogue: the lines the director says, the callouts and the guide change what is SAID (the queue, the subtitle, the consumed tokens, the
// director's record timers.barks, the guide's cadence and two HUD messages that became voices) and nothing that HAPPENS. Its lockstep proves that: with exactly those paths stripped from both
// frames the two simulations must be byte identical on every tick of both routes, and the first difference itself must be one of those dialogue paths (measured: tick 355, the
// scripted line 067 now said on evt_m01_planes_heard, so dialogueConsumed and the queue differ before the director's new record timers.barks).
// Without --write nothing is written: the regenerated account and golden must equal the committed files byte for byte. When a later amendment has moved the simulation, an
// amendment is history: CFG.after names the commit whose simulation its golden pins, and the check runs that tree's simulation and pilot instead of the working tree's.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation as WorkingTree,seconds,clockText} from '../../src/game/m01-simulation.js';
import {route as workingPilot} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const write=process.argv.includes('--write');
const amendmentArg=(()=>{const i=process.argv.indexOf('--amendment');return i<0?null:process.argv[i+1];})();
assert.equal(process.arch,'x64','exact gameplay golden regeneration requires x86 (same rule as D30)');
const AMENDMENTS={
  '06':{task:'M01-P2-PACING-V1',delta:'pacing',predecessor:'66e47b239a9e0bc586375481fb1a554e46b845e2',
    // History since amendment 07: the pacing golden pins the simulation of 5d99df8 (the amendment 06 commit; its merge 74da28f has the same simulation).
    after:'5d99df87875b4e8712c6378fbd4d0b19b3395aa7',
    previousGolden:'tests/fixtures/m01-npc-navigation-gameplay-baseline.json',golden:'tests/fixtures/m01-pacing-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/pacing-p2-2026-10-18',
    generationStage:'P2 pacing on the integration tree (phys + npc + skin + anim + audio): seg_hold 05:34-05:59 at 24x while the player holds the deck after the raid, objective marker and status, continuity cues gated to their objective and >= 20 real s apart; golden amendment 06',
    // Measured on both golden routes (first lockstep difference, tick 355, 04:33:10): the objective panel shows the pacing interlude after obj_m01_deliver_message
    // ("Mensagem entregue. Fique com o posto - avioes a norte") where the predecessor showed "Mantenha contacto com a seccao". Only the HUD text and status lines.
    deltaFields:/^\$\.state\.mission\.(text|status)$/},
  '07':{task:'M01-COMBAT-AI-V1',delta:'combat-ai',predecessor:'5d99df87875b4e8712c6378fbd4d0b19b3395aa7',
    // History since amendment 08: the combat AI golden pins the simulation of 5d13d32 (the amendment 07 commit; 9cd2aca, the predecessor of 08, has the same gameplay inputs).
    after:'5d13d32d91bfa1434a18c5aba3d5ab268d69bc6b',
    previousGolden:'tests/fixtures/m01-pacing-gameplay-baseline.json',golden:'tests/fixtures/m01-combat-ai-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/combat-ai-2026-10-18',
    generationStage:'Combat AI slice 1 on the pacing integration tree: per-actor actor.ai streams, rifle peeks, MG34 burst groups, line-of-sight and threat targets, suppression breaking peeks, Kowal 2-5 round bursts; golden amendment 07',
    // Measured on both golden routes: the first lockstep difference is the new saved record actor.ai (tick 1, Kowal = actors.3, missing in the predecessor). With it stripped from
    // both frames (stateOnly), the first BEHAVIOUR difference is Kowal's first rkm burst at tick 5129 (256.45 s): shot 0.25 -> 0.44 s (a 4-round burst instead of the fixed 3).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai$/,
    stateOnly:frame=>{for(const k of ['state','checkpoint'])for(const x of frame[k]?.actors??[])delete x.ai;return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(shot|cooldown|firedAt|rounds)$/,behaviourActors:/^(szymon_kowal|de_east_\d+)$/},
  '08':{task:'M01-COMBAT-DECK-ASSAULT-V1',delta:'deck-assault',predecessor:'9cd2aca86c377e74ff6cc4f9444431a2ff1aa7ec',
    // History since amendment 09: the deck assault golden pins the simulation of c7c82ee (the slice-2 branch head after its review fixes: the amendment 08 regenerated at 204a5a8), not the working tree's.
    after:'c7c82ee6a2c44318b06bd674dbe94dc1ff43aa1d',
    previousGolden:'tests/fixtures/m01-combat-ai-gameplay-baseline.json',golden:'tests/fixtures/m01-deck-assault-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/deck-assault-2026-10-18',
    // The deck assault lives in its own module too; it is hashed for this amendment only (06 and 07 keep their input lists byte for byte).
    extraInputs:['src/game/m01-deck-assault.js'],
    generationStage:'Combat slice 2, the deck assault on the combat AI integration tree: at 06:05 the ten Germans of grp_de_spans enter the road deck, four post on span 08 and six bound by cover to mid-deck (x 458-578, never west of x 450) with the slice-1 AI and real rounds, fall back east of x 945 on losses, suppression, the end of their hold or 165 s; the east demolition waits for the deck to clear; enemy_down_by_player; a 120-round ammo box of the section at the deck post; review fixes (MG34 near miss pins the sappers 5 s, searching fire where the player was last seen leaves as player rounds, dead men on the collapsed spans fall with them, an absolute bound on the deck hold); golden amendment 08',
    // Measured on both golden routes: the first lockstep difference is the new key `who` of a sighting (actor.ai.seen.who, the review fix that sends searching fire on the player's
    // last-seen spot as player rounds), first written by the rail-gate MG when it sees the player after train 963. With it stripped from both frames (stateOnly), the first
    // BEHAVIOUR difference is recorded below (behaviourFields / behaviourActors are measured, then pinned).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen\.who$/,
    stateOnly:frame=>{for(const k of ['state','checkpoint'])for(const x of frame[k]?.actors??[])if(x.ai?.seen)delete x.ai.seen.who;return frame;},
    // Measured: route 19390901 (control), tick 5331 (04:46:31): sapper pawel_krawiec suppressedUntil +1.5 s (an MG34 near miss pins the working sappers 5 s, was 3.5 s);
    // route 7 support, tick 5195 (04:45:30): the new event enemy_down_by_player where the predecessor emitted only player-shot (the pilot kills the gate MG gunner).
    behaviourFields:/^\$\.((state|checkpoint)\.actors\.\d+\.suppressedUntil|events\.\d+\.type)$/,behaviourActors:/^(pawel_krawiec|sapper_\d)$/},
  '09':{task:'M01-NAV-QUEUE-V1',delta:'nav-queue',predecessor:'c7c82ee6a2c44318b06bd674dbe94dc1ff43aa1d',
    // History since amendment 10: the nav-queue golden pins the simulation of 167dccc (the navigator branch with its amendment 09 remade), not the working tree's.
    after:'167dccc9194b6062947d02e0a0cc30176cc57461',identical:true,
    previousGolden:'tests/fixtures/m01-deck-assault-gameplay-baseline.json',golden:'tests/fixtures/m01-nav-queue-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/nav-queue-2026-10-19',
    extraInputs:['src/game/m01-deck-assault.js'],
    generationStage:'NPC navigator work on the deck assault integration tree: at most one route() per tick, taken in roster order (the others keep the straight walk of that tick and ask again), work buffers reused between plans, the solid list built at construction and after a load, the neighbour queries of a walking man on reused storage; golden amendment 09 moves the source lock only'},
  '10':{task:'M01-DIALOGUE-V1',delta:'dialogue',predecessor:'167dccc9194b6062947d02e0a0cc30176cc57461',
    // History since amendment 11: the dialogue golden pins the simulation of c1a3ecf (the dialogue merged on the navigator-queue tree), not the working tree's.
    after:'c1a3ecf304f1e8a30283d251d2ff8ec174e0ba93',noBehaviourDifference:true,
    previousGolden:'tests/fixtures/m01-nav-queue-gameplay-baseline.json',golden:'tests/fixtures/m01-dialogue-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/dialogue-2026-10-19',
    // The director lives in its own module too; it is hashed for this amendment only.
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js'],
    generationStage:'Reactive dialogue on the navigator-queue integration tree: the 55 reviewed lines (dlg_m01_100-154, 114/115 unwired) and the guide variants 015a-d as data (a bark rule per line), a deterministic director (src/game/m01-barks.js) with cooldowns on the real clock, repeats, variant rotation and substitution against the callouts, a priority queue with a two-voice limit and a rolling 60 s budget in line(), the six canonical lines nothing said (030 035 036 042 047 067) wired, the cover rotation and the guide spoken instead of messaged; state in timers.barks; golden amendment 10',
    // Measured (dry run of the strip, predecessor 167dccc against the working tree, 23839 ticks of the control route): the first lockstep difference is the dialogue itself at tick 355 (04:33:10,
    // evt_m01_planes_heard): the orphan line 067 is now said there, so dialogueConsumed[12] and the queue differ, and timers.barks is new. The behaviour does not move at all: with the dialogue
    // state stripped from both frames (stateOnly) the two simulations are byte identical on every tick of both routes.
    deltaFields:/^\$\.(state|checkpoint)\.(dialogueConsumed|dialogueQueue|subtitle|timers\.(barks|guide|guideDist))(\.|$)/,
    stripped:['dialogueConsumed','dialogueQueue','subtitle','timers.barks','timers.guide','timers.guideDist','events: message «Zieliński chama-o da trincheira…»','events: message «Zieliński: …mude de cobertura»'],
    stateOnly:frame=>{
      const strip=s=>{if(!s)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete s[k];for(const k of ['barks','guide','guideDist'])delete s.timers?.[k];strip(s.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>!(e.type==='message'&&/^(Zieliński chama-o da trincheira|Zieliński: .*mude de cobertura)/.test(e.message)));
      return frame;}},
  '11':{task:'M01-REARGUARD-V1',delta:'rearguard',predecessor:'c1a3ecf304f1e8a30283d251d2ff8ec174e0ba93',
    // History since amendment 12: the rearguard golden pins the simulation of a59c129 (bf56966's simulation, the amendment 11 tree), not the live one.
    after:'a59c129609ea4aef182ede0a172f745967d0cb30',
    previousGolden:'tests/fixtures/m01-dialogue-gameplay-baseline.json',golden:'tests/fixtures/m01-rearguard-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/rearguard-2026-10-19',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js'],
    generationStage:'Combat slice 2b on the reactive-dialogue integration tree: while the east demolition gate holds the clock at 06:09:30 for the deck, the Polish rearguard (pl_east_0..2, never victims of the 20 s rule) kneels at x 165-175 (z 38.7) and fires real kb wz.29 rounds (own stream, damage and the suppression rule of the player\'s rifle, a line-of-fire rule) at the deck assault, then resumes the withdrawal; plus the bark director review fixes (B1 the peek lines read the AI\'s own sight, ai.seen of riflemen too; N1 reactive lines counted when shown; N3 030 to Kowal with a fired condition); golden amendment 11',
    // Measured on both golden routes (tick 5163, 04:45:16): the first lockstep difference is B1's new sighting of a gate rifleman (de_east_2's ai.seen, null in the predecessor:
    // only the MG34 wrote it). With the new state stripped from both frames (stateOnly: the dialogue state, every ai.seen, the rearguard's rear/ai/firedAt), the first BEHAVIOUR
    // difference is the rearguard: pl_east_0 turns from the platoon file towards his post on the tick the gate holds the clock (06:09:30; control tick 13266, support tick 12730).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen$/,
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];delete st.timers?.barks;
        for(const a of st.actors??[]){if(a.ai)delete a.ai.seen;if(/^pl_east_[0-2]$/.test(a.id)){delete a.rear;delete a.ai;delete a.firedAt;}}strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,behaviourActors:/^pl_east_[0-2]$/},
  '12':{task:'M01-H9-D2-DIFFICULTY-0535-V1',delta:'difficulty+0535',predecessor:'a59c129609ea4aef182ede0a172f745967d0cb30',
    // History since amendment 13 (H9 D3/D4), 14 and 15: the difficulty + 05:35 golden pins the simulation of efb8eb00 (the candidate head 4e2588fa plus a CI-only commit; same simulation), not the live one.
    after:'efb8eb00d37a3370018e6193c4c0b158094f0241',
    previousGolden:'tests/fixtures/m01-rearguard-gameplay-baseline.json',golden:'tests/fixtures/m01-difficulty-0535-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/difficulty-0535-2026-10-19',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js'],
    generationStage:'H9 D2 on the rearguard tree: the D35 level table is read by the simulation (wound chance and damage, burst cap F2, fair-death clamp F1, aim error, cadence and target weights of the fire at the player, the gate MG repair share, the cover salvo, regen, checkpoint health, Kowal pool); recruta, the level of these routes, keeps every number and writes no new key. And the 05:35 fill: from hold_access to the east demolition a dike rifleman who sees the player at the deck post (HOLD_AREA) may take him as a target (weight 1 against the east bridgehead block, 2.3 for a withdrawing man), so the stretch from 05:34:54 is no longer empty.',
    // MEASURED below (first run of this amendment): the first lockstep difference and, with the dike riflemen's new sighting stripped, the first behaviour difference.
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen$/,
    // Measured (first run): the first lockstep difference is the new sighting of a dike rifleman (de_east_18's ai.seen, 05:35:26, control route); the next is what the bark
    // director reads from it (timers.barks.seen.peek, a peek line, 05:37:09). With the sightings and the dialogue state stripped, as amendment 11 did, the first BEHAVIOUR
    // difference is the dike rifleman who takes the player as his target.
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];delete st.timers?.barks;
        for(const a of st.actors??[])if(a.ai)delete a.ai.seen;strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message));
      return frame;},
    // Measured (control route): de_east_20 turns to the player at the deck post (facing, 05:38:43, the first key of the man that differs: his ai.target moves in the same tick).
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|ai\.target)$/,behaviourActors:/^de_east_(1[4-9]|[2-9]\d)$/},
  // Amendment 13 (`identical`, like 09) moves the source lock and nothing else on the two golden routes, which run on recruta: the death with a cause (failure and player-down only at a death),
  // CP-B2 (saved only on soldado and veterano), the fair-death clamp F4 (soldado and veterano), lowerDifficulty, the level table (veterano: no regeneration) and the new mission.json entry change
  // not one byte of what a tick computes there. Its lockstep must find NO differing tick in either route (a first difference is a failure), and the digests equal the previous golden's.
  // History since amendment 14 (2026-10-22): the D3/D4 golden pins the simulation of 3eb21b38 (candidate #80 + WP1), not the working tree's.
  '13':{task:'M01-H9-D3-D4-DEATH-V1',delta:'death+cp-b2+fair-death',predecessor:'efb8eb00d37a3370018e6193c4c0b158094f0241',after:'3eb21b387205140e3e6ea9ef13cf9f8f296a6c87',identical:true,
    previousGolden:'tests/fixtures/m01-difficulty-0535-gameplay-baseline.json',golden:'tests/fixtures/m01-difficulty-d3-d4-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/difficulty-d3-d4-2026-10-22',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js'],
    generationStage:'H9 D3/D4 on the difficulty + 05:35 tree: every death has a cause and one player-down event (F5), CP-B2 "Reparo" is saved when the repair begins on soldado and veterano only (D3), no lethal wound in a cutscene on soldado and veterano (F4), lowerDifficulty re-levels a checkpoint to a lower level (D5), the veterano level has no regeneration (owner decision 2026-10-22) and the table is recalibrated; recruta, the level of these routes, keeps every number and writes no new key: golden amendment 13 moves the source lock only'},
  // Amendment 14 was written against amendment 12 (4e2588fa) on the WP3 branch and is re-based at integration onto the amendment 13 tree (3eb21b38, candidate #80 + WP1); 15 (ckm jam) follows it.
  // History since amendment 15 (the ckm stoppages): the escort + coordination golden pins the simulation of c99a4326 (the integration of WP3 on the amendment 13 tree), not the working tree's.
  '14':{task:'M01-SP08-ESCORT-COORDINATION-V1',delta:'escort+coordination',predecessor:'3eb21b387205140e3e6ea9ef13cf9f8f296a6c87',after:'c99a4326ea6f83e03c5bf5ea1df01a299ad055db',
    previousGolden:'tests/fixtures/m01-difficulty-d3-d4-gameplay-baseline.json',golden:'tests/fixtures/m01-escort-coordination-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/escort-coordination-2026-10-22',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-corridor.js','src/game/m01-squad.js'],
    generationStage:'Owner order 2026-10-22 on the amendment 13 tree (candidate #80 + WP1 H9 D3/D4 at 3eb21b38; written first against amendment 12 at 4e2588fa): SP-08, the corridor becomes a task (Jan counts the east platoon one man at a time, «passaram X de Y»; Zieliński sends him back to escort Dudek carrying Bąk; Dudek keeps an escort pace of 1.7 m/s beside him and stops under fire alone; the east bank, the dike over the road approach and the Germans regrouped on the spans fire on the escort with squad rounds that never wound an ally, searching fire 25 s where they lost it; Zieliński lowers Jan\'s head within 3 m in the west pre-roll), B4 unchanged; and slice 3, the section falls back by four bounds between posts along the corridor (fire team A, Kowal) on order, on the escort passing, on suppression or at 06:36, with Kowal covering the escort with rkm bursts and callouts through the bark director (trigger squadMove, lines 155-163); recruta routes, no new objective, flag or event.',
    // Measured (first run of this amendment, both routes): nothing differs before the east demolition; the first lockstep difference is Kowal's x at 06:10:00 (control tick 17220,
    // support tick 15134): he holds his T38 slot at the squad post (x -71.1) where the predecessor sets off for the single retreat point (x -170, z 22). It is behaviour at once:
    // with the new records (timers.squad, timers.corridor), the sightings and the dialogue state stripped, the first behaviour difference is the same path of the same man.
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];for(const k of ['barks','squad','corridor'])delete st.timers?.[k];
        for(const a of st.actors??[])if(a.ai)delete a.ai.seen;strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,behaviourActors:/^(szymon_kowal|staszek_pawlak|east_platoon_voice)$/},
  // Amendment 15 was written first as amendment 13 against amendment 12 (4e2588fa) on the WP2 branch (45a61a33) and is re-based at integration onto the amendment 14 tree (c99a4326 = candidate #80 + WP1 + WP3).
  // History since amendment 16 (R1-a, 2026-10-23): the ckm stoppage golden pins the simulation of e7f5f28 (candidate #80 at the head before the bomb effects), not the working tree's.
  '15':{task:'M01-CKM-JAM-V1',delta:'ckm-jam',predecessor:'c99a4326ea6f83e03c5bf5ea1df01a299ad055db',after:'e7f5f2879b1bdbddad7c94ae12fad97627758758',
    previousGolden:'tests/fixtures/m01-escort-coordination-gameplay-baseline.json',golden:'tests/fixtures/m01-ckm-jam-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/ckm-jam-2026-10-22',
    // The director (triggers and rules of 114 / 115) and the audio-event contract (the two new events) are gameplay inputs of this amendment too; the mission data is already one.
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js'],
    generationStage:'The ckm wz.30 stops (owner decision 2026-10-22), on the amendment 14 tree (candidate #80 + WP1 H9 D3/D4 + WP3 escort and squad coordination at c99a4326; written first against the H9 D2 tree 4e2588fa): a table (CKM_STOPPAGES) stops the gun instead of the burst it was about to fire, before the 14th burst (3.8 s) and before the 45th (4.6 s); the gunner\'s machine gets a fifth phase, `stoppage`, with its `clearAt`, copied by the loader and the third man; the loader clears it with the authored feed drill, `ckm_stoppage_cleared` says so and the burst follows on that tick; not a round, not a draw from any random stream; new saved state only when it happens (ckmFire.jams, ckm.clearAt); the events ckm_stoppage / ckm_stoppage_cleared and the director rules of lines 114 and 115 on them; golden amendment 15',
    // Measured on both golden routes: the first lockstep difference is the stoppage itself, the gunner's phase (`ckm.phase`: the predecessor fires the 14th burst, `fire_burst`; the live gun is `stoppage`)
    // on the tick the gun would have fired it (control tick 6957, 04:58:43; support tick 7002, 04:59:03). Until then the two simulations are byte identical, tick for tick (13 blocks of 512 ticks).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(ckm|ckmFire)(\.|$)/,
    // With the gun's own records (ckm, ckmFire of the three men), the dialogue state and the gun's events stripped from both frames (stateOnly), the first BEHAVIOUR difference is the rounds that
    // are not there: 1.7 s (control, tick 6991) and 8.5 s (support, tick 7173) later, a rifleman of the gate group that the burst would have pinned is not pinned (suppressedUntil of de_east_9, or
    // the crouched flag that follows it, de_east_10).
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];delete st.timers?.barks;
        for(const a of st.actors??[])if(/^ckm_/.test(a.id)){delete a.ckm;delete a.ckmFire;}strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>!['ally-fire','ckm_stoppage','ckm_stoppage_cleared'].includes(e.type)&&(e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message)));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(suppressedUntil|crouched)$/,behaviourActors:/^de_east_(\d|1[0-3])$/},
  // Amendment 16 (R1-a, 2026-10-23, owner playtest: «os soldados junto dos bombardeamentos sobrevivem sem consequências; a guerra devia sentir-se desde as 04:34»): an aerial bomb now does something to the
  // men beside it (m01-blast.js: a lethal core, a wounding ring and a shaken ring, cover and posture, the cast / the east platoon / the ckm crew only shaken), the player is never hurt but is stunned
  // near a blast (reduced sprint, a less steady rifle, the audio's concussion duck), and the 04:34 raid goes on with eleven more impacts until 04:43:10 (mission.json raidTargets0434). No draw from any
  // random stream. Measured on both golden routes (tools/verification/m01-integration-golden-audit.mjs --amendment 16): the two simulations are byte identical, tick for tick, until 04:34:00 (tick 1355,
  // 67.75 s); the first difference is the new saved schedule `timers.raidSchedule0434` the 04:34 event creates (missing in the predecessor). With the new records stripped from both frames (stateOnly: that
  // schedule, the player's concussion fields, the crater's concussion, the event's concussion and effects) the first BEHAVIOUR difference is the player himself, tick 1407 (04:34:09): the scripted bomb of
  // forward_post falls 44.6 m from him at the post and stuns him (0.51), so the first step of his walk west is shorter (player.x 14.6396 against 14.6994).
  // History since amendment 17 (R2-a, 2026-10-24): the bomb effects golden pins the simulation of c66436d4 (candidate #80 + hands / ADS / perf / flashes + R1-a), not the working tree's.
  '16':{task:'M01-BOMB-EFFECTS-V1',delta:'bomb-effects',predecessor:'e7f5f2879b1bdbddad7c94ae12fad97627758758',after:'c66436d444e94fa4a9f083c303a58185c4177d85',
    previousGolden:'tests/fixtures/m01-ckm-jam-gameplay-baseline.json',golden:'tests/fixtures/m01-bomb-effects-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/bomb-effects-2026-10-23',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js'],
    generationStage:'R1-a on the amendment 15 tree (candidate #80 at e7f5f28): an aerial bomb kills the man at its crater, wounds the man beyond and shakes the next (killed: DOWN, wounded: WOUNDED, shaken: the existing suppression; cover and posture shelter a man; the cast, the east platoon, the ckm crew and the station-yard stretcher and cart are only ever shaken); the player is never hurt by a bomb but is stunned near one (player.concussion / concussedUntil: reduced sprint, a less steady rifle, the audio concussion duck from the crater record); the 04:34 raid goes on to 04:44 with eleven impacts (timers.raidSchedule0434, mission.json raidTargets0434, 30 m from the player, 20 m from the objectives); six unnamed riflemen of the west garrison (pl_west_0..5, displayOnly, mission.json westGarrison) stand where the bombs fall, so that the war is seen (two killed, two wounded, two shaken on the golden routes), and the three sappers of the cable camp run for the sandbags of the section when Nowicki warns them and come back after the bomb (grp_sappers.stage.shelter) instead of kneeling 1.6 m from it; a wounded railwayman of the station yard lies where he fell; no draw from any random stream; golden amendment 16 (regenerated twice on the same predecessor: first without the garrison and the shelter, then with them)',
    // The roster grows by six (97 -> 103): the first lockstep difference is the first of the new actors, appended after the auxiliaries. The new records are stripped from both frames for the behaviour
    // comparison: the garrison actors (their own states are the delta), the schedule, the player's concussion fields, the crater's concussion, the event's concussion and effects.
    deltaFields:/^\$\.(state|checkpoint)\.actors\.(9[7-9]|10[0-2])$/,
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;delete st.timers?.raidSchedule0434;if(st.player){delete st.player.concussion;delete st.player.concussedUntil;}
        for(const d of st.sectors?.damage??[])delete d.concussion;if(st.actors)st.actors=st.actors.filter(a=>!/^pl_west_\d$/.test(a.id));strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.map(e=>{if(e.type!=='m01-blast')return e;const {concussion,effects,...rest}=e;return rest;});
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.(player|actors\.\d+)\.x$/,behaviourActors:/^(pawel_krawiec|sapper_2|sapper_3)$/},
  // Amendment 17 (R2-a, 2026-10-24, owner complaint: «aliados e inimigos mostram pouca inteligência; os polacos fazem pouco para contrariar o ataque; os aliados só coordenam na retirada»): from the first bomb of
  // 04:34 to the east demolition the Polish section sees, calls, reacts and is ordered (src/game/m01-section.js, slice 4 on the machinery of slice 3). No draw from the main random stream (the section has five
  // streams of its own, derived from the state of that stream when its record starts) and nothing a German decides or the player feels: Kowal's cadence, target and posture are untouched, the riflemen's answers are
  // display-grade (flash, report, clip, no traced round). Measured on both golden routes (this tool, --amendment 17): the two simulations are byte identical, tick for tick, until 04:34:00 (tick 1355, 67.75 s); the
  // first difference is the new saved record `timers.section`, which the first tick of the window creates (missing in the predecessor). With the new records stripped from both frames (stateOnly: that record, the
  // director's, the dialogue state, the section's events and the HUD fallback of the cover order) the first BEHAVIOUR difference is the sergeant himself, tick 1481 (04:34:22): Zieliński turns to the man who calls
  // the first man down by the 04:34 raid (`actors.0.facing`, -3.0406 against 0.11).
  // History since amendment 18 (R2-b, 2026-10-24): the squad coordination golden pins the simulation of 33896528 (candidate #80 + R1-a + R2-a, the merge of R2-a), not the working tree's.
  '17':{task:'M01-SQUAD-COORDINATION-V1',delta:'squad-coordination',predecessor:'c66436d444e94fa4a9f083c303a58185c4177d85',after:'3389652895ac52d0bbf191301b4bce55e8e3b673',
    previousGolden:'tests/fixtures/m01-bomb-effects-gameplay-baseline.json',golden:'tests/fixtures/m01-squad-coordination-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/squad-coordination-r2a-2026-10-24',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-squad.js','src/game/m01-section.js'],
    generationStage:'R2-a on the amendment 16 tree (candidate #80 + hands / ADS / perf / flashes + R1-a at c66436d4): from the first bomb of 04:34 to the east demolition the Polish section sees, calls, reacts and is ordered (m01-section.js, slice 4 on the machinery of slice 3: the walk of moveActor with its A* navigator, the arrival rule, the squadMove callouts of the bark director, a saved record that is validated and absent in older saves). The section\'s eyes (Zieliński, Pawlak and the platoon voice when they rise over the sandbags, Bąk) take turns to look; a German who fired in the last 2.4 s and whom the watcher sees (the world\'s line of sight) is a new threat unless the section called him lately, and the watcher emits a `section-callout` (kind mg / gate / dike with the side of the gate as the player sees it, the deck assault in four phases deck / advance / fallback / down, a post pinned, a man down by a bomb or by the scripted wound of Bąk); every other man within hearing reacts once, differently each time, by a draw from a stream of his own (a rifleman fires at the called German, looks or kneels; Kowal and the sergeant turn); Zieliński orders (`section-order`: focus, hold, shift and return of the pair along the communication trench when its post has been pinned for 3.2 s of 18, deck at the withdrawal of 06:00, sector when a man is down) and the pair walks between authored posts beside the cover nodes cv_trench_2 / cv_trench_1 and to the road deck; 36 lines (dlg_m01_164..199, Polish by an AI author, to be reviewed by a native speaker) on the new triggers of the bark director (section-callout, section-order, squadMove arrive_deck / arrive_trench / arrive_home); the riflemen\'s answers are display-grade (the flash, the report, the clip and the rearguard\'s rifle animation, no traced round and no German pinned), Kowal\'s cadence, target and posture and every German decision are untouched; no draw from the main random stream; a save made inside the window carries timers.section, an older one gets it at its next tick; golden amendment 17',
    // The first difference is the new record itself. For the behaviour comparison the record, the director's, the dialogue state, the section's own events (callouts, orders, the display-grade rifle shots of its men) and the HUD
    // fallback of the cover order (said when the channel is busier) are stripped from both frames.
    deltaFields:/^\$\.(state|checkpoint)\.timers\.section$/,
    stateOnly:frame=>{
      const men=['marek_zielinski','szymon_kowal','staszek_pawlak','east_platoon_voice','jozef_bak'];
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];for(const k of ['barks','section'])delete st.timers?.[k];strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>!['section-callout','section-order'].includes(e.type)&&!(e.type==='npc-shot'&&e.weapon==='ally_rifle'&&men.includes(e.by))&&(e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message)));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|crouched)$/,behaviourActors:/^(marek_zielinski|szymon_kowal|staszek_pawlak|east_platoon_voice|jozef_bak)$/},
  // Amendment 18 (R2-b, 2026-10-24, owner complaint: «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): from the deck assault (06:05, evt_m01_germans_on_east_spans)
  // to the east demolition the section's riflemen fire REAL rounds at the Germans of the deck (the model of the rearguard's rifles: src/game/m01-section.js `real`, sim.alliedRound), the German assault closes in
  // stages down to safeX (250, it was 450) while the Poles who hold the deck are under fire, falls back a line on a casualty, bounds on the two girders in turn, takes the Poles for targets, searches, and throws a
  // stick grenade at a Pole it cannot hit (src/game/m01-deck-assault.js `tactics`, mission.json). No draw from the main random stream (the section's five streams and the men's own streams). Measured on both golden
  // routes (this tool, --amendment 18): the two simulations are byte identical, tick for tick, until 06:05:00 (control tick 12123, support tick 11707); the first difference is the new key every man of the deck gets
  // at the entry, `playerSuppressedUntil` (missing in the predecessor, 0 in the live frame). With the new records stripped from both frames (stateOnly: that key, the lines and the grenade count of the deck record, the
  // sight record of the deck men, the grenade timer, the section's record, the director's, the dialogue state and the section's and the assault's own events) the first BEHAVIOUR difference is a man of the pair: the
  // platoon voice turns to fire his first real round (control, tick 12372, 06:06:40, `facing`) or kneels under the first pin of the assault (support, tick 11758, 06:05:20, `crouched`).
  // History since amendment 19 (R3-a, 2026-10-24): the German AI golden pins the simulation of 3c8e576d (candidate #80 + R1-a + R2-a + R2-b), not the working tree's.
  '18':{task:'M01-GERMAN-AI-V1',delta:'german-ai',predecessor:'3389652895ac52d0bbf191301b4bce55e8e3b673',after:'3c8e576dfdfefa7a2158a50dffb74fed4695385f',
    previousGolden:'tests/fixtures/m01-squad-coordination-gameplay-baseline.json',golden:'tests/fixtures/m01-german-ai-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/german-ai-r2b-2026-10-24',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-squad.js','src/game/m01-section.js'],
    generationStage:'R2-b on the amendment 17 tree (candidate #80 + R1-a + R2-a at 33896528): from the deck assault (06:05) the Polish section fires REAL rounds at the Germans of the deck (m01-section.js `real` from evt_m01_germans_on_east_spans: a cycle of its own per rifleman, a peek of one to three rounds then a pause, none while pinned; sim.alliedRound, the model of the player\'s and of the rearguard\'s rifles: a ray from the eye to the torso of the posture, milliradian dispersion sigmaMil [5, 4] wider while shaken, held when a friend is in the line of fire, damage by part, the suppression of suppressAlong; the round ends 40 m past the German; the npc-shot carries where it stopped and whether it struck), Kowal\'s rkm answers the deck too (kowalFire reaches the men of the assault within 600 m), and the rule of the 20 s reads only the suppression the PLAYER causes (actor.playerSuppressedUntil, a key every man of the deck has from the entry; an older save gets it at restore); the German assault (grp_de_spans.deckAssault) closes in stages: safeX goes from 450 to 250 and each man has, between his old limit (line 0) and a deepest line safeX + 8 m + his place in the formation, closing lines that he takes only while the Poles who hold the deck (the pair, the rearguard) are under fire (tactics.pressure) and nobody of the assault has fallen for casualtyHoldSec, one line back on a casualty on a closing line, the two girders bounding in turn, the squad\'s deadline longer by closeExtraSec while a man is on a closing line; the Poles who hold the deck are targets of the assault (kind squad: they pin whoever they pass for pinSec, they never wound), remembered where they were seen (ai.seen); a man in cover who lost sight of the Pole he saw moves on to the station from which a man on his feet would see the place (deck-tactic search); a man in cover or on a line throws one Stielhandgranate (tactics.grenade: range 6-32 m, at a Pole he cannot hit with the rifle, never at a player in the open he can see; a flat arc of 1.4 s and a fuse of 3.8 s as the warning, the existing bark dlg_m01_138; one wound of the level within 3.5 m with a clear path, F1 fair-death bookkeeping at the throw; the Poles within 10 m are pinned, never wounded); no draw from the main random stream; a save made inside the window carries the new optional keys (timers.section.fire, deck.lim, deck.gr, ai.seen of the deck men, timers.deckGrenadeAt, German grenades with by / at), an older one gets playerSuppressedUntil at restore; golden amendment 18',
    // The first difference is the key every man of the deck gets at the entry (playerSuppressedUntil). For the behaviour comparison that key, the lines and the grenade count of the deck record, the deck men's sight record, the
    // grenade timer, the section's record (its cycle and its streams), the director's, the dialogue state, and the events of the section (calls, orders, its men's rifle shots) and of the assault (deck-tactic, enemy-grenade)
    // are stripped from both frames.
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.playerSuppressedUntil$/,
    stateOnly:frame=>{
      const men=['marek_zielinski','szymon_kowal','staszek_pawlak','east_platoon_voice','jozef_bak'];
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];for(const k of ['barks','section','deckGrenadeAt'])delete st.timers?.[k];
        for(const a of st.actors??[])if(a.group==='grp_de_spans'){delete a.playerSuppressedUntil;if(a.deck){delete a.deck.lim;delete a.deck.gr;}if(a.ai)delete a.ai.seen;}
        strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>!['section-callout','section-order','deck-tactic','enemy-grenade'].includes(e.type)&&!(e.type==='npc-shot'&&e.weapon==='ally_rifle'&&men.includes(e.by))&&(e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message)));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(facing|crouched)$/,behaviourActors:/^(marek_zielinski|szymon_kowal|staszek_pawlak|east_platoon_voice|jozef_bak)$/},
  // Amendment 19 (R3-a, 2026-10-24, owner complaint: «os sapadores parecem homens a picar o chão repetidamente, sem trabalho visível»): the three sappers carry out a staged technical operation (src/game/m01-sappers.js,
  // mission.json grp_sappers.operation) instead of one kneeling pose for 150 s. From the call (find_sappers) they follow the cable to the fault at a searching pace and wait for the box; they examine, splice and test the
  // line; the first test gives no passage (one failure, the same on every level and seed) and sends them along the cable to a second cut, where they examine, splice and test again; the leader reports to the officer, they
  // wait for the order of 05:30 and look at the blasts of 06:10 and 06:45 before the retreat goes on. The repair keeps its 150 s of work and every historical anchor; a pin or a bomb that shakes the working men stops the
  // current stage (the one gate there always was) and a suppressed sapper makes for the nearest cover by his own decision and resumes. No draw from any random stream; no new saved state but the optional, validated actor flag
  // `coverRun`. Measured on both golden routes (this tool, --amendment 19): the two simulations are byte identical, tick for tick, until 04:36:54 (tick 2348), when the sappers have been called; the first difference is the
  // objective panel's status line, "Os sapadores procuram o corte" where the predecessor showed nothing. With mission.text / status stripped from both frames (stateOnly) the first BEHAVIOUR difference is the leader himself,
  // the next tick (2349): Krawiec follows the cable at the searching pace (actors.1.x -42.352, a step of 0.09 m) where the predecessor walked on at 0.18 m per tick (-42.442).
  '19':{task:'M01-SAPPERS-OPERATION-V1',delta:'sapper-operation',predecessor:'3c8e576dfdfefa7a2158a50dffb74fed4695385f',after:null,
    previousGolden:'tests/fixtures/m01-german-ai-gameplay-baseline.json',golden:'tests/fixtures/m01-sappers-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/sappers-r3a-2026-10-24',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js','src/game/m01-difficulty.js','src/game/m01-audio-events.js','src/game/m01-blast.js','src/game/m01-garrison.js','src/game/m01-squad.js','src/game/m01-section.js','src/game/m01-sappers.js'],
    generationStage:'R3-a on the amendment 18 tree (candidate #80 + R1-a + R2-a + R2-b at 3c8e576d): the three sappers of the cable camp carry out a staged technical operation (m01-sappers.js; mission.json grp_sappers.operation: the cable, the crater, the fault and the second cut with the three slots of each, the eight stages inspect / splice / test / fail / relocate / inspect2 / splice2 / test2 and their seconds, which add up to the 150 s of work the repair always took). The phase is a pure function of the objective states, the old 0-100 progress of obj_m01_cover_repair (so a save made before this module loads mid-repair and falls into the stage the bar stands in), the times of the consumed events, the clock and the places of the men; nothing is drawn from a random stream. From find_sappers they follow the cable to the fault (locate, 1.8 m/s) and wait for the box (standby); the repair advances only while the leader stands at the work point of the stage (leaderAt) and, on the walk between the cuts (relocate), is capped so that it cannot end before the leader arrives; the first test (fail) gives no passage and sends the team to the second cut, the last (test2) gives it; the leader reports to the officer (report), they wait for the order of 05:30 (ready) and look at the blasts (verify, verify_west). A pin (landRound) now counts when a round passes within 6 m of the line between the two cuts, a bomb that shakes the working men stops the bar (timers.repairSuppressedUntil), and a suppressed sapper makes for the nearest cover node with a box within 8 m on its lee side by his own decision (actor.coverRun, optional and validated) and resumes at the point of the stage; the bar, its 150 s and the historical anchors (repair_complete before the order of 05:30, the demolitions of 06:10 and 06:45) are the predecessor\'s; eight lines (dlg_m01_200..207, Polish by an AI author, to be reviewed by a native speaker) on the new `sapperStage` condition of the bark director; golden amendment 19',
    // The first difference is the objective panel's status line in the first tick of the search; with the HUD text stripped the first behaviour difference is the leader's first step along the cable.
    deltaFields:/^\$\.state\.mission\.(text|status)$/,
    stateOnly:frame=>{const strip=st=>{if(!st)return;if(st.mission){delete st.mission.text;delete st.mission.status;}strip(st.resumeCheckpoint);};strip(frame.state);strip(frame.checkpoint);return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,behaviourActors:/^(pawel_krawiec|sapper_2|sapper_3)$/}};
const CFG=AMENDMENTS[amendmentArg];if(!CFG)throw new Error(`--amendment ${amendmentArg}: 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18 or 19`);
assert.ok(CFG.predecessor,'the predecessor commit is pinned');assert.ok(CFG.identical||CFG.deltaFields,'the named delta paths are pinned (measure them first)');
const KEY=`amendment-${amendmentArg}`,ACCOUNT_FILE=`GOLDEN_AMENDMENT_${amendmentArg}.json`;
const out=join(ROOT,CFG.evidence),ACCOUNT=join(out,ACCOUNT_FILE),GOLDEN=join(ROOT,CFG.golden);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29});
const INPUTS=['src/game/m01-simulation.js','src/game/m01-pacing.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js',
  'src/world/m01-navigation.js','src/world/m01-nav-layout.js','tests/helpers/m01-route.js'];

function extract(commit){
  const dir=mkdtempSync(join(tmpdir(),`m01-${amendmentArg}-${commit.slice(0,7)}-`));
  const data=git('ls-tree','-r','--name-only',commit,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',commit,'src','missions','tests/helpers',...data)});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const previousText=readFileSync(join(ROOT,CFG.previousGolden)),previous=JSON.parse(previousText);
const tree=extract(CFG.predecessor),predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(sha(predecessorSource),previous.sourceSha256,'the predecessor simulation is exactly the source the previous golden pins (source lock chain)');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
let Live=WorkingTree,route=workingPilot,liveRoot=ROOT;
if(CFG.after){liveRoot=extract(CFG.after);Live=(await import(pathToFileURL(join(liveRoot,'src/game/m01-simulation.js')))).M01Simulation;
  route=(await import(pathToFileURL(join(liveRoot,'tests/helpers/m01-route.js')))).route;}
const liveSource=readFileSync(join(liveRoot,'src/game/m01-simulation.js'));
const definition=JSON.parse(readFileSync(join(liveRoot,'missions/m01-tczew/mission.json'),'utf8'));
const blob=(commit,f)=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${commit}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const changedInputs=[...INPUTS,...(CFG.extraInputs??[])].filter(f=>{let now=null;try{now=sha(readFileSync(join(liveRoot,f)));}catch{}return blob(CFG.predecessor,f)!==now;});
assert.ok(changedInputs.length>0,'the live gameplay inputs moved');

const NOT_PLOT=new Set(['m01.suggested_cover']);
const plot=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!NOT_PLOT.has(k)).sort());
function observer({audit=true}={}){
  const fired={},o={fired,at0600:null,clip:audit?clippingAudit():null,stack:audit?stackingAudit():null};
  o.step=step=>{const {sim,events}=step;
    for(const id of Object.keys(sim.consumed))fired[id]??={battle:sim.battleClock,real:+sim.clock.toFixed(2)};
    if(o.at0600===null&&sim.battleClock>=seconds('06:00:00'))o.at0600=+sim.clock.toFixed(2);
    if(audit){o.clip.observe(step);o.stack.observe(step);}};
  return o;
}
const endState=(sim,o)=>({ticks:Math.round(sim.clock/.05),real:+sim.clock.toFixed(2),battleClock:sim.battleClock,complete:sim.mission.complete,
  survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,checkpoints:[...sim.checkpointsReached],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,x])=>[id.replace('obj_m01_',''),x.state])),consumedEventIds:Object.keys(sim.consumed).sort(),
  flags:plot(sim.flags),at0600:o.at0600});
function clockEvents(now,old){
  const rows=[];
  for(const e of definition.events){
    const t=[e.trigger,...(e.trigger.of??[])].find(t=>t.type==='battleClock');if(!t)continue;
    const at=seconds(t.at),seg=definition.clock.segments.find(s=>at>=seconds(s.from)&&at<seconds(s.to)),n=now[e.id],o=old[e.id];
    assert.ok(n&&o,`${e.id} fired on both sides`);
    const fixed=e.trigger.type==='battleClock'&&!e.trigger.gate;
    if(!seg?.jump){assert.ok(n.battle>=at-1e-6,`${e.id} never before ${t.at}`);if(fixed)assert.ok(n.battle-at<=1.5+1e-6,`${e.id} at ${t.at} (fired ${clockText(n.battle)})`);}
    rows.push({id:e.id,at:t.at,fixed,jump:Boolean(seg?.jump),battle:{predecessor:+o.battle.toFixed(2),live:+n.battle.toFixed(2)},real:{predecessor:o.real,live:n.real}});
  }
  return rows;
}

const report={task:CFG.task,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,sourceSha256:sha(liveSource),
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText),sourceSha256:previous.sourceSha256},...(CFG.identical?{identical:true}:{deltaFields:CFG.deltaFields.source}),
  ...(CFG.stateOnly?(CFG.noBehaviourDifference?{noBehaviourDifference:true,stripped:CFG.stripped}:{behaviourFields:CFG.behaviourFields.source,behaviourActors:CFG.behaviourActors.source}):{}),
  authority:`Written only by tools/verification/m01-integration-golden-audit.mjs --amendment ${amendmentArg} --write (x86); never edited by hand.`,
  changedGameplayInputsSincePredecessor:changedInputs,routes:[]};
const golden={task:CFG.task,generationStage:CFG.generationStage,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText)},historicalGoldenSha256:previous.historicalGoldenSha256,sourceSha256:sha(liveSource),
  inputsSha256:Object.fromEntries([...INPUTS,...(CFG.extraInputs??[])].map(f=>{try{return [f,sha(readFileSync(join(liveRoot,f)))];}catch{return [f,null];}})),routes:[]};

for(const {seed,support,ticks,blocks} of previous.routes){
  // 0. The predecessor on the live pilot reproduces the previous golden.
  const pd=new GameplayDigest(),po=observer({audit:false});
  const own=route(seed,{support,Simulation:Before,onStep:step=>{pd.add(gameplayFrame(step.sim,step.events));po.step(step);}}).sim;
  assert.deepEqual(pd.finish(),{ticks,blocks},'0. the predecessor reproduces the previous golden on the live pilot (the pilot did not move)');
  // 1. Lockstep on the live controls.
  const a=new Before(seed);a.drainEvents();
  const digest=new GameplayDigest(),lo=observer(),row={seed,support,oldTicks:ticks,newTicks:0,firstDifference:null,identicalTicksBeforeIt:null,identicalBlocks:0,
    ...(CFG.stateOnly?{firstBehaviourDifference:null}:{})};   // only amendments with a new saved record carry it (06's account stays byte for byte)
  const result=route(seed,{support,Simulation:Live,onStep:step=>{
    const {sim,controls,dt,events}=step;row.newTicks++;
    a.tick(dt,structuredClone(controls));const ea=a.drainEvents();const live=gameplayFrame(sim,events);
    if(!row.firstDifference){const d=firstDifference(gameplayFrame(a,ea),live);
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstDifference={tick:row.newTicks,clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock),path:d.path,actor:m?sim.actors[Number(m[1])].id:null,
          predecessor:d.a??null,live:d.b??null,missing:d.missing??false};
        row.identicalTicksBeforeIt=row.newTicks-1;console.log(JSON.stringify({seed,support,firstDifference:row.firstDifference}));}}
    // The first difference that is not the new saved state alone (copies of both frames, with CFG.stateOnly stripped).
    if(CFG.stateOnly&&row.firstDifference&&!row.firstBehaviourDifference){const sa=CFG.stateOnly(structuredClone(gameplayFrame(a,ea))),sb=CFG.stateOnly(structuredClone(live));const d=JSON.stringify(sa)===JSON.stringify(sb)?null:firstDifference(sa,sb);   // (equal text first: the common case, cheap)
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstBehaviourDifference={tick:row.newTicks,clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock),path:d.path,actor:m?sim.actors[Number(m[1])].id:null,predecessor:d.a??null,live:d.b??null};
        console.log(JSON.stringify({seed,support,firstBehaviourDifference:row.firstBehaviourDifference}));}}
    digest.add(live);lo.step(step);
  }});
  const sim=result.sim,fin=digest.finish();
  if(CFG.identical){
    assert.equal(row.firstDifference,null,`1. ${CFG.delta}: not one tick of this route differs from the predecessor (a first difference is a failure of an identical amendment)`);
    assert.deepEqual(fin,{ticks,blocks},'1. the digests of the live simulation are the previous golden\'s, every block');
    row.identicalTicksBeforeIt=row.newTicks;
  }else{
  assert.ok(row.firstDifference,'the live simulation differs from the predecessor on this route');
  assert.match(row.firstDifference.path,CFG.deltaFields,`1. the first difference is a path of the named delta \`${CFG.delta}\``);
  if(CFG.noBehaviourDifference)assert.equal(row.firstBehaviourDifference,null,'1b. with the dialogue state stripped the two simulations are identical on every tick of the route: the dialogue is presentation only');
  else if(CFG.stateOnly){assert.ok(row.firstBehaviourDifference,'the behaviour moved too');assert.match(row.firstBehaviourDifference.path,CFG.behaviourFields,'1b. the first behaviour difference is a combat field');
    // An event path has no actor (amendment 08: the new enemy_down_by_player event) and neither has the player's own record (amendment 16: his first step after the first stun); an actor path must be a man of the named delta.
    if(row.firstBehaviourDifference.actor!==null||!/\.(events|player)\./.test(row.firstBehaviourDifference.path))assert.match(row.firstBehaviourDifference.actor,CFG.behaviourActors,'1b. of a man the combat AI drives');}
  }
  for(let i=0;i<Math.min(fin.blocks.length,blocks.length)&&JSON.stringify(fin.blocks[i])===JSON.stringify(blocks[i]);i++)row.identicalBlocks++;
  // 2. Invariants against the predecessor on its own route.
  const endOld=endState(own,po),endNew=endState(sim,lo);
  assert.equal(endNew.complete,true);assert.equal(endNew.battleClock,seconds('07:05:00'));assert.equal(endNew.battleClock,endOld.battleClock);
  assert.equal(Object.keys(endNew.objectives).length,12);assert.deepEqual(endNew.objectives,endOld.objectives,'2. the same 12 objective end states');
  assert.deepEqual(endNew.checkpoints,endOld.checkpoints,'CP-A..D in order');assert.equal(endNew.checkpoints.length,4);
  assert.deepEqual(endNew.consumedEventIds,endOld.consumedEventIds,'the same consumed events');
  assert.equal(endNew.survivors,endOld.survivors,'the same survivors');
  assert.deepEqual(endNew.flags,endOld.flags,'the same plot flags');
  row.battleClockEvents=clockEvents(lo.fired,po.fired);
  row.movedEvents=endNew.consumedEventIds.filter(id=>po.fired[id].real!==lo.fired[id].real).map(id=>({event:id,real:{predecessor:po.fired[id].real,live:lo.fired[id].real},
    battle:{predecessor:+po.fired[id].battle.toFixed(2),live:+lo.fired[id].battle.toFixed(2)}}));
  // 3. Navigation guard.
  assert.equal(lo.clip.events.length,0,'3. no clipping event on the live route');assert.equal(lo.stack.summary().pairs,0,'3. nobody inside another man on the live route');
  row.endState={predecessorOwnRoute:{ticks:endOld.ticks,real:endOld.real,to0600:endOld.at0600,survivors:endOld.survivors,playerHealth:endOld.playerHealth},
    live:{ticks:endNew.ticks,real:endNew.real,to0600:endNew.at0600,survivors:endNew.survivors,playerHealth:endNew.playerHealth},
    objectives:endNew.objectives,checkpoints:endNew.checkpoints,finalBattleClock:clockText(endNew.battleClock),consumedEvents:endNew.consumedEventIds.length,
    suggestedCover:{predecessor:own.flags['m01.suggested_cover']??null,live:sim.flags['m01.suggested_cover']??null}};
  row.measured={clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,germanRoundsPerRealMin:{predecessor:+(own.enemyFire.nextId/(own.clock/60)).toFixed(2),live:+(sim.enemyFire.nextId/(sim.clock/60)).toFixed(2)}};
  report.routes.push(row);golden.routes.push({seed,support,...fin});
  console.log(JSON.stringify({seed,support,ticks:[ticks,row.newTicks],to0600:[endOld.at0600,endNew.at0600],end:[endOld.real,endNew.real],identicalBlocks:row.identicalBlocks}));
}
// 3 (cont.). The navigation guard and the plot on the other audited seeds, each side on its own route. Not part of the golden.
report.otherRoutes=[];
for(const seed of [3,7])for(const support of [false,true]){
  const lo=observer(),po=observer({audit:false});
  const live=route(seed,{support,Simulation:Live,onStep:lo.step}).sim,own=route(seed,{support,Simulation:Before,onStep:po.step}).sim;
  const endOld=endState(own,po),endNew=endState(live,lo);
  const r={seed,support,clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,
    same:{objectives:JSON.stringify(endOld.objectives)===JSON.stringify(endNew.objectives),checkpoints:JSON.stringify(endOld.checkpoints)===JSON.stringify(endNew.checkpoints),
      consumedEventIds:JSON.stringify(endOld.consumedEventIds)===JSON.stringify(endNew.consumedEventIds),finalBattleClock:endOld.battleClock===endNew.battleClock},
    survivors:{predecessor:endOld.survivors,live:endNew.survivors},real:{predecessor:endOld.real,live:endNew.real},
    repairComplete:{predecessor:po.fired.evt_m01_repair_complete?.real??null,live:lo.fired.evt_m01_repair_complete?.real??null}};
  report.otherRoutes.push(r);
  assert.equal(r.clipping,0,`seed ${seed} support ${support}: no clipping`);assert.equal(r.stacked,0,`seed ${seed} support ${support}: nobody inside another man`);
  assert.equal(endNew.complete,true);assert.equal(endNew.checkpoints.length,4);
  console.log(JSON.stringify(r));
}
const accountText=JSON.stringify(report,null,2)+'\n';
golden.audit=`${CFG.evidence}/${ACCOUNT_FILE}`;golden.auditSha256=sha(accountText);
const goldenText=JSON.stringify(golden,null,2)+'\n';
if(write){mkdirSync(out,{recursive:true});writeFileSync(ACCOUNT,accountText);writeFileSync(GOLDEN,goldenText);console.log('written');}
else{assert.equal(readFileSync(ACCOUNT,'utf8'),accountText,`${ACCOUNT_FILE} equals the regenerated account`);assert.equal(readFileSync(GOLDEN,'utf8'),goldenText,'the golden equals the regenerated one');console.log('check: identical');}
