# Current destruction audit — M01

TASK_ID: `M01-DESTRUCTION-PERSISTENCE-ARCHITECTURE-V1`. Base inspected:
`codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.
M01 remains **PROTÓTIPO JOGÁVEL**. This audit is code inspection, not a new playtest.

Read AGENTS, DEVELOPMENT_STATUS, RUNBOOK, IMPLEMENTATION_PLAN, NEXT_CHAT_CONTEXT
and the relevant destruction/save/renderer clauses in PROMPT_MESTRE. Graphify is
paused by the existing project status; no extraction or graph rebuild was performed.

| Mechanism | Authority and persistence | Presentation / physical result | Gap / preserve |
| --- | --- | --- | --- |
| Planned bridge demolition | `M01Simulation.consume` in `src/game/m01-simulation.js` records `consumed[id]=clock` before its switch; east/west append destruction tokens. Duplicate consumed IDs return false. Readiness gates keep player/allies out of the blast. | `renderState.parts` reads bridge manifest `destroyedBy`/`showAfterEvent`. `M01View.render` selects the corresponding damaged pieces and LOD. | Already event driven, with stable names/logical IDs. Preserve timings, safety gates and geometry. |
| Destroyed geometry / collision | `TczewWorld.refresh` filters bridge collider IDs by `destroyedBy`, removes joints adjacent to destroyed spans, and removes west portals after demolition. | Bridge replacements exist in every LOD; `tools/assets/m01-bridges/src/state.mjs` also demonstrates presentation/collider adaptation without scheduling events. | Ruin collision remains conservative/provisional. Do not infer new collision from GLB debris. |
| Cover changes | `refresh` filters cover nodes using `activeAfter`/`activeUntil`, removes forward bridge cover after west demolition, lowers `cv_forward_post` when its flag is destroyed. | Visual solids mirror selected world obstacles. | Already simulation authority. New rubble cover needs authored proxies and route validation. |
| Forward-post bombing | Consumed event stores `m01.forward_post_state`: destroyed or intact near miss, depending on the player safety rule. `safeImpact` relocates aerial blasts to >=30 m. | Flag affects cover height; impact record drives dust/smoke. | Do not overwrite the actual chosen result with an unconditional historical template. |
| `station_wagon_fire` | `evt_m01_wounded_dragged` appends the token to `destruction`, alongside the existing medic/patient sequence. Token is in snapshots. | No reference to this token in the production renderer/atmosphere. `m01-wagon-damage/manifest.json` proposes same-position burned/damaged variants, fire/smoke sockets and presentation-only debris. | Persistent token exists; mapping to one stable yard wagon and damaged variant is still pending. Do not invent which wagon burned. |
| Fire / smoke / impact VFX | `impact` adds `{id,x,y,z,started,soundAt}` to `sectors.damage` and emits a transient blast. `renderState.damage` derives smoke age (240 s, station bomb persistent). | `M01Atmosphere.update` reads records and caps puffs at 112/192/256 by quality; `M01View` owns transient flashes, dust, bullet impact pools. | Smoke is presentation, not autonomous fire propagation or heat damage. No fire gameplay state yet. |
| Debris / damaged assets | Bridge logical replacement pieces are event linked. Wagon damage GLBs contain a `debris` node. | Wagon manifest explicitly says not to derive collision from broken pieces/debris. | No generic persistent gameplay-debris registry. Preserve existing assets and budgets. |
| Craters | `repair_crater` is an impact ID in `sectors.damage`. | Dust/smoke presentation; terrain height sampling remains static. | No crater radius/depth/movement state, local heightfield or dynamic terrain mesh. An impact name does not prove a physical crater. |
| Wrecks / vehicles | No general vehicle controller or persistent vehicle component state in this M01 path. Trains use consumed events for visibility. | Provisional wagon/aircraft models and fallback presentation. | No generic wreck collision/cover contract; prototype must not claim a drivable/destructible vehicle. |
| Checkpoint / restore | `snapshot()` schema 2 includes destruction, consumed events, flags, sectors/damage, clocks and production RNG. `restoreSnapshot()` validates a clone, constructs a candidate, refreshes world from consumed events/flags, then swaps atomically; emitted events reset. | A restore reconstructs current geometry, rather than replaying every old blast. | Preserve schema 2 and legacy normalization. New subsystem save integration requires a separately approved migration. |
| Validation | Existing `m01-bridges-glb.test.js` checks IDs, replacement links and every LOD; runtime/continuous/cue tests cover events and restoration. | Previous browser results are recorded in the base handoff. | Do not present inherited browser results as runs of this task. |

## Conclusion

Keep the bridge consumed-event adapter and current save path. A reusable subsystem
should normalize **results already decided by the simulation**, offer per-part
building state, bounded persistent proxies, explicit fire/craters/wrecks, stable
event IDs and a pure materialization descriptor. It must not decide casualties,
schedule BattleSector events, move protected blast points or execute on renderer load.

## Audit reproduction

Search `station_wagon_fire`, `east_demolition`, `west_demolition`, `snapshot`,
`restoreSnapshot`, `impact`, `renderState` in `src/game/m01-simulation.js`; inspect
`TczewWorld.refresh`, `M01View.render/syncDamage`, `M01Atmosphere.update`, bridge
manifest/colliders, `tools/assets/m01-bridges/src/state.mjs` and wagon damage manifest.
No production source is changed by this task.
