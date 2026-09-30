// Gera missions/m01-tczew/map-layout.svg a partir de map-layout.json.
// Uso: node missions/m01-tczew/tools/render-map-svg.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(readFileSync(join(here, '..', 'map-layout.json'), 'utf8'));
const mission = JSON.parse(readFileSync(join(here, '..', 'mission.json'), 'utf8'));
const feature = id => layout.features.find(f => f.id === id);

const C = {
  bg: '#f4f1ea', water: '#9cc3d9', flood: '#d8e4c8', ground: '#e6dcc6', strip: '#dccfae',
  bridge: '#3b3b3b', exact: '#1b5e20', recon: '#8d6e00', compressed: '#b23c17',
  cover: '#1565c0', objective: '#6a1b9a', blast: '#c62828', text: '#222', muted: '#666', grid: '#cfc6b0',
};
const dashFor = cls => cls === 'EXACT' ? '' : cls === 'COMPRESSED_FOR_GAMEPLAY' ? '2 4' : '8 5';
const colorFor = cls => cls === 'EXACT' ? C.exact : cls === 'COMPRESSED_FOR_GAMEPLAY' ? C.compressed : C.recon;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function panel({ x0, y0, w, h, minX, maxX, minZ, maxZ, title, detail }) {
  const s = Math.min(w / (maxX - minX), h / (maxZ - minZ));
  const X = x => x0 + (x - minX) * s, Y = z => y0 + (z - minZ) * s;
  const out = [];
  out.push(`<g><rect x="${x0}" y="${y0}" width="${(maxX - minX) * s}" height="${(maxZ - minZ) * s}" fill="${C.ground}" stroke="${C.muted}"/>`);
  out.push(`<text x="${x0}" y="${y0 - 8}" font-size="14" font-weight="700" fill="${C.text}">${esc(title)}</text>`);
  const clip = `clip${detail ? "detail" : "overview"}`;
  out.push(`<clipPath id="${clip}"><rect x="${x0}" y="${y0}" width="${(maxX - minX) * s}" height="${(maxZ - minZ) * s}"/></clipPath><g clip-path="url(#${clip})">`);
  const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(([x, z]) => `${X(x)},${Y(z)}`).join(' ')}" fill="${fill}" ${extra}/>`;
  out.push(poly(feature('east_floodplain').polygon, C.flood));
  out.push(poly(feature('vistula_channel').polygon, C.water));
  out.push(poly(feature('strip_between_approaches').polygon, C.strip, `stroke="${C.recon}" stroke-dasharray="8 5"`));
  const step = detail ? 50 : 200;
  for (let gx = Math.ceil(minX / step) * step; gx <= maxX; gx += step) out.push(`<line x1="${X(gx)}" y1="${Y(minZ)}" x2="${X(gx)}" y2="${Y(maxZ)}" stroke="${C.grid}" stroke-width="0.5"/>`);
  for (let gz = Math.ceil(minZ / step) * step; gz <= maxZ; gz += step) out.push(`<line x1="${X(minX)}" y1="${Y(gz)}" x2="${X(maxX)}" y2="${Y(gz)}" stroke="${C.grid}" stroke-width="0.5"/>`);
  for (const f of layout.features) {
    const col = colorFor(f.classification), dash = dashFor(f.classification);
    if (f.type === 'bridge') {
      const [[ax, , az], [bx, , bz]] = f.polyline, half = f.widthM / 2;
      out.push(`<rect x="${X(ax)}" y="${Y(az - half)}" width="${(bx - ax) * s}" height="${Math.max(2, f.widthM * s)}" fill="${C.bridge}"/>`);
      for (const px of f.pierFacesX) out.push(`<line x1="${X(px)}" y1="${Y(az - half - 3)}" x2="${X(px)}" y2="${Y(az + half + 3)}" stroke="#000" stroke-width="2"/>`);
    } else if (f.polyline && ['terrain', 'road', 'rail', 'objective_path', 'vehicle'].includes(f.type)) {
      const w = f.type === 'vehicle' ? 4 : f.type === 'objective_path' ? 2.5 : 2;
      const stroke = f.type === 'objective_path' ? C.objective : f.type === 'vehicle' ? '#37474f' : col;
      out.push(`<polyline points="${f.polyline.map(p => `${X(p[0])},${Y(p[2])}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-dasharray="${dash}"/>`);
    } else if (f.polygon && ['building', 'landmark', 'sector_area'].includes(f.type)) {
      out.push(poly(f.polygon, f.type === 'sector_area' ? 'none' : '#b0a58c', `stroke="${col}" stroke-width="1.5" stroke-dasharray="${dash}"`));
    } else if (f.box) {
      out.push(`<rect x="${X(f.box.min[0])}" y="${Y(f.box.min[2])}" width="${(f.box.max[0] - f.box.min[0]) * s}" height="${(f.box.max[2] - f.box.min[2]) * s}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="${dash}"/>`);
    }
  }
  for (const bz of layout.blastZones) out.push(`<circle cx="${X(bz.center[0])}" cy="${Y(bz.center[2])}" r="${bz.radiusM * s}" fill="${C.blast}" fill-opacity="0.07" stroke="${C.blast}" stroke-dasharray="6 4"/>`);
  if (detail) {
    for (const c of layout.coverNodes) out.push(`<rect x="${X(c.position[0]) - 3}" y="${Y(c.position[2]) - 3}" width="6" height="6" fill="${C.cover}"><title>${esc(c.id)} (${c.type})</title></rect>`);
    for (const cp of mission.checkpoints) if (Array.isArray(cp.player.position)) {
      const [px, , pz] = cp.player.position;
      out.push(`<circle cx="${X(px)}" cy="${Y(pz)}" r="6" fill="#fff" stroke="${C.exact}" stroke-width="2"/><text x="${X(px) + 8}" y="${Y(pz) - 6}" font-size="11" font-weight="700" fill="${C.exact}">${esc(cp.label)}</text>`);
    }
  }
  const labels = detail
    ? ['squad_post', 'forward_post', 'repair_site_1', 'repair_site_2', 'rally_point', 'firing_point', 'aid_position', 'bak_wound_point', 'shelter', 'rail_hut', 'tczew_station', 'casemates_west']
    : ['tczew_station', 'rail_bridge', 'road_bridge', 'east_gates', 'train_963', 'panzerzug_7', 'firing_point', 'shelter'];
  for (const id of labels) {
    const f = feature(id);
    const p = f.point ?? f.pickup ?? (f.polygon ? f.polygon[0].concat() : null) ?? (f.box ? f.box.min : null) ?? (f.points ? f.points[0] : null) ?? (f.polyline ? f.polyline[0] : null);
    if (!p) continue;
    const [px, pz] = p.length === 2 ? [p[0], p[1]] : [p[0], p[2]];
    const [dx, dy, anchor] = (detail ? DETAIL_LABELS : OVERVIEW_LABELS)[id] ?? [5, -8, 'start'];
    if (f.point || f.pickup) out.push(`<circle cx="${X(px)}" cy="${Y(pz)}" r="3.5" fill="${C.objective}"/>`);
    out.push(`<text x="${X(px) + dx}" y="${Y(pz) + dy}" text-anchor="${anchor}" font-size="${detail ? 11 : 11}" fill="${C.text}" stroke="${C.bg}" stroke-width="3" paint-order="stroke">${esc(f.name.split(' (')[0])}</text>`);
  }
  out.push('</g>');
  out.push(`<text x="${x0}" y="${y0 + (maxZ - minZ) * s + 16}" font-size="11" fill="${C.muted}">Grade de ${step} m · X leste → · Z sul ↓ · norte para cima</text></g>`);
  return { svg: out.join('\n'), height: (maxZ - minZ) * s };
}

// Deslocamentos de rótulo [dx, dy, âncora] em pixels, só para legibilidade do diagrama.
const OVERVIEW_LABELS = {
  rail_bridge: [60, -10, 'start'], road_bridge: [150, 18, 'start'], tczew_station: [0, -10, 'start'],
  firing_point: [8, 22, 'start'], shelter: [-6, 16, 'end'], east_gates: [8, 46, 'start'],
  train_963: [120, -12, 'start'], panzerzug_7: [140, 24, 'start'],
};
const DETAIL_LABELS = {
  squad_post: [0, 22, 'middle'], forward_post: [6, -12, 'start'], repair_site_1: [0, -12, 'middle'],
  repair_site_2: [0, -12, 'middle'], rally_point: [0, 22, 'middle'], firing_point: [0, 36, 'middle'],
  aid_position: [-8, 20, 'end'], bak_wound_point: [6, 22, 'start'], shelter: [8, 4, 'start'],
  rail_hut: [0, -14, 'middle'], casemates_west: [40, 8, 'start'],
};

const W = 1200;
const over = panel({ x0: 30, y0: 60, w: W - 60, h: 330, minX: -500, maxX: 1600, minZ: -300, maxZ: 300, title: 'Visão geral — Tczew (oeste) · Vístula · Lisewo (leste)', detail: false });
const det = panel({ x0: 30, y0: 60 + over.height + 70, w: W - 60, h: 520, minX: -300, maxX: 190, minZ: -40, maxZ: 100, title: 'Detalhe — cabeça de ponte oeste (x −300…190 m; limite jogável completo em map-layout.json)', detail: true });
const legendY = 60 + over.height + 70 + det.height + 40;
const legend = [
  [C.exact, '', 'EXACT (medida documentada)'], [C.recon, '8 5', 'RECONSTRUCTED (a medir)'], [C.compressed, '2 4', 'COMPRESSED_FOR_GAMEPLAY'],
].map(([c, d, t], i) => `<line x1="${30 + i * 330}" y1="${legendY}" x2="${70 + i * 330}" y2="${legendY}" stroke="${c}" stroke-width="3" stroke-dasharray="${d}"/><text x="${78 + i * 330}" y="${legendY + 4}" font-size="12" fill="${C.text}">${t}</text>`).join('\n');
const legend2 = `<rect x="30" y="${legendY + 16}" width="8" height="8" fill="${C.cover}"/><text x="44" y="${legendY + 24}" font-size="12">nó de cobertura</text>
<circle cx="200" cy="${legendY + 20}" r="4" fill="${C.objective}"/><text x="210" y="${legendY + 24}" font-size="12">ponto de objetivo / cena</text>
<circle cx="400" cy="${legendY + 20}" r="6" fill="#fff" stroke="${C.exact}" stroke-width="2"/><text x="412" y="${legendY + 24}" font-size="12">checkpoint (CP-D usa a posição do momento)</text>
<circle cx="740" cy="${legendY + 20}" r="7" fill="${C.blast}" fill-opacity="0.1" stroke="${C.blast}" stroke-dasharray="6 4"/><text x="752" y="${legendY + 24}" font-size="12">zona de demolição (06:10 leste · 06:40 oeste)</text>`;
const H = legendY + 50;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif">
<rect width="100%" height="100%" fill="${C.bg}"/>
<text x="30" y="32" font-size="20" font-weight="700" fill="${C.text}">M01 — Tczew, 1/9/1939 · layout de jogo (gerado de map-layout.json)</text>
${over.svg}
${det.svg}
${legend}
${legend2}
</svg>
`;
writeFileSync(join(here, '..', 'map-layout.svg'), svg);
console.log('map-layout.svg', W, 'x', Math.round(H));
