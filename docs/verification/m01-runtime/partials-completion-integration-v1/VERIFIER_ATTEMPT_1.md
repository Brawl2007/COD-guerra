# Independent verification — FAIL

Source pinned: `9a1535b5a530ea39186a09ab5465a14449d27569`; simulation SHA256 `5a18d6bbc7922144c0ac10b7ba35b71c8af43ea5f1438e66a9892e0e9d114fc7`. Context packet VALID. Source remained frozen; no production, fixture or golden edits, commits, pushes, checkout or delegation.

The two failing task gates are T24 and T36. This is a verification result, not reviewer acceptance. Remaining task verdicts are BLOCKED by pending final CI evidence, rather than inferred passes.

| Task | Verdict | Finding |
| --- | --- | --- |
| T02 | BLOCKED | Focused continuity/pre-roll tests pass; complete strict predecessor route audit and twelve-seed cover gate still running. |
| T03 | BLOCKED | Focused grounded blasts and actual grenade-puff expiry/continuation pass; complete continuation and integrated browser gate still running. |
| T05 | BLOCKED | Focused typed-event/closest-pass tests pass; physical layout bytes preserved; full Node and authority gates pending. |
| T06 | BLOCKED | Production audio pressure evidence and merged core inspected; fresh complete Node and browser/offline-waveform gates pending. |
| T07 | BLOCKED | Focused legacy/corrupt/prone/continuation tests pass; 86/89/97 roster and schema2 production browser gates pending. |
| T14 | BLOCKED | 299 protected predecessor files and author-only manifest verified; fresh authored viewer and paired six-view material/colour matrix not yet concluded or inspected. |
| T24 | FAIL | Exact roadmap view-10 lamp visibility is not demonstrated and implementation explicitly records physical occlusion. Unobstructed oblique 1000.528m proof cannot satisfy the exact view-10 clause. |
| T26 | BLOCKED | Implementation four-scene images inspected in part and focused cue tests are present; fresh integrated browser pause/reload/camera matrix pending. |
| T34 | BLOCKED | Focused auxiliary corridor/combat exclusion tests pass; station/lantern implementation specimen inspected; fresh integrated browser matrix pending. |
| T36 | FAIL | Real route finishes with Bak still carried, no putdown; violates F10 delivery before west readiness. Real reload/feed frame also shows loader standing proxy rather than feed presentation. |
| T41 | BLOCKED | Disabled-owner fix and 299 protected bytes verified statically; fresh native-frame disabled cards, allocations, 24 futures, coupled regressions and paired camera matrix pending. |

T24 requires **“vista 10 com fumo e lâmpada a 1 km”**. I inspected the canonical view-10 PNG: smoke is visible; a visible lamp is not demonstrated. The implementation explicitly records the original rail/gate occlusion and disclaims this exact clause. The clear oblique1000.528m paired proof is useful, but it does not close the requested view. Captain must resolve that criterion conflict explicitly without silently replacing its wording or drawing through the gate.

T36/F10 requires Bąk delivered **before west demolition readiness** (`docs/architecture/M01_CHARACTER_ANIMATION_PRODUCTION_PASS.md:332`). The independent original real-control seed19390901/no-support route executes20966ticks and never reaches putdown:

| Milestone | Battle time | Bąk x | Carry |
| --- | --- | --- | --- |
| First west readiness |06:32:01|−90.016|Dudek, carry|
| West demolition |06:45:00|−236.515|Dudek, carry|
| Mission complete, ordinary outro skip |07:05:00|−260.572|Dudek, carry|

`tick()` stops after mission completion. An additional legitimate continuation that does not skip the outro reaches putdown only at sim1092.10, already07:05; this is after both readiness and demolition. The current audit checks readiness before06:45 but never asserts delivery. See [route counterexample](../../../../test-results/partials-independent/carry-route-check.json) and [reproduction](../../../../test-results/partials-independent/carry-route-check.mjs).

T36/F12 also has a narrow presentation defect. In a real04:56:50 reload frame, the gunner plays `mg34_prone_reload` at0.35s, but its loader is absent from skinned actor diagnostics and displays a standing procedural proxy while simulation phase is `feed`. The loader is1084.055m from the saved player; `m01-characters.js:223` reserves1800m only for gunners, while ordinary high-tier range is160m, and the proxy pose has no loader/feed handling. The [feed image](../../../../test-results/partials-independent/crew-feed.png) and [raw frame](../../../../test-results/partials-independent/crew-feed.json) retain the exact saved authority. Correct the relevant visible tier/fallback and prove that actual same reload frame, retaining budgets.

Checks actually run:

- Focused partials Node: **22/22 PASS**,0fail ([log](../../../../test-results/partials-independent/focused-partials.log)). These tests do not assert the failing whole-route delivery clause.
- Production build: **PASS** ([log](../../../../test-results/partials-independent/build.log)). The rebuilt JS bundle is byte-identical to the bundle used by my browser captures.
- Protected predecessor bytes: **299 PASS**; four required ancestors, French/package-lock and historical animation golden unchanged ([source evidence](../../../../test-results/partials-independent/source-pinned.json)).145source-file freeze check PASS.
- Four independent production capture cases completed with0pageerrors and exact full snapshot identity: pickup, carry, late putdown, real MGreload/feed. These are inspected frames, not four acceptance-test passes. Pickup/carry are proxies at344m; the late putdown pair uses synchronized clips at0.35s.

Fresh CI is still **in progress** on exact source9a1535b5: [normal Node/build](https://github.com/Brawl2007/COD-guerra/actions/runs/38712314965), [integrated browser/authority/bridge](https://github.com/Brawl2007/COD-guerra/actions/runs/38712315225). Integrated build/colliders/route setup steps are green; no final suite counts are claimed. Job log download currently returns404BlobNotFound while running. Full local duplicates were intentionally not launched. Actual material viewer, full paired bridge matrix,24futures,12seeds×2cover routes, full Node/schema2/audio/browser and coupled regressions still need successful final evidence on the corrected source.

Images personally inspected: implementation `train-canonical-view10`, `train-1km-both`, `life-043600`, `cs_m01_order`; independent `crew-pickup`, `crew-carry`, `crew-putdown`, `crew-feed`. Implementation images are not labelled CI evidence. Historical bridge3/3failures and earlier train failures remain unchanged.

**EVIDENCE_SUFFICIENT: NO.** Return to implementer for bounded correction1/3, preserve this FAIL, re-pin corrected source and rerun the failed focused checks plus outstanding CI before reviewer handoff. Do not update global task completion or integrate on this result.
