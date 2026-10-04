# Per-formation RNG migration architecture — handoff

| Field | Result |
| --- | --- |
| TASK_ID | `M01-BATTLESECTOR-PER-FORMATION-RNG-MIGRATION-ARCHITECTURE-V1` |
| MODELO | GPT-6.1 Sol requested; tools do not independently attest model identity |
| ESFORÇO | HIGH requested; no delegation |
| BASE | `codex/m01-near-far-authority-runtime-pilot` @ `f2741e53a85c582b4e0739e3a946f534fbe25dde`, draft #39 preserved |
| BRANCH | `codex/m01-per-formation-rng-architecture` |
| HEAD FINAL | Final evidence commit in final delivery / remote branch ref. Exact validated code/docs commit: `27a30dabc4dc0a5fa017a8fd20669f3c5b0419d5`; following commit adds evidence/context only |
| CURRENT LIMITATION | #39 source fingerprint contains aggregate plus shared sectorRng, and its single sector resolver is frozen during the individual lease. It represents only four real IDs, not an existing multi-formation production sector |
| FORMATION RNG MODEL | Persistent domain-separated SHA-256 tuple derivation with version tag; local LCG state/draws frozen while individual, member xorshift streams persisted independently; no global gameplay draw or reseed on approach |
| FORMATION REVISION MODEL | Active local combat revision; frozen source revision; generation increases only on acquire and persists; no B-local revision dependency on A |
| SECTOR REVISION MODEL | Shared supply decisions/artillery/destruction-result references; excludes independent local formation ticks; optional explicit dependency fence |
| LEASE FENCING | sectorId,formationId,generation,sourceRevision,sourceFingerprint,memberIds, exact current complete payload and optional sharedSectorRevision; stale/ABA/partial return rejects atomically |
| SIMULTANEOUS LEASES | A/B INDIVIDUAL and C AGGREGATED proven; return/reconciliation of A cannot overwrite B; B aggregate future/RNG also matches unleased control while A leased |
| ORDER INDEPENDENCE | Stable sorted formation IDs/ordinals; canonical object keys; fixed tuple seeds; reversed formations, object insertion and event input yield same logical state/checksum |
| SAME-TIME EVENTS | Complete sealed interval batches; `(at,priority,sectorId,formationId,eventId)` ordering; sectorId constant S; external events before fixed100ms steps; late new same-time event rejects |
| CROSS-FORMATION EVENTS | Attack spends source ammo once and routes named target loss; suppression, multi-target artillery and shared authoritative destruction-result references enter explicit envelopes; no writable target record exposed |
| LOCAL AMMO | reserve/loaded/spent disjoint;100→73 after27 reload transfers; return does not refill; shared delivery increments received and local reserve atomically |
| SHARED RESOURCES | reserve100, A/B request70 same time: A70/B0, reserve30; deterministic all-or-nothing grant/deny receipts; stale/conflicting requests roll back, retries cannot duplicate spend |
| CASUALTIES | A5→7 plus B3→4 = **11**; derived from stable member statuses, not summed twice on return |
| DEAD BODIES | Dead/evacuated remain at stable positions/IDs, wounded stationary absent assistance; A return preserves B bodies; no recreation/resurrection |
| SAVE/RESTORE | Isolated format `per-formation-authority-prototype/v1`;0/1/2 leases, double restore, recomputed-checksum corruption, missing RNG, duplicate formation/member, stale generation and half-transition rejection. Whole-candidate publication. No production schema2 change |
| LEGACY MIGRATION | Synthetic v0 converter only at no-lease/no-pending-input boundary, archives old stream/digest and derivation seed, preserves IDs/ammo/bodies and existing individual streams. Real schema2 importer/named bindings left to reviewed phase1 |
| DETERMINISTIC LINEAGE | **Migration changes deterministic lineage**. Old replay needs legacy interpreter or explicit fork; no bit-perfect promise for a split formerly shared stream |
| PROTOTYPE | `tools/verification/m01-per-formation-rng-prototype.mjs`, no src imports; S with A/B/C,12 members each; verification driver separate |
| FOCUSED TESTS | **43/43 PASS**,0fail/skip, exit0,45,962.099037ms |
| LONG FUTURE TICKS | **10,000 paired post-save ticks /10,000 exact state comparisons /0divergences**; variable dt,1,880 zero-dt-or-pause calls,472 submitted envelopes including duplicates,84 generations each A/B |
| CHECKSUM | `bb230508a372b9672d1c3e680bc418e25bbedf082f356e085ba2d4691a8a6d02`; identical in focused and full Node runs |
| NODE | **309/309 PASS**,0fail/skip, exit0,221,289.945186ms; Node v24.19.0 |
| BUILD | PASS, exit0;53 modules; inherited >500kB chunk warning; protected trees identical to exact base |
| BENCHMARK | Three formations,12 members each,1,000 outer tick calls,46 envelopes;512.173481ms / **512.173481µs per call**; checksum `18ccec28db8849f18b72cc206ebd78e568d37ef8e2d6aa6b5018e46b18850343`. Single Node math sample incl policies/input/clone/validation/receipts, not FPS |
| PRODUCTION MIGRATION PLAN | PHASE0 current lock;1 local streams/revisions and boundary/session adapter;2 shared gateway;3 second real formation;4 multi-formation sector;5 generalization, each with explicit exit gates |
| GO/NO-GO | **READY_FOR_PRODUCTION_MIGRATION** for captain review and a separately ordered PHASE1; does not approve deployment, a second formation, or full generalization |
| RISKS | Async session binding fence, real historical clock mapping and shared asset adapters remain production gates; full-state copies/receipts costly; illustrative100ms cadence/int-mm motion is not real AI/terrain; receipt compaction needs review; no statistical/collision-free32-bit seed guarantee |
| RECOMMENDATION TO CAPTAIN | Review this isolated contract/proof, then order PHASE1 without adding a second real formation. Keep M01 **PROTÓTIPO JOGÁVEL** and stop here |

The player perceives **no visual or gameplay change now**. A later reviewed
migration can keep B/C fighting at distance while A is individualized. This task
changes neither runtime, renderer, MG34, CKM, station, weapons, mission, save2,
the visual pass, PR39 nor main.

## Exact audit and executable evidence

Architecture and required twelve decisions:
`docs/architecture/M01_PER_FORMATION_RNG_MIGRATION.md`. It distinguishes #39's
canonical-string fingerprint from the older architecture's SHA-256 proposal,
captured simulation seed from immutable mission identity, and current one-formation
pilot scope from a hypothetical future whole multi-formation sector lock.

`fixtures.json` stores the actual11-body IDs/positions, shared70/0 grants and
30 reserve, active A/B lease tokens and source RNG. `long-future.json` is extracted
from the final focused test's actual output, including2,488 outer calls with two
leases and3,360 with A individual/B aggregate (counts include paused outer calls;
they are not RNG draw counts). Exact comparisons include all clocks, owner/token,
generation, revisions, streams, member state, ammo, references and receipts; no epsilon.
The complete npm suite independently repeated the same future/checksum.

`benchmark.json` records the separate1,000-call single-world Node sample. Its
checksum covers a shorter future than the10,000 paired proof. Timing is diagnostic,
not a performance budget or claim about real battle scale. The runner platform
and77 actual build-file hashes are in `protected-scope.json`.

`focused-tests.log`, `node-tests.log` and `build.log` retain actual final outputs.
All existing Node tests stayed unchanged. Build/source protection includes identical
Git trees for src/assets/missions/.github/tests/browser; only docs, verification
tools and the new specific prototype test changed. Browser was unnecessary and
not run; no CI/human/FPS claim. Prior pilot validations are audited references,
not executions attributed to this task.

## Restore boundary and remaining limits

In-place restore cannot rewind generation, clocks, active combat/shared revision
or receipt history. Repeated restore of the same boundary is idempotent. An older
checkpoint fork uses a new instance after detaching old controllers; production
needs a session-incarnation guard for asynchronous callbacks. This synchronous
prototype does not claim to validate a real browser/worker session guard.
Shared dependency reconciliation has a pure preflight and explicit token/version
fence; its real terrain/cover adapter is not implemented. BattleClock advances1:1
in the synthetic fixture; the existing mission's historical holds/snaps remain
untouched and require explicit mapping in phase1.

The initial scratch checkout was removed by automatic workspace maintenance.
The same approved contracts were reconstructed in a fresh worktree at the exact
base and committed; final logs here are from the final published implementation.
Intermediate green runs before additional checks are not substituted for final43/309.

## Reproduce

```sh
npm ci
node --test tests/m01-per-formation-rng-prototype.test.js
npm test
npm run build
node tools/verification/m01-per-formation-rng-verification.mjs test-results/per-formation.json
```

Protected remote refs reconfirmed: main `72bbcdd156603c9399801c95d43d9365ba50fc82`,
#39 pilot `f2741e53a85c582b4e0739e3a946f534fbe25dde`. No merge, deploy, new
production actors or amendment to PR39. Stop after handoff.
