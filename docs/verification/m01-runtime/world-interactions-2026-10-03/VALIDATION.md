# Validation — M01-WORLD-INTERACTIONS-ARCHITECTURE-V1

Base: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

All code in this task is isolated under `tools/verification/` and tests. No production runtime imports it.

## Prototype scenarios

Command:

```sh
node tools/verification/m01-world-interactions-prototype.mjs
```

Recorded output: `prototype-results.json`.

Observed contracts:

- A: dead-enemy Kar98k pickup keeps **4 rounds**; current Wz.29 dropped with its existing **2 rounds**.
- B: dropping the picked Kar98k keeps the same stable ID and **4 rounds** in world state.
- C: fixed MG entry/aim/exit works; extreme input is clamped to authored prototype traverse/elevation.
- D: jeep driver seat gives drive control; passenger/gunner remain separate seats; exit uses authored safe point.
- E: artillery prototype fires contractually only while a loader station remains occupied; player taking gunner does not replace loader.

These are architecture fixtures, not claims that a specific M01 emplacement/vehicle/artillery piece is currently player-operable.

## Focused tests

Node: `v24.21.0`.

```sh
node --test tests/m01-world-interactions-prototype.test.js
```

Final result:

- 25 tests;
- 25 pass;
- 0 fail;
- 0 cancelled;
- 0 skipped;
- 0 todo;
- 112.066262 ms.

Coverage includes proximity, obstruction, interaction priority, living-NPC ownership, protected weapons, exact ammo preservation, safe swap/drop, caliber vs feed family, deterministic cleanup, fixed MG operation, physical arc clamp, obstruction during mounted fire, crew dependency, vehicle seats, blocked entry, safe exit, destroyed/burning rejection, enemy capture policy, snapshot round-trip, atomic invalid-restore rejection, duplicate station occupancy and missing-asset independence.

## Full Node suite

```sh
npm test
```

Final result:

- 249 tests;
- 249 pass;
- 0 fail;
- 0 cancelled;
- 0 skipped;
- 0 todo;
- 28341.894817 ms.

## Build

```sh
npm run build
```

Result: PASS.

- Vite 8.3.1;
- 51 modules transformed;
- JS 1,108.66 kB / 292.51 kB gzip;
- build 489 ms.

The existing >500 kB chunk warning remains. This task did not modify production bundle input.

## Browser suite

Not run for this task. No production runtime, renderer, controls, HUD, browser test or asset was modified; the prototype is a Node-only isolated architecture model. Browser validation belongs to the future integration task after a production interaction resolver/runtime is introduced.
