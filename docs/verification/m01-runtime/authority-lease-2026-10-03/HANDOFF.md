# Handoff — Exclusive Authority Lease V1

**TASK_ID:** `M01-AGGREGATE-INDIVIDUAL-AUTHORITY-LEASE-V1`  
**MODELO solicitado:** GPT-6.1 Sol; repository tooling does not attest the session model identity.  
**ESFORÇO solicitado:** HIGH  
**BASE:** `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`  
**BRANCH:** `codex/m01-authority-lease`  
**HEAD implementação/testes:** `dac627ce7a99befced226e51513daf21a4637ea1`  
**HEAD FINAL:** documentation/evidence commit containing this file, delivered as an exact SHA in the final response. A commit cannot embed its own SHA.  
**STATUS:** complete isolated architecture/prototype/test handoff. M01 remains **PROTÓTIPO JOGÁVEL**.

## Commits

| Commit | Result |
| --- | --- |
| `1b2fdd29f5773914f7b0e562e27752b2823e19d0` | Contract audit, ownership/clock/RNG architecture and executable prototype |
| `dac627ce7a99befced226e51513daf21a4637ea1` | 47 focused tests, transaction/fencing hardening |
| This final commit | Raw verification logs, deterministic JSON/CSV, hashes, handoff and continuation context |

The branch starts directly at the requested base. No BattleSector, Combat AI,
destruction or interaction branch was merged. Main and all approved heads are
unchanged. Authenticated GitHub updates used `force:false`; the local checkout was
reconciled with published commits. No PR into main, merge, deploy or workflow dispatch.

## Authority model / lease / revisions

Only `AGGREGATED` and `INDIVIDUAL` are persisted. Exactly one active record feeds
the mutation gateway. In INDIVIDUAL, the aggregate is an immutable source snapshot;
it cannot move, kill, expose, reload, reserve cover, alter resources or consume RNG.
In AGGREGATED, no individual record or AI owner is active.

MATERIALIZING/DEMATERIALIZING are private synchronous transaction phases. Save,
reentrant clock and mutation operations reject until a complete boundary commits.
Factories/preflight operate on detached staged data. Failure at ordinal 17 and
failure before return commit preserve original owner, token, serial, state and log.
Asynchronous return preflight is explicitly rejected.

Token: stable deterministic formation/lease/serial ID, sector/formation IDs, owner,
acquiredAtLocalMs, sourceRevision, SHA-256 sourceFingerprint and canonical memberIds.
Serial persists across leases and saves, fencing obsolete callbacks after reentry.
Every active update advances revision. Return checks source revision/fingerprint and
exact complete current individual ledger. A stale live payload also rejects even
when frozen aggregate revision remains 42. Return **replaces** final state, rather
than adding casualty or ammunition deltas to already updated totals.

## Clock / RNG ownership

Coordinator owns nonnegative integer local/battle milliseconds and pause. Motion/AI/
weapon timers use local active time; battle time is historical metadata/gates. A
historical jump cannot move actors or consume RNG. Pause blocks mutations/transfers,
freezes both clocks and supports a saved active lease. Leases have no wall-time expiry.
Return sets the aggregate boundary to current local time, with no leased-interval
catch-up movement, attrition or RNG.

**Important audited limitation:** approved BattleSector has a **sector-wide RNG and
mutating resolver**, not formation-local streams. This V1 model therefore reserves
one formation **inside an exclusively locked sector combat scope**. The future
coordinator must block that sector's existing aggregate resolver while this lease
is active, including other formations that would share its RNG. Other sectors may
continue. Independent formations in the same sector require a separately reviewed
per-formation RNG/revision migration; it is not silently implemented here.

Sector LCG state/draw count freeze during the lease and resume unchanged. Individual
Xorshift32 streams are derived once per seed + stable formation/member ID + algorithm
version, then retained through return/reacquire. Streams are never mixed or reseeded
on approach. Duplicate events and failed batches cannot consume extra draws. Both
algorithms are implemented only inside the tool; production RNG is untouched.

## Identity / materialization / dematerialization

The neutral adapter reads the approved BattleSector status-run/sparse-override shape.
Ordinals partition nominal strength, named IDs remain explicit, and generated IDs
retain the approved `formationId/soldier/ordinal` form. Stable weapon bindings must
be supplied explicitly. Known dead positions, anchor offsets and loaded rounds
are retained. All logical members are staged independently of visual budget.

Materialization validates every descriptor before publishing INDIVIDUAL. Return
requires all known IDs once, correct ordinals, weapon IDs, status, positions, loaded
ammo/cycle, cover/resource bindings, local progress and destruction references. A
partial/unknown/duplicate member graph cannot be accepted. Raw controller changes
must first enter the exclusive mutation gateway; unrecorded return changes reject.

## Casualties / ammunition / player intervention

- Five existing dead plus two individual deaths returns **seven**, never nine.
- Reserve 100 → six reload/fire cycles (5+5+5+5+5+2) → **reserve 73**, with no rounds
  remaining loaded. Loaded magazine and reserve are disjoint; no capacity bypass.
- Reload moves reserve rounds into the same stable weapon; firing consumes only
  loaded rounds. No return/refill operation invents ammunition.
- Dead bodies remain at their death position when the living formation moves.
  Wounded can move only with an explicitly identified live helper; evacuated stays
  at extraction. Terminal states cannot resurrect through commands or return.
- Player kill, rescue, deduplicated ammo delivery, local objective progress, MG/vehicle
  destruction and authoritative destruction reference persist after return/restore.
- Synthetic mounted/vehicle resources preserve operator occupancy and destroyed state;
  operator death releases the station. They are bookkeeping fixtures, not controllers.
- Destruction is referenced by ID/version/cause event; no second destruction reducer.
  A future WorldInteractions adapter owns stable weapon/feed/inventory/resource state
  in one graph and requires the same fencing token for writes. No interface integrated.

## Save / restore / hysteresis / presentation

Independent format `authority-lease-prototype/v1`; production schema 2 unchanged.
Snapshots include mode, frozen source, live individual record if present, lease/
serial, RNG, both clocks/pause and accepted command history. Restore validates by
deterministic replay and full canonical comparison, then exposes exactly one owner.
AGGREGATED, active INDIVIDUAL, paused lease and double restore are tested. Corrupt
states/half-transition modes/stale tokens are rejected. This is in-memory atomicity,
not a durable distributed transaction or crash/fsync implementation.

Approved NEAR/MID/FAR hysteresis is reused (150/800 m, ±20 m margin). Cold approach
149/151/148/152 acquires **once**; NEAR holds through 170 and releases at 171. Retained
MID requires <=130 to enter NEAR again. Interaction/mission relevance can hold an
individual lease; simulation budget can defer acquisition but cannot revoke needed
individual combat. Camera, visibility and LOW/MEDIUM/HIGH never decide ownership.

## Tools / tests / results

- Architecture: `docs/architecture/AUTHORITY_LEASE_SYSTEM.md`.
- Tool: `tools/verification/m01-authority-lease-prototype.mjs` (no `src/**` imports).
- Tests: `tests/m01-authority-lease-prototype.test.js`.
- `node tools/verification/m01-authority-lease-prototype.mjs --out <directory>`:
  six synthetic scenarios, canonical `scenario.json`/`scenario.csv`.

| Actual validation | Result |
| --- | --- |
| Node v24.19.0, Linux x64, `npm ci` | PASS, lockfile untouched |
| Focused lease tests | **47/47 PASS**, 0 failures/skips; `focused-tests.log` |
| `npm test` | **271/271 PASS** = 224 base + 47 new; 35,810.597 ms; `node-tests.log` |
| `npm run build` | PASS; inherited large JS chunk warning; `build.log` |
| Six camera/quality scenarios | All reach 7 dead / 73 reserve / 0 aggregate draws during lease / 1 boundary acquire; equal world fingerprints |
| Fresh Node processes | Byte-identical scenario JSON/CSV |
| Protected paths | 13 source/assets/mission/browser/package/config/workflow/status paths identical to base |
| Production build vs independently built base | **77/77 files byte identical**, SHA-256 manifest in `preservation.json` |
| Source contract provenance | Exact approved-file SHA-256 fingerprints in `preservation.json` |
| Browser / CI / human / Chromebook / FPS | **NOT RUN / NOT MEASURED in this task**, no inherited result counted |

## Limitations / risks

Single coordinator, one formation in an exclusive sector scope, maximum 256 fixture
members, 32 synthetic resources and bounded command history (2048 / 2 MB). State
copying, validation and full replay are proof implementations, not a shipping
scheduler or measured scale benchmark. Frames/late inputs/network concurrency,
transaction durability, actual pathfinding, shots in flight, damage/HP, AI threat/
suppression memory, full WorldWeapon feeds/chambers and runtime controllers are not
implemented. The fixture capacity 5 follows the approved abstract loaded-clip model;
it does not replace any production weapon mechanics.

Integration must serialize every actual controller field, including AI reservations,
memory and suppression. The approved AI prototype uses Infinity/-Infinity sentinels;
future save adapters must encode those explicitly (e.g. tagged/null absent timestamps),
not silently JSON-convert them to null. Whole-world checkpoint restore must invalidate
outstanding async jobs/queues and rebind controllers to the restored lease generation.

Scheduled exposures crossing a transfer boundary must be split and routed once to
the current owner. Cross-sector shots and shared vehicles/mounts/cover need one
global interaction authority, stable IDs and fencing. Historical bounds from the
sector contract need application through the gateway. The example is synthetic,
not a claim of real M01 soldiers, equipment, losses or mission readiness.

## Next integration step / recommendation to captain

Approve this as a **candidate exclusive gateway contract**, particularly the sector
shared-RNG lock decision. Integrate first in a separately authorized non-overlapping
synthetic sector: gate all aggregate mutations and AI intent application, validate
full round/actor/resource snapshots, process local/historical clocks and exposure
boundaries once, then design the production save migration. Do not run the approved
BattleWorld scheduler unchanged alongside full NPC combat. If other formations in
the same sector must remain aggregated, approve a stream/scope migration first.

No integration or new task has been started. **PARAR. Main remains untouched.**
