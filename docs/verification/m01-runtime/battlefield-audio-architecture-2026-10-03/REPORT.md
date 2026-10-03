# Battlefield audio architecture verification — 2026-10-03

Task: `M01-BATTLEFIELD-AUDIO-ARCHITECTURE-V1`  
Branch: `codex/m01-battlefield-audio-architecture`  
Scope: isolated architecture/prototype only. No production runtime integration.

## What was executed

The repository could not be cloned into the local sandbox because its network resolver could not resolve `github.com`. GitHub reads/writes were performed through the authenticated GitHub connection. The two new isolated files were materialized separately in the sandbox and executed with the installed Node runtime.

Local runtime used for the isolated verification:

```text
Node v22.16.0
```

This satisfies the repository minimum (>=22.12) but is **not** the Node 24 CI environment.

Command equivalent:

```sh
node --test tests/m01-battlefield-audio-prototype.test.js
node tools/verification/m01-battlefield-audio-prototype.mjs
```

## Focused test result

```text
16 tests
16 pass
0 fail
0 skipped
0 cancelled
```

Covered:
- speed-of-sound delay;
- non-hardcoded 1 km case;
- attenuation;
- air low-pass with distance;
- acoustic bands;
- occlusion;
- portal reopening;
- indoor filtering/reflection quality;
- priority;
- voice limits;
- virtualization;
- expired one-shot;
- dialogue priority/ducking;
- BattleSector semantic conversion;
- audio-enabled equality;
- no gameplay RNG consumption;
- deterministic presentation choices;
- off-camera audibility;
- quality logical equivalence;
- layered weapon/artillery contracts;
- vehicle/aircraft/snapshot parameters.

## Critical 1 km result

Input:

```text
explosion at (1000, 0, 0) m
listener near origin
emittedAt = 12.000 s
speed of sound = 343 m/s
```

Observed prototype decision:

```json
{
  "distance": 1000.001,
  "band": "VERY_DISTANT",
  "emittedAt": 12,
  "audibleAt": 14.915456,
  "delay": 2.915456,
  "gain": 0.004412,
  "lowPass": 4499,
  "priority": "MEDIUM",
  "virtual": false
}
```

The test also verifies 686 m -> exactly 2 s by the same generic function. There is no 1000 m special case.

## Scenario coverage

### A — rifle at 15 m
Classifies as CLOSE; full nearby weapon path remains eligible.

### B — MG at 250 m
Classifies as DISTANT; distance filtering/report path is selected.

### C — artillery impact at ~1 km
VERY_DISTANT, ~2.915 s propagation delay, filtered highs, audible rather than discarded.

### D — explosion outside while listener is inside
Combines distance attenuation with blocked-path gain reduction, low-pass and SMALL_ROOM wet/reflection parameters. Wall does not mute the event.

### E — approaching tank
Produces a spatial event decision plus engine RPM/load parameters. It does not implement a vehicle controller.

### F — aircraft overhead
Produces a spatial event decision plus bounded Doppler/altitude parameters.

### G — 50 simultaneous distant shots
Medium quality result:
- 18 active weapon voices;
- 32 virtual voices;
- no need for 50 live Web Audio sources.

### H — mission dialogue during battle
Mission-critical dialogue receives CRITICAL priority and moderate contextual ducking. Explosion bus is reduced only slightly rather than silenced.

## Scheduling/mix microbenchmark

Measured only in the isolated Node prototype. These are not browser FPS, audio-thread timing, or Chromebook performance.

Five independent process runs were taken. Median wall-clock time for planning all events + voice allocation:

| Events | Median ms | Active voices at end | Virtual voices |
| ---: | ---: | ---: | ---: |
| 100 | 2.562 | 40 | 60 |
| 500 | 4.595 | 40 | 460 |
| 1000 | 14.974 | 40 | 960 |
| 5000 | 41.562 | 40 | 4960 |

Observed five-run ranges:
- 100: 2.346–5.657 ms;
- 500: 4.332–4.921 ms;
- 1000: 14.508–21.087 ms;
- 5000: 33.360–47.822 ms.

Interpretation: the pure decision layer is bounded by voice budgets and does not scale live voices with event count. This does **not** prove final Web Audio performance.

## Determinism / gameplay independence

The prototype:
- imports no simulation module;
- receives no gameplay RNG;
- uses stable event hashing for sample/pitch/gain/tail selection;
- leaves a supplied gameplay object byte-for-byte equivalent in the test;
- produces identical logical event time/type with audio enabled vs disabled;
- allows quality to affect only presentation budget/reflection details.

A production integration still needs an end-to-end M01 snapshot/RNG equality test because this task deliberately does not edit production runtime.

## Limitations

Not validated here:
- full `npm test` on the repository checkout;
- `npm run build`;
- browser/Web Audio execution;
- HRTF/PannerNode behavior;
- real ConvolverNode cost;
- authoritative world occlusion query;
- room/portal extraction;
- final sample assets;
- final loudness calibration;
- final weapon identity;
- human listening test;
- Chromebook performance.

These remain future integration gates and must not be inferred from the isolated prototype.
