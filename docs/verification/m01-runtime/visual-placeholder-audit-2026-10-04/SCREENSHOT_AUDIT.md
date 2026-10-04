# Screenshot Audit — M01 Visual Placeholder Audit

Task: `M01-VISUAL-PLACEHOLDER-ASSET-AUDIT-V1`  
Base audited: `5f3cc34f53c61beec52255d67f8babd7194c9f7f`

## Status

**No new runtime screenshots were captured for this task.**

Reason:
1. the local working environment cannot resolve `github.com`, so the exact repository checkout cannot be cloned;
2. no local branch-specific dev server can therefore be started;
3. the browser automation CLI is not available in the current container;
4. the public GitHub Pages endpoint is not accessible through the available web reader, and in any case a public Pages build would normally represent a deployed branch such as `main`, not proof of the exact audit HEAD;
5. existing PNGs in `docs/assets/**` are asset-gallery/previous-verification captures and must not be relabeled as screenshots of this exact runtime/base.

No screenshot result is invented.

## Requested capture set — evidence substitute

Until a browser can run the exact branch, these views are grounded by runtime/code/asset evidence only.

| Requested view | Runtime evidence | Expected audit focus | Screenshot status |
|---|---|---|---|
| 1. Station | `tczew-world.js`: one large station box; `m01-environment.js`: procedural facade/roof | giant primary building mass vs layered detail | **NOT CAPTURED** |
| 2. Rails | `m01-view.js`: instanced box rail segments; environment: box sleepers + dodeca ballast | rectangular rail profile and repetition | **NOT CAPTURED** |
| 3. Bridge | bridge GLB LOD0/1/2 wired through manifest | verify real GLB dominates over small procedural joints/covers; judge historical/visual provisional quality | **NOT CAPTURED** |
| 4. Soldiers close | `m01-characters.js`: skinned LOD path within quality budget | verify GLB path, faces/equipment/animations rather than procedural batches | **NOT CAPTURED** |
| 5. Soldiers mid-distance | LOD1/LOD2 selection + procedural fallback outside budget | locate transition where procedural actor starts to become visible | **NOT CAPTURED** |
| 6. First-person weapon | `m01-viewmodel.js`: PL GLB rifle + arms; old procedural viewmodel hidden on success | prove normal Wz.29 is asset-backed and inspect reload/sights | **NOT CAPTURED** |
| 7. Train/Panzerzug | wagons GLB LOD2; locomotive and Panzerzug primitives | quantify contrast between real wagon consist and primitive hero vehicles | **NOT CAPTURED** |
| 8. Explosion/smoke | additive explosion sprite + instanced billboard plume | judge flat flash, repeated puff structure and transition | **NOT CAPTURED** |

## Existing visual files discovered but not used as branch screenshots

Examples in repository:
- `docs/assets/m01-soldiers/*.png`
- `docs/assets/m01-aircraft/*.png`
- `docs/assets/m01-wagons/*.png`
- `docs/assets/m01-wagon-damage/*.png`
- `docs/assets/m01-mg34/*.png`
- `docs/assets/m01-ckm-wz30/*.png`
- `docs/assets/m01-bridges/*.png`

These are useful for asset-level art review, but they do not prove:
- actual runtime wiring in this exact branch;
- camera composition in M01;
- LOD transition behavior;
- fallback activation;
- interaction between environment layers.

## Future exact capture protocol

When a checkout/browser is available, capture the exact branch with:
- same quality preset recorded per shot;
- `?debug` diagnostics enabled where useful;
- diagnostics JSON saved beside screenshots;
- camera/player coordinates recorded;
- no temporary code or state mutation to stage the shot.

Suggested minimum:
1. station facade from 20–40 m;
2. hut objective from 8–15 m;
3. approach rails at eye level along track axis;
4. bridge at near and medium range;
5. PL/DE soldiers at 8 m / 30 m / first procedural-transition range;
6. ADS and reload frames of Wz.29;
7. train head + first 5 wagons in one frame;
8. Panzerzug full silhouette;
9. first raid Ju 87 versus second-raid proxy;
10. explosion at flash frame, +0.3 s, +1.5 s and mature smoke.

## Acceptance rule

Do not close a visual P0 solely because code was made more complex. The future screenshot pass must verify that:
- silhouette no longer reads as blockout;
- repeated recipes are not obvious;
- GLB is actually selected rather than its proxy;
- LOD change is not conspicuous;
- visual shell matches collision/open-route expectations;
- FX layers remain bounded and readable.
