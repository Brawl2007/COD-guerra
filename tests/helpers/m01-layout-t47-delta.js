import assert from 'node:assert/strict';

// T47 (live ckm fire at post S2) changed missions/m01-tczew/map-layout.json by exactly these three hunks: the note of the casemates, the feature `ckm_post` and the
// cover node `cv_ckm_post` (taking over `reservedFor: ckm_crew` from `cv_casemate_emb_s`). Each pair is [text now, text before T47], found exactly once.
//
// The chain this keeps documented and exact (no byte of the layout outside these hunks may change):
//   base 5f3cc34f layout  ==  layout the bridge kit was built from (bridges.manifest.json mapLayout.sha256_16, GLB extras mapLayoutSha256_16)  ==  today's layout minus these hunks.
// The three byte-guard tests (locomotive, panzerzug, soldier variation) compare the layout with the base through layoutWithoutT47(); tests/m01-bridges-glb.test.js hashes it for
// the manifest. The hunks hold no bridge geometry: the GLBs and colliders were not rebuilt.
export const T47_LAYOUT_DELTA=[
  ['Até T47 a metralhadora ckm wz.30 estava na seteira sul; já não está (ver ckm_post). Dentro da zona de demolição oeste.',
   'Metralhadora ckm wz.30 na seteira sul. Dentro da zona de demolição oeste.'],
  [`    {
      "id": "ckm_post",
      "name": "Posto da ckm wz.30 (abrigo de campanha de sacos de areia no encontro oeste da ponte rodoviária)",
      "type": "position",
      "point": [8, -3, 26],
      "root": [7.17, -3, 26],
      "azimuthDeg": 0,
      "classification": "RECONSTRUCTED",
      "sources": ["T04", "T08", "T27"],
      "notes": "T47, RECONSTRUCTED: nenhuma fonte dá a posição da ckm. T08/T27 documentam um bunker de disparo na cabeça de ponte oeste (P12: posição exata em aberto) e T04 as casamatas sob os encontros; a seteira da casamata não vê nenhum alemão (o tabuleiro, o pilar 1 e as torres cortam a linha a 2–113 m). Este posto é o ponto S2 da análise de linhas (docs/verification/m01-runtime/ckm-fire-arc-phase0-2026-10-16): aterro entre as pontes, encostado à face norte do encontro rodoviário, ao nível das casamatas e a 8 m da casamata. A boca (gun_muzzle_flash) fica em (8; −2,36; 26), a 1045–1049 m dos atiradores dos portões de Lisewo, com linha livre e sem tocar nos colliders das pontes. Guarnição de três. Abrigo procedural de jogo, não a posição histórica."
    },
    {
      "id": "forward_post",
`,`    {
      "id": "forward_post",
`],
  [`      "activeUntil": "evt_m01_west_demolition"
    },
    {
      "id": "cv_ckm_post",
      "type": "WINDOW",
      "position": [8.8, -3, 26],
      "normal": [1, 0, 0],
      "heightM": 0.5,
      "peek": ["over"],
      "reservedFor": "ckm_crew",
      "activeUntil": "evt_m01_west_demolition"
    },
`,`      "reservedFor": "ckm_crew",
      "activeUntil": "evt_m01_west_demolition"
    },
`],
];

// R3-a (review of 2026-10-25, golden amendment 19) added two cover nodes to missions/m01-tczew/map-layout.json: cv_cable_fault and cv_cable_second, the sandbag rows on the south slope of the
// embankment that the sappers run to when they are suppressed (src/game/m01-sappers.js). The hunk holds no bridge geometry (the GLBs and colliders were not rebuilt), so the guards revert it
// exactly like T47's, first (it is the newer change), found exactly once; what is left is the T47 layout and then the base.
export const R3A_LAYOUT_DELTA=[
  [`    {
      "id": "cv_cable_fault",
      "type": "SANDBAG",
      "position": [-117, -2.2, 8],
      "normal": [1, 0, 0],
      "heightM": 1.2,
      "peek": ["over"],
      "notes": "R3-a, GAMEPLAY_DRAMATIZATION (sem fonte histórica): fiada de sacos de areia na encosta sul do aterro, 3,4 m a leste do corte do ponto de reparo 2 (fault, em mission.json grp_sappers.operation) e a norte da linha do cabo, fora do chão raso por onde anda o jogador (z 11-17). Os sapadores abrigam-se aqui quando suprimidos (src/game/m01-sappers.js, seek.lanes). A base (y -2,2) é a do pé da encosta, onde ficam os três lugares de abrigo; mais a norte a fiada entra no talude."
    },
    {
      "id": "cv_cable_second",
      "type": "SANDBAG",
      "position": [-133.5, -2.2, 8],
      "normal": [1, 0, 0],
      "heightM": 1.2,
      "peek": ["over"],
      "notes": "R3-a, GAMEPLAY_DRAMATIZATION (sem fonte histórica): o mesmo, 3,1 m a leste do segundo corte (second). A fiada acaba a 1,2 m da linha do cabo (z 10,7) para deixar passar a equipa quando segue o cabo de um corte ao outro."
    },
`,''],
];
// R3-a also updated MAP.md: the count of cover nodes (26 -> 28) and one bullet on the sappers' cover. Same guard: [text now, text before R3-a], each found exactly once.
export const R3A_MAP_DELTA=[
  ["28 nós em `map-layout.json → coverNodes`",
   "26 nós em `map-layout.json → coverNodes`"],
  ["- **Sapadores (R3-a, revisão de 2026-10-25):** `cv_cable_fault` (−117; −2,2; 8) e `cv_cable_second` (−133,5; −2,2; 8) são duas fiadas de sacos de areia (1,2 m) na encosta sul do aterro, a 3,4 m e a 3,1 m a leste dos dois cortes do cabo (`GAMEPLAY_DRAMATIZATION`, sem fonte histórica). A equipa abriga-se aqui por decisão própria quando é suprimida (`src/game/m01-sappers.js`, `seek.lanes`: um lugar por sapador, a oeste da fiada) e volta ao trabalho quando a supressão acaba. As fiadas ficam a norte da linha do cabo (z 10,7) e do chão raso por onde anda o jogador, para não tapar o caminho da equipa nem o do jogador.\n",
   ''],
];

/** Today's layout bytes with the R3-a and T47 hunks reverted: the layout of the base commit and of the bridge kit. */
export function layoutWithoutT47(input){
  let text=Buffer.isBuffer(input)?input.toString('utf8'):input;
  for(const [now,before] of [...R3A_LAYOUT_DELTA,...T47_LAYOUT_DELTA]){
    assert.equal(text.split(now).length,2,'approved R3-a / T47 layout hunk occurs exactly once');
    text=text.replace(now,()=>before);
  }
  return Buffer.from(text);
}

// T47 also added one row to the historical research table (missions/m01-tczew/HISTORICAL_RESEARCH.md, RECONSTRUCTED post of the gun). The guard reverts exactly this
// line (with its newline), found exactly once; every other byte of the file is still the base's.
export const T47_HISTORY_ROW="| Posto da ckm wz.30 (jogo) | **Nenhuma fonte dá a posição da ckm.** Reconstruída no aterro entre as pontes (posto S2), encostada à face norte do encontro rodoviário, ao nível das casamatas e a 8 m da casamata, que não vê nenhum alemão. É a área do bunker da cabeça de ponte oeste (T08/T27), mas o bunker documentado era um posto de disparo das cargas, não uma posição de metralhadora | `RECONSTRUCTED` (T47); posição histórica pendente (P12) | T04, T08, T27 |\n";

/** Today's research table with the T47 row removed: the base commit's bytes. */
export function historyWithoutT47(input){
  const text=Buffer.isBuffer(input)?input.toString('utf8'):input;
  assert.equal(text.split(T47_HISTORY_ROW).length,2,'approved T47 research row occurs exactly once');
  return Buffer.from(text.replace(T47_HISTORY_ROW,()=>''));
}

// T47 also updated missions/m01-tczew/MAP.md (the ckm stands at the RECONSTRUCTED post S2 and its cover node is cv_ckm_post, not the casemate loophole). Four hunks: one table row, the cover-node
// count, the reserve line and the positional-sound line. The guard reverts exactly these, each pair [text now, text before T47] found exactly once; every other byte is still the base's.
export const T47_MAP_DELTA=[
  ["| Posto da ckm wz.30 (S2: aterro entre as pontes, 8; −3; 26; nenhuma fonte dá a posição da ckm) | `RECONSTRUCTED` | T04, T08, T27 (P12) |\n",
   ''],
  ["26 nós em `map-layout.json → coverNodes`",
   "25 nós em `map-layout.json → coverNodes`"],
  ["- **Reserva:** `cv_ckm_post` (8,8; −3; 26) fica reservado à guarnição da ckm wz.30, que desde a T47 está no posto S2 (8; −3; 26), no aterro entre as pontes, encostado à face norte do encontro rodoviário (`RECONSTRUCTED`: nenhuma fonte dá a posição da ckm). `cv_casemate_emb_s` (casamata, 24; −3; 43) deixou de estar reservado: a seteira da casamata não vê nenhum alemão.",
   "- **Reserva:** `cv_casemate_emb_s` fica reservado à guarnição da ckm wz.30."],
  ["- A ckm wz.30 está ao ar livre no posto S2 (8, −3, 26; `RECONSTRUCTED`), já não na casamata (24, −3, 43): soa pelo evento `ally-fire` de cada rajada, com atraso distância/343 s, e o emissor de apresentação da casamata (`ae_s1_ckm_casemate`) foi retirado na T47. O timbre nesse posto ainda não foi ouvido em jogo.",
   "- A ckm wz.30 da casamata (24, −3, 43) soa próxima e abafada pelo interior de pedra."],
];

/** Today's MAP.md with the R3-a and T47 hunks reverted: the base commit's bytes. */
export function mapWithoutT47(input){
  let text=Buffer.isBuffer(input)?input.toString('utf8'):input;
  for(const [now,before] of [...R3A_MAP_DELTA,...T47_MAP_DELTA]){
    assert.equal(text.split(now).length,2,'approved R3-a / T47 MAP.md hunk occurs exactly once');
    text=text.replace(now,()=>before);
  }
  return Buffer.from(text);
}

/** The base-comparable bytes of a mission file that T47 changed by named hunks only (map-layout.json, HISTORICAL_RESEARCH.md, MAP.md). */
export function withoutT47(path,input){
  if(path==='missions/m01-tczew/map-layout.json')return layoutWithoutT47(input);
  if(path==='missions/m01-tczew/HISTORICAL_RESEARCH.md')return historyWithoutT47(input);
  if(path==='missions/m01-tczew/MAP.md')return mapWithoutT47(input);
  assert.fail('no approved T47 hunks for '+path);
}
