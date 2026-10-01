// Equipamento original de 1939 em loft/torno, ajustado ao corpo de base:
//  PL: capacete wz.31 (e capa de lona do sapador), rogatywka wz.37, cartucheiras de couro, bornal wz.33, cantil,
//      bolsa da máscara WSR wz.32 com correia, pá, bolsa de sapador, coldre da Vis wz.35, divisas nas platinas.
//  DE: capacete M35 (sem decalques), suspensórios em Y, 2×3 cartucheiras, Brotbeutel, cantil M31, lata canelada
//      da máscara, pá. Cada peça indica o osso rígido (`bone`) ou pede pesos do corpo (`skinFrom`).
import { lathe, loft, roundedBox, cylinder, strap, place, axesFrom } from './geom.mjs';
import { orientOutward, skinFromBody } from './garments.mjs';
import { v3, smoothstep, pointGrid, computeNormals } from './meshops.mjs';

const tag = (part, name, paint, extra = {}) => Object.assign(part, { name, paint }, extra);

/** Elipsóide do crânio (só acima das sobrancelhas: sem nariz nem orelhas) com folga para o cabelo. */
export function headFit(h, hair = 0.008) {
  const pts = [];
  for (let i = 0; i < h.base.vertexCount; i++) if (h.headWeight[i] > 0.5) pts.push([h.positions[i * 3], h.positions[i * 3 + 1], h.positions[i * 3 + 2]]);
  const top = Math.max(...pts.map(p => p[1])), skull = pts.filter(p => p[1] > top - 0.085);
  const zs = skull.map(p => p[2]), cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const c = [0, top - 0.095, cz];
  const ax = Math.max(...skull.map(p => Math.abs(p[0]))), az = (Math.max(...zs) - Math.min(...zs)) / 2, ay = top - c[1];
  let s = 0;
  for (const p of skull) s = Math.max(s, Math.hypot(p[0] / ax, (p[1] - c[1]) / ay, (p[2] - c[2]) / az));
  return { c, ax: ax * s + hair, ay: ay * s + hair, az: az * s + hair, top, pts };
}

/**
 * Casco por azimute: cúpula elipsoidal (θ ≤ π/2) que continua em paredes quase verticais até θmax(φ), depois
 * aba/saia flare(φ, u) → [para fora, para baixo]. φ = 0 à frente (−Z), φ > 0 para a esquerda do soldado (−X).
 * gap: folga do forro entre o crânio (com cabelo) e o interior do capacete.
 */
function shellHelmet(fit, { thetaMax, flare, rings = 14, segments = 40, thickness = 0.0025, gap = 0.012, taper = 0.12 }) {
  const { c } = fit, A = [fit.ax + gap, fit.ay + gap, fit.az + gap];
  const pt = (th, phi, off = 0) => {
    const dir = [-Math.sin(phi), 0, -Math.cos(phi)];
    const rad = th <= Math.PI / 2 ? Math.sin(th) : 1 + (th - Math.PI / 2) * taper;
    const y = th <= Math.PI / 2 ? Math.cos(th) * (A[1] + off) : -(th - Math.PI / 2) * A[1];
    return [c[0] + rad * (A[0] + off) * dir[0], c[1] + y, c[2] + rad * (A[2] + off) * dir[2]];
  };
  const outer = [], inner = [], nRim = 5;
  for (let k = 0; k <= rings + nRim; k++) {
    const ro = [], ri = [];
    for (let i = 0; i < segments; i++) {
      const phi = (i / segments) * Math.PI * 2 - Math.PI, tm = thetaMax(phi);
      if (k <= rings) {
        const th = Math.max(0.02, tm * k / rings);
        ro.push(pt(th, phi, thickness)); ri.push(pt(th, phi, 0));
      } else {
        const u = (k - rings) / nRim, [out, down] = flare(phi, u);
        const e = pt(tm, phi, thickness), e0 = pt(tm, phi, 0), dir = [-Math.sin(phi), 0, -Math.cos(phi)];
        ro.push(v3.add(e, [dir[0] * out, -down, dir[2] * out])); ri.push(v3.add(e0, [dir[0] * (out - thickness * 0.3), -down + thickness * 0.6, dir[2] * (out - thickness * 0.3)]));
      }
    }
    outer.push(ro); inner.push(ri);
  }
  const shell = loft([...outer, ...inner.slice().reverse()], { caps: 'both' });
  orientOutward(shell, c);
  return shell;
}

/** Capacete polaco wz.31: cúpula alta e arredondada, aba estreita e regular, um pouco mais longa atrás. */
export function helmetWz31(fit) {
  const thetaMax = phi => { const b = (1 - Math.cos(phi)) / 2; return 1.5 + 0.42 * Math.sqrt(b) + 0.2 * b; };
  const flare = (phi, u) => { const back = (1 - Math.cos(phi)) / 2; return [u * (0.012 + 0.006 * back), u * (0.005 + 0.003 * back) + u * u * 0.002]; };
  const h = shellHelmet(fit, { thetaMax, flare, thickness: 0.003 });
  return tag(h, 'helmet_wz31', 'helmet', { bone: 'head', texel: 0.8 });
}
/** Capa de lona sobre o wz.31 (sapadores): ligeiramente maior, com prega na aba. */
export function helmetCoverWz31(fit) {
  const thetaMax = phi => { const b = (1 - Math.cos(phi)) / 2; return 1.51 + 0.42 * Math.sqrt(b) + 0.2 * b; };
  const flare = (phi, u) => { const back = (1 - Math.cos(phi)) / 2; return [u * (0.015 + 0.006 * back), u * (0.007 + 0.003 * back) + Math.sin(phi * 9) * 0.001 * u]; };
  const h = shellHelmet(fit, { thetaMax, flare, thickness: 0.002, gap: 0.0155 });
  return tag(h, 'helmet_cover_wz31', 'canvas', { bone: 'head', texel: 0.8 });
}
/** Capacete alemão M35: cúpula, degrau na testa, pala curta à frente e saia evasada nos lados e atrás. */
export function helmetM35(fit) {
  // Cúpula até à testa à frente, mais funda dos lados (orelhas) e atrás; saia evasada e pala curta.
  const thetaMax = phi => 1.47 + 0.5 * smoothstep(0.35, 1.3, Math.abs(phi)) + 0.12 * smoothstep(2.0, 3.1, Math.abs(phi));
  const flare = (phi, u) => {
    const side = smoothstep(0.45, 1.3, Math.abs(phi)), back = smoothstep(1.8, 3.1, Math.abs(phi));
    const out = 0.016 + 0.012 * side + 0.004 * back, down = 0.004 + 0.024 * side;
    return [out * Math.sin(u * Math.PI / 2) ** 1.3, down * u ** 0.8];
  };
  const h = shellHelmet(fit, { thetaMax, flare, thickness: 0.003, gap: 0.013, taper: 0.18 });
  return tag(h, 'helmet_m35', 'helmet', { bone: 'head', texel: 0.8 });
}
/** Forro e francalete (couro) comuns: anel interior + tira do queixo. */
export function helmetLiner(fit, name, chin) {
  const parts = [];
  const ring = [];
  for (let k = 0; k <= 1; k++) {
    const r = [];
    for (let i = 0; i < 32; i++) {
      const phi = (i / 32) * Math.PI * 2, y = fit.c[1] + 0.02 - k * 0.03;
      r.push([fit.c[0] - Math.sin(phi) * (fit.ax + 0.004), y, fit.c[2] - Math.cos(phi) * (fit.az + 0.004)]);
    }
    ring.push(r);
  }
  const liner = loft(ring); orientOutward(liner, p => [fit.c[0], p[1], fit.c[2]]);
  parts.push(tag(liner, `${name}_liner`, 'helmet_inner', { bone: 'head', texel: 0.4 }));
  // Francalete em U: das orelhas, pelo maxilar, por baixo do queixo; empurrado para fora da pele (4 mm).
  const earY = fit.c[1] - 0.035, earZ = fit.c[2] + 0.012, key = [];
  for (const sgn of [-1, 1]) key.push([sgn * (fit.ax - 0.002), earY, earZ], [sgn * 0.052, chin.y + 0.03, chin.z + 0.045]);
  const ctrl = [key[0], key[1], [0, chin.y - 0.007, chin.z + 0.012], key[3], key[2]];
  const full = [];
  for (let k = 0; k + 1 < ctrl.length; k++) for (let s = 0; s < 6; s++) {
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)], t = s / 6;
    full.push([0, 1, 2].map(i => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t * t * t)));
  }
  full.push(ctrl.at(-1));
  for (let it = 0; it < 4; it++) for (const p of full) {
    let best = null, bd = Infinity;
    for (const q of fit.pts) { const d = v3.dist(p, q); if (d < bd) { bd = d; best = q; } }
    if (bd < 0.005) { const dir = v3.norm(v3.sub(p, best)); p[0] += dir[0] * (0.005 - bd); p[1] += dir[1] * (0.005 - bd); p[2] += dir[2] * (0.005 - bd); }
  }
  parts.push(tag(strap(full, full.map(p => v3.norm([p[0], p[1] < chin.y + 0.01 ? -1 : 0, p[2] - fit.c[2] + 0.03])), { width: 0.014, thickness: 0.0025 }), `${name}_chinstrap`, 'leather', { bone: 'head', texel: 0.4 }));
  return parts;
}

/** Rogatywka wz.37 de campanha: cinta, copa quadrada de quatro bicos, pala de pano e águia de metal. */
export function capWz37(fit) {
  const parts = [], { c } = fit;
  const base = c[1] - 0.002;
  const ell = (y, sx, sz, sq = 0, lift = 0) => {
    const r = [];
    for (let i = 0; i < 40; i++) {
      const phi = (i / 40) * Math.PI * 2, cphi = Math.cos(phi), sphi = Math.sin(phi);
      // sq > 0 aproxima de um quadrado rodado 45° (bicos à frente, atrás e aos lados).
      const k = 1 + sq * (Math.abs(Math.cos(2 * phi)) ** 6) * 0.35;
      r.push([-sphi * fit.ax * sx * k, y + lift * (Math.abs(Math.cos(2 * phi)) ** 6), -cphi * fit.az * sz * k + (fit.c[2] - c[2])]);
    }
    return r.map(p => [p[0], p[1], p[2] + c[2]]);
  };
  const bandRings = [ell(base - 0.03, 1.02, 1.02), ell(base + 0.005, 1.03, 1.03)];
  const crownRings = [ell(base + 0.005, 1.03, 1.03), ell(base + 0.035, 1.1, 1.08, 0.6), ell(base + 0.06, 1.12, 1.1, 1, 0.006), ell(base + 0.068, 0.9, 0.9, 1, 0.004), ell(base + 0.07, 0.3, 0.3, 1)];
  const band = loft(bandRings); orientOutward(band, p => [c[0], p[1], c[2]]);
  parts.push(tag(band, 'cap_wz37_band', 'cap_band', { bone: 'head', texel: 0.8 }));
  const crown = loft(crownRings, { caps: 'end' }); orientOutward(crown, p => [c[0], p[1] - 0.02, c[2]]);
  parts.push(tag(crown, 'cap_wz37_crown', 'cap', { bone: 'head', texel: 0.8 }));
  // Pala (pano endurecido): meia-lua à frente, inclinada para baixo.
  const visor = [];
  for (let k = 0; k <= 2; k++) {
    const r = [];
    for (let i = 0; i <= 16; i++) {
      const phi = -0.95 + 1.9 * i / 16, rr = 1.02 + k * 0.022 * Math.cos(phi * 1.4);
      r.push([-Math.sin(phi) * fit.ax * rr, base - 0.03 - k * 0.009, c[2] - Math.cos(phi) * fit.az * rr - k * 0.012 * Math.cos(phi)]);
    }
    visor.push(r);
  }
  const vz = loft(visor, { closed: false });
  const vb = loft(visor.map(r => r.map(p => [p[0], p[1] - 0.003, p[2]])).reverse(), { closed: false });
  parts.push(tag(vz, 'cap_wz37_visor', 'cap', { bone: 'head', texel: 0.6 }), tag(vb, 'cap_wz37_visor_under', 'cap', { bone: 'head', texel: 0.3 }));
  // Águia (placa estilizada) na frente da cinta.
  const eagle = roundedBox([0.024, 0.026, 0.003], { r: 0.006, segments: 12, rings: 2 });
  parts.push(tag(place(eagle, [0, base - 0.012, c[2] - fit.az * 1.04]), 'cap_wz37_eagle', 'badge', { bone: 'head', texel: 0.5 }));
  return parts;
}

/** Ponto do cinto no azimute a (0 = frente, + = esquerda do soldado) e eixos (x tangente, y cima, z para fora). */
function beltFrame(belt, waistY, zc, a, dy = 0) {
  const dir = [-Math.sin(a), 0, -Math.cos(a)];
  // Raio exterior do cinto nessa direcção: máximo entre os vértices dentro de ±6° (ou o mais próximo).
  const P = belt.positions;
  let r = 0, bestCos = -2, rNear = 0;
  for (let i = 0; i < P.length; i += 3) {
    const d = [P[i], 0, P[i + 2] - zc], l = Math.hypot(d[0], d[2]);
    if (Math.abs(P[i + 1] - waistY) > 0.03 || l < 1e-6) continue;
    const cosA = (d[0] * dir[0] + d[2] * dir[2]) / l;
    if (cosA > 0.9945) r = Math.max(r, l);
    if (cosA > bestCos) { bestCos = cosA; rNear = l; }
  }
  r ||= rNear;
  const best = [dir[0] * r, waistY + dy, zc + dir[2] * r];
  return { o: best, axes: axesFrom(dir) };
}

/** Caminho sobre a superfície da túnica (alças): pontos-guia (x, y, lado) projectados na casca + folga. */
function surfacePath(tunic, guides, off = 0.006, steps = 6) {
  const pts = tunic.shellPos, zc = tunic.zc;
  const project = ([x, y, side]) => {
    if (side === 'top') {   // por cima do ombro: o ponto mais alto perto de (x, z)
      let best = null;
      for (let r = 0.012; !best && r < 0.1; r *= 1.5) for (const p of pts) if (Math.hypot(p[0] - x, p[2] - y) < r && (!best || p[1] > best[1])) best = p;
      return v3.add(best, [0, off, 0]);
    }
    let best = null, bd = Infinity;
    for (const p of pts) {
      if (Math.abs(p[1] - y) > 0.012 || Math.sign(p[2] - zc) !== side) continue;
      const d = Math.abs(p[0] - x);
      if (d < bd || (Math.abs(d - bd) < 0.004 && side * p[2] > side * best[2])) { bd = d; best = p; }
    }
    return v3.add(best, v3.mul(v3.norm([best[0] * 0.5, 0, best[2] - zc]), off));
  };
  const g = guides.map(project), path = [];
  for (let k = 0; k + 1 < g.length; k++) for (let s = 0; s < steps; s++) path.push(v3.lerp(g[k], g[k + 1], s / steps));
  path.push(g.at(-1));
  // Re-projecção: nenhum ponto fica a menos de `off` da superfície da túnica (pela normal do vértice mais próximo);
  // alternada com alisamento do caminho (as pontas ficam fixas).
  const grid = tunic.grid ??= pointGrid(Array.from({ length: tunic.positions.length / 3 }, (_, i) => [tunic.positions[i * 3], tunic.positions[i * 3 + 1], tunic.positions[i * 3 + 2]]), 0.03);
  const nrm = i => [tunic.normals[i * 3], tunic.normals[i * 3 + 1], tunic.normals[i * 3 + 2]];
  const surfN = p => { const [[i]] = grid.nearest(p, 1); return { q: [tunic.positions[i * 3], tunic.positions[i * 3 + 1], tunic.positions[i * 3 + 2]], n: nrm(i) }; };
  for (let it = 0; it < 6; it++) {
    for (let i = 1; i + 1 < path.length && it > 0; i++) path[i] = v3.lerp(path[i], v3.lerp(path[i - 1], path[i + 1], 0.5), 0.5);
    for (const p of path) { const { q, n } = surfN(p), d = v3.dot(v3.sub(p, q), n); if (d < off) { const m = v3.add(p, v3.mul(n, off - d)); p[0] = m[0]; p[1] = m[1]; p[2] = m[2]; } }
  }
  const normals = path.map((p, i) => {
    const t = v3.norm(v3.sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)]));
    const n = surfN(p).n;
    return v3.norm(v3.sub(n, v3.mul(t, v3.dot(n, t))));
  });
  return { path, normals };
}

/** Bolsa de couro/lona com tampa: caixa arredondada + tampa sobreposta, no referencial (o, eixos). */
function pouch(o, axes, [w, h, d], paint, name, { flap = 0.6, r = 0.008, bulge = 0.08 } = {}) {
  const body = place(roundedBox([w, h, d], { r, segments: 20, rings: 5, bulge }), [0, 0, 0]);
  const parts = [tag(body, `${name}`, paint)];
  const fl = roundedBox([w + 0.006, h * flap, d * 0.35], { r: Math.min(r, 0.006), segments: 20, rings: 3 });
  place(fl, [0, h * (0.5 - flap / 2) + 0.002, d * 0.38]);
  parts.push(tag(fl, `${name}_flap`, paint));
  // Converte do referencial local (y cima, z para fora) para o mundo.
  for (const p of parts) place(p, o, axes);
  return parts;
}

/**
 * Equipamento por nação. h: corpo; o: buildOutfit; fit: headFit; J: articulações.
 * Devolve { sets: { nome: [peças] }, helmets: {...}, sockets }.
 */
export function buildGear(nat, h, o) {
  const J = h.joints, lm = o.lm, fit = headFit(h);
  const belt = o.parts.find(p => p.name === 'belt'), tunic = o.parts.find(p => p.name === 'tunic');
  tunic.zc = J.spine_02[2];
  if (!tunic.normals) computeNormals(tunic, tunic.src);
  const zc = J.hips[2], bf = (a, dy) => beltFrame(belt, lm.waistY, zc, a * Math.PI / 180, dy);
  let chinY = Infinity, chinZ = 0;
  for (let i = 0; i < h.base.vertexCount; i++) if (h.headWeight[i] > 0.9 && Math.abs(h.positions[i * 3]) < 0.015 && h.positions[i * 3 + 2] < J.head[2] - 0.04 && h.positions[i * 3 + 1] < chinY) { chinY = h.positions[i * 3 + 1]; chinZ = h.positions[i * 3 + 2]; }
  const chin = { y: chinY, z: chinZ + 0.012 };
  // Altura do topo da túnica em (x, z): máximo dos vértices da casca num raio crescente.
  const topAt = (x, z) => {
    for (let r = 0.012; r < 0.1; r *= 1.5) {
      let y = -Infinity;
      for (const p of tunic.shellPos) if (Math.hypot(p[0] - x, p[2] - z) < r) y = Math.max(y, p[1]);
      if (y > -Infinity) return y;
    }
    throw new Error(`túnica sem topo em ${x}, ${z}`);
  };
  const sets = {}, add = (set, ...ps) => { if (process.env.GEAR_DEBUG) console.log(set, ps.flat().map(p => p.name).join(" "), Date.now() % 100000); (sets[set] ??= []).push(...ps.flat()); };
  const onBody = (parts, filter) => { for (const p of parts) skinFromBody(h, lm, p, filter); return parts; };
  const rigid = (parts, bone) => { for (const p of parts) p.bone = bone; return parts; };
  const nearBelt = v => Math.abs(h.positions[v * 3 + 1] - lm.waistY) < 0.12 && h.skin[v].every(([b]) => !/arm|hand|clavicle/.test(b));

  if (nat === 'pl') {
    add('helmet_wz31', helmetWz31(fit), helmetLiner(fit, 'helmet_wz31', chin));
    add('helmet_cover_wz31', helmetCoverWz31(fit));
    add('cap_wz37', capWz37(fit));
    // Cartucheiras de couro (2) à frente, bornal wz.33 e cantil à direita, pá e bolsa da máscara à esquerda.
    for (const a of [-26, 26]) { const f = bf(a, -0.004); add('gear', onBody(pouch(f.o, f.axes, [0.1, 0.075, 0.04], 'leather_light', `pouch${a}`, { flap: 0.55 }), nearBelt)); }
    { const f = bf(-118, -0.12); add('gear', onBody(pouch(f.o, f.axes, [0.24, 0.19, 0.07], 'canvas', 'breadbag', { flap: 0.75, r: 0.02, bulge: 0.15 }), nearBelt)); }
    { const f = bf(-152, -0.15); const c = canteen(f.o, f.axes, 'canteen_cloth', 'canteen'); add('gear', onBody(c, nearBelt)); }
    { const f = bf(118, -0.14); add('gear', onBody(shovel(f.o, f.axes, 'shovel'), nearBelt)); }
    { const f = bf(80, -0.11); add('gear', onBody(pouch(f.o, f.axes, [0.2, 0.22, 0.1], 'canvas', 'gasmask_bag', { flap: 0.55, r: 0.025, bulge: 0.12 }), nearBelt)); }
    // Correia da bolsa da máscara: do ombro direito ao lado esquerdo da anca (por cima do peito e das costas).
    const sx = J.upperarm_r[0] - 0.06;
    const front = surfacePath(tunic, [[sx, J.upperarm_r[2] - 0.02, 'top'], [sx - 0.05, 1.32, -1], [-0.03, 1.2, -1], [-0.16, lm.waistY - 0.02, -1]], 0.007);
    const back = surfacePath(tunic, [[-0.16, lm.waistY - 0.02, 1], [-0.02, 1.2, 1], [sx - 0.05, 1.33, 1], [sx, J.upperarm_r[2] + 0.02, 'top']], 0.007);
    const path = [...back.path, ...front.path.slice(1)], normals = [...back.normals, ...front.normals.slice(1)];
    add('gear', onBody([tag(strap(path, normals, { width: 0.03, thickness: 0.003 }), 'gasmask_strap', 'canvas')], v => h.skin[v].every(([b]) => !/lowerarm|hand|upperarm/.test(b))));
    // Sapadores: bolsa de lona de ferramentas/cargas à direita da frente (substitui a cartucheira direita na leitura).
    { const f = bf(-62, -0.13); add('sapper', onBody(pouch(f.o, f.axes, [0.22, 0.17, 0.08], 'canvas', 'sapper_bag', { flap: 0.6, r: 0.02, bulge: 0.12 }), nearBelt)); }
    // Graduados: coldre da Vis wz.35 (couro) e divisas nas platinas.
    { const f = bf(58, -0.07); add('nco', onBody(holster(f.o, f.axes), nearBelt)); }
    add('rank_kapral', onBody(rankBars(J, 2, topAt), v => h.skin[v].some(([b]) => /clavicle|upperarm|spine_03/.test(b))));
    add('rank_sierzant', onBody(rankBars(J, 'galon', topAt), v => h.skin[v].some(([b]) => /clavicle|upperarm|spine_03/.test(b))));
    add('rank_st_strzelec', onBody(rankBars(J, 1, topAt), v => h.skin[v].some(([b]) => /clavicle|upperarm|spine_03/.test(b))));
  } else {
    add('helmet_m35', helmetM35(fit), helmetLiner(fit, 'helmet_m35', chin));
    // 2×3 cartucheiras pretas, suspensórios em Y, Brotbeutel + cantil M31 à direita, pá à esquerda, lata atrás.
    for (const a of [-30, 30]) { const f = bf(a, -0.004); add('gear', onBody(threeCell(f.o, f.axes, `pouch${a}`), nearBelt)); }
    { const f = bf(-112, -0.13); add('gear', onBody(pouch(f.o, f.axes, [0.25, 0.2, 0.07], 'canvas', 'breadbag', { flap: 0.8, r: 0.02, bulge: 0.15 }), nearBelt)); }
    { const f = bf(-140, -0.2); add('gear', onBody(canteen(f.o, f.axes, 'canteen_cloth', 'canteen', true), nearBelt)); }
    { const f = bf(122, -0.14); add('gear', onBody(shovel(f.o, f.axes, 'shovel'), nearBelt)); }
    { const f = bf(-172, -0.2); add('gear', onBody(gasCan(f.o, f.axes), nearBelt)); }
    const upper = v => h.skin[v].every(([b]) => !/lowerarm|hand|upperarm/.test(b));
    for (const s of [-1, 1]) {
      const x = s * 0.085, top = [s * 0.11, J.upperarm_l[2] - 0.0, 'top'];
      const f = surfacePath(tunic, [top, [s * 0.1, 1.3, -1], [x, lm.waistY + 0.03, -1]], 0.006);
      add('gear', onBody([tag(strap(f.path, f.normals, { width: 0.03, thickness: 0.003 }), `ystrap_front${s}`, 'leather')], upper));
      const b = surfacePath(tunic, [top, [s * 0.07, 1.32, 1], [0, 1.2, 1]], 0.006);
      add('gear', onBody([tag(strap(b.path, b.normals, { width: 0.03, thickness: 0.003 }), `ystrap_back${s}`, 'leather')], upper));
    }
    const bk = surfacePath(tunic, [[0, 1.2, 1], [0, lm.waistY + 0.03, 1]], 0.0065);
    add('gear', onBody([tag(strap(bk.path, bk.normals, { width: 0.035, thickness: 0.003 }), 'ystrap_back', 'leather')], upper));
  }
  for (const list of Object.values(sets)) for (const p of list) {
    if (p.bone) p.skin = Array.from({ length: p.positions.length / 3 }, () => [[p.bone, 1]]);
    p.texel ??= 0.7;
  }
  return { sets, fit };
}

function canteen(o, axes, paint, name, cup = false) {
  const parts = [];
  const body = lathe((t, phi) => {
    const y = -0.09 + t * 0.18, r = 0.07 * Math.sqrt(Math.max(0, 1 - (y / 0.095) ** 6)) + 0.002;
    return [Math.cos(phi) * r, y, Math.sin(phi) * r * 0.5];
  }, { rings: 10, segments: 20, caps: 'both' });
  place(body, [0, 0, 0.04]);
  parts.push(tag(orientOutward(body, [0, 0, 0.04]), name, paint));
  const neck = cylinder(0.013, 0.025, { segments: 12 }); place(neck, [0, 0.1, 0.04]);
  parts.push(tag(orientOutward(neck, p => [0, p[1], 0.04]), `${name}_cap`, cup ? 'painted_metal' : 'bare_metal'));
  if (cup) {
    const c = lathe((t, phi) => [Math.cos(phi) * 0.045, -0.04 + t * 0.08, Math.sin(phi) * 0.03], { rings: 2, segments: 18, caps: 'both' });
    place(c, [0, -0.04, 0.085]); parts.push(tag(orientOutward(c, p => [0, p[1], 0.085]), `${name}_cup`, 'painted_metal'));
  }
  for (const p of parts) place(p, o, axes);
  return parts;
}
function shovel(o, axes, name) {
  const parts = [];
  const carrier = roundedBox([0.16, 0.2, 0.025], { r: 0.03, segments: 20, rings: 4 }); place(carrier, [0, -0.06, 0.02]);
  parts.push(tag(carrier, `${name}_carrier`, 'leather'));
  const handle = cylinder(0.016, 0.24, { segments: 10 });
  place(handle, [0.0, -0.27, 0.024]);
  parts.push(tag(orientOutward(handle), `${name}_handle`, 'shovel_handle'));
  for (const p of parts) place(p, o, axes);
  return parts;
}
function threeCell(o, axes, name) {
  const parts = [];
  for (let k = -1; k <= 1; k++) parts.push(...pouch([k * 0.056, 0, 0], axesFrom([0, 0, 1]), [0.054, 0.07, 0.038], 'leather', `${name}_${k + 1}`, { flap: 0.5, r: 0.005, bulge: 0.015 }));
  for (const p of parts) place(p, o, axes);
  return parts;
}
function gasCan(o, axes) {
  const can = lathe((t, phi) => {
    const y = -0.14 + t * 0.28, r = 0.055 + 0.003 * Math.max(0, Math.sin(y * 2 * Math.PI / 0.022)) * (Math.abs(y) < 0.12 ? 1 : 0);
    return [Math.cos(phi) * r, y, Math.sin(phi) * r];
  }, { rings: 40, segments: 20, caps: 'both' });
  orientOutward(can, p => [0, p[1], 0]);
  place(can, [0, 0, 0], axesFrom([0, 0, 1], v3.norm([0.35, 1, 0])));
  place(can, [0, 0, 0.065]);
  const parts = [tag(can, 'gasmask_can', 'painted_metal')];
  for (const p of parts) place(p, o, axes);
  return parts;
}
function holster(o, axes) {
  const parts = pouch([0, 0, 0], axesFrom([0, 0, 1]), [0.075, 0.16, 0.04], 'leather_light', 'holster_vis', { flap: 0.45, r: 0.015, bulge: 0.1 });
  for (const p of parts) place(p, o, axes);
  return parts;
}
/** Divisas nas platinas: n belki (barras transversais) ou galão ao longo das bordas (sierżant; certeza média). */
function rankBars(J, kind, topAt) {
  const parts = [];
  for (const s of [-1, 1]) {
    const zc = J.upperarm_l[2] + 0.005;
    const bars = kind === 'galon' ? [[0.12, 0.004, 0.044], [0.12, 0.004, 0.044]] : Array.from({ length: kind }, () => [0.006, 0.004, 0.044]);
    bars.forEach(([lx, , lz], k) => {
      const b = roundedBox(kind === 'galon' ? [lx, 0.003, 0.005] : [0.006, 0.003, lz], { r: 0.001, segments: 8, rings: 2 });
      const x = kind === 'galon' ? s * 0.125 : s * (0.135 + k * 0.012), z = kind === 'galon' ? zc + (k ? 0.02 : -0.02) : zc;
      place(b, [x, topAt(x, z) + 0.0035, z]);
      parts.push(tag(b, `rank_${s}_${k}`, 'rank'));
    });
  }
  return parts;
}
