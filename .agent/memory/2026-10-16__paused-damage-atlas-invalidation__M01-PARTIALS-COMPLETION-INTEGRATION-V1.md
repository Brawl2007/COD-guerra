---
MEMORY_VERSION: 1
TASK_ID: "M01-PARTIALS-COMPLETION-INTEGRATION-V1"
CATEGORY: "render"
STATUS: CURRENT
DATE: "2026-10-16"
BRANCH: "codex/m01-partials-browser-sampling-repair-v1"
SOURCE_HEAD: "e377a0739906507dee63cd4006a3428efd22c56b"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary and confirmed facts

Paused frames must include both damage texture versions in their invalidation key. `map.version` and `heightMap.version` can change asynchronously while the simulation clock and world revision remain fixed. CPU-ready pixels alone do not prove that WebGL uploaded them.

The controlled old-source reproduction held and released the real atlas paint: CPU version2/GPU1 remained on screen until a redraw. Its stale PNG exactly matched the historical ON capture; its ready PNG exactly matched OFF, explaining all318 changed pixels. The accepted fix adds `damageAtlasRevision` and `damageHeightAtlasRevision` to the frame key in `src/render/m01-view.js`; the native renderer then uploads the ready texture during pause.

The final source-identical production CI proves both whole-frame controls have zero differences and44 coupled regressions pass. Preserve actual paused world/camera/state equality, native upload evidence and zero tolerance when changing asynchronous presentation resources. Do not replace this check with a CPU-version assertion or a geometry offset.

Evidence: `CORRECTION_02.md`, `correction02-evidence/MANIFEST.json`, `CI_FINAL_9A.json` and independent phase5 report in the task proof folder. Production matches9a679c50; the accepted code/test head is recorded above.

# Constraints and next action

Git, code and fresh evidence remain authoritative. Revalidate the current branch and applicable proofs before later changes; this accepted note is an index, not a substitute for verification.
