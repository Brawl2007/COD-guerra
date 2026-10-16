---
MEMORY_VERSION: 1
TASK_ID: "M01-T09-T28-MATERIALS-CLOSEOUT-V1"
CATEGORY: "rendering-ownership"
STATUS: CURRENT
DATE: "2026-10-11"
BRANCH: "codex/m01-t09-t28-materials-closeout-v1"
SOURCE_HEAD: "c739b08549d5f08963984eb644b40bebcb91cfd8"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

T09's opt-in M01MaterialLibrary owns three shared atlas textures and its materials; existing surface() consumers remain unchanged. T28 terrain owns its one material, mask, resident bitmaps and fulfilled partial batches. Dispose/cancellation must close ImageBitmap separately from Texture.dispose and empty released batches so stale completion cannot double-close them.

# Confirmed facts

- Low terrain is macro-only (one sampler); High/Medium add four packed detail/normal maps. The atlas's independent Low tier is for future opt-in consumers. Combined High decoded RGBA8 is 27 MiB, without mipmaps; no real-device FPS or VRAM claim.
- World-reference replacement rebakes the mask. Same-tier steady frames do not bake or allocate textures.
- Debug terrain toggle changes only materials and invalidates the paused-frame cache. Freeze after decal atlas residency before A/B. Quality churn also updates other LODs, so begin material A/B from a fresh completed High frame, retaining save/clock checks across the full churn.
- Wet mud may have lower local contrast than granular legacy soil; use visible macro/pixel change plus an unaffected sky control there. Dry ground still requires added local detail.
- Prop cross-platform reproduction canonicalizes ONLY Float32 NORMAL components abs<1e-12 for comparison; disk GLB/manifest bytes and raw SHA validation remain exact. Do not widen this tolerance to position/color/index data.

# Evidence

CI 38174455690: Node 639/639, tooling 173, build PASS. CI 38174455699: terrain 9/9, atlas 3/3, deterministic regeneration and protected-byte check PASS. docs/verification/m01-runtime/m01-t09-t28-closeout-v1/README.md.

# Relevant files/systems

src/render/materials.js; m01-terrain-material.js; m01-terrain-mask.js; tools/assets/m01-materials/README.md; tests/browser/m01-terrain-war-ground.spec.js.
