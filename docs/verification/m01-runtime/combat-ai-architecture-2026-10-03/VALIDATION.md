# Combat AI prototype validation — 2026-10-03

Task: `M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1`

Scope: isolated architecture prototype only. These measurements are **not game FPS** and do not validate production M01 integration.

## What was executed

Local execution environment:

- Node: `v22.16.0`
- Platform: `linux x64`
- Prototype: `tools/verification/m01-combat-ai-prototype.mjs`
- Focused tests: `tests/m01-combat-ai-prototype.test.js`

Focused command equivalent:

```sh
node --test tests/m01-combat-ai-prototype.test.js
```

Result:

```text
tests 21
pass 21
fail 0
cancelled 0
skipped 0
todo 0
```

The exact local repository-layout copy used for validation passed 21/21 before publication.

## Covered invariants

1. no magic tracking after LOS is lost;
2. directional cover protection;
3. cover reservation and lease expiry;
4. suppression accumulation and source direction;
5. deterministic suppression decay;
6. PINNED hysteresis/recovery;
7. protected reload preference;
8. flank requires permission, confidence, allies, route and acceptable exposure;
9. grenade evasion reaches safe cover;
10. grenade throw rejected near allies;
11. retreat point is away from threat and near rally/friendlies;
12. deterministic formation spacing;
13. same seed + same inputs => same timeline;
14. camera independence;
15. LOW/MEDIUM/HIGH quality independence;
16. no duplicate reservation on capacity-1 cover;
17. movement step cannot cross a wall;
18. friendly-fire corridor blocks unsafe shot;
19. wounded help is gated by risk/firepower/route;
20. cover selection obeys order radius and route obstruction;
21. end-to-end prototype timeline contains cover, suppression, movement, PINNED, reload and retreat.

## Required timeline

```text
t=0.0  contact           -> MOVE_TO_COVER (c-west)
t=0.8  cover reached     -> SUPPRESS
t=1.0  second ally       -> MOVE_TO_COVER (c-mid)
t=1.4  heavy suppression -> PINNED (intensity 0.876)
t=5.0  empty magazine    -> RELOAD
t=12.0 withdraw order    -> SHORT_WITHDRAW
```

This demonstrates the intended separation between a persistent order and immediate behavior without integrating into `M01Simulation`.

## Scenario matrix

| Scenario | Prototype evidence |
| --- | --- |
| A — OPEN FIELD | selects `c-west` cover |
| B — STREET | selects reachable directional `c-west` |
| C — BUILDING | doorway capacity-1 remains reserved by `a0`; second reservation rejected |
| D — SUPPRESSION | PINNED at peak; recovered after deterministic decay |
| E — GRENADE | selects reachable `c-grenade-safe` outside blast radius |
| F — CASUALTY | help allowed only with acceptable risk/firepower/route |
| G — RETREAT | selects `r-west`, away from threat and toward rally/friendlies |

## Isolated performance

Method:

- 25 decisions per synthetic agent;
- 24 candidate cover nodes;
- deterministic threat observations and deterministic RNG;
- three runs for each population;
- median reported below;
- no rendering, physics scene, audio, full pathfinder or production mission runtime.

| Agents | Decisions | Median elapsed | Median µs/decision | Deterministic checksum |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 2,500 | 141.054 ms | 56.422 | 3939463441 |
| 500 | 12,500 | 615.731 ms | 49.258 | 3836484418 |
| 1,000 | 25,000 | 1,370.941 ms | 54.838 | 3253408429 |

Each population produced the same checksum in all three repetitions, supporting deterministic decision output for the measured workload.

### Approximate memory

The prototype's serialized-state proxy is **555 bytes per agent** for the sample actor + ThreatMemory + suppression + current intent.

| Agents | Approx. serialized state proxy |
| ---: | ---: |
| 100 | 55,500 bytes (~54.2 KiB) |
| 500 | 277,500 bytes (~271.0 KiB) |
| 1,000 | 555,000 bytes (~542.0 KiB) |

This is a serialization-size proxy, **not resident JavaScript heap usage**. Engine object overhead, maps, arrays, path data and adapters will increase real memory.

## Performance interpretation

The benchmark proves only that the isolated decision functions can be exercised deterministically at 100/500/1000 synthetic actors and gives a baseline cost for this implementation. It must not be converted into an FPS claim.

Future production work should avoid evaluating all expensive cover candidates for every actor every frame. The architecture therefore recommends event-driven urgent reactions, low-frequency tactical reevaluation, cached routes and NEAR/MID/FAR fidelity.

## Validation not claimed

Not run/claimed in this checkpoint:

- full repository `npm test`;
- `npm run build`;
- browser suite;
- CI on Node 24;
- real M01 FPS;
- integration with `M01Simulation`;
- save/schema compatibility for new AI state.

Reason: the task explicitly keeps the prototype isolated and no production files were modified. The execution environment also cannot clone GitHub over its container network, so this report records only commands actually executed rather than fabricating CI evidence.
