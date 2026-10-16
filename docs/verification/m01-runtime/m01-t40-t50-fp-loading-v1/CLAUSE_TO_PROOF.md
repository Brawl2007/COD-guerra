# Original clause-to-proof checklist

The unchanged complete original clauses remain in `TASK_CRITERIA.json`. Checkboxes below identify implemented proof mechanisms; independent acceptance remains pending.

| Original clause | Implementation / proof |
| --- | --- |
| T40 braços FP, mangas fechadas, mãos com dedos | Private `m01_fp_arms_v2.glb`; welded zero-open-boundary test, thirty actually weighted articulated finger segments and rounded palms, explicit skin material, cuff/strap meshes. `tests/m01-fp-arms.test.js`. |
| T40 variante FP do kit, punhos/correias/pele | Readonly original-kit generator; distinct `fp_hands`, `fp_cuffs`, `fp_straps`, cap meshes and materials. Native PNGs/mesh callbacks. |
| T40 transporte Bąk credível com clips T08 | Carrier pickup/walk/putdown and patient pickup/carried/putdown sampled from existing clips; private horizontal cradle/limb folding and support contacts; native E/W/E test and exact saved-clock frozen carry comparisons. |
| T40 sem clipping nas margens | Dense ADS/bolt/full/single-reload and pickup/walk/putdown near-plane inspection of every referenced vertex; full-frame native captures for visual review. |
| T40 não alterar rig/clips TP/variação | Protected baseline 67 SHA checks; old TP source bytes/rig/clips untouched. New source derivative hashes in manifest. |
| T40 capturas01/05/14 antes/depois | Exact canonical camera definitions and real route snapshots in `m01-t40-views.mjs`; production browser paired JSON/raw-UI/PNG. `verify-t40-comparison.mjs` asserts complete snapshot/checkpoint/events, player/camera and clock identity for all six paired views. |
| T40 orçamento FP ≤6000 | 1850 arms, 3264 rifle pose, 3882 maximum visible clip mesh pose, 5869 carried patient pose. Complete weapon-scene native callbacks include FX sprites and other shown objects; browser assertions enforce ≤6000. |
| T50 progresso ligado asset-manager / rodapé | Real request loader progress and settled cache records; observed-count footer; delayed actual bridge fetch browser proof; duplicate/cache/session/rejection/dispose/late-release unit tests. |
| T50 code-splitting Three/GLTF/França | Dynamic existing-Game bootstrap; named `three-core`, `three-loaders`, `french-bench` chunks; native French mission recovery/start verified. No second game/renderer. |
| T50 bundle inicial <600kB | `verify-t50-bundle.mjs`: entry + transitive static imports + every HTML JS script/preload root <600000 raw bytes; reports excluded dynamic graph separately. Current graph10883 bytes. |
| T50 Barlow self-hosted (licença), sem FOUT | Actual locally served Barlow Regular TTF, complete OFL, source/SHA JSON, font-file/name-table test, native successful font/network assertion and bounded readable-failure case. Font gate waits for actual FontFaceSet readiness; no external font requests. |
| Preservar start/continue/checkpoint/restart/quality/mission switch | Existing Game/control code untouched. Original regressions retained; task native save/reload and French mission selection/start exercise startup boundary. Independent verifier runs existing startup/lifecycle browser obligations. |
| Não fabricar aceitação/evidência | Initial FAIL logs remain FAIL; no FPS/human-playtest claim. Task CI runs production fixture build + focused browser/bundle guards only. Full Node/tooling remains owned by normal CI. Independent verifier/reviewer acceptance pending. |
