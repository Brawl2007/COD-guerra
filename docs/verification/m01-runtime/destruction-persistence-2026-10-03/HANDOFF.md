# Handoff — persistent destruction architecture V1

**TASK_ID:** `M01-DESTRUCTION-PERSISTENCE-ARCHITECTURE-V1`  
**MODELO solicitado:** GPT-6.1 Sol (model identity is not independently attested by repository tooling)  
**ESFORÇO solicitado:** HIGH  
**BASE:** `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`  
**BRANCH:** `codex/m01-destruction-persistence`  
**HEAD implementação/testes:** `54aed8ed9337f73507b5ad4b96950b3247a5b07b`  
**HEAD FINAL:** the documentation/evidence commit containing this file; exact SHA is delivered with the final response and is resolvable from the branch ref. A commit cannot embed its own SHA.  
**STATUS:** isolated prototype complete for captain review; M01 remains **PROTÓTIPO JOGÁVEL**.

## Published checkpoints

| Checkpoint | Commit | Result |
| --- | --- | --- |
| 1 audit | `4a805a60326f6fcbc7fc2573a763b00ca9ec182d` | Existing mechanisms and gaps inspected |
| 2 architecture | `04f9415526ed30966b8d210be19dd33bf46ae2cb` | Identity, authority, budgets and integration contract |
| 3 prototype | `0ec72c7b342efda4e908b0b03b2fc6f2251d9d56` | Pure transactions, PRNG, canonical serialization and descriptor |
| 4 persistence | `719bd92cc06e8371c01ec8919c4041ecd85d845b` | 8 focused tests, malformed/duplicate restore and atomic rejection |
| 5 materialization | `1d9a98a3c39c6727a5c16f8d6c2a506e3e86022e` | 17 focused tests, off-camera/quality/unload equality |
| 6 complete tests | `54aed8ed9337f73507b5ad4b96950b3247a5b07b` | 29 focused tests; deterministic geometry, burn marks, budgets and fresh-process equality |
| 7 handoff | This commit | Raw logs, scenario JSON/CSV, measured timings, preservation and continuation docs |

All checkpoints are published on this branch. Git transport was read-only in this
environment; authenticated GitHub ref updates were used with `force:false` and the
local checkout reconciled to the remote commits. No main merge, deployment or other
worker integration was requested or performed. Only approved new files and
`docs/NEXT_CHAT_CONTEXT.md` changed; status/runbook/plans and production files remain intact.

## Audit and architecture

- [Current destruction audit](../../../architecture/CURRENT_DESTRUCTION_AUDIT.md): bridge consumed events already reconstruct geometry/collision; station wagon fire is a saved token without damaged-model materialization; impact IDs do not prove physical craters.
- [Architecture and integration plan](../../../architecture/DESTRUCTION_STATE_SYSTEM.md): full contract, ordering, budget and ownership boundaries.
- State model: immutable catalog + composed per-part structural/surface/physical policies + orthogonal vehicle/fire components + persistent craters/debris + consumed event envelopes.
- Stable IDs: authored mission-prefixed object ID and named part; secondary record `eventId.effectId`. No index, mesh object, renderer ordering or nearest-position identity.
- Buildings: roof partial collapse, wall/windows destroyed and door intact simultaneously; clean/scorched/burned surface state remains after extinguishing.
- Craters: stored center/radius/depth, movement/cover policies and event/time; rendering technique is independent, no terrain deformation claim.
- Vehicles: operational/disabled/destroyed/wreck mobility with present/abandoned crew and separate fire; hull/cover/road-blocking result is explicit, no driving controller.
- Fire/smoke: ignition/extinguish and heat/none policy persist; spread permission is metadata. Quality changes aesthetic smoke, no gameplay obscuration or propagation implemented.
- Cover/debris: wall cover removed and low rubble cover inserted atomically; one bounded gameplay proxy, temporary fragments excluded from save.
- Off-camera/materialization: current damaged state loads directly after return or restore. Loading/unloading a descriptor cannot consume/emit events or resurrect structure.
- Ragdoll/impact: future combat resolves origin/force/direction/distance/cover and casualties; visual physics does not decide death. Documented only.

## Proofs and results

Environment: Node **v24.19.0**, Linux x64; `npm ci` succeeded with fixed lockfile.

| Validation | Result / evidence |
| --- | --- |
| `node --test tests/m01-destruction-state-prototype.test.js` | **29/29 PASS**, 0 failures/skips; `focused-tests.log` |
| `npm test` after final code changes | **253/253 PASS** = 224 existing + 29 new; 32,082.973 ms; `node-tests.log` |
| `npm run build` | **PASS**; inherited large JS chunk warning; `build.log` |
| Canonical JSON/CSV generator | Six combinations of visible/unloaded and LOW/MEDIUM/HIGH, save/restore/double restore equal, duplicate unapplied; `scenario.json`, `scenario.csv` |
| Separate Node processes | Identical JSON/CSV bytes; timing metadata intentionally excluded from deterministic comparison |
| Same seed / varied seed | Same seed identical; alternate seed varies bounded secondary positions only, authored building result retained |
| Persistent local cap | 256 craters retained; 257th rejects atomically; no silent dropping |
| Restore corruption | Changed state, missing crater, altered receipt, duplicate receipt, unknown format, non-finite/unsafe fields rejected |
| Camera / quality fields in event | Rejected; neither input influences authority |
| Production preservation | `src`, browser tests, assets, missions, package/lock/config/workflow trees identical to base; `preservation.json` |
| Independently built baseline vs candidate | **77/77 dist files byte identical**, SHA-256 manifest in `preservation.json` |
| Browser / human / Chromebook | **Not executed/measured in this task**. No browser-facing source changed; descriptor tests are not a playtest or visual proof. Prior base results are not counted here. |

One pre-final test fixture expected the event-count error while accidentally exceeding
the earlier byte-size guard. It was reduced to small valid receipts, then the
intended event-count guard passed. No production behavior was changed to satisfy it.

## Measured performance

`performance.json` records 20 samples, three synthetic objects, two accepted events,
one crater and one rubble proxy, **5,510 bytes** serialized. Mean host CPU costs:

| Operation | Mean |
| --- | ---: |
| Apply two events | 0.502 ms |
| Serialize | 0.075 ms |
| Restore with replay | 0.862 ms |

These are measured small-fixture costs on the execution host, not scalability,
GPU, Chromebook or FPS results. FPS is **NOT_MEASURED**. Raw min/max are retained.

## Limitations and risks

This is tooling + tests + design only. The house/truck/bridge catalog is synthetic;
it does not establish a historical house, identify the station wagon or modify a
real bridge. No production import, renderer, collider, save schema, RNG, weapons,
CKM/MG34, BattleSector, vehicle controller or M02 runtime changed.

The isolated store serializes a bounded full event history and replays it on restore.
Large campaigns need measured compaction/versioning and durable consumed receipts;
updates are copy/validation operations, not an optimized production store. Events
must arrive in deterministic chronological order; late-event reconciliation is not
implemented. Fire spread, heat damage execution, smoke gameplay, continuous terrain
deformation, real navigation invalidation, ragdoll and async renderer loading are
documented future integration concerns, not demonstrated runtime behavior.

Production must authenticate the authored catalog/version, bind actual stable IDs,
preserve resolved blast safety results and avoid deriving colliders from GLB debris.
Canonical millimetre positions and event-local PRNG are versioned contract decisions;
changing them requires migration. A future save adapter must validate the whole world
atomically and keep schema 2 legacy behavior until an approved migration exists.

## Recommendation to captain

Review and approve the **isolated contract** as the candidate boundary between
BattleSector producers and physical/presentation adapters. Coordinate target IDs,
event order and policies with that worker. Choose a separately scoped production
adapter only after authored targets, collision/navigation proxies and save migration
are agreed. Keep existing bridge consumed-event semantics and station rescue logic.
Do not count this as a finished in-game destruction feature or approval of M01.

**PARAR. Do not integrate, touch main, start another task or expand the campaign.**
