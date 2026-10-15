# Verifier attempt 1

STATUS: FAIL

Task: M01-T27-T30-RELIEF-HORIZON-V1
Branch: codex/m01-t27-t30-relief-horizon-v1
Exact assessed HEAD: 49a18863ad6fc6f821ccff6f65253ac264f607dc
Exact baseline: 293a4f116b9b28818b7ff3bda4d83cc49b01014f

CHECKS:
- Context packet: VALID, 25 files; frozen source hashes and tracked clean HEAD confirmed.
- Independent source/geometry: PASS ONLY. All 622 immutable paths identical; baseline 104000 triangles/52531 vertices and four buffer hashes matched. All 39196 protected/crossing source triangles including 10m halo retained; 20986 halo attribute copies exact; 424716 actual original-surface 1m position/normal/UV interpolations delta0; 152 vertical/range ray distances delta0. Complete 61-region union has 444600 protected 1m physics/terrain/visual-sampler samples delta0 versus separately imported actual baseline; 19884 protected outside-plane skirt samples match within 4.44e-16 arithmetic interpolation residual. Far triangle interiors avoid raw hulls+20m; five material-group-free, single-pass meshes meet maximum-five submission proof. Borrowed/owned disposal and 1000 steady sync resource identity pass.
- Exact-head normal CI run 115024064998: FAIL, Node667/668. `tests/m01-material-authority.test.js:18` fails at line26 because it extracts source text from M01View using the old PlaneGeometry start/end markers; extraction now returns empty string after the authorized terrain-owner extraction. This obsolete structural assertion must be replaced with actual sampled/protected surface, attribute and collider/contact preservation proof; do not remove the invariant or broadly waive previous terrain/material/contact obligations.
- Exact-head browser CI run 115024064840: FAIL, 0/2 focused specs pass. Canonical feature comparison at `tests/browser/m01-relief-horizon.spec.js:27` expects changed pixels>20, receives0. Ordered fixture and feature loop put canonical01 relief first; the log does not diagnose why no visible change occurs. Diagnose the actual frozen production canvas and preserve canonical framing plus meaningful supplemental bank/horizon evidence. Do not weaken the pixel threshold or substitute a debug-only showcase for the required production views.
- Same browser CI, resource spec at line38: FAIL. Reload expects517 geometries, receives454. The pre-reload samples follow Low/High and both geometry toggles; reload receives only the initial High/default rendering history. Unequal GPU residency/warmup is a plausible explanation, not a proved diagnosis. Make the compared render/quality/toggle histories equivalent, retain four restore plateau comparisons, exact save/clock checks and actual resource bounds; do not loosen limits or invent equality.
- Full12-seed both-route A/B stream remains running under parent-owned session20755, with partial completed route records. It is not yet sufficient final evidence and was neither stopped nor modified by verifier.

BUILD: Focused local92-module production build PASS; exact browser CI92-module production build PASS. Normal CI stopped at failing Node gate, so remaining gates are not presumed passed.

RUNTIME_OR_BROWSER: FAIL. Required fair baseline/candidate captures, all separate canonical Relief01/09/17 and Far01/10/17 visible changes, actual main-camera budgets, image inspection and final reload equality are not yet established.

FAILURE_CONTEXT: See `ci-attempt1-115024064998.log` and `ci-attempt1-115024064840.log`. Source-only successful proof is in `verifier-source.md`, `verifier-source-probe.json/log`, and `verifier-envelope-probe.json/log`, with independent runtime scripts. No production fixes, branch changes, commits or pushes performed by verifier.

EVIDENCE_SUFFICIENT: NO

Completion packet check: STALE, REASONS=dirty_changed, after a concurrent parent-owned operation modified tracked `docs/verification/m01-runtime/simulation-report.json`. Initial source checks used the VALID frozen packet. Verifier made no tracked edits. Captain must restore/regenerate authorized evidence and refresh the packet before the next delegation; do not reuse the stale packet.

RECOMMENDED_NEXT_ACTION: Reopen the affected implementation/verification subgraph and delegate the three targeted corrections within the contract retry budget. Preserve the complete route stream, correct source-regex test to concrete geometry/contact invariants, diagnose zero-pixel canonical relief, compare equal GPU warmup histories on reload, publish/freeze the corrected source, refresh the context packet, and rerun focused failed checks plus both exact-head CI gates. Formal PASS requires complete actual production evidence and complete12-seed/24-route proof.
