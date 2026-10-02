// Poses deitadas da dupla da MG 34 (atirador e municiador) para o rig actual dos soldados alemães, com o solver FK +
// IK de 2 ossos de tools/assets/m01-soldiers/src/pose.mjs. Atirador: raiz na origem, cano para −Z, corpo estendido para
// +Z. A arma assenta no bípode aberto (pés no chão) e o olho direito fica na linha de mira. Só funções exportadas
// pelos geradores existentes são reutilizadas; nenhum gerador partilhado é editado.
import { q, solve, weaponPoint, weaponDir } from '../../m01-soldiers/src/pose.mjs';
import { v3, clamp } from '../../m01-soldiers/src/meshops.mjs';
import { frame } from '../../m01-rkm-wz28/src/clips.mjs';
import { sockets } from '../../m01-mg34/src/mg34.mjs';
import { MG34_GRIP } from '../../m01-mg34/src/clips.mjs';

export const N = v3.norm, deg = Math.PI / 180, S = sockets();
export const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const handOn = (w, g) => ({ pos: weaponPoint(w, g.pos), fdir: weaponDir(w, g.fdir), palm: weaponDir(w, g.palm) });
/** Mão cujo ponto de contacto (dedos/palma) fica em `c` (mundo): o pulso fica atrás dos dedos e por trás da palma. */
export const handAt = (c, fdir, palm) => ({ pos: v3.sub(c, v3.add(v3.mul(fdir, 0.07), v3.mul(palm, 0.025))), fdir, palm });
export const blendHand = (a, b, t) => ({ pos: mix(a.pos, b.pos, t), fdir: N(mix(a.fdir, b.fdir, t)), palm: N(mix(a.palm, b.palm, t)) });

// Deitado: a mão esquerda segura a coronha por baixo e puxa-a ao ombro (a direita fica no punho).
export const BUTT_L = { pos: [-0.05, -0.09, 0.33], fdir: N([0.85, 0.4, 0.05]), palm: N([0.3, 1, 0]) };
/** Pé estendido para trás, dedos no chão e calcanhar para cima (yaw em graus). */
export const proneFoot = (x, z, yaw, { y = 0.06, side, pitch = -115, toe = 0 } = {}) => ({ pos: [x, y, z], rot: q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], pitch)), pole: [side * 0.3, -1, 0], toe });

/**
 * Corpo deitado do atirador. b: respiração (−1..1); kick: recuo (0..1, o corpo desliza para trás com a arma);
 * lift: cabeça e peito levantados (0..1, para ver a alimentação na recarga).
 */
/** Pés do atirador deitado: [x, z, yaw] (y = GB.fy). */
export const PRONE_FEET = { l: [-0.32, 1.28, 25], r: [0.2, 1.33, -15] };
export const GB = { hy: 0.269, hz: 0.42, hp: 89.2, hyaw: -5.6, s: [-17.4, -15, 4.6], n: -1.9, h: 9.9, hr: -10, fy: 0.067, fz: -0.072, fp: -152.4, ft: 3.2, cr: [49.5, -28.8], cl: [-28.2, 17.8] };
export function gunnerBody({ b = 0, kick = 0, lift = 0 } = {}) {
  const g = GB;
  return {
    hips: { pos: [0.05, g.hy + 0.004 * b, g.hz + 0.01 * kick], rot: { pitch: g.hp, yaw: g.hyaw, roll: 3 } },
    spine: [{ pitch: g.s[0] + 0.6 * b, yaw: 2 }, { pitch: g.s[1] - 4 * lift, yaw: 3 }, { pitch: g.s[2] + 0.6 * b - 4 * lift, yaw: 2 }],
    neck: { pitch: g.n + 10 * lift, yaw: 4 }, head: { pitch: g.h + 14 * lift, yaw: 3, roll: g.hr + 6 * lift },
    clav: { r: { yaw: g.cr[0], roll: g.cr[1] }, l: { yaw: g.cl[0], roll: g.cl[1] } },
    feet: { l: proneFoot(PRONE_FEET.l[0], PRONE_FEET.l[1] + g.fz, PRONE_FEET.l[2], { side: -1, y: g.fy, pitch: g.fp, toe: g.ft }), r: proneFoot(PRONE_FEET.r[0], PRONE_FEET.r[1] + g.fz, PRONE_FEET.r[2], { side: 1, y: g.fy, pitch: g.fp, toe: g.ft }) },
  };
}

/**
 * Arma no bípode: a boca aponta para −Z (yaw/pitch extra em graus), os pés do bípode em `feet` (mundo, y = 0) e o
 * olho em `eye` (mundo) define a inclinação, por iteração, até os pés do bípode tocarem no chão.
 */
export function onBipod(eye, { yaw = 0, rise = 0, back = 0 } = {}) {
  let pitch = 0;
  const at = p => { const w0 = frame([0, 0, 0], [Math.sin(yaw * deg), Math.sin(p), -Math.cos(p)]); return { pos: v3.sub(v3.add(eye, [0, 0, back]), q.rot(w0.rot, S.cheek)), rot: w0.rot }; };
  for (let i = 0; i < 6; i++) pitch += Math.asin(clamp((0 - weaponPoint(at(pitch), S.bipod_feet)[1]) / 0.92, -0.5, 0.5));
  return Object.assign(at(pitch + rise * deg), { pitch: pitch / deg });
}

export const FINGERS_AIM = { r: { curl: 0.75, index: 0.4, thumb: 0.6 }, l: { curl: 0.7, thumb: 0.5 } };
export const POLES = { r: [0.15, -1, 0.05], l: [-0.55, -1, 0.1] };
/** Mãos de pontaria: direita no punho (perfil da MG 34), esquerda por baixo da coronha. */
export const aimHands = w => ({ r: { ...handOn(w, MG34_GRIP.r), pole: POLES.r }, l: { ...handOn(w, BUTT_L), pole: POLES.l } });

/** Pontaria deitada: corpo → olho → arma no bípode → mãos. */
export function gunnerAim(R, o = {}) {
  const body = gunnerBody(o), pre = solve(R, body).W;
  const w = onBipod(pre.eye_r.p, o);
  return Object.assign(solve(R, { ...body, weapon: w, hands: aimHands(w), fingers: FINGERS_AIM }), { w });
}
