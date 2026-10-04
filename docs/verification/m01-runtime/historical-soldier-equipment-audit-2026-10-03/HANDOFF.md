# HANDOFF — M01 Historical Soldier Equipment Asset Audit V1

## TASK_ID
`M01-HISTORICAL-SOLDIER-EQUIPMENT-ASSET-AUDIT-V1`

## MODELO
GPT-5.6 Sol

## ESFORÇO
HIGH

## BASE
`codex/m01-schema2-determinism-audit@5f3cc34f53c61beec52255d67f8babd7194c9f7f`

## BRANCH
`codex/m01-historical-soldier-equipment-audit`

## HEAD FINAL
This file is the final content checkpoint. Because a Git commit cannot contain its own SHA, resolve the branch after this commit; the exact remote HEAD is reported externally to the captain.

## COMMITS
1. `1423949e64619c13a956cc6886176c448183593b` — institutional/archival source bibliography.
2. `12f0548a2f76f3d47eb42a29ef38df3aaca2176b` — initial inventory validator.
3. `2f6ac3962e2caeb6cd52de46bc1c7d076b35cfaa` — current soldier/weapon asset matrix.
4. `85c2dd4109f2d328cdde67650fc459b26c36719d` — main historical soldier asset standard.
5. `6a5e97ef7a523c8dce8d1893722473f893cfa9ee` — P0/P1/P2 gap matrix.
6. `a641d9fdedd2272e81a854077aea644b4624f4e2` — licence/provenance audit.
7. `fbc58729411308c2b46607aa618cc2b2e72785a8` — DHM marching-boot source addition.
8. `991e8af56b7a17b2c0d1ca481a62467e1d1875bd` — inventory validator covers singular station-animation manifest.
9. `0f7b767ab08dd061eea697b5666f69962096b4c8` — verification report.
10. `3aae5c07d0f163a9ddfd2c83b7d1c53b15c6c087` — next-chat context.
11. final handoff commit — this file.

## HISTORICAL SOURCES
Primary research set:
- Muzeum II Wojny Światowej: Polish uniforms/equipment in September 1939;
- Narodowe Archiwum Cyfrowe / Szukaj w Archiwach: 1936–1938 Polish field/manoeuvre images;
- Muzeum Wojska Polskiego: Vis wz.35;
- MIIW Westerplatte archaeology: Browning wz.28 and ckm wz.30-associated material in 1939 defence context;
- Deutsches Historisches Museum: M35 helmet, MG34, Wehrmacht infantry context and Marschstiefel;
- Bundesarchiv Bilddatenbank: German infantry in Poland, September 1939.

Full bibliography/rights caveats:
`docs/verification/m01-runtime/historical-soldier-equipment-audit-2026-10-03/SOURCES.md`

No Call of Duty/Medal of Honor screenshot or asset is used as historical authority.

## POLISH UNIFORM AUDIT
Strengths:
- current asset vocabulary includes wz.31, rogatywka, short shoes/puttees, belt, pouches, field bag, canteen, gas-mask bag, shovel, sapper bag and role-specific rkm pouch;
- named Polish heads and three named rank switches already exist;
- story-specific weapon distinctions (wz.29, wz.98a, rkm wz.28) exist.

Important correction:
- September 1939 Polish Army did **not** use one universal uniform pattern;
- MIIW states three patterns were in use and wz.19 was still the most common general pattern, with wz.36 newer/preferred;
- current all-wz.36-like body presentation is therefore RECONSTRUCTED/PLAUSIBLE for exact Tczew issue, not confirmed;
- do not invent distribution percentages until 2 Batalion Strzelców issue evidence is found.

## GERMAN UNIFORM AUDIT
Strengths:
- M35 helmet family is correct for 1939;
- tall marching boots fit early-war presentation;
- field-grey/M36-styled direction is plausible;
- Kar98k and MG34 are correct key weapon families.

Gaps:
- only three German heads;
- one merged German gear block across rifle/MG roles;
- no German rank switches;
- M35 side markings are intentionally absent although period Heer helmets carried side insignia;
- universal Y-strap/load assumption remains insufficiently source-locked;
- MG gunner/assistant load is the most important role-equipment gap.

## RANK AUDIT
Current authoritative named Polish mapping:
- Jan Wrona — strzelec;
- Tadeusz Nowicki — strzelec;
- Józef Bąk — strzelec;
- Szymon Kowal — starszy strzelec;
- Paweł Krawiec — kapral;
- Marek Zieliński — sierżant;
- Leon Dudek — sanitariusz function; rank UNKNOWN.

Current asset switches exist for Kowal/Krawiec/Zieliński. Their exact insignia geometry is RECONSTRUCTED pending institutional validation.

Generic Polish engineers/ckm crew have no justified rank inheritance.

German M01 actors do not contain enough rank authority for visual promotions. Do not create German NCO/officer variety by random assignment.

Full role/rank table:
`docs/architecture/M01_HISTORICAL_SOLDIER_ASSET_STANDARD.md`.

## WEAPON AUDIT
Polish:
- kb wz.29 — **EXISTS**, geometry RECONSTRUCTED;
- kb wz.98a — **EXISTS**, geometry RECONSTRUCTED;
- rkm wz.28 — **EXISTS**, dedicated + embedded variants, but 8/11 standalone measures estimated;
- ckm wz.30 — **EXISTS**, full tripod/belt/box system, but 7/13 measures estimated;
- Vis wz.35 — holster EXISTS; visible pistol mesh **MISSING** in soldier switches;
- carried defensive grenade presentation — **PLACEHOLDER / UNVERIFIED**.

German:
- Kar98k — **EXISTS**;
- MG34 — **EXISTS**, but 8/13 measures estimated;
- MG34 prone pair — **EXISTS**, with animation/posture details explicitly RECONSTRUCTED;
- assistant personal ammunition carrier — **MISSING**;
- optics — not required by any current sourced M01 role.

## EQUIPMENT AUDIT
Polish common gear is broadly period-compatible, but exact models/dimensions of pouches, bag, canteen and gas-mask carrier need object-level source lock before historical-final.

Polish sapper bag is a useful role silhouette but RECONSTRUCTED. Canvas helmet cover must not be treated as a universal engineer rule.

German common gear contains rifle pouches, Y-suspenders, bread bag, canteen, gas-mask canister and entrenching tool. The failure is not “nothing exists”; it is that one combined set is applied too broadly.

Crew-served weapon review must cover weapon + mount + ammo container + carried reserve ammo + gunner/assistant equipment + historically required maintenance accessories.

## CURRENT ASSET MATRIX
`docs/verification/m01-runtime/historical-soldier-equipment-audit-2026-10-03/CURRENT_ASSET_MATRIX.md`

Key counts:
- PL body LOD: 14,861 / 6,022 / 1,895 visible tris;
- DE body LOD: 16,055 / 6,446 / 2,059;
- 25 shared soldier clips;
- rkm standalone: 1,476 / 744 / 234;
- ckm: 3,904 / 2,298 / 754;
- MG34: 2,432 / 1,262 / 368;
- MG34 prone: 9 pair clips reusing existing LOD assets.

## LOD COVERAGE
Complete LOD0/1/2 sets exist for:
- Polish soldier;
- German soldier;
- rkm wz.28 standalone;
- ckm wz.30;
- MG34.

MG34-prone and station evacuation assets are animation extensions that reuse existing character/weapon LODs.

Recommended preservation:
- LOD0: rank/face/role hardware;
- LOD1: national/role silhouette + main pouches/weapon;
- LOD2: helmet/uniform/primary weapon/largest role carrier only.

No FPS claim.

## ANIMATION COVERAGE
Current soldier clips cover rifle combat/reload/locomotion, crouch/pinned, sapper work, casualty/carry and 10 rkm-specific states.

Dedicated extensions cover:
- MG34 aim/burst/reload;
- 9 MG34 prone/loader clips;
- ckm gun + gunner/loader states;
- station wounded/drag transitions.

Conclusion: animation quantity is not the primary historical-asset blocker.

## LICENSE AUDIT
MakeHuman human-base data:
- exact upstream commit pinned;
- CC0 data licence stored in repository;
- AGPL code explicitly not used.

Current project uniforms/gear/weapons/textures/clips:
- documented as original project work;
- no commercial-game extraction identified;
- global repository distribution licence is still an owner policy decision.

Metadata gaps:
- character manifest lacks local author/licence/source fields;
- station animation manifest has author but no explicit licence field.

Future external asset with uncertain source/author/exact licence/redistribution permission = **LICENSE BLOCKER**.

Full:
`docs/verification/m01-runtime/historical-soldier-equipment-audit-2026-10-03/LICENSE_AUDIT.md`.

## FACE / VARIATION PLAN
Keep one shared body rig.

Polish:
- current eight heads are adequate for named cast;
- add generic heads only if repetition remains visible.

German:
- increase 3 -> target 6–8 LOD0 head variants;
- LOD1 may collapse/reuse 4–6;
- LOD2 needs only 2–3 silhouette/texture variants.

Variation is deterministic by actor identity/role:
- wear;
- equipment load;
- face/head;
- allowed helmet state;
- authoritative rank;
- role-correct pouch layout;
- context-driven dirt/mud.

Do not use nationality stereotypes or random officer ranks.

## HISTORICAL CLASSIFICATION
Applied throughout:
- CONFIRMED;
- RECONSTRUCTED;
- PLAUSIBLE;
- GAMEPLAY COMPRESSION;
- UNKNOWN.

Key examples:
- M35 family: CONFIRMED;
- current blank M35 in September 1939: historically incomplete;
- all-PL wz.36-like issue: PLAUSIBLE/RECONSTRUCTED for exact M01 unit;
- many rkm/ckm/MG fine dimensions: RECONSTRUCTED;
- Krawiec rolled-sleeve requirement: UNKNOWN pending source;
- casualty animation simplification: GAMEPLAY COMPRESSION.

## P0 GAPS
1. German MG34 gunner/assistant personal equipment and ammunition-carriage silhouette.
2. Source-lock silhouette-critical dimensions of rkm wz.28, ckm wz.30 and MG34 using institutional object/manual evidence.
3. Audit/model only the confirmed crew-carried ammunition/accessory set for rkm/ckm/MG teams.

P0 blocks “historical-final” art approval, not current playable-prototype use.

## P1 GAPS
- role-selectable German gear;
- German rank system only after rank authority exists;
- exact Polish unit uniform mix;
- Polish medic load/identification;
- exact Polish named-rank insignia;
- 6–8 German LOD0 heads;
- M35 marking policy;
- Y-strap/load verification;
- character manifest provenance metadata.

## P2 GAPS
- controlled mud/wear;
- sling/buckle/pouch micro-detail;
- optional visible Vis;
- sourced carried grenade if visible;
- object-level canteen/gas-mask carrier refinements;
- hair/facial-hair polish.

## TOOLS
`tools/verification/m01-historical-soldier-asset-inventory.mjs`

Checks JSON/manifests, expected paths, LOD completeness, duplicate references and provenance/licence metadata.

## TESTS
Tool self-test after final manifest-format correction:
- syntax check PASS;
- self-test **3/3 PASS**:
  1. valid fixture;
  2. missing MG34 LOD detected;
  3. invalid JSON detected.

Actual repository, via authenticated GitHub/base tree:
- 7 manifests parsed;
- 25 expected asset/provenance paths checked;
- zero missing required paths;
- zero broken expected references;
- duplicate referenced paths PASS;
- all audited LOD triplets complete.

No browser test required because no visual/runtime file changed.

## LIMITATIONS
- exact 2 Batalion Strzelców Tczew issue record not found in this pass;
- exact Polish medic field load unresolved;
- exact German 1939 MG assistant personal carrier set still requires stronger manual/object sourcing;
- several current weapon dimensions originated from unread search summaries/estimates;
- archival/museum image availability is not a redistribution licence;
- no asset was created, changed or visually re-rendered;
- no FPS/Chromebook measurement.

## RECOMMENDED ASSET ORDER
1. German 1939 MG34 team equipment research packet.
2. Role-selectable German rifleman/gunner/assistant gear.
3. Institutional dimension pass for MG34, ckm wz.30, rkm wz.28; change only proven discrepancies.
4. Exact Tczew/2 Batalion Strzelców issue research and decision on second Polish uniform family.
5. Polish medic equipment packet.
6. Polish/German rank reference sheet, only for roles backed by actor data.
7. German head expansion with existing CC0 morph pipeline.
8. M35 marking/policy decision.
9. P2 wear/small hardware.

## RECOMMENDATION TO CAPTAIN
**Approve this branch as a research/asset-audit checkpoint, not an asset-integration branch.**

Do not rebuild the soldier system. Preserve current rigs, LODs, animations and correctly identified weapon families. The next highest-value work is a narrowly scoped German MG34 crew-equipment research/asset task or an institutional dimensional source-lock pass on the three crew weapons.

## STOP
Do not integrate.
Do not merge.
Do not touch `main`.
Do not modify renderer/gameplay.
Do not choose a new task automatically.
