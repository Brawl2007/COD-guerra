# Exclusive authority lease — isolated V1

TASK_ID `M01-AGGREGATE-INDIVIDUAL-AUTHORITY-LEASE-V1`.
Base `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.
M01 remains **PROTÓTIPO JOGÁVEL**. No runtime integration or merges.

## Contract audit at approved heads

| Contract read | Finding and consequence |
| --- | --- |
| BattleSector `fe2d99f9f343aeb526a95eca048bb010b155ad75`, `BATTLE_SECTOR_SYSTEM.md`, `battle-sector-model.mjs` | Status runs partition canonical ordinals; namedIds bind existing identities. Generated ID is `formationId/soldier/ordinal` (reuse it, do not replace with colon IDs). Sparse individual positions/rounds and formation reserve are separate. `materialize` is pure and visually budgeted, not an authority transfer. `handoff` checks sector revision/time and forbids resurrection. |
| Same BattleSector | RNG and revision are **sector scoped**, movement is sampled on every `advanceTo`, and exposure spends RNG. There is no lease gate. Calling it unchanged while individual actors run would double-simulate. V1 must exclusively lock this sector's aggregate mutating resolver, including shared RNG and assets, while the represented formation is leased. |
| Combat AI `3da1f1637167a3d90953d4f698ebcf5c4b16cf26`, `COMBAT_AI_SYSTEM.md`, isolated prototype | Decisions return intents; the future movement/fire adapter remains responsible for applying state changes. RNG is explicit, actor-ID/decision related. Cover reservations and threat/suppression have local time. No existing whole-combat save graph or lease integration. |
| Destruction `e02b53a0abbce57c3bce175ca87d1084f62ec752`, `DESTRUCTION_STATE_SYSTEM.md` | Independent authoritative destruction store; stable target/effect IDs and consumed event IDs. Reference its versions/results, never copy a second writable destruction world into this lease. |
| World interactions `5d11e91567fe7ff188a95ad1885c47da61da6f7c`, `WORLD_INTERACTION_SYSTEM.md` | Stable WorldWeapon IDs/holder/feed; shared inventory reserve is separate. Mounted/vehicle occupancy is authoritative there. Future commands must carry the lease fencing token to that store; actor records carry stable refs, not duplicate ammo/vehicle controllers. |

## Ownership and state machine

Persist only `AGGREGATED` and `INDIVIDUAL`. `MATERIALIZING` and
`DEMATERIALIZING` are synchronous private transaction phases, not saveable states.
The coordinator selects the one active combat record. During INDIVIDUAL the
aggregate record is a frozen source snapshot, not a simulator. Renderer/proxies
have no write capability. During AGGREGATED there is no active individual record.

The prototype models **one formation in one exclusively reserved sector scope**.
Multiple leases in a sector are rejected/deferred by a future sector coordinator.
Other sectors can continue independently. Other formations in this locked sector
cannot spend its shared RNG or run the existing shared mutating resolver. Metadata
and historical agenda can continue globally, but group-affecting orders must be
sent once to the current owner; historical outcomes cannot run a second resolver.
If independent formations must keep fighting in the same sector, first migrate
the approved model to stable per-formation streams/revisions and shared-resource
leases in a separately reviewed change. This prototype does not claim that migration.

## Fencing and revisions

Lease token fields: deterministic lease ID, sectorId, formationId, owner,
acquiredAtLocalMs, sourceRevision, sourceFingerprint, canonical memberIds.
ID includes lifetime transfer serial; serial persists across save/reentry. Fingerprint
is SHA-256 of source aggregate state, sector RNG and identity bindings. The serial
prevents a released token from controlling a later lease (ABA). It is a fencing
token, not a cryptographic authorization credential.

Acquire requires the expected source revision. Every accepted combat event advances
the active combat revision. Return requires the current token, unchanged aggregate
source revision and fingerprint, and the exact complete current individual payload.
The payload cannot invent an unrecorded resupply, heal, extra actor or destruction.
Controller changes must pass the exclusive command gateway before export/return.
Return advances revision and replaces the entire aggregate result; it never adds
casualty totals to already updated counts. Counts are derived from member status.
Duplicate gameplay event IDs with the same envelope are no-ops under the correct
owner; conflicts error. Duplicate acquire/release and obsolete tokens error.

## Clock ownership

All prototype times are integer milliseconds; positions are metres `{x,y,z}`.
The coordinator owns local active mission time, historical battle time and pause.
It updates only the active record's timestamp. Simulation motion, weapon cycle,
cover and AI timers use local time. Historical gates may hold battle time while
local time advances; historical jumps never become locomotion deltas.
Pause freezes both clocks, RNG and all mutation/transfer operations; snapshotting
paused ownership is valid. There is no wall time, lease expiry or automatic takeover.
On return reset the aggregate motion boundary to current local time: no catch-up
movement, exposure, RNG draws or ammo consumption for the leased interval. A
scheduled exposure window straddling acquire must be split once at the boundary;
the individualized interval is never replayed as aggregated attrition.

## RNG

Sector aggregate stream uses the approved LCG formula, implemented locally without
importing/consuming production RNG. Capture state + draw count in the fingerprint;
freeze them during lease; resume unchanged after return. Individual streams are
derived **once** from seed + formationId + canonical member ID + algorithm version,
then state/draw counters persist through return and reacquisition. Decisions consume
only their actor stream under a valid token. Streams are never summed, reseeded on
approach or advanced by camera/quality. Explicit event order and approach boundary
are part of replay identity; arbitrary frame partition equivalence is not claimed.

## Atomic transfers, identity and ammo

Acquire stages every ordinal, including known dead/wounded/evacuated records.
Only combatReady receives an AI authority; wounded needs an explicit assisted-move
policy. Every staged descriptor must match canonical identity, status, transform,
weapon ID, loaded ammo and RNG. If actor 17 preparation fails, discard all staged
data and retain the aggregate owner. Staging factories must be data-only: arbitrary
external side effects cannot be rolled back by a JSON transaction.

Return stages and validates the full member/resource/progress graph before commit.
Dead and evacuated cannot return to combatReady, dead bodies never follow an anchor,
wounded moves only by an explicit live helper, evacuated remains at extraction.
Live members follow the new aggregate anchor using their saved positions; acquired
initials are never randomized on reentry. Exact casualty ordinals survive.

Group reserve and each loaded magazine are disjoint. Reload transfers rounds out
of reserve into one stable weapon; firing subtracts loaded rounds only. A fixture
with reserve 100 and empty magazine can load/fire 27 and return reserve 73. Resupply
requires a deduplicated input receipt; return itself cannot refill. Weapon cycle
and cover binding persist. Future WorldWeapon feed/chamber schema stays in the
interaction store, not duplicated on each actor.

The prototype's mounted/vehicle records are synthetic exclusive resources within
its single coordinator, used to prove operator binding and destroyed state survive.
They are not production controllers or a second interaction store. Integration must
use references plus commands to the one authoritative WorldInteractions graph.
Destruction records here are versioned references only; no destruction reducer is
imported. Global mission objective authority remains the director; this store tracks
local formation objective progress and can send deduplicated progress receipts.

## Save, crash and boundary policy

Independent format `authority-lease-prototype/v1`; production schema 2 unchanged.
Save includes owner, immutable aggregate source, active individual state if any,
token/serial, sector and member RNG, both clocks/pause and accepted command history.
Restore replays the prototype input log, checks canonical complete snapshot equality,
and instantiates exactly one owner. It never starts both resolvers. An invalid return
leaves owner/source/token/RNG/history untouched and is retryable.

Save/checkpoint during a staging callback throws an explicit boundary error.
Successful commit can be snapshotted immediately; crash before commit leaves the
last durable boundary. No mid-transition schema is invented. This is in-memory
atomicity, not fsync/network crash durability. Whole-world checkpoint restore must
discard outstanding queues/async jobs and rebind controllers to the restored
token; checkpoint rewind is a distinct generation in a future host, not a merge
with the death-time world. Do not use timeout expiry to create another simulator.

## Gameplay relevance and presentation

Reuse approved hysteresis: near 150 m, margin 20 m. From AGGREGATED acquire at
<=150 m; from INDIVIDUAL stay until >170 m. The sequence 149/151/148/152 does
not churn. A prior MID policy may use <=130 m (the approved representation's
150−20 threshold); first-entry and retained-band state must be explicit in the
future coordinator. Prototype documents its cold AGGREGATED initial band.
Interaction relevance/mission-required individual state can hold/acquire authority;
simulation budget can postpone a new lease, never revoke live combat unilaterally.
Distances must be supplied from gameplay geometry (formation/bounds), not camera.
LOW/MEDIUM/HIGH, visibility and camera change presentation only, not lease decisions.

## Integration step and risks

Captain reviews this gate contract first. Add it to a single non-overlapping
synthetic sector before binding real M01 actors. Gate every aggregate move/exposure,
RNG draw, casualty/ammo operation and resource command; dispatch AI intents through
the same active-owner gateway. Split clock/exposure boundaries, preserve existing
historical constraints, then add a reviewed whole-world save migration. Test actual
rounds in flight, cross-sector fire, shared cover/resource locks, async assets and
the station rescue before considering runtime approval. Neither approved branch
is merged by this task. No browser/CI/FPS result is inferred from Node state tests.
