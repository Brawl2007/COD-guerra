# Validation — M01-SOLDIER-LOCOMOTION-ANIMATION-ARCHITECTURE-V1

Base: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

This task adds only architecture documentation, an isolated mathematical/state prototype, tests and evidence. No `src/**` file or GLB is changed.

## Prototype scenarios

Command:

```sh
node tools/verification/m01-soldier-animation-state-prototype.mjs
```

Recorded output: `prototype-results.json`.

The scenario runner demonstrates idle → walk → run, crouch locomotion with a timed stand→crouch transition, and bounded turn-in-place math. Values are prototype parameters, not claims that missing clips already exist.

## Focused tests

Node: `v24.21.0`.

```sh
node --test tests/m01-soldier-animation-state-prototype.test.js
```

Result:

- 27 tests;
- 27 pass;
- 0 fail;
- 0 cancelled;
- 0 skipped;
- 0 todo;
- 126.244416 ms.

Covered contracts:

- idle→walk;
- walk→run;
- stand→crouch transition;
- crouch movement semantic;
- prone request only after authoritative posture acceptance;
- turn-in-place and bounded visual yaw;
- aim/body twist clamp;
- speed↔playback relation and safe-rate clamp;
- strafe/backpedal selection;
- deterministic ID-based variation;
- camera independence;
- quality independence of core semantic state;
- pause;
- snapshot/restore and atomic invalid restore rejection;
- fire/reload upper-body layering;
- hit reaction not mutating HP/death;
- suppression not inventing posture;
- cover metadata pass-through;
- weapon socket IK contract;
- LOD/fidelity not mutating actor transform/gameplay;
- authoritative death ownership;
- specialized-system pass-through for MG34 prone/station-style adapters.

## Full Node suite

```sh
npm test
```

Result:

- 251 tests;
- 251 pass;
- 0 fail;
- 0 cancelled;
- 0 skipped;
- 0 todo;
- 30474.494168 ms.

## Build

```sh
npm run build
```

Result: PASS.

- Vite 8.3.1;
- 51 modules transformed;
- JS 1,108.66 kB / 292.51 kB gzip;
- build 525 ms.

The existing >500 kB chunk warning remains. This task does not alter production bundle inputs.

## Isolated prototype decision benchmark

Command, repeated three times:

```sh
node tools/verification/m01-soldier-animation-state-prototype.mjs --benchmark 50000
```

Recorded output: `benchmark-results.json`.

Three runs produced the same deterministic checksum `962845611`.

| run | 50,000 decisions | µs / decision |
|---:|---:|---:|
| 1 | 1708.226305 ms | 34.1645261 |
| 2 | 1631.325849 ms | 32.62651698 |
| 3 | 1829.213671 ms | 36.58427342 |

Median: **34.1645261 µs per isolated prototype decision**.

This measures pure JavaScript state/math in this sandbox. It is **not** FPS, GPU cost, Three.js `AnimationMixer` cost, skinning cost, browser cost or Chromebook performance.

## Browser / visual validation

Not run. No production renderer, animation mixer path, GLB, gameplay, browser test or asset was modified. Browser/visual validation belongs to the later integration task that actually binds this architecture to production clips/layers.
