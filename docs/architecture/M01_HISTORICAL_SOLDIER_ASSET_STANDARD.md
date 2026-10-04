# M01 Historical Soldier Asset Standard

Task: `M01-HISTORICAL-SOLDIER-EQUIPMENT-ASSET-AUDIT-V1`  
Mission: M01 — Tczew, 1 September 1939  
Status: research + asset standard only. No renderer/gameplay/GLB/texture changes.

## 1. Purpose

This document defines the historical/art-production standard for M01 soldier presentation. It is deliberately stricter than "looks WWII".

A soldier asset must answer:
- which side and role it represents;
- which rank is actually encoded by M01 data;
- which September-1939 uniform/equipment family it uses;
- which weapon and ammunition carriage are appropriate to that role;
- which details are confirmed versus reconstructed;
- where every external dependency came from and whether redistribution is allowed.

Historical evidence and asset licence are independent questions. A museum photograph can be excellent historical evidence and still be unusable as a shipped texture.

## 2. Classification

Every non-trivial historical decision must carry one of these labels:

- **CONFIRMED** — supported directly by a strong institutional/archival source appropriate to the item and period.
- **RECONSTRUCTED** — built from partial measurements, photographs, predecessor geometry or multiple compatible references; uncertainty remains.
- **PLAUSIBLE** — period/role-compatible but not proven for the exact M01 unit/person/date.
- **GAMEPLAY COMPRESSION** — deliberate simplification/merging for readability, performance or interaction.
- **UNKNOWN** — evidence is insufficient; do not present it as fact.

Weapon audit status is separate:
- **EXISTS**
- **VISUALLY INACCURATE**
- **MISSING**
- **PLACEHOLDER**
- **UNVERIFIED**

## 3. Research authority order

Use, in order:
1. museum/archive object records;
2. contemporary archival photographs with date/context;
3. manuals/catalogues held by institutions;
4. museum research publications;
5. project research with readable primary/secondary provenance.

Do not use game screenshots as authority. Do not copy Call of Duty, Medal of Honor or other commercial assets.

Source bibliography and caveats are in:
`docs/verification/m01-runtime/historical-soldier-equipment-audit-2026-10-03/SOURCES.md`.

## 4. Polish soldier baseline

### 4.1 Uniform

Army-wide September 1939 evidence confirms a mixture of uniform patterns. MIIW records the wz.19 as still the most common general pattern while the newer wz.36 was especially desired. Therefore:

- Jan Wrona may retain the story-defined **wz.36** presentation.
- A single visual cut should not be documented as "the confirmed uniform of every M01 Polish soldier".
- Generic soldiers can eventually support more than one sourced uniform family, but **no issue percentages may be invented** for 2 Batalion Strzelców.
- Until a Tczew/2 Batalion Strzelców issue record is found, the current all-wz.36-like presentation is **RECONSTRUCTED/PLAUSIBLE**, not confirmed.
- Older/newer patterns should differ because of documented construction, not random fashion variation.

### 4.2 Footwear

General infantry:
- short, heavy military shoes;
- puttees appropriate to the represented uniform/equipment set.

Sappers/signals:
- short-shaft "saperki" are a historically supported variation category.

Do not randomly mix riding/officer boots into enlisted infantry.

### 4.3 Helmet/headgear

- wz.31 is a strong 1939 Polish field baseline and is supported by contemporary NAC material.
- rogatywka is role/scene/state-specific; M01 already defines Jan starting in rogatywka and changing to a helmet after alarm.
- a canvas helmet cover must not automatically mean "engineer" unless an exact source supports that rule; treat the current engineer cover as **RECONSTRUCTED visual shorthand**.
- headgear state must follow story/world state, not random variation.

### 4.4 Common field equipment

Historically required categories for a normal field soldier include:
- main leather belt;
- ammunition pouches appropriate to weapon;
- canteen;
- mess equipment where visible/appropriate;
- gas-mask equipment;
- entrenching tool where issued/carried.

Exact bag/pouch/canteen geometry must be tied to a source object/manual before final-art approval.

### 4.5 Sapper equipment

For Krawiec and engineer actors:
- retain a visibly distinct tool/load carrier;
- distinguish normal rifle ammunition carriage from specialist tools;
- do not model explosive preparation as tutorial information;
- do not infer a precise tool inventory from generic "sapper bag" art;
- rolled sleeves from the story bible remain **UNKNOWN as a M01 historical requirement** until period/unit imagery supports that appearance. They are not an automatic variation knob.

### 4.6 Medic / casualty handling

Leon Dudek is a **sanitariusz function**, not automatically a rank.

Final art should eventually distinguish a medic/stretcher-bearer through sourced 1939 Polish medical equipment/identification, but this audit does not have enough Tczew-specific evidence to invent:
- exact bag model;
- armband placement/state;
- rank;
- personal weapon.

Wounded actors keep their original uniform/equipment identity; being wounded does not replace them with a generic "medic patient" costume.

## 5. German soldier baseline

### 5.1 Helmet

The M35 is **CONFIRMED** for the period and is the correct base silhouette.

DHM documents side insignia on Wehrmacht helmets in this period. The project intentionally omits decals, so:
- helmet shell/silhouette: CONFIRMED basis;
- blank September-1939 helmet: **RECONSTRUCTED / historically incomplete**;
- this is not a P0 silhouette failure;
- any future insignia work must follow project policy and a verified, historically exact marking standard rather than decorative approximation.

### 5.2 Uniform and boots

- field-grey Heer uniform direction is period-plausible;
- the current M36-styled tunic needs a dedicated object/manual check before "CONFIRMED" status;
- tall leather marching boots are strongly supported for early-war enlisted presentation; DHM notes that shaft shortening occurred only after war began and later ankle boots became increasingly important from 1942.

### 5.3 Field gear

The current base includes rifle pouches, suspenders, bread bag, canteen, gas-mask canister and entrenching tool. The main rule is:

**gear must become role-selectable rather than one merged German load for everybody.**

Do not assume:
- every soldier has exactly the same pouch layout;
- every MG gunner/assistant carries rifleman ammunition pouches unchanged;
- Y-straps are mandatory on every actor merely because the current mesh has them.

Where this audit lacks an institutional 1939 object/source for a specific carrier/strap, mark it UNKNOWN/PLAUSIBLE and research it before final art.

### 5.4 MG team

MG34 is confirmed as standard German infantry equipment in 1939 and saw large-scale use in the Polish campaign.

Final gunner/assistant presentation must distinguish:
- gunner;
- assistant/ammunition bearer;
- rifleman.

At minimum the assistant must not look like a clone holding no visible MG support load while inheriting a full generic rifle-pouch silhouette.

The current prone asset explicitly lacks the assistant's drum carrier. Exact spare-barrel and ammunition-carrier configuration must be sourced before production modeling.

## 6. Rank standard

**Never infer rank from visual variety. Actor/story data chooses rank; art only presents it.**

| Role | Side | Rank range / current data | Insignia required | Current asset support | Missing |
| --- | --- | --- | --- | --- | --- |
| Rifleman — Wrona/Nowicki/Bąk | PL | `strzelec` | normal enlisted presentation; no invented NCO marks | base PL | exact uniform issue variation |
| RKM gunner — Kowal | PL | `starszy strzelec` | starszy-strzelec insignia | switch exists | exact insignia geometry needs institutional validation |
| Squad leader — Zieliński | PL | `sierżant` | sierżant insignia | switch + holster exists | exact insignia construction/source |
| Sapper — Krawiec | PL | `kapral` | kapral insignia | switch + sapper bag exists | exact insignia and sapper-load source |
| Other engineers | PL | rank not encoded | none beyond known actor data | engineer visual switch | do not clone Krawiec's rank onto all engineers |
| Medic — Dudek | PL | function `sanitariusz`; exact rank UNKNOWN | only if actor data/source supplies it | no dedicated medic insignia | medical-role equipment; rank remains unknown |
| CKM gunner/loader/reserve | PL | exact grades UNKNOWN in current actor data | none invented | crew animation roles exist | rank/crew-load source |
| Officer | PL | no visible M01 officer model required | only if a future actor explicitly has officer rank | no dedicated officer set required now | not a production gap for current visible roster |
| Rifleman | DE | Mannschaften; exact grades not encoded | grade-specific only if data is added | no rank switch | rank metadata + insignia family |
| MG34 gunner/assistant | DE | Mannschaften/NCO leadership possible in reality; exact actors UNKNOWN | do not invent | no rank switch | role gear first; rank only after data/source |
| German NCO | DE | no explicit current M01 NCO actor identified | if one is added by existing data/research | missing | actor/rank authority + insignia |
| German officer | DE | no explicit current M01 officer actor identified | not applicable now | missing | do not add an officer merely for variety |

The table deliberately refuses to "promote" named characters or generic actors for visual interest.

## 7. M01 roster visual requirements

### Jan Wrona
Current rank/role: `strzelec`, POV.  
Required:
- story-defined wz.36 presentation, labelled PLAUSIBLE for exact unit issue;
- rogatywka at opening if body is shown in that state;
- wz.31 after alarm;
- kb wz.29;
- rifle ammunition carriage and normal infantry field kit.
Do not give officer/NCO gear.

### Marek Zieliński
Current: `sierżant`, squad leader.  
Required:
- sourced Polish NCO rank presentation;
- kb wz.29;
- Vis holster/sidearm only because M01 data assigns it;
- otherwise field gear suitable to his role.
Do not turn all squad leaders into officers.

### Paweł Krawiec
Current: `kapral`, engineer.  
Required:
- kapral insignia;
- engineer/sapper load distinct from normal rifleman;
- sourced headgear/cover choice;
- tool bag/carrier;
- kb wz.29 per story data.
Rolled sleeves are not approved as a generic historical variation until sourced.

### Tadeusz Nowicki
Current: `strzelec`, rifleman/sentry.  
Required: normal PL infantry kit + kb wz.29; no special rank kit.

### Szymon Kowal
Current: `starszy strzelec`, support/rkm gunner.  
Required:
- rkm wz.28;
- sourced rkm ammunition carrying solution;
- current starszy-strzelec insignia concept after validation;
- no generic-rifle load that conflicts with the rkm role.

### Józef Bąk
Current: `strzelec`, rifleman.  
Required:
- kb wz.98a;
- normal enlisted kit;
- wound state must preserve his equipment identity.

### Leon Dudek
Current: `sanitariusz`, medical role, no weapon in cast data.  
Required:
- dedicated sourced medical field-load/readability plan;
- no invented rank;
- do not add a weapon solely because the generic body supports one.

### Pawlak / unnamed Polish riflemen / engineers
Use actor role/data first. Generic visual variety may change face, wear and sourced load arrangement, not rank or weapon identity.

### CKM crew
Current actor roles: gunner/loader/reserve.  
Required:
- ckm wz.30;
- visually coherent crew load;
- no rank invention;
- ammunition box/belt/tripod remain tied to the weapon system;
- any missing water/maintenance accessories require source validation.

### German riflemen
Required:
- M35;
- sourced early-war field uniform/boots;
- Kar98k;
- rifle-appropriate ammunition pouches;
- controlled load variation.

### German MG34 gunner/assistant
Required:
- MG34;
- gunner vs assistant equipment distinction;
- appropriate ammunition support;
- avoid generic rifle pouch clone;
- preserve correct helmet/uniform baseline;
- exact rank only if actor data gains authority.

## 8. Weapon standard

### Polish

| Item | Audit state | Standard |
| --- | --- | --- |
| kb wz.29 | EXISTS | keep current rig integration; source-lock final dimensions/fittings before final-art signoff |
| kb wz.98a | EXISTS | preserve longer visual distinction; validate detailed sights/bands/sling against institutional object/manual |
| rkm wz.28 | EXISTS | retain 20-round mag/bipod identity; replace estimated detail with museum/manual control before final |
| ckm wz.30 | EXISTS | retain tripod/water-jacket/belt/box silhouette; validate tripod/receiver/accessories with strong source |
| Vis wz.35 | MISSING as visible pistol | only Zieliński/officer-type roles if data requires; holster alone can remain until pistol is actually shown/used |
| defensive grenade | PLACEHOLDER/UNVERIFIED as soldier-carried asset | source exact grenade before detailed belt/body display |

### Germany

| Item | Audit state | Standard |
| --- | --- | --- |
| Kar98k | EXISTS | keep; validate fine receiver/sight/sling detail before final |
| MG34 | EXISTS | strong period/type authority; replace estimated geometry with DHM/manual/object controls where possible |
| MG34 Gurttrommel/belt | EXISTS | retain only as sourced role-appropriate configuration |
| MG assistant carrier/load | MISSING | P0 role-equipment task after source lock |
| optics | NOT REQUIRED | do not add without an actual sourced scoped/sniper role |

## 9. Crew-served weapon rule

A crew-served weapon is not historically complete if only the gun is correct.

Final review must inspect:
- gun;
- mount/bipod/tripod;
- ammunition container;
- belt/magazines;
- carried reserve ammunition;
- crew hand positions;
- gunner/assistant load;
- maintenance/spare-barrel/water accessories when historically required and visible;
- transport/stowed configuration if shown.

Do not add accessories simply because another late-war unit used them.

## 10. Visual variation plan

Variation is deterministic presentation, not random costume generation.

### Allowed variation axes
- **uniform wear:** fading, repairs, creasing; small and sourced;
- **equipment load:** only from role-valid equipment sets;
- **head/face:** deterministic head mesh + texture;
- **helmet state:** only where scene/state permits;
- **rank:** only from authoritative actor data;
- **pouches:** only weapon/role-compatible patterns;
- **mud/dirt:** location/activity-driven intensity;
- **facial hair:** modest period-plausible variation; never a nationality stereotype;
- **age:** constrained by actor/story role, not random extremes.

### Not allowed without evidence
- rolled sleeves as a generic "battle-worn" switch;
- random missing helmet during active combat merely for variety;
- random officer/NCO insignia;
- swapping national equipment across sides;
- late-war German gear in September 1939;
- cosmetic ammo belts on soldiers who do not support the MG;
- exaggerated mud/blood independent of mission events.

## 11. Face plan and LOD cost

Do not make every soldier a unique full body asset.

### Polish
Current eight switchable heads are adequate for named M01 cast. Keep named heads stable by character ID. Add generic heads only if crowd repetition remains visible after equipment variation.

### German
Three heads are insufficient for repeated groups.

Recommended target without increasing rig count:
- LOD0: 6–8 German head variants available;
- LOD1: reuse the same family or collapse to 4–6 materially distinct variants;
- LOD2: 2–3 silhouette/texture variants are enough because face detail is not readable.

Use:
- same skeleton/body;
- same atlas/material family where possible;
- deterministic actor-ID selection;
- bounded hair/stubble/wrinkle/age masks.

Do not design "Polish faces" and "German faces" as biological stereotypes. Variation is individual, not racialized nationality coding.

## 12. Performance / LOD standard

### LOD0 — close-up
Preserve:
- correct head/face;
- rank;
- helmet/headgear;
- role pouches/carriers;
- primary weapon geometry;
- large medical/sapper/MG crew accessories;
- readable sling/box/belt relationships.

### LOD1 — normal gameplay
Preserve:
- national silhouette;
- rank block when readable;
- helmet;
- correct primary weapon;
- main pouches/bags;
- role-defining equipment.

Simplify:
- tiny buckles;
- internal helmet details;
- fine stitches;
- secondary hardware.

### LOD2 — distance
Preserve:
- helmet/headgear silhouette;
- uniform/boot silhouette;
- primary weapon class;
- largest role-specific carrier.

Bake/drop:
- tiny insignia geometry;
- fine pouch closures;
- micro hardware;
- face features below visual value.

This audit makes no FPS or Chromebook claim.

## 13. Licence standard

Every external future asset recommendation must include:
- source;
- author/rightsholder;
- exact licence;
- attribution requirement;
- redistribution permission.

If any field is unknown: **LICENSE BLOCKER**.

### Current M01 soldier provenance
- MakeHuman data: pinned commit + CC0 data licence recorded; acceptable provenance.
- project uniform/gear/weapon geometry/textures/animations: documented as original project work.
- character `manifest.json` lacks its own author/licence/source fields; provenance exists elsewhere but manifest metadata should be improved.
- weapon manifests carry project-original statements, but the repository owner's global distribution licence remains undecided.

The undecided global project licence is a **project policy gap**, not evidence that the project stole or cannot internally use its own original assets.

Museum/archive images are research references only unless separately cleared for redistribution.

## 14. P0 gaps — before final soldier art

1. **German MG34 crew loadout silhouette.** Current gunner/assistant inherit one generic rifleman gear block; assistant carrier/support load is visibly missing. Research exact 1939 infantry MG crew equipment, then build role-selectable gear.
2. **Crew-served weapon source lock.** rkm wz.28, ckm wz.30 and MG34 contain many explicitly estimated measurements. Before final-art approval, replace critical silhouette measurements with museum/manual/object evidence. Do not automatically remodel dimensions that already prove correct.
3. **CKM/RKM/MG crew equipment audit.** Confirm ammunition carriers/boxes, belt/magazine distribution and maintenance accessories for the actual 1939 role; current gun geometry alone is not enough.

P0 here means "block final historical-art approval", not "break current playable prototype".

## 15. P1 gaps — major fidelity/readability

1. German role-selectable gear: rifleman vs MG gunner vs assistant.
2. German rank metadata/insignia only after actor authority exists.
3. Polish uniform-pattern variation/source lock for the exact 2 Batalion Strzelców; avoid claiming universal wz.36.
4. Dedicated Polish medic visual load/identification, without inventing Dudek's rank.
5. Validate Polish rank insignia geometry for Zieliński/Krawiec/Kowal.
6. Increase German face variety from 3 toward 6–8 LOD0 heads without new body rigs.
7. M35 1939 marking policy: document historically correct side markings versus project-content policy; current blank shell remains knowingly incomplete.
8. Resolve generic German Y-strap/pouch layout from a strong 1939 source instead of applying one set universally.
9. Add explicit licence/provenance fields to the character manifest when asset work resumes.

## 16. P2 gaps — finish/detail

1. Fine mud/fading/repair variation driven by environment and activity.
2. Exact sling hardware, pouch closures, buckles and small fittings after source lock.
3. Visible Vis wz.35 pistol only if a scene actually exposes it.
4. Historically audited carried grenade mesh if it becomes visible on the body.
5. Refine canteen/mess-kit/gas-mask carrier dimensions from museum objects.
6. Hair/facial-hair refinements where visible without helmet.
7. LOD-specific baking of insignia and micro details.

## 17. Recommended asset production order

1. Research packet: German 1939 MG34 team personal equipment + institutional/manual references.
2. German role-selectable gear meshes, preserving current body/rig.
3. Institutional dimension pass on MG34, ckm wz.30 and rkm wz.28; patch only proven discrepancies.
4. Polish 2 Batalion Strzelców/Tczew issue research; decide whether a second Polish tunic/load family is justified.
5. Polish medic equipment/identification packet.
6. Rank-insignia reference sheet and corrected low-cost insignia meshes.
7. German head expansion using existing CC0 morph pipeline.
8. M35 detail/marking policy.
9. P2 wear/mud/small hardware.
10. Only then consider optional visible Vis/grenade detail.

This order maximizes historical gain while minimizing risk to existing animations, hitboxes and runtime.

## 18. Approval rule

An asset may be marked **historical-final for M01** only when:
- role/rank is authoritative;
- weapon is correct;
- key equipment silhouette is role-correct;
- critical geometry is sourced;
- all external dependencies have licence/provenance;
- LODs preserve the historically important silhouette;
- no gameplay/runtime assumption was introduced by art.

Until then, keep the existing label **PROTÓTIPO JOGÁVEL / provisional art**.
