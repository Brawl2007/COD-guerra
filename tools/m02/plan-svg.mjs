#!/usr/bin/env node
// M02-01 N0 proof: scaled plan (SVG) of the quinta bench, Area A (X -50..50, Z -90..60) plus the C01 approach strip.
// Usage: node tools/m02/plan-svg.mjs [--out docs/m02/n0/quinta-planta.svg]
// Deterministic: same layout + same sources -> same bytes. Read-only over the game data; draws data, decides nothing.
// Plan convention (PDF N, p. 47): north up = -Z, east right = +X, metres. Scale 6 px per metre.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT, loadLayout, openingGeometry } from './n0-common.mjs';

const S = 6; // px per metre
const X0 = -50;
const X1 = 50;
const Z0 = -126; // north edge drawn (C01 approach strip reaches -180 in the layout; only its southern part is drawn)
const Z1 = 62;
const MARGIN_L = 56;
const MARGIN_T = 74;
const MARGIN_B = 86;
const PLAN_W = (X1 - X0) * S;
const PLAN_H = (Z1 - Z0) * S;
const LEGEND_W = 360;
const WIDTH = MARGIN_L + PLAN_W + 24 + LEGEND_W;
const DETAIL_SC = 18; // px per metre in the building detail panels
const DETAIL_H = 700;
const DETAIL_Y0 = MARGIN_T + PLAN_H + MARGIN_B;
const HEIGHT = DETAIL_Y0 + DETAIL_H;

// Fixed number formatting: two decimals at most, no "-0", no exponent -> byte-stable output.
const f = (n) => {
  const v = Math.round(n * 100) / 100;
  return String(v === 0 ? 0 : v);
};
const px = (x) => f(MARGIN_L + (x - X0) * S);
const py = (z) => f(MARGIN_T + (z - Z0) * S);
const len = (m) => f(m * S);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sign = (n) => (n < 0 ? `−${f(-n)}` : f(n)); // typographic minus for axis labels

const MATERIAL_FILL = {
  earth: '#b59b72', stone: '#9a9a96', brick: '#a8614a', wood_thick: '#8a6a3d', wood_thin: '#b48b4a', metal: '#7d8a94',
};


// Draws one building: footprint, rooms, props, posts, walls with gaps, door/window bars and labels.
// m = { sx(xm), sz(zm) -> px, sc px/m, detail (larger labels + room names), prefix for element ids }.
function drawBuilding(w, b, ops, opNo, m) {
  const X = (xm) => f(m.sx(xm));
  const Z = (zm) => f(m.sz(zm));
  const D = (d) => f(d * m.sc);
  const [bx0, bx1, bz0, bz1] = b.bounds;
  const bops = ops.filter((o) => o.buildingId === b.id);
  w(`<g id="${m.prefix}${esc(b.id)}"><title>${esc(b.id)} · ${esc(b.name)} · ${b.width} × ${b.depth} m</title>`);
  w(`<rect x="${X(bx0)}" y="${Z(bz0)}" width="${D(bx1 - bx0)}" height="${D(bz1 - bz0)}" fill="#d8b98a" fill-opacity="0.55"/>`);
  for (const rm of b.rooms) {
    w(`<rect x="${X(bx0 + rm.u0)}" y="${Z(bz0 + rm.v0)}" width="${D(rm.w)}" height="${D(rm.d)}" fill="none" stroke="#9c8157" stroke-width="0.5" stroke-dasharray="2 2"/>`);
    if (m.detail) w(`<text x="${X(bx0 + rm.u0 + rm.w / 2)}" y="${Z(bz0 + rm.v0 + rm.d / 2)}" text-anchor="middle" font-size="8.5" fill="#5d4626">${esc(rm.id)}</text>`);
  }
  for (const p of b.props ?? []) {
    w(`<rect x="${X(bx0 + p.u)}" y="${Z(bz0 + p.v)}" width="${D(p.w)}" height="${D(p.d)}" fill="#8a6a3d" fill-opacity="0.55" stroke="#5d4626" stroke-width="0.6"><title>${esc(p.id)} · h ${f(p.h)} m</title></rect>`);
  }
  for (const p of b.posts ?? []) {
    w(`<rect x="${X(bx0 + p.u - p.size / 2)}" y="${Z(bz0 + p.v - p.size / 2)}" width="${D(p.size)}" height="${D(p.size)}" fill="#2c2418"><title>${esc(p.id)}</title></rect>`);
  }
  const byWall = new Map();
  for (const op of bops) {
    if (!byWall.has(op.wallId)) byWall.set(op.wallId, []);
    byWall.get(op.wallId).push(op);
  }
  for (const wall of b.walls) {
    const horiz = Math.abs(wall.v1 - wall.v0) < 1e-6;
    const a0 = horiz ? Math.min(wall.u0, wall.u1) : Math.min(wall.v0, wall.v1);
    const a1 = horiz ? Math.max(wall.u0, wall.u1) : Math.max(wall.v0, wall.v1);
    const fixed = horiz ? wall.v0 : wall.u0;
    const gaps = (byWall.get(wall.id) ?? []).map((o) => [o.offset - o.width / 2, o.offset + o.width / 2]).sort((p, q) => p[0] - q[0]);
    const segs = [];
    let cur = a0;
    for (const [g0, g1] of gaps) {
      const gg0 = a0 + g0;
      const gg1 = a0 + g1;
      if (gg0 > cur + 1e-6) segs.push([cur, gg0]);
      cur = Math.max(cur, gg1);
    }
    if (a1 > cur + 1e-6) segs.push([cur, a1]);
    const thick = wall.exterior ? b.wallThickness : 0.15;
    for (const [s0, s1] of segs) {
      const [ux0, uz0, ux1, uz1] = horiz ? [s0, fixed, s1, fixed] : [fixed, s0, fixed, s1];
      w(`<line x1="${X(bx0 + ux0)}" y1="${Z(bz0 + uz0)}" x2="${X(bx0 + ux1)}" y2="${Z(bz0 + uz1)}" stroke="#2c2418" stroke-width="${f(Math.max(1, thick * m.sc))}" stroke-linecap="butt"/>`);
    }
  }
  for (const op of bops) {
    const isDoor = op.kind === 'door';
    const open = op.initialState === 'open' || op.initialState === 'broken';
    const [a, bb] = op.span;
    const colour = isDoor ? '#2f8f4e' : '#2c78b8';
    const thick = m.detail ? 7 : (op.exterior ? 5 : 4);
    w(`<g id="${m.prefix}${esc(op.id)}"><title>${esc(op.id)} (${opNo.get(op.id)}) · ${esc(op.buildingId)} · ${f(op.width)} × ${f(op.clearHeight)} m · ${esc(op.initialState)}</title>`);
    w(`<line x1="${X(a.x)}" y1="${Z(a.z)}" x2="${X(bb.x)}" y2="${Z(bb.z)}" stroke="${colour}" stroke-width="${thick}"${open ? ' stroke-opacity="0.35"' : ''}/>`);
    if (open) w(`<line x1="${X(a.x)}" y1="${Z(a.z)}" x2="${X(bb.x)}" y2="${Z(bb.z)}" stroke="${colour}" stroke-width="1.2" stroke-dasharray="3 2"/>`);
    const k = m.detail ? 2 : 1;
    const ox = op.horiz ? 0 : (op.side === 'oeste' ? -9 * k : op.side === 'este' ? 9 * k : 0);
    const oz = op.horiz ? (op.side === 'norte' ? -5 * k : op.side === 'sul' ? 9 * k : 0) : 0;
    const anchor = op.side === 'oeste' ? 'end' : op.side === 'este' ? 'start' : 'middle';
    const fs = m.detail ? 11 : 8;
    if (op.exterior) {
      w(`<text x="${f(m.sx(op.center.x) + ox)}" y="${f(m.sz(op.center.z) + oz + (op.horiz ? 0 : 3))}" text-anchor="${anchor}" font-size="${fs}" font-weight="bold" fill="${colour}">${opNo.get(op.id)}</text>`);
    } else {
      w(`<text x="${f(m.sx(op.center.x) + (op.horiz ? 0 : 3 * k))}" y="${f(m.sz(op.center.z) + (op.horiz ? -3 * k : 3 * k))}" font-size="${m.detail ? 10 : 7}" font-weight="bold" fill="${colour}">${opNo.get(op.id)}</text>`);
    }
    w('</g>');
  }
  const fs = m.detail ? 13 : (b.id === 'B04' ? 10 : 13);
  w(`<text x="${X((bx0 + bx1) / 2)}" y="${f(m.sz(bz0) - (m.detail ? 30 : 4))}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="#3b2a12">${esc(b.id)}${m.detail ? ` · ${b.width} × ${b.depth} m` : ''}</text>`);
  if (m.detail) w(`<text x="${X((bx0 + bx1) / 2)}" y="${f(m.sz(bz0) - 17)}" text-anchor="middle" font-size="9" fill="#5d4626">${esc(b.name)}</text>`);
  w('</g>');
}

export function buildPlanSvg({ layout, sha256 } = loadLayout()) {
  const out = [];
  const w = (s) => out.push(s);
  const ops = openingGeometry(layout);
  const opNo = new Map();
  let nd = 0;
  let nj = 0;
  for (const op of ops) opNo.set(op.id, op.kind === 'door' ? `P${++nd}` : `J${++nj}`);

  w('<?xml version="1.0" encoding="UTF-8"?>');
  w(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="DejaVu Sans, Verdana, sans-serif">`);
  w('<title>M02-01 Quinta (bancada N0) — planta com escala</title>');
  w(`<desc>Gerada por tools/m02/plan-svg.mjs a partir de missions/m02-bzura/m02-01-quinta-layout.json (sha256 ${sha256}). Norte = −Z (cima), este = +X. Escala 6 px/m. Prova geométrica; não é levantamento nem aprova o N0.</desc>`);
  w('<defs>');
  w(`<clipPath id="clip-plan"><rect x="${f(MARGIN_L)}" y="${f(MARGIN_T)}" width="${f(PLAN_W)}" height="${f(PLAN_H)}"/></clipPath>`);
  w('<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#c9c4b4" stroke-width="2"/></pattern>');
  for (const [id, col] of [['arrow-ditch', '#3b7da6'], ['arrow-orchard', '#c1782b'], ['arrow-mg', '#b3302a'], ['arrow-n', '#111111']]) {
    w(`<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>`);
  }
  w('</defs>');
  w(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f0e4"/>`);
  w(`<text x="${MARGIN_L}" y="26" font-size="17" font-weight="bold" fill="#22362f">M02-01 · Bancada da quinta (N0) · planta com escala</text>`);
  w(`<text x="${MARGIN_L}" y="44" font-size="10.5" fill="#444">Área A: X −50…50, Z −90…60 (100 × 150 m) · norte = −Z (cima), este = +X · metros · 1 quadrícula = 10 m · layout sha256 ${sha256.slice(0, 12)}</text>`);
  w(`<text x="${MARGIN_L}" y="58" font-size="10.5" fill="#444">Gerada de missions/m02-bzura/m02-01-quinta-layout.json; esquemática, não é levantamento histórico nem aprovação do N0.</text>`);

  // ---- plan area ----
  w('<g id="plano" clip-path="url(#clip-plan)">');
  w(`<rect x="${f(MARGIN_L)}" y="${f(MARGIN_T)}" width="${f(PLAN_W)}" height="${f(PLAN_H)}" fill="#e9e6d8"/>`);
  // C01 approach strip (outside the slice): hatched
  w(`<rect id="zona-c01" x="${px(X0)}" y="${py(Z0)}" width="${len(X1 - X0)}" height="${len(-90 - Z0)}" fill="url(#hatch)"/>`);
  // grid 10 m
  w('<g id="grelha" stroke="#cfcab9" stroke-width="0.6">');
  for (let x = X0; x <= X1; x += 10) w(`<line x1="${px(x)}" y1="${py(Z0)}" x2="${px(x)}" y2="${py(Z1)}"${x === 0 ? ' stroke="#b3ad98" stroke-width="1"' : ''}/>`);
  for (let z = -120; z <= Z1; z += 10) w(`<line x1="${px(X0)}" y1="${py(z)}" x2="${px(X1)}" y2="${py(z)}"${z === 0 ? ' stroke="#b3ad98" stroke-width="1"' : ''}/>`);
  w('</g>');
  // slice contour (Area A)
  const pb = layout.bounds.playable;
  w(`<rect id="contorno-slice" x="${px(pb.minX)}" y="${py(pb.minZ)}" width="${len(pb.maxX - pb.minX)}" height="${len(pb.maxZ - pb.minZ)}" fill="none" stroke="#22362f" stroke-width="2.4"/>`);

  const z = layout.zones;
  // courtyard
  w(`<rect id="zona-patio" x="${px(z.courtyard.minX)}" y="${py(z.courtyard.minZ)}" width="${len(z.courtyard.maxX - z.courtyard.minX)}" height="${len(z.courtyard.maxZ - z.courtyard.minZ)}" fill="#dccfa6" fill-opacity="0.75" stroke="#b9a96f" stroke-width="1"/>`);
  w(`<text x="${px((z.courtyard.minX + z.courtyard.maxX) / 2)}" y="${py(7)}" text-anchor="middle" font-size="12" font-weight="bold" fill="#7c6d3a" fill-opacity="0.8">PÁTIO</text>`);
  // orchard
  w(`<rect id="zona-pomar" x="${px(z.orchard.minX)}" y="${py(z.orchard.minZ)}" width="${len(z.orchard.maxX - z.orchard.minX)}" height="${len(z.orchard.maxZ - z.orchard.minZ)}" fill="#c9d6aa" fill-opacity="0.8" stroke="#7e9460" stroke-width="1"/>`);
  w(`<text x="${px((z.orchard.minX + z.orchard.maxX) / 2)}" y="${py(57.5)}" text-anchor="middle" font-size="12" font-weight="bold" fill="#4d6a3d">POMAR</text>`);
  // ditch: outer = bank/ramps, inner = flat floor; ramps dashed
  const d = z.ditch;
  w('<g id="vala">');
  w(`<rect id="zona-vala" x="${px(d.minX)}" y="${py(d.minZ)}" width="${len(d.maxX - d.minX)}" height="${len(d.maxZ - d.minZ)}" fill="#9db5c0" fill-opacity="0.85" stroke="#4c7084" stroke-width="1.2"/>`);
  const flatHalf = Math.max(0.8, (d.maxX - d.minX) / 2 - d.bankWidth);
  const cx = (d.minX + d.maxX) / 2;
  w(`<rect x="${px(cx - flatHalf)}" y="${py(d.minZ)}" width="${len(flatHalf * 2)}" height="${len(d.maxZ - d.minZ)}" fill="#7f9eac" fill-opacity="0.8"/>`);
  for (const r of d.ramps) {
    w(`<rect id="${esc(r.id)}" x="${px(r.minX)}" y="${py(r.minZ)}" width="${len(r.maxX - r.minX)}" height="${len(r.maxZ - r.minZ)}" fill="none" stroke="#4c7084" stroke-width="1" stroke-dasharray="4 3"><title>${esc(r.id)}</title></rect>`);
  }
  w(`<text transform="translate(${px(cx + 0.6)} ${py(25)}) rotate(-90)" font-size="11" font-weight="bold" fill="#35586c" text-anchor="middle">VALA (cota ${f(d.floorY)} m)</text>`);
  w('</g>');
  // north gate marker
  w(`<g id="portao-norte"><line x1="${px(z.northGate.x - z.northGate.width / 2)}" y1="${py(z.northGate.z)}" x2="${px(z.northGate.x + z.northGate.width / 2)}" y2="${py(z.northGate.z)}" stroke="#22362f" stroke-width="2" stroke-dasharray="3 2"/><text x="${px(z.northGate.x + 2.2)}" y="${py(z.northGate.z + 2)}" font-size="9" fill="#22362f">Portão (${f(z.northGate.x)}; ${sign(z.northGate.z)}) vão ${f(z.northGate.width)} m</text></g>`);

  // exterior covers (+ C01 corridor covers) and fences
  w('<g id="coberturas-exteriores">');
  const covers = [...layout.exteriorCovers, ...layout.c01Corridor.covers];
  for (const c of covers) {
    const fence = Boolean(c.destructibleFence);
    const fill = MATERIAL_FILL[c.material] ?? '#999';
    w(`<rect id="${esc(c.id)}" x="${px(c.min[0])}" y="${py(c.min[2])}" width="${len(c.max[0] - c.min[0])}" height="${len(c.max[2] - c.min[2])}" fill="${fill}" stroke="#3a2f1c" stroke-width="${fence ? 1.4 : 0.8}"${fence ? ' stroke-dasharray="5 2"' : ''}><title>${esc(c.id)} · ${esc(c.name)} · ${esc(c.material)} · h ${f(c.max[1])} m${fence ? ' · cerca destrutível' : ''}</title></rect>`);
  }
  // cover labels (short, placed above the rect)
  const coverLabel = {
    cov_gate_wall_west: 'muro do portão O', cov_gate_wall_east: 'muro do portão E',
    cov_well_courtyard: 'poço', cov_b04_woodpile: 'lenha B04', cov_south_fence_west: 'cerca sul O', cov_south_fence_east: 'cerca sul E',
    cov_orchard_bank_ne: 'talude NE', cov_c01_p1_trench_lip: 'vala P1', cov_c01_mid_culvert: 'murete', cov_c01_outpost_parapet: 'parapeito EA0',
  };
  for (const c of covers) {
    const t = coverLabel[c.id];
    if (!t) continue;
    const below = c.id === 'cov_b04_woodpile' || c.id === 'cov_c01_outpost_parapet' || c.id.startsWith('cov_south_fence');
    w(`<text x="${px((c.min[0] + c.max[0]) / 2)}" y="${py(below ? c.max[2] + 2.4 : c.min[2] - 0.8)}" text-anchor="middle" font-size="7.5" fill="#3a2f1c">${esc(t)}</text>`);
  }
  w('</g>');

  // orchard trees: 7 candidates
  w('<g id="macieiras">');
  layout.orchardTrees.forEach((t, i) => {
    w(`<circle id="${esc(t.id)}" cx="${px(t.x)}" cy="${py(t.z)}" r="${len(t.canopyRadius)}" fill="#8aa56c" fill-opacity="0.75" stroke="#3f5c2c" stroke-width="1"><title>${esc(t.id)} · ${esc(t.status)} · copa Ø ${f(t.canopyRadius * 2)} m</title></circle>`);
    w(`<circle cx="${px(t.x)}" cy="${py(t.z)}" r="${len(t.trunkRadius)}" fill="#5a3f22"/>`);
    w(`<text x="${px(t.x)}" y="${py(t.z + t.canopyRadius + 1.3)}" text-anchor="middle" font-size="8" fill="#2f4a20">M${i + 1}</text>`);
  });
  w('</g>');

  // buildings (plan scale) with their openings
  w('<g id="edificios">');
  for (const b of layout.buildings) {
    drawBuilding(w, b, ops, opNo, { sx: (x) => MARGIN_L + (x - X0) * S, sz: (zm) => MARGIN_T + (zm - Z0) * S, sc: S, detail: false, prefix: '' });
  }
  w('</g>');

  // MG34 arc (B02 west window) + emplacement
  const mg = layout.mgEmplacement;
  const arcPts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const ang = mg.facing - mg.arcHalfAngle + (2 * mg.arcHalfAngle * i) / steps;
    arcPts.push(`${px(mg.x + Math.cos(ang) * mg.range)},${py(mg.z + Math.sin(ang) * mg.range)}`);
  }
  w(`<polygon id="arco-mg" points="${px(mg.x)},${py(mg.z)} ${arcPts.join(' ')}" fill="#b3402a" fill-opacity="0.07" stroke="#b3402a" stroke-opacity="0.45" stroke-width="0.8" stroke-dasharray="6 3"><title>Arco da MG34: centro ${f(mg.facing)} rad, meio-ângulo ${f(mg.arcHalfAngle)} rad, alcance ${f(mg.range)} m</title></polygon>`);

  // routes
  w('<g id="rotas" fill="none" stroke-width="2.4" stroke-linejoin="round">');
  const routeStyle = { ditch: ['#3b7da6', 'Rota da vala'], orchard: ['#c1782b', 'Circuito do pomar'] };
  for (const [name, pts] of Object.entries(layout.routes)) {
    const [col, label] = routeStyle[name] ?? ['#555', name];
    w(`<polyline id="rota-${esc(name)}" points="${pts.map((p) => `${px(p[0])},${py(p[1])}`).join(' ')}" stroke="${col}" stroke-opacity="0.9" marker-end="url(#arrow-${esc(name)})"><title>${esc(label)}</title></polyline>`);
    pts.forEach((p, i) => w(`<circle cx="${px(p[0])}" cy="${py(p[1])}" r="2.4" fill="${col}" stroke="none"><title>${esc(name)} #${i + 1} (${f(p[0])}; ${f(p[1])})</title></circle>`));
  }
  w('</g>');

  // actors
  w('<g id="atores">');
  for (const a of layout.polishSquad) {
    w(`<circle id="${esc(a.id)}" cx="${px(a.x)}" cy="${py(a.z)}" r="2.6" fill="#2d6cb5" stroke="#fff" stroke-width="0.6"><title>${esc(a.id)} · ${esc(a.role)}</title></circle>`);
  }
  for (const a of layout.enemyRosterEA1) {
    w(`<rect id="${esc(a.id)}" x="${f(Number(px(a.x)) - 3)}" y="${f(Number(py(a.z)) - 3)}" width="6" height="6" fill="#b3302a" stroke="#fff" stroke-width="0.6"><title>${esc(a.id)} · EA1 ${esc(a.role)}</title></rect>`);
    w(`<text x="${px(a.x)}" y="${f(Number(py(a.z)) - 5)}" text-anchor="middle" font-size="6.5" fill="#7a1d18">${esc(a.id.replace('DE-', ''))}</text>`);
  }
  for (const a of layout.c01Corridor.enemyRosterEA0) {
    w(`<polygon id="${esc(a.id)}" points="${px(a.x)},${f(Number(py(a.z)) - 4)} ${f(Number(px(a.x)) + 3.6)},${f(Number(py(a.z)) + 3)} ${f(Number(px(a.x)) - 3.6)},${f(Number(py(a.z)) + 3)}" fill="#5a1410" stroke="#fff" stroke-width="0.6"><title>${esc(a.id)} · EA0 ${esc(a.role)}</title></polygon>`);
    w(`<text x="${px(a.x)}" y="${f(Number(py(a.z)) - 6)}" text-anchor="middle" font-size="6.5" fill="#5a1410">${esc(a.id.replace('DE-', ''))}</text>`);
  }
  const mgX = Number(px(mg.x));
  const mgY = Number(py(mg.z));
  w(`<g id="${esc(mg.id)}"><title>${esc(mg.id)} · ${esc(mg.name)} · (${f(mg.x)}; ${f(mg.z)})</title><circle cx="${f(mgX)}" cy="${f(mgY)}" r="5" fill="#ffffff" stroke="#b3302a" stroke-width="2"/><line x1="${f(mgX)}" y1="${f(mgY)}" x2="${f(mgX - 22)}" y2="${f(mgY)}" stroke="#b3302a" stroke-width="2" marker-end="url(#arrow-mg)"/><text x="${f(mgX + 6)}" y="${f(mgY - 12)}" font-size="9" font-weight="bold" fill="#b3302a" stroke="#f4f0e4" stroke-width="2.5" paint-order="stroke">MG34</text></g>`);
  w('</g>');

  // start + SN points
  const st = layout.start;
  w(`<g id="arranque"><path d="M${px(st.x)} ${f(Number(py(st.z)) - 7)} l6 11 h-12 z" fill="#2d6cb5" stroke="#fff" stroke-width="0.8"/><text x="${f(Number(px(st.x)) + 9)}" y="${f(Number(py(st.z)) + 14)}" font-size="8" fill="#1d4378">arranque (${f(st.x)}; ${sign(st.z)})</text></g>`);
  w('<g id="pontos-sn">');
  for (const p of layout.slicePanoramaPoints) {
    w(`<g id="${esc(p.id)}"><title>${esc(p.id)} · ${esc(p.label)} · (${f(p.x)}; ${f(p.z)})</title><circle cx="${px(p.x)}" cy="${py(p.z)}" r="5" fill="#fff" stroke="#111" stroke-width="1.6"/><text x="${f(Number(px(p.x)) + 7)}" y="${f(Number(py(p.z)) - 5)}" font-size="10" font-weight="bold" fill="#111" stroke="#f4f0e4" stroke-width="2.5" paint-order="stroke">${esc(p.id)}</text></g>`);
  }
  w('</g>');
  // slice frame labels
  w(`<text x="${px(X0 + 1)}" y="${py(-91.2)}" font-size="9" fill="#5f5a48">Fora da Área A: aproximação C01 (Z −180…−90; só se vê até Z −126) · EA0 em Z ≈ −110</text>`);
  w('</g>'); // /plano

  // frame + axes
  w(`<rect x="${f(MARGIN_L)}" y="${f(MARGIN_T)}" width="${f(PLAN_W)}" height="${f(PLAN_H)}" fill="none" stroke="#22362f" stroke-width="1"/>`);
  w('<g id="eixos" font-size="9" fill="#333" text-anchor="middle">');
  for (let x = X0; x <= X1; x += 10) w(`<text x="${px(x)}" y="${f(MARGIN_T + PLAN_H + 13)}">${sign(x)}</text>`);
  for (let zz = -120; zz <= Z1; zz += 10) w(`<text x="${f(MARGIN_L - 6)}" y="${f(Number(py(zz)) + 3)}" text-anchor="end">${sign(zz)}</text>`);
  w(`<text x="${f(MARGIN_L + PLAN_W / 2)}" y="${f(MARGIN_T + PLAN_H + 28)}" font-size="10">X · este (m)</text>`);
  w(`<text transform="translate(14 ${f(MARGIN_T + PLAN_H / 2)}) rotate(-90)" font-size="10">Z · sul (m) — norte = −Z</text>`);
  w('</g>');

  // scale bar (10 m and 50 m)
  const sbX = MARGIN_L + 12;
  const sbY = MARGIN_T + PLAN_H + 50;
  w('<g id="escala" font-size="9" fill="#111">');
  w(`<rect x="${f(sbX)}" y="${f(sbY)}" width="${len(10)}" height="5" fill="#111"/><rect x="${f(sbX + 10 * S)}" y="${f(sbY)}" width="${len(10)}" height="5" fill="#fff" stroke="#111"/><rect x="${f(sbX + 20 * S)}" y="${f(sbY)}" width="${len(30)}" height="5" fill="#111"/>`);
  w(`<text x="${f(sbX)}" y="${f(sbY + 15)}" text-anchor="middle">0</text><text x="${f(sbX + 10 * S)}" y="${f(sbY + 15)}" text-anchor="middle">10</text><text x="${f(sbX + 20 * S)}" y="${f(sbY + 15)}" text-anchor="middle">20</text><text x="${f(sbX + 50 * S)}" y="${f(sbY + 15)}" text-anchor="middle">50 m</text>`);
  w(`<text x="${f(sbX + 50 * S + 28)}" y="${f(sbY + 6)}">6 px = 1 m (esquemático)</text>`);
  w('</g>');

  // north arrow (top right of plan, inside the frame)
  const nx = MARGIN_L + PLAN_W - 26;
  const ny = MARGIN_T + 60;
  w(`<g id="norte"><line x1="${f(nx)}" y1="${f(ny)}" x2="${f(nx)}" y2="${f(ny - 40)}" stroke="#111" stroke-width="2" marker-end="url(#arrow-n)"/><text x="${f(nx)}" y="${f(ny + 13)}" text-anchor="middle" font-size="12" font-weight="bold">N</text><text x="${f(nx)}" y="${f(ny + 24)}" text-anchor="middle" font-size="7.5">(−Z)</text></g>`);

  // legend
  const lx = MARGIN_L + PLAN_W + 24;
  let ly = MARGIN_T;
  w('<g id="legenda" font-size="10" fill="#222">');
  const head = (t) => { w(`<text x="${lx}" y="${f(ly)}" font-weight="bold" font-size="11">${esc(t)}</text>`); ly += 16; };
  const item = (swatch, text) => { w(swatch(lx, ly)); w(`<text x="${lx + 26}" y="${f(ly + 8)}">${esc(text)}</text>`); ly += 15; };
  head('Legenda');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#d8b98a" fill-opacity="0.8" stroke="#2c2418"/>`, 'Edifício B01–B04 (paredes a cheio)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#2f8f4e"/>`, 'P# porta (cheia = fechada, ténue = aberta)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#2c78b8"/>`, 'J# janela (ténue = aberta)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#b48b4a" stroke="#3a2f1c" stroke-dasharray="4 2"/>`, 'Cerca destrutível (tracejada)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#a8614a"/>`, 'Cobertura exterior (cor = material)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#7f9eac" stroke="#4c7084"/>`, 'Vala (rampas a tracejado)');
  item((x, y) => `<rect x="${x}" y="${y}" width="18" height="10" fill="#c9d6aa" stroke="#7e9460"/>`, 'Pomar · M1–M7 macieiras candidatas');
  item((x, y) => `<line x1="${x}" y1="${y + 5}" x2="${x + 18}" y2="${y + 5}" stroke="#3b7da6" stroke-width="3"/>`, 'Rota da vala');
  item((x, y) => `<line x1="${x}" y1="${y + 5}" x2="${x + 18}" y2="${y + 5}" stroke="#c1782b" stroke-width="3"/>`, 'Circuito do pomar');
  item((x, y) => `<circle cx="${x + 9}" cy="${y + 5}" r="5" fill="#fff" stroke="#111" stroke-width="1.6"/>`, 'SN1–SN5 pontos de captura (layout)');
  item((x, y) => `<path d="M${x + 9} ${y - 1} l6 11 h-12 z" fill="#2d6cb5"/>`, 'Arranque · círculos azuis = esquadra PL');
  item((x, y) => `<rect x="${x + 6}" y="${y + 2}" width="6" height="6" fill="#b3302a"/>`, 'EA1 (10 defensores DE-A05…A14)');
  item((x, y) => `<polygon points="${x + 9},${y} ${x + 13},${y + 8} ${x + 5},${y + 8}" fill="#5a1410"/>`, 'EA0 (posto fora da Área A, Z ≈ −110)');
  item((x, y) => `<polygon points="${x},${y + 5} ${x + 18},${y} ${x + 18},${y + 10}" fill="#b3402a" fill-opacity="0.2" stroke="#b3402a" stroke-dasharray="4 2"/>`, 'Arco de tiro da MG34 de B02');
  ly += 10;
  head('Vãos (ID · edifício · L × A · estado inicial)');
  for (const op of ops) {
    w(`<text x="${lx}" y="${f(ly)}" font-size="8.5"><tspan font-weight="bold" fill="${op.kind === 'door' ? '#2f8f4e' : '#2c78b8'}">${opNo.get(op.id)}</tspan> ${esc(op.id)} · ${esc(op.buildingId)} · ${f(op.width)} × ${f(op.clearHeight)} · ${esc(op.initialState)}</text>`);
    ly += 12.5;
  }
  ly += 10;
  head('Pontos SN (x; z)');
  for (const p of layout.slicePanoramaPoints) {
    w(`<text x="${lx}" y="${f(ly)}" font-size="8.5"><tspan font-weight="bold">${esc(p.id)}</tspan> (${sign(p.x)}; ${sign(p.z)}) ${esc(p.label)}</text>`);
    ly += 12.5;
  }
  ly += 10;
  head('Posições-chave');
  const ea0 = layout.c01Corridor.enemyRosterEA0;
  const keyLines = [
    `MG34: (${f(mg.x)}; ${sign(mg.z)}) · boca na simulação (11,82; −30)`,
    `Rota vala: ${layout.routes.ditch.length} pontos · pomar: ${layout.routes.orchard.length} pontos`,
    `EA1: ${layout.enemyRosterEA1.length} · EA0: ${ea0.length} · PL: ${layout.polishSquad.length}`,
    `Macieiras candidatas: ${layout.orchardTrees.length} (estado «${layout.orchardTrees[0].status}»)`,
  ];
  for (const t of keyLines) { w(`<text x="${lx}" y="${f(ly)}" font-size="8.5">${esc(t)}</text>`); ly += 12.5; }
  w('</g>');

  // building detail panels (18 px/m): walls, rooms, props, doors/windows with their P#/J# numbers
  w('<g id="detalhe-edificios">');
  w(`<line x1="${MARGIN_L}" y1="${DETAIL_Y0 - 8}" x2="${WIDTH - 24}" y2="${DETAIL_Y0 - 8}" stroke="#22362f" stroke-width="1"/>`);
  w(`<text x="${MARGIN_L}" y="${DETAIL_Y0 + 14}" font-size="12" font-weight="bold" fill="#22362f">Detalhe de B01–B04 (${DETAIL_SC} px/m; mesma orientação: norte em cima; P# portas, J# janelas — IDs na legenda)</text>`);
  const rowTop = [DETAIL_Y0 + 70, DETAIL_Y0 + 70 + 14 * DETAIL_SC + 80];
  const placements = [
    ['B01', MARGIN_L + 40, rowTop[0]],
    ['B02', MARGIN_L + 40 + 14 * DETAIL_SC + 110, rowTop[0]],
    ['B03', MARGIN_L + 40, rowTop[1]],
    ['B04', MARGIN_L + 40 + 18 * DETAIL_SC + 140, rowTop[1]],
  ];
  for (const [id, ox, oy] of placements) {
    const b = layout.buildings.find((x) => x.id === id);
    drawBuilding(w, b, ops, opNo, { sx: (x) => ox + (x - b.bounds[0]) * DETAIL_SC, sz: (zm) => oy + (zm - b.bounds[2]) * DETAIL_SC, sc: DETAIL_SC, detail: true, prefix: 'detalhe-' });
  }
  w(`<text x="${MARGIN_L + 40}" y="${DETAIL_Y0 + DETAIL_H - 20}" font-size="9" fill="#444">Paredes: exteriores à espessura do layout, interiores esquemáticas (0,15 m). Barras ténues = vão aberto no estado inicial. Aberturas coincidem com os vãos do layout (offset ± largura/2).</text>`);
  w('</g>');

  w('</svg>');
  return `${out.join('\n')}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const outPath = path.resolve(REPO_ROOT, outIdx >= 0 ? argv[outIdx + 1] : 'docs/m02/n0/quinta-planta.svg');
  const svg = buildPlanSvg();
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg);
  process.stdout.write(`wrote ${path.relative(REPO_ROOT, outPath)} (${svg.length} bytes)\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
