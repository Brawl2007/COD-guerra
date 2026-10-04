# Verification report — historical soldier/equipment audit

Task: `M01-HISTORICAL-SOLDIER-EQUIPMENT-ASSET-AUDIT-V1`  
Base: `codex/m01-schema2-determinism-audit@5f3cc34f53c61beec52255d67f8babd7194c9f7f`  
Branch: `codex/m01-historical-soldier-equipment-audit`

## Scope verification

This task intentionally changes documentation and one verification tool only.

No requested production changes were made:
- no `src/**`;
- no simulation;
- no renderer;
- no save schema;
- no animation runtime;
- no Combat AI;
- no BattleSector;
- no weapon runtime;
- no GLB;
- no texture.

Final branch/base compare must be checked again after the handoff commit.

## Research result

The audit used institutional/archival sources rather than game screenshots:
- Muzeum II Wojny Światowej — Polish September 1939 uniforms/equipment;
- Narodowe Archiwum Cyfrowe / Szukaj w Archiwach — pre-war Polish field/manoeuvre photographs;
- Muzeum Wojska Polskiego — Vis wz.35 object/service context;
- MIIW Westerplatte archaeological finds — Browning wz.28 and ckm wz.30-associated material;
- Deutsches Historisches Museum — M35 helmet, MG34 and marching boots;
- Bundesarchiv Bilddatenbank — German troops in Poland, September 1939.

Bibliography/caveats: `SOURCES.md`.

## Remote inventory validation

Because the working container does not have the repository checkout, current repository paths/manifests were validated through the authenticated GitHub connection against the exact base tree.

Observed:
- **7 manifests parsed as valid JSON**;
- **25 expected asset/provenance paths checked**;
- **0 missing expected paths**;
- **0 broken required references in the audited set**;
- duplicate referenced paths: **PASS**;
- Polish/German soldier LOD0/LOD1/LOD2: complete;
- rkm wz.28 LOD0/1/2: complete;
- ckm wz.30 LOD0/1/2: complete;
- MG34 LOD0/1/2: complete;
- expected animation GLBs in the audited set: present.

Licence metadata warning:
- `station-animations.manifest.json` has an author declaration but no explicit `license` field;
- the main character manifest likewise does not embed author/licence/source metadata, although its provenance is recoverable from `ASSET_CREDITS.md`, the MakeHuman lock and the CC0 licence file.

This is a metadata/policy gap, not evidence of unknown third-party origin.

## Inventory tool

Added:
`tools/verification/m01-historical-soldier-asset-inventory.mjs`

Checks:
- manifest paths;
- JSON validity;
- required referenced files;
- LOD0/1/2 completeness;
- duplicate referenced asset paths;
- provenance-file presence;
- explicit licence-field warnings.

It accepts both `files:{...}` and the station animation manifest's singular `file:` form.

## Tool self-test

Executed in the local container with Node after the final station-manifest-format correction.

```text
node --check /tmp/m01-historical-soldier-asset-inventory.mjs
node /tmp/m01-historical-soldier-asset-inventory.mjs --self-test
```

Result:

```json
{
  "ok": true,
  "cases": 3
}
```

Self-test cases:
1. complete fixture passes;
2. missing MG34 LOD1 is detected as missing file + incomplete LOD;
3. invalid rkm manifest JSON is detected.

Important limitation: this self-test validates the tool logic using a temporary fixture. The actual repository inventory was validated separately through GitHub, because no complete local checkout was available.

## Historical findings

### Polish
- the current item vocabulary is broadly strong for 1939: wz.31, Mauser rifles, Browning rkm/ckm, belt/pouches, gas-mask equipment, entrenching tool and sapper role gear all have a period basis;
- the main overclaim is uniformity: September 1939 Polish uniforms were not one universal wz.36 pattern;
- exact issue for 2 Batalion Strzelców at Tczew remains unproven;
- named rank switches match current story data, but their exact insignia geometry is not source-locked;
- medic equipment is currently not differentiated.

### German
- M35, MG34, Kar98k and tall early-war marching boots are strong period foundations;
- blank M35 shells are historically incomplete for September 1939 because period army helmets carried side insignia;
- the biggest asset-system issue is one merged generic German equipment load across rifle/MG roles;
- only three generic German heads exist;
- German rank variants are absent and actor rank authority is also absent, so ranks must not be invented.

### Weapons
- all principal long arms/crew weapons exist visually;
- Vis wz.35 is represented by a holster but no visible pistol mesh in the soldier switches;
- rkm/ckm/MG34 final-art approval is blocked by the number of explicitly estimated measurements:
  - rkm wz.28: **8/11** measures estimated;
  - ckm wz.30: **7/13**;
  - MG34: **8/13**;
- the current ckm has tripod, water jacket, feed belt, free belt and ammunition box;
- MG34 has drum, short belt and bipod, but assistant personal ammunition-carrier gear is missing.

## Priority result

P0:
- German MG34 gunner/assistant role-equipment silhouette;
- institutional/manual source-lock for silhouette-critical rkm/ckm/MG34 dimensions;
- crew-carried ammunition/accessory audit before final crew art.

P1:
- role-selectable German gear;
- German rank system only after actor authority;
- Polish uniform mix/source lock;
- Polish medic visual load;
- Polish rank insignia validation;
- German face expansion;
- M35 marking policy;
- Y-strap/loadout verification;
- character manifest provenance metadata.

P2:
- wear/mud;
- fine sling/buckle/pouch geometry;
- optional visible Vis/grenade detail;
- fine canteen/gas-mask carrier dimensions;
- face/hair refinement.

Full matrix: `GAP_MATRIX.md`.

## No performance claim

LOD strategy is architectural only:
- LOD0 close-up;
- LOD1 normal gameplay;
- LOD2 distance silhouette.

No FPS, browser GPU performance or Chromebook performance was measured or claimed.

## Limitations

- No dedicated 2 Batalion Strzelców quartermaster/issue record was found in this research pass.
- Several existing weapon manifests were originally built from search summaries/secondary pages that were not read in full; this audit explicitly downgrades those details to RECONSTRUCTED/UNKNOWN.
- No final German 1939 MG crew personal-equipment manual was obtained in this pass; the missing crew load is therefore a P0 **research + asset** task, not an invitation to invent a carrier.
- Exact Polish medical field-load details for Dudek remain unresolved.
- Historical references do not grant permission to redistribute their images.
- No asset was generated or modified.
