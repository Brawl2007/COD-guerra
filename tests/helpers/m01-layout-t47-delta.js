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

/** Today's layout bytes with the T47 hunks reverted: the layout of the base commit and of the bridge kit. */
export function layoutWithoutT47(input){
  let text=Buffer.isBuffer(input)?input.toString('utf8'):input;
  for(const [now,before] of T47_LAYOUT_DELTA){
    assert.equal(text.split(now).length,2,'approved T47 layout hunk occurs exactly once');
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

/** The base-comparable bytes of a mission file that T47 changed by named hunks only (map-layout.json, HISTORICAL_RESEARCH.md). */
export function withoutT47(path,input){
  if(path==='missions/m01-tczew/map-layout.json')return layoutWithoutT47(input);
  if(path==='missions/m01-tczew/HISTORICAL_RESEARCH.md')return historyWithoutT47(input);
  assert.fail('no approved T47 hunks for '+path);
}
