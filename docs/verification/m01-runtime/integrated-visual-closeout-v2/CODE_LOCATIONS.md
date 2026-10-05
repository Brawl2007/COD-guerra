# M01 Integrated Visual Closeout V2 — Code locations

Base runtime audited: `6bd69521aef18f00b2ab37ccd7ceeca6a4da3a2b`.

## A — PLACEHOLDER VISÍVEL

| Sistema | Local | O que aparece normalmente |
|---|---|---|
| Station mass | `src/world/tczew-world.js` `refresh()` | `station` é um único collider/volume brick de -460..-338 × 28..55. |
| Station dressing | `src/render/m01-environment.js` `buildArchitecture()` | janelas, pilastras, cornijas, roof courses, hut e edging são `BoxGeometry`/`CylinderGeometry` instanciados; sem shell interior real. |
| Station windows / shelter hints | `src/render/m01-view.js` `buildTerrain()` | janelas escuras são boxes rasos sobre parede sólida; vários sinais/volumes são caixas. |
| Terrain | `src/render/m01-view.js` `buildTerrain()` | plane 2000×650 deformado por heightfield + grandes boxes de terreno/água. |
| Railway | `src/render/m01-view.js` `buildTerrain()`; `src/render/m01-environment.js` `buildTracks()` | carris, travessas, ballast e gravel são boxes/dodeca/tetra repetidos. |
| Vegetation | `src/render/m01-environment.js` | trunks cilíndricos; canópias Icosahedron/Dodecahedron; grass procedural; cards apenas próximos. |
| Battlefield smoke/dust | `src/render/m01-atmosphere.js` `billboardBatch()/update()` | PlaneGeometry camera-facing com uma textura procedural compartilhada; tetrahedra para debris. |
| Muzzle/impact FX | `src/render/m01-view.js` `createFireEffects()/updateFire()` | muzzle/tracer/puff/spark usam sphere/billboard pools; visual curto e simples. |
| Yard wagon fire | `src/render/m01-yard-wagons.js` | fogo é um único Sprite por vagão, combinado com atmosphere smoke. |

## B — FALLBACK APROVADO

Estes placeholders não são prioridade enquanto os assets carregarem normalmente:

- `src/render/m01-locomotive.js`: box/cylinder `original_locomotive_fallback`.
- `src/render/m01-panzerzug.js`: box/cylinder `original_panzerzug_fallback`.
- `src/render/m01-train-wagons.js`: 65 body/wheel proxies.
- `src/render/m01-yard-wagons.js`: body/wheel fallback.
- `src/render/m01-characters.js` + `src/render/m01-view.js`: procedural actor support quando GLB/clips falham.
- `src/render/m01-view.js` `createAircraft()`: proxy do Ju 87 quando art opcional falha.

A base validada mostrou locomotive/Panzerzug/wagons reais carregados e train proxies = 0 no cenário normal.

## C — GEOMETRIA PROCEDURAL ACEITÁVEL

- sky sphere em `m01-atmosphere.js`;
- contact-shadow plane em `m01-view.js`;
- instancing em si;
- grass blades de background;
- cartridge cylinder no Wz.29 viewmodel;
- tetra debris pequeno quando lido apenas como fragmento;
- terrain plane como suporte técnico, desde que o dressing/material seja melhorado.

## D — DEBUG / TEST ONLY

- staging/inspection lights e formação isolada de `tests/browser/m01-soldier-visual-variation.spec.js`;
- fixtures/cameras de verificação;
- screenshots de fallback forçado.

## Assets visuais relevantes

- Station: **não existe GLB dedicado de produção**; é composição procedural sobre o collider.
- Bridge/portals: `assets/models/provisional/m01/*.glb`, incluindo `portal_lisewo_1912*.glb`.
- Soldiers: `assets/models/provisional/m01/characters/*`.
- Locomotive: `assets/models/production/m01/locomotive/*`.
- Panzerzug: `assets/models/production/m01/panzerzug/*`.
- Wagons: `assets/models/provisional/m01-wagons/*` e `m01-wagon-damage/*`.
- MG34/CKM/Wz.29: `assets/models/provisional/m01/weapons/*`.
