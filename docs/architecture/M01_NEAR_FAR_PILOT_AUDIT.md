# M01 near/far authority pilot — production audit

TASK_ID `M01-NEAR-FAR-AUTHORITY-RUNTIME-PILOT-V1`. Requested model/effort:
GPT-6.1 Sol HIGH. Production base `5f3cc34f53c61beec52255d67f8babd7194c9f7f`,
branch `codex/m01-near-far-authority-runtime-pilot`. M01 remains a playable prototype.

## Exact production boundaries

| Concern | Existing authority and integration boundary |
| --- | --- |
| Actors | `M01Simulation.reset`: 12 cast entries excluding Jan, 40 `de_east_*`, 10 `de_spans_*`, 24 `pl_east_*`, CKM crew; validator accepts the fixed 86/89 legacy roster. Preserve that roster. |
| Motion | `updateActors`, `moveActor`, `TczewWorld.move`; scripted platoon/CKM/medic motion remains outside this pilot. |
| Combat | `updateCombat`, `eastFire`, `spansFire`, `burst`, `landRound`, player `fire` and grenades. Gate the selected actors out of the legacy AI; reuse collision and real rounds rather than a second damage resolver. |
| RNG | `Random` LCG in M01; rifle spread, Gaussian burst dispersion, target choice and player-hit tuning consume it. Pilot sector uses one separate sector LCG; individual streams are stable actor-derived xorshift streams. No formation RNG. |
| Save | `snapshot`, `restoreSnapshot`, `validateM01Snapshot`; candidate restore commits only after validation. Optional additive pilot data must validate its projections against the unchanged roster. |
| Checkpoints | Flat CP-A..D; continuation preserves flat `resumeCheckpoint`. Both must include the current ownership boundary when pilot data exists. |
| Casualties | Health/alive and persistent actor IDs; withdrawing Polish count has its own bounds and designated victims. None of these victims are pilot members. |
| Ammunition | NPC `rounds` currently starts at five and is not a complete WorldWeapon. Pilot clips stay five; one disjoint formation reserve, explicit reload/cycle state and spent count. |
| Clocks | M01 active `clock` seconds and segmented historical `battleClock`; host pause prevents tick. Pilot time boundaries use active time, never historical deltas or wall time. |
| Diagnostics | Read-only `Game.diagnostics` exposed only by `?debug=1`. Add a compact pilot summary, not instances or mutation controls. |

## Selected actors: four existing anonymous riflemen

Pilot combat sector: `m01_pilot_lisewo_dike`, a logical isolated sub-sector of the
existing S2 geography. Formation: `m01_pilot_dike_riflemen`. It has exactly one
aggregate RNG shared by its whole mutating resolver. S2's existing schedule and
strength metadata are not another BattleSector combat resolver.

| Actor ID | Authored position (m) | Existing role/weapon |
| --- | --- | --- |
| `de_east_36` | (1088, -1, 84) | RIFLEMAN / kar98k |
| `de_east_37` | (1094, -1, 88) | RIFLEMAN / kar98k |
| `de_east_38` | (1076, -1, 92) | RIFLEMAN / kar98k |
| `de_east_39` | (1082, -1, 96) | RIFLEMAN / kar98k |

These are `grp_de_east` dike riflemen, classified by mission data as gameplay
dramatization. No cast ID, gate MG, bridge German, Polish withdrawal victim,
station/medic/engineer, CKM member or destruction participant is transferred.
Historical gates do not reference these IDs. Train activation is a macro signal
delivered to the current owner; it must not start their old AI as well.

## Geometry finding: do not fake physical approach

The playable bounds end at X=440, with out-of-bounds at X>401. German validation
requires X>=690. The chosen soldiers are at X>=1076. A normal player cannot walk
within the nominal 150 m band. Extending the map, moving Germans west or fabricating
a stretched formation bounding box would change the mission and is excluded.

The approved lease contract also admits **interaction relevance**. Use real world
line of sight and the existing player rifle's 1200 m reach, independent of looking
direction/quality, to wake individual authority on a shootable formation. Approaching
along the playable bridge can open that sightline. Physical distance still uses the
approved acquire <=150 / retain <=170 hysteresis; tests distinguish physical-band
fixtures from the reachable ranged-interaction path. Do not report that the player
walked up to these soldiers. Rays and rounds continue to respect actual solids.

## Transaction design

Only AGGREGATED or INDIVIDUAL is persistent. The source aggregate is frozen during
lease; staged descriptors and returns are synchronous data-only transactions.
The four roster entries are projections, excluded from old movement/fire loops.
Only the active owner mutates their combat ledger. A failed member-3 preflight
publishes no actor, consumes no RNG, and changes no token/revision.

Return includes every ID/status/health/position, magazine, cycle, stable weapon
reference, member RNG/brain, formation reserve and authorized local progress.
It must equal the current authoritative individual export. Tokens include transfer
generation and source revision/fingerprint; duplicates and stale returns reject.
Rebase the aggregate motion/exposure boundary at release; do not replay the lease.

The 5→7 casualty test may seed five retained **already dead** ordinal records as an
explicit test fixture of the same formation, then kill two of the four real roster
members through player fire. Production reset starts with no invented earlier
deaths. Those fixture records are not five extra live NPCs or a historical claim.
Report this distinction and preserve all dead positions; never add totals on return.

## Approved sources read, not merged

- BattleSector `fe2d99f9f343aeb526a95eca048bb010b155ad75`: sector RNG/revision,
  status counts, pure descriptors, sparse known bodies and disjoint reserve.
- Combat AI `3da1f1637167a3d90953d4f698ebcf5c4b16cf26`: observation→intent,
  local timers, reload/suppression, explicit RNG and world-query boundary. This pilot
  uses a limited rifleman HOLD/reload/fire adapter, not the whole tactics prototype.
- Authority Lease `d12972fcfb4ec908be115c831392209560bbeba7`: exclusive sector lock,
  fenced atomic transfer, exact return, frozen aggregate stream and no catch-up.

No blind merges, Graphify, main, M02, model/bridge/wagon/audio/animation/destruction
architecture changes. Publish each functional block before proceeding. Final proof
must include future A/B after an active-lease save, full Node/build/browser and a
pilot-specific browser case; this audit is not validation evidence.
