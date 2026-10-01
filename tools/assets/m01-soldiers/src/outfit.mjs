// Monta o fardamento de base (sem equipamento) sobre um corpo: pele visível, túnica, calças, aba, gola, cinto,
// calçado. Os estilos (polaco wz.36 / alemão M36) mudam medidas e peças; cores e padrões vêm de paint.mjs.
import { bodyNormals, landmarks, classify, facesWhere, shell, cuffLips, bodyPoints, skinFromBody, orientOutward, smoothedBody } from './garments.mjs';
import { hullRings, frame, loft, hull2, hullRadius, centroid2 } from './geom.mjs';
import { v3, smoothstep, computeNormals } from './meshops.mjs';

const ARM_RE = /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/;
const armW = (h, v) => h.skin[v].reduce((s, [b, w]) => s + (ARM_RE.test(b) ? w : 0), 0);
const legW = (h, v) => h.skin[v].reduce((s, [b, w]) => s + (/^(thigh|calf|foot|ball)_/.test(b) ? w : 0), 0);


/**
 * Caimento do pano: entre A e B (eixo), empurra os pontos para fora até ao casco convexo da secção do corpo
 * (+offset), apagando músculos e reentrâncias como faz um tecido de lã. Devolve adjust(p, peso).
 */
function makeDrape(points, A, B, { levels = 16, slab = 0.012, hint = [0, 0, -1] } = {}) {
  const axis = v3.sub(B, A), len = v3.len(axis), t = v3.norm(axis);
  const hulls = [];
  for (let k = 0; k <= levels; k++) {
    const f = frame(v3.add(A, v3.mul(axis, k / levels)), t, hint);
    let sel = [];
    for (let sl = slab; sel.length < 6 && sl < 0.15; sl *= 1.6) sel = points.filter(p => Math.abs(v3.dot(v3.sub(p, f.o), t)) < sl);
    const h2 = hull2(sel.map(p => { const d = v3.sub(p, f.o); return [v3.dot(d, f.n), v3.dot(d, f.b)]; }));
    hulls.push({ f, h: h2, c: centroid2(h2) });
  }
  return (p, offset, weight = 1) => {
    const u = v3.dot(v3.sub(p, A), t) / len;
    if (u < 0 || u > 1 || weight <= 0) return p;
    const k = Math.min(levels - 1, Math.floor(u * levels)), w = u * levels - k;
    const [h0, h1] = [hulls[k], hulls[k + 1]];
    const f = h0.f, d = v3.sub(p, f.o), x = v3.dot(d, f.n), y = v3.dot(d, f.b);
    const c = [h0.c[0] * (1 - w) + h1.c[0] * w, h0.c[1] * (1 - w) + h1.c[1] * w];
    const a = Math.atan2(y - c[1], x - c[0]), r = Math.hypot(x - c[0], y - c[1]);
    const rh = hullRadius(h0.h, h0.c, a) * (1 - w) + hullRadius(h1.h, h1.c, a) * w + offset;
    if (r >= rh) return p;
    const nr = r + (rh - r) * weight, nx = c[0] + Math.cos(a) * nr, ny = c[1] + Math.sin(a) * nr;
    return v3.add(p, v3.add(v3.mul(f.n, nx - x), v3.mul(f.b, ny - y)));
  };
}


/**
 * Envelope vertical do pano: em colunas (bins na coordenada lateral), a profundidade ao longo de `dir` não pode
 * ficar abaixo do casco convexo superior do perfil (y, profundidade) — o tecido cai a direito do peito ao cinto.
 */
function verticalEnvelope(P, idx, dir, lateral, { bin = 0.014, normalOf, minDot = 0.3, y0, y1, weight = () => 1 }) {
  const cols = new Map();
  for (const i of idx) {
    const p = P[i];
    if (p[1] < y0 || p[1] > y1 || v3.dot(normalOf(i), dir) < minDot) continue;
    const key = Math.round(v3.dot(p, lateral) / bin);
    if (!cols.has(key)) cols.set(key, []);
    cols.get(key).push(i);
  }
  for (const list of cols.values()) {
    const pts = list.map(i => [P[i][1], v3.dot(P[i], dir)]).sort((a, b) => a[0] - b[0]);
    const up = [];
    for (const q of pts) {
      while (up.length >= 2) {
        const [a, b] = [up[up.length - 2], up[up.length - 1]];
        if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= 0) up.pop(); else break;
      }
      up.push(q);
    }
    for (const i of list) {
      const y = P[i][1];
      let k = 0;
      while (k + 1 < up.length && up[k + 1][0] < y) k++;
      const a = up[k], b = up[Math.min(k + 1, up.length - 1)];
      const env = b[0] > a[0] ? a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]) : Math.max(a[1], b[1]);
      const d = v3.dot(P[i], dir);
      if (d < env) P[i] = v3.add(P[i], v3.mul(dir, (env - d) * weight(P[i])));
    }
  }
}

/** Anel fechado (lista de anéis) → banda espessa: exterior e interior ligados em cima e em baixo. */
function band(outerRings, inset) {
  const inner = outerRings.map(r => {
    const c = r.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map(x => x / r.length);
    return r.map(p => { const d = v3.sub(p, c), l = Math.hypot(d[0], d[2]) || 1; return [p[0] - d[0] / l * inset, p[1], p[2] - d[2] / l * inset]; });
  });
  return loft([...outerRings, ...inner.reverse(), outerRings[0]]);
}

export function buildOutfit(h, style) {
  const N = bodyNormals(h), lm = landmarks(h), J = h.joints;
  const cls = classify(h, lm, { collarFront: style.collarFront, collarBack: style.collarBack });
  const parts = [];
  // Pele visível (cabeça, pescoço, mãos): malha própria por variante de rosto.
  const skinFaces = facesWhere(h, cls.skinVisible);

  // Túnica: espessura maior no ventre e nos antebraços (pano largo), menor nos ombros.
  const tunicFaces = facesWhere(h, cls.tunic);
  const tunicT = s => {
    const p = [h.positions[s * 3], h.positions[s * 3 + 1], h.positions[s * 3 + 2]], arm = armW(h, s);
    if (arm > 0.4) return style.sleeve + 0.008 * smoothstep(-0.25, -0.02, cls.t[s]);
    const belly = smoothstep(J.spine_03[1], lm.waistY, p[1]) * (p[2] < J.spine_01[2] ? 1 : 0.4);
    return style.tunic + style.tunicLoose * belly;
  };
  const trunkPts = bodyPoints(h, lm, v => armW(h, v) < 0.3);
  const armpitY = J.upperarm_l[1] - 0.07;
  const torsoDrape = makeDrape(trunkPts.filter(p => p[1] < armpitY + 0.12), [0, lm.waistY - 0.08, J.spine_01[2]], [0, armpitY + 0.1, J.spine_03[2]], { levels: 20, hint: [0, 0, -1] });
  const tunicAdjust = (s, p) => {
    if (armW(h, s) >= 0.35) return p;
    const y = p[1], w = smoothstep(armpitY + 0.08, armpitY - 0.02, y);
    return torsoDrape(p, tunicT(s) * 0.85, w);
  };
  // Cintura apertada pelo cinto: raio-alvo = secção do corpo + folga; o pano acima faz um ligeiro fole.
  const waistDrape = makeDrape(trunkPts, [0, lm.waistY - 0.08, J.hips[2]], [0, lm.waistY + 0.08, J.spine_01[2]], { levels: 8 });
  const cinch = p => {
    const w = 1 - smoothstep(0.012, 0.075, Math.abs(p[1] - lm.waistY));
    if (w <= 0) return p;
    const out = waistDrape(p, style.tunic + 0.004, 1), c = [0, p[1], J.hips[2]];
    const r0 = Math.hypot(p[0] - c[0], p[2] - c[2]), r1 = Math.hypot(out[0] - c[0], out[2] - c[2]), r = r0 + (r1 - r0) * w;
    return r0 > 1e-6 ? [c[0] + (p[0] - c[0]) * r / r0, p[1], c[2] + (p[2] - c[2]) * r / r0] : p;
  };
  const tunicPost = (P, uniq, border, laplace) => {
    const torsoI = uniq.map((s, i) => [s, i]).filter(([s]) => armW(h, s) < 0.35).map(([, i]) => i);
    const torso = new Set(torsoI.map(i => uniq[i]));
    laplace(8, s => torso.has(s) && h.positions[s * 3 + 1] < armpitY + 0.03);   // apaga mamilos e pequenos relevos
    const normalOf = i => [N[uniq[i] * 3], N[uniq[i] * 3 + 1], N[uniq[i] * 3 + 2]];
    const opts = { normalOf, y0: lm.waistY + 0.03, y1: armpitY + 0.06 };
    // Frente/costas só na faixa central; os lados só na faixa lateral — transições suaves entre colunas.
    const central = p => 1 - smoothstep(0.07, 0.115, Math.abs(p[0]));
    const lateralW = p => 1 - smoothstep(0.03, 0.07, Math.abs(p[2] - J.spine_02[2]));
    verticalEnvelope(P, torsoI, [0, 0, -1], [1, 0, 0], { ...opts, weight: central });     // frente: do peito ao cinto
    verticalEnvelope(P, torsoI, [0, 0, 1], [1, 0, 0], { ...opts, weight: central });      // costas: das omoplatas ao cinto
    verticalEnvelope(P, torsoI, [1, 0, 0], [0, 0, 1], { ...opts, minDot: 0.5, weight: lateralW });
    verticalEnvelope(P, torsoI, [-1, 0, 0], [0, 0, 1], { ...opts, minDot: 0.5, weight: lateralW });
    laplace(4, s => torso.has(s) && h.positions[s * 3 + 1] < armpitY + 0.03);
    for (const i of torsoI) P[i] = cinch(P[i]);
  };
  // Tronco sem mamilos, abdominais nem costelas (só para a túnica); ombros e braços ficam como estão.
  const torsoBase = smoothedBody(h, v => armW(h, v) < 0.25 && h.positions[v * 3 + 1] > lm.waistY - 0.1 && h.positions[v * 3 + 1] < armpitY + 0.04, 40);
  const tunic = shell(h, tunicFaces, bodyNormals(h, torsoBase), tunicT, { base: torsoBase, iterations: 14, adjust: tunicAdjust, post: tunicPost,
    minFn: s => armW(h, s) < 0.35 ? 0.003 : Math.min(tunicT(s), 0.008) });
  tunic.name = 'tunic'; tunic.paint = 'tunic';
  parts.push(tunic);
  const cuffs = cuffLips(h, tunic, v => cls.t[v] > -0.2 && armW(h, v) > 0.4);
  cuffs.name = 'tunic_cuffs'; cuffs.paint = 'tunic_inner'; parts.push(cuffs);

  // Calças: das ancas aos tornozelos; mais largas nas coxas (estilo).
  const cutY = Math.max(...['l', 'r'].map(side => v3.lerp(J[`foot_${side}`], J[`calf_${side}`], style.trouserCut)[1]));
  const legMask = cls.legs.map((m, v) => m && h.positions[v * 3 + 1] > cutY ? 1 : 0);
  const legFaces = h.base.faces.filter(f => f.group === 'body' && f.v.every(v => legMask[v]) );
  const legT = s => {
    const y = h.positions[s * 3 + 1], knee = J.calf_l[1];
    return style.trousers + style.thighLoose * smoothstep(knee + 0.05, knee + 0.25, y) * smoothstep(lm.crotchY + 0.08, lm.crotchY - 0.05, y) + 0.004;
  };
  const legDrapes = ['l', 'r'].map(side => makeDrape(bodyPoints(h, lm, v => legW(h, v) > 0.45 && Math.sign(h.positions[v * 3]) === Math.sign(J[`thigh_${side}`][0])),
    v3.add(J[`thigh_${side}`], [0, -0.03, 0]), J[`foot_${side}`], { levels: 24 }));
  const legAdjust = (s, p) => {
    if (legW(h, s) < 0.45) return p;
    return legDrapes[p[0] < 0 ? 0 : 1](p, legT(s) * 0.9, 1);
  };
  const trousers = shell(h, legFaces, N, legT, { iterations: 10, adjust: legAdjust });
  trousers.name = 'trousers'; trousers.paint = 'trousers';
  parts.push(trousers);

  // Aba da túnica (abaixo do cinto até à bainha), em loft por secções que unem as duas coxas.
  const hemY = lm.crotchY + style.hem;
  const skirtLevels = 7, sframes = [];
  for (let k = 0; k <= skirtLevels; k++) { const y = lm.waistY + 0.012 - (lm.waistY + 0.012 - hemY) * k / skirtLevels; sframes.push(frame([0, y, J.hips[2]], [0, -1, 0])); }
  const skirtRings = hullRings(trunkPts, sframes, { slab: 0.012, segments: 40, offset: (a, k) => style.tunic + 0.012 + style.skirtFlare * (k / skirtLevels) });
  const skirt = loft(skirtRings); skirt.name = 'tunic_skirt'; skirt.paint = 'tunic';
  orientOutward(skirt, p => [0, p[1], J.hips[2]]);
  skinFromBody(h, lm, skirt, v => armW(h, v) < 0.3 && h.positions[v * 3 + 1] > lm.crotchY - 0.12);
  parts.push(skirt);

  // Cinto principal (couro): banda espessa à cintura, sobre a túnica.
  const beltFrames = [-0.024, 0.024].map(dy => frame([0, lm.waistY + dy, J.hips[2]], [0, 1, 0]));
  const waistShell = tunic.shellPos.filter((p, i) => armW(h, tunic.uniq[i]) < 0.35 && Math.abs(p[1] - lm.waistY) < 0.035);
  const skirtTop = hullRings(trunkPts, [frame([0, lm.waistY + 0.012, J.hips[2]], [0, -1, 0])], { slab: 0.012, segments: 40, offset: style.tunic + 0.012 })[0];
  const beltRings = hullRings([...waistShell, ...skirtTop], beltFrames, { slab: 0.03, segments: 40, offset: 0.004 });
  const belt = band(beltRings, 0.006); belt.name = 'belt'; belt.paint = 'belt';
  orientOutward(belt, p => [0, p[1], J.hips[2]]);
  skinFromBody(h, lm, belt, v => armW(h, v) < 0.3 && Math.abs(h.positions[v * 3 + 1] - lm.waistY) < 0.08);
  parts.push(belt);

  // Gola: banda inclinada (mais baixa à frente), do bordo da túnica até ~4 cm acima.
  const neckPts = bodyPoints(h, lm, v => Math.abs(h.positions[v * 3 + 1] - (J.neck[1] + 0.03)) < 0.03 && armW(h, v) < 0.2 && Math.abs(h.positions[v * 3]) < 0.09);
  const nf = [frame([0, J.neck[1] + 0.03, J.neck[2]], [0, 1, 0])];
  const base = hullRings(neckPts, nf, { slab: 0.03, segments: 32, offset: 0 })[0];
  const nz = J.neck[2];
  const collarY = z => J.neck[1] + (style.collarFront + style.collarBack) / 2 + Math.max(-1, Math.min(1, (z - nz) / 0.065)) * (style.collarBack - style.collarFront) / 2;
  const ring = (dr, dy) => base.map(p => { const d = v3.sub(p, [0, p[1], nz]), l = Math.hypot(d[0], d[2]) || 1; const q = [p[0] + d[0] / l * dr, 0, p[2] + d[2] / l * dr]; q[1] = collarY(q[2]) + dy; return q; });
  const collar = band([ring(0.011, -0.025), ring(0.009, -0.004), ring(0.014, style.collarHeight)], 0.005); collar.name = 'collar'; collar.paint = 'collar';
  orientOutward(collar, p => [0, p[1], nz]);
  skinFromBody(h, lm, collar, v => Math.abs(h.positions[v * 3 + 1] - J.neck[1]) < 0.12 && armW(h, v) < 0.5);
  parts.push(collar);

  // Calçado: bota de couro (sola plana) e cano (alto alemão / curto polaco) + perneiras polacas.
  for (const s of ['l', 'r']) {
    const ankle = J[`foot_${s}`], ball = J[`ball_${s}`];
    const fwd = v3.norm([ball[0] - ankle[0], 0, ball[2] - ankle[2]]), lat = v3.norm(v3.cross([0, 1, 0], fwd));
    const footPts = bodyPoints(h, lm, v => cls.foot[v] && Math.sign(h.positions[v * 3]) === Math.sign(ankle[0]));
    const along = footPts.map(p => v3.dot(v3.sub(p, ankle), fwd)), side = footPts.map(p => v3.dot(v3.sub(p, ankle), lat));
    const heelBack = Math.min(...along) - 0.012, toeTip = Math.max(...along) + 0.016, L = toeTip - heelBack;
    const footW = Math.max(...footPts.map((p, i) => Math.abs(along[i] - (Math.max(...along) - 0.07)) < 0.03 ? Math.abs(side[i] - side.reduce((a, b) => a + b) / side.length) : 0)) * 2;
    const O = v3.add([ankle[0], 0, ankle[2]], v3.mul(fwd, heelBack));
    // Perfil (t ao longo do pé, largura, altura do cabedal) de uma bota militar de cano e biqueira arredondada.
    const prof = [[0, 0.064, 0.085], [0.06, 0.074, 0.105], [0.2, 0.08, 0.12], [0.38, 0.088, 0.095], [0.58, 0.098, 0.07], [0.75, 0.104, 0.058], [0.88, 0.098, 0.05], [0.96, 0.08, 0.042], [1, 0.045, 0.03]];
    const wScale = Math.max(0.9, Math.min(1.25, (footW + 0.02) / 0.1));
    const latCenter = t => { const sel = footPts.map((p, i) => [along[i], side[i]]).filter(([a]) => Math.abs((a - heelBack) / L - t) < 0.08); return sel.length ? sel.reduce((q, [, b]) => q + b, 0) / sel.length : 0; };
    const sp = (x, e) => Math.sign(x) * Math.abs(x) ** e;
    const ringAt = ([t, w, hh], y0, grow = 0) => {
      const c = v3.add(O, v3.add(v3.mul(fwd, t * L), v3.mul(lat, latCenter(Math.min(0.95, Math.max(0.05, t))))));
      const r = [];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, x = sp(Math.cos(a), 0.7) * (w * wScale / 2 + grow), y = y0 + (hh - y0) * (0.5 + 0.5 * sp(Math.sin(a), 0.55));
        r.push(v3.add(c, v3.add(v3.mul(lat, x), [0, y + grow * 0.3 * Math.sin(a), 0])));
      }
      return r;
    };
    const solePlate = t => (t < 0.28 ? 0.03 : 0.016);
    const upper = loft(prof.map(q => ringAt(q, solePlate(q[0]) - 0.004)), { caps: 'both' });
    upper.name = `boot_${s}`; upper.paint = 'boot'; orientOutward(upper);
    const sole = loft(prof.map(q => ringAt([q[0], q[1], solePlate(q[0])], 0, 0.004)), { caps: 'both' });
    sole.name = `boot_sole_${s}`; sole.paint = 'sole'; orientOutward(sole);
    for (const part of [upper, sole]) {
      // Calcanhar e sola seguem o pé; a biqueira dobra com o osso dos dedos.
      part.skin = [];
      for (let i = 0; i < part.positions.length / 3; i++) {
        const p = [part.positions[i * 3], part.positions[i * 3 + 1], part.positions[i * 3 + 2]], t = (v3.dot(v3.sub(p, O), fwd)) / L;
        const toe = smoothstep(0.62, 0.8, t);
        const calf = (1 - smoothstep(0.06, 0.12, p[1])) < 1 ? smoothstep(0.08, 0.13, p[1]) * (1 - smoothstep(0.25, 0.4, t)) : 0;
        part.skin.push([[`foot_${s}`, (1 - toe) * (1 - calf)], [`ball_${s}`, toe], [`calf_${s}`, calf]].filter(e => e[1] > 0.001));
      }
      parts.push(part);
    }
    // Cano: do tornozelo à altura do estilo, por secções do corpo ao longo da perna.
    const knee = J[`calf_${s}`];
    const top = v3.lerp(ankle, knee, style.shaftTop), bottom = v3.add(ankle, [0, -0.03, 0]);
    const legPts = bodyPoints(h, lm, v => legW(h, v) > 0.5 && Math.sign(h.positions[v * 3]) === Math.sign(ankle[0]));
    const shaftFrames = [];
    for (let k = 0; k <= 6; k++) shaftFrames.push(frame(v3.lerp(bottom, top, k / 6), v3.sub(top, bottom), [0, 0, -1]));
    const shaftRings = hullRings(legPts, shaftFrames, { slab: 0.015, segments: 28, offset: (a, k) => style.shaftRoom + 0.004 * k / 6 });
    const shaft = band([...shaftRings].reverse(), 0.004); shaft.name = `boot_shaft_${s}`; shaft.paint = 'boot';
    orientOutward(shaft, p => { const t = v3.dot(v3.sub(p, bottom), v3.norm(v3.sub(top, bottom))); return v3.add(bottom, v3.mul(v3.norm(v3.sub(top, bottom)), t)); });
    skinFromBody(h, lm, shaft, v => legW(h, v) > 0.5 && h.positions[v * 3 + 1] < knee[1] + 0.02);
    parts.push(shaft);
    if (style.puttees) {
      const pTop = v3.lerp(ankle, knee, 0.8), pBottom = v3.lerp(ankle, knee, 0.1);
      const pf = []; for (let k = 0; k <= 8; k++) pf.push(frame(v3.lerp(pBottom, pTop, k / 8), v3.sub(pTop, pBottom), [0, 0, -1]));
      const pr = hullRings(legPts, pf, { slab: 0.015, segments: 28, offset: (a, k) => style.trousers + 0.016 + 0.004 * Math.sin(Math.PI * k / 8) });
      const puttee = band([...pr].reverse(), 0.005); puttee.name = `puttee_${s}`; puttee.paint = 'puttee';
      orientOutward(puttee, p => { const ax = v3.norm(v3.sub(pTop, pBottom)), t = v3.dot(v3.sub(p, pBottom), ax); return v3.add(pBottom, v3.mul(ax, t)); });
      skinFromBody(h, lm, puttee, v => legW(h, v) > 0.5 && h.positions[v * 3 + 1] < knee[1] + 0.03);
      parts.push(puttee);
    }
  }
  return { parts, skinFaces, cls, lm, N };
}

export const STYLES = {
  // Polaco 1939: túnica wz.36 (ou anterior) cáqui, calças rectas com perneiras e botas curtas (trzewiki).
  pl: { tunic: 0.011, tunicLoose: 0.018, sleeve: 0.012, trousers: 0.009, thighLoose: 0.016, hem: -0.035, skirtFlare: 0.022,
    collarFront: -0.012, collarBack: 0.022, collarHeight: 0.026, shaftTop: 0.22, trouserCut: 0.62, shaftRoom: 0.01, puttees: true },
  // Alemão 1939: túnica M36 cinza-campo, calças rectas e botas altas (Marschstiefel).
  de: { tunic: 0.011, tunicLoose: 0.016, sleeve: 0.012, trousers: 0.008, thighLoose: 0.01, hem: -0.03, skirtFlare: 0.02,
    collarFront: -0.012, collarBack: 0.02, collarHeight: 0.028, shaftTop: 0.8, trouserCut: 0.68, shaftRoom: 0.016, puttees: false },
};
