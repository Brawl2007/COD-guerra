// Transições do arrasto da estação: o médico passa de `crouched_idle` (t = 0) ao frame 0 de `drag_wounded` agarrando o
// ferido pelos ombros; o paciente passa de `wounded` (t = 0, de costas no chão) à pose de arrasto, com o tronco erguido
// pelas mãos do médico debaixo dos sovacos. A libertação é o percurso inverso no mesmo relógio. Os extremos são
// amostrados dos GLB reais; os frames intermédios são resolvidos com o solver dos soldados.
import { q } from '../../m01-soldiers/src/pose.mjs';
import { v3, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { qmul, qrot, worldPose } from './fk.mjs';
import { sampled, extract, mix, pose } from './rig.mjs';
import { push } from './body.mjs';

export const FPS = 30;
// Durações e eventos estimados (sem referência de captura de movimento): 0,7 s para baixar e chegar aos ombros,
// 0,25 s para fechar a pega, 0,65 s para erguer o tronco do ferido e endireitar até ao frame 0 do arrasto.
export const TIMING = { duration: 1.6, hands_contact: 0.7, grip_ready: 0.95 };
// Raiz do paciente no referencial do médico (rig virado para −Z): +0,92 m na direcção do facing.
export const PATIENT_OFFSET = [0, 0, -0.92];
// Pose de arrasto do paciente: bacia inclinada 20° a partir de deitado e coluna fletida para a frente (graus).
// Mão em cima do ombro do ferido deitado: em relação a upperarm (x para fora, y para cima, z para a cabeça).
export const SHOULDER_GRIP = [0.01, 0.15, 0.06];
// Ponto de passagem da mão por cima do ombro, somado ao meio entre os sockets (referencial de spine_03).
export const OVER = [0.05, 0.05, 0.05];
// Intervalo da subida do paciente (0…1) em que a mão desliza do ombro para debaixo do sovaco.
export const SLIDE = [0.2, 1];
// Sobreposição tolerada das cápsulas da mão/antebraço com o corpo do paciente (pano e mãos a apertar), em metros.
export const CONTACT_SLACK = 0.015;
const PUSH = { passes: 10, margin: 0.004, edge: 0.2 };
export const FOOT_L_BACK = 0.09;
export const HOLD = { hips_tilt_deg: 20, spine_pitch_deg: [10, 10, 8] };

const N = v3.norm;
const shift = (W, o) => Object.fromEntries(Object.entries(W).map(([k, v]) => [k, { p: v3.add(v.p, o), r: v.r }]));
const bezier = (a, b, c, t) => a.map((x, i) => (1 - t) ** 2 * x + 2 * (1 - t) * t * b[i] + t * t * c[i]);

export function build(rig, files) {
  const crouch = sampled(rig, files.soldierClips, 'crouched_idle', 0);
  const drag = sampled(rig, files.stationClips, 'drag_wounded', 0);
  const wounded = sampled(rig, files.soldierClips, 'wounded', 0);
  const K = extract(rig, crouch), D = extract(rig, drag), F = extract(rig, wounded);

  // ——— Paciente ———
  const H = structuredClone(F);
  H.hips.q = q.axis([1, 0, 0], 90 - HOLD.hips_tilt_deg);
  ['spine_01', 'spine_02', 'spine_03'].forEach((b, i) => { H.local[b] = q.euler({ pitch: HOLD.spine_pitch_deg[i] }); });
  const patientAt = s => {
    const r = s <= 0 ? pose(rig, F) : s >= 1 ? pose(rig, H) : pose(rig, mix(F, H, s));
    return { ...r, Wm: shift(r.W, PATIENT_OFFSET) };   // Wm: no referencial do médico
  };
  const flat = patientAt(0), hold = patientAt(1);

  // ——— Sockets das mãos no braço do paciente (referencial do osso upperarm_l/r, que segue o tronco e o braço) ———
  // grip: onde ficam as mãos do frame 0 do arrasto com o paciente erguido (debaixo dos sovacos, por trás).
  // shoulder: em cima do ombro do paciente deitado (pega na gola/ombro antes de erguer).
  // over: ponto de passagem por cima do ombro, do lado da cabeça, para a mão não atravessar o braço.
  const frame = s => `upperarm_${s}`;
  const local = (W, s, p) => qrot(q.inv(W[frame(s)].r), v3.sub(p, W[frame(s)].p));
  const sockets = {};
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? -1 : 1;
    sockets[s] = {
      grip: local(hold.Wm, s, drag.W[`hand_${s}`].p),
      shoulder: local(flat.Wm, s, v3.add(flat.Wm[`upperarm_${s}`].p, SHOULDER_GRIP.map((x, i) => i ? x : sx * x))),
    };
    sockets[s].over = v3.add(v3.mul(v3.add(sockets[s].shoulder, sockets[s].grip), 0.5), OVER);
  }
  const socketAt = (W, s, k) => v3.add(W[frame(s)].p, qrot(W[frame(s)].r, k));
  // Orientação da mão no tronco do paciente: em cima do ombro, dedos para os pés e palma para baixo; no arrasto, a do
  // frame 0 de `drag_wounded`.
  const handIn = (W, s, Q) => qmul(q.inv(W[frame(s)].r), Q);
  const R = rig.R, gripQ = {}, shoulderQ = {};
  for (const s of ['l', 'r']) {
    gripQ[s] = handIn(hold.Wm, s, D.hands[s].q);
    const sx = s === 'l' ? -1 : 1;
    shoulderQ[s] = handIn(flat.Wm, s, q.frame(R.hand[s].fdir, R.hand[s].palm, N([-sx * 0.15, -0.2, -1]), N([sx * 0.25, -1, -0.1])));
  }

  // ——— Médico: corpo inclinado sobre o ferido, de joelho direito no chão ———
  const reach = structuredClone(K);
  reach.hips.pos = [0.0, 0.47, 0.13];
  reach.hips.q = q.euler({ pitch: 42 });
  reach.local.spine_01 = q.euler({ pitch: 22 }); reach.local.spine_02 = q.euler({ pitch: 18 }); reach.local.spine_03 = q.euler({ pitch: 12 });
  reach.local.neck = q.euler({ pitch: 4 }); reach.local.head = q.euler({ pitch: -6 });
  reach.local.clavicle_l = q.euler({ pitch: 6, yaw: -6 }); reach.local.clavicle_r = q.euler({ pitch: 6, yaw: 6 });
  // Dedos: abertos a meio do gesto, depois a pega do arrasto.
  const open = {};
  for (const b of Object.keys(K.local)) if (/^(thumb|index|middle|ring|pinky)_/.test(b)) {
    const s = b.at(-1), f = b.split('_')[0], k = +b.split('_')[1][1] - 1, axis = R.finger[`${f}_${s}`];
    open[b] = f === 'thumb' ? q.axis(axis, 0.15 * [0.5, 0.8, 0.8][k] * 55) : q.axis(axis, 0.12 * [1, 0.9, 0.7][k] * 75);
  }
  const pole = { l: [-0.85, 0.1, 0.25], r: [0.85, 0.1, 0.25] };

  /** Frame do par no instante t do agarrar (0 … duração); `nudge` desloca os alvos das mãos (mundo do médico). */
  function grabFrame(t, nudge = { l: [0, 0, 0], r: [0, 0, 0] }) {
    const { duration: T, hands_contact: tc, grip_ready: tg } = TIMING;
    const a = smoothstep(0, tc, t), c = smoothstep(tg, T, t), s = c;
    const P = patientAt(s), W = P.Wm;
    let M = t <= 0 ? structuredClone(K) : t >= T ? structuredClone(D) : null;
    if (!M) {
      M = c > 0 ? mix(reach, D, c) : mix(K, reach, a);
      // Pé direito: desliza de joelho no chão para a pose de cócoras do arrasto, com um pequeno arco.
      if (c > 0 && c < 1) M.feet.r.pos = v3.add(M.feet.r.pos, [0, 0.05 * Math.sin(Math.PI * c), 0]);
      // Pé esquerdo recua durante o gesto, para longe do ombro do ferido, e volta ao passo do arrasto.
      const back = FOOT_L_BACK * (smoothstep(0.02, 0.4, t) - smoothstep(tg + 0.1, T, t));
      M.feet.l.pos = v3.add(M.feet.l.pos, [-0.25 * back, 0, back]);
      for (const s2 of ['l', 'r']) {
        // A mão acompanha o ombro no começo da subida e só depois passa por cima dele até debaixo do sovaco.
        const slide = smoothstep(SLIDE[0], SLIDE[1], s);
        const k = bezier(sockets[s2].shoulder, sockets[s2].over, sockets[s2].grip, slide);
        const target = socketAt(W, s2, k), Q = qmul(W[frame(s2)].r, q.slerp(shoulderQ[s2], gripQ[s2], slide));
        if (t < tc) {
          // Aproximação por cima: sai da pose agachada e desce sobre o ombro.
          const from = K.hands[s2], u = a, lift = 0.1 * Math.sin(Math.PI * Math.min(1, u * 1.15));
          M.hands[s2] = { pos: v3.add(v3.lerp(from.pos, target, u), [0, lift, 0]), q: q.slerp(from.q, Q, u), pole: v3.lerp(from.pole, pole[s2], u) };
        } else M.hands[s2] = { pos: target, q: Q, pole: c > 0 ? v3.lerp(pole[s2], D.hands[s2].pole, c) : pole[s2] };
        M.hands[s2].pos = v3.add(M.hands[s2].pos, nudge[s2]);
      }
      // Dedos: pega fechada entre o contacto e grip_ready.
      const g = smoothstep(tc, tg, t);
      for (const b of Object.keys(open)) {
        const before = t < tc ? q.slerp(K.local[b], open[b], Math.min(1, a * 1.6)) : open[b];
        M.local[b] = g > 0 ? q.slerp(open[b], D.local[b], g) : before;
      }
    }
    const medic = pose(rig, M);
    return { medic, patient: P, s, a, c, targets: { l: M.hands.l.pos, r: M.hands.r.pos } };
  }
  /**
   * Todos os frames do agarrar. Onde a mão ou o antebraço do médico entrariam no corpo do paciente para lá de
   * CONTACT_SLACK, o alvo da mão é empurrado para fora (iterações), suavizado no tempo e anulado nos extremos, para que o
   * primeiro e o último frame continuem a ser as poses reais.
   */
  function frames() {
    const n = Math.round(TIMING.duration * FPS), times = Array.from({ length: n + 1 }, (_, i) => i / FPS);
    const off = times.map(() => ({ l: [0, 0, 0], r: [0, 0, 0] }));
    for (let pass = 0; pass < PUSH.passes; pass++) {
      times.forEach((t, i) => {
        if (i === 0 || i === n) return;
        const fr = grabFrame(t, off[i]);
        for (const s2 of ['l', 'r']) off[i][s2] = v3.add(off[i][s2], push(fr.medic.W, fr.patient.Wm, [`hand_${s2}`, `forearm_${s2}`], -CONTACT_SLACK + PUSH.margin));
      });
      // Suavização temporal (núcleo binomial) e janela que anula o empurrão nos extremos.
      for (const s2 of ['l', 'r']) {
        const src = off.map(o => o[s2]);
        off.forEach((o, i) => {
          const k = [1, 4, 6, 4, 1], acc = [0, 0, 0]; let w = 0;
          k.forEach((kw, j) => { const v = src[Math.min(n, Math.max(0, i + j - 2))]; for (let c = 0; c < 3; c++) acc[c] += v[c] * kw; w += kw; });
          const win = Math.min(1, smoothstep(0, PUSH.edge, times[i]), smoothstep(0, PUSH.edge, TIMING.duration - times[i]));
          o[s2] = acc.map(x => x / w * win);
        });
      }
    }
    return times.map((t, i) => ({ t, nudge: off[i], ...grabFrame(t, off[i]) }));
  }
  return { grabFrame, frames, sockets, socketAt, K, D, F, H, crouch, drag, wounded, hold, flat };
}
