# Persistent World Destruction State — isolated V1

TASK_ID `M01-DESTRUCTION-PERSISTENCE-ARCHITECTURE-V1`. Base `fbaac1e4`;
branch `codex/m01-destruction-persistence`. M01 is **PROTÓTIPO JOGÁVEL**.
This is an executable architecture prototype, not a production integration.

## Ownership

BattleSector/mission/combat **decides an event occurred and its gameplay results**.
This store validates and atomically persists the resolved changes. A future world
adapter uses the store for collision, cover and traversal; a renderer reads a pure
descriptor. Neither visibility, distance nor graphics quality is an input to updates.
The system never decides who dies or whether a mission objective completes.

## Identity and units

Authored catalog: mission ID, catalog version, stable object ID, category, fixed
position and named parts with initial collision/cover/traversal policies. All
positions are `[x,y,z]` **metres**, y vertical (M01 coordinates); legacy sandbox
32-units-per-metre requires an explicit future adapter. No nearest-position lookup,
array index, mesh UUID or renderer order is an identity. Part addresses are
`objectId + partId`; persistent secondary effect IDs are `eventId.effectId`.
Every object/event belongs to its mission prefix. Catalog order is canonicalized.
Changing IDs or proxy policies requires a catalog-version migration, not guessed matching.

## Data contract

| Record | Authoritative fields |
| --- | --- |
| World | prototype format, missionId, uint32 seed, catalogVersion, catalog, clock, objects, craters, debris, consumed event envelopes |
| Part | structuralState, surfaceState, collisionState, coverState, traversalState, changedAt, causeEventId |
| Vehicle component | mobility, crew, changedAt, causeEventId; fire is independent |
| Fire | active/extinguished, ignitedAt/extinguishedAt, intensity, damageClass, spreadAllowed, sourceEventId, causeEventId |
| Crater | stable id, targetId, center, radius, depthClass, affectsMovement, affectsCover, createdAt, causeEventId, persistent budget class |
| Gameplay debris | stable id, targetId, center, proxyClass, collisionState, coverState, traversalState, createdAt, causeEventId, budget class |
| Event | stable id, missionId, simulation time `at`, ordered operations |

Structural states `intact → damaged → heavily_damaged → partial_collapse → destroyed`
are monotonic in this prototype. Burning/burned is not a mutually exclusive
structural enum: a broken wall, damaged roof, intact door and active fire coexist.
`surfaceState` separately records `clean/scorched/burned`, monotonically, so
extinguishing an emitter cannot remove burn marks or restore the intact material.
No repairs/resurrection are supported here. Future repairs need explicit authorized
operations and tests. Physical/cover/traversal policies are **resolved authored
results**, not inferred from a mesh or from a single structural enum.

Vehicle mobility `operational/disabled/destroyed/wreck` is monotonic. Crew
`present/abandoned` is orthogonal; burning is the fire component. Wreck cover and
road blocking are addressed through the vehicle's parts/proxies. No VehicleController.

Fire has explicit start/extinguish time, low/medium/high intensity, `none/heat`
gameplay damage policy and spread permission. Spread permission is metadata only;
no propagation, timers or heat-damage simulation runs in this task. Smoke is derived
presentation from active fire; gameplay obscuration is deliberately deferred and
would require authoritative volume/time state shared by every quality preset.

## Transactions, determinism and budgets

Events apply atomically to an immutable copy. Unknown target/part, invalid enum,
non-finite coordinate, duplicate effect ID, invalid fire transition, regression,
foreign mission or out-of-order new event rejects the whole update. The caller must
deliver a single deterministic order `(at, producer sequence)`; no commutativity or
late-event rollback is claimed. Duplicate exact envelopes are no-ops even after
restore; reused event IDs with different payloads are errors, never silently ignored.
The store saves full accepted envelopes in the prototype to prove replay coherence.

Secondary crater/debris placement uses a local uint32 PRNG hashed from world seed,
event ID, target and effect ID, with explicit maximum XZ jitter. It never consumes
production RNG. Coordinates are quantized to millimetres. Gameplay radius/depth,
cover and movement policies come from the event, not randomly from the renderer.
Same seed/catalog/ordered events gives canonical byte-identical JSON. Neither
`Math.random()`, wall time, camera nor quality enters authoritative results.

| Budget | Retention / bound in prototype |
| --- | --- |
| PERSISTENT_CRITICAL | Authored parts, vehicle/fire state, consumed events; <=512 objects, <=32 parts per object, <=2048 events, <=64 operations per event |
| PERSISTENT_LOCAL | Gameplay craters/debris; <=256 combined records, retained across unload/save; never drop silently when full |
| VISUAL_TEMPORARY | Presentation fragment counts 4/12/24; never serialized or admitted as gameplay debris |

Canonical payloads are <=2 MB, nested <=16 levels, with only finite JSON data and
no prototype/Three.js fields. Capacity rejects atomically; budgets are demonstration
limits, not a measured production tuning recommendation. The event log is bounded
but grows: a future production design needs versioned compaction + durable consumed
receipts, without forgetting IDs or changing replay semantics. No 500 individual stones.

## Materialization and physics

`materialize(world,id,quality)` returns a fresh data descriptor: current per-part
variants, collision/cover/traversal, vehicle, active fire, craters and gameplay debris.
Quality changes only presentation fragment count and aesthetic smoke density.
It has no clock advance, update, blast, casualty, sound or event emission. Renderer
loading must read the **latest** store after async asset resolution; an obsolete
generation is discarded. On unload, dispose views only, keep authoritative state.
On reload, instantiate the damaged variant directly, never first display intact and
then explode because a player approaches. Missing damaged art uses a damaged proxy;
missing art cannot resurrect a collider or cover.

Physical materialization is a separate future adapter: authored stable proxy IDs
enable/remove wall blockers and cover, insert rubble proxies and invalidate local
navigation caches. Wall removed + rubble inserted is one transaction. The prototype
proves the descriptor, not actual pathfinding, rendering or terrain collision.
Crater presentation can use decal, pre-modelled mesh, terrain variant or heightfield;
movement/cover uses the same saved record regardless of technique.

Explosion integration contract (documented, not executed here): resolved origin,
force class, direction, distance and authoritative cover/occlusion result, with
event/victim IDs. Mission/combat decides death and casualties once. Ragdoll/debris
physics only presents that result; it cannot generate mission events or determine
a death. Transient explosion/sound is emitted on **accepted new events only**, never
by materialize or restore. The state store itself emits no transient effects.

## Save / restore

Format `destruction-prototype/v1` is separate from production save schema 2. A
canonical snapshot includes catalog and accepted events plus logical results.
Restore parses bounded plain data, reconstructs initial catalog, replays accepted
events without external effects and compares the entire canonical logical result.
It returns a new immutable store only on success. Unknown versions, altered objects,
event conflicts, duplicate receipts and inconsistent crater/debris/fire state reject.
Reordered JSON keys are accepted; reordered event history is not generally equivalent.
No production loader imports this module. Double restore must preserve bytes.

## Integration plan for a separate approved task

1. Captain reviews this audit/prototype and coordinates the BattleSector boundary.
2. Author a catalog/mapping for actual M01 targets; station wagon identity is still
   unknown. Example house/truck below are synthetic, not historical claims.
3. Adapter converts existing **resolved** bridge/forward-post/wagon results to state;
   consumed M01 events remain authoritative. Do not run a second demolition or RNG.
4. Establish a single event queue/ordering, units conversion and stable IDs for every
   producer, plus bounds/compaction strategy. Author collision/navigation proxies.
5. Add separately approved save migration and atomic whole-world restore; explicitly
   test old schema 2, clock/gates, RNG, casualties, CKM/MG34 and bridge safety.
6. Materialize latest descriptors in renderer, fallback and sector loading; validate
   stale async loads, LOW/MEDIUM/HIGH parity and off-camera return in the real browser.
7. Measure hardware and run human historical/visual review before mission approval.

## Reproduction

`node tools/verification/m01-destruction-state-prototype.mjs --out <directory>`
produces canonical scenario JSON/CSV plus nondeterministic measured timing metadata.
`node --test tests/m01-destruction-state-prototype.test.js` verifies the isolated
contract. No FPS, GPU, actual ruined-house rendering or M02–M30 runtime is claimed.
