# Independent verifier — attempt 1

> Historical attempt-1 finding. Its assumed approach endpoint24.5 and proposed gate-open fixture were superseded by direct immutable GLB inspection: west approach10.4, last span1044.7, support1049.2. Final two-sided join views preserve the closed gate. See `VERIFIER-SOURCE-FIX1.md` and final `VERIFIER.md`; this report does not describe the accepted source.

**FAIL** — source `ab85e6b942628ebb032fbe3b53660b2e95ec392f`; base `02f2145cd71ce17a6af84ef611823a0c0f1ddac5`. Production source was read-only, with both frozen-source cleanliness and protected-byte diffs passing. Independent focused Node: **11/11 PASS** (`verifier-focused-node.log`).

The actual `attempts/attempt1/captures/close-west-join-5m-on.png` shows the new heads entering terrain at x=0 before the bridge approach resumes. Matching numeric endpoint coordinates does not establish the required visible continuity. The original bridge approach is x=0..24.5 with top −0.17→+0.012, while the new terrain reveal ends at x=0.

I independently reconstructed the production terrain and raycast its triangles at all four immutable head centres. Raw results are in `verifier-west-contact-occlusion.json`. At x=1 all four rail tops (−0.16257 m) are beneath retained ground; at x=2 and x=3 three heads remain buried, at x=4 two remain buried, and at x=5 all emerge. The contact therefore contains a visible hidden interval of roughly 1.5–5 m, depending on the rail.

Reproduction core, using the same Three.js and immutable world source as production:

```js
const world = new TczewWorld();
const geometry = new THREE.PlaneGeometry(2000, 650, 400, 130);
geometry.rotateX(-Math.PI / 2);
geometry.translate(300, 0, 40);
const p = geometry.attributes.position;
for (let i = 0; i < p.count; i++)
  p.setY(i, world.terrainHeightAt(p.getX(i), p.getZ(i)));
const mesh = new THREE.Mesh(geometry,
  new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
mesh.updateMatrixWorld(true);
const railTop = x => -0.17 + 0.182 * x / 24.5;
// For x=0..5 and z in [-2-.7175,-2+.7175,2-.7175,2+.7175]:
ray.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
const groundY = ray.intersectObject(mesh)[0].point.y;
// groundY > railTop(x), with x>0, is not discarded by the current shader.
```

Required correction: a narrowly bounded render-only reveal beneath existing positive-x bridge ballast, followed by a new frozen source and real closeup re-verification. Preserve bridge geometry/assets, terrain vertices, world heights, train positions and gameplay authority. Root concurs with this blocking finding.

Root additionally identified the initial closed-start east/train 5 m camera views as obstructed by the abutment/closed gate. Replace those evidence fixtures with inside-corridor cameras and a coherent gate-open route snapshot; changed-pixel counts alone do not prove an obscured join. This second fixture issue is root-reported, not independently imaged by this attempt.

The six canonical baseline/on pairs and several actual prop closeups were independently inspected. Other browser lifecycle cases and final browser CI were still running; no PASS is inferred. The context packet remains stale from evolving evidence and must be refreshed for the final gate. See `VERIFIER.md` for checked source behavior and limitations.

**EVIDENCE_SUFFICIENT: YES for FAIL; NO for PASS.** Next: targeted correction within fix attempt 1, then fresh independent verification. No FPS or physical VRAM claim.
