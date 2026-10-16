# Fixed-camera before / after

BASE: `codex/m01-schema2-determinism-audit @ 5f3cc34f53c61beec52255d67f8babd7194c9f7f`. Candidate runtime: `0c07962bbf2ff4f894e5465cea5b6fb517bab38f`.

Production browser captures, 1280×720, identical full restored simulation state, staged camera position/angles, battle clock and explicit quality. Camera staging is evidence setup, not a production gameplay edit or a human playtest. All 18 full-state SHA-256 pairs match; all probes hold that state through capture while paused.

The baseline worktree contains only the same opt-in read-only `gameVerificationState` debug reader used by the candidate. No baseline simulation or renderer behaviour was patched. The source baseline is otherwise the exact approved commit.

High probes wait for all requested character/MG34/CKM LODs. PNG originals remain unchanged; paired JPEGs add only labels and side-by-side layout.

| Point | Camera x / y / z (m) | Mission seconds | Battle clock |
|---|---|---:|---|
| A-station | -327.00 / -3.00 / 12.00 | 174.950 | 04:40:15 |
| B-rail-sappers | -135.00 / 0.00 / 4.00 | 207.350 | 04:42:08 |
| C-bridge-approach | -50.00 / 0.00 / 42.00 | 207.350 | 04:42:08 |
| D-long-bridge | -145.00 / -3.00 / 76.00 | 746.750 | 06:05:00 |
| E-bombing | 660.00 / 0.00 / 40.00 | 808.250 | 06:13:03 |
| F-impact-dust | -6.00 / -2.52 / 11.00 | 73.450 | 04:34:19 |

| Pair | BASE original | CANDIDATE original | Side by side |
|---|---|---|---|
| A-station / medium | [BASE](screenshots/BASE-A-station-medium.png) | [CANDIDATE](screenshots/CANDIDATE-A-station-medium.png) | [Pair](screenshots/PAIR-A-station-medium.jpg) |
| B-rail-sappers / medium | [BASE](screenshots/BASE-B-rail-sappers-medium.png) | [CANDIDATE](screenshots/CANDIDATE-B-rail-sappers-medium.png) | [Pair](screenshots/PAIR-B-rail-sappers-medium.jpg) |
| C-bridge-approach / medium | [BASE](screenshots/BASE-C-bridge-approach-medium.png) | [CANDIDATE](screenshots/CANDIDATE-C-bridge-approach-medium.png) | [Pair](screenshots/PAIR-C-bridge-approach-medium.jpg) |
| D-long-bridge / medium | [BASE](screenshots/BASE-D-long-bridge-medium.png) | [CANDIDATE](screenshots/CANDIDATE-D-long-bridge-medium.png) | [Pair](screenshots/PAIR-D-long-bridge-medium.jpg) |
| E-bombing / medium | [BASE](screenshots/BASE-E-bombing-medium.png) | [CANDIDATE](screenshots/CANDIDATE-E-bombing-medium.png) | [Pair](screenshots/PAIR-E-bombing-medium.jpg) |
| F-impact-dust / medium | [BASE](screenshots/BASE-F-impact-dust-medium.png) | [CANDIDATE](screenshots/CANDIDATE-F-impact-dust-medium.png) | [Pair](screenshots/PAIR-F-impact-dust-medium.jpg) |
| A-station / high | [BASE](screenshots/BASE-A-station-high.png) | [CANDIDATE](screenshots/CANDIDATE-A-station-high.png) | [Pair](screenshots/PAIR-A-station-high.jpg) |
| B-rail-sappers / high | [BASE](screenshots/BASE-B-rail-sappers-high.png) | [CANDIDATE](screenshots/CANDIDATE-B-rail-sappers-high.png) | [Pair](screenshots/PAIR-B-rail-sappers-high.jpg) |
| C-bridge-approach / high | [BASE](screenshots/BASE-C-bridge-approach-high.png) | [CANDIDATE](screenshots/CANDIDATE-C-bridge-approach-high.png) | [Pair](screenshots/PAIR-C-bridge-approach-high.jpg) |
| D-long-bridge / high | [BASE](screenshots/BASE-D-long-bridge-high.png) | [CANDIDATE](screenshots/CANDIDATE-D-long-bridge-high.png) | [Pair](screenshots/PAIR-D-long-bridge-high.jpg) |
| E-bombing / high | [BASE](screenshots/BASE-E-bombing-high.png) | [CANDIDATE](screenshots/CANDIDATE-E-bombing-high.png) | [Pair](screenshots/PAIR-E-bombing-high.jpg) |
| F-impact-dust / high | [BASE](screenshots/BASE-F-impact-dust-high.png) | [CANDIDATE](screenshots/CANDIDATE-F-impact-dust-high.png) | [Pair](screenshots/PAIR-F-impact-dust-high.jpg) |

Low is recorded in the JSON/resource table for regression and cost, not used as the visual approval preset. Supplemental F is a genuine repair-area bomb damage record at 0.6 s, exposing pressure dust/chips without inventing a new event.

Reproduce: build a detached baseline worktree (with the documented reader), then run `tools/verification/m01-environment-capture.mjs <this-folder> BASE <baseline-root>` and again with `CANDIDATE <candidate-root>`. Set `CHROME_EXECUTABLE` to an installed WebGL2-capable Chromium and optionally `VISUAL_PORT` (default 4183). Run this report script after both complete.
