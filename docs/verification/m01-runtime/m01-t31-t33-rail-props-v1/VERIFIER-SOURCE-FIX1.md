# Independent verification — corrected source

**PENDING final evidence**, frozen source `6878d01e895787342d5f43b98524d47d53475943`. This is a source/contact verification result, not a formal PASS. No production edits, commits, pushes or branch switches were performed.

Independent focused execution: **13/13 PASS**, zero skips/failures (`verifier-fix1-focused-node.log`). Both exact-source worktree cleanliness and the complete protected base-to-HEAD authority diff passed.

Raw GLB JSON was independently parsed for all three railway bridge LODs. Each has ten supports ending at **1049.2**, and `rail_span_09` translation **962.9** plus actual geometry length **81.8** gives **1044.7**. The original west support approach length is **10.4**, not the assumed 24.5 used in the first attempt's reconstruction. The original eastern approach ends at **1058.2**, while actual last-support stone floor extends to **1067.2**. These corrected measurements supersede the earlier assumed-support measurements; the first attempt's buried-contact finding remains valid and is preserved in its archived evidence.

Independent geometry reconstruction/raycast results (`verifier-fix1-contact.json`):

| Actual geometry | Samples/hits | Originally covered rail heads | Covered heads left by corrected reveal |
|---|---:|---:|---:|
| Exact production terrain, west x=0..8 | 132 | 47 | 0 |
| Loaded original last-support GLB stone, east x=1049.2..1067.2 | 288 | 196 | 0 |

The focused actual-GLB test additionally checks all LOD material clones, the merged support-course material, geometry/vertex identity, retained foundations and exterior masonry, borrowed texture/uniform references, restored source materials, and off/dispose behavior. Static review confirms that bridge sync precedes suppression of the two last-support rail/timber batches, and environment teardown restores original materials before AssetManager teardown. The clone owner disposes its materials and does not dispose borrowed textures. No steady-frame geometry/material/texture rebuild is added.

Completed `smoke4-browser.json` reports **1/1 PASS**, no skips/flaky/global errors, 155.4 s. Its current west/east/train 5 m on images were inspected after completion. The west receiving rails are now visibly continuous. The new east view resolves the actual span connector and approach before the gate; the new train view resolves x=1062 from the other side. Direct GLTFLoader geometry bounds put the original closed gates at **x=1058.45..1058.75000019**. They therefore do not hide either required endpoint from its respective camera. The gates remain closed and authoritative; no gate-open state is claimed. A short interior interval behind the opaque gate cannot be judged from pixels, so actual floor raycasts and endpoint geometry support that portion.

The renderer's approximately **6.5%** short transition is an explicitly authorized prototype presentation reconstruction under the updated contract. It has no historical accuracy claim and does not move train/wagon art or physics. All protected source/model bytes remain identical to the base. Original T12 runtime source is unchanged from the first attempt; its actual-model batching, fallback and partial/disposal tests passed again.

Required final gates still pending: completed full production three-case browser result with all 15 views and matching immutable-baseline snapshots; Low/High and checkpoint plateau/failure evidence; green exact-head Node/tooling/build and browser/authority CI; settled **VALID** context packet. The archived first attempt's browser or CI results are not attributed to this source. No FPS, physical VRAM, human playtest or survey approval is claimed.
