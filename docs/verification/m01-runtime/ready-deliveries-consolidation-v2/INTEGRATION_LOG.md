# M01 consolidation V2 — ready deliveries

## Integrated — Train consist detail and coupling polish

- Source `claude/m01-train-detail-coupling-polish-v1` at `e588c0cda2bbe191f752792ec7e05f865fcff1a5`.
- Exact blob integration of 88 nonconflicting files, including wagon coupling visuals, wheel/rail grounding, 65 wagons, focused tests and source handoff.
- `DEVELOPMENT_STATUS.md` and `docs/NEXT_CHAT_CONTEXT.md` are intentionally retained from consolidation base, not blindly overwritten. Both source branch snapshots remain in Git ancestry; dedicated `docs/verification/m01-runtime/train-detail-coupling-polish-v1/HANDOFF.md` carries this task's status/evidence.
- Integration's Node/build/browser tests have not yet passed on combined tree. M01 remains PROTÓTIPO JOGÁVEL. No `main` / deploy changes.

## Integrated — Bridge structural production closeout V2

- Source `codex/m01-bridge-structural-production-closeout-v2` at `54c94fd97c9a282eb9dfe7dbd409449571938813` with original source files, handoff, tests, screenshots and workflow.
- Semantic non-destructive integration of `src/render/m01-view.js` and `m01-environment.js`: retain Station V2 sections and add bridge material, truss/rivet/deck/rail structure and disposal. Patch segments matched uniquely.
- Historical `DEVELOPMENT_STATUS.md` and `docs/NEXT_CHAT_CONTEXT.md` kept on this consolidated branch; source notes preserved in Git history and dedicated HANDOFF.
- No runtime/regression certification until combined CI passes. No main/deploy change.

## Integrated — M01 HUD Cinematic Presentation V1

- Source `codex/m01-hud-cinematic-presentation-pass-v1` at `4b0e883dd58988fbbcaf24c062f69285c46a1457`; all source assets and tests preserved.
- Merged `src/game/game.js` semantically: keep Animation Contract diagnostic and add HUD state/scene presentation; preserve scene timers and gameplay. Historical status docs retained; task README and source parent preserve evidence.
- Combined CI pending; no main/deploy changes.

## Integrated — M01 vegetation and foliage production closeout V1

- HEAD `21c1ae653836522e74c071c31e917a1609f5611a`; source code/tests/screenshots retained and merged.
- Retain Station `dispose()` while adding foliage and ground-shadow cleanup. Retain bridge rail and Station imports; simulation/colliders unchanged.
- Task source handoff retained; common status docs retained from checkpoint. Combined CI still required, main/deploy untouched.

## Integrated — battlefield audio production pass V1

- Source `2d797a1f5988cc1d86f0f2260967c6b0a170eddd`: Web Audio buses, source profiles, acoustic paths and real-event subscriptions.
- Reconciled `src/game/game.js` while keeping HUD controller and animation diagnostic; `m01-view.js` retains Bridge/Station/Foliage resources.
- All source tests, recordings and REPORT remain in tree. Integration CI is still necessary, with no main/deploy updates.

## Integrated — Ju 87 production aircraft closeout V2

- Source 4a8063916ad858fe594346b76915b9b9b6b8a12c: high/medium/low aircraft material improvements, procedural painted surfaces, faded LOD, animated attitudes, frame-warmup, original GLBs and evidence.
- Semantic integration preserves **shared first-raid and second-raid audio flight paths** (`m01StukaPosition` / `m01RaidPlanePosition`), preserves Station/bridge/vegetation and adds `ju87HeardAt` audio timing.
- Guard-test asset whitelist expanded without removing previously approved engine-contract protection. Source licence and RUNBOOK updated without dropping prior lines.
- Combined CI pending; no deploy or main change.

## Integrated — first-person weapon presentation V1

- Source f6db41d5ead1a21871fb674b396886f9805de16f; viewmodel FX, shell casings, lighting, pose, tests and handoff.
- Semantically integrated src/render/m01-view.js with existing Station, Bridge, Vegetation, Audio, Ju87 and disposal, without touching gameplay.
- Combined Node/build/browser pending. main and deploy untouched.
