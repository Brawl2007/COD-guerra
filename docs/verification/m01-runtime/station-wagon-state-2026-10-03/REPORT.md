# M01 — West yard wagon runtime state

Date: 2026-10-03
Task: `M01-STATION-WAGON-STATE-V1`
Model: GPT-5.6 Sol
Effort: HIGH

Base branch/head:
- `codex/m01-mg34-prone-runtime`
- `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

Branch:
- `codex/m01-station-wagon-state`

Current head:
- `5993df198a0248b78aca86d988f2f7f3a98474f7`

## Scope

Connect the already-persisted M01 state `station_wagon_fire` to the existing intact/burned wagon assets for the reconstructed west station yard.

No new simulation rule was added.

## Production changes

- added `src/render/m01-yard-wagons.js`
  - three reconstructed yard wagons at the three `freight_wagons_west` X/Z positions;
  - `cv_wagon_1` / `cv_wagon_2` remain the existing cover authority;
  - third visual wagon has no invented cover collider;
  - low quality uses LOD1, medium/high use LOD0;
  - missing optional GLBs fall back to procedural wagon proxies;
  - the third wagon changes from intact to burned only when `sim.destruction` contains `station_wagon_fire`;
  - runtime Y comes from `world.heightAt()`, preventing the metadata y=0 from floating above the current procedural terrain;
  - fire/smoke positions derive from the authored `fire` and `smoke_top` sockets in the intact wagon manifest.

- modified `src/render/m01-view.js`
  - loads/updates/disposes the yard wagon renderer;
  - diagnostics expose yard wagon state/LOD/position;
  - a small presentation-only flame is visible while `station_wagon_fire` exists;
  - smoke is fed to the atmosphere from the same persisted state and event timestamp.

- modified `src/render/m01-atmosphere.js`
  - `station_wagon_fire` smoke remains persistent like the mission script/checkpoints require.

## Tests added

`tests/m01-station-wagon-state.test.js` covers:
- all three reconstructed map points;
- separation from `cv_wagon_1/2` collision/cover authority;
- only the third wagon changing to burned;
- `evt_m01_wounded_dragged` producing persisted `station_wagon_fire`;
- save/restore preserving the destruction state;
- LOD policy;
- runtime terrain placement;
- fire/smoke socket positions.

## Preserved

No changes to:
- `src/game/**`;
- mission data;
- map data;
- RNG;
- schema 2;
- checkpoints;
- objectives;
- casualties;
- MG34 prone;
- CKM crew state;
- train 963 composition/LOD2;
- workflows;
- `main`;
- Graphify.

## Validation status

The captain environment does not have a repository checkout and cannot resolve github.com from the container, so npm dependencies/tests/build/browser could not be executed here.

There are no GitHub check runs for this branch.

Therefore:
- code review: completed;
- focused test file: written, **NOT EXECUTED**;
- `npm test`: **NOT EXECUTED on this head**;
- `npm run build`: **NOT EXECUTED on this head**;
- browser suite: **NOT EXECUTED on this head**;
- Chromebook FPS: not part of this task.

Do not promote this candidate until those validations run.

## Recommended validation

```bash
npm ci
node --test tests/m01-station-wagon-state.test.js
npm test
npm run build
npm run test:browser
```

Then visually verify in browser:
1. before the 04:34 bombing, the three west-yard wagons are intact and seated on the terrain;
2. after the scripted wagon-fire state, only the third wagon changes to the burned kit;
3. smoke/flame originates at that wagon;
4. checkpoint restore keeps it burned and does not duplicate effects;
5. low/medium/high quality keep the same gameplay state.
