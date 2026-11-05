#!/usr/bin/env node
// M02-01 N0 proof: opening (door/window) table, MG34 lines of fire, PDF comparison and problem list.
// Usage: node tools/m02/openings-table.mjs [--out docs/m02/n0/tabela-vaos.md]
// Deterministic: same layout + same sources -> same bytes. Read-only over the game data.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { movePlayer, deepestWall } from '../../src/world/m01-player-physics.js';
import { traceObstruction } from '../../src/world/spatial.js';
import {
  REPO_ROOT, PLAYER, PDF_SN, PDF_BUILDINGS, PDF_DOORS, loadLayout, readPanoramaViews, readSimMuzzle,
  openingGeometry, makeWorld, probePassage, lateralPassRange, maxPassingRadius, probeSight, sightInfo, actorAt, r2,
} from './n0-common.mjs';

const num = (n, d = 2) => {
  const s = (Math.abs(n) < 0.5 * 10 ** -d ? 0 : n).toFixed(d).replace('.', ',');
  return s;
};
const yn = (b) => (b ? 'sim' : 'não');
const cell = (s) => String(s).replace(/\|/g, '/');
const row = (...cols) => `| ${cols.map(cell).join(' | ')} |`;
const head = (...cols) => `${row(...cols)}\n| ${cols.map(() => '---').join(' | ')} |`;

function blockedLabel(res) {
  return res.passes ? 'sim' : `não (${res.blockerId})`;
}
function sightLabel(res) {
  return res.los ? 'sim' : `não (${res.blockerId})`;
}

function sampleRoute(points, step) {
  const out = [{ s: 0, x: points[0][0], z: points[0][1] }];
  let acc = 0;
  let next = step;
  for (let i = 1; i < points.length; i++) {
    const [x0, z0] = points[i - 1];
    const [x1, z1] = points[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    while (next <= acc + len + 1e-9) {
      const t = (next - acc) / len;
      out.push({ s: next, x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t });
      next += step;
    }
    acc += len;
  }
  const [lx, lz] = points[points.length - 1];
  if (Math.hypot(out[out.length - 1].x - lx, out[out.length - 1].z - lz) > 0.5) out.push({ s: acc, x: lx, z: lz });
  return { samples: out, length: acc };
}

// Mirrors M02BenchSimulation.evaluateMgLineOfFire (src/game/m02-01-simulation.js): same arc test, same trace, same LoS call.
function evaluateMg(world, mg, muzzle, target, eye) {
  const gy = world.heightAt(target.x, target.z);
  const targetActor = actorAt(target.x, target.z, eye, gy);
  const ty = gy + eye;
  const dx = target.x - muzzle.x;
  const dy = ty - muzzle.y;
  const dz = target.z - muzzle.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > mg.range) return { status: 'fora de alcance', exposed: false, dist };
  let diff = Math.abs(Math.atan2(dz, dx) - mg.facing);
  while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
  if (diff > mg.arcHalfAngle) return { status: 'fora de arco', exposed: false, dist, arcDiff: diff };
  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
  const obstruction = traceObstruction(world, muzzle, dir, Math.max(0, dist - 0.15));
  if (obstruction) return { status: `coberto (${obstruction.id ?? obstruction.material})`, exposed: false, dist, arcDiff: diff };
  const los = world.lineOfSight(actorAt(muzzle.x, muzzle.z, muzzle.y, 0), targetActor, { includeFoliage: true });
  return { status: los ? 'EXPOSTO' : 'exposto sem LoS (copa)', exposed: true, dist, arcDiff: diff };
}

function actorClear(world, a, y = 0) {
  const hit = deepestWall(world, a.x, a.z, y, PLAYER.radius, PLAYER.standHeight);
  return hit ? hit.b.id : null;
}

function walkRoute(world, points) {
  const p = { x: points[0][0], z: points[0][1], y: 0, crouched: false };
  p.y = world.heightAt(p.x, p.z);
  let minY = p.y;
  for (let i = 1; i < points.length; i++) {
    const [tx, tz] = points[i];
    let best = Infinity;
    let lastImprove = 0;
    for (let k = 0; k < 4000; k++) {
      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) break;
      if (dist < best - 1e-3) {
        best = dist;
        lastImprove = k;
      } else if (k - lastImprove > 60) {
        return { reached: false, stalledAt: { x: r2(p.x), z: r2(p.z) }, segment: i, target: { x: tx, z: tz }, minY: r2(minY), blocker: actorClear(world, { x: p.x + dx / dist * 0.5, z: p.z + dz / dist * 0.5 }, p.y) };
      }
      const step = Math.min(0.12, dist);
      movePlayer(world, p, (dx / dist) * step, (dz / dist) * step, 1 / 60);
      minY = Math.min(minY, p.y);
    }
  }
  return { reached: true, minY: r2(minY) };
}

export function buildOpeningsMarkdown({ layout, sha256 } = loadLayout()) {
  const problems = [];
  const add = (sev, area, subject, text) => problems.push({ sev, area, subject, text });
  const world = makeWorld(layout);
  const worldOpen = makeWorld(layout, { openAll: true });
  const ops = openingGeometry(layout);
  const r = PLAYER.radius;
  const lines = [];
  const out = (s = '') => lines.push(s);

  out('# Tabela de vãos, linhas de tiro e comparação com o PDF — bancada M02-01 (portão N0)');
  out();
  out('Ficheiro **gerado** por `tools/m02/openings-table.mjs` (não editar à mão). Prova de geometria/colisão/linha de vista sobre os dados reais do layout; **não** é playtest nem aprova o N0.');
  out();
  out(`- Entrada: \`missions/m02-bzura/m02-01-quinta-layout.json\` (sha256 \`${sha256}\`), instanciado com \`M02QuintaWorld\`.`);
  out(`- Cápsula do jogador (\`PLAYER_PHYSICS\`, src/world/m01-player-physics.js, usada por \`m02-01-simulation.js\`): raio ${num(r)} m (Ø ${num(r * 2)} m), altura em pé ${num(PLAYER.standHeight)} m, agachado ${num(PLAYER.crouchHeight)} m, degrau máximo ${num(PLAYER.stepUp)} m, sem salto. Olhos: em pé ${num(PLAYER.standEye)} m, agachado ${num(PLAYER.crouchEye)} m (\`EYE_HEIGHT\` de src/config.js e o literal de olhos agachado em \`m02-01-simulation.js\`).`);
  out('- Eixos: x este, z sul, y altura (metros). Posição = centro do vão no plano da parede. «Atravessável» = a cápsula passa em linha reta ao longo da normal da parede, com a colisão real (`deepestWall`, `playerSolids`).');
  out('- LoS = `world.lineOfSight` (inclui copas) entre dois pontos à mesma altura, 3 m fora/dentro (1,4 m em paredes interiores), perpendiculares à parede. Bala = qualquer sólido bloqueia; **não há penetração** em `traceObstruction` (\`BALLISTIC_MATERIAL_POLICY.penetrationLoss\` só existe como dados).');
  out();

  // ---------------------------------------------------------------- 1. openings
  out('## 1. Vãos');
  out();
  out('### 1.1 Geometria e passagem do jogador');
  out();
  out(head('ID', 'Edifício · parede', 'Centro (x; z) m', 'Offset (m)', 'L × A livre (m)', 'Peitoril → lintel (m)', 'Estado inicial', 'Atravessável (estado inicial)', 'Atravessável se aberto (em pé / agachado)', `Folga vs Ø ${num(2 * r)} (m)`, 'Raio livre máx. (m)'));
  const rows = [];
  for (const op of ops) {
    const init = probePassage(world, op);
    const open = probePassage(worldOpen, op);
    const openCrouch = probePassage(worldOpen, op, { height: PLAYER.crouchHeight });
    const maxR = maxPassingRadius(worldOpen, op);
    const margin = op.width - 2 * r;
    const isWindow = op.kind === 'window';
    const sillBlocks = isWindow && op.sillY > PLAYER.stepUp;
    const passInit = sillBlocks ? `não (peitoril ${num(op.sillY)} m > degrau ${num(PLAYER.stepUp)} m)` : blockedLabel(init);
    const passOpen = sillBlocks ? 'não (peitoril)' : `${blockedLabel(open)} / ${yn(openCrouch.passes)}`;
    rows.push({ op, init, open, openCrouch, maxR, margin });
    out(row(
      op.id,
      `${op.buildingId} · ${op.wallId} (${op.side})`,
      `${num(op.center.x)}; ${num(op.center.z)}`,
      num(op.offset),
      `${num(op.width)} × ${num(op.clearHeight)}`,
      isWindow ? `${num(op.sillY)} → ${num(op.lintelY)}` : `0,00 → ${num(op.lintelY)}`,
      `${isWindow ? 'vidro ' : 'porta '}${op.initialState}`,
      passInit,
      passOpen,
      isWindow ? 'n/a' : num(margin),
      isWindow ? 'n/a' : num(maxR),
    ));
  }
  out();
  out(`Total: ${ops.filter((o) => o.kind === 'door').length} portas e ${ops.filter((o) => o.kind === 'window').length} janelas (${ops.length} vãos).`);
  out();

  out('### 1.2 Linha de vista e de tiro através do vão');
  out();
  out(`Estado «inicial» = o do layout; «aberto» = porta aberta / vidro aberto. Alturas absolutas ao piso: olhos em pé ${num(PLAYER.standEye)} m, agachado ${num(PLAYER.crouchEye)} m, meio-vão = (peitoril + lintel) / 2 (porta: a meio da altura).`);
  out();
  out(head('ID', 'Estado inicial', 'LoS em pé (inicial)', 'LoS agachado (inicial)', 'Tiro a meio-vão (inicial)', 'LoS em pé (aberto)', 'Tiro a meio-vão (aberto)'));
  const sightRows = [];
  for (const op of ops) {
    const mid = op.kind === 'window' ? (op.sillY + op.lintelY) / 2 : op.lintelY / 2;
    const s = {
      stand: probeSight(world, op, PLAYER.standEye),
      crouch: probeSight(world, op, PLAYER.crouchEye),
      mid: probeSight(world, op, mid),
      standOpen: probeSight(worldOpen, op, PLAYER.standEye),
      midOpen: probeSight(worldOpen, op, mid),
      midH: mid,
    };
    sightRows.push({ op, s });
    out(row(op.id, `${op.kind === 'window' ? 'vidro ' : 'porta '}${op.initialState}`, sightLabel(s.stand), sightLabel(s.crouch), `${sightLabel(s.mid)} (h ${num(mid)})`, sightLabel(s.standOpen), sightLabel(s.midOpen)));
  }
  out();

  // automatic opening checks
  const byWall = new Map();
  for (const op of ops) {
    const k = `${op.buildingId}/${op.wallId}`;
    if (!byWall.has(k)) byWall.set(k, []);
    byWall.get(k).push(op);
  }
  for (const { op, init, open, openCrouch, margin, maxR } of rows) {
    if (op.kind === 'door') {
      if (margin < 0) add('ERRO', 'vãos', op.id, `porta mais estreita que o jogador (${num(op.width)} m < Ø ${num(2 * r)} m).`);
      else if (margin < 0.2) add('AVISO', 'vãos', op.id, `folga lateral ${num(margin)} m (< 0,20 m) para a cápsula de Ø ${num(2 * r)} m.`);
      if (op.lintelY < PLAYER.standHeight) add(op.lintelY < PLAYER.crouchHeight ? 'ERRO' : 'AVISO', 'vãos', op.id, `altura ${num(op.lintelY)} m < jogador em pé ${num(PLAYER.standHeight)} m.`);
      if (op.initialState === 'closed' && init.passes) add('ERRO', 'vãos', op.id, 'porta inicialmente fechada mas sem colisão (a cápsula atravessa-a).');
      if (!open.passes) {
        const lat = lateralPassRange(worldOpen, op);
        const latText = lat ? `o único corredor livre da cápsula tem ${num(lat.max - lat.min)} m de largura (desvio lateral ${num(lat.min)}…${num(lat.max)} m)` : 'não existe nenhum desvio lateral livre';
        add('ERRO', 'vãos', op.id, `porta ${op.initialState === 'open' ? 'aberta' : 'aberta (após interação)'} mas a passagem axial da cápsula (Ø ${num(2 * r)} m, em pé) é bloqueada por \`${open.blockerId}\`; ${latText}.`);
      } else if (open.passes && !openCrouch.passes) add('AVISO', 'vãos', op.id, 'passa em pé mas não agachado.');
      if (open.passes && maxR > 0 && maxR < r) add('ERRO', 'vãos', op.id, `raio livre máximo ${num(maxR)} m < raio do jogador ${num(r)} m.`);
      if (op.width < 1.0) add('AVISO', 'vãos', op.id, `largura ${num(op.width)} m < folga pedonal de 1,0 m do PDF F1 (p. 23).`);
    }
    // wall fit: extent, stubs and overlaps
    const lo = op.offset - op.width / 2 - op.frameWidth;
    const hi = op.offset + op.width / 2 + op.frameWidth;
    if (lo < -1e-6 || hi > op.wallLength + 1e-6) add('ERRO', 'vãos', op.id, `vão (com batentes) ${num(lo)}…${num(hi)} m sai do comprimento da parede (${num(op.wallLength)} m).`);
    const stubL = lo;
    const stubR = op.wallLength - hi;
    for (const [side, stub] of [['início', stubL], ['fim', stubR]]) {
      if (stub > 1e-6 && stub < 0.3) add('AVISO', 'vãos', op.id, `troço de parede de ${num(stub)} m no ${side} da parede (< 0,30 m).`);
    }
  }
  for (const [wallKey, list] of byWall) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const gap = Math.abs(a.offset - b.offset) - (a.width + b.width) / 2 - a.frameWidth - b.frameWidth;
        if (gap < 0) add('ERRO', 'vãos', `${a.id} / ${b.id}`, `sobreposição de vãos na parede ${wallKey} (${num(gap)} m).`);
        else if (gap < 0.3) add('AVISO', 'vãos', `${a.id} / ${b.id}`, `apenas ${num(gap)} m de parede entre vãos em ${wallKey}.`);
      }
    }
  }
  for (const { op, s } of sightRows) {
    const initialOpen = op.kind === 'door' ? op.initialState === 'open' : op.initialState === 'open' || op.initialState === 'broken';
    if (initialOpen && !s.mid.los) add('ERRO', 'linha de tiro', op.id, `vão aberto sem linha de tiro a meio-vão (bloqueio \`${s.mid.blockerId}\`).`);
    if (op.kind === 'window' && op.initialState === 'intact') {
      if (!s.stand.los && s.standOpen.los) add('AVISO', 'linha de tiro', op.id, `vidro intacto bloqueia \`world.lineOfSight\` (bloqueio \`${s.stand.blockerId}\`) embora \`BALLISTIC_MATERIAL_POLICY.glass.blocksSight\` seja false; a política só é consumida para o rótulo do material (\`materialLabel\`), nunca \`blocksSight\`.`);
    }
    if (op.kind === 'window' && !s.standOpen.los && s.mid.los) {
      add('INFO', 'linha de tiro', op.id, `peitoril ${num(op.sillY)} m acima dos olhos em pé (${num(PLAYER.standEye)} m): sem linha de vista a um jogador em pé, mesmo aberta; coerente com PDF F4 p. 25 («sem atirar por uma janela alta incompatível»).`);
    }
  }
  for (const { op } of rows) {
    if (op.kind === 'window' && op.sillY <= PLAYER.stepUp) add('AVISO', 'vãos', op.id, `peitoril ${num(op.sillY)} m ≤ degrau ${num(PLAYER.stepUp)} m: a janela é atravessável a pé.`);
  }

  // ---------------------------------------------------------------- 2. MG lines of fire
  const mg = layout.mgEmplacement;
  const muzzle = readSimMuzzle();
  const gunner = layout.enemyRosterEA1.find((e) => e.id === 'DE-A05');
  const gunnerActor = actorAt(gunner.x, gunner.z, mg.eyeHeight, 0);
  out('## 2. Linhas de tiro da MG34 de B02');
  out();
  out(`Posições da MG nas diferentes fontes: PDF F3 p. 24 (12; -30); layout \`mgEmplacement\` (${num(mg.x)}; ${num(mg.z)}), olho ${num(mg.eyeHeight)} m; artilheiro \`${gunner.id}\` (${num(gunner.x)}; ${num(gunner.z)}); **boca usada pela simulação** (\`evaluateMgLineOfFire\`, \`m02-01-simulation.js\`) (${num(muzzle.x)}; ${num(muzzle.z)}), altura ${num(muzzle.y)} m. Arco: centro ${num(mg.facing, 3)} rad (oeste), meio-ângulo ${num(mg.arcHalfAngle, 2)} rad (${num((mg.arcHalfAngle * 180) / Math.PI, 1)}°), alcance ${num(mg.range, 0)} m.`);
  out();
  out(`A parede oeste de B02 está em x = 12,00 (espessura ${num(layout.buildings.find((b) => b.id === 'B02').wallThickness)} m): a boca da simulação (x = ${num(muzzle.x)}) fica **fora** do edifício, logo o raio da simulação ignora a janela/ombreiras. As colunas «real» traçam o raio a partir do artilheiro (olho ${num(mg.eyeHeight)} m) e mostram o campo de tiro que o vão realmente deixa.`);
  out();
  out('Estado: EXPOSTO = no arco, sem obstrução e com LoS (critério de `evaluateMgLineOfFire`); coberto (id) = primeiro sólido no raio.');
  out();
  const mgRows = [];
  const mgEval = (label, pt) => {
    const gy = world.heightAt(pt.x, pt.z);
    const stand = evaluateMg(world, mg, muzzle, pt, PLAYER.standEye);
    const crouch = evaluateMg(world, mg, muzzle, pt, PLAYER.crouchEye);
    const real = sightInfo(world, gunnerActor, actorAt(pt.x, pt.z, PLAYER.standEye, gy));
    const realCrouch = sightInfo(world, gunnerActor, actorAt(pt.x, pt.z, PLAYER.crouchEye, gy));
    mgRows.push({ label, pt, stand, crouch, real, realCrouch });
    return { stand, crouch, real, realCrouch };
  };

  out('### 2.1 Pontos SN1–SN5 (coordenadas do PDF; SN1 = arranque (0; -80))');
  out();
  out(head('Ponto', '(x; z) m', 'Dist. 3D à boca (m)', 'Sim · em pé', 'Sim · agachado', 'Real · em pé', 'Real · agachado'));
  const snRows = [];
  for (const [id, p] of Object.entries(PDF_SN)) {
    const e = mgEval(id, p);
    snRows.push({ id, ...e });
    if (e.stand.exposed && !e.real.los) add('AVISO', 'MG B02', id, `exposto à MG para a simulação (boca em x = ${num(muzzle.x)}) mas sem linha de vista a partir do artilheiro em (${num(gunner.x)}; ${num(gunner.z)}): bloqueio \`${e.real.blockerId}\`.`);
    out(row(id, `${num(p.x)}; ${num(p.z)}`, num(e.stand.dist), e.stand.status, e.crouch.status, e.real.los ? 'vê' : `bloqueado (${e.real.blockerId})`, e.realCrouch.los ? 'vê' : `bloqueado (${e.realCrouch.blockerId})`));
  }
  const start = layout.start;
  out();
  const startDist = Math.hypot(start.x - muzzle.x, start.z - muzzle.z);
  const seeGunner = sightInfo(world, actorAt(start.x, start.z, PLAYER.standEye, 0), gunnerActor);
  const seeWindow = sightInfo(world, actorAt(start.x, start.z, PLAYER.standEye, 0), actorAt(12, -30, 1.42, 0));
  out(`PDF N2 (p. 48): «MG visível/audível na abertura oeste de B02 … ameaça identificável a cerca de 51 m». Distância horizontal arranque → boca: ${num(startDist, 1)} m. LoS do jogador (em pé) ao artilheiro DE-A05: ${seeGunner.los ? 'sim' : `não (${seeGunner.blockerId})`}; à abertura (12; 1,42; -30): ${seeWindow.los ? 'sim' : `não (${seeWindow.blockerId})`}.`);
  out();

  for (const [name, pts] of Object.entries(layout.routes)) {
    const { samples, length } = sampleRoute(pts, 10);
    out(`### 2.${name === 'ditch' ? 2 : 3} Rota «${name === 'ditch' ? 'vala' : 'pomar'}» (comprimento ${num(length, 1)} m; amostra a cada 10 m)`);
    out();
    out(head('s (m)', '(x; z) m', 'Dist. 3D (m)', 'Sim · em pé', 'Sim · agachado', 'Real · em pé'));
    let exposedStand = 0;
    let exposedCrouch = 0;
    let simExposedRealBlocked = 0;
    for (const s of samples) {
      const e = mgEval(`${name}@${num(s.s, 0)}`, { x: s.x, z: s.z });
      if (e.stand.exposed) exposedStand++;
      if (e.crouch.exposed) exposedCrouch++;
      if (e.stand.exposed && !e.real.los) simExposedRealBlocked++;
      out(row(num(s.s, 0), `${num(s.x, 1)}; ${num(s.z, 1)}`, num(e.stand.dist, 1), e.stand.status, e.crouch.status, e.real.los ? 'vê' : `bloqueado (${e.real.blockerId})`));
    }
    out();
    out(`Resumo: ${exposedStand}/${samples.length} amostras expostas em pé, ${exposedCrouch}/${samples.length} agachado (critério da simulação). Amostras expostas na simulação mas sem LoS a partir do artilheiro real: ${simExposedRealBlocked}.`);
    out();
    if (simExposedRealBlocked > 0) {
      add('AVISO', 'MG B02', `rota ${name}`, `${simExposedRealBlocked} de ${samples.length} amostras são «EXPOSTO» para a simulação (boca fora da parede, x = ${num(muzzle.x)}) mas o artilheiro em (${num(gunner.x)}; ${num(gunner.z)}) não tem linha de vista por trás do vão (secção 2).`);
    }
    if (exposedStand === 0) add('AVISO', 'MG B02', `rota ${name}`, 'nenhuma amostra da rota fica exposta à MG: a rota não testa a ameaça.');
    if (exposedStand === samples.length) add('AVISO', 'MG B02', `rota ${name}`, 'todas as amostras ficam expostas à MG: a rota não tem cobertura.');
  }
  const muzzleOutside = muzzle.x < 12 - layout.buildings.find((b) => b.id === 'B02').wallThickness / 2;
  if (muzzleOutside) {
    add('AVISO', 'MG B02', 'boca da MG', `a simulação traça a partir de (${num(muzzle.x)}; ${num(muzzle.z)}), fora da parede oeste de B02 (x = 12,00); o PDF (p. 24) põe a MG em (12; -30), o layout em x = ${num(mg.x)} e o artilheiro em x = ${num(gunner.x)}. Quatro valores distintos para a mesma posição.`);
  }
  const mountBlocker = actorClear(world, gunner);
  if (mountBlocker) add('AVISO', 'atores', gunner.id, `artilheiro em (${num(gunner.x)}; ${num(gunner.z)}) está dentro do sólido \`${mountBlocker}\` (bancada da MG, h ${num(layout.buildings[1].props.find((p) => p.id === 'prop_b02_mg_mount').h)} m); verificar se é intencional (a cápsula do jogador não pode ocupar este ponto).`);

  // ---------------------------------------------------------------- 3. PDF comparison
  out('## 3. Comparação PDF ↔ layout (B01–B04)');
  out();
  out('Fonte PDF: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, secção F (pp. 23–25) e N (p. 47). ✓ = igual; ✗ = diverge (entra na lista de problemas).');
  out();
  out('### 3.1 Dimensões e implantação');
  out();
  out(head('Edifício', 'PDF (página)', 'Implantação X…, Z… PDF', 'Implantação layout', 'L × P PDF', 'L × P layout', 'Beiral / cumeeira PDF', 'Beiral / cumeeira layout', 'Resultado'));
  for (const b of layout.buildings) {
    const pdf = PDF_BUILDINGS[b.id];
    if (!pdf) continue;
    const bw = b.bounds[1] - b.bounds[0];
    const bd = b.bounds[3] - b.bounds[2];
    const okBounds = pdf.bounds.every((v, i) => v === b.bounds[i]);
    const okSize = pdf.width === b.width && pdf.depth === b.depth && bw === pdf.width && bd === pdf.depth;
    const okHeights = pdf.wallHeight === null || (pdf.wallHeight === b.wallHeight && pdf.ridgeHeight === b.ridgeHeight);
    const ok = okBounds && okSize && okHeights;
    out(row(
      b.id,
      `${pdf.ref}, p. ${pdf.page}`,
      `X ${pdf.bounds[0]}…${pdf.bounds[1]}, Z ${pdf.bounds[2]}…${pdf.bounds[3]}`,
      `X ${b.bounds[0]}…${b.bounds[1]}, Z ${b.bounds[2]}…${b.bounds[3]}`,
      `${pdf.width} × ${pdf.depth}`,
      `${b.width} × ${b.depth} (bounds ${bw} × ${bd})`,
      pdf.wallHeight === null ? 'não indicado' : `${num(pdf.wallHeight, 1)} / ${num(pdf.ridgeHeight, 1)}`,
      `${num(b.wallHeight, 1)} / ${num(b.ridgeHeight, 1)}`,
      ok ? '✓' : '✗',
    ));
    if (!ok) add('ERRO', 'PDF', b.id, 'dimensões/implantação do layout diferem do PDF.');
  }
  out();
  out('B03 e B04: o PDF não fixa beiral/cumeeira (F4 diz só «volume mais baixo que B02»; layout B03 3,0 / 5,4 m < B02 3,6 / 7,2 m ✓).');
  out();

  out('### 3.2 Vãos e divisões citados no PDF');
  out();
  out(head('Elemento', 'PDF diz (página)', 'Layout', 'Resultado'));
  const opById = new Map(ops.map((o) => [o.id, o]));
  const cmp = (el, pdf, lay, ok, sev = 'AVISO') => {
    out(row(el, pdf, lay, ok ? '✓' : '✗'));
    if (!ok) add(sev, 'PDF', el, `PDF: ${pdf}. Layout: ${lay}.`);
  };
  const b01 = layout.buildings.find((b) => b.id === 'B01');
  const b02 = layout.buildings.find((b) => b.id === 'B02');
  const b03 = layout.buildings.find((b) => b.id === 'B03');
  const roomOk = (b, id, [u0, v0, w, d]) => {
    const rm = b.rooms.find((x) => x.id === id);
    return Boolean(rm) && rm.u0 === u0 && rm.v0 === v0 && rm.w === w && rm.d === d;
  };
  cmp('B01 divisões', 'cozinha u0-7/v0-5; despensa u7-9/v0-5; sala u9-14/v0-5; quartos u0-7/v5-10 e u7-14/v5-10 (F2, p. 24)',
    b01.rooms.map((x) => `${x.id} u${x.u0}-${x.u0 + x.w}/v${x.v0}-${x.v0 + x.d}`).join('; '),
    roomOk(b01, 'cozinha', [0, 0, 7, 5]) && roomOk(b01, 'despensa', [7, 0, 2, 5]) && roomOk(b01, 'sala', [9, 0, 5, 5]) && roomOk(b01, 'quarto_oeste', [0, 5, 7, 5]) && roomOk(b01, 'quarto_este', [7, 5, 7, 5]));
  const e = opById.get('door_b01_east_main');
  cmp('door_b01_east_main posição', 'entrada a este em u=14 m, v=2,5 m (F2, p. 24)', `parede ${e.side}, v = ${num(e.offset)} (centro z = ${num(e.center.z)})`, e.offset === 2.5 && e.side === 'este', 'AVISO');
  cmp('door_b01_east_main largura', `${num(PDF_DOORS.door_b01_east_main.width)} m (F1, p. 23: folga pedonal 1,0 m)`, `${num(e.width)} m (≥ mínimo)`, e.width >= PDF_DOORS.door_b01_east_main.width, 'INFO');
  const n = opById.get('door_b01_north_service');
  cmp('door_b01_north_service posição', 'saída de serviço norte em u=3, v=0 (F2, p. 24)', `parede norte, u = ${num(n.offset)}`, n.offset === 3 && n.side === 'norte');
  const intDoors = ['door_b01_kitchen_pantry', 'door_b01_pantry_hall', 'door_b01_kitchen_westbed', 'door_b01_hall_eastbed'];
  cmp('B01 portas internas', 'cozinha–despensa, despensa–sala, cozinha–quarto oeste, sala–quarto este (F2, p. 24)', intDoors.map((id) => id.replace('door_b01_', '')).join(', '), intDoors.every((id) => opById.has(id)));
  cmp('B01 janelas', 'janela oeste da cozinha e janela leste da sala (F2, p. 24; a planta p. 23 mostra mais vãos)', ops.filter((o) => o.kind === 'window' && o.buildingId === 'B01').map((o) => `${o.id.replace('win_b01_', '')} (${o.side})`).join(', '),
    opById.has('win_b01_west_kitchen') && opById.has('win_b01_east_hall'), 'AVISO');
  cmp('B02 faixas', 'v0-4 armazenamento, v4-10 corredor, v10-14 palha (F3, p. 24)', b02.rooms.map((x) => `${x.id} v${x.v0}-${x.v0 + x.d}`).join('; '),
    roomOk(b02, 'armazenamento_norte', [0, 0, 24, 4]) && roomOk(b02, 'corredor_trabalho', [0, 4, 24, 6]) && roomOk(b02, 'palha_sul', [0, 10, 24, 4]));
  const gate = opById.get('door_b02_north_gate');
  cmp('door_b02_north_gate', 'portão norte centrado em u12, vão de 3 m (F3, p. 24)', `parede norte, u = ${num(gate.offset)}, largura ${num(gate.width)} m`, gate.offset === 12 && gate.width === 3 && gate.side === 'norte');
  const sd = opById.get('door_b02_south_door');
  cmp('door_b02_south_door', 'porta sul u18, 1,2 m (F3, p. 24)', `parede sul, u = ${num(sd.offset)}, largura ${num(sd.width)} m, ${sd.initialState}`, sd.offset === 18 && sd.width === 1.2 && sd.side === 'sul');
  const mgw = opById.get('win_b02_west_mg');
  cmp('win_b02_west_mg', 'abertura oeste u0/v8, usada pela MG (F3, p. 24)', `parede oeste, v = ${num(mgw.offset)}, largura ${num(mgw.width)} m, peitoril ${num(mgw.sillY)}`, mgw.offset === 8 && mgw.side === 'oeste');
  cmp('B02 posição da MG', 'MG a (12; -30) (F3, p. 24)', `mgEmplacement (${num(mg.x)}; ${num(mg.z)}); boca da simulação (${num(muzzle.x)}; ${num(muzzle.z)})`, mg.x === 12 && muzzle.x === 12, 'AVISO');
  cmp('B03 corredor', 'corredor central norte-sul u7-11 (F4, p. 25)', `corredor_estabulo u${b03.rooms[0].u0}-${b03.rooms[0].u0 + b03.rooms[0].w}`, roomOk(b03, 'corredor_estabulo', [7, 0, 4, 12]));
  for (const id of ['door_b03_north', 'door_b03_south']) {
    const o = opById.get(id);
    cmp(id, 'portas norte/sul de 2,4 m (F4, p. 25)', `${num(o.width)} × ${num(o.clearHeight)} m, u ${num(o.offset - o.width / 2)}…${num(o.offset + o.width / 2)} (corredor u7…11)`, o.width === 2.4 && o.offset - o.width / 2 >= 7 && o.offset + o.width / 2 <= 11);
  }
  const b03Windows = ops.filter((o) => o.kind === 'window' && o.buildingId === 'B03');
  cmp('B03 janelas altas', 'pequenas janelas altas em ambas as fachadas longas, N e S (F4, p. 25)', b03Windows.map((o) => `${o.id} (${o.side})`).join(', ') || 'nenhuma',
    b03Windows.some((o) => o.side === 'norte') && b03Windows.some((o) => o.side === 'sul'));
  cmp('B03 acesso a arreios', 'acesso pequeno a arreios pelo leste (F4, p. 25)', `portas B03: ${ops.filter((o) => o.kind === 'door' && o.buildingId === 'B03').map((o) => o.side).join(', ')}`, ops.some((o) => o.kind === 'door' && o.buildingId === 'B03' && o.side === 'este'));
  const d4 = opById.get('door_b04_south');
  cmp('door_b04_south', 'porta sul 1 m (F5, p. 25)', `parede sul, u = ${num(d4.offset)}, largura ${num(d4.width)} m`, d4.width === 1 && d4.side === 'sul');
  out();

  // ---------------------------------------------------------------- 4. SN points
  const views = readPanoramaViews();
  const layoutSN = Object.fromEntries(layout.slicePanoramaPoints.map((p) => [p.id, p]));
  out('## 4. Pontos de captura SN1–SN5: PDF ↔ layout ↔ `PANORAMA_VIEWS`');
  out();
  out('PDF: N p. 47 (planta) e N5 p. 49 (texto). Layout: `slicePanoramaPoints`. Código: `PANORAMA_VIEWS` em src/m02/m02-01-main.js (lido por análise de texto; o ficheiro usa `window`). Δ = distância horizontal ao PDF.');
  out();
  out(head('Ponto', 'PDF (x; z)', 'Layout (x; z)', 'Δ layout (m)', 'main.js (x; z)', 'Δ main.js (m)', 'Rumo main.js (rad)', 'Cápsula livre em main.js?', 'Resultado'));
  for (const [id, p] of Object.entries(PDF_SN)) {
    const l = layoutSN[id];
    const v = views[id];
    const dl = Math.hypot(l.x - p.x, l.z - p.z);
    const dv = Math.hypot(v.x - p.x, v.z - p.z);
    const clearV = actorClear(world, v);
    const ok = dl < 0.01 && dv < 0.01;
    out(row(id, `${num(p.x)}; ${num(p.z)}`, `${num(l.x)}; ${num(l.z)}`, num(dl), `${num(v.x)}; ${num(v.z)}`, num(dv), num(v.angle, 3), clearV ? `não (${clearV})` : 'sim', ok ? '✓' : '✗'));
    if (dl >= 0.01) add('AVISO', 'SN', id, `layout (${num(l.x)}; ${num(l.z)}) diverge do PDF (${num(p.x)}; ${num(p.z)}) em ${num(dl)} m.`);
    if (dv >= 0.01) add('AVISO', 'SN', id, `PANORAMA_VIEWS (${num(v.x)}; ${num(v.z)}) diverge do PDF/N5 (${num(p.x)}; ${num(p.z)}) em ${num(dv)} m; a captura N5 deve usar um só conjunto (o PDF é a fonte).`);
    if (clearV) add('AVISO', 'SN', id, `a posição de PANORAMA_VIEWS está dentro de \`${clearV}\`.`);
    const clearP = actorClear(world, p);
    if (clearP) add('AVISO', 'SN', id, `a posição do PDF está dentro de \`${clearP}\`.`);
  }
  out();

  // ---------------------------------------------------------------- 5. routes + actors
  out('## 5. Rotas percorridas pela cápsula e posição dos atores');
  out();
  out('Percurso com `movePlayer` (a mesma física da simulação), passos de 0,12 m, em pé, entre os pontos de cada rota do layout.');
  out();
  out(head('Rota', 'Pontos (x; z)', 'Chega ao fim?', 'Cota mínima (m)', 'Observação'));
  for (const [name, pts] of Object.entries(layout.routes)) {
    const res = walkRoute(world, pts);
    out(row(name, pts.map((p) => `${p[0]}; ${p[1]}`).join(' → '), yn(res.reached), num(res.minY), res.reached ? 'sem bloqueio' : `bloqueada perto de (${num(res.stalledAt.x)}; ${num(res.stalledAt.z)}) no troço ${res.segment} rumo a (${res.target.x}; ${res.target.z})${res.blocker ? `, sólido \`${res.blocker}\`` : ''}`));
    if (!res.reached) add('ERRO', 'rotas', `rota ${name}`, `a cápsula do jogador fica bloqueada perto de (${num(res.stalledAt.x)}; ${num(res.stalledAt.z)}) no troço ${res.segment}.`);
  }
  out();
  out(head('Ator', 'Papel', '(x; z) m', 'Dentro de sólido?'));
  const actors = [
    { id: 'jogador (start)', role: 'início', x: layout.start.x, z: layout.start.z },
    ...layout.polishSquad.map((a) => ({ id: a.id, role: `PL ${a.role}`, x: a.x, z: a.z })),
    ...layout.enemyRosterEA1.map((a) => ({ id: a.id, role: `EA1 ${a.role}${a.buildingId ? ` (${a.buildingId})` : ''}`, x: a.x, z: a.z })),
    ...layout.c01Corridor.enemyRosterEA0.map((a) => ({ id: a.id, role: `EA0 ${a.role}`, x: a.x, z: a.z })),
  ];
  for (const a of actors) {
    const hit = actorClear(world, a, world.heightAt(a.x, a.z));
    out(row(a.id, a.role, `${num(a.x)}; ${num(a.z)}`, hit ? `sim (${hit})` : 'não'));
    if (hit && a.id !== gunner.id) add('AVISO', 'atores', a.id, `posição (${num(a.x)}; ${num(a.z)}) coincide com o sólido \`${hit}\` (cápsula Ø ${num(2 * r)} m).`);
  }
  out();
  out(`Contagem: ${layout.enemyRosterEA1.length} inimigos EA1 (PDF N1 p. 48: «dez defensores EA1» ${layout.enemyRosterEA1.length === 10 ? '✓' : '✗'}), ${layout.c01Corridor.enemyRosterEA0.length} EA0 em Z ≈ -110 (fora da Área A, Z -90…60; PDF N1: «o posto EA0 … fica fora deste ensaio»).`);
  if (layout.enemyRosterEA1.length !== 10) add('ERRO', 'PDF', 'EA1', `PDF diz 10 defensores; o layout tem ${layout.enemyRosterEA1.length}.`);
  out();

  // ---------------------------------------------------------------- gate
  const gw = layout.exteriorCovers.find((c) => c.id === 'cov_gate_wall_west');
  const ge = layout.exteriorCovers.find((c) => c.id === 'cov_gate_wall_east');
  const gapW = ge.min[0] - gw.max[0];
  if (Math.abs(gapW - layout.zones.northGate.width) > 0.05) {
    add('AVISO', 'portão norte', 'northGate', `\`zones.northGate.width\` = ${num(layout.zones.northGate.width)} m mas o vão entre os muros (${gw.id} / ${ge.id}) é ${num(gapW)} m.`);
  }

  // ---------------------------------------------------------------- 6. problems
  const order = { ERRO: 0, AVISO: 1, INFO: 2 };
  const sorted = problems
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => order[a.sev] - order[b.sev] || a.i - b.i);
  out('## 6. Lista de problemas');
  out();
  const count = (s) => sorted.filter((p) => p.sev === s).length;
  out(`Gerada automaticamente: ${count('ERRO')} ERRO, ${count('AVISO')} AVISO, ${count('INFO')} INFO. ERRO = contradiz um critério verificável (colisão, largura, PDF); AVISO = a rever pelo Capitão; INFO = coerente com o PDF mas relevante para a captura/jogo.`);
  out();
  out(head('#', 'Sev.', 'Área', 'Elemento', 'Descrição'));
  sorted.forEach((p, i) => out(row(i + 1, p.sev, p.area, p.subject, p.text)));
  out();
  out('Limites desta prova: geometria/colisão estática de cápsula e raios retos; não cobre IA, animação, portas a abrir com tempo, desempenho, aparência nem jogo real.');
  out();

  return { markdown: `${lines.join('\n')}\n`, problems: sorted, ops, rows, sightRows, mgRows };
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const outPath = path.resolve(REPO_ROOT, outIdx >= 0 ? argv[outIdx + 1] : 'docs/m02/n0/tabela-vaos.md');
  const { markdown, problems } = buildOpeningsMarkdown();
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown);
  const c = (s) => problems.filter((p) => p.sev === s).length;
  process.stdout.write(`wrote ${path.relative(REPO_ROOT, outPath)} (${markdown.length} bytes; ${c('ERRO')} ERRO, ${c('AVISO')} AVISO, ${c('INFO')} INFO)\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
