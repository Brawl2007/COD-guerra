// Clips originais (procedurais, amostrados a 30 fps) para o esqueleto de jogo. Nomes alinhados com as poses de
// src/render/m01-actor-pose.js (standing, crouched, seated, wounded, fallen, carried). Tempos do ferrolho e da
// recarga por clipe: research/weapons/kb_wz29.md §5 (valores de GAMEPLAY). Locomoção no lugar: o jogo desloca a
// raiz à velocidade `extras.speed_mps`.
import { GAME_BONES } from './human.mjs';
import { q, solve, rigInfo, weaponPoint, weaponDir } from './pose.mjs';
import { v3, smoothstep, clamp } from './meshops.mjs';
import { RIFLES, RKM } from './weapon.mjs';

const FPS = 30;
const seg = (t, a, b) => smoothstep(a, b, t);
const lin = (t, a, b) => clamp((t - a) / (b - a));
const mix = (a, b, t) => Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * t) : a + (b - a) * t;
const N = v3.norm;
const deg = Math.PI / 180;

// Mãos na arma (referencial da arma): pulso, direcção dos dedos e normal da palma.
const GRIP_R = { pos: [0.044, 0.02, 0.088], fdir: N([-0.3, -0.55, -0.78]), palm: N([-1, 0, 0.12]) };
const GRIP_L = { pos: [-0.03, -0.034, -0.29], fdir: N([0.55, 0.12, -0.83]), palm: N([-0.25, 1, 0.05]) };
const FORE_Z = -0.33;
// Perfis de pega: mãos e ponto do olho na linha de mira (referencial da arma). Espingardas e rkm wz.28 (punho de
// pistola, fuste à volta do tubo de gases, alça em quadro sobre a caixa).
const RIFLE_P = { r: GRIP_R, l: GRIP_L, eye: [0, 0.064, 0.19] };
const RKM_P = {
  r: { pos: [0.034, -0.032, 0.1], fdir: N([-0.3, -0.62, -0.72]), palm: N([-1, 0.05, 0.15]) },
  l: { pos: [-0.03, -0.05, -0.37], fdir: GRIP_L.fdir, palm: GRIP_L.palm },
  eye: [0, 0.088, 0.205],
};
// Deitado com bípode: mão esquerda por baixo da coronha, a puxá-la ao ombro.
const RKM_BUTT_L = { pos: [-0.045, -0.1, 0.235], fdir: N([0.85, 0.35, 0.1]), palm: N([0.25, 1, 0]) };

/** Referencial da arma a partir do ponto do punho, de um ponto do guarda-mão (direcção) e de um "cima". */
function rifleFrame(grip, fore, up = [0, 1, 0]) {
  const F = N(v3.sub(fore, grip));
  return { pos: v3.sub(grip, v3.mul(F, 0)), rot: q.frame([0, 0, -1], [0, 1, 0], F, up) };
}
const rifleAt = (pos, F, up = [0, 1, 0]) => ({ pos, rot: q.frame([0, 0, -1], [0, 1, 0], N(F), up) });
const handOn = (w, g) => ({ pos: weaponPoint(w, g.pos), fdir: weaponDir(w, g.fdir), palm: weaponDir(w, g.palm) });

/** Pés no chão: tornozelo em (x, z), rotação yaw (graus) e pitch opcional; pólo do joelho para a frente do pé. */
function foot(x, z, { yaw = 0, y = 0.072, pitch = 0, toe = 0, out = 0.25 } = {}) {
  const rot = q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], -pitch));
  const fwd = q.rot(rot, [0, 0, -1]);
  return { pos: [x, y, z], rot, pole: N(v3.add(fwd, [Math.sign(x) * out, 0, 0])), toe };
}

/** Rifle às costas (bandoleira): referencial relativo ao tronco (spine_03) avaliado com uma FK prévia. */
function slung(R, base) {
  const W = solve(R, base).W.spine_03;
  const pos = v3.add(W.p, q.rot(W.r, [0.05, -0.12, 0.17]));
  const F = q.rot(W.r, N([-0.45, 0.88, 0.1])), up = q.rot(W.r, [0, 0, 1]);
  return rifleAt(pos, F, up);
}

/** Resolve em duas fases: corpo (para conhecer olho/ombros), depois arma e mãos. */
function compose(R, body, extra) {
  const pre = solve(R, body);
  return solve(R, { ...body, ...extra(pre.W) });
}

// ——— Posturas de base ———
const STAND = { hips: { pos: [0, 0.905, 0.062], rot: {} }, feet: { l: foot(-0.12, 0.0, { yaw: 8 }), r: foot(0.12, 0.02, { yaw: -10 }) } };
const lowReady = (R, W, k = 0) => {
  // Rifle diagonal em frente ao corpo, cano para baixo e para a esquerda.
  const grip = v3.add(W.spine_01.p, q.rot(W.spine_01.r, [0.13, 0.1 + k * 0.01, -0.13]));
  const fore = v3.add(grip, q.rot(W.spine_01.r, N([-0.6, -0.25, -0.76])));
  return rifleFrame(grip, fore, q.rot(W.spine_01.r, N([0.25, 1, 0])));
};
const portArms = (R, W) => {
  // Rifle atravessado no peito (marcha/corrida): punho à anca direita, cano junto ao ombro esquerdo.
  const grip = v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.11, -0.08, -0.17]));
  const fore = v3.add(grip, q.rot(W.spine_02.r, N([-0.55, 0.62, -0.38])));
  return rifleFrame(grip, fore, q.rot(W.spine_02.r, N([0.3, 0.3, -1])));
};
const fingersRifle = { l: { curl: 0.62, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } };
const holdRifle = (w, P = RIFLE_P) => ({ weapon: w, hands: { r: { ...handOn(w, P.r), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, P.l), pole: [-0.35, -1, 0.1] } }, fingers: fingersRifle });

/** Pose de pontaria de pé (tronco de lado, face encostada à coronha). sway: oscilação [x, y] em graus. */
function aimPose(R, { sway = [0, 0], kick = 0, crouch = 0, P = RIFLE_P } = {}) {
  const body = {
    hips: { pos: [0.01, 0.89 - crouch, 0.07], rot: { yaw: -32, pitch: 3 } },
    spine: [{ pitch: 3, yaw: -4 }, { pitch: 3, yaw: -4, roll: -2 }, { pitch: 2, yaw: -3, roll: -3 }],
    neck: { yaw: 22, pitch: 10, roll: -6 }, head: { yaw: 18, pitch: 6, roll: -14 },
    clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
    feet: { l: foot(-0.1, -0.16, { yaw: -10 }), r: foot(0.17, 0.2, { yaw: -60 }) },
  };
  return compose(R, body, W => {
    const eye = W.eye_r.p;
    const F = N([Math.sin(sway[0] * deg), Math.sin((sway[1] + kick * 5) * deg), -1]);
    const w0 = rifleAt([0, 0, 0], F, N([0.06, 1, 0]));
    // O olho fica sobre a linha de mira (wz.29: 0,48 m atrás da alça); recuo empurra a arma para trás.
    const w = { pos: v3.sub(v3.add(eye, [0, 0, kick * 0.03]), q.rot(w0.rot, P.eye)), rot: w0.rot };
    return holdRifle(w, P);
  });
}

// ——— Clips ———
function sample(R, name, duration, fn, extras = {}) {
  const frames = Math.max(2, Math.round(duration * FPS) + 1), times = [], poses = [];
  for (let i = 0; i < frames; i++) { const t = Math.min(duration, i / FPS); times.push(t); poses.push(fn(t, t / duration)); }
  const tracks = [];
  const anim = new Set(['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_clip', 'weapon_mag']);
  for (const b of GAME_BONES) {
    const rots = poses.map(p => p.local[b.name] ?? q.id());
    // Continuidade do sinal dos quaterniões (evita voltas na interpolação).
    for (let i = 1; i < rots.length; i++) { const a = rots[i - 1], c = rots[i]; if (a[0] * c[0] + a[1] * c[1] + a[2] * c[2] + a[3] * c[3] < 0) rots[i] = c.map(x => -x); }
    if (rots.some(r => Math.abs(r[3]) < 0.99999) || b.name === 'weapon') tracks.push({ bone: b.name, path: 'rotation', times, values: rots.flat() });
    if (anim.has(b.name)) {
      const ts = poses.map(p => p.trans[b.name] ?? null);
      if (ts.every(Boolean)) tracks.push({ bone: b.name, path: 'translation', times, values: ts.flat() });
    }
  }
  // Escalas em degrau: clipe/pano (só visível na recarga ou na limpeza), arma (escondida no ferido transportado) e
  // carregador da rkm (escondido entre a queda do vazio e a saída do novo da bolsa).
  for (const b of ['weapon_clip', 'weapon', 'weapon_mag']) {
    const sc = poses.map(p => p.scale[b] ?? (b === 'weapon_clip' ? 0 : 1));
    tracks.push({ bone: b, path: 'scale', times, values: sc.flatMap(s => [s, s, s]), interpolation: 'STEP' });
  }
  // Faixas constantes ficam com duas chaves (início e fim).
  for (const tr of tracks) {
    const n = tr.path === 'rotation' ? 4 : 3, v = tr.values;
    if (v.every((x, i) => Math.abs(x - v[i % n]) < 1e-6)) { tr.times = [0, duration]; tr.values = [...v.slice(0, n), ...v.slice(0, n)]; }
  }
  return { name, tracks, extras: { fps: FPS, ...extras } };
}

/** Constrói todos os clips para o esqueleto de N (buildNation). */
export function buildClips(Nat) {
  const R = rigInfo(Nat.J), J = Nat.J;
  const rifle = RIFLES[Nat.rifle.info === RIFLES.kar98k ? 'kar98k' : 'wz29'];
  const clips = [];

  // standing_idle: rifle em baixo pronto, respiração e transferência de peso (4 s, ciclo).
  clips.push(sample(R, 'standing_idle', 4, (t, u) => {
    const b = Math.sin(u * Math.PI * 2), sh = Math.sin(u * Math.PI * 2 * 0.5);
    const body = { ...STAND, hips: { pos: [0.012 * sh, 0.905 + 0.004 * b, 0.062], rot: { roll: -1.5 * sh, yaw: 2 * sh } },
      spine: [{ pitch: 1 + b }, { pitch: 1.5 * b }, { pitch: 1 + b }], neck: { pitch: 2, yaw: -3 * sh }, head: { pitch: 2, yaw: 4 * sh } };
    return compose(R, body, W => holdRifle(lowReady(R, W, b)));
  }, { loop: true, pose: 'standing' }));

  // aim: pontaria de pé com oscilação lenta (2 s, ciclo).
  clips.push(sample(R, 'aim', 2, (t, u) => aimPose(R, { sway: [0.4 * Math.sin(u * Math.PI * 2), 0.3 * Math.sin(u * Math.PI * 4)] }), { loop: true, pose: 'standing' }));

  // fire_bolt: disparo (recuo) e ciclo completo do ferrolho, sempre em pontaria (1,17 s).
  // Fases (s): recuo 0–0,12 · mão ao ferrolho 0,12–0,25 · levantar 0,25–0,43 · recuar 0,43–0,70 (ejecta) ·
  // avançar 0,70–1,00 · baixar 1,00–1,08 · mão ao punho 1,08–1,17.
  clips.push(sample(R, 'fire_bolt', 1.17, t => {
    const kick = t < 0.12 ? Math.sin(t / 0.12 * Math.PI) : 0;
    const lift = seg(t, 0.25, 0.43) - seg(t, 1.0, 1.08), back = seg(t, 0.43, 0.7) - seg(t, 0.7, 1.0);
    const toBolt = seg(t, 0.12, 0.25) - seg(t, 1.08, 1.17);
    const P = aimPose(R, { kick: kick * 0.8 });
    return boltCycle(R, P, rifle, { lift, back, toBolt, kick });
  }, { loop: false, pose: 'standing', events: { fire: 0, eject: 0.6, chambered: 1.0 } }));

  // reload_clip: recarga por clipe com o carregador vazio (3,4 s) — kb_wz29.md §5.
  clips.push(sample(R, 'reload_clip', 3.4, t => reloadPose(R, J, rifle, t), { loop: false, pose: 'standing',
    events: { bolt_open: 0.45, clip_in_guide: 1.0, rounds_stripped: 2.1, bolt_closed: 2.7, clip_ejected: 2.45 } }));

  // walk / run: locomoção no lugar com a arma atravessada no peito.
  clips.push(locomotion(R, 'walk', { T: 1.0, stance: 0.6, stride: 0.66, lift: 0.1, hipY: 0.885, lean: 4, bob: 0.018, speed: 0.66 / 0.6 }));
  clips.push(locomotion(R, 'run', { T: 0.68, stance: 0.38, stride: 0.84, lift: 0.22, hipY: 0.855, lean: 13, bob: 0.03, speed: 0.84 / (0.38 * 0.68) }));

  // crouched_idle: de joelho direito no chão, arma em baixo pronta (3 s, ciclo).
  clips.push(sample(R, 'crouched_idle', 3, (t, u) => {
    const b = Math.sin(u * Math.PI * 2);
    return compose(R, kneel(b), W => holdRifle(lowReady(R, W, b)));
  }, { loop: true, pose: 'crouched' }));

  // pinned: encolhido atrás de abrigo, cabeça baixa, arma apertada ao peito, sobressaltos (2,4 s, ciclo).
  clips.push(sample(R, 'pinned', 2.4, (t, u) => {
    const flinch = Math.max(0, Math.sin(u * Math.PI * 2 * 3)) ** 8 * (u > 0.3 && u < 0.7 ? 1 : 0.4), b = Math.sin(u * Math.PI * 4);
    const body = { hips: { pos: [0.0, 0.47 - 0.02 * flinch, 0.16], rot: { pitch: 30 + 4 * flinch } },
      spine: [{ pitch: 14 + 3 * flinch }, { pitch: 14 + 4 * flinch + b }, { pitch: 10 + 3 * flinch }], neck: { pitch: 18 + 8 * flinch }, head: { pitch: 14 + 6 * flinch, yaw: 6 * b },
      clav: { l: { pitch: 8, yaw: -8 }, r: { pitch: 8, yaw: 8 } },
      feet: { l: foot(-0.15, -0.12, { yaw: 10 }), r: foot(0.15, 0.06, { yaw: -12, y: 0.09, pitch: 25, toe: 25 }) } };
    return compose(R, body, W => {
      const grip = v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.07, -0.13, -0.2]));
      const fore = v3.add(grip, q.rot(W.spine_02.r, N([-0.3, 0.9, -0.25])));
      return holdRifle(rifleFrame(grip, fore, q.rot(W.spine_02.r, [0, 0, -1])));
    });
  }, { loop: true, pose: 'crouched', note: 'sob fogo, atrás de abrigo' }));

  // sapper_work / sapper_work_pinned: de joelhos a emendar o cabo, arma às costas.
  for (const pinned of [false, true]) clips.push(sample(R, pinned ? 'sapper_work_pinned' : 'sapper_work', pinned ? 2 : 3, (t, u) => {
    const ph = u * Math.PI * 2 * (pinned ? 3 : 2), pull = Math.sin(ph), twist = Math.sin(ph * 2);
    const body = kneel(0, { low: pinned ? 0.1 : 0, bend: pinned ? 34 : 22 });
    body.neck = { pitch: pinned ? 30 : 22, yaw: pinned ? 0 : 6 * Math.sin(u * Math.PI * 2) }; body.head = { pitch: pinned ? 22 : 15 };
    if (pinned) body.clav = { l: { pitch: 10, roll: -6 }, r: { pitch: 10, roll: 6 } };
    return compose(R, body, W => {
      const base = v3.add([W.hips.p[0], 0, W.hips.p[2]], [0, pinned ? 0.16 : 0.2, -0.4]);
      const hl = v3.add(base, [-0.07 + 0.03 * pull, 0.02 * twist, 0]), hr = v3.add(base, [0.07 + 0.03 * pull, -0.02 * twist, 0.01]);
      return {
        weapon: slung(R, body),
        hands: { l: { pos: v3.add(hl, [-0.02, 0.06, 0.06]), fdir: N([0.6, -0.5, -0.6]), palm: N([0.5, -0.4, 0.2]), pole: [-0.6, -0.5, 0.4] },
          r: { pos: v3.add(hr, [0.02, 0.06, 0.06]), fdir: N([-0.6, -0.5, -0.6]), palm: N([-0.5, -0.4, 0.2]), pole: [0.6, -0.5, 0.4] } },
        fingers: { l: { curl: 0.55 + 0.2 * twist, thumb: 0.6 }, r: { curl: 0.55 - 0.2 * twist, thumb: 0.6 } },
      };
    });
  }, { loop: true, pose: 'crouched', note: pinned ? 'sapador sob fogo: mais baixo, cabeça encolhida, movimentos rápidos' : 'sapador a reparar o cabo de ignição' }));

  // carry_wounded: marcha lenta com Bąk ao ombro direito (o ferido liga a raiz ao osso carry_socket).
  clips.push(locomotion(R, 'carry_wounded', { T: 1.25, stance: 0.62, stride: 0.5, lift: 0.07, hipY: 0.87, lean: 12, bob: 0.012, speed: 0.5 / (0.62 * 1.25), carry: true }));

  // carried: pose do ferido ao ombro (relativa à raiz, que o jogo prende ao carry_socket do transportador).
  clips.push(sample(R, 'carried', 2.5, (t, u) => {
    const sw = Math.sin(u * Math.PI * 2);
    const hipsQ = q.mul(q.axis([1, 0, 0], 128 + 3 * sw), q.axis([0, 1, 0], 180));
    const body = { hips: { pos: v3.add(J.root, [0.0, 0.02, 0.0]), q: hipsQ },
      spine: [{ pitch: 12 }, { pitch: 10 }, { pitch: 8 }], neck: { pitch: 25 }, head: { pitch: 25 + 4 * sw, yaw: 10 },
      local: legsFolded(), clav: { l: { pitch: 10 }, r: { pitch: 10 } } };
    const pre = solve(R, body);
    // Braços pendurados (gravidade no mundo) ao longo das costas do transportador.
    const hang = s => ({ pos: v3.add(pre.W[`upperarm_${s}`].p, [0.03 * (s === 'l' ? -1 : 1) + 0.02 * sw, -0.47, 0.04]), fdir: [0, -1, 0], palm: [s === 'l' ? 1 : -1, 0, 0], pole: [0, 0, -1] });
    return solve(R, { ...body, hands: { l: hang('l'), r: hang('r') }, fingers: { l: { curl: 0.3, thumb: 0.2 }, r: { curl: 0.3, thumb: 0.2 } },
      weapon: slung(R, body), weaponScale: 0 });
  }, { loop: true, pose: 'carried', attach: 'carry_socket', note: 'prender a raiz deste actor ao osso carry_socket do transportador' }));

  // wounded: deitado de costas, a apertar a coxa direita (Bąk, 06:04), respiração ofegante (2 s, ciclo).
  clips.push(sample(R, 'wounded', 2, (t, u) => lyingPose(R, J, Math.sin(u * Math.PI * 4), { wounded: true }), { loop: true, pose: 'wounded' }));

  // fallen: queda (morte) de pé → deitado, termina imóvel (1,4 s, sem ciclo). Joelhos cedem, depois tomba.
  const crumple = k => {
    const body = { ...STAND, hips: { pos: [0, 0.905 - 0.3 * k, 0.062 + 0.06 * k], rot: { pitch: 10 * k, roll: 6 * k } },
      spine: [{ pitch: 10 * k }, { pitch: 8 * k }, { pitch: 5 * k }], neck: { pitch: 12 * k }, head: { pitch: 18 * k, yaw: 10 * k },
      feet: { l: foot(-0.12, 0.0 + 0.05 * k, { yaw: 8 }), r: foot(0.12, 0.02 - 0.1 * k, { yaw: -10, pitch: 20 * k, y: 0.072 + 0.03 * k, toe: 20 * k }) } };
    return compose(R, body, W => holdRifle(lowReady(R, W, 0)));
  };
  const down = lyingPose(R, J, 0, { limp: true }), mid = crumple(1);
  clips.push(sample(R, 'fallen', 1.4, t => {
    const k = seg(t, 0, 0.5), f = seg(t, 0.45, 1.2);
    return f <= 0 ? crumple(k) : blendPoses(R, mid, down, f);
  }, { loop: false, pose: 'fallen' }));

  // seated: sentado no chão do abrigo (chamada das 07:05), joelhos levantados, arma entre os joelhos (4 s, ciclo).
  clips.push(sample(R, 'seated', 4, (t, u) => {
    const b = Math.sin(u * Math.PI * 2);
    const body = { hips: { pos: [0, 0.13, 0.2], rot: { pitch: -8 } }, spine: [{ pitch: 12 + b }, { pitch: 10 }, { pitch: 6 + b * 0.5 }],
      neck: { pitch: 8 }, head: { pitch: 4, yaw: 3 * Math.sin(u * Math.PI * 2 * 0.5) },
      feet: { l: foot(-0.13, -0.32, { yaw: 12 }), r: foot(0.14, -0.3, { yaw: -12 }) } };
    return compose(R, body, W => {
      // Arma de pé entre os joelhos (coronha no chão), abraçada pelas duas mãos.
      const butt = [0.0, 0.0, -0.18];
      const w = rifleAt(v3.add(butt, [0, 0.33, 0]), N([0, 1, 0.12]), [0, 0, 1]);
      const grip = weaponPoint(w, [0, 0, -0.12]);
      return {
        weapon: { pos: v3.add(butt, q.rot(w.rot, [0, 0.045, -0.335])), rot: w.rot },
        hands: { r: { pos: v3.add(grip, [0.07, -0.05, 0.05]), fdir: N([-0.7, 0, -0.7]), palm: N([-0.5, 0, 0.7]), pole: [0.8, -0.3, 0.2] },
          l: { pos: v3.add(grip, [-0.07, -0.02, 0.05]), fdir: N([0.7, 0, -0.7]), palm: N([0.5, 0, 0.7]), pole: [-0.8, -0.3, 0.2] } },
        fingers: { l: { curl: 0.7, thumb: 0.5 }, r: { curl: 0.7, thumb: 0.5 } },
      };
    });
  }, { loop: true, pose: 'seated' }));

  clips.push(...rkmClips(R, J, { kneel }));
  // Clipe escondido (escala 0) em todos os clips excepto na recarga — garantido pela faixa de escala.
  return clips;

  /** Postura de joelho direito no chão. */
  function kneel(b, { low = 0, bend = 10 } = {}) {
    return {
      hips: { pos: [0.02, 0.5 - low + 0.004 * b, 0.12], rot: { pitch: 6 + bend * 0.3, yaw: -6 } },
      spine: [{ pitch: bend * 0.4 + b }, { pitch: bend * 0.35 }, { pitch: bend * 0.25 + b * 0.5 }], neck: { pitch: 4 }, head: { pitch: 2 },
      feet: { l: foot(-0.14, -0.26, { yaw: 6 }), r: foot(0.14, 0.5, { yaw: -8, y: 0.11, pitch: 40, toe: 45 }) },
    };
  }
  /** Pernas dobradas do ferido ao ombro (rotações locais). */
  function legsFolded() {
    // (O yaw de 180° da anca inverte o eixo X local: +X dobra a coxa para baixo, −X dobra o joelho para a frente.)
    return { thigh_l: q.axis([1, 0, 0], 112), thigh_r: q.axis([1, 0, 0], 118), calf_l: q.axis([1, 0, 0], -28), calf_r: q.axis([1, 0, 0], -18),
      foot_l: q.axis([1, 0, 0], -25), foot_r: q.axis([1, 0, 0], -25) };
  }
}

/** Mistura de duas poses resolvidas (rotações locais por slerp, translações por lerp). */
function blendPoses(R, A, B, t) {
  const local = {}, trans = {};
  for (const b of GAME_BONES.map(x => x.name)) {
    local[b] = q.slerp(A.local[b] ?? q.id(), B.local[b] ?? q.id(), t);
    const ta = A.trans[b], tb = B.trans[b];
    if (ta || tb) trans[b] = mix(ta ?? v3.sub(R.J[b], R.J[GAME_BONES.find(x => x.name === b).parent] ?? [0, 0, 0]), tb ?? v3.sub(R.J[b], R.J[GAME_BONES.find(x => x.name === b).parent] ?? [0, 0, 0]), t);
  }
  return { local, trans, scale: { weapon_clip: 0, weapon: 1, weapon_mag: 1 } };
}

/** Deitado de costas (cabeça para +Z). blend: 0 = de pé (não usado aqui), 1 = deitado. */
function lyingPose(R, J, b, { wounded = false, limp = false, blend = 1 } = {}) {
  const lay = q.axis([1, 0, 0], 90 * blend);
  const body = {
    hips: { pos: [0, mix(0.6, 0.11, blend), mix(0.15, 0.1, blend)], q: q.mul(lay, q.euler({ roll: limp ? 8 : 0 })) },
    spine: [{ pitch: wounded ? -6 + b : 0 }, { pitch: wounded ? -8 : 0, roll: limp ? 4 : 0 }, { pitch: wounded ? -10 + b : 0 }],
    neck: { pitch: wounded ? 18 : 0, yaw: limp ? 25 : 0 }, head: { pitch: wounded ? 12 : 0, yaw: limp ? 20 : 4 * b },
    jaw: limp ? 6 : 3 + 3 * Math.max(0, b),
  };
  const pre = solve(R, body), W = pre.W;
  const groundY = 0.075;
  const feet = wounded
    ? { l: { pos: [-0.16, groundY, -0.42], rot: q.id(), pole: [0, 1, -0.4] }, r: { pos: [0.18, 0.1, -0.75], rot: q.mul(q.axis([1, 0, 0], 70), q.axis([0, 1, 0], -20)), pole: [0.4, 1, 0] } }
    : { l: { pos: [-0.22, groundY, -0.78], rot: q.mul(q.axis([1, 0, 0], 90), q.axis([0, 1, 0], 25)), pole: [-0.4, 1, 0] }, r: { pos: [0.14, groundY, -0.8], rot: q.mul(q.axis([1, 0, 0], 85), q.axis([0, 1, 0], -30)), pole: [0.4, 1, 0] } };
  const thigh = v3.add(W.thigh_r.p, [0.02, 0.08, -0.22]);
  const hands = wounded
    ? { r: { pos: v3.add(thigh, [0.06, 0.06, 0.05]), fdir: N([-0.3, -0.6, -0.6]), palm: N([-0.4, -0.8, 0.1]), pole: [0.8, 0.3, 0.3] },
      l: { pos: v3.add(thigh, [-0.06, 0.07, 0.0]), fdir: N([0.6, -0.5, -0.5]), palm: N([0.3, -0.9, 0]), pole: [-0.8, 0.2, 0.3] } }
    : { r: { pos: [0.42, groundY, 0.3], fdir: N([0.6, 0, 0.6]), palm: [0, -1, 0], pole: [0, 1, 0] }, l: { pos: [-0.4, groundY + 0.01, 0.05], fdir: N([-0.7, 0, -0.5]), palm: [0, -1, 0], pole: [0, 1, 0] } };
  const weapon = wounded ? rifleAt([0.32, 0.03, -0.1], [0, 0, -1], [1, 0.0, 0.0]) : rifleAt([0.55, 0.03, 0.0], N([0.3, 0, -1]), [-1, 0, 0]);
  return solve(R, { ...body, feet, hands, weapon, fingers: { l: { curl: wounded ? 0.7 : 0.3, thumb: 0.4 }, r: { curl: wounded ? 0.7 : 0.25, thumb: 0.3 } } });
}

/** Ciclo do ferrolho sobre uma pose de pontaria P (mão direita deixa o punho e trabalha a alavanca). */
function boltCycle(R, P, rifle, { lift, back, toBolt }) {
  const w = { pos: P.W.weapon.p, rot: P.W.weapon.r };
  const turn = 88 * lift, slide = 0.085 * back;
  // Botão da alavanca no referencial da arma, com a rotação/translação do ferrolho.
  const axis = [0, rifle.boltY, rifle.boltZ], knob0 = rifle.handle === 'straight' ? [0.06, rifle.boltY - 0.002, rifle.boltZ + 0.036] : [0.044, rifle.boltY - 0.048, rifle.boltZ + 0.05];
  const knob = v3.add(v3.add(axis, q.rot(q.axis([0, 0, 1], turn), v3.sub(knob0, axis))), [0, 0, slide]);
  const onKnob = { pos: v3.add(knob, q.rot(q.axis([0, 0, 1], turn * 0.6), [0.03, 0.045, 0.045])), fdir: q.rot(q.axis([0, 0, 1], turn * 0.4), N([-0.2, -0.75, -0.6])), palm: q.rot(q.axis([0, 0, 1], turn * 0.4), N([-0.55, -0.7, 0.3])) };
  const grip = GRIP_R;
  const hand = { pos: mix(grip.pos, onKnob.pos, toBolt), fdir: N(mix(grip.fdir, onKnob.fdir, toBolt)), palm: N(mix(grip.palm, onKnob.palm, toBolt)) };
  const pose = {
    hips: { pos: v3.add(P.trans.hips, R.J.root), q: P.local.hips }, local: { ...P.local }, weapon: { pos: w.pos, rot: w.rot },
    hands: { r: { ...handOn(w, hand), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] } },
    fingers: { l: fingersRifle.l, r: { curl: mix(0.72, 0.85, toBolt), index: mix(0.35, 0.8, toBolt), thumb: mix(0.6, 0.75, toBolt) } },
    bolt: { turn, back: slide },
  };
  for (const s of ['l', 'r']) for (const b of ['upperarm', 'lowerarm', 'hand']) delete pose.local[`${b}_${s}`];
  for (const k of Object.keys(pose.local)) if (/^(thumb|index|middle|ring|pinky)_/.test(k)) delete pose.local[k];
  return solve(R, pose);
}

/** Recarga por clipe (3,4 s). */
function reloadPose(R, J, rifle, t) {
  // Arma baixada ao peito, rodada para expor a culatra; volta à pontaria no fim.
  const down = seg(t, 0, 0.3) - seg(t, 2.75, 3.3);
  const P0 = aimPose(R, {});
  const body = {
    hips: { pos: [0.01, 0.89, 0.07], rot: { yaw: -32 + 6 * down, pitch: 3 } },
    spine: [{ pitch: 3 + 4 * down, yaw: -4 }, { pitch: 3 + 4 * down, yaw: -4 }, { pitch: 2 + 4 * down, yaw: -3 }],
    neck: { yaw: mix(22, 12, down), pitch: mix(10, 24, down), roll: mix(-6, 0, down) }, head: { yaw: mix(18, 8, down), pitch: mix(6, 16, down), roll: mix(-14, -4, down) },
    clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
    feet: { l: foot(-0.1, -0.16, { yaw: -10 }), r: foot(0.17, 0.2, { yaw: -60 }) },
  };
  const pre = solve(R, body).W;
  const wAim = { pos: P0.W.weapon.p, rot: P0.W.weapon.r };
  const chest = v3.add(pre.spine_03.p, q.rot(pre.spine_03.r, [0.06, -0.12, -0.3]));
  const wLow = rifleAt(chest, N([-0.25, 0.45, -1]), N([0.6, 1, 0.2]));
  const w = { pos: mix(wAim.pos, wLow.pos, down), rot: q.slerp(wAim.rot, wLow.rot, down) };
  // Ferrolho: abrir 0,05–0,45; fechar 2,25–2,7.
  const lift = seg(t, 0.05, 0.2) - seg(t, 2.55, 2.7), back = seg(t, 0.2, 0.45) - seg(t, 2.25, 2.5);
  const toBolt = seg(t, 0.0, 0.08) - seg(t, 0.45, 0.6) + seg(t, 2.05, 2.25) - seg(t, 2.7, 2.9);
  const B = boltCycle(R, solve(R, { ...body, weapon: w }), rifle, { lift, back, toBolt: Math.max(0, toBolt) });
  // Mão direita: bolsa (0,6–0,8), guia (0,8–1,0), polegar empurra (1,0–2,05).
  const pouch = v3.add(pre.hips.p, q.rot(pre.hips.r, [0.11, 0.08, -0.17]));
  const guide = weaponPoint(w, [0, 0.072, -0.085]);
  const push = lin(t, 1.0, 2.05);
  const clipLocal = [0, 0.072 - 0.045 * smoothstep(0, 1, push), -0.085];
  let hand = null, clip = null, scale = 0;
  if (t > 0.45 && t < 2.05) {
    const toPouch = seg(t, 0.45, 0.65), toGuide = seg(t, 0.8, 1.0);
    const atPouch = { pos: v3.add(pouch, [0.03, 0.04, 0.05]), fdir: N([-0.2, -0.9, -0.3]), palm: N([-0.9, 0, 0.3]) };
    const atGuide = { pos: v3.add(weaponPoint(w, clipLocal), weaponDir(w, [0.035, 0.07, 0.07])), fdir: weaponDir(w, N([-0.3, -0.75, -0.55])), palm: weaponDir(w, N([-0.6, -0.6, 0.4])) };
    const grip = handOn(w, GRIP_R), boltH = { pos: B.W.hand_r.p, fdir: q.rot(B.W.hand_r.r, R.hand.r.fdir), palm: q.rot(B.W.hand_r.r, R.hand.r.palm) };
    let from = boltH;
    if (toBolt <= 0 && t < 0.6) from = grip;
    const a = t < 0.8 ? from : atPouch, bb = t < 0.8 ? atPouch : atGuide, k = t < 0.8 ? toPouch : toGuide;
    hand = { pos: mix(a.pos, bb.pos, k), fdir: N(mix(a.fdir, bb.fdir, k)), palm: N(mix(a.palm, bb.palm, k)), pole: [0.8, -0.4, 0.2] };
    if (t >= 0.66) {
      scale = 1;
      if (t < 1.0) {
        // Clipe na mão: entre o polegar e o indicador, a seguir a mão.
        const hw = solve(R, { ...body, weapon: w, hands: { r: hand, l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] } } }).W.hand_r;
        const inHand = { pos: v3.add(hw.p, q.rot(hw.r, [-0.035, -0.05, -0.06])), rot: q.mul(hw.r, q.frame(R.hand.r.fdir, R.hand.r.palm, [0, -1, 0], [-1, 0, 0])) };
        const inGuide = { pos: weaponPoint(w, clipLocal), rot: w.rot };
        const k2 = seg(t, 0.9, 1.0);
        clip = { pos: mix(inHand.pos, inGuide.pos, k2), rot: q.slerp(inHand.rot, inGuide.rot, k2), scale };
      } else clip = { pos: weaponPoint(w, clipLocal), rot: w.rot, scale };
    }
  }
  if (t >= 2.05 && t < 2.55) { scale = 1; clip = { pos: weaponPoint(w, clipLocal), rot: w.rot, scale }; }
  if (t >= 2.4 && t < 2.6) {
    // Fecho do ferrolho expele o clipe vazio: sobe e roda para a direita.
    const e = lin(t, 2.4, 2.6);
    clip = { pos: v3.add(weaponPoint(w, clipLocal), weaponDir(w, [0.12 * e, 0.1 * e - 0.15 * e * e, 0.02 * e])), rot: q.mul(w.rot, q.axis([0, 0, 1], -200 * e)), scale: e < 0.95 ? 1 : 0 };
  }
  const pose = { hips: { pos: v3.add(B.trans.hips, J.root), q: B.local.hips }, local: {}, weapon: { pos: w.pos, rot: w.rot }, bolt: { turn: 88 * lift, back: 0.085 * back } };
  for (const [k, v] of Object.entries(B.local)) if (!/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky|weapon)/.test(k)) pose.local[k] = v;
  pose.hands = { l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] },
    r: hand ?? { pos: B.W.hand_r.p, q: B.W.hand_r.r, pole: [0.7, -0.6, 0.35] } };
  pose.fingers = { l: fingersRifle.l, r: hand ? { curl: 0.55, index: 0.5, thumb: 0.8 } : { curl: 0.8, index: 0.6, thumb: 0.7 } };
  if (clip) pose.clip = clip;
  else pose.clip = { pos: weaponPoint(w, clipLocal), rot: w.rot, scale: 0 };
  return solve(R, pose);
}

/** Locomoção no lugar: pés deslizam para trás no apoio e avançam no balanço. */
function locomotion(R, name, o) {
  return sample(R, name, o.T, (t, u) => {
    const feet = {}, phases = { l: u, r: (u + 0.5) % 1 };
    for (const s of ['l', 'r']) {
      const ph = phases[s], x = s === 'l' ? -0.11 : 0.11;
      let z, y = 0.072, pitch = 0, toe = 0;
      if (ph < o.stance) { const k = ph / o.stance; z = -o.stride / 2 + o.stride * k; pitch = -8 * smoothstep(0.75, 1, k); toe = 25 * smoothstep(0.75, 1, k); y += 0.03 * smoothstep(0.8, 1, k); }
      else { const k = (ph - o.stance) / (1 - o.stance); z = o.stride / 2 - o.stride * smoothstep(0, 1, k); y += o.lift * Math.sin(Math.PI * k); pitch = 12 * Math.sin(Math.PI * k) - 10 * smoothstep(0.7, 1, k); }
      feet[s] = foot(x, z + 0.04, { yaw: s === 'l' ? 4 : -4, y, pitch, toe });
    }
    const bob = Math.cos(u * Math.PI * 4), sway = Math.sin(u * Math.PI * 2);
    const body = {
      hips: { pos: [0.015 * sway, o.hipY + o.bob * bob, 0.062 + 0.02], rot: { pitch: o.lean * 0.4, yaw: 5 * sway, roll: -2 * sway } },
      spine: [{ pitch: o.lean * 0.25, yaw: -3 * sway }, { pitch: o.lean * 0.2, yaw: -3 * sway }, { pitch: o.lean * 0.15 }],
      neck: { pitch: -o.lean * 0.3 }, head: { pitch: -o.lean * 0.3 }, feet,
    };
    if (o.carry) {
      body.spine = [{ pitch: o.lean * 0.3, roll: 3 }, { pitch: o.lean * 0.3, roll: 3 }, { pitch: o.lean * 0.2, roll: 2 }];
      body.clav = { r: { roll: -8 } };
      return compose(R, body, W => {
        // Braço direito por cima das pernas do ferido; esquerdo segura-lhe o pulso à frente.
        const sh = W.upperarm_r.p;
        return {
          weapon: slung(R, body),
          hands: { r: { pos: v3.add(sh, q.rot(W.spine_03.r, [0.0, -0.12, -0.24])), fdir: q.rot(W.spine_03.r, N([-0.3, 0.4, -0.85])), palm: q.rot(W.spine_03.r, N([-0.6, -0.7, 0.2])), pole: [0.9, -0.2, 0.3] },
            l: { pos: v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.0, 0.0, -0.28 + 0.02 * sway])), fdir: q.rot(W.spine_02.r, N([0.8, -0.2, -0.5])), palm: q.rot(W.spine_02.r, N([0.1, 0.2, 1])), pole: [-0.8, -0.5, 0.2] } },
          fingers: { l: { curl: 0.7, thumb: 0.6 }, r: { curl: 0.75, thumb: 0.5 } },
        };
      });
    }
    return compose(R, body, W => holdRifle(portArms(R, W), o.P));
  }, { loop: true, pose: 'standing', speed_mps: +o.speed.toFixed(3), ...(o.carry ? { note: 'transportador: prender a raiz do ferido (clip carried) ao osso carry_socket' } : {}), ...(o.extras ?? {}) });
}

// ——— rkm wz.28 (Kowal) ———
// Browning polaca: carregador de 20 (osso weapon_mag), ferrolho aberto (alavanca de armar à esquerda, osso
// weapon_bolt: na pose de ligação está atrás/armada; vai à frente em cada disparo), 600 tiros/min teóricos.
// Valores de GAMEPLAY a afinar (research/weapons/rkm_wz28.md §5). `extras.weapon` e `extras.bipod` dizem que malhas
// mostrar: rkm_bipod_open no chão, rkm_bipod_folded nas restantes.
const RPM = 600, SHOT = 60 / RPM;
const TRAVEL = RKM.handleTravel;

/** Rajada: n disparos a partir de t0. Devolve recuo (0..1), subida acumulada (graus) e avanço da alavanca (0..1). */
function burst(t, n, { t0 = 0, climb = 0.7 } = {}) {
  const k = Math.floor((t - t0) / SHOT), ph = (t - t0) / SHOT - k;
  const firing = t >= t0 && k < n;
  const kick = firing ? Math.sin(Math.min(1, ph * 1.6) * Math.PI) : 0;
  const rise = climb * Math.min(n, Math.max(0, (t - t0) / SHOT)) * (1 - seg(t, t0 + n * SHOT + 0.05, t0 + n * SHOT + 0.45));
  // Ferrolho aberto: a alavanca vai à frente e volta em cada tiro (amostrada a 30 fps fica a vibrar).
  const fwd = firing ? Math.sin(ph * Math.PI) : 0;
  return { kick, rise, fwd };
}

function rkmClips(R, J, { kneel }) {
  const P = RKM_P, out = [];
  const extras = (bipod, more = {}) => ({ weapon: 'rkm_wz28', bipod, ...more });

  // rkm_standing_idle: rkm em baixo pronta (9 kg), respiração.
  out.push(sample(R, 'rkm_standing_idle', 4, (t, u) => {
    const b = Math.sin(u * Math.PI * 2), sh = Math.sin(u * Math.PI);
    const body = { ...STAND, hips: { pos: [0.01 * sh, 0.9 + 0.004 * b, 0.062], rot: { roll: -1.5 * sh, yaw: 2 * sh, pitch: -1 } },
      spine: [{ pitch: 0.5 + b, roll: 1 }, { pitch: 1.5 * b }, { pitch: 1 + b }], neck: { pitch: 2, yaw: -3 * sh }, head: { pitch: 2, yaw: 4 * sh } };
    return compose(R, body, W => holdRifle(lowReady(R, W, b), P));
  }, { loop: true, pose: 'standing', ...extras('folded') }));

  // rkm_walk / rkm_run: arma atravessada no peito.
  out.push(locomotion(R, 'rkm_walk', { T: 1.05, stance: 0.6, stride: 0.64, lift: 0.1, hipY: 0.88, lean: 5, bob: 0.018, speed: 0.64 / 0.63, P, extras: extras('folded') }));
  out.push(locomotion(R, 'rkm_run', { T: 0.72, stance: 0.4, stride: 0.8, lift: 0.2, hipY: 0.85, lean: 14, bob: 0.03, speed: 0.8 / (0.4 * 0.72), P, extras: extras('folded') }));

  // rkm_aim / rkm_fire_burst: de pé, ao ombro. Rajada curta de 3, como na simulação (src/game/m01-simulation.js:
  // Kowal gasta 3 cartuchos por rajada; dlg_m01_026 "rajadas curtas").
  out.push(sample(R, 'rkm_aim', 2, (t, u) => aimPose(R, { sway: [0.6 * Math.sin(u * Math.PI * 2), 0.45 * Math.sin(u * Math.PI * 4)], P }), { loop: true, pose: 'standing', ...extras('folded') }));
  const N5 = 3, dur = +(N5 * SHOT + 0.5).toFixed(2);
  out.push(sample(R, 'rkm_fire_burst', dur, t => {
    const f = burst(t, N5, { climb: 0.9 });
    const Pz = aimPose(R, { kick: 0.55 * f.kick, sway: [0.25 * f.kick, f.rise], P });
    return solve(R, { ...rePose(R, Pz), bolt: { back: -TRAVEL * f.fwd } });
  }, { loop: false, pose: 'standing', ...extras('folded', { rounds: N5, rate_rpm: RPM, events: { fire: Array.from({ length: N5 }, (_, i) => +(i * SHOT).toFixed(3)) } }) }));

  // rkm_crouched_idle: de joelho, rkm pronta.
  out.push(sample(R, 'rkm_crouched_idle', 3, (t, u) => {
    const b = Math.sin(u * Math.PI * 2);
    return compose(R, kneel(b), W => holdRifle(lowReady(R, W, b), P));
  }, { loop: true, pose: 'crouched', ...extras('folded') }));

  // rkm_prone / rkm_prone_fire: deitado sobre o bípode aberto, mão esquerda por baixo da coronha.
  out.push(sample(R, 'rkm_prone', 3, (t, u) => pronePose(R, { b: Math.sin(u * Math.PI * 2) }), { loop: true, pose: 'prone', ...extras('open') }));
  out.push(sample(R, 'rkm_prone_fire', dur, t => {
    const f = burst(t, N5, { climb: 0.25 });
    return pronePose(R, { kick: f.kick, rise: f.rise, fwd: f.fwd });
  }, { loop: false, pose: 'prone', ...extras('open', { rounds: N5, rate_rpm: RPM, events: { fire: Array.from({ length: N5 }, (_, i) => +(i * SHOT).toFixed(3)) } }) }));

  // rkm_reload: troca de carregador de joelho, atrás de abrigo (dlg_m01_029 "Trocando carregador!").
  out.push(sample(R, 'rkm_reload', 3.4, t => rkmReload(R, J, t, kneel), { loop: false, pose: 'crouched',
    ...extras('folded', { events: { mag_release: 0.45, mag_drop: 1.05, mag_from_pouch: 1.15, mag_in: 1.9, handle_back: 2.45 },
      note: 'carregador vazio cai (o jogo pode deixar um adereço no chão em mag_drop); com o carregador vazio o ferrolho está à frente e é armado no fim' }) }));

  // rkm_clean: sentado, rkm de pé entre os joelhos; pano no cano e na caixa, depois puxa a alavanca e acompanha-a
  // devagar à frente (abertura, 04:30: "testa o ferrolho sem som metálico exagerado"). Pano no osso weapon_clip.
  out.push(sample(R, 'rkm_clean', 6, t => rkmClean(R, t), { loop: true, pose: 'seated',
    ...extras('folded', { events: { handle_back: 4.7, handle_forward: 5.25 }, note: 'mostrar a malha rag (pano) neste clip' }) }));
  return out;
}

/** Converte uma pose resolvida em pedido de pose (para lhe juntar ferrolho/carregador). */
function rePose(R, Pz) {
  const local = { ...Pz.local };
  const hips = { pos: v3.add(Pz.trans.hips, R.J.root), q: Pz.local.hips };
  delete local.weapon; delete local.weapon_bolt; delete local.weapon_clip; delete local.weapon_mag;
  return { hips, local, weapon: { pos: Pz.W.weapon.p, rot: Pz.W.weapon.r } };
}

/** Deitado de bruços sobre o bípode; b: respiração, kick: recuo (0..1), rise: subida (graus), fwd: alavanca à frente. */
function pronePose(R, { b = 0, kick = 0, rise = 0, fwd = 0 } = {}) {
  const body = {
    hips: { pos: [0.02, 0.125 + 0.004 * b, 0.36 + 0.012 * kick], rot: { pitch: 86, yaw: -8, roll: 2 } },
    spine: [{ pitch: -10 + b * 0.6, yaw: 2 }, { pitch: -14, yaw: 3 }, { pitch: -12 + b * 0.6, yaw: 2 }],
    neck: { pitch: -24, yaw: 4 }, head: { pitch: -22, yaw: 2, roll: -10 },
    clav: { r: { yaw: 8, roll: -10 }, l: { yaw: -10, roll: 6 } },
    feet: { l: foot(-0.3, 1.2, { y: 0.06, yaw: 25 }), r: foot(0.16, 1.25, { y: 0.06, yaw: -15 }) },
  };
  for (const s of ['l', 'r']) {
    // Pés esticados para trás: dedos no chão, calcanhar para cima, joelhos para baixo.
    const f = body.feet[s];
    f.rot = q.mul(q.axis([0, 1, 0], s === 'l' ? 25 : -15), q.axis([1, 0, 0], -115));
    f.pole = [s === 'l' ? -0.3 : 0.3, -1, 0];
    f.toe = 0;
  }
  return compose(R, body, W => {
    // Coronha no ombro direito; o olho sobre a linha de mira; a arma roda à volta do olho até os patins tocarem no chão.
    const eye = W.eye_r.p;
    let pitch = 0;
    for (let i = 0; i < 4; i++) {
      const w0 = rifleAt([0, 0, 0], [0, Math.sin(pitch), -Math.cos(pitch)]);
      const w = { pos: v3.sub(eye, q.rot(w0.rot, RKM_P.eye)), rot: w0.rot };
      const footY = weaponPoint(w, RKM_SOCK_FEET)[1];
      pitch += Math.asin(clamp((0.004 - footY) / 0.85, -0.5, 0.5));
    }
    const F = [0, Math.sin(pitch + (rise + 2.5 * kick) * deg), -Math.cos(pitch + (rise + 2.5 * kick) * deg)];
    const w0 = rifleAt([0, 0, 0], F);
    const w = { pos: v3.sub(v3.add(eye, [0, 0, 0.015 * kick]), q.rot(w0.rot, RKM_P.eye)), rot: w0.rot };
    return {
      weapon: w, bolt: { back: -TRAVEL * fwd },
      hands: { r: { ...handOn(w, RKM_P.r), pole: [0.6, -1, 0.2] }, l: { ...handOn(w, RKM_BUTT_L), pole: [-0.5, -1, -0.2] } },
      fingers: { r: { curl: 0.75, index: 0.4, thumb: 0.6 }, l: { curl: 0.7, thumb: 0.5 } },
    };
  });
}
const RKM_SOCK_FEET = [-RKM.bipod.open[0], RKM.bipod.open[1] - 0.006, RKM.bipod.open[2]];

/** Troca de carregador de joelho (3,4 s): a mão direita fica no punho; a esquerda faz tudo. */
function rkmReload(R, J, t, kneel) {
  const body = kneel(0);
  body.neck = { pitch: 10 + 14 * (seg(t, 0.1, 0.4) - seg(t, 2.8, 3.2)), yaw: -6 }; body.head = { pitch: 6 + 10 * (seg(t, 0.1, 0.4) - seg(t, 2.8, 3.2)), yaw: -8 };
  const pre = solve(R, body).W;
  // Arma: da posição pronta à posição de recarga (canada para a direita, poço virado à mão esquerda) e volta.
  const ready = lowReady(R, pre, 0);
  const grip = v3.add(pre.spine_01.p, q.rot(pre.spine_01.r, [0.13, 0.06, -0.2]));
  const reloadW = rifleFrame(grip, v3.add(grip, q.rot(pre.spine_01.r, N([-0.2, 0.42, -0.88]))), q.rot(pre.spine_01.r, N([0.75, 1, 0.25])));
  const k = seg(t, 0.0, 0.3) - seg(t, 2.85, 3.35);
  const w = { pos: mix(ready.pos, reloadW.pos, k), rot: q.slerp(ready.rot, reloadW.rot, k) };
  // Carregador: no poço → puxado para baixo (0,45–0,65) → cai (0,7–1,05) → novo da bolsa (1,15) → poço (1,9).
  const magLocal = RKM.mag, wellPt = weaponPoint(w, magLocal);
  const pouch = v3.add(pre.hips.p, q.rot(pre.hips.r, [-0.1, 0.07, -0.175]));
  const pouchRot = q.mul(pre.hips.r, q.axis([0, 1, 0], 25));
  let mag = null, hand;
  const handOnMag = (pos, rot) => ({ pos: v3.add(pos, q.rot(rot, [-0.045, -0.075, 0.045])), fdir: q.rot(rot, N([0.45, 0.45, -0.77])), palm: q.rot(rot, N([1, 0.1, 0.1])) });
  const atL = handOn(w, RKM_P.l);
  if (t < 0.45) {
    const m = handOnMag(wellPt, w.rot), a = seg(t, 0.15, 0.42);
    hand = { pos: mix(atL.pos, m.pos, a), fdir: N(mix(atL.fdir, m.fdir, a)), palm: N(mix(atL.palm, m.palm, a)) };
  } else if (t < 0.7) {
    const d = seg(t, 0.45, 0.65) * 0.14, pos = weaponPoint(w, v3.add(magLocal, [0, -d, 0.004]));
    mag = { pos, rot: w.rot, scale: 1 }; hand = handOnMag(pos, w.rot);
  } else if (t < 1.15) {
    // Largado: cai com gravidade e roda; desaparece em 1,05 (mag_drop) — o jogo pode deixar um adereço no chão.
    const p0 = weaponPoint(w, v3.add(magLocal, [0, -0.14, 0.004])), dt = t - 0.7;
    mag = t < 1.05 ? { pos: v3.add(p0, [0.05 * dt, -4.9 * dt * dt, 0.1 * dt]), rot: q.mul(w.rot, q.axis([1, 0, 0], -220 * dt)), scale: 1 } : { pos: pouch, rot: pouchRot, scale: 0 };
    const from = handOnMag(p0, w.rot), to = handOnMag(v3.add(pouch, [0, 0.03, 0]), pouchRot), a = seg(t, 0.72, 1.12);
    hand = { pos: v3.add(mix(from.pos, to.pos, a), [0, 0.06 * Math.sin(Math.PI * a), 0]), fdir: N(mix(from.fdir, to.fdir, a)), palm: N(mix(from.palm, to.palm, a)) };
  } else if (t < 1.9) {
    // Novo carregador: sai da bolsa, vai para baixo do poço já alinhado e sobe.
    const a = seg(t, 1.2, 1.7), up = seg(t, 1.7, 1.88);
    const below = weaponPoint(w, v3.add(magLocal, [0, -0.07 * (1 - up), 0]));
    const lift = v3.add(pouch, [0, 0.03 + 0.05 * seg(t, 1.15, 1.25), 0]);
    const pos = t < 1.2 ? v3.add(pouch, [0, 0.03 * seg(t, 1.15, 1.2), 0]) : mix(lift, below, a);
    const rot = q.slerp(pouchRot, w.rot, a);
    mag = { pos, rot, scale: 1 }; hand = handOnMag(pos, rot);
  } else {
    // Palmada, mão à alavanca (esquerda), puxa-a atrás (2,2–2,45), volta ao fuste.
    const m = handOnMag(wellPt, w.rot);
    const knob = h => weaponPoint(w, [-0.046, -0.004, -0.07 - TRAVEL * (1 - h)]);
    const pull = seg(t, 2.2, 2.45);
    const onKnob = { pos: v3.add(knob(pull), weaponDir(w, [-0.03, -0.015, -0.07])), fdir: weaponDir(w, N([0.25, 0.1, 0.96])), palm: weaponDir(w, N([0.7, -0.1, 0.1])) };
    if (t < 2.2) {
      const a = seg(t, 1.95, 2.18), bump = Math.sin(Math.PI * clamp((t - 1.9) / 0.08)) * 0.012;
      hand = { pos: v3.add(mix(m.pos, onKnob.pos, a), weaponDir(w, [0, bump, 0])), fdir: N(mix(m.fdir, onKnob.fdir, a)), palm: N(mix(m.palm, onKnob.palm, a)) };
    } else if (t < 2.5) hand = onKnob;
    else { const a = seg(t, 2.5, 2.85); hand = { pos: mix(onKnob.pos, atL.pos, a), fdir: N(mix(onKnob.fdir, atL.fdir, a)), palm: N(mix(onKnob.palm, atL.palm, a)) }; }
  }
  // Com o carregador vazio a alavanca está à frente; é puxada atrás (armada) em 2,2–2,45.
  const back = -TRAVEL * (1 - seg(t, 2.2, 2.45));
  return solve(R, { ...body, weapon: w, bolt: { back }, mag,
    hands: { r: { ...handOn(w, RKM_P.r), pole: [0.7, -0.6, 0.35] }, l: { ...hand, pole: [-0.6, -0.8, 0.1] } },
    fingers: { r: { curl: 0.75, index: 0.35, thumb: 0.6 }, l: { curl: t > 2.15 && t < 2.5 ? 0.85 : 0.6, thumb: 0.6 } } });
}

/** Limpeza sentado (6 s, ciclo): rkm deitada de lado sobre os joelhos, cano para a direita, alavanca para cima. */
function rkmClean(R, t) {
  const b = Math.sin(t / 6 * Math.PI * 2);
  const body = { hips: { pos: [0, 0.13, 0.2], rot: { pitch: -8 } }, spine: [{ pitch: 8 + b }, { pitch: 7 }, { pitch: 5 + b * 0.5 }],
    neck: { pitch: 24, yaw: -6 }, head: { pitch: 18, yaw: -8 },
    feet: { l: foot(-0.16, -0.32, { yaw: 14 }), r: foot(0.17, -0.3, { yaw: -14 }) } };
  const W0 = solve(R, body).W, knee = v3.mul(v3.add(W0.calf_l.p, W0.calf_r.p), 0.5);
  // Topo da arma (miras) virado ao corpo, lado esquerdo (alavanca) para cima; apoiada nos joelhos.
  const w0 = rifleAt([0, 0, 0], [1, 0, 0], [0, 0, 1]);
  const w = { pos: v3.add([0.03, knee[1] + 0.055, knee[2] + 0.02], q.rot(w0.rot, [0, 0, 0])), rot: w0.rot };
  // Mão esquerda na coronha; vai à alavanca (3,9–4,3), puxa-a atrás (4,3–4,7) e acompanha-a à frente (4,75–5,25).
  const holdL = { pos: weaponPoint(w, [-0.06, 0.0, 0.17]), fdir: weaponDir(w, N([0.6, -0.2, -0.6])), palm: weaponDir(w, N([1, 0, 0.2])) };
  const pull = seg(t, 4.3, 4.7) - seg(t, 4.75, 5.25), toK = seg(t, 3.9, 4.3) - seg(t, 5.3, 5.7);
  const knob = weaponPoint(w, [-0.046, -0.004, -0.07 - TRAVEL * (1 - pull)]);
  const onKnob = { pos: v3.add(knob, weaponDir(w, [-0.05, -0.01, -0.06])), fdir: weaponDir(w, N([0.6, -0.1, 0.8])), palm: weaponDir(w, N([0.8, 0, -0.3])) };
  const hl = { pos: mix(holdL.pos, onKnob.pos, toK), fdir: N(mix(holdL.fdir, onKnob.fdir, toK)), palm: N(mix(holdL.palm, onKnob.palm, toK)) };
  // Mão direita com o pano: esfrega o fuste e o cano (0–3,8), depois descansa no joelho direito.
  const wipe = t < 3.8 ? 0.5 - 0.5 * Math.cos(t / 3.8 * Math.PI * 2 * 3) : 0;
  const rest = seg(t, 3.6, 4.0) - seg(t, 5.6, 6.0);
  const onGun = { pos: weaponPoint(w, [-0.1, 0.02, -0.26 - 0.3 * wipe]), fdir: weaponDir(w, N([0.6, 0.3, -0.5])), palm: weaponDir(w, N([1, 0, 0])) };
  const onKnee = { pos: v3.add(W0.calf_r.p, [0.04, 0.09, 0.08]), fdir: N([-0.4, -0.3, -0.85]), palm: N([-0.2, -1, 0.1]) };
  const hr = { pos: mix(onGun.pos, onKnee.pos, rest), fdir: N(mix(onGun.fdir, onKnee.fdir, rest)), palm: N(mix(onGun.palm, onKnee.palm, rest)) };
  const hands = { r: { ...hr, pole: [0.6, -0.6, 0.5] }, l: { ...hl, pole: [-0.7, -0.6, 0.4] } };
  const hw = solve(R, { ...body, weapon: w, hands }).W.hand_r;
  const rag = { pos: v3.add(hw.p, q.rot(hw.r, R.hand.r.fdir.map((x, i) => x * 0.055 + R.hand.r.palm[i] * 0.022))), rot: hw.r, scale: 1 };
  return solve(R, { ...body, weapon: w, bolt: { back: -TRAVEL * (1 - pull) }, clip: rag, hands,
    fingers: { r: { curl: 0.8, thumb: 0.7 }, l: { curl: 0.75, thumb: 0.6 } } });
}
