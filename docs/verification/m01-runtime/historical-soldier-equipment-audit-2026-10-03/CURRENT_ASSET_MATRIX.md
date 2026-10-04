# Current asset matrix — M01 historical soldier/equipment audit

Base audited: `codex/m01-schema2-determinism-audit@5f3cc34f53c61beec52255d67f8babd7194c9f7f`  
No GLB, texture, runtime or gameplay file is modified by this audit.

## Soldier base assets

| Asset | LOD0 | LOD1 | LOD2 | Animations | Provenance / licence | Current role usage | Historical confidence | Main issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Polish soldier rig | 14,861 visible tris, 61 bones | 6,022, 61 bones | 1,895, 28 bones | shared 25-clip file | MakeHuman data pinned CC0; clothing/gear/textures/clips original project work; global project licence not yet chosen | Wrona, Zieliński, Krawiec, Nowicki, Kowal, Bąk, Dudek, Polish generic/crew roles | RECONSTRUCTED | one common uniform cut/load base is doing too much work; exact 2 Batalion Strzelców issue mix not proven |
| German soldier rig | 16,055 visible tris, 61 bones | 6,446, 61 bones | 2,059, 28 bones | shared general clips + optional MG34 prone clips | same MakeHuman CC0 base + original project work | German riflemen and MG34 gunners | RECONSTRUCTED | only 3 head variants; one generic gear block; no German rank variants; rifleman load silhouette leaks into MG roles |
| Polish named heads | 8 switchable heads across all LODs | yes | yes | n/a | CC0 morph data + original project textures | 7 named military cast + 1 generic | PLAUSIBLE | good current variety, but face appearance is story art direction, not historical evidence |
| German heads | 3 switchable heads across all LODs | yes | yes | n/a | CC0 morph data + original project textures | all German soldiers | PLAUSIBLE | too little variety for a force visible in groups; no role/rank-aware selection |

## Polish clothing/equipment switches already present

| Element | Current asset support | Runtime use observed | Historical classification | Audit |
| --- | --- | --- | --- | --- |
| wz.31 helmet | all LODs | default for non-engineer Polish soldier body | CONFIRMED period item / PLAUSIBLE unit issue | good silhouette basis |
| canvas-covered wz.31 | all LODs | engineer role | RECONSTRUCTED | cover specifically for all engineers is not proven; retain only as a variation until unit evidence exists |
| rogatywka wz.37 | all LODs | mesh exists; no character-body visibility switch found in the audited character renderer | CONFIRMED period category / current use UNVERIFIED | asset exists but body-runtime use is not established by this audit |
| common tunic/trousers | all LODs | every Polish body | RECONSTRUCTED | generator is styled as wz.36/earlier, but cannot represent the documented 1939 mixture of patterns |
| short shoes + puttees | all LODs | common Polish body | CONFIRMED general infantry pattern | strong basis; sapper footwear can vary |
| leather main belt | merged into body outfit | common | CONFIRMED | retain |
| rifle ammo pouches | merged into `gear` | common | CONFIRMED category | geometry/detail still reconstructed |
| field bag/bornal | merged into `gear` | common | PLAUSIBLE | exact model/source naming needs stronger object reference |
| canteen | merged into `gear` | common | CONFIRMED category | exact geometry model unverified |
| gas-mask bag + shoulder strap | merged into `gear` | common | CONFIRMED category / RECONSTRUCTED model | project calls it WSR wz.32; exact bag pattern requires dedicated institutional/manual evidence |
| entrenching tool | merged into `gear` | common | CONFIRMED category | good period requirement |
| sapper tool bag | separate `sapper` switch | engineers | RECONSTRUCTED | useful role silhouette, but bag geometry/load contents lack a dedicated historical source |
| rkm magazine pouch | separate `rkm_pouch` | Kowal | RECONSTRUCTED | correct need for role-specific ammunition carrying; exact pouch geometry not confirmed |
| Vis holster/NCO set | `nco` switch | Zieliński | PLAUSIBLE | story/loadout supports Vis; actual pistol mesh absent |
| Polish rank pieces | `rank_sierzant`, `rank_kapral`, `rank_st_strzelec` | Zieliński, Krawiec, Kowal respectively | RECONSTRUCTED | named-role mapping is correct to story data; exact insignia geometry has no institutional source in current asset manifest |
| medic equipment | none dedicated | Dudek uses named head/basic soldier presentation | UNKNOWN/MISSING | no medical bag/field dressing/red-cross identification asset is established |
| wound/evacuation equipment | animations exist | carried/wounded/drag states | GAMEPLAY COMPRESSION | no stretcher/medical treatment kit in this soldier audit set |

## German clothing/equipment already present

| Element | Current asset support | Current usage | Historical classification | Audit |
| --- | --- | --- | --- | --- |
| M35 helmet | all LODs | default German headgear | CONFIRMED | correct 1939 helmet family and silhouette |
| M35 side decals | intentionally omitted | none | CONFIRMED historically present / current asset incomplete | visual detail gap; not a silhouette blocker |
| field tunic styled as M36 | body outfit | all German soldiers | PLAUSIBLE | period-correct direction, but exact pocket/collar/insignia construction still lacks dedicated institutional object evidence in the asset manifest |
| tall marching boots | body outfit | all German soldiers | CONFIRMED period equipment | DHM supports the tall leather marching-boot pattern in 1939 |
| belt | merged outfit | all German soldiers | CONFIRMED general category | retain |
| 2×3 rifle ammunition pouches | merged `gear` | all German soldiers, including MG roles | PLAUSIBLE for rifleman; VISUALLY INACCURATE/over-generalized for specialist MG load | must become role-selectable |
| Y suspenders | merged `gear` | all German soldiers | UNVERIFIED as universal M01 issue | current audit lacks enough institutional evidence to mandate it on every actor |
| bread bag | merged `gear` | all German soldiers | PLAUSIBLE | dedicated object/reference still desirable |
| M31-type canteen | merged `gear` | all German soldiers | PLAUSIBLE | dedicated object/reference still desirable |
| gas-mask canister | merged `gear` | all German soldiers | PLAUSIBLE | period silhouette is plausible; exact dimensions/straps need object source |
| entrenching tool | merged `gear` | all German soldiers | PLAUSIBLE | role/load variation should be possible |
| German rank insignia | no switchable rank meshes | none | MISSING | do not invent ranks until actor role/rank data exists |
| MG34 ammunition-carrier gear | no dedicated soldier set | MG gunner/assistant visually inherit common gear | MISSING | key crew silhouette gap |
| spare barrel/tool carrier | not found | none | UNVERIFIED/MISSING | do not model until source/crew requirement is documented |
| officer-specific gear | no dedicated set | no German officer actor identified in current M01 data | NOT CURRENTLY REQUIRED | do not create an officer simply for visual variety |

## Weapon and crew-served asset matrix

| Weapon / equipment | Current state | LOD coverage | Animation coverage | Historical classification | Audit status |
| --- | --- | --- | --- | --- | --- |
| kb wz.29 | embedded in Polish soldier GLBs | 0/1/2 | aim/fire-bolt/reload via soldier clips | CONFIRMED weapon type; geometry RECONSTRUCTED | **EXISTS** |
| kb wz.98a | embedded switch | 0/1/2 | general rifle clips | CONFIRMED weapon type; geometry RECONSTRUCTED | **EXISTS** |
| rkm wz.28 embedded | embedded switch for Kowal | 0/1/2 | 10 `rkm_*` soldier clips | CONFIRMED weapon type; geometry RECONSTRUCTED | **EXISTS** |
| rkm wz.28 standalone | dedicated kit | 1476 / 744 / 234 tris | `rkm_carry`, `rkm_aim`, `rkm_fire_burst` | RECONSTRUCTED | **EXISTS**, but 8/11 recorded measures are estimated |
| ckm wz.30 | dedicated tripod/belt/box kit | 3904 / 2298 / 754 tris | 5 gun clips + 10 gunner/loader clips | CONFIRMED weapon family; asset RECONSTRUCTED | **EXISTS**, but 7/13 measures are estimated and T34 was not read in full when built |
| Kar98k | embedded German rifle | 0/1/2 | general rifle clips | CONFIRMED 1939 German infantry type; geometry RECONSTRUCTED | **EXISTS** |
| MG34 | dedicated weapon kit | 2432 / 1262 / 368 tris | aim, burst, reload | CONFIRMED; geometry partly RECONSTRUCTED | **EXISTS**, 8/13 measures estimated |
| MG34 prone pair | animation-only extension reusing German rig/MG34 | reuses character + MG LODs | 9 gunner/loader clips | RECONSTRUCTED | **EXISTS**, posture/timing/assistant offset explicitly estimated |
| Vis wz.35 | holster visible for Zieliński, no pistol mesh found in soldier weapon switches | none as weapon | none | CONFIRMED sidearm type for appropriate Polish personnel | **MISSING** as a visible pistol; low gameplay priority |
| Polish defensive grenade carried on soldier | gameplay item exists, no dedicated historically audited carried soldier mesh found here | n/a | n/a | type in M01 data; visual asset UNVERIFIED | **PLACEHOLDER / UNVERIFIED** |
| optics | no optics in audited standard infantry/MG sets | n/a | n/a | no sniper/optics role in current M01 cast | **NOT REQUIRED** unless a sourced role is added |

## Weapon-equipment detail audit

### kb wz.29 / kb wz.98a / Kar98k
Present:
- sling geometry;
- receiver/barrel;
- sights;
- bolt and handle;
- five-round charger/clip;
- stock/handguard/bands.

Gap:
- dedicated museum/manual dimensional provenance is weak in the soldier manifest;
- sling hardware and model-specific minor fittings are reconstructed.

### rkm wz.28
Present:
- 20-round magazine;
- open/folded bipod;
- sling/stock/receiver/barrel/gas system;
- charging handle;
- sights;
- separate magazine pouch on gunner.

Gap:
- magazine, receiver, stock, bipod and sight geometry contain estimates;
- assistant/ammunition bearer is not a distinct current role/loadout in the rendered soldier set;
- no verified spare-magazine load distribution standard for the M01 section.

### ckm wz.30
Present:
- low tripod with traverse/elevation parts;
- water jacket;
- receiver/grips/sights;
- belt feed and spent belt;
- free belt run;
- ammunition box with hinged lid;
- gunner/loader rig clips.

Gap:
- much of tripod/receiver detail is reconstructed from weak/partially unread source set;
- no independently audited water/steam-management accessory set outside the gun's modeled water fittings;
- crew personal load/rank differentiation is absent.

### MG34
Present:
- receiver/perforated jacket;
- feed cover;
- charging handle;
- 50-round Gurttrommel presentation;
- short belt at feed;
- folded/open bipod;
- sights;
- sling point;
- gunner and loader prone animation set.

Gap:
- gunner/assistant personal ammunition carriage is not modeled as a role-specific soldier set;
- prone README explicitly states the assistant's drum carrier is not modeled;
- 250-round belt/box and AA sight are not modeled;
- current German generic rifle pouches remain part of the shared gear silhouette.

## Animation coverage

Shared soldier file gives 25 clips:
- 15 general: standing, aim, rifle fire/bolt/reload, walk/run, crouch/pinned, sapper work/pinned, carry/carried/wounded/fallen/seated;
- 10 rkm-specific: idle/walk/run/aim/fire/crouch/prone/prone fire/reload/clean.

Additional:
- MG34: aim, burst, reload;
- MG34 prone/loader: 9 pair clips;
- ckm wz.30: 5 weapon clips + 10 gunner/loader clips;
- station wounded drag has dedicated presentation clips/transitions.

Historical asset audit conclusion: animation **coverage is not the principal blocker** for clothing/equipment fidelity. The larger gaps are role-selectable equipment, rank/medical identification and stronger dimensional/source provenance.

## LOD conclusion

Current LOD architecture is strong enough to carry additional historically sourced switches without introducing a new rig:
- **LOD0:** close-up inspection, readable rank/gear hardware, face variation and weapon detail.
- **LOD1:** normal gameplay; preserve national silhouette, rank blocks, primary pouches/bags and correct weapon.
- **LOD2:** distance; preserve helmet/headgear, national uniform silhouette, primary weapon and only the largest role-specific gear.

Do not keep tiny buckles/insignia as separate geometry at LOD2. Bake/simplify them into texture/material where historically safe. No FPS claim is made by this audit.
