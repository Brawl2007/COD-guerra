---
MEMORY_VERSION: 1
TASK_ID: M01-T27-T30-RELIEF-HORIZON-V1
CATEGORY: renderer-terrain-and-far-landscape
STATUS: CURRENT
DATE: 2026-10-13
BRANCH: codex/m01-t27-t30-relief-horizon-v1
SOURCE_HEAD: 4e5389b314f3e02b3197139cca953b79a5464d8f
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

Relief protects the actual original rendered ground as well as physics. Distant scenery must seat on submitted terrain triangles, and GPU resource comparisons require equal loading history.

# Confirmed facts

The owner derives 61 participant hulls from immutable authored data and all simulation destination families, including inactive actors, withdrawal, evacuation and shot origins, then adds20m. Legacy Plane geometry is2000×650m,5m lattice,104000 triangles/52531 vertices. Protected and crossing triangles plus10m normal/contact halo retain exact Float32 position/normal/UV/index attributes. Outside planar simplification verifies the original surface and attributes; borrowed macro/legacy materials retain T31 contact hooks. Protected whole-union physics and sampler equality does not imply old outside-Plane filler/void rendered geometry was identical.

The skirt belongs to terrain, including the northern field profile. Relief amplitudes are presentation estimates; combined displacement reaches+29.883m, so component20m/12m values are not a combined bound. Five far meshes remain outside the whole participant envelope, west<-460/east>1800. Towers retain original32–44m scale. Constructor-only `surfaceHeightAt` samples actual rendered triangles: `world.heightAt` alone buried scenery on the new skirt. `farAnchors` are bearings, not visible cities at their real distances.

Required browser cameras come from actual route snapshots. Canonical01 centroid is(-76,-2,24), not the fallback. Immutable rail crests/portals hide most new relief/skyline; canonical09 relief65pixels and10 far30pixels are small actual changes. All controls have zero delta. Actual view ground maximum37288 is within52000; total owner59512 is not the per-view count. Far five actual submissions rely on current THREE ShaderMaterial single-pass behavior, not just mesh count.

Four restores and equally warmed reload settle at536geometries/134textures/clock.05. Cold and Low/High/toggle histories must match before residency comparisons. Full24 futures compare saves/events every tick,120 checkpoint backups and24 final backups, without changing gameplay or RNG.

# Evidence

`docs/verification/m01-runtime/m01-t27-t30-relief-horizon-v1/`: VERIFIER.md, REVIEW.md, FINAL_GATES.json, actual PNG/JSON captures, raw CI and futures logs. Independent source/envelope probes reproduce protected geometry and ownership. Source CI669Node/173tooling/build92; focused browser2/2.

# Constraints

Preserve rail/props/field/bridge/lighting owners and world/simulation/assets. New steady frames must not rebuild geometry. M01 remains a prototype; no measured FPS, VRAM, reference-PC or human playtest claim.

# Relevant files/systems

`m01-terrain-envelope.js`, `m01-terrain-relief.js`, `m01-far-landscape.js`, minimal `m01-view.js` integration; corresponding focused tests and relief-horizon browser/futures harnesses.

# Next action

Consult this note and accepted regression ledger before changing terrain, seating, render passes or restore history; revalidate against current code and evidence.
