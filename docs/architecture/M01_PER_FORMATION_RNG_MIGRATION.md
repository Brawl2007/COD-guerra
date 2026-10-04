# M01 per-formation RNG migration — architecture V1

TASK_ID `M01-BATTLESECTOR-PER-FORMATION-RNG-MIGRATION-ARCHITECTURE-V1`.
Requested model/effort: GPT-6.1 Sol / HIGH. No delegation.
Analysis base: `codex/m01-near-far-authority-runtime-pilot` at
`f2741e53a85c582b4e0739e3a946f534fbe25dde`, draft PR #39.
Working branch: `codex/m01-per-formation-rng-architecture`.
M01 remains **PROTÓTIPO JOGÁVEL**. This is an isolated specification and executable
proof; no production changes, schema2 changes, branch merges or second real formation.

The player sees no change from this task. A later reviewed migration can allow
nearby individual soldiers in A and distant aggregate combat in B/C to continue
simultaneously. It cannot promise the same future as the old shared random stream.

## Exact audit of #39

The references below are source locations at the exact analysis commit, not claims
about current main. [Coordinator](https://github.com/Brawl2007/COD-guerra/blob/f2741e53a85c582b4e0739e3a946f534fbe25dde/src/game/m01-authority-coordinator.js)
and [adapter](https://github.com/Brawl2007/COD-guerra/blob/f2741e53a85c582b4e0739e3a946f534fbe25dde/src/game/m01-sector-runtime-adapter.js)
were read from Git. Approved architecture was read, without merging:
BattleSector `fe2d99f9f343aeb526a95eca048bb010b155ad75`, and Authority Lease
`d12972fcfb4ec908be115c831392209560bbeba7`.

| Current contract | Exact source and consequence |
| --- | --- |
| RNG storage | Coordinator lines83–84: private `#state.sectorRng={state:(seed ^ hash32(PILOT_SECTOR))>>>0,draws:0}`. It is not a stream on each formation. Adapter `createPilot` captures `sim.rng.state` as constructor seed; subsequent pilot draws are separate from main RNG. This captured seed is not automatically the immutable mission-start seed required for new formation derivation. |
| Aggregate revision | Coordinator line82: `aggregate.revision`, initialized0; `resolvePilotSector` increments it after each aggregate step. Individual data is a copy with its own active revision. There is only one represented formation in this coordinator. |
| Fingerprint | Coordinator line12: `canonical({aggregate:s.aggregate,sectorRng:s.sectorRng})`. In #39 the fingerprint is the full canonical JSON **string**, not SHA-256. It includes aggregate members/streams/resources/revision/timers plus the sector stream. The approved isolated lease architecture used SHA-256; that distinction matters. |
| Whole-scope freeze | Coordinator lines131–132 compare that source before/after individual steps. Adapter `resolvePilotSector` requires AGGREGATED, null individual and null lease before any aggregate RNG/movement/ammo. `advancePilot` chooses one resolver. The dedicated pilot sector currently contains only four bound IDs; B/C are not already implemented there. Reusing that same guarded resolver for multiple formations would freeze its whole scope. |
| Aggregate draws | Adapter aggregate resolver chooses a live member and velocity from `draw(s.sectorRng)`. Formation list/target-selection changes would change later consumers if this stream stayed shared. |
| Member streams | Coordinator lines77–80: one persisted nonzero xorshift32 stream per `de_east_36..39`, hash of captured seed, formation ID, member ID, version tag. Adapter individual decisions and Gaussian rifle dispersion use only that member stream. They persist in combat state through return; no reroll on approach. |
| Receipts | Coordinator lines135–142: owner/token validated first, canonical `{owner,token,operations}` matched by eventId, matching duplicate no-op, conflicting duplicate error, capacity256 with explicit rejection. Receipts persist. New design separates delivery/retry acknowledgement from authorization of a new effect. |
| Ammo | Coordinator line36: `reserve + spent + sum(member.ammo.loaded) == initialAmmunition`; initial100 plus loaded magazines. Adapter reload transfers from reserve to loaded on completion/explicit reload; fire subtracts loaded, increments spent. Dead weapons retain their rounds. No shared sector supply gateway exists in this pilot. |
| Return | Coordinator lines115–119 checks token/generation/source revision/fingerprint and exact complete current individual payload. Replaces aggregate, increments revision, sets `updatedAt=localClock`, `nextAggregateAt=localClock+2`, zeroes velocity. No catch-up for leased time. |
| Save | M01Simulation snapshot/restore/validation persists optional `authorityPilot` in schema2 and projects the same actor IDs. This architecture does not modify that field or the schema. |

BattleSector's approved `battle-sector-model.mjs` stores sector `rng/revision`,
moves all formations in `moveTo`, and spends the shared stream for exposure.
Its visual materialization is not an authority lease. Authority Lease V1 explicitly
requires a whole-sector lock until this migration is designed.

Simply renaming `sectorRng` would leave shared revisions/fingerprints, motion
boundaries, receipts, resources and cross-formation writes coupled. It would also
silently change lineage without deciding how old saves and active leases survive.

## Ownership, derivation and persistence

| Question | Contract |
| --- | --- |
| Who owns each formation RNG? | Exactly the formation's current owner. Aggregate resolver alone consumes its LCG. While INDIVIDUAL, the frozen aggregate stream is carried unchanged and member xorshift streams advance under individual authority. Return preserves both kinds; streams are never mixed. |
| How derived? | Canonical tuple `[RNG_TAG,domain,derivationSeed,sectorId,formationId,memberId-or-null]`, SHA-256, first big-endian32 bits, nonzero fallback. ASCII stable IDs; no array index, insertion order, camera, time, lease generation or gameplay-global draw. Formation domain differs from member domain. |
| When persisted? | State and draw counter are part of every complete snapshot/transfer. Derive once at formation creation or explicit migration boundary; never at materialization/reentry/restore. Tag, mission seed and lineage derivation seed persist too. |
| ABA/stale return? | Formation-specific monotonic generation in lease ID, immutable source revision and fingerprint, exact current complete combat payload. A prior payload cannot overwrite later same-lease combat, and a prior lease cannot affect a new generation. |
| Shared sector state? | Separate revision, one resource gateway, conservation ledger and receipts. Formation return never writes shared state or B/C. Terrain/destruction/objective/artillery/control dependencies remain versioned shared references. |
| Simultaneous events? | Complete sealed timestamp batches sorted by `(at,priority,sectorId,formationId,eventId)`. This prototype is one sector S, so sectorId is constant. External envelopes priority0, fixed100ms formation steps priority1. Sector envelopes use empty formationId, therefore precede formation commands at equal time. Lexical ASCII comparison, no locale sort. |
| Two aggregated formations? | Local reducers touch only local state. Attack/suppression envelopes identify source and target. Coordinator validates source owner, spends source ammo once and routes effects to target's current owner. |
| Aggregate vs individual? | Same envelope gateway; it updates target individual state if leased, never the frozen target aggregate. Source and target updates are one candidate transaction. |
| Save two leases? | One complete graph: two frozen sources, two active individual records, tokens/generations/member streams, third aggregate, shared resource ledger, receipts and clocks. No independent partial save files. |
| Restore deterministic? | Validate/checksum entire candidate, then publish once. Both active owners are reconstructed from saved state; no duplicate aggregate resolver. Double restore at same boundary is idempotent. |
| Legacy saves? | Preserve legacy reader/lineage or migrate once at an explicit safe boundary. Freeze active controllers and pending inputs first. See migration policy below. No production importer is supplied here. |
| Formation array reorder? | Sort by stable ID at creation, members by canonical ordinal, save arrays canonically, and all event target application by stable IDs. Streams/lease/member/event IDs do not use iteration position. |

RNG streams are independently mutable, not a claim of perfect statistical
independence or collision-free32-bit seeds. Two derivation inputs could hash to
the same32-bit initial value; they still have separate ownership/state. Changing
the algorithm/tag/cadence requires a new lineage, not a silent implementation edit.

## Revisions and lease fences

`formationRevision` protects local ammo, member status/body positions, motion,
member streams, objective progress, suppression and local reference projections.
Active local updates increment only that formation. Frozen source revision remains
unchanged during a lease. Acquire and return each advance the active result revision.

`sectorRevision` protects shared supply decisions, authoritative result references,
artillery/control/macro-objective changes. B's local tick does not increment it.
It does not protect independent A movement or A's RNG. Later stores may have
separate resource versions to reduce false conflicts; this prototype uses one
small shared ledger deliberately.

Lease: `id,sectorId,formationId,owner,generation,sourceRevision,sourceFingerprint,
acquiredAt,memberIds,sharedSectorRevision`. Source fingerprint is SHA-256 over
only that formation's frozen aggregate plus identity; it includes its RNG and
member streams. It excludes B/C, global clock and unrelated shared supply.

Default `sharedSectorRevision=null` means a local return has no long-lived shared
dependency. Actual supply spending is fenced at its timestamp separately. For a
lease which explicitly declares a shared dependency, return rejects any revision
change. `reconcileShared` validates current token/generation and shared revision,
runs a synchronous data-only adapter preflight, then acknowledges the dependency
and bumps local revision. Rejected reconciliation leaves everything intact.
No return can silently refresh that fence; stale pre-reconciliation payload fails.
The prototype's callback proves the transaction boundary, not collision/terrain
reconciliation logic for real assets.

Only AGGREGATED and INDIVIDUAL are serialized authority states. Materializing,
dematerializing and dependency reconciliation are private synchronous routines.
Staged factories must be pure data preflights; arbitrary external side effects
cannot be rolled back. Reentrant mutations/save attempts and partial/altered
descriptors/returns reject before publication.

## Envelope ordering, receipts and resources

Input providers must submit all known events for a timestamp before sealing the
interval. The prototype accepts only new events in `(clock,clock+dt]`; a late new
event at a sealed timestamp is rejected, not reordered retroactively. Matching
retries return stored outcomes without another draw, casualty or spend; conflicting
reuse of eventId rejects. Duplicates within the batch collapse. Receipts are retained
to50000, then operations reject explicitly; production compaction needs a reviewed
checkpoint watermark and replay window. No receipt is silently evicted.

Same-time requests carry the **shared revision at the start of that timestamp**.
Both A/B are checked against that common fence. Canonical serial resolution then
grants each request all-or-nothing if sufficient reserve remains. A denied request
gets a persisted denial receipt and advances shared decision revision. Retrying it
does not become a later grant. A different request needs a new eventId/current fence.
Stale revision or invalid command aborts the entire candidate batch, including
earlier candidate changes to B; live state remains intact.

Fixture: shared reserve100, A asks70, B asks70 at the same time. A receives70,
B receives0 with explicit denial, sector remains30. Reversed input gives the same
receipts and state. No negative reserve or duplicated transfer.

Local reserve and loaded magazines remain disjoint:
`local reserve + loaded + spent = initial local ammo + shared delivered to formation`.
Shared conservation:
`sector reserve + sum(delivered) = initial sector reserve`.
Local receiving and shared debit are committed together, including when A is leased.
Ammo27 reload transfers yields100→73; firing the original5 plus27 replenished
rounds is accounted separately. Return itself cannot resupply.

Attack validates source member/ammo, then applies a named target loss. Suppression
is routed similarly. Artillery carries explicit stable member targets, and shared
destruction carries external authoritative result ID/version and affected formation
IDs. Effects are sorted and deduplicated by eventId, and applied as one candidate.
There is no direct reference to another formation's mutable internals available to
an AI caller. Destruction references are read-only projections; this prototype is
not a destruction controller or a second WorldWeapon/vehicle ownership store.

## Casualties, clocks and bodies

Counts derive from member status, never from additive death totals at return.
Required fixture: A has5 dead, leases, receives2 additional deaths and returns7;
B starts3 dead, receives1 aggregated loss and finishes4. Total11.
Cross-formation casualties require an explicit named envelope.

Every synthetic member/weapon has stable ordinal identity. Dead and evacuated
members never follow anchor motion; wounded remain stationary absent explicit
assistance. A return replaces only A, preserving B's bodies/positions. Bodies
retain original IDs and loaded weapon ammo; no actor recreation or resurrection.
Production named bindings must preserve `de_east_36..39`, not rename them to the
prototype's `A/soldier/ordinal` IDs. This synthetic model does not add those actors.

Clock units are integer milliseconds and positions integer millimetres, enabling
exact comparisons. A single coordinator advances local clock; each formation
steps on an absolute100ms quantum, only through its active owner. AcquiredAt is
local time, not wall time/expiry. Zero-dt and pause freeze clocks, streams, motion,
transfers driven by tick and events; callers must not issue standalone boundary
commands while paused. Formation return rebases updatedAt to current local time;
the next quantum cannot replay leased-time aggregate movement/RNG/ammo.

The prototype persists battleClock separately and advances it1:1 for its synthetic
fixture. It does not reimplement M01's historical holds/snaps/gates. Production
must map battle events once onto the local event timeline and retain current M01
clock semantics; a historical jump must never become formation motion dt. Camera,
quality and render budget are absent/rejected inputs. Runtime materialization
policy and approved hysteresis are unchanged by this architecture.

## Save, restore and legacy boundary

Save envelope: `{format:'per-formation-authority-prototype/v1',payload,checksum}`.
Payload stores seed/tag/lineage, canonical formations with every owner/source/
active record/lease, shared ledger and references, receipts and both clocks.
SHA-256 detects corruption; strict shape, IDs, integer bounds, conservation,
generation/source fingerprint and terminal-body invariants validate even when
a malformed payload's checksum is recomputed. This is integrity validation,
not adversarial authentication; a wholly fabricated internally valid history
requires a separate trust/security policy outside this local prototype.

In-place restore rejects generation, clock, combat/shared revision or receipt
rollback. A repeated load of the same safe boundary changes nothing. An intentional
older checkpoint creates a **new session/fork** using a fresh restore instance,
after quiescing/detaching old controllers and queued callbacks. Production adapter
must also fence async controller bindings by session incarnation; such browser/
worker integration is not implemented or claimed by this synchronous prototype.
Never merge a returning controller from the abandoned session into restored actors.

`migrateLegacy` demonstrates a strict synthetic `legacy-sector-rng/v0` boundary:
no active leases or pending events, validated roster/ammo/bodies, archived old
stream and canonical legacy digest. It derives a lineage seed from mission seed,
sectorId, boundary clock, old stream/state/draw count and `lineage-split-v1`, then
derives per-formation streams once. Persist that derivationSeed. If legacy member
streams already exist, preserve them exactly; only missing streams are initialized.
A present malformed stream rejects rather than silently reseeding. Input array
order is normalized even for the archived legacy digest.

**Migration changes deterministic lineage.** The old shared stream routes draws
depending on all formation activity/leases. Splitting it changes which draws a
formation receives when a neighbour is leased or reordered. Preserving that old
future generally requires retaining the original shared draw scheduler/whole-sector
lock, defeating independent progress. No general bit-perfect equivalence is promised.
Keep the legacy interpreter for old replays or explicitly fork at migration; label
the changed lineage and checkpoint version. Do not reinterpret an old replay as v1.

This converter is not a real schema2 importer. A future #39 adapter must retain
its existing named IDs, weapon cycles, member RNG, prior checkpoints and legacy
reader; it needs explicit clock/binding translation and a separately reviewed save
extension/version boundary. This task does not choose or write a production schema.

## Production migration plan and acceptance gates

| Phase | Work and exit criterion |
| --- | --- |
| PHASE0 | Preserve current reviewed #39 single-formation/whole-scope lock and existing38 browser cases. No production change from this architecture. |
| PHASE1 | Separate formation-local stream/revision/generation/fingerprint while still supporting just the current four real IDs. Fix derivation seed at immutable mission identity/boundary; preserve existing member RNG. Prove lease/return, exact future save/restore and session fencing. Keep shared mutations locked until phase2. Explicit lineage boundary; no silent schema2 reinterpretation. |
| PHASE2 | Implement typed shared resource gateway/receipts/canonical batching with transactional publication and per-store dependency versions. Preserve authoritative destruction/weapon/vehicle ownership. Prove simultaneous contested spending, denial/retry, partial-failure rollback and stale dependency reconciliation. |
| PHASE3 | Add a separately selected second noncritical real formation only under a new order/branch. Prove A individual/B aggregate with production movement/fire/hitboxes/save/browser, protected MG34/CKM/station unchanged. Do not add `de_east_32..35` as part of this task. |
| PHASE4 | Multiple formations in one sector with overlapping leases and real artillery/cross-fire/destruction/result routing. Resource and historical-boundary audits, long future, real LOD/hysteresis/pause/save. |
| PHASE5 | Generalize BattleSector only after correctness, profiling and mission constraints review. Choose receipt compaction, fixed-step policy and compressed roster representation. Measure real target hardware separately; Node cost is not FPS. |

Decision: **READY_FOR_PRODUCTION_MIGRATION**, meaning ready for captain review and
a separately authorized PHASE1 implementation, not ready to deploy/generalize.
The executable proof covers three synthetic formations and the specified ownership,
ordering/resource/save/future invariants. Production binding/session fencing,
historical clock mapping, real shared asset adapters and performance are required
phase gates, not claimed as implemented. If a proposed patch skips those gates or
promises old-lineage equivalence, that patch is BLOCKED.

Remaining risks: retained receipts and whole-state cloning are intentionally costly;
100ms synthetic cadence does not establish equivalence to the pilot's .4s/2s rules;
flat synthetic motion is not a pathfinding/terrain test; all target-resolution
rules are illustrative rather than historical casualty probabilities. Timestamp
collectors need a sealing/watermark policy, and array independence is not permission
to accept late same-time events after commitment. Human playtest, browser/CI and
Chromebook measurements are not results of this task.

Reproduction and exact results are recorded in the task's verification HANDOFF.
