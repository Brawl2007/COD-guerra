// Construtores das pontes de Tczew (M01). Todas as medidas em metros.
// Coordenadas locais de cada ponte: X ao longo do eixo (= X do mapa), Y altura (0 = trilho/pavimento no portal oeste),
// Z perpendicular (+ sul), com z = 0 no eixo da ponte. Colocação no mapa: ver `placement` em cada ponte.
import { Part, beam, box, cylinder, pierPlan, extrudePlanY, wallWithArches, merlonsRing, merlonsLine, rng, THREE } from './geom.mjs';

export const MAT = {
  steel: 'steel_painted',      // cor da pintura em 1939: INCERTA
  rail: 'steel_rail',
  brick: 'brick_red',
  stone: 'stone_masonry',
  timber: 'timber',
  road: 'road_surface',
  dark: 'opening_dark',
  gate: 'gate_timber_iron',
  rubble: 'rubble_mixed',
};

const BEARING_Y = -1.0;
const RIVER = [25, 265];                       // canal atual (G01)
const inRiver = x => x > RIVER[0] - 10 && x < RIVER[1] + 10;
const foundationY = x => (inRiver(x) ? -16 : -8);

// --------------------------------------------------------------------------------------------
// Vãos

/** Vão lenticular (1891): banzo superior parabólico para cima e inferior para baixo, tabuleiro ao nível dos apoios. */
export function lensSpan(L, { trussSpacing = 9.6, rise = 11, sag = 5, lod = 0 } = {}) {
  const p = new Part();
  const n = Math.max(8, Math.round(L / 8 / 2) * 2);
  const hz = trussSpacing / 2;
  const yt = k => BEARING_Y + rise * 4 * (k / n) * (1 - k / n);
  const yb = k => BEARING_Y - sag * 4 * (k / n) * (1 - k / n);
  const xk = k => (k / n) * L;
  for (const z of [-hz, hz]) {
    for (let k = 0; k < n; k++) {
      p.add(MAT.steel, beam([xk(k), yt(k), z], [xk(k + 1), yt(k + 1), z], 0.7, 0.6));
      p.add(MAT.steel, beam([xk(k), yb(k), z], [xk(k + 1), yb(k + 1), z], 0.7, 0.6));
      if (lod === 0) {
        p.add(MAT.steel, beam([xk(k), yb(k), z], [xk(k + 1), yt(k + 1), z], 0.25, 0.25));
        p.add(MAT.steel, beam([xk(k), yt(k), z], [xk(k + 1), yb(k + 1), z], 0.25, 0.25));
      }
    }
    for (let k = 1; k < n; k++) p.add(MAT.steel, beam([xk(k), yb(k), z], [xk(k), yt(k), z], 0.4, 0.4));
  }
  // Contraventamento superior (só onde há gabarito acima dos trilhos) e inferior.
  for (let k = 1; k < n; k++) {
    if (yt(k) > 6.3) {
      p.add(MAT.steel, beam([xk(k), yt(k), -hz], [xk(k), yt(k), hz], 0.3, 0.3));
      if (lod === 0 && k + 1 < n && yt(k + 1) > 6.3) {
        p.add(MAT.steel, beam([xk(k), yt(k), -hz], [xk(k + 1), yt(k + 1), hz], 0.15, 0.15));
        p.add(MAT.steel, beam([xk(k), yt(k), hz], [xk(k + 1), yt(k + 1), -hz], 0.15, 0.15));
      }
    }
    if (lod === 0) p.add(MAT.steel, beam([xk(k), yb(k), -hz], [xk(k), yb(k), hz], 0.3, 0.3));
  }
  addRailDeck(p, L, n, hz, lod);
  return p;
}

/** Vão da extensão de 1910–1912 (81,6 m). Tipo de treliça NÃO documentado: banzos paralelos tipo Pratt (provisório). */
export function extensionSpan(L, { spacing = 9.6, height = 9, lod = 0, deck = 'rail' } = {}) {
  const p = new Part();
  const n = 10, hz = spacing / 2, y0 = BEARING_Y, y1 = BEARING_Y + height;
  const xk = k => (k / n) * L;
  for (const z of [-hz, hz]) {
    p.add(MAT.steel, beam([xk(0), y0, z], [xk(n), y0, z], 0.6, 0.6));
    p.add(MAT.steel, beam([xk(1), y1, z], [xk(n - 1), y1, z], 0.6, 0.6));
    p.add(MAT.steel, beam([xk(0), y0, z], [xk(1), y1, z], 0.6, 0.6));
    p.add(MAT.steel, beam([xk(n - 1), y1, z], [xk(n), y0, z], 0.6, 0.6));
    for (let k = 1; k < n; k++) p.add(MAT.steel, beam([xk(k), y0, z], [xk(k), y1, z], 0.35, 0.35));
    if (lod === 0) for (let k = 1; k < n - 1; k++) {
      const toCenter = k < n / 2;
      p.add(MAT.steel, toCenter ? beam([xk(k), y1, z], [xk(k + 1), y0, z], 0.25, 0.25) : beam([xk(k), y0, z], [xk(k + 1), y1, z], 0.25, 0.25));
    }
  }
  for (let k = 1; k < n; k++) p.add(MAT.steel, beam([xk(k), y1, -hz], [xk(k), y1, hz], 0.3, 0.3));
  if (deck === 'rail') addRailDeck(p, L, n, hz, lod); else addRoadDeck(p, L, n, hz, lod);
  return p;
}

/** Viga de treliça múltipla Lentze (1857): banzos paralelos, 8,68 m de altura, vigas a 6,43 m (T04). */
export function lentzeSpan(L, { spacing = 6.43, height = 8.68, pitch = 1.6, lod = 0 } = {}) {
  const p = new Part();
  const hz = spacing / 2;
  const yb0 = -0.9, yb1 = -0.4, yt1 = -0.9 + height, yt0 = yt1 - 0.5;
  const run = yt0 - yb1;                          // diagonais a 45°
  for (const z of [-hz, hz]) {
    p.add(MAT.steel, box([0, yb0, z - 0.35], [L, yb1, z + 0.35]));
    p.add(MAT.steel, box([0, yt0, z - 0.35], [L, yt1, z + 0.35]));
    if (lod === 0) {
      for (const dir of [1, -1]) {
        for (let xs = dir > 0 ? -run : 0; xs <= L + (dir > 0 ? 0 : run); xs += pitch) {
          let t0 = 0, t1 = 1;
          const x = t => xs + dir * run * t;
          if (dir > 0) { t0 = Math.max(0, -xs / run); t1 = Math.min(1, (L - xs) / run); }
          else { t0 = Math.max(0, (xs - L) / run); t1 = Math.min(1, xs / run); }
          if (t1 - t0 < 0.02) continue;
          p.add(MAT.steel, beam([x(t0), yb1 + run * t0, z], [x(t1), yb1 + run * t1, z], 0.05, 0.16));
        }
      }
      const nv = Math.round(L / 6.5);
      for (let k = 0; k <= nv; k++) p.add(MAT.steel, box([k * L / nv - 0.15, yb1, z - 0.25], [k * L / nv + 0.15, yt0, z + 0.25]));
    } else {
      // LOD1: a treliça densa "imitava uma viga de alma cheia" (T04); à distância, uma chapa basta.
      p.add(MAT.steel, box([0, yb1, z - 0.06], [L, yt0, z + 0.06]));
    }
  }
  const nb = Math.round(L / 6.5);
  for (let k = 0; k <= nb; k++) {
    const x = (k * L) / nb;
    p.add(MAT.steel, beam([x, yt1 - 0.25, -hz], [x, yt1 - 0.25, hz], 0.3, 0.4));
    if (lod === 0 && k < nb && k % 2 === 0) {
      const x2 = ((k + 1) * L) / nb;
      p.add(MAT.steel, beam([x, yt1 - 0.25, -hz], [x2, yt1 - 0.25, hz], 0.12, 0.12));
      p.add(MAT.steel, beam([x, yt1 - 0.25, hz], [x2, yt1 - 0.25, -hz], 0.12, 0.12));
    }
  }
  addRoadDeck(p, L, nb, hz, lod);
  return p;
}

function addRailDeck(p, L, n, hz, lod) {
  for (let k = 0; k <= n; k++) p.add(MAT.steel, beam([(k / n) * L, -1.25, -hz], [(k / n) * L, -1.25, hz], 0.4, 0.8));
  for (const tz of [-2, 2]) {
    if (lod === 0) for (const dz of [-0.75, 0.75]) p.add(MAT.steel, box([0, -0.85, tz + dz - 0.15], [L, -0.35, tz + dz + 0.15]));
    p.add(MAT.timber, box([0, -0.35, tz - 1.3], [L, -0.15, tz + 1.3]));
    for (const dz of [-0.7175, 0.7175]) p.add(MAT.rail, box([0, -0.15, tz + dz - 0.035], [L, 0, tz + dz + 0.035]));
  }
  if (lod === 0) for (const z of [-hz + 0.6, hz - 0.6]) p.add(MAT.timber, box([0, -0.35, z - 0.5], [L, -0.25, z + 0.5]));
}

function addRoadDeck(p, L, n, hz, lod) {
  for (let k = 0; k <= n; k++) p.add(MAT.steel, beam([(k / n) * L, -0.62, -hz], [(k / n) * L, -0.62, hz], 0.3, 0.7));
  p.add(MAT.road, box([0, -0.27, -hz + 0.45], [L, 0, hz - 0.45]));
  if (lod === 0) for (const s of [-1, 1]) p.add(MAT.stone, box([0, 0, s * (hz - 0.45) - 0.2], [L, 0.2, s * (hz - 0.45) + 0.2]));
}

// --------------------------------------------------------------------------------------------
// Alvenaria: pilares, encontros, torres, portais

export function pier(x, { lengthX, lengthZ, nose, topY, lod = 0 }) {
  const p = new Part();
  const y0 = foundationY(x);
  p.add(MAT.stone, extrudePlanY(pierPlan(lengthX, lengthZ, nose), y0, topY - 0.6, lod ? 4 : 8));
  p.add(MAT.stone, box([-lengthX / 2 - 0.3, topY - 0.6, -lengthZ / 2 - 0.3], [lengthX / 2 + 0.3, topY, lengthZ / 2 + 0.3]));
  return p;
}

export function tower(cx, cz, { r = 2.65, baseY, height = 23, lod = 0 }) {
  const p = new Part();
  const seg = lod ? 10 : 20, top = baseY + height;
  p.add(MAT.stone, cylinder(cx, cz, r + 0.25, baseY, baseY + 1.6, seg));
  p.add(MAT.brick, cylinder(cx, cz, r, baseY + 1.6, top - 3.2, seg));
  p.add(MAT.brick, cylinder(cx, cz, r + 0.35, top - 3.2, top - 2.4, seg, r + 0.35));
  p.add(MAT.brick, cylinder(cx, cz, r + 0.35, top - 2.4, top - 1.2, seg));
  if (lod === 0) {
    for (const g of merlonsRing(cx, cz, r + 0.35, top - 1.2, 1.2, 10, 0.9, 0.6)) p.add(MAT.brick, g);
    for (const [a, y] of [[0.4, baseY + 6], [2.1, baseY + 11], [3.6, baseY + 16], [5.2, baseY + 9]]) {
      p.add(MAT.dark, new THREE.BoxGeometry(0.2, 1.6, 0.35).rotateY(-a).translate(cx + Math.cos(a) * (r + 0.02), y, cz + Math.sin(a) * (r + 0.02)));
    }
  }
  return p;
}

/** Portal neogótico: muro com arcos ogivais entre duas torres. Forma INCERTA (sem fotografia consultada). */
export function portal({ x, halfWidth, arches, height = 13, towerR = 3.0, towerH = 21, thickness = 5, lod = 0 }) {
  const p = new Part();
  const baseY = -1.0;
  p.add(MAT.brick, wallWithArches(-halfWidth, halfWidth, baseY, height, thickness, arches, lod ? 5 : 10).translate(x, 0, 0));
  if (lod === 0) for (const g of merlonsLine([x, -halfWidth], [x, halfWidth], height, 1.1, Math.round(halfWidth * 2 / 1.8), 0.9, thickness * 0.6)) p.add(MAT.brick, g);
  for (const s of [-1, 1]) p.merge(tower(x, s * (halfWidth + towerR - 0.5), { r: towerR, baseY, height: towerH, lod }));
  return p;
}

export function abutment({ x0, x1, halfZ, topY = -0.35, embrasures = [], lod = 0 }) {
  const p = new Part();
  p.add(MAT.stone, box([x0, -12, -halfZ], [x1, topY, halfZ]));
  if (lod === 0) {
    for (const s of [-1, 1]) p.add(MAT.stone, box([x0, topY, s * halfZ - 0.3 * s - 0.3], [x1, topY + 1.1, s * halfZ - 0.3 * s + 0.3]));
    for (const [z, y] of embrasures) p.add(MAT.dark, box([x1 - 0.02, y - 0.45, z - 0.9], [x1 + 0.05, y + 0.45, z + 0.9]));
  }
  return p;
}

export function rubble({ x0, x1, z0, z1, y0, y1, count = 22, seed = 1, steel = 4 }) {
  const p = new Part();
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const sx = 1 + r() * 3, sy = 0.6 + r() * 1.8, sz = 1 + r() * 3;
    const t = r();
    const cy = y0 + (y1 - y0) * (1 - t * t) * r();
    const g = new THREE.BoxGeometry(sx, sy, sz).rotateY(r() * Math.PI).rotateZ((r() - 0.5) * 0.6)
      .translate(x0 + (x1 - x0) * r(), cy, z0 + (z1 - z0) * r());
    p.add(MAT.rubble, g);
  }
  for (let i = 0; i < steel; i++) {
    const a = [x0 + (x1 - x0) * r(), y0 + (y1 - y0) * r() * 0.6, z0 + (z1 - z0) * r()];
    p.add(MAT.steel, beam(a, [a[0] + (r() - 0.5) * 8, a[1] + r() * 3, a[2] + (r() - 0.5) * 4], 0.4, 0.5));
  }
  return p;
}

// --------------------------------------------------------------------------------------------
// Montagem

/** Nó da cena: { name, part?, translation?, rotation?, extras?, children? } */
const node = (name, part, extras, transform = {}) => ({ name, part, extras, ...transform });

function transformFor(x0, L, { dropWest = 0, dropEast = 0, roll = 0 }) {
  // Vão em coordenadas locais com origem no apoio oeste (x = 0..L, y real). Devolve TRS do nó.
  const m = new THREE.Matrix4().makeTranslation(x0, 0, 0);
  const yW = BEARING_Y - dropWest, yE = BEARING_Y - dropEast;
  const ang = Math.atan2(yE - yW, L);
  const pivot = new THREE.Vector3(0, BEARING_Y, 0);
  const r = new THREE.Matrix4().makeRotationZ(ang).multiply(new THREE.Matrix4().makeRotationX(roll));
  const local = new THREE.Matrix4().makeTranslation(0, yW - BEARING_Y, 0)
    .multiply(new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z)).multiply(r)
    .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  m.multiply(local);
  const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(t, q, s);
  return { translation: t.toArray(), rotation: q.toArray() };
}

const C = {
  measured: 'MEASURED (G01)',
  documented: 'DOCUMENTED',
  reconstructed: 'RECONSTRUCTED',
  uncertain: 'UNCERTAIN',
  placeholder: 'GAMEPLAY_PLACEHOLDER',
};

function buildBridge(spec, lod) {
  const { supports, spans, kind } = spec;
  const intact = [], destroyed = [], colliders = [];
  const halfW = i => spec.pierLengthX(i) / 2;
  const faceWest = supports[1] - spans[0];
  const abX0 = faceWest - 32;
  // Apoios dos vãos perto do eixo do pilar (os vãos documentados são de eixo a eixo); no antigo encontro, junto às faces.
  const bearing = i => Math.min(halfW(i) - 0.6, 1.2);
  const xStart = i => (i === 0 ? faceWest - 1.5 : supports[i] + bearing(i));
  const xEnd = i => (i === supports.length - 1 ? supports[i] - spec.eastAbutment.front + 1.5 : supports[i] - bearing(i));

  // Encontro oeste (com casamatas na ponte rodoviária) e portal oeste.
  intact.push(node('abutment_west', abutment({ x0: abX0, x1: faceWest, halfZ: spec.abutmentHalfZ, embrasures: spec.embrasures, lod }), {
    kind: 'abutment', supportIndex: 0, destroyedBy: 'evt_m01_west_demolition', replacedBy: ['abutment_west_damaged'],
    positionCertainty: C.reconstructed, appearanceCertainty: C.reconstructed,
    notes: `Face fluvial em x = ${faceWest.toFixed(1)} (= supportsX[1] − vão documentado); comprimento 32 m (T04). Interior das casamatas não modelado.`,
  }));
  destroyed.push(node('abutment_west_damaged', abutment({ x0: abX0, x1: faceWest - 14, halfZ: spec.abutmentHalfZ, lod })
    .merge(rubble({ x0: faceWest - 14, x1: faceWest + 4, z0: -spec.abutmentHalfZ, z1: spec.abutmentHalfZ, y0: -11, y1: -2.5, count: 30, seed: kind === 'road' ? 211 : 201 })), {
    kind: 'abutment', state: 'destroyed', initiallyHidden: true, replaces: 'abutment_west', appearanceCertainty: C.placeholder,
    notes: 'Frente do encontro demolida às 06:40 (T04: "encontro do lado de Tczew"); extensão real do dano INCERTA (P11/P13).',
  }));
  intact.push(node('portal_west', spec.portalWest(lod), {
    kind: 'portal', destroyedBy: null, damageCertainty: C.uncertain,
    positionCertainty: C.reconstructed, appearanceCertainty: C.uncertain,
    notes: 'Existência DOCUMENTED (T04/T05). Forma, alturas e aberturas INCERTAS: aguardar fotografias (P11). Dano às 06:40 não documentado.',
  }));

  // Pilares (supports 1..n-2); o 6.º é o antigo encontro leste de 1857/1891.
  for (let i = 1; i < supports.length - 1; i++) {
    const isOld = i === 6;
    const name = isOld ? 'pier_06_old_east_abutment' : `pier_${String(i).padStart(2, '0')}`;
    const destroyedBy = i === 1 ? 'evt_m01_west_demolition' : i === 6 ? 'evt_m01_east_demolition' : null;
    // Geometria local (x = 0 no eixo do pilar); x real só define a profundidade da fundação.
    const real = pier(supports[i], { lengthX: spec.pierLengthX(i), lengthZ: spec.pierLengthZ, nose: spec.pierNose, topY: BEARING_Y - 0.2, lod });
    if (spec.towers && i >= 1 && i <= 5) for (const s of [-1, 1]) real.merge(tower(0, s * spec.towerZ, { baseY: BEARING_Y - 0.2, lod }));
    intact.push(node(name, real, {
      kind: isOld ? 'old_abutment' : 'pier', supportIndex: i, destroyedBy,
      replacedBy: destroyedBy ? [`${name}_rubble`] : [],
      positionCertainty: C.measured, appearanceCertainty: i >= 7 ? C.uncertain : C.reconstructed,
      hasTowers: Boolean(spec.towers && i <= 5),
      notes: (spec.towers && i <= 5 ? 'Par de torres neogóticas: número, altura 23 m e Ø 5,3 m DOCUMENTED (T04); detalhes INCERTOS. ' : '')
        + (isOld ? 'Antigo encontro leste; alvo da demolição das 06:10 (6.º de 8 pilares, T07; P13). ' : '')
        + (i >= 7 ? 'Pilar da extensão de 1910–1912 (T25); forma INCERTA. ' : ''),
    }, { translation: [supports[i], 0, 0] }));
    if (destroyedBy) {
      destroyed.push(node(`${name}_rubble`, rubble({ x0: -halfW(i) - 3, x1: halfW(i) + 3, z0: -spec.pierLengthZ / 2, z1: spec.pierLengthZ / 2, y0: foundationY(supports[i]) + (inRiver(supports[i]) ? 6 : 3), y1: inRiver(supports[i]) ? -7.5 : -3, seed: 100 + i + (kind === 'road' ? 50 : 0) }), {
        kind: 'rubble', replaces: name, state: 'destroyed', initiallyHidden: true, appearanceCertainty: C.placeholder,
      }, { translation: [supports[i], 0, 0] }));
    }
  }

  // Antigo portal leste sobre o pilar 6 (existência em 1939 INCERTA).
  if (spec.portalOldEast) {
    intact.push(node('portal_old_east', spec.portalOldEast(lod), {
      kind: 'portal', destroyedBy: 'evt_m01_east_demolition', replacedBy: ['portal_old_east_rubble'],
      positionCertainty: C.reconstructed, appearanceCertainty: C.uncertain, existenceIn1939: C.uncertain,
      notes: 'T04 cita a destruição do "antigo portal do lado de Lisewo" às 06:10; não está confirmado que fosse este portal de 1857/1891 nem a sua forma (P13).',
    }, { translation: [supports[6], 0, 0] }));
    destroyed.push(node('portal_old_east_rubble', rubble({ x0: -8, x1: 8, z0: -spec.abutmentHalfZ, z1: spec.abutmentHalfZ, y0: -1, y1: 3, count: 26, seed: 7 + (kind === 'road' ? 1 : 0), steel: 0 }), {
      kind: 'rubble', replaces: 'portal_old_east', state: 'destroyed', initiallyHidden: true, appearanceCertainty: C.placeholder,
    }, { translation: [supports[6], 0, 0] }));
  }

  // Encontro leste de 1912 (no dique).
  const ea = spec.eastAbutment, last = supports.length - 1;
  intact.push(node('abutment_east_1912', abutment({ x0: supports[last] - ea.front, x1: supports[last] + ea.back, halfZ: spec.abutmentHalfZ, lod }), {
    kind: 'abutment', supportIndex: last, destroyedBy: null, positionCertainty: C.measured, appearanceCertainty: C.uncertain,
    notes: 'Fim das pontes prolongadas em 1910–1912, junto ao dique de Lisewo (T25, G01). O portal comum de 1912 está em portal_lisewo_1912.glb.',
  }));

  // Vãos.
  const destroyedSpans = { 1: ['evt_m01_west_demolition', { dropWest: 8, dropEast: 10.5, roll: 0.09 }], 2: ['evt_m01_west_demolition', { dropWest: 10, dropEast: 0, roll: -0.05 }],
    6: ['evt_m01_east_demolition', { dropWest: 0, dropEast: 3.5, roll: 0.06 }], 7: ['evt_m01_east_demolition', { dropWest: 3.5, dropEast: 0, roll: -0.04 }] };
  for (let i = 1; i < supports.length; i++) {
    const x0 = xStart(i - 1), x1 = xEnd(i), L = x1 - x0;
    const isExt = i >= 7;
    const part = isExt ? extensionSpan(L, { spacing: spec.trussSpacing, lod, deck: kind }) : spec.span(L, lod);
    const name = `span_${String(i).padStart(2, '0')}`;
    const d = destroyedSpans[i];
    // Vão de eixo a eixo medido × documentado; o 1.º vão parte da face do encontro.
    const measuredCC = i === 1 ? supports[1] - faceWest : supports[i] - supports[i - 1];
    const deviation = (measuredCC - spans[i - 1]) / spans[i - 1];
    const conflict = Math.abs(deviation) > 0.08 ? {
      measuredCenterToCenterM: +measuredCC.toFixed(1), documentedM: spans[i - 1], deviation: +deviation.toFixed(3),
      note: 'Pilares medidos na geometria atual (G01) podem refletir vãos trocados depois de 1945 (T04: vãos transferidos em 1958). O modelo respeita supportsX; confirmar a posição de 1939 em P4/P13.',
    } : null;
    intact.push(node(name, part, {
      kind: 'span', index: i, era: isExt ? '1910-1912' : spec.era, lengthM: +L.toFixed(2), documentedSpanM: spans[i - 1],
      destroyedBy: d ? d[0] : null, replacedBy: d ? [`${name}_collapsed`] : [],
      positionCertainty: C.measured, appearanceCertainty: isExt || conflict ? C.uncertain : spec.spanCertainty,
      ...(conflict ? { lengthConflict: conflict } : {}),
      notes: isExt ? 'Tipo de treliça dos vãos de 1910–1912 NÃO documentado; banzos paralelos provisórios.' : spec.spanNotes,
    }, { translation: [x0, 0, 0] }));
    if (d) {
      destroyed.push(node(`${name}_collapsed`, null, {
        kind: 'span', state: 'destroyed', initiallyHidden: true, replaces: name, meshFrom: name, appearanceCertainty: C.placeholder,
        notes: 'Pose de queda provisória (sem fotografia da destruição; P11/P13).',
      }, { ...transformFor(x0, L, d[1]), meshFrom: name }));
    }
    // Colisores do tabuleiro e das treliças.
    colliders.push(node(`COL_deck_${name}`, colliderBox([x0, -0.5, -spec.deckHalfWidth], [x1, 0, spec.deckHalfWidth]), {
      collider: 'walkable', of: name, destroyedBy: d ? d[0] : null,
    }));
    for (const s of [-1, 1]) colliders.push(node(`COL_truss_${s < 0 ? 'N' : 'S'}_${name}`, colliderBox([x0, 0, s * spec.trussSpacing / 2 - 0.4], [x1, isExt ? 8 : spec.trussColliderHeight, s * spec.trussSpacing / 2 + 0.4]), {
      collider: 'partialCover', bulletPenetrable: true, coverType: 'TRUSS_PARTIAL', of: name, destroyedBy: d ? d[0] : null,
    }));
  }
  colliders.push(node('COL_abutment_west', colliderBox([abX0, -12, -spec.abutmentHalfZ], [faceWest, -0.35, spec.abutmentHalfZ]), { collider: 'walkable', of: 'abutment_west', destroyedBy: 'evt_m01_west_demolition' }));
  for (let i = 1; i < supports.length - 1; i++) {
    colliders.push(node(`COL_pier_${String(i).padStart(2, '0')}`, colliderBox([supports[i] - halfW(i), foundationY(supports[i]), -spec.pierLengthZ / 2], [supports[i] + halfW(i), BEARING_Y - 0.2, spec.pierLengthZ / 2]), {
      collider: 'solid', of: i === 6 ? 'pier_06_old_east_abutment' : `pier_${String(i).padStart(2, '0')}`, destroyedBy: i === 1 ? 'evt_m01_west_demolition' : i === 6 ? 'evt_m01_east_demolition' : null,
    }));
  }
  return { intact, destroyed, colliders };
}

function colliderBox(min, max) { return new Part().add('collider', box(min, max)); }

export function railBridge(layout, lod = 0) {
  const f = layout.features.find(x => x.id === 'rail_bridge');
  const spec = {
    kind: 'rail', era: '1891', supports: f.supportsX, spans: f.spansM,
    trussSpacing: 9.6, deckHalfWidth: 4.6, trussColliderHeight: 10, abutmentHalfZ: 9.5,
    pierLengthX: i => (i === 6 ? 14 : i >= 7 ? 5 : 6), pierLengthZ: 15, pierNose: 4,
    eastAbutment: { front: 6, back: 18 },
    embrasures: [],
    span: (L, lod) => lensSpan(L, { lod }),
    spanCertainty: C.uncertain,
    spanNotes: 'Vão lenticular (soczewkowy) de 1891: tipo DOCUMENTED (T05). Flecha superior 11 m, inferior 5 m, 9,6 m entre treliças e painéis de ~8 m são SUPOSIÇÕES.',
    portalWest: lod => portal({ x: -4, halfWidth: 7.2, arches: [{ centerZ: -2, width: 4.4, springY: 5.0, apexY: 8.4 }, { centerZ: 2, width: 4.4, springY: 5.0, apexY: 8.4 }], height: 11.5, towerR: 2.6, towerH: 17, lod }),
    portalOldEast: lod => portal({ x: 0, halfWidth: 7.2, arches: [{ centerZ: -2, width: 4.4, springY: 5.0, apexY: 8.4 }, { centerZ: 2, width: 4.4, springY: 5.0, apexY: 8.4 }], height: 11.5, towerR: 2.6, towerH: 17, lod }),
  };
  return { spec, ...buildBridge(spec, lod) };
}

export function roadBridge(layout, lod = 0) {
  const f = layout.features.find(x => x.id === 'road_bridge');
  const spacing = f.girderSpacingM ?? 6.43;
  const towerZ = spacing / 2 + 0.6 + 2.65 + 0.4;
  const spec = {
    kind: 'road', era: '1857', supports: f.supportsX, spans: f.spansM,
    trussSpacing: spacing, deckHalfWidth: spacing / 2 - 0.45, trussColliderHeight: f.girderHeightM ?? 8.68, abutmentHalfZ: 10.5,
    pierLengthX: i => (i === 6 ? 14 : i >= 7 ? 5 : 7), pierLengthZ: 2 * (towerZ + 3.0), pierNose: 5,
    eastAbutment: { front: 6, back: 18 },
    towers: true, towerZ,
    embrasures: [[-6.5, -4.2], [-2.2, -4.2], [2.2, -4.2], [6.5, -4.2]],
    span: (L, lod) => lentzeSpan(L, { spacing, height: f.girderHeightM ?? 8.68, lod }),
    spanCertainty: C.reconstructed,
    spanNotes: 'Viga de treliça múltipla Lentze: altura 8,68 m e 6,43 m entre vigas DOCUMENTED (T04). Passo da treliça (1,6 m), montantes e contraventamento são SUPOSIÇÕES.',
    portalWest: lod => portal({ x: -4, halfWidth: 4.6, arches: [{ centerZ: 0, width: 6.0, springY: 4.8, apexY: 8.6 }], height: 12.5, towerR: 3.0, towerH: 19, lod }),
    portalOldEast: lod => portal({ x: 0, halfWidth: 4.6, arches: [{ centerZ: 0, width: 6.0, springY: 4.8, apexY: 8.6 }], height: 12.5, towerR: 3.0, towerH: 19, lod }),
  };
  return { spec, ...buildBridge(spec, lod) };
}

/** Portal comum de 1912 em Lisewo (T25). Origem local: x = fim das pontes, z = 20 (entre os eixos). Forma INCERTA. */
export function lisewoPortal(lod = 0) {
  const intact = [];
  const wall = new Part();
  const x = 14, thickness = 9, h = 13;
  wall.add(MAT.brick, wallWithArches(-28, 28, -1, h, thickness, [
    { centerZ: -20, width: 9.4, springY: 6.0, apexY: 10.0 },
    { centerZ: 20, width: 7.0, springY: 5.0, apexY: 8.6 },
  ], lod ? 5 : 10).translate(x, 0, 0));
  if (lod === 0) for (const g of merlonsLine([x, -28], [x, 28], h, 1.1, 26, 0.9, thickness * 0.6)) wall.add(MAT.brick, g);
  for (const zc of [-28, 28]) wall.merge(tower(x, zc, { r: 3.4, baseY: -1, height: 18, lod }));
  wall.merge(tower(x, 0, { r: 4.2, baseY: -1, height: 22, lod }));
  intact.push(node('portal_lisewo_1912', wall, {
    kind: 'portal', destroyedBy: null, positionCertainty: C.reconstructed, appearanceCertainty: C.uncertain,
    notes: 'Portal comum às duas pontes, de 1910–1912 (T25). Existência DOCUMENTED; forma, dimensões e posição em X INCERTAS.',
  }));
  const gates = [['rail', -20, 9.4, 6.0], ['road', 20, 7.0, 5.0]];
  for (const [which, zc, w, hgt] of gates) for (const side of ['left', 'right']) {
    const s = side === 'left' ? -1 : 1;
    const leaf = new Part().add(MAT.gate, box([x - thickness / 2 - 0.25, -1, Math.min(zc, zc + s * w / 2)], [x - thickness / 2 + 0.05, hgt, Math.max(zc, zc + s * w / 2)]));
    intact.push(node(`gate_${which}_${side}`, leaf, {
      kind: 'gate', state: 'closed', documented: 'Portões fechados diante do trem 963 às ~04:45 (T07)', appearanceCertainty: C.uncertain,
      hinge: [x - thickness / 2 - 0.1, 0, zc + s * w / 2],
    }));
  }
  const colliders = [node('COL_portal_lisewo_1912', colliderBox([x - thickness / 2, -1, -28], [x + thickness / 2, h, 28]), { collider: 'solid', notes: 'Bloco simples; as passagens estão fechadas pelos portões.' })];
  return { intact, destroyed: [], colliders };
}
