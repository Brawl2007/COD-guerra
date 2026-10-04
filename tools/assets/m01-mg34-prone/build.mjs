// Gera os clips deitados da dupla da MG 34 (atirador e municiador) para o rig actual dos soldados alemães:
// m01_mg34_prone_animations.glb (esqueleto + nós móveis da MG 34 + 9 clips) e manifest.json. Não gera malhas: reutiliza
// a MG 34 (assets/models/provisional/m01/weapons/mg34) e os soldados (…/characters) sem os alterar, e regista os hashes.
// Uso: node build.mjs [--out dir]. Precisa de `npm ci` aqui e em ../m01-soldiers, e de `npm run fetch` em
// ../m01-soldiers (malha base do MakeHuman, para o rig).
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { v3 } from '../m01-soldiers/src/meshops.mjs';
import { buildNation } from '../m01-soldiers/src/assemble.mjs';
import { writeCharacter } from '../m01-soldiers/src/glb.mjs';
import { GAME_BONES } from '../m01-soldiers/src/human.mjs';
import { rigInfo, weaponPoint } from '../m01-soldiers/src/pose.mjs';
import { hasMakeHuman } from '../m01-soldiers/src/mh.mjs';
import { MG34, PIVOTS, sockets } from '../m01-mg34/src/mg34.mjs';
import { MG34_GRIP } from '../m01-mg34/src/clips.mjs';
import { buildMg34ProneClips, LOADER_OFFSET, ENTER, RELOAD, FOLD_SWING, SHOT, loaderIdle } from './src/clips.mjs';
import { gunnerAim, BUTT_L, GB, PRONE_FEET } from './src/prone.mjs';
import { skinSet, lowest } from './src/skin.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01/weapons/mg34-prone'));
if (!hasMakeHuman()) {
  console.error('Sem malha base do MakeHuman: correr `npm ci && npm run fetch` em ../m01-soldiers antes de gerar os clips. Nada foi escrito.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// Ficheiros reutilizados (não são escritos por este gerador): hash para provar que ficaram iguais.
const REUSED = [
  'assets/models/provisional/m01/weapons/mg34/m01_mg34_lod0.glb', 'assets/models/provisional/m01/weapons/mg34/m01_mg34_lod1.glb',
  'assets/models/provisional/m01/weapons/mg34/m01_mg34_lod2.glb', 'assets/models/provisional/m01/weapons/mg34/m01_mg34_animations.glb',
  'assets/models/provisional/m01/characters/m01_soldier_de_lod0.glb', 'assets/models/provisional/m01/characters/m01_soldier_de_lod1.glb',
  'assets/models/provisional/m01/characters/m01_soldier_de_lod2.glb', 'assets/models/provisional/m01/characters/m01_soldier_animations.glb',
];
const sha = p => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');
const reused = Object.fromEntries(REUSED.map(p => [p, { sha256: sha(p), bytes: statSync(join(ROOT, p)).size }]));

const nation = buildNation('de', { heads: [] }), J = { ...nation.J }, R = rigInfo(J), clips = buildMg34ProneClips(R);
const MOVING = ['mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt', 'mg34_bipod_folded', 'mg34_bipod_open'];
for (const n of MOVING) J[n] = v3.add(J.weapon, PIVOTS[n]);
const file = 'm01_mg34_prone_animations.glb';
const r = await writeCharacter(join(OUT, file), { name: 'm01_mg34_prone_animations', bones: [...GAME_BONES, ...MOVING.map(name => ({ name, parent: 'weapon' }))], joints: J, materials: {}, meshes: [], animations: clips,
  extras: { note: 'Só esqueleto, nós móveis da MG 34 e clips deitados; ligar por nome aos GLB m01_soldier_de_* (atirador com a cena m01_mg34_lod* presa ao osso weapon; municiador sem arma)', loader_root_offset_m: LOADER_OFFSET } });

// Contactos da pose de pontaria deitada (centros das articulações, m; y = altura ao chão).
const A = gunnerAim(R), W = A.W, w = A.w, r3 = p => p.map(x => +x.toFixed(3)), Wl = loaderIdle(R).W;
const at = (WW, b, off = [0, 0, 0]) => r3(v3.add(WW[b].p, off));
// Pele (LBS dos vértices do corpo e do equipamento, como no GLB): ponto mais baixo de cada zona de apoio, por raio à volta
// da articulação na pose de ligação. y < 0 = a malha entra no chão (folga aceite até ~1,5 cm: tecido e solas).
const skin = skinSet(nation, ['body', 'gear'], 1);
const zone = (b, r) => skin.map(g => { const k = g.P.map((p, i) => (v3.dist(p, J[b]) < r ? i : -1)).filter(i => i >= 0); return { ...g, P: k.map(i => g.P[i]), B: k.map(i => g.B[i]), Wt: k.map(i => g.Wt[i]) }; });
const ZONES = { kneecap_l: ['calf_l', 0.09], kneecap_r: ['calf_r', 0.09], elbow_l: ['lowerarm_l', 0.09], elbow_r: ['lowerarm_r', 0.09], thigh_l: ['thigh_l', 0.25], thigh_r: ['thigh_r', 0.25], pelvis: ['hips', 0.18], chest: ['spine_03', 0.2], boot_l: ['ball_l', 0.08], boot_r: ['ball_r', 0.08] };
const Z = Object.fromEntries(Object.entries(ZONES).map(([k, [b, rr]]) => [k, zone(b, rr)]));
const skinY = WW => Object.fromEntries(Object.entries(Z).map(([k, set]) => [k, +Math.min(...Object.values(lowest(set, WW)).map(x => x[0])).toFixed(3)]));
const contacts = {
  note: 'gunner/loader: centros das articulações do rig (m); skin_lowest_y_m: vértice mais baixo da malha em cada zona de apoio (LBS, como no GLB). Pele medida por clip em docs/assets/m01-mg34-prone/import-report.json',
  skin_lowest_y_m: { gunner_aim: skinY(W), loader_idle: skinY(Wl) },
  gunner: {
    bipod_feet: r3(weaponPoint(w, sockets().bipod_feet)), weapon_pitch_deg: +w.pitch.toFixed(2), butt: r3(weaponPoint(w, sockets().butt)), shoulder_r: at(W, 'upperarm_r'),
    cheek_socket: r3(weaponPoint(w, sockets().cheek)), eye_r: at(W, 'eye_r'), elbow_l: at(W, 'lowerarm_l'), elbow_r: at(W, 'lowerarm_r'),
    knee_l: at(W, 'calf_l'), knee_r: at(W, 'calf_r'), toes_l: at(W, 'ball_l'), toes_r: at(W, 'ball_r'), hips: at(W, 'hips'), chest: at(W, 'spine_03'),
    hand_r_on: 'punho (MG34_GRIP.r do kit)', hand_l_on: 'por baixo da coronha (BUTT_L)',
  },
  loader: { root_offset_m: LOADER_OFFSET, elbow_l: at(Wl, 'lowerarm_l', LOADER_OFFSET), elbow_r: at(Wl, 'lowerarm_r', LOADER_OFFSET), knee_l: at(Wl, 'calf_l', LOADER_OFFSET), knee_r: at(Wl, 'calf_r', LOADER_OFFSET), hips: at(Wl, 'hips', LOADER_OFFSET) },
};

const manifest = {
  asset: 'MG 34 deitada — atirador e municiador alemães de M01 Tczew (grp_de_east, Panzerzug 7)',
  status: 'PROPOSTA VISUAL PROVISÓRIA (M01 continua PROTÓTIPO JOGÁVEL; o motor não tem `pose: prone`; sem playtest nem medição de FPS)',
  generator: 'tools/assets/m01-mg34-prone (node build.mjs)',
  author: 'Claude Code (clips gerados por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem conteúdo de terceiros nem de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'three.js 0.186.1 (MIT, capturas e teste do mixer)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; frente/cano para −Z; raiz do atirador na origem; tempo em segundos',
  scale: { unit_m: 1, rig: 'm01_soldier_de_* (mesmos 60 ossos + 6 nós móveis da MG 34 filhos de weapon)', weapon: 'm01_mg34_lod* tal como está (1,219 m)' },
  reuse: {
    weapon: 'kit MG 34 (PR #30): malhas, LODs, pivôs e sockets sem alterações; os clips animam os nós pelo nome',
    rig: 'soldado alemão actual (m01_soldier_de_*): só se lêem as articulações para o esqueleto',
    standing_clips: 'mg34_aim, mg34_fire_burst e mg34_reload continuam em m01_mg34_animations.glb, sem alterações; os clips novos têm nomes mg34_prone_* e mg34_loader_prone_*',
    reused_files: reused,
  },
  pair: {
    gunner: { root: [0, 0, 0], weapon: 'MG 34 presa ao osso weapon (transformação nula), presa ANTES de criar as acções do mixer', hide: ['rifle (Kar98k)', 'clip (weapon_clip escala 0)', 'mg34_bipod_folded (escala 0 nos clips deitados)'] },
    loader: { root_offset_m: LOADER_OFFSET, rotation: 'a mesma da raiz do atirador', weapon: 'nenhuma: osso weapon e weapon_clip com escala 0 (Kar98k escondida)', hide: ['rifle', 'clip'] },
    sync: 'mg34_prone_reload e mg34_loader_prone_feed começam no mesmo instante e duram o mesmo; o tambor novo é o nó mg34_drum da arma do atirador e acompanha a mão do municiador entre drum_from_assistant e drum_handoff',
  },
  posture: {
    pose: 'deitado de bruços sobre o bípode (prone); corpo apoiado na anca, peito e antebraços; cotovelos e joelhos no chão; pés estendidos com os dedos no chão',
    hands: { right: MG34_GRIP.r, left: BUTT_L, note: 'direita no punho (perfil do kit); esquerda por baixo da coronha, a puxá-la ao ombro' },
    face: 'face na coronha (socket cheek) com o olho direito na linha de mira; o cano fica livre à frente do bípode',
    body_params: GB, feet: PRONE_FEET,
    contacts,
  },
  bipod: {
    nodes: { folded: 'mg34_bipod_folded', open: 'mg34_bipod_open' },
    runtime: 'o GLB da arma marca mg34_bipod_open com visible=false; ao entrar em prone o runtime põe mg34_bipod_open.visible = true e deixa os clips decidirem pela escala (STEP 0/1); depois de mg34_prone_exit volta a false',
    enter: `o bípode dobrado roda ${FOLD_SWING}° em X à volta do suporte (${ENTER.swing[0]}–${ENTER.swing[1]} s, a mão esquerda acompanha as pernas) e troca-se pelo aberto em ${ENTER.swing[1]} s; as patas tocam no chão em ${ENTER.land} s`,
    feet_on_ground: 'nos clips deitados as patas (socket bipod_feet) ficam em y≈0; o balanço de pontaria roda a arma à volta delas',
  },
  sockets: sockets(),
  nodes: MOVING.map(n => ({ node: n, parent: 'weapon', pivot: PIVOTS[n] })),
  fire: { rate_rpm: MG34.rate_rpm, shot_interval_s: SHOT, rounds: 7, note: 'eventos de tiro só para apresentação (som, clarão, cápsulas); a simulação decide tiros, dano e munição' },
  reload: { events: RELOAD.events, duration_s: RELOAD.dur },
  sources: {
    note: 'Sem fontes novas: medidas e mecanismo da MG 34 vêm do kit (T33, docs/assets/m01-mg34/README.md). A postura deitada, os tempos, as distâncias da dupla e a passagem do tambor são ESTIMATIVAS de apresentação a afinar em playtest.',
    estimates: ['posição do municiador (LOADER_OFFSET)', 'tempos da entrada, saída e recarga', 'subida da boca e salto do bípode na rajada', 'balanço de pontaria', 'porta-tambores do municiador (não modelado)'],
  },
  files: {
    [file]: { bytes: r.bytes, clips: clips.map(c => ({ name: c.name, role: c.extras.role, duration: +Math.max(...c.tracks.map(t => t.times.at(-1))).toFixed(3), loop: c.extras.loop, events: c.extras.events ?? null,
      ...(c.extras.interrupt ? { fire_window_s: c.extras.fire_window_s, interrupt: c.extras.interrupt } : {}),
      contacts: { lowest_joint: c.stats.min_joint[0], lowest_joint_y: +c.stats.min_joint[1].toFixed(3), weapon_lowest_y: c.stats.weapon_min_y === null ? null : +c.stats.weapon_min_y.toFixed(3) } })) },
  },
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(file, (r.bytes / 1e3).toFixed(0), 'kB;', clips.map(c => `${c.name} (${c.stats.min_joint[0]} ${c.stats.min_joint[1].toFixed(3)})`).join(', '));
