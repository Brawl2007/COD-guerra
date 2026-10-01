// Cabeças: variantes de rosto (alvos CC0 do MakeHuman só na cabeça), olhos, casca de cabelo e máscaras de
// regiões do rosto (lábios, sobrancelhas, orelhas, nariz, pálpebras, barba, cabelo) para a pintura.
import { buildHuman } from './human.mjs';
import { loadTarget } from './mh.mjs';
import { fromBase, computeNormals, v3, smoothstep } from './meshops.mjs';
import { bodyNormals, classify, landmarks, facesWhere, shell, orientOutward } from './garments.mjs';
import { lathe } from './geom.mjs';

const ARM = /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/;

/** Magnitude normalizada (0..1) de um ou mais alvos por vértice original. */
function targetMask(n, rels) {
  const m = new Float64Array(n);
  for (const rel of rels) {
    const { idx, d } = loadTarget(rel);
    let max = 0;
    const mag = new Float64Array(idx.length);
    for (let k = 0; k < idx.length; k++) { mag[k] = Math.hypot(d[k * 3], d[k * 3 + 1], d[k * 3 + 2]); max = Math.max(max, mag[k]); }
    for (let k = 0; k < idx.length; k++) m[idx[k]] = Math.max(m[idx[k]], mag[k] / max);
  }
  return m;
}

/** Máscaras de regiões do rosto por vértice original e marcos (metros) da cabeça. */
export function faceRegions(h) {
  const n = h.base.vertexCount, P = i => [h.positions[i * 3], h.positions[i * 3 + 1], h.positions[i * 3 + 2]];
  const raw = {
    lips: targetMask(n, ['mouth/mouth-upperlip-volume-incr.target', 'mouth/mouth-lowerlip-volume-incr.target']),
    brows: targetMask(n, ['eyebrows/eyebrows-trans-up.target']),
    ears: targetMask(n, ['ears/l-ear-scale-incr.target', 'ears/r-ear-scale-incr.target']),
    nose: targetMask(n, ['nose/nose-scale-horiz-incr.target']),
    lids: targetMask(n, ['eyes/l-eye-height2-incr.target', 'eyes/r-eye-height2-incr.target']),
    cheeks: targetMask(n, ['cheek/l-cheek-volume-incr.target', 'cheek/r-cheek-volume-incr.target']),
    philtrum: targetMask(n, ['mouth/mouth-philtrum-volume-incr.target']),
  };
  const head = h.headWeight;
  const centroid = (mask, thr) => { const c = [0, 0, 0]; let s = 0; for (let i = 0; i < n; i++) if (mask[i] > thr) { const p = P(i); c[0] += p[0] * mask[i]; c[1] += p[1] * mask[i]; c[2] += p[2] * mask[i]; s += mask[i]; } return c.map(x => x / s); };
  const eyeC = side => { const c = [0, 0, 0]; let k = 0; for (const f of h.base.faces) if (f.group === `helper-${side}-eye`) for (const v of f.v) { const p = P(v); c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; k++; } return c.map(x => x / k); };
  const eyeL = eyeC('l'), eyeR = eyeC('r'), eyeMid = v3.lerp(eyeL, eyeR, 0.5);
  const mouth = centroid(raw.lips, 0.4);
  let top = -Infinity, chinY = Infinity;
  for (let i = 0; i < n; i++) if (head[i] > 0.9) { const p = P(i); top = Math.max(top, p[1]); if (Math.abs(p[0]) < 0.02 && p[2] < eyeMid[2]) chinY = Math.min(chinY, p[1]); }
  const earC = centroid(raw.ears, 0.5);
  const lm = { eyeL, eyeR, eyeMid, mouth, top, chinY, earY: earC[1], headZ: h.joints.head[2] };

  // Linha do cabelo (corte militar curto): testa alta, têmporas, por cima das orelhas, nuca baixa.
  const hair = new Float64Array(n), beard = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (head[i] < 0.2) continue;
    const p = P(i), dz = p[2] - lm.headZ, az = Math.atan2(Math.abs(p[0]), -dz);   // 0 = frente, π = nuca
    const line = az < 0.6 ? eyeMid[1] + 0.058 - az * 0.02
      : az < 1.45 ? eyeMid[1] + 0.046 - (az - 0.6) / 0.85 * 0.04
        : az < 2.1 ? eyeMid[1] + 0.006 - (az - 1.45) / 0.65 * 0.03
          : eyeMid[1] - 0.024 - (az - 2.1) / 1.04 * 0.045;
    const earGap = smoothstep(0.25, 0.6, raw.ears[i]);
    hair[i] = smoothstep(line - 0.004, line + 0.012, p[1]) * (1 - earGap) * smoothstep(0.2, 0.6, head[i]);
    // Barba: queixo, maxilar e bigode (abaixo do nariz), sem lábios; desce um pouco pelo pescoço.
    const below = smoothstep(mouth[1] + 0.035, mouth[1] + 0.015, p[1]);
    const front = smoothstep(lm.headZ + 0.03, lm.headZ - 0.02, p[2]);
    const jawLine = smoothstep(lm.earY - 0.005, lm.earY - 0.03, p[1]) * smoothstep(1.9, 1.5, az);
    beard[i] = Math.max(below * front, jawLine * smoothstep(chinY - 0.045, chinY - 0.005, p[1])) * (1 - smoothstep(0.3, 0.6, raw.lips[i])) * (1 - hair[i]);
  }
  const masks = {
    lips: raw.lips.map(x => smoothstep(0.3, 0.65, x)),
    brows: raw.brows.map((x, i) => { const p = P(i); const above = p[1] - eyeMid[1]; return smoothstep(0.35, 0.8, x) * smoothstep(0.011, 0.016, above) * smoothstep(0.03, 0.023, above) * smoothstep(0.012, 0.022, Math.abs(p[0])); }),
    ears: raw.ears.map(x => smoothstep(0.2, 0.6, x)), nose: raw.nose.map(x => smoothstep(0.2, 0.7, x)),
    lids: raw.lids.map(x => smoothstep(0.25, 0.7, x)), cheeks: raw.cheeks.map(x => smoothstep(0.3, 0.8, x)),
    // Bigode: faixa entre o lábio superior e a base do nariz, à frente.
    moustache: raw.philtrum.map((x, i) => { const p = P(i), dy = p[1] - mouth[1]; return smoothstep(0.003, 0.007, dy) * smoothstep(0.024, 0.016, dy) * smoothstep(0.032, 0.024, Math.abs(p[0])) * smoothstep(lm.headZ - 0.05, lm.headZ - 0.07, p[2]) * (1 - smoothstep(0.35, 0.6, raw.lips[i])) * (1 - smoothstep(0.5, 0.8, raw.nose[i])); }),
    hair, beard,
  };
  return { masks, lm };
}

/**
 * Variante de cabeça: corpo com alvos do rosto (mascarados para a cabeça) → malha da cabeça/pescoço com os
 * atributos de pintura, olhos e casca de cabelo. h0 é o corpo base (esqueleto e pesos partilhados).
 */
export function buildHead(h0, macro, variant, style) {
  const hv = buildHuman({ macro, face: variant.targets ?? [] });
  const lm0 = landmarks(h0), cls = classify(h0, lm0, { collarFront: style.collarFront, collarBack: style.collarBack });
  const arm = h0.skin.map(l => l.reduce((s, [b, w]) => s + (ARM.test(b) ? w : 0), 0));
  const headMask = cls.skinVisible.map((m, v) => m && arm[v] < 0.4 ? 1 : 0);
  const faces = facesWhere(h0, headMask);
  const { masks, lm } = faceRegions(hv);
  const head = computeNormals(fromBase(hv, faces));
  head.skin = head.src.map(s => h0.skin[s]);
  head.attrs = Object.fromEntries(Object.entries(masks).map(([k, m]) => [k, Float32Array.from(head.src, s => m[s])]));
  head.name = `head_${variant.id}`; head.paint = `head:${variant.id}`; head.texel = 2.6;

  // Cabelo: casca de 1–5 mm onde a máscara é > 0 (mais espessa no topo), pintada com o mesmo cabelo.
  const hairFaces = hv.base.faces.filter(f => f.group === 'body' && f.v.some(v => masks.hair[v] > 0.12) && f.v.every(v => headMask[v]));
  const N = bodyNormals(hv);
  // Na orla a casca afunda sob a pele (o couro cabeludo pintado faz a transição), sem degraus na linha do cabelo.
  const thick = s => -0.0012 + (0.0027 + (variant.hairLength ?? 0.004) * smoothstep(lm.eyeMid[1] - 0.02, lm.top - 0.02, hv.positions[s * 3 + 1])) * smoothstep(0.1, 0.6, masks.hair[s]);
  const hair = shell(hv, hairFaces, N, thick, { iterations: 2, minFn: s => thick(s) * 0.8 });
  computeNormals(hair);
  hair.skin = hair.src.map(() => [['head', 1]]);
  hair.attrs = { hair: Float32Array.from(hair.src, s => masks.hair[s]) };
  hair.name = `hair_${variant.id}`; hair.paint = `hair:${variant.id}`; hair.texel = 1.2;

  // Olhos: esferas ajustadas aos ajudantes hm08 (centro e raio médios), pólo da íris virado para a frente.
  const eyes = ['l', 'r'].map(side => {
    const vs = new Set();
    for (const f of hv.base.faces) if (f.group === `helper-${side}-eye`) f.v.forEach(v => vs.add(v));
    const pts = [...vs].map(i => [hv.positions[i * 3], hv.positions[i * 3 + 1], hv.positions[i * 3 + 2]]);
    const c = pts.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map(x => x / pts.length);
    const r = pts.reduce((s, p) => s + v3.dist(p, c), 0) / pts.length;
    const eye = lathe((t, phi) => {
      const th = t * Math.PI, rr = r * Math.sin(th);
      return [c[0] + Math.cos(phi) * rr, c[1] + Math.sin(phi) * rr, c[2] - r * Math.cos(th)];
    }, { rings: 10, segments: 16 });
    eye.name = `eye_${side}_${variant.id}`; eye.paint = `eye:${variant.id}`; eye.texel = 3;
    eye.skin = Array.from({ length: eye.positions.length / 3 }, () => [['head', 1]]);
    eye.size = [2 * Math.PI * r, Math.PI * r];
    orientOutward(eye, c);
    computeNormals(eye, null);
    return eye;
  });
  return { head, hair, eyes, lm, hv };
}

/** Mãos (partilhadas por todas as variantes): pele visível com peso de braço. */
export function buildHands(h0, style) {
  const lm0 = landmarks(h0), cls = classify(h0, lm0, { collarFront: style.collarFront, collarBack: style.collarBack });
  const arm = h0.skin.map(l => l.reduce((s, [b, w]) => s + (ARM.test(b) ? w : 0), 0));
  const faces = facesWhere(h0, cls.skinVisible.map((m, v) => m && arm[v] >= 0.4 ? 1 : 0));
  const hands = computeNormals(fromBase(h0, faces));
  hands.skin = hands.src.map(s => h0.skin[s]);
  // Unhas: pontas dos dedos (osso distal) do lado dorsal; nós dos dedos.
  const tip = h0.skin.map(l => l.reduce((s, [b, w]) => s + (/_03_/.test(b) ? w : 0), 0));
  hands.attrs = { tip: Float32Array.from(hands.src, s => tip[s]) };
  hands.name = 'hands'; hands.paint = 'hands'; hands.texel = 1.4;
  return hands;
}
