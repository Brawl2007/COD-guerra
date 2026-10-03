# World Battle State — isolated architecture V1

TASK_ID: `M01-DISTANT-BATTLE-SECTORS-ARCHITECTURE-V1`. Base:
`codex/m01-mg34-prone-runtime @ fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.
M01 remains **PROTÓTIPO JOGÁVEL**. This document and the verification prototype
do not integrate into M01, change schema 2, or approve M02.

## Audit of the exact base

Read AGENTS, DEVELOPMENT_STATUS, RUNBOOK, IMPLEMENTATION_PLAN,
NEXT_CHAT_CONTEXT and relevant PROMPT_MESTRE §71/§75 before editing.

| Existing authority | Evidence in base | Reuse / boundary |
| --- | --- | --- |
| M01 clock | `M01Simulation.advanceBattle`, mission clock segments | Real `clock` and historical `battleClock` are different. Preserve scales, snaps, gates, pause and checkpoint readiness. |
| Five sector schedules | `mission.json.sectors`; `update` samples latest agenda | Metadata currently contains state/strength/morale/supply; not an aggregate formation combat model. S2 strength uses **all alive enemies × 2**, not a historical count or formation ledger. |
| Individual combat | 40 `de_east_*`, 10 `de_spans_*`, 24 `pl_east_*`, cast and CKM crew | Runtime owns these IDs and real rounds. Never create a second casualty authority for them. Six inactive platoon reserves are not automatically dead. |
| Withdrawal casualties | `updateCombat`, `lethalShot`, `resolveRound` | Actual rounds and actor deaths; survivor floor/range 12–18 is gameplay, not established historical losses (SOURCE_CHECK P8). |
| Station | `wounded_dragged`, `evacuateStation` | Fictional patient and real medic task/drag phases; not a separate invented infantry battle in the station. |
| Air / impacts | consumed events, `impact`, `sectors.damage`, `destruction` | Ju 87 first raid, second raid 05:30–05:34 and IDs already exist. Visual/audio consumers must read these events. |
| Save | snapshot/restore/validateM01Snapshot | Schema 2 already persists actors, both clocks, RNG, events, sectors/damage and destruction. This task changes none of it. |
| French sandbox | `src/game/sector-battle.js`, `Simulation`, foundation test | Separate fictional timelines with eight Soldier objects. RNG injected by Simulation. Not M01 research or a new campaign backend. |
| RNG | `src/core/random.js` | Reuse its LCG implementation in isolated streams; never modify or consume M01 RNG. |

## M01 mapping proposal (repository evidence, not new historical research)

| ID | Base definition | Classification / remaining gate |
| --- | --- | --- |
| s1_west_bridgehead | West bridgehead / player, nominal 0–150 m | RECONSTRUCTED geometry/tasks; cast IDs retain individual runtime authority. |
| s2_east_bridgehead | Lisewo, authored 780–1250 m | Mixed claims: operation documented; positions reconstructed; visible 40 and survivors 12–18 gameplay. Do not upgrade entire sector to CONFIRMED from `DOCUMENTED`. |
| s3_station_yard | Station / yard, 250–460 m | RECONSTRUCTED; fictional evacuation separately labelled. No extra opposing infantry introduced. |
| s4_north_perimeter | North, 800–1500 m | Direction reported, earlier contact times dramatized; P9 still partial. No invented tanks/mortars admitted without equipment evidence. |
| s5_sky_east | Sky / east depth, **800–40000 m** in existing metadata | Depth is not traversable map extent. Separate air corridor from ground-sector bounds; do not silently clamp metadata to 5 km. |

SOURCE_CHECK P1/P13 and mission event use west demolition **06:45**, with
06:40 as alternate. Preserve that base decision. P4/P6/P7/P8/P9/P13/P16
remain limitations. This task audits their existing record, not the external
sources anew. The executable fixture is entirely fictional and is **not** S4,
not a roster of real units and not a proposed new mission schedule.

## Contract

All positions are metres, `{x,y,z}` with Y height, matching M01/Three.
Times in the prototype are nonnegative integer milliseconds on an active
operation clock. Historical date/start time and source claims are metadata.

`BattleWorld`: seed, time, ordered sectors, ordered immutable agenda/input,
consumed IDs, event journal. Configuration and the full input log are part
of replay identity. Runtime integration needs a separate versioned adapter;
prototype snapshots are not production saves.

`BattleSector`: id, missionId, provenance `{classification,date,startTime,
claims}`, bounds/center, objective, state, formation IDs, persistent asset
states (fixed weapons, vehicles, destruction, fires, smoke), constraints,
per-sector RNG, revision and last update. Counts are derived from formations,
never duplicated in a writable sector counter. LOD belongs to presentation.

`Formation`: id, faction, unit claim, role, nominalStrength, status runs,
position, direction, objective/state, morale/cohesion, ammunition/supply,
sparse individual overrides. Status runs partition ordinals into combatReady,
wounded, dead, evacuated. They avoid allocating thousands of Soldier objects.
Ordinal-generated IDs are persistent **when resolved**, not stored strings for
all reserves. Named IDs bind authored ordinals; existing runtime IDs require
an explicit imported binding. Known records may grow over a long campaign:
archive only after an explicit retention design, never forget known deaths.

Classifications: CONFIRMED, RECONSTRUCTED, COMPRESSED_FOR_GAMEPLAY,
FICTIONAL_WITHIN_HISTORICAL_CONSTRAINTS, with certainty on each claim.
Policies: HISTORICAL_FIXED (authored macro state), HISTORICAL_BOUNDED
(authored macro plus count limits), DYNAMIC_LOCAL (local macro can change).
Bounds apply **before** a loss; no resurrection or corrective killing to
force a final count. Casualties mean dead; wounded and evacuated are separate.

## Time, determinism and ownership

Do not pick a production 1/5/10 Hz without data. The prototype uses exact
discrete events, independent of frames and caller step partition. Sparse
exposure windows and authored transitions are processed at their scheduled
timestamps, ordered by `(time,id)`. Same-time movement precedes events;
events follow lexical ID ordering, documented as part of the replay contract.
Late inputs at the same time must sort after consumed events; retroactive
insertion is rejected. Adapters should use monotonic input IDs or a later
canonical timestamp. Full accepted inputs remain in the prototype replay config.
Active clock freezes during pause; wall clock never drives outcomes.

Candidate exposure cadence is fixture data, not a shipping balance value.
Loss probability uses an exposure hazard `1-exp(-rate*duration*context)`
with cover, incoming-source suppression/firepower and defender vulnerability
from morale/cohesion/supplies. An exhausted or unarmed target is still exposed.
Incoming exposure does not spend defender ammunition. Linked destroyed MGs
disable their future exposures; damaged MGs halve the fixture firepower.
It models
one at-risk slot per exposure event, not every bullet, and is uncalibrated.
Fixed historical outcomes use authored commands instead of random attrition.
Events record the selected ordinal and actual result, including bounded/no-op.
RNG streams are sector-local, stable under sector ordering and other sectors'
events. Renderer, camera, LOD and lazy IDs consume zero random samples.

NEAR (nominal ≤150 m) eventually uses full runtime actors; MID (≤800 m) uses
formations; FAR uses sectors up to mission-specific extent. Bullet reach is
not capped by LOD. Presentation chooses FULL/GROUP/PROXY/STATE_ONLY and
LOW/MEDIUM/HIGH budgets independently. Occlusion/FOV only choose visual
activation, never whether time or damage advances.

Future exclusive authority: a versioned lease hands a formation to the
individual simulator at a canonical boundary. Its aggregate combat resolver
must suspend for that lease while macro/historical events keep running.
On return, commit all individual deltas atomically then resume aggregates.
This prototype keeps a **single aggregate owner** and produces descriptors,
not full NPC AI. It does not falsely prove the future two-simulator handoff.

## Materialization and return

Resolve canonical ordinals, retain named IDs, status/position/rounds and
asset state; expose full logical counts and casualty runs even when a visual
budget selects only a few actors. Bodies can be represented by records rather
than all rendered meshes. Pure descriptor requests do not mutate gameplay.
On return, an idempotent typed input includes expected sector revision,
member IDs and final state/position/ammunition; reject stale, duplicate IDs,
unknown IDs and resurrection **atomically**. Events and destruction stay in
the same sector journal. Repeated enter/leave requests keep the same IDs.
Formation ammunition is reserve stock; individual rounds are separate loaded
clips. Return may reduce reserve and update the formation anchor; increases
require an explicit resupply input. These are logical bookkeeping units,
not the existing M01 weapon schema. Sparse member positions survive return.

To avoid pop-in, prefetch assets and descriptors in an outer hysteresis band,
stage them at actual positions behind verified terrain/building occlusion,
then activate visuals within budget. Visible proxies crossfade to their same
actor, never relocate. If occlusion is unavailable, retain the proxy until
safe; do not delay logical existence/damage. Hysteresis uses distance to
sector bounds and formation positions (not only center), priority and possible
interaction; entering a shootable sector can preempt a less important visual.
These are integration requirements, not renderer code delivered here.

## Intervention / assets / audiovisual

Inputs carry immutable ID/time/sector/type and payload. Supported prototype
effects: targeted/aggregate losses, rescue wounded, ammunition delivery,
asset damage/destruction and allowed local order change. Saving four soldiers
changes evacuated count and future available strength; cannot reverse a fixed
historical retreat. Fixed timeline still executes. Dead never heal; destroyed
assets never become intact via a handoff. Armour/equipment plausibility is
mission author data with sources, not a generic tank spawn capability.

Journal events contain causal time/sector/type/result and asset/member links.
Asset records include position and optional origin/target for impacts.
Audio/VFX derive smoke/dust/flash, travel delay/occlusion and visual debris;
they never author craters, deaths or vehicles. Consumers deduplicate by event
ID, seek from persistent state after load and never replay obsolete one-shot
audio. Fires/smoke persist until an explicit scheduled state change.

## Integration order and risks

After captain review: implement an adapter for a **non-overlapping** synthetic
formation first, test exclusive authority against real individual rounds,
then bind existing M01 IDs without copying counts or rewriting save schema.
Clock adapter must process battleClock jumps and frozen gates separately from
local motion time; replay fixed history once and run ongoing local actions
on active clock. Never blindly apply an accelerated historical delta to
locomotion. Save migration, mesh activation, proxy hits, map paths, historical
rosters and multiplayer/network replay are not implemented here.

Prototype complexity: event count plus affected status runs/visible budget;
counts independent of NPC objects. Event retention currently grows with
operation duration and needs future checkpoint/archival design. Performance
measurements are Node timings of this tool only, never FPS or Chromebook.
