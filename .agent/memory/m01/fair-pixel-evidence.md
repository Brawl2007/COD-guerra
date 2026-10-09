---
MEMORY_VERSION: 1
TASK_ID: "M01-WATER-VISTULA-V1"
CATEGORY: "verification-pattern"
STATUS: CURRENT
DATE: "2026-10-09"
BRANCH: "claude/m01-water-vistula-v1"
SOURCE_HEAD: "71ad067"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

Browser pixel evidence for M01 presentation features must be a fair A/B: feature on vs off in the same paused frame, exact projected quads, a control region that must stay maxDiff 0, and a minimum pixel count. Checks that would pass without the feature cost T42 three fix rounds.

# Confirmed facts

- Paused-frame caches must include any debug toggle in their key, or the A/B repaints nothing (T42 fixes 2-3).
- Low quality must be measured against BEFORE (T42 first build made Low water near-black: 59 -> 7.5).

# Evidence

- CI 37988900379; docs/verification/m01-runtime/m01-water-vistula-v1/README.md.

# Relevant files/systems

- tests/browser/m01-water-vistula.spec.js (close-up A/B pattern), src/render/m01-water.js (`?debug` hook).
