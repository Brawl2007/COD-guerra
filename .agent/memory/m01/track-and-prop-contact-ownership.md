---
MEMORY_VERSION: 1
TASK_ID: "M01-T31-T33-RAIL-PROPS-V1"
CATEGORY: "renderer ownership"
STATUS: CURRENT
DATE: "2026-10-12"
BRANCH: "codex/m01-t31-t33-rail-props-v1"
SOURCE_HEAD: "6878d01e895787342d5f43b98524d47d53475943"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

Track and prop ownership now belongs to dedicated presentation controllers. Preserve actual source metadata and material restoration when replacing the terrain renderer.

# Confirmed facts

The immutable railway GLB has ten supports ending1049.2; last span09 pivot962.9 plus length81.8 ends1044.7. West approach ends10.4. Existing bridge heads imply inner gauge1.365m; the fixed train uses1.435m. Locomotive anchor1075 and first wheel1068.23, wagons1090 onward, were never moved.

New track supplies flat1044.7→1049.2 then approximately6.5% presentation grade to1062 at−0.82. This is an explicitly accepted prototype reconstruction without historical-grade claim. Four instanced batches own approaches, switch and train extension; standalone train-detail API remains available.

Source decorative floor ends1067.2 at about−0.35. Four cloned stone/course materials reveal only fragments above new bed crown inside two3.4m footprints1049.2..1067.2. Foundation and exterior masonry remain. Off/dispose restores originals; borrowed textures survive. Environment teardown precedes AssetManager disposal. Ground contact hooks compose with macro and legacy soil materials; terrain vertices and gameplay heights stayed unchanged.

All42 T12 GLBs/21 types feed three actual heterogeneous atlas batches. Padding is degenerate and its submitted overhead is reported. Partial/hung/late loads release once; same-capacity restores retain instance attributes. Licence remains unresolved as authored. Old supplementary hut clutter is cleared without replacement at its original anchors.

# Evidence and constraints

Independent verifier PASS and reviewer ACCEPT, 661 Node,173 tooling, build89, both browser runs3/3. Fifteen paused view snapshots match real immutable-base captures; controls0. Restore plateau374 geometries/74 textures. Actual gate bounds1058.45..1058.75; two-sided endpoint views preserve the closed gate. Reports live in docs/verification/m01-runtime/m01-t31-t33-rail-props-v1/.

For future terrain work, retain these contact hooks, protected train/bridge bytes and regression obligations. Do not assume nominal metadata, replace real model geometry with proxy estimates, or infer FPS/VRAM from resource counts.

