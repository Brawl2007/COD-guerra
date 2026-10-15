# Independent verification — M01 T31/T33

STATUS: **PASS** for frozen source `6878d01e895787342d5f43b98524d47d53475943`, branch `codex/m01-t31-t33-rail-props-v1`, base `02f2145cd71ce17a6af84ef611823a0c0f1ddac5`.

The corrected implementation satisfies the updated Task Contract with sufficient independent source, geometry, image and runtime evidence. The first attempt's FAIL remains preserved; no production edits, commits, pushes or branch switches were performed by this verifier. Independent reviewer acceptance and integration remain subsequent Captain gates.

## Verified checks

| Check | Result and evidence |
|---|---|
| Independent focused Node | **13/13 PASS**, no skips/failures; `verifier-fix1-focused-node.log` |
| Root affected-system Node | **32/32 PASS**; `focused-node.log` |
| Exact-source worktree cleanliness | `git diff --exit-code HEAD -- src assets tools tests .github`: **PASS** |
| Protected base-to-source authority | Complete game/core/world, missions, models/assets/generators, station/field/bridge structure and configuration diff: **PASS**, no changes |
| Exact-source normal CI | Run [38279380748](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380748), job `114912642743`: **661/661 Node**, **173 tooling**, **89-module build PASS**; checkout SHA and results independently read in `ci-node-build-corrected.log` |
| Exact-source browser/authority CI | Run [38279380744](https://github.com/Brawl2007/COD-guerra/actions/runs/38279380744), job `114912641972`: **3/3 browser PASS**, 16.6 min, protected authority, **83 collider boxes**, completed route **26 events / 4 checkpoints / health 92**; `ci-browser.log` |
| Final local production browser | **3/3 PASS**, zero unexpected/skipped/flaky/global errors, **831299.911 ms (13.9 min)**; `browser.json` and `browser.log` |
| Context Packet | Independently **VALID**, exact source SHA, **15 critical files**, immediately before this final report was written |

The full base route JSON comparison in `route-equivalence.json` was executed at the original `ab85e6b` and is not relabelled as a rerun. Its gameplay/route inputs remain byte-identical at the corrected source; fresh exact-source CI separately executed and completed the route. This proves automated route preservation and is not an uninterrupted browser mission playthrough.

## Independent acceptance findings

**T31 geometry and ownership:** four actual InstancedMesh submissions own the approaches, siding/switch and train extension. Production train detail skips its duplicate track; its standalone API and train art/positions remain preserved. High/Medium sleeper spacing is 0.63 m, Low uses prepared alternating instances at 1.26 m, and fishplates repeat at 15 m. No collider, route, cover, gameplay or persistence authority is added.

**Actual bridge authority:** all three raw railway GLBs were independently parsed. Ten supports end at **1049.2**; actual span09 pivot **962.9** plus length **81.8** ends at **1044.7**. The west support ramp is **0..10.4**, the old eastern approach ends at **1058.2**, and its decorative floor ends at **1067.2**. These measurements supersede the first attempt's assumed supports and 24.5 m ramp. Bridge inner gauge is **1.365 m**; the fixed train endpoint is **1.435 m**, top **−0.82 m**, centres **±2.5 m**. The flat connector and short approximately **6.5%** grade follow the explicitly authorized presentation scope without moving train wheels or modifying bridge/world/model bytes.

**Occlusion correction:** independent raycasts reconstructed the exact production terrain and loaded actual last-support stone geometry. West: **132 samples / 47 formerly buried / 0 retained occlusions**. East: **288 actual floor intersections / 196 formerly buried / 0 retained occlusions** (`verifier-fix1-contact.json`). The source and tests preserve terrain/source vertex arrays, foundations below the crown, and exterior masonry. Four owned material clones cover three LOD floors plus the merged rail support courses; only two legacy rail/timber batches are suppressed. Borrowed textures/uniform resources are retained, original materials/visibility are restored on off/dispose, and restoration precedes source asset teardown. No steady-frame resource rebuild was found.

**T33 actual model residency:** all **42 immutable T12 GLBs / 21 types** are loaded and flattened from their indexed source geometry, with scene transforms, inverse-transpose normals, linear colors and per-face PBR retained. Actual heterogeneous InstancedMesh atlases use three batches; observed draws are **1..3**, within eight. Zero-area padding overhead is honestly reported separately from source triangles. Atomic residency suppresses old proxies; failure/debug-off preserves fallback. Immediate fulfilled-sibling cleanup despite a hung sibling, once-only late/disposal ownership, and same-capacity restore reuse pass focused tests.

**Visual and pause controls:** all **15** current candidate on images and corresponding baseline views were inspected, including required **01/02/03/07/10/16**, actual prop closeups and west/east/train/switch closeups. Independent comparison confirms all 15 snapshots, diagnostic players and clocks equal their immutable-baseline records; drawn clock equals simulation clock; control-region maximum difference is **0** and changed-pixel minimum is **420** (`verifier-fix1-view-controls.json`). Updated east/train baseline cameras were recaptured on the immutable base; no claim of a single new 15-view baseline run is made. Gate GLB AABBs are **x=1058.45..1058.75000019**: the closed gate remains authoritative, while the two-sided cameras resolve each required endpoint. The short interval hidden by the gate is supported by actual geometry/raycast proof.

**Lifecycle and quality:** inspected final Low/High, rejected-load proxy and late paused-resident images. Browser tests pass quality changes, reload, delayed residency and identical saves/clocks. Four restore samples plateau at **clock/drawn clock 0.05, 374 geometries, 74 textures**, each retaining 42 loaded files, four floor clones and zero visible legacy approach batches. These are renderer resource counts, not physical VRAM measurements.

## Limits and next action

This is a prototype presentation acceptance, without FPS, reference-PC performance, physical VRAM, human playtest or historical survey claims. Supplemental old hut clutter is cleared at residency; the new composition retains the established 30 production cluster anchors elsewhere. The narrow floor reveal and short grade are explicitly authorized visual reconstruction, not altered physics. Existing kit authorship/licence bytes remain unchanged.

EVIDENCE_SUFFICIENT: **YES**. RECOMMENDED_NEXT_ACTION: independent reviewer evaluation, followed by the Captain's accepted-source integration gates. Refresh the Context Packet after this documentation-only report mutation before handing the packet to the reviewer; frozen production source is unchanged.
