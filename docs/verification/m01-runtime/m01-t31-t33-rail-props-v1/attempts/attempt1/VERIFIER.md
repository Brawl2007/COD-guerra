# Independent verification — M01 T31/T33

STATUS: **FAIL** at frozen source `ab85e6b942628ebb032fbe3b53660b2e95ec392f`, branch `codex/m01-t31-t33-rail-props-v1`, base `02f2145cd71ce17a6af84ef611823a0c0f1ddac5`.

The west contact does not meet the required visual continuity criterion. This finding comes from the actual production renderer capture and independent terrain geometry reconstruction, not an implementer claim. Production source was read-only throughout verification.

## Required correction

In `captures/candidate/close-west-join-5m-on.png`, the new heads reach the west support at x=0, then disappear into terrain before the immutable bridge approach becomes visible farther east. The exact head endpoint coordinates agree numerically, but that is insufficient when the ground hides the receiving heads.

The original `approachTrack()` owns x=0..24.5, with rail top −0.17→+0.012 m, track centres ±2 m, head centre offsets ±0.7175 m, and 0.07 m head width. The candidate's material discard is restricted to x=[−15,0]. Independent reconstruction of the exact `m01-view.js` terrain mesh (`PlaneGeometry(2000,650,400,130)`, rotated and translated as production, vertices from immutable `terrainHeightAt`) and downward raycasts show:

| x (m) | Rail top (m) | Heads covered by retained terrain |
|---:|---:|---:|
| 1 | −0.16257 | 4 / 4 |
| 2 | −0.15514 | 3 / 4 |
| 3 | −0.14771 | 3 / 4 |
| 4 | −0.14029 | 2 / 4 |
| 5 | −0.13286 | 0 / 4 |

Raw samples, including ground height and the current discard predicate, are preserved in `verifier-west-contact-occlusion.json`. The receiving rail therefore has a hidden interval of roughly 1.5–5 m, depending on the rail. A bounded positive-x presentation reveal under the existing bridge ballast is a possible narrow correction; the implementer must choose and verify the correction while preserving bridge, world and asset authority. Re-freeze source and rerun the affected numeric/contact test and actual closeup before independent re-verification.

## Checks completed

- Independent `node --test tests/m01-track-bed.test.js tests/m01-props-runtime.test.js`: **11/11 PASS**, no skips; `verifier-focused-node.log`. This includes actual 42 accepted GLBs, geometry/PBR/normal transforms, bucket padding, failure/disposal ownership, world restore resource reuse, spacing and numeric endpoint checks. Their current passing results do not detect the positive-x occlusion above.
- `git diff --exit-code HEAD -- src assets tools tests .github`: **PASS**; inspected source remained byte-identical to the frozen commit.
- Protected base-to-HEAD authority diff covering game/core/world, missions, assets, generators, station/field/bridge structure and configuration: **PASS**. No new collider, route or cover authority was found in the renderer changes.
- Root-focused Node log: **30/30 PASS**. Exact-source CI run `38270579779`, job `114883547960`: raw `ci-node-build.log` identifies the frozen SHA, reports **659/659 Node**, **173 tooling**, and a successful **89-module build**. The independent verifier inspected the saved log, rather than rerunning these heavyweight checks.
- `colliders.log`: actual **83 boxes verified**. `route-equivalence.json` reports the full source/base route result equal, with **26 events / 4 checkpoints / health 92**; `route.log` completed. This is an automated simulation route, not a browser playthrough.
- Static inspection confirms four actual track InstancedMesh batches including production train extension, no duplicate production-consist track allocation, three actual prop atlas batches, inverse-transpose normal handling, original material PBR and linear colors, immediate fulfilled-sibling cleanup on rejection, once-only late disposal, proxy fallback, and paused-frame residency/debug invalidation.

## Image inspection and remaining evidence

Inspected actual immutable-baseline/candidate-on pairs for all six required canonical views **01/02/03/07/10/16**, plus station yard, bridge east, telegraph kit, crane, sleeper stack/lantern and the west 5 m contact. The fixture has **15 distinct views** (6 canonical + 9 detail), not 16. The required remaining east/train/switch 5 m views, completed Low/High/restore/failure browser results, final saved same-pause metadata and browser CI were still pending when this blocking finding was issued; no PASS is inferred for them.

The inspected prop closeups show actual pole crossbars and wire strands, crane, cart/barrel composition, sleeper stack, lever and lantern. Canonical view 10 shows the west approach toward the bridge, but only the 5 m view resolves the blocking hidden contact. The old supplemental hut timber/crates disappear after residency; new composition retains the 30 established production cluster anchors elsewhere. This is a documented art placement limitation, not a claim of a same-position hut upgrade.

Context packet check reported `STALE: dirty_changed` while capture/log evidence was still being written. Direct frozen-source and protected-byte checks were clean. A settled **VALID** packet is still required for the eventual formal PASS.

EVIDENCE_SUFFICIENT: **YES for FAIL; NO for PASS**.

RECOMMENDED_NEXT_ACTION: make the smallest permitted renderer-only west-contact correction, preserve this failed source/evidence, and return a new frozen head for independent verification. No commit, push, branch switch, production edit, FPS claim, physical VRAM claim, historical survey claim or human playtest approval was made by this verifier.
