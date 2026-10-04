# Licence and provenance audit

Base: `5f3cc34f53c61beec52255d67f8babd7194c9f7f`

## Current asset families

| Family | Source / author | Licence evidence | Attribution | Redistribution status | Audit |
| --- | --- | --- | --- | --- | --- |
| MakeHuman base mesh/morph/skeleton/weights used by M01 soldiers | MakeHuman Community; exact repo commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482` pinned | `assets/licenses/MakeHuman-CC0.md`; lock says data CC0, AGPL code not used | CC0 requires no attribution, though provenance should remain documented | CC0 permits reuse/redistribution | **CLEAR** |
| Polish/German soldier clothes, gear, textures and clips | original procedural project work; documented in tool README/ASSET_CREDITS | no external asset dependency beyond CC0 base | project credits recommended | owner controls original work, but repository-wide public distribution licence is still undecided | **PROVENANCE CLEAR / PROJECT-LICENCE POLICY GAP** |
| rkm wz.28 kit | project-original generated geometry/textures/clips | manifest explicitly says original; no third-party/game content | project author credit | same global project-licence policy gap | **PROVENANCE CLEAR** |
| ckm wz.30 kit | project-original generated geometry/textures/clips | same | project author credit | same | **PROVENANCE CLEAR** |
| MG34 kit | project-original generated geometry/textures/clips | same | project author credit | same | **PROVENANCE CLEAR** |
| MG34 prone clips | project-original procedural clips; reuses project MG/soldier assets | manifest explicit | project author credit | same | **PROVENANCE CLEAR** |
| station-drag transitions | project-original procedural clips | manifest explicit | project author credit | same | **PROVENANCE CLEAR** |

## Metadata gap

`assets/models/provisional/m01/characters/manifest.json` does **not** contain top-level `author`, `license` or `sources` fields.

This is not evidence of uncertain origin because:
- `ASSET_CREDITS.md` describes the output;
- `tools/assets/m01-soldiers/makehuman.lock.json` pins the third-party CC0 source;
- the full CC0 text is stored in-repo;
- the tool README states that clothing/equipment/weapons/atlas/clips are original project work.

Classification: **manifest metadata gap**, not LICENSE BLOCKER.

Future manifest revision should embed the provenance rather than requiring readers to correlate three files.

## Historical references are not asset licences

NAC, Bundesarchiv, MIIW, MWP and DHM records in `SOURCES.md` are used as historical evidence. Their photographs/scans/object images are **not automatically authorized for redistribution inside the game**.

Do not:
- trace/copy a museum image texture and call it original;
- ship an archival photograph because it is publicly viewable;
- copy a commercial museum 3D scan without its exact licence.

A source can be used to measure/understand an item while the final geometry/textures are independently authored.

## Future external asset rule

Before importing any external model, texture, scan, photograph-derived texture, animation or kit, record:

```text
source:
author/rightsholder:
license:
attribution_requirement:
redistribution_permission:
modification_permission:
proof_url_or_file:
```

If any of source, author/rightsholder, exact licence or redistribution permission cannot be established:

**LICENSE BLOCKER**

“Free”, “royalty free”, “downloadable”, “for personal use”, or absence of a copyright notice does not satisfy this rule.

## Commercial libraries

A paid licence can be acceptable only if:
- it covers use in an interactive game;
- redistribution as part of the built game is allowed;
- source files are not redistributed contrary to terms;
- attribution requirements are satisfied;
- the licence record is archived.

No commercial asset is recommended by this audit.

## Recommendation

Keep producing historically sourced geometry/textures in-house using the existing CC0 human-base pipeline. It gives the cleanest provenance and lets the team correct only proven historical gaps without importing opaque marketplace assets.
