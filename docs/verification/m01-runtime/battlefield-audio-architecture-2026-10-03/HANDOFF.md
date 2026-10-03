# HANDOFF — M01 Battlefield Audio Architecture V1

## Identidade
- TASK_ID: `M01-BATTLEFIELD-AUDIO-ARCHITECTURE-V1`
- MODELO: GPT-5.6 Sol
- ESFORÇO: HIGH
- BASE: `codex/m01-mg34-prone-runtime@fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`
- BRANCH: `codex/m01-battlefield-audio-architecture`
- HEAD FINAL REMOTO: resolver esta branch depois deste commit; a SHA exata é reportada externamente no handoff ao capitão.

## Commits
- `062529cc876b411421568442b69ac10ea222b981` — audit.
- `2ff35d0b411cd232d3e6b7d8d3c517a0a013d89a` — AudioEvent/authority.
- `d674e006a8ba5de3384b998c3b7a020dc18493d1` — distance/occlusion/environments.
- `2c47e113deab896eccef21269c023f51cf78156b` — battle mix/priority/virtualization.
- `3b2b2c80a5160a0be530e7958fe6a69019e765da` — isolated prototype.
- `4fd7abb21927a1d5ff54d41ecbe8c98078a10aeb` — focused tests.
- `81f0b2029d328f313da14bae168c4c2fea1943cf` — verification/performance report.
- `8298a32c7bc3857928cb01dbe55058c2c41719fd` — NEXT_CHAT_CONTEXT.

## CURRENT AUDIO AUDIT
Full audit: `CURRENT_AUDIO_AUDIT.md`.

Current strengths: Web Audio lifecycle/master gain, real M01 event positions, propagation-delay logic for enemy fire/blasts, trajectory-based crack, pause/resume/dispose. Main gaps: pan-only spatialization, unrelated attenuation curves, no rooms/portals/occlusion, no category buses, budgets/virtualization, voice dialogue policy or deterministic presentation hash in production.

## AUDIO EVENT CONTRACT
```js
AudioEvent {
  id, type, sourceId,
  position,   // metres
  emittedAt,  // simulation clock seconds
  category, intensity, priority,
  weaponType?
}
```
Simulation/world owns the fact. Audio owns sample/EQ/reverb/pitch/tail/voice allocation only.

## DISTANCE MODEL
Prototype bands, independent of visual LOD:
- CLOSE <45 m
- MID 45–220 m
- DISTANT 220–950 m
- VERY_DISTANT 950–5000 m
- BEYOND >=5000 m

Attenuation/filtering remains continuous across band boundaries.

## SPEED OF SOUND
Reference `343 m/s`; generic `audibleAt = emittedAt + distance / 343`.
Critical isolated result: ~1 km -> 2.915456 s. No 1000 m hardcode.

## GUNSHOTS
Layers: muzzle blast, mechanical action, bullet crack when ballistics supports it, impact, distant report and environment tail. Near emphasizes transient/mechanism; distant reduces highs/mechanical detail and emphasizes report/tail. Architecture distinguishes rifle/SMG/MG/pistol/tank cannon/autocannon/artillery.

## BULLET CRACK
Trajectory-dependent, never camera-dependent. Future ballistics should supply projectile ID, closest pass, projectile speed/sonic state and pass time. Current M01 trajectory-derived crack is the correct authority direction.

## ARTILLERY
Separate gun report, shell flight, conditional whistle, impact, debris and tail. Never invent a gun position or whistle when simulation/trajectory does not support it.

## EXPLOSIONS
Near: blast + LF body + debris + reflections + tail. Distant: flash now, propagation delay, reduced highs, rumble/body, long tail. Audio intensity is presentation magnitude, not damage.

## OCCLUSION
Blocked path is not mute: reduce direct gain, low-pass it, keep an indirect/wet component; portals/openings partially restore energy. Production must reuse authoritative geometry/acoustic queries.

## INTERIORS / REVERB
Reusable families: OUTDOOR, SMALL_ROOM, LARGE_ROOM, FACTORY, TUNNEL, CASEMATE. Parameters include early reflections, decay, damping, wet/send. Reuse families/zones with crossfades; do not make a bespoke reverb per house.

## DISTANT BATTLE
Future BattleSector emits semantic real events such as `sector_artillery_event`, `sector_mg_exchange`, `sector_vehicle_fire`, `sector_explosion`. Audio converts those facts; no infinite battle-loop audio as gameplay truth.

## ANTI-REPETITION
Licensed sample families + deterministic presentation hash of event ID/type/source/layer for sample index, tiny pitch/gain variation and tail family. Never consume gameplay RNG.

## PRIORITY
CRITICAL: player weapon, dangerous near blast, mission-critical dialogue.
HIGH: nearby enemy weapon, relevant nearby vehicle/aircraft, squad callout.
MEDIUM: normal battlefield combat, meaningful distant artillery/explosion, combat bark.
LOW: very distant minor battle, ambient bark, minor debris.

## VOICE BUDGET
Prototype:
- LOW: global 32; weapons 12; explosions 6; dialogue 4; vehicles 4; aircraft 3; ambience 5; debris 2.
- MEDIUM: global 48; weapons 18; explosions 9; dialogue 5; vehicles 6; aircraft 4; ambience 7; debris 4.
- HIGH: global 72; weapons 28; explosions 12; dialogue 6; vehicles 8; aircraft 6; ambience 10; debris 6.

Global allocator is the final ceiling.

## VIRTUALIZATION
Logical voice can exist without AudioBufferSource. Use for inaudible/out-of-range events, exhausted budgets or disabled audio. Persistent loops resume at correct phase; expired one-shots do not restart late.

## DIALOGUE
Priority order: mission-critical > squad callout > combat bark > ambient bark. Important speech may steal low-value bark, never reorder simulation dialogue. Prototype ducking is moderate; explosions are not silenced.

## VEHICLES / AIRCRAFT
Vehicle future layers: idle/RPM/load, track/wheel, gear, damage, weapon, interior/exterior. Audio does not implement VehicleController.
Aircraft reads real position, velocity, altitude and radial velocity; bounded simplified Doppler is allowed. Camera visibility does not control existence.

## AMBIENCE
Wind, river, structures, persistent fires, aircraft and distant battle may exist, but battle ambience remains tied to real state/events. Fauna should react to situational state.

## AUDIO SNAPSHOTS
Presentation-only: NORMAL, SUPPRESSED, NEAR_EXPLOSION, INDOOR, VEHICLE_INTERIOR, OUTRO. Near-explosion muffling/tone is restrained and temporary.

## GAMEPLAY INDEPENDENCE
Prototype imports no simulation, receives no gameplay RNG, uses deterministic event hashing, and keeps logical event type/time equal with audio enabled/disabled. Quality only changes presentation budgets/reflections. Production still needs end-to-end M01 snapshot/RNG equality tests.

## TOOLS
`tools/verification/m01-battlefield-audio-prototype.mjs`

## TESTS
`tests/m01-battlefield-audio-prototype.test.js`

Executed isolated:
- 16 tests / 16 pass / 0 fail / 0 skipped / 0 cancelled.
- 1 km propagation verified.
- off-camera rule verified.
- quality logical equivalence verified.
- 50 distant shots at MEDIUM: 18 active + 32 virtualized.

## PERFORMANCE RESULTS
Pure scheduling/mix decisions, median of five independent Node process runs:
- 100 events: 2.562 ms
- 500: 4.595 ms
- 1000: 14.974 ms
- 5000: 41.562 ms

Not FPS, not Web Audio thread performance, not Chromebook.

## LIMITATIONS
Sandbox DNS could not clone `github.com`; GitHub reads/writes used the authenticated connector. Therefore do NOT claim full `npm test`, `npm run build`, browser/Web Audio execution, HRTF/convolver cost, Chromebook performance or human listening validation. Isolated verification used Node v22.16.0; repo CI uses Node 24.

## RISKS
Acoustic tuning can bury or over-amplify distant battle; per-frame occlusion queries need batching/caching; persistent loops need phase-correct virtualization; restore must suppress stale one-shots; dialogue needs concurrency policy; all final samples need licence metadata.

## FUTURE INTEGRATION PLAN
After captain review only:
1. add audio modules without deleting current AudioManager;
2. adapt existing M01 player-shot/enemy-fire/round-impact/m01-blast;
3. prove event-count/time and gameplay snapshot/RNG equivalence audio on/off;
4. add priority/voice manager using procedural backend first;
5. add authoritative acoustic query and room/portal metadata;
6. add licensed weapon-specific families;
7. add voiced dialogue and persistent vehicle/aircraft audio only when authoritative state exists;
8. run full Node/build/browser/hardware validation before integration approval.

Do not combine this with battle-sector, destruction, combat-AI, world-interaction, CKM or MG34 work.

## RECOMMENDATION TO CAPTAIN
Approve as an **isolated architecture/prototype checkpoint**, not production audio integration. It preserves simulation authority and gives a bounded path to large battlefield audio. The next safe task is a small adapter integration for existing M01 events with strict gameplay-equivalence tests.

## STOP
Do not merge, publish, touch `main`, integrate production audio or choose another task automatically.
