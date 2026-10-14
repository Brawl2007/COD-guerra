# Independent review — M01 T31/T33

DECISION: **ACCEPT**

TASK_ID: `M01-T31-T33-RAIL-PROPS-V1`
SOURCE_HEAD: `6878d01e895787342d5f43b98524d47d53475943`
BASE_HEAD: `02f2145cd71ce17a6af84ef611823a0c0f1ddac5`
WORK_BRANCH: `codex/m01-t31-t33-rail-props-v1`

This independent review accepts the frozen renderer source against the supplied runtime Task Contract. It does not certify a subsequent integration commit. The reviewer read the repository instructions, contract, exact source/base diff, affected runtime implementations, focused tests and verifier report. `context_packet.py check` independently returned **VALID** before review. No production, tests, contract, branch, commits or other evidence were changed; this report is the sole reviewer write.

## Criteria and concrete findings

- **Acceptance:** T31 has four real `InstancedMesh` batches for rails, sleepers, ballast and fishplates. Independently constructing the runtime produced High counts **11169 / 5867 / 1855 / 960**, and Low retained **2935 sleepers** in the same four batches. Source descriptors implement 0.63/1.26 m spacing, 15 m fishplates, head/web/foot profiles, siding tongues/frog and continuous approach ballast. Production train detail skips its original track through an explicit owner marker; its standalone track API and original train art remain guarded by an exact, bounded normalization test.
- **Actual bridge geometry:** the reviewer independently parsed all three immutable railway GLBs. Each has ten supports, final support **1049.2**, and span09 pivot **962.9000000000001** plus length **81.8**, ending at **1044.7**. The connector, grade and gauge endpoints in source agree with that authority and the fixed train endpoint at **1062 / −0.82 / centres ±2.5**. The approximately **6.5%** presentation grade is an explicit authorized reconstruction. Original bridge, locomotive, wagon and terrain authority bytes remain unchanged.
- **Actual prop geometry:** independently loaded all **42 GLBs / 21 types** and compared source index triangle counts with both the immutable manifest and flattened streams: all matched, totaling **18578 source triangles** across both LODs. Rebuilding the atlases from these real assets produced exactly **three batches**: LOD0 buckets of **12 and 9 types**, and LOD1 of **21 types**. Padding was independently checked to contain only zero values, hence coincident zero-area triangles. The atlases total **3899392 bytes of CPU float data**; this is not a physical VRAM measurement. Runtime draws **1..3** meet the eight-draw cap.
- **Scope and authority:** independent protected base-to-source and source-worktree checks passed. Gameplay/core/world, missions, asset/model/generator bytes, protected structures and configuration have no diff. Added prop placements are visual-only. Simulation still owns damage, visibility and mission state; renderer revisions only invalidate presentation. The bounded train test update preserves the original accepted source after reversing only the enumerated ownership changes, rather than dropping its authority assertion.
- **Correctness and ownership:** first load failure immediately releases fulfilled siblings, pending/stale results release once, and atomic residency controls fallback visibility. Same-capacity restores reuse prop meshes, matrices, attributes and atlases. Steady synchronization has no resource reload/rebuild; track rebuilding is confined to world reference/revision changes. Four owned floor material clones preserve borrowed resources; reveal-off disables their discard and restores floor appearance, while disposal restores the original material references. Only the two legacy eastern rail/timber batches are suppressed. The environment restores source materials before source asset teardown. Reviewed raycast proof reproduces **47 western / 196 eastern** formerly buried samples with **zero retained occlusions**, and focused tests cover bounds, foundation preservation and untouched vertex arrays.
- **Architecture and regression risk:** ownership stays within the environment, optional prop runtime and shared track renderer. Atlas shader injection and contact discard are localized, explicitly budgeted and regression-tested against actual geometry. Draw reduction trades additional padded vertex submissions and retained source/atlas memory for fewer batches; acceptance does not imply a measured speedup. No blocking regression or scope expansion was found.

## Evidence sufficiency

**SUFFICIENT.** Both retained CI logs identify the exact frozen SHA: normal run **38279380748** passes **661 Node tests / 173 tooling tests / 89-module build**; focused run **38279380744** passes protected authority, **83 collider boxes**, route **26 events / 4 checkpoints / health 92**, and **3/3 browser tests**. Final local `browser.json` reports **3 expected, zero unexpected/skipped/flaky**. Heavy suites were not redundantly rerun by this reviewer.

The reviewer directly viewed **all 15 final candidate on captures**, including required **01/02/03/07/10/16**, the west/east/train/switch closeups and actual telegraph/crane/sleeper/lantern props. Also directly inspected significant corresponding immutable-baseline captures, Low/High, failed-load fallback and late paused residency. Rails, source prop silhouettes and fallback replacement are visibly present; the closed original gate is preserved. Two-sided views establish each endpoint, while the gate-hidden interval is covered by real-geometry contact proof.

Independent comparison of the raw candidate and baseline JSON confirms **15/15 identical snapshots, diagnostic players and clocks**, drawn clock equals simulation clock, and all recorded control-region differences are zero. The final 15-view baseline record correctly consists of **13 original views plus two corrected-camera recaptures**, not a claimed new complete baseline run. Four raw restore samples hold at **clock/drawn clock 0.05, 374 geometries and 74 textures**.

The full route JSON equality evidence remains honestly tied to earlier `ab85e6b`; byte-identical gameplay inputs carry it forward, and fresh exact-head CI separately completes the route. The initial FAIL and superseded assumptions remain archived. One fix attempt is represented; this review has no rejection.

## Required fixes and limits

REQUIRED_FIXES: **None for acceptance of this source.**

- The original T12/project licence choice remains unresolved and unchanged. No new commercial licence or final-asset approval is asserted.
- Supplemental clutter beside the old hut is removed at residency without same-anchor replacements; direct baseline comparison confirms this documented composition change. The 30 production cluster anchors are otherwise retained.
- No FPS, reference-PC speed, physical VRAM, historical survey or human playtest claim is supported. Existing visual issues outside this scoped rail/prop presentation are not resolved by these captures.
- `ASSET_CREDITS.md` still describes T33 as not linked to runtime. That inherited status wording is stale; runtime source and this report establish T33 residency, while the preserved attribution/licence remains authoritative.

NEXT_ACTION: Captain completes regression/memory/documentation processing and the authorized integration gates, with tests and build on the resulting integration commit. Refresh the Context Packet after this report write before further delegation.
