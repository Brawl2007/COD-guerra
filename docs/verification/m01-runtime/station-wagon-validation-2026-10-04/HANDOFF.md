# HANDOFF — M01-STATION-WAGON-STATE-VALIDATION-V1

## TASK_ID

`M01-STATION-WAGON-STATE-VALIDATION-V1`

## MODELO

GPT-5.6 Sol

## ESFORÇO

HIGH

## BASE REAL / HEAD

Audited branch:

`codex/m01-station-wagon-state`

Remote HEAD was confirmed **before any validation change** and matched the captain's known value:

`f15a2e51dbe329ae984a52c47ecf856eef8fbede`

It had not advanced.

## BRANCH

`codex/m01-station-wagon-validation`

No merge. No integration. No `main` modification.

## HEAD FINAL

The exact remote HEAD is the commit containing/following this handoff and is reported in the final captain response after the final remote-ref/diff check. This file does not attempt to embed its own self-referential commit hash.

## COMMITS

Validation branch history from the audited base:

1. `33d911da94ff80b37b4f03d2051572c65e319250` — reproduce third-bomb authority mismatch
2. `ad7506339550da404b83f3e2d85123411839c216` — fix regression-fixture import
3. `e95666352035b3b0a44bcda462b96ed2e532f50b` — bind station fire to scripted third bomb
4. `3f22d3e88f756f025fce4fe75dbfe401752bd0f9` — persistence/checkpoint/fallback focused tests
5. `13651eab01527d5072dbc9fad9a394c8ce1f53a8` — browser state/pause/restore/fallback evidence
6. `2504a2bcca4fcab986859ac91603495e6b282c12` — isolate intact/burned browser fixtures
7. `0e02b3b391fe16c7af30a1733149be66747a2f62` — make debug diagnostics safe in headless fixtures
8. `a3454e54da3eb76bf6e003669d5336fdea56cc95` — temporary full-history checkout for validation
9. `95c38a22988e0e1242157ed38a4dcf7ec4741422` — narrow old train fallback intercept / focused rerun
10. `7039156b2798e733643a21bf19316f80b76236fd` — increase old evacuation harness budget on SwiftShader CI
11. `60adb79b32f868bc2188e988386904357f7cd382` — restore full browser suite; final green evidence run
12. `f473d83543d2ec61fea032939f16be92091f419f` — restore workflow byte-for-byte after evidence run
13. `b489289785c41fbb37bc91c9b75ecdce768cc40c` — validation report

Temporary CI workflow edits cancel each other and are absent from the final diff.

## WAGON IDS

Relevant station-yard wagons:

- `yard_wagon_1` — covered, cover node `cv_wagon_1`
- `yard_wagon_2` — open, cover node `cv_wagon_2`
- `yard_wagon_3` — covered, owns `damageKey: station_wagon_fire`

The separate 65-wagon distant train is not part of this state machine.

## STATE MACHINE REAL

Actual semantic state machine:

```text
intact
  -> evt_m01_station_wagon_hit
burned
```

There is no distinct runtime `damaged` state and no distinct runtime `burning` state.

`burning` is presentation: flame/smoke derived from the persisted burned marker.

## EVENT AUTHORITY

### Audited-base bug

Authority was split incorrectly:

- `evt_m01_bombing_0434` created `station_bomb` immediately at bombing start;
- `station_wagon_fire` was added only by later `evt_m01_wounded_dragged`;
- mission cutscene defines the third station-yard bomb at t=8.5 s.

The pre-fix regression failed as intended.

### Fixed authority

New existing-schema event:

`evt_m01_station_wagon_hit`

Trigger:

```text
eventComplete(evt_m01_bombing_0434) + 8.5 s
```

It now owns both:

- persistent `station_wagon_fire`;
- one `station_bomb` impact.

`wounded_dragged` no longer owns wagon damage.

## THIRD BOMB

Proven sequence:

```text
bombing event
-> 8.5 s third-bomb beat
-> evt_m01_station_wagon_hit
-> one station_wagon_fire
-> one station_bomb
-> save
-> reload
-> burned remains
```

Reload does not revert the wagon to intact.

## SAVE

Schema remains **2**.

Existing fields only:

- `destruction`
- `consumed`
- `sectors.damage`

No new persistence schema or DestructionPersistence integration.

Double load after the hit preserves exactly one marker and one impact and emits no new blast.

## CHECKPOINT

Real CP-A before hit:

- checkpoint has no `station_wagon_fire`;
- hit can occur;
- restart CP-A -> intact.

Real CP-B after hit:

- checkpoint contains `station_wagon_fire`;
- restart CP-B -> burned.

CP-B/C/D documented state lists include the new event; CP-A does not.

## CONTINUATION

Continuation snapshot after hit:

- loads burned;
- double load remains burned;
- no duplicated impact/blast.

Important boundary: this worker branch predates the approved PR #37 `resumeCheckpoint` correction. Its current `restoreSnapshot()` still sets the loaded snapshot itself as the checkpoint.

This task **did not invent or port another continuation/checkpoint model**. It validates wagon persistence only with existing schema-2 fields and explicitly leaves restart-from-continuation semantics to the already-approved PR #37 integration path.

## IDEMPOTENCE

PASS.

Second application cannot duplicate:

- `station_wagon_fire`;
- `station_bomb`;
- event ID;
- `m01-blast`;
- pending audio source.

## VISUAL STATE

Runtime selectors:

- `intact`
- `burned`

Unused by current station-yard selector:

- covered damaged GLB
- open damaged GLB

The existence of damaged assets is **not** evidence of a damaged gameplay state.

Renderer mapping for wagon 3:

```text
burned GLB
-> if unavailable: intact covered GLB
-> if unavailable: procedural fallback
```

Semantic state stays burned throughout fallback.

## COLLISION / COVER

No collision or cover transition exists.

After wagon hit:

- world obstacles are byte-equivalent at test-object level;
- `cv_wagon_1` unchanged;
- `cv_wagon_2` unchanged;
- `yard_wagon_3` has no authored cover node;
- no destroyed collider is created.

Do not claim physical destruction.

## FIRE / SMOKE

Presentation only.

Persisted `station_wagon_fire` derives:

- yard fire visibility;
- smoke emitter via wagon manifest sockets.

`station_bomb` is also retained as a persistent smoke source by the existing atmosphere logic.

There is no burn damage, heat gameplay or burn timer.

## OFF-CAMERA

PASS.

Camera turned >2.5 radians away:

- destruction state unchanged;
- wagon ID/state/asset-key diagnostics unchanged.

Camera does not own/reset wagon state.

## FALLBACK

PASS.

Proven:

1. burned GLB missing -> intact covered GLB visual fallback, semantic state still burned;
2. all relevant yard GLBs blocked -> visible procedural fallback for all three wagons, wagon 3 still semantically burned;
3. no silent invisibility.

The old generic 65-wagon fallback browser test was narrowed to the two LOD2 train files it actually owns, because the station-yard worker now also legitimately loads assets from `m01-wagons/`.

## PAUSE

PASS.

With burned/fire state active and pause UI engaged:

- mission clock frozen;
- battle clock frozen;
- wagon diagnostics frozen;
- smoke-puff count frozen;
- mission rendered-frame counter frozen during the measured interval.

Simulation clock was not changed.

## BUGS FOUND

1. **Gameplay authority bug:** wagon fire belonged to `wounded_dragged` instead of the third-bomb beat.
2. **Old browser harness scope bug:** generic wildcard intercepted new yard-wagon assets while asserting only two train failures.
3. **Old browser CI budget issue:** station evacuation reached its normal 1.6 s release phase too late for a 120 s SwiftShader wall-time wait.

The third item was diagnosed from trace state: at timeout the casualty was already at the delivery x and the release phase had only been active ~0.10 simulation seconds. Gameplay was not stuck.

## FIXES

Minimal only:

- one mission event, no schema;
- move existing impact/marker authority;
- legacy renderer timestamp fallback retained;
- read-only diagnostics for evidence;
- focused tests;
- old fallback intercept made specific;
- old CI timeout budget increased, no simulation timing change.

No general refactor.

## FOCUSED TESTS

Station-wagon Node test file contains 13 focused wagon-state tests in the final validation set, covering:

- plan/IDs;
- state transition;
- terrain placement;
- fire/socket derivation;
- third-bomb timing;
- idempotence;
- CP-A/CP-B;
- continuation + double restore;
- collision/cover preservation;
- absence of damaged/burning semantic states;
- procedural fallback;
- burned->intact-GLB fallback.

Focused old browser blocker rerun after harness correction: **2/2 PASS**.

## NODE

Final green evidence run:

- GitHub Actions run `37171593310`
- Node 24
- `npm test`: **238/238 PASS**
- fail 0
- skipped 0
- cancelled 0

## BUILD

`npm run build`: **PASS**

Existing large-chunk warning remains; no build error.

## BROWSER

Final full run:

- `npm run test:browser`
- **38/38 PASS**
- failures 0
- retries 0
- skips 0
- one worker / CI SwiftShader

The run includes the new station-wagon browser tests plus the existing suite.

## SCREENSHOTS / EVIDENCE

Captured:

- `station-wagon-intact.png`
- `station-wagon-burning.png`
- `station-wagon-restored.png`
- `station-wagon-fallback.png`

They are paired with diagnostics and are not used as standalone gameplay proof.

GitHub evidence:

- run: `37171593310`
- artifact: `11292550815`
- artifact name: `browser-evidence`

Validation-only PR #38 was closed **without merge** after evidence capture.

## LIMITATIONS

- no distinct damaged gameplay state;
- no distinct burning gameplay state;
- damaged GLBs are currently unused by yard selection;
- no physical wagon destruction or collider mutation;
- PR #37 resume-checkpoint implementation is not in this worker branch and was not integrated;
- no DestructionPersistence integration;
- CI uses software WebGL/SwiftShader, not Chromebook hardware.

## RECOMMENDATION

**APPROVE WITH EXPLICIT STATE-MODEL LIMITATION.**

The current station-yard system is now internally consistent and proven as:

```text
intact -> burned + persistent fire/smoke presentation
```

The captain should not describe it as a four-state destruction system.

Future integration should:

1. layer this branch only after the approved schema-2/continuation base is reconciled;
2. preserve `evt_m01_station_wagon_hit` as third-bomb authority;
3. keep PR #37 as owner of continuation-vs-checkpoint semantics;
4. only add `damaged` / `burning` semantic states in a separate explicitly scoped task if the design actually requires them.

## STOP

Task complete.

Do not merge.  
Do not integrate.  
Do not touch `main`.  
Do not start another task.
