# Gap matrix and priority backlog

Task: `M01-HISTORICAL-SOLDIER-EQUIPMENT-ASSET-AUDIT-V1`

| Gap | Side/role | Current evidence | Classification | Priority | Production action |
| --- | --- | --- | --- | --- | --- |
| MG34 crew personal load is not role-specific | DE MG gunner/assistant | shared German `gear` gives generic rifle pouches; prone manifest says assistant drum carrier is not modeled | MISSING / RECONSTRUCTED | **P0** | source exact 1939 MG team load, then split rifleman/gunner/assistant gear switches |
| Critical dimensions in crew weapons still estimated | PL rkm/ckm, DE MG34 | rkm 8/11, ckm 7/13, MG34 8/13 recorded measures estimated | RECONSTRUCTED | **P0** | replace silhouette-critical estimates with museum/manual/object measurements before final-art approval |
| Crew-system accessories not fully source-locked | rkm/ckm/MG | gun kits exist, but carried reserve ammo/assistant equipment and some maintenance accessories are incomplete or unverified | UNKNOWN / MISSING | **P0** | create role-equipment reference packet first; model only confirmed items |
| German gear is one merged load for nearly everyone | DE rifleman/MG roles | one common gear mesh | PLAUSIBLE for rifleman, inaccurate as universal | **P1** | make role-selectable gear groups without changing rig |
| German rank presentation absent | DE | no rank switch meshes; actor ranks not encoded | MISSING | **P1** | first add rank authority to art spec/data only when existing mission data supports it; never assign random ranks |
| Polish uniform family over-uniformized | PL | all bodies share same wz.36-like cut; MIIW says multiple patterns coexisted in Sep 1939 | PLAUSIBLE / RECONSTRUCTED | **P1** | research 2 Batalion Strzelców issue; add second family only if evidence justifies it |
| Polish medic has no dedicated sourced field equipment | PL medic | Dudek has named face but no medical load/identifier | MISSING / UNKNOWN | **P1** | research 1939 Polish company medic/stretcher-bearer kit and identification |
| Polish rank insignia geometry lacks strong source | PL named NCOs | switches exist for sierżant/kapral/starszy strzelec | RECONSTRUCTED | **P1** | validate insignia construction against institutional/manual reference |
| German face diversity low | DE all | 3 generic heads | PLAUSIBLE but repetitive | **P1** | expand to 6–8 LOD0 heads using existing CC0 morph pipeline, no new rig |
| M35 side markings omitted | DE | shell is correct; project deliberately has no decals | historically incomplete | **P1** | document policy; if approved, build exact 1939 markings from sourced original art, not copied imagery |
| Universal Y-strap assumption not source-locked | DE | merged gear has Y-straps on all actors | UNKNOWN as universal M01 issue | **P1** | verify 1939 issue/use and make optional by role/load if necessary |
| Character manifest lacks local author/licence fields | both | provenance exists in ASSET_CREDITS/MakeHuman lock, but character manifest has only generator/units/files | metadata gap | **P1** | add provenance fields only in a future asset-manifest task; no asset bytes need change |
| Exact pouch/canteen/gas-mask carrier dimensions | both | broad categories exist, fine dimensions reconstructed | RECONSTRUCTED | **P2** | museum-object dimensional pass |
| Fine sling/buckle/hardware details | both | present but procedural/reconstructed | RECONSTRUCTED | **P2** | refine after P0/P1 source lock |
| Environment-driven wear/mud | both | limited procedural face grime/wear | PLAUSIBLE | **P2** | add bounded, context-driven texture variants; no random costume damage |
| Visible Vis wz.35 pistol | PL Zieliński | holster exists, weapon mesh not in soldier switches | MISSING | **P2** | model only if actually visible/needed; no gameplay change in asset task |
| Historically audited carried grenade mesh | PL player | gameplay item exists; body-carried historical mesh not established | UNVERIFIED | **P2** | source exact grenade/attachment before adding visible body prop |
| Krawiec rolled sleeves | PL sapper | story visual request, no source found in this audit proving it for the M01 context | UNKNOWN | **P2 / HOLD** | do not implement as generic variation until sourced |

## P0 acceptance gate

P0 does **not** mean the current prototype is unusable. It means the item blocks the label “historical-final soldier art”.

P0 is closed only when:
1. source packet is institutional/manual-grade;
2. crew role equipment is explicit;
3. critical weapon silhouette measurements are no longer based solely on estimated/search-summary geometry;
4. final choices are recorded in a manifest with classification and provenance.

## P1 acceptance gate

P1 closes role readability and historical diversity without changing gameplay:
- ranks only where authoritative;
- medic recognizable from sourced equipment;
- national loadouts not cloned across specialist roles;
- faces varied with the existing shared rig;
- Polish uniform mix no longer overclaimed;
- German helmet/gear policy explicitly documented.

## P2 acceptance gate

P2 is polish:
- small hardware;
- visible minor sidearms/grenades only where useful;
- wear/mud;
- micro texture/detail refinement.

P2 must never introduce a historically wrong silhouette just to add visual noise.
