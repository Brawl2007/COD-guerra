# Correction 03 — CI report-schema guard

Final formal correction **3/3**, after preserved independent `VERIFIER_ATTEMPT_3` FAIL. Implementation telemetry attempt 4 does not reset this budget. Starting HEAD: `32a1c9d9525c68d75569b4cb8c9fe698ba124f6c`.

Only workflow line 94 changes: the producer writes `exactStatsAndSummary` at report level, while each route writes `result` and `checks`. The guard now requires report `result === "PASS"`, report `exactStatsAndSummary === "PASS"`, every route `result === "PASS"`, and a nonempty checks array whose every check is `PASS`. The existing exact counts remain unchanged: 12 seeds, 24 raw/current/policy runs each, and 24 routes. No skip, filter or unknown status is accepted.

The exact embedded Node program was extracted from the edited workflow and executed against scratch reports:

- **PASS:** retained real successful CAP03 seed1 help/ignore report. Only its scratch program's three count guards change from `12/24/24` to `1/2/2`; the original report is unchanged.
- **PASS:** synthetic 12-seed/24-run/24-route schema fixture derived from the measured rows and explicitly labelled synthetic. This validates guard compatibility, **not** actual 24-route outcomes.
- **32/32 rejected:** missing/FAIL/UNKNOWN report result; missing/FAIL/UNKNOWN top-level summary; missing/FAIL/UNKNOWN route result; FAIL/UNKNOWN/SKIPPED/missing check result; empty/missing/non-array checks or null check; missing/11/13 seed count; missing/23/25 runs for each of raw/current/policy; missing/23/25 routes.

Reproduction: `node /workspace/scratch/m01-partials-correction3/schema-guard-check.mjs`. Scratch case inputs and `result.json` are retained beside that script. All original measured evidence remains untouched.

| Validation input | SHA256 |
| --- | --- |
| Edited workflow | `70f44eab9675e3d2374d6ccede02e5d367e4affbcf1304ef2594fa3f411f7a0e` |
| Exact embedded Node program | `8bd799a9a193c976f59ffdc3051cc061e83520c40347b733945940e48700ac9f` |
| Original successful CAP03 focused report | `0302ce522b77fbe3919c229fb41924995618515b8152e72b4707067fa861c83c` |
| Scratch validation script | `6ad46e555ce0cf03fbe0c5572225635211f83fc2d7f1f120fa78c44b5000da23` |
| Scratch validation result | `89c91287e537e3ae6d2875a96bdc90c00735cf9d857a724bbe5b6aeaef4ec061` |

`git diff --name-only 016b2486025342d33629cbc301e8317d47606bc8 -- src tests tools assets missions package.json package-lock.json vite.config.js playwright.config.js` is empty: production/code/test/audit/asset identity is preserved. The complete correction consists only of this record and the workflow guard. No full suite was repeated, existing CI was left running, and no acceptance or integration is claimed. Fresh full certification, actual 24-route audit and independent verification/review remain mandatory.
