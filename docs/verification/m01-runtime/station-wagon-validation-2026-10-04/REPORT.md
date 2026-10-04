# M01 Station Wagon State Validation

**TASK_ID:** `M01-STATION-WAGON-STATE-VALIDATION-V1`  
**Model / effort:** GPT-5.6 Sol / HIGH  
**Audited branch:** `codex/m01-station-wagon-state`  
**Audited remote HEAD:** `f15a2e51dbe329ae984a52c47ecf856eef8fbede`  
**Validation branch:** `codex/m01-station-wagon-validation`  
**M01 status:** PROTÓTIPO JOGÁVEL  
**No merge / no main changes.**

## Executive result

The real yard-wagon runtime is **not** a four-state `intact -> damaged -> burning -> burned` system.

It currently has two semantic wagon states:

```text
intact
  |
  | evt_m01_station_wagon_hit (third bomb beat, t = 8.5 s after bombing_0434)
  v
burned
```

The word **burning** describes presentation (persistent flame/smoke while the semantic state is already `burned`).  
There is **no distinct `damaged` state** in the yard runtime. The `*_damaged.glb` assets exist but are not selected by `M01YardWagons`.

The validation found and fixed one isolated gameplay-authority bug: on the audited base the `station_bomb` impact happened at the beginning of `evt_m01_bombing_0434`, while `station_wagon_fire` was not persisted until the later `evt_m01_wounded_dragged`. That did not match the scripted third-bomb beat at t=8.5 s.

The minimal fix introduces one existing-schema mission event, `evt_m01_station_wagon_hit`, triggered 8.5 s after `evt_m01_bombing_0434`, and moves both persistent wagon-fire authority and the single `station_bomb` impact to it. No save schema was added or changed.

## Wagon map

| Wagon ID | Initial | Damage event | Damaged | Burning | Burned | Save | Restore | Renderer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `yard_wagon_1` | intact / covered | none | no state | no | no | position is authored, not wagon-state saved | remains intact | covered intact GLB -> procedural |
| `yard_wagon_2` | intact / open | none | no state | no | no | position is authored, not wagon-state saved | remains intact | open intact GLB -> procedural |
| `yard_wagon_3` | intact / covered | `evt_m01_station_wagon_hit` | **no distinct state** | flame/smoke presentation only | **yes** via `station_wagon_fire` | `destruction`, `consumed`, `sectors.damage` in schema 2 snapshot | marker and impact survive load/double load | covered burned GLB -> covered intact GLB -> procedural |

The separate 65-wagon distant train renderer remains a generic LOD2 consist. It is not part of the three-yard-wagon damage state machine.

## Simulation -> save -> renderer -> asset/fallback

For `yard_wagon_3`:

```text
evt_m01_station_wagon_hit
  -> consumed[id] = clock
  -> destruction += "station_wagon_fire" exactly once
  -> sectors.damage += station_bomb exactly once
  -> snapshot schema 2 stores destruction + consumed + sectors
  -> restoreSnapshot restores those fields
  -> yardWagonState() sees station_wagon_fire
  -> state = "burned"
  -> m01_wagon_covered_burned_lod{0|1}.glb
       if missing:
       -> m01_wagon_covered_lod{0|1}.glb
       if missing:
       -> visible procedural fallback
```

The semantic state stays `burned` even when visual loading falls back to the intact GLB or procedural geometry.

## Event authority / third bomb

### Before the fix

The audited base had split authority:

- `evt_m01_bombing_0434` started `cs_m01_bombing` and immediately emitted `station_bomb`;
- the cutscene data says the third station-yard bomb is the beat at **t=8.5 s**;
- `station_wagon_fire` was created only by the later `evt_m01_wounded_dragged` event at 04:35:30.

A regression test was committed before the fix and failed with:

```text
the t=8.5 third bomb must persist the wagon-fire state
```

### After the fix

`mission.json` owns:

```json
{
  "id": "evt_m01_station_wagon_hit",
  "trigger": {
    "type": "eventComplete",
    "event": "evt_m01_bombing_0434",
    "delaySec": 8.5
  },
  "idempotent": true,
  "persist": true
}
```

The simulation handler:

- adds `station_wagon_fire` only if absent;
- creates `station_bomb` only if absent;
- no longer assigns wagon damage to `wounded_dragged`.

This matches:

```text
event happens
-> state changes once
-> save
-> reload
-> state remains burned
```

## Idempotence

Focused tests prove that repeating `evt_m01_station_wagon_hit` cannot duplicate:

- `station_wagon_fire`;
- `station_bomb` damage record;
- `m01-blast` event / pending audio source;
- renderer state IDs.

The second `consume()` returns false. Double load does not replay the blast.

## Checkpoint authority

Two real cases were tested.

### Checkpoint before hit

CP-A exists before the third bomb.

```text
CP-A snapshot
-> no station_wagon_fire
-> third bomb
-> burned
-> restoreCheckpoint()
-> no station_wagon_fire
-> intact
```

PASS.

### Checkpoint after hit

The real CP-B is reached after the third-bomb event. Its checkpoint snapshot contains `station_wagon_fire`.

```text
third bomb
-> CP-B
-> checkpoint destruction includes station_wagon_fire
-> advance
-> restoreCheckpoint()
-> burned
```

PASS.

The mission checkpoint metadata for CP-B/CP-C/CP-D now includes `evt_m01_station_wagon_hit` in the documented state sequence. CP-A intentionally does not.

## Continuation save versus checkpoint

The audited branch already uses schema 2 snapshots. The wagon marker is part of the existing `destruction` array; the impact is part of existing `sectors.damage`; no new schema field was introduced.

A continuation snapshot taken after the hit was loaded twice into a fresh `M01Simulation`:

- exactly one `station_wagon_fire`;
- exactly one `station_bomb`;
- state remains `burned`;
- no blast is replayed.

PASS.

### Important schema-2 boundary

This branch descends from the station-wagon worker base and **does not contain the later PR #37 `resumeCheckpoint` correction**. On this audited code, `restoreSnapshot()` still sets the loaded snapshot itself as `candidate.checkpoint`.

PR #37 separately corrected continuation-vs-checkpoint semantics by preserving the previous real checkpoint in optional `resumeCheckpoint` while keeping real checkpoints flat schema-2 snapshots.

This validation deliberately **did not port or replace that mechanism**. The wagon change only uses fields already present in schema 2 and is compatible with the PR #37 model: the live continuation carries the wagon state, while the checkpoint to restart from remains owned by the approved resume-checkpoint logic after integration.

Therefore:

- wagon continuation persistence is proven here;
- PR #37 continuation restart semantics are **not reimplemented here**;
- no competing checkpoint semantics were created.

## Visual state

`M01YardWagons` selects only:

```text
intact
burned
```

Assets known but **not selected by this runtime**:

- `m01_wagon_covered_damaged`
- `m01_wagon_open_damaged`

Assets selected:

- intact covered/open from `m01-wagons`;
- burned covered for `yard_wagon_3` from `m01-wagon-damage`.

Low quality selects LOD1; medium/high select LOD0. Quality changes LOD only, not the semantic wagon state.

## Fire / smoke

Fire and smoke are presentation derived from persisted state.

When `station_wagon_fire` is present:

- `yardWagonFireDamage()` derives a pseudo-damage emitter from wagon 3 and manifest sockets;
- `m01-view` makes the yard fire mesh visible;
- `M01Atmosphere` receives persistent smoke data;
- `station_bomb` is also a persistent smoke source in the existing atmosphere contract.

There is no separate gameplay `burning` condition, burn timer, burn damage or heat collider.

## Collision / cover

The state transition does **not** change collision or cover gameplay.

Focused test snapshots world obstacles and the two authored yard cover nodes before the hit, applies the hit, then compares them exactly.

Result:

- world obstacles unchanged;
- `cv_wagon_1` unchanged;
- `cv_wagon_2` unchanged;
- `yard_wagon_3` has no authored cover-node link;
- no destroyed collider or new cover is created.

Do not describe this as physical wagon destruction.

## Fallback

Two fallback layers are proven.

### Burned GLB missing only

```text
semantic state = burned
burned GLB missing
-> intact covered GLB is used visually
-> semantic state remains burned
```

PASS.

### All relevant yard GLBs blocked

Browser and Node validation block the yard wagon GLBs.

```text
assets missing
-> all three wagon roots remain visible
-> procedural fallback is visible
-> yard_wagon_3 semantic state is still burned
-> station_wagon_fire remains in gameplay state
```

PASS.

There is no silent invisibility.

## Pause

The browser test pauses while the persisted wagon-fire state is active.

During a 400 ms wall-clock wait while paused:

- mission clock unchanged;
- battle clock unchanged;
- wagon diagnostics unchanged;
- smoke puff count unchanged;
- rendered mission-frame counter unchanged.

PASS.

No simulation-clock change was introduced.

## Off-camera

The browser test rotates the camera more than 2.5 radians away from the original view and compares:

- `destruction`;
- wagon ID/state/asset key diagnostics.

They remain identical.

PASS. Camera direction is not wagon-state authority.

## Browser visual evidence

The browser validation captures:

- `station-wagon-intact.png`
- `station-wagon-burning.png`
- `station-wagon-restored.png`
- `station-wagon-fallback.png`

Screenshots are intentionally not treated as gameplay proof alone. The same tests assert diagnostics/state.

Final full browser evidence artifact:

- GitHub Actions run: `37171593310`
- artifact: `11292550815` (`browser-evidence`)

## Browser harness issues found during validation

Two old browser tests failed on the first full run, neither indicating a wagon-state gameplay regression.

1. The old 65-wagon fallback test intercepted `**/m01-wagons/*.glb` and required exactly two asset failures. The audited station-wagon branch now legitimately loads yard GLBs from that directory too. The test was narrowed to the two train LOD2 files it actually intends to test.
2. The old station-evacuation test used a 120 s post-resume timeout. Trace diagnostics showed the simulation had legitimately reached the release phase only 0.10 s before timeout on SwiftShader CI. The CI budget was increased to allow the existing 1.6 s simulation release phase to complete; gameplay timing was not changed.

Focused rerun: 2/2 PASS.

## Validation results

Final green run `37171593310`, commit `60adb79b32f868bc2188e988386904357f7cd382`:

```text
Node 24
npm test      238/238 PASS
npm run build PASS
browser       38/38 PASS
retries       0
skips         0
failures      0
```

Build retains the existing large-chunk warning only.

The workflow used `fetch-depth: 0` **temporarily** because an unrelated existing MG34 Node test calls `git show` on historical commit `2cfa952...` and fails under GitHub's default shallow checkout. After evidence was captured, the workflow file was restored byte-for-byte to the audited branch version. It is not part of the final diff.

## Bugs found / fixes

### Fixed: wrong station-wagon event authority

**Reproduction:** third-bomb t=8.5 regression fails on audited base.

**Minimal fix:**
- one mission event using the existing event system;
- handler moves existing marker + impact authority;
- renderer timestamp reads the new event and retains old `wounded_dragged` fallback for legacy saves;
- no schema addition;
- no destruction-persistence architecture integration.

### Fixed: browser test intercept scope

Test-only change; generic train fallback now blocks only the two LOD2 train files it means to test.

### Fixed: SwiftShader CI budget

Test-only timeout budget; no simulation duration or gameplay clock changed.

## Limitations

- No distinct damaged/burning gameplay states exist; validation documents that instead of inventing them.
- Damaged GLBs remain unused by the current yard runtime.
- No physical wagon destruction/collider mutation exists.
- PR #37 resume-checkpoint code is not present in this worker branch and was not integrated.
- Screenshots prove rendered appearance only when paired with diagnostics.
- Browser evidence was generated on CI software WebGL/SwiftShader, not a Chromebook hardware playtest.
- `DestructionPersistence` reference branch was not merged or integrated.
