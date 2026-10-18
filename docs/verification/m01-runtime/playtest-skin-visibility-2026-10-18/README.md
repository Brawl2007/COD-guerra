# Playtest 2026-10-18: soldiers without skin / invisible enemies (renderer only)

Captured in the real game (`?debug=1`, quality High, Playwright Chromium/SwiftShader 1280x720) from restored route snapshots
(`tests/helpers/m01-route.js`), paused at the same sim clock. "before" = `f6913a0`, "after" = the commit that adds this folder.
Cameras for the close views are diagnostic snapshots (player moved/turned); no simulation rule or save format changed.
This is SwiftShader evidence of "it renders", not FPS and not a human playtest.

| File | What it shows |
|---|---|
| `de45m_...`, `de90m_...` | 44 Germans in the 06:10 line. Before: 28 skinned (budget), the rest and every shadowed body read as black specks. After: all 44 skinned (budget 48), fog-coloured edge light at 45 m, aerial-perspective fill at 90 m. |
| `ally214m_...` | Ally at 214 m: before a box proxy (160-350 m gap), after the skinned LOD2 body. Small gain at this size; it removes the proxy gap. |
| `near_allies_5-8m_unchanged.png`, `near_germans_12m_unchanged.png` | Near range was already fully dressed (uniform, helmet, webbing, rifle) before and after. `assets.failures` is `[]` in every capture. |
| `diagnostics.json` | `characters.active/limit/lodBands/submittedMeshes/failures` and impostor counts per view, before and after. Cost of the change: the 44-German line goes from 168 to 288 submitted meshes (28 -> 48 skinned bodies x 6 draws). `renderer.info` was not collected. |

`de45m`, `de90m` and `near_germans_12m` are from the final shader build; the other "after" captures come from intermediate builds whose LOD/budget logic is identical (counts do not depend on the shader).
An impostor contrast experiment (hostile ink contrast 4.5) showed no measurable pixel change at 3 px and was reverted.

Not changed and not provable from these captures: the Germans in the standard route stay >= 1000 m from the player (sim positions) and
are 3x2 px impostors behind bridge girders; see the report for what that needs.
