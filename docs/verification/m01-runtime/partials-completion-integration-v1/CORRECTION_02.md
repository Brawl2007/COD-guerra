# Correction 02 — implementation record

This remains correction 2/3 after preserved independent verification FAIL 2. CAPTAIN-AMENDMENT-03 is prospective; the original CAP02 23/24 report and all 24 full rows remain unchanged. This record is implementation evidence, not verifier or reviewer acceptance.

## Measured bridge cause and minimal correction

The paused-frame cache did not observe completion of the inherited procedural damage atlas. The CPU atlas became ready at texture version 2 while the GPU retained uploaded version 1. An unrelated bridge toggle forced a frame and uploaded the completed atlas.

The controlled production diagnostic holds the real `paintAtlas` work after its first chunk, freezes the genuine 06:10 route save, then releases atlas work without advancing gameplay. With the old cache, rendered frames remain 6 → 6 and GPU versions remain 1/1 although CPU versions become 2/2. Forcing a redraw changes exactly **318 pixels**, maximum channel difference 58, sum 7349. The stale PNG SHA256 `769f783b8c7cf5ca4ab773a5e501aed3cd791f8dac72f0977fabaafbeb203407` exactly matches historical CI5b ON; the ready PNG SHA256 `b68c335b2b328ed0d19dd23ce3a35aa0cb274856d716e6108c25406604c6e32c` exactly matches CI5b OFF. Full snapshot/checkpoint/events and camera remain exact throughout. Historical images are retained in artifact `11998069595` and the local fetched paired evidence.

The correction adds only the colour and height atlas texture versions to the existing M01 paused-frame key. In the controlled fixed case, frames automatically advance 7 → 8 and GPU versions become 2/2. Its final whole PNG is exactly equal to the fully ready reference; the real late-atlas change is the same 318 pixels. No station geometry, material source, depth, lighting, camera, gameplay, or bridge threshold changes. All temporary inspect/probe/hold/redraw hooks and the old-cache switch were removed before the final build. Their complete temporary patch and reproducer are retained as diagnostic evidence.

The final production build also passes a bounded same-browser warm constructor → genuine 06:10 control: exact full saved state/camera/parts and **zero changed pixels** against the retained original OFF image. `tools/verification/m01-partials-atlas-warm-proof.mjs` reuses the unchanged original browser helpers; its default run captures OFF and ON on fresh pages in one warm browser. It does not replace the original nine-view CI matrix or coupled regressions.

## Health exposure audit

The CAP02 local run completed all 24 routes: 23 PASS, seed6/help FAIL under the then narrower rule. Only seed1/ignore and seed6/help lose 8 health; all other raw outcomes and original actor health/alive remain exact, and every current/policy stat, control and per-tick clock/RNG/health match. These original reports are retained without relabelling.

CAP03 records the measured first boundary: the existing WEST segment drops from scale 8.5 to 1 during its last 60 battle seconds when unfinished carry makes readiness false. The audit now checks exact prior raw/current clock/RNG/health/control prefixes and this precise boundary. It separates additional-issued projectiles from shared-issued additional impacts, records actual MG emission separately from burst planning, retains every raw `landRound`, and checks actual raw WEST release and exit controls/player positions for the shared-round case. Every original raw health impact remains exact. The local impact comparison projects only T05 `pass` and the two named T36 carry actors’ suppression membership; every other field is retained and compared, and full unmodified event streams are stored.

Current and immutable predecessor with only WEST readiness replay must have exact full stats/summary/player state, all dt/controls, per-tick clocks/RNG/health/readiness and final original actor health/alive. Raw health remains exactly raw health minus causally attributed actual damage. All other raw stats remain exact. Any unexplained health change, missing round/emission/impact/boundary, death/restore, or unfinished carry fails. Rows and diagnostics are written before assertions; separate complete route files avoid a monolithic JSON size failure.

Focused CAP03 seed1 and seed6 runs pass both help/ignore routes (4 routes total), exercising both attribution branches. CI must still run all 24 fresh on the frozen source.

## Meaningful fixture corrections

The original CP-D safety fixture now allows actual ticks to start Dudek’s carry, moves the real carrier to the actual evacuation destination, and waits for the finite putdown to finish. The player remains unsafe after delivery and the gate must still hold; moving the player safe then releases it. No carry flag is artificially cleared. The focused fixture passes.

The optional MG prone fixture identifies the two saved gunners and their two linked loaders explicitly, checks their low physical state, procedural fallback membership, actual muzzle effects and full saved authority, and compares restoration across reload. The browser URL enables the existing opt-in verification API. The initial missing-flag diagnostic FAIL is preserved. The final focused production browser run passes 2/2: the genuine shot-1 continuation and the optional-prone fallback, both with pause/reload and the original real muzzle requirements. The complete original browser matrix remains a CI obligation.

## Local scope and remaining gates

The final build passes; 29 related damage/grade/lifecycle Node tests pass, two source/authority guards pass, and all 299 protected predecessor files remain byte-identical (only the pre-existing author-only impostor manifest exception applies). No full Node or full browser certification was repeated locally. Fresh complete CI, original paired matrix/full-frame zero controls, current-owner futures, coupled regressions, independent verification and review remain required.

## Evidence index

Full evidence is retained under `test-results/partials-correction-02/`; this table pins the diagnostic files for archival. Compact durable copies can be archived by Captain alongside the frozen source without changing the original reports.

| Evidence | SHA256 |
| --- | --- |
| `test-results/partials-correction-02/cover-policy-final.json` | `966035bcd775574f80f1be749bc971fdc38e92316e058bf444566cdb236fcb5a` |
| `test-results/partials-correction-02/cap03-seed1.json` | `0302ce522b77fbe3919c229fb41924995618515b8152e72b4707067fa861c83c` |
| `test-results/partials-correction-02/cap03-seed6.json` | `5b00e6db17d25611adc6d16b54e36b37a02851cd0cde73595e8ae62f704a2907` |
| `test-results/partials-correction-02/atlas-cache/proof.json` | `d87b967721e9bdac5a707aa1364c9c4041d58077c70f62c0ae2232b5aafdaef7` |
| `test-results/partials-correction-02/atlas-cache/historical-identification.json` | `0ef48b6c538d46bd69fed8476ab786ee7655685e14ed9871f172047da59760c1` |
| `test-results/partials-correction-02/atlas-cache/temporary-instrumentation.patch` | `b304ce7f571cb4414b8d0af9725b33e0fe09b6515d53fbaa760376e9955a15bb` |
| `test-results/partials-correction-02/atlas-paused-cache.mjs` | `56f8e78dd57a0b2ea475f67f638598332038d09a17ab06f4996bce3a012f5fd0` |
| `test-results/partials-correction-02/warm-final/proof.json` | `d81faecc09a3fa475cbda437c454b3b8ceb3c6a56ac77fe551a53e67c16140b7` |

Durable verbatim diagnostics and bounded production proof: `correction02-evidence/MANIFEST.json`. Focused route indices reference their original local full rows; the fresh all24 CI artifact must supply complete final causal rows.
