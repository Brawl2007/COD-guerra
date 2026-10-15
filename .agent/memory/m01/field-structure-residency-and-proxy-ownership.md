---
MEMORY_VERSION: 1
TASK_ID: "M01-T13-T32-FIELD-STRUCTURES-V1"
CATEGORY: "rendering-ownership"
STATUS: CURRENT
DATE: "2026-10-12"
BRANCH: "codex/m01-t13-t32-field-structures-v1"
SOURCE_HEAD: "cbbe0d7624d39e444f02ac0bd200037a71b3cf8e"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

Original field structure GLBs replace two existing proxy paths only after an atomic per-structure set is resident. Controller asset/state revisions must invalidate both paused frames and opaque-solid batching.

# Confirmed facts

- M01FieldStructures owns each loader result immediately upon fulfilment. First rejection drains fulfilled partial results even if another sibling hangs; disposal drains resident/partial assets and late results release once. No steady-frame loads or geometry allocation.
- Proxy ownership spans M01Environment architecture/covers and M01View terrain/solid groups. Suppress all tagged shells and collider proxies only for resident records; failure/debug-off restores existing proxies. Sync before the paused-frame guard and include the field revision in the solid cache too.
- Real world removal of cv_forward_post after west demolition means inactive post with zero visible models. A restored world with the same revision still requires world-reference comparison. Intact/destroyed heights are 1.1/0.45 metres.
- Collision-backed GLB surfaces match actual world boxes; roofs/interiors/casemate artistic envelopes are explicitly distinct decoration. The kit adds no solids and keeps the six-metre west shed entry open.
- Global renderer geometry counts include first GPU uploads in a newly visible checkpoint view: 316 before, 343 on first restore, then exactly 343 across three identical restores. Warm one restore before testing a plateau; do not inflate a threshold to hide growth.
- Outside-rail post cameras can pass changed-pixel metrics while the truss hides the parapet. Use inside-corridor views and independently inspect images. Authoring gallery defaults hide shelter entry/lining and shed bench; supplemental real orbit angles expose them.

# Evidence

Verifier PASS and reviewer ACCEPT at cbbe0d7624d39e444f02ac0bd200037a71b3cf8e. CI38225594014: 648 Node, 173 tooling, build; CI38225594010: focused4/4, generator16files, colliders83, route26events/4CP/health92. Local production3/3; 15 gallery images, five feature angles, eleven paused A/B pairs and checkpoint-geometry-plateau.json under docs/verification/m01-runtime/m01-t13-t32-field-structures-v1/ and docs/assets/m01-field-structures/.

# Relevant files/systems

src/render/m01-field-structures.js, m01-environment.js, m01-view.js; tools/assets/m01-field-structures/; tests/m01-field-structures.test.js and tests/browser/m01-field-structures.spec.js.
