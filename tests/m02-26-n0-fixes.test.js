// M02 · correções N0 da planta/tabela de vãos (docs/m02/n0/tabela-vaos.md, «Lista de problemas»).
// Teste de geometria/estado sobre os dados reais do layout; não é playtest nem aprova o N0.
// Cada grupo reproduz o defeito com o layout anterior (reconstruído em memória a partir do layout atual) e prova a correção.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage, M02_LAYOUT_SCHEMA_BY_CELL, M02_RETIRED_LAYOUT_SCHEMAS, M02_SAVE_STORAGE_KEY } from '../src/game/m02-save-store.js';
import { M02QuintaWorld, m02MgMuzzle } from '../src/world/m02-quinta-world.js';
import { M01Navigator } from '../src/world/m01-navigation.js';
import { movePlayer, deepestWall } from '../src/world/m01-player-physics.js';
import { traceObstruction, traceShot, eyePosition, visible } from '../src/world/spatial.js';
import { buildOpeningsMarkdown } from '../tools/m02/openings-table.mjs';
import { loadLayout, openingGeometry, makeWorld, probePassage, lateralPassRange, actorAt, PLAYER, PDF_SN } from '../tools/m02/n0-common.mjs';

const SEED = 19390909;
const KEY = M02_SAVE_STORAGE_KEY;
const { layout } = loadLayout();
const openingById = (lay, id) => openingGeometry(lay).find((o) => o.id === id);
const building = (lay, id) => lay.buildings.find((b) => b.id === id);

/** Layout como estava antes das correções N0 (só os campos que cada grupo reverte). */
function withOldWoodpile(lay) {
  const copy = structuredClone(lay);
  const pile = copy.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
  pile.min = [-31.5, 0, 26.2];
  pile.max = [-28.5, 1.15, 27.4];
  return copy;
}

/** Percorre a cápsula a direito, em passos de 0,1 m, de `from` até `to`; devolve se chegou e onde parou. */
function walkStraight(world, from, to, { crouched = false } = {}) {
  const p = { x: from.x, z: from.z, y: world.heightAt(from.x, from.z), crouched };
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.ceil(len / 0.1);
  for (let i = 0; i < steps; i++) {
    movePlayer(world, p, ((to.x - from.x) / len) * 0.1, ((to.z - from.z) / len) * 0.1, 1 / 60);
  }
  return { reached: Math.hypot(to.x - p.x, to.z - p.z) < 0.15, at: { x: p.x, z: p.z } };
}

describe('N0-1: door_b04_south atravessável pela cápsula do jogador e dos NPC (lenha afastada)', () => {
  const door = openingById(layout, 'door_b04_south');
  const inside = { x: door.center.x, z: door.center.z - 2.0 };
  const outside = { x: door.center.x, z: door.center.z + 3.0 };

  it('reprodução: com a lenha onde estava (x -31,5…-28,5) a passagem axial era bloqueada e o corredor livre tinha 0,04 m', () => {
    const old = withOldWoodpile(layout);
    const world = makeWorld(old, { openAll: true });
    assert.equal(probePassage(world, openingById(old, 'door_b04_south')).passes, false);
    assert.equal(probePassage(world, openingById(old, 'door_b04_south')).blockerId, 'cov_b04_woodpile');
    const lat = lateralPassRange(world, openingById(old, 'door_b04_south'));
    assert.ok(lat.max - lat.min < 0.1, `só um corredor de ${(lat.max - lat.min).toFixed(2)} m (a cápsula só passava a roçar a lenha)`);
    const { problems } = buildOpeningsMarkdown({ layout: old, sha256: 'antigo' });
    assert.ok(problems.some((p) => p.sev === 'ERRO' && p.subject === 'door_b04_south' && p.text.includes('cov_b04_woodpile')), 'o gerador continua a detetar o defeito');
  });

  it('corrigido: a cápsula (raio 0,36 m, em pé e agachada) atravessa a porta em linha reta, nos dois sentidos', () => {
    const world = makeWorld(layout, { openAll: true });
    assert.equal(PLAYER.radius, 0.36);
    assert.equal(probePassage(world, door).passes, true);
    for (const crouched of [false, true]) {
      assert.equal(walkStraight(world, inside, outside, { crouched }).reached, true, `saída (agachado=${crouched})`);
      assert.equal(walkStraight(world, outside, inside, { crouched }).reached, true, `entrada (agachado=${crouched})`);
    }
  });

  it('corrigido: o corredor livre da cápsula é a folga inteira do vão (1,0 m − Ø 0,72 m = 0,28 m), sem o monte a roubá-la', () => {
    const world = makeWorld(layout, { openAll: true });
    const lat = lateralPassRange(world, door);
    assert.ok(lat, 'há desvios laterais livres');
    assert.ok(lat.max - lat.min >= 0.26, `corredor de ${(lat.max - lat.min).toFixed(2)} m`);
    const pile = layout.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
    const doorEast = door.center.x + door.width / 2;
    assert.ok(pile.min[0] >= doorEast + PLAYER.radius, 'a lenha começa depois da cápsula encostada ao batente este');
  });

  it('corrigido: o navegador dos NPC (mesma cápsula) encontra caminho para dentro e para fora de B04 pela porta', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.world.setDoorState('door_b04_south', 'open');
    const out = sim.navigator.route({ x: -33.5, y: 0, z: 23, radius: PLAYER.radius }, { x: -28, z: 29.5 });
    assert.ok(out && out.length >= 2, 'rota de dentro para fora');
    assert.ok(out.some(([x, z]) => Math.abs(x - door.center.x) < 0.6 && Math.abs(z - door.center.z) < 1.2), 'passa pela porta');
    const back = sim.navigator.route({ x: -28, y: 0, z: 29.5, radius: PLAYER.radius }, { x: -33.5, z: 23 });
    assert.ok(back && back.length >= 2, 'rota de fora para dentro');
    // Com o layout antigo a mesma rota fica sem caminho pela porta.
    const oldWorld = new M02QuintaWorld(withOldWoodpile(layout));
    oldWorld.setDoorState('door_b04_south', 'open');
    const oldRoute = new M01Navigator(oldWorld.navWorld).route({ x: -33.5, y: 0, z: 23, radius: PLAYER.radius }, { x: -28, z: 29.5 });
    assert.ok(!oldRoute || oldRoute.length === 0 || !oldRoute.some(([x, z]) => Math.abs(x - door.center.x) < 0.6 && z > door.center.z), 'layout antigo: sem passagem pela porta');
  });

  it('a lenha continua a ser cobertura parcial exterior junto ao beiral sul (mesmas dimensões, fora do edifício)', () => {
    const pile = layout.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
    assert.equal(pile.max[0] - pile.min[0], 3.0);
    assert.ok(Math.abs(pile.max[2] - pile.min[2] - 1.2) < 1e-9, 'profundidade 1,2 m como antes');
    assert.equal(pile.max[1], 1.15);
    const b04 = building(layout, 'B04');
    assert.ok(pile.min[2] > b04.bounds[3], 'fica a sul do edifício (z > 26)');
    assert.ok(pile.min[2] - b04.bounds[3] < 0.5, 'junto ao beiral sul');
  });
});

describe('N0 · versão de layout da Área A (m02-01-quinta-bench-v2)', () => {
  const savedSession = () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.teleportPlayer(-23, -12, 0);
    sim.saveCheckpoint('cp_m02_manual');
    return { storage, sim };
  };
  const downgrade = (raw) => {
    const r = JSON.parse(raw);
    for (const c of Object.values(r.checkpoints)) c.world.layoutSchema = 'm02-01-quinta-bench-v1';
    return JSON.stringify(r);
  };

  it('o layout da Área A está na v2 e o snapshot grava essa versão', () => {
    assert.equal(layout.schema, 'm02-01-quinta-bench-v2');
    assert.equal(M02_LAYOUT_SCHEMA_BY_CELL.A, 'm02-01-quinta-bench-v2');
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.snapshot().world.layoutSchema, 'm02-01-quinta-bench-v2');
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('a v1 está registada como retirada, com o motivo (as correções N0 mudaram a geometria/IDs)', () => {
    const why = M02_RETIRED_LAYOUT_SCHEMAS['m02-01-quinta-bench-v1'];
    assert.ok(why);
    for (const topic of [/lenha/i, /MG34/, /B01/, /B03/, /portão norte/i]) assert.match(why, topic);
  });

  it('um save v2 gravado com o layout v1 é recusado com motivo claro, sem migração, sem apagar e sem tocar no estado vivo', () => {
    const { storage } = savedSession();
    const downgraded = downgrade(storage.getItem(KEY));
    storage.setItem(KEY, downgraded);
    const page = new M02BenchSimulation(SEED, { storage });
    const before = JSON.stringify(page.snapshot());

    const loaded = page.saveStore.load();
    assert.equal(loaded.ok, false, 'nada carregável');
    assert.equal(page.saveStore.status().hasSave, false);
    const reason = loaded.rejected[0].reason;
    assert.match(reason, /Save incompatível: layout m02-01-quinta-bench-v1 da célula A, atual m02-01-quinta-bench-v2\./);
    assert.match(reason, /Motivo: a geometria da quinta/);
    assert.match(reason, /Sem migração: o save antigo não foi alterado nem apagado/);

    const snapV1 = JSON.parse(downgraded).checkpoints.cp_m02_manual;
    const verdict = validateM02Snapshot(snapV1);
    assert.equal(verdict.valid, false);
    assert.match(verdict.reason, /Motivo:/);
    assert.throws(() => page.restoreSnapshot(snapV1), /Save incompatível: layout m02-01-quinta-bench-v1/);
    assert.throws(() => page.restorePersistedCheckpoint('cp_m02_manual'), /não encontrado ou inválido/);
    assert.equal(JSON.stringify(page.snapshot()), before, 'a restauração recusada não alterou o estado vivo');

    assert.equal(page.quickLoadCheckpoint().source, 'start', 'F9 cai no início em memória');
    assert.equal(storage.getItem(KEY), downgraded, 'o registo antigo ficou byte a byte igual (não foi apagado nem migrado)');
  });

  it('gravar de novo depois de recusar um save v1: o novo checkpoint v2 é gravado e o antigo (incompatível) conservado', () => {
    const { storage } = savedSession();
    storage.setItem(KEY, downgrade(storage.getItem(KEY)));
    const page = new M02BenchSimulation(SEED, { storage });
    page.teleportPlayer(-20, -10, 0);
    page.saveCheckpoint('cp_m02_b_test');
    assert.equal(page.lastCheckpointPersist.ok, true, page.lastCheckpointPersist.reason);
    const after = JSON.parse(storage.getItem(KEY));
    assert.deepEqual(Object.keys(after.checkpoints).sort(), ['cp_m02_b_test', 'cp_m02_manual']);
    assert.equal(after.checkpoints.cp_m02_manual.world.layoutSchema, 'm02-01-quinta-bench-v1', 'o v1 não foi reescrito');
    assert.equal(after.checkpoints.cp_m02_b_test.world.layoutSchema, 'm02-01-quinta-bench-v2');
    assert.deepEqual(page.saveStore.checkpointIds(), ['cp_m02_b_test']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Itens 2 e 3 — MG34 de B02: uma só posição e avaliação ≡ disparo real

const PDF_MG_XZ = { x: 12, z: -30 }; // PDF F3 p. 24: «MG a (12,-30)»
const b02 = building(layout, 'B02');
const mgWindow = b02.windows.find((w) => w.id === 'win_b02_west_mg');
const gunnerEntry = layout.enemyRosterEA1.find((e) => e.id === 'DE-A05');

/** Amostras: SN1–SN5 e as duas rotas de 2 em 2 m (em pé e agachado). */
function mgSamples() {
  const out = Object.entries(PDF_SN).map(([id, p]) => ({ id, x: p.x, z: p.z }));
  for (const [name, pts] of Object.entries(layout.routes)) {
    let acc = 0;
    let next = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      while (next <= acc + len + 1e-9) {
        const t = (next - acc) / len;
        out.push({ id: `${name}@${next}`, x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t });
        next += 2;
      }
      acc += len;
    }
  }
  return out;
}

/** O disparo da MG, medido sem passar por evaluateMgLineOfFire: traceShot desde a boca (como fireActorBurst) + vista desde a boca. */
function realMgFire(sim, sample, eye, crouched) {
  const world = sim.world;
  const gy = world.heightAt(sample.x, sample.z);
  const probe = { ...actorAt(sample.x, sample.z, eye, gy), id: 'sonda', alive: true, active: true, crouched };
  const muzzle = sim.mgMuzzle;
  const e = eyePosition(probe);
  const dx = e.x - muzzle.x;
  const dy = e.y - muzzle.y;
  const dz = e.z - muzzle.z;
  const dist = Math.hypot(dx, dy, dz);
  let arc = Math.abs(Math.atan2(dz, dx) - sim.mgState.facing);
  while (arc > Math.PI) arc = Math.abs(arc - Math.PI * 2);
  const inArc = arc <= sim.mgState.arcHalfAngle;
  const shot = traceShot(world, muzzle, { x: dx / dist, y: dy / dist, z: dz / dist }, [probe], sim.mgState.range);
  const hits = shot?.kind === 'actor';
  const los = world.lineOfSight(actorAt(muzzle.x, muzzle.z, muzzle.y, 0), probe, { includeFoliage: true });
  return { probe, inArc, hits, los, canHit: inArc && hits, exposed: inArc && hits && los };
}

/** A avaliação e o raio do artilheiro tal como eram ANTES (boca fora da parede em 11,82; artilheiro em 13,20 com olhos 1,48). */
function legacyMgDisagreements(oldLayout) {
  const world = new M02QuintaWorld(oldLayout);
  const oldMuzzle = { x: 11.82, y: 1.42, z: -30 };
  const gunnerEye = { x: 13.2, y: 1.48, z: -30 };
  const out = [];
  for (const sample of mgSamples()) {
    const gy = world.heightAt(sample.x, sample.z);
    const target = { x: sample.x, y: gy, z: sample.z, eyeHeight: PLAYER.standEye, space: 'metres' };
    const t = eyePosition(target);
    const ray = (o) => {
      const dx = t.x - o.x;
      const dy = t.y - o.y;
      const dz = t.z - o.z;
      const dist = Math.hypot(dx, dy, dz);
      return { dir: { x: dx / dist, y: dy / dist, z: dz / dist }, dist, dx, dz };
    };
    const a = ray(oldMuzzle);
    let diff = Math.abs(Math.atan2(a.dz, a.dx) - layout.mgEmplacement.facing);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    const simExposed = a.dist <= layout.mgEmplacement.range && diff <= layout.mgEmplacement.arcHalfAngle && !traceObstruction(world, oldMuzzle, a.dir, Math.max(0, a.dist - 0.15));
    const g = ray(gunnerEye);
    const gunnerSees = !traceObstruction(world, gunnerEye, g.dir, Math.max(0, g.dist - 0.02));
    if (simExposed && !gunnerSees) out.push(sample.id);
  }
  return out;
}

describe('N0-2: MG34 de B02 com uma só posição (layout = PDF = simulação = renderer; artilheiro atrás da abertura)', () => {
  const mg = layout.mgEmplacement;
  const muzzle = m02MgMuzzle(mg);
  const innerFace = b02.bounds[0] + b02.wallThickness / 2;
  const outerFace = b02.bounds[0] - b02.wallThickness / 2;
  const winZ = b02.bounds[2] + mgWindow.offset;

  it('o layout põe a MG onde o PDF diz (12; -30) e a boca dentro do vão win_b02_west_mg (jambas, peitoril e lintel verificados)', () => {
    assert.deepEqual([mg.x, mg.z], [PDF_MG_XZ.x, PDF_MG_XZ.z]);
    assert.ok(Number.isFinite(mg.muzzleY));
    assert.ok(muzzle.x > outerFace && muzzle.x < innerFace, 'dentro da espessura da parede oeste (x 11,88…12,12)');
    assert.ok(Math.abs(muzzle.z - winZ) < mgWindow.width / 2, 'dentro da largura do vão');
    assert.ok(muzzle.y > mgWindow.sillY && muzzle.y < mgWindow.lintelY, 'entre o peitoril e o lintel');
    const world = makeWorld(layout);
    assert.equal(
      world.obstacles.some((b) => muzzle.x >= b.min.x && muzzle.x <= b.max.x && muzzle.y >= b.min.y && muzzle.y <= b.max.y && muzzle.z >= b.min.z && muzzle.z <= b.max.z),
      false,
      'a boca não está dentro de nenhum sólido',
    );
  });

  it('o artilheiro DE-A05 está atrás da abertura, no eixo de tiro, fora de sólidos e com linha livre até à boca', () => {
    assert.ok(gunnerEntry.x > innerFace, 'atrás (a este) da face interior da parede');
    assert.equal(gunnerEntry.z, muzzle.z, 'no eixo de tiro da boca');
    assert.ok(gunnerEntry.x - muzzle.x <= 2.0, 'a menos de 2 m da boca (comprimento da arma)');
    assert.equal(gunnerEntry.facing, mg.facing, 'virado para o arco da MG');
    const world = makeWorld(layout);
    assert.equal(deepestWall(world, gunnerEntry.x, gunnerEntry.z, 0, PLAYER.radius, PLAYER.standHeight), null, 'a cápsula do artilheiro não está dentro de nenhum sólido');
    const eye = { x: gunnerEntry.x, y: mg.eyeHeight, z: gunnerEntry.z };
    const d = Math.hypot(muzzle.x - eye.x, muzzle.y - eye.y, muzzle.z - eye.z);
    const dir = { x: (muzzle.x - eye.x) / d, y: (muzzle.y - eye.y) / d, z: (muzzle.z - eye.z) / d };
    assert.equal(traceObstruction(world, eye, dir, d), null, 'dos olhos do artilheiro à boca não há nada no caminho');
    // Os alvos de calibração sincronizados com inimigos estão onde esses inimigos estão.
    for (const [tgtId, enemyId] of [['tgt_b02_mg_gunner', 'DE-A05'], ['tgt_b01_kitchen_window', 'DE-A07'], ['tgt_b01_hall_door', 'DE-A08']]) {
      const tgt = layout.testTargets.find((t) => t.id === tgtId);
      const en = layout.enemyRosterEA1.find((e) => e.id === enemyId);
      assert.deepEqual([tgt.x, tgt.z], [en.x, en.z], `${tgtId} coincide com ${enemyId}`);
    }
  });

  it('a simulação usa a boca do layout em todo o lado: avaliação, disparo do artilheiro (fireActorBurst), rajada (mg-burst) e secção', () => {
    const sim = new M02BenchSimulation(SEED);
    assert.deepEqual(sim.mgMuzzle, muzzle);
    assert.deepEqual(sim.mgAperture, { x: mg.x, y: mg.muzzleY, z: mg.z });
    const a05 = sim.enemies.find((e) => e.id === 'DE-A05');
    const evt = sim.fireActorBurst(a05, sim.player, { x: sim.player.x, y: sim.player.y + 1.25, z: sim.player.z }, 'enemy');
    assert.deepEqual(evt.origin, muzzle, 'a origem do tiro do artilheiro é a boca');
    let burst = null;
    for (let i = 0; i < 80 && !burst; i++) {
      sim.tick(0.05, {});
      burst = sim.drainEvents().find((e) => e.type === 'mg-burst') ?? null;
    }
    assert.ok(burst, 'a MG dispara uma rajada sobre o jogador no arranque (exposto a 51 m)');
    assert.deepEqual(burst.origin, muzzle, 'o rasto sai da boca');
  });

  it('nenhum valor antigo da boca (11,82 / 12,15 / 11,85) ficou escrito à mão na simulação, IA, renderer ou ferramentas', () => {
    const files = [];
    for (const dir of ['../src/game/', '../src/render/', '../src/m02/', '../tools/m02/']) {
      for (const name of readdirSync(new URL(dir, import.meta.url))) {
        if (/^m02-.*\.(js|mjs)$/.test(name) || (dir.endsWith('/m02/') && /\.(js|mjs)$/.test(name))) files.push(`${dir}${name}`);
      }
    }
    assert.ok(files.length >= 8);
    for (const f of files) {
      const code = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(code, /\b11\.82\b|\b12\.15\b|\b11\.85\b|x: 12\.2\b/, f);
    }
    const renderer = readFileSync(new URL('../src/render/m02-01-renderer.js', import.meta.url), 'utf8');
    assert.match(renderer, /m02MgMuzzle\(this\.sim\.mgState\)/);
    const ai = readFileSync(new URL('../src/game/m02-combat-ai.js', import.meta.url), 'utf8');
    assert.match(ai, /sim\.mgAperture/);
  });

  it('reprodução: com o modelo anterior (boca 11,82 fora da parede; artilheiro em 13,20) a simulação dava «EXPOSTO» onde o artilheiro não via', () => {
    const old = structuredClone(layout);
    old.mgEmplacement.x = 12.8;
    delete old.mgEmplacement.muzzleY;
    const oldMount = building(old, 'B02').props.find((p) => p.id === 'prop_b02_mg_mount');
    oldMount.u = 0.5;
    oldMount.w = 1.5;
    const disagreements = legacyMgDisagreements(old);
    assert.ok(disagreements.includes('SN1') && disagreements.includes('SN3'), `SN1 e SN3 divergiam: ${disagreements.slice(0, 8).join(', ')}`);
    assert.ok(disagreements.length >= 6, `${disagreements.length} amostras divergiam`);
  });
});

describe('N0-3: a avaliação «EXPOSTO» da simulação coincide com o disparo real em todas as amostras (SN, vala e pomar, em pé e agachado)', () => {
  it('evaluateMgLineOfFire ≡ traceShot + lineOfSight desde a boca, em SN1–SN5 e de 2 em 2 m nas duas rotas', () => {
    const sim = new M02BenchSimulation(SEED);
    const samples = mgSamples();
    assert.ok(samples.length > 150, `${samples.length} amostras`);
    const mismatches = [];
    let exposed = 0;
    let covered = 0;
    for (const sample of samples) {
      for (const [eye, crouched] of [[PLAYER.standEye, false], [PLAYER.crouchEye, true]]) {
        const real = realMgFire(sim, sample, eye, crouched);
        const ev = sim.evaluateMgLineOfFire(real.probe);
        const simExposed = ev.canHitTarget && ev.hasVisualLoS;
        if (ev.inArc !== real.inArc || ev.canHitTarget !== real.canHit || simExposed !== real.exposed) {
          mismatches.push(`${sample.id}${crouched ? ' agachado' : ''}: sim ${ev.inArc}/${ev.canHitTarget}/${ev.hasVisualLoS} real ${real.inArc}/${real.hits}/${real.los}`);
        }
        if (real.exposed) exposed++;
        else if (real.inArc) covered++;
      }
    }
    assert.deepEqual(mismatches, []);
    assert.ok(exposed > 20 && covered > 20, `a amostra tem expostos (${exposed}) e cobertos (${covered}) a sério`);
  });

  it('a tabela gerada não tem nenhuma amostra em que a avaliação e o disparo real discordem (nem boca fora do vão)', () => {
    const { problems, mgRows } = buildOpeningsMarkdown(loadLayout());
    assert.equal(problems.filter((p) => p.area === 'MG B02').length, 0, JSON.stringify(problems.filter((p) => p.area === 'MG B02')));
    assert.ok(mgRows.length >= 40);
    assert.ok(mgRows.every((r) => r.stand.agree && r.crouch.agree));
  });

  it('o jogador em SN1 (51 m) continua exposto à MG e na vala (agachado) continua coberto', () => {
    const sim = new M02BenchSimulation(SEED);
    const sn1 = sim.evaluateMgLineOfFire(sim.player);
    assert.equal(sn1.canHitTarget, true);
    assert.equal(sn1.hasVisualLoS, true);
    assert.ok(Math.abs(sn1.distance - 51.4) < 0.2);
    sim.teleportPlayer(-45, -40, 0);
    sim.player.crouched = true;
    sim.player.eyeHeight = 1.08;
    const ditch = sim.evaluateMgLineOfFire(sim.player);
    assert.equal(ditch.canHitTarget, false);
    assert.equal(ditch.blockedById, 'ditch_east_lip_north');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Item 4 — vidro intacto: política balística aplicada à vista; toco de parede de win_b01_east_hall

describe('N0-4: o vidro intacto deixa ver (BALLISTIC_MATERIAL_POLICY.glass.blocksSight = false) mas pára a bala, que o parte', () => {
  const hall = openingById(layout, 'win_b01_east_hall');
  const north = openingById(layout, 'win_b01_north_hall');
  const outsideEast = actorAt(hall.center.x + 3, hall.center.z, 1.5, 0);
  const insideEast = actorAt(hall.center.x - 3, hall.center.z, 1.5, 0);

  it('reprodução: a oclusão sobre todos os sólidos via o vidro como parede (o que lineOfSight fazia); agora lineOfSight deixa ver', () => {
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'intact');
    assert.equal(sim.world.getWindowState('win_b01_north_hall'), 'intact');
    assert.equal(visible(sim.world, outsideEast, insideEast), false, 'oclusão pura sobre todos os sólidos: o vidro bloqueia (comportamento antigo de lineOfSight)');
    assert.equal(sim.world.lineOfSight(outsideEast, insideEast, { includeFoliage: true }), true, 'lineOfSight aplica a política: vidro intacto deixa ver');
    const n1 = actorAt(north.center.x, north.center.z - 3, 1.5, 0);
    const n2 = actorAt(north.center.x, north.center.z + 3, 1.5, 0);
    assert.equal(sim.world.lineOfSight(n1, n2, { includeFoliage: true }), true);
  });

  it('só o vidro (blocksSight = false na política) sai da oclusão visual; paredes, portas fechadas e vãos barrados continuam a bloquear', () => {
    const sim = new M02BenchSimulation(SEED);
    const w = sim.world;
    const transparent = w.obstacles.filter((b) => !w.sightOpaqueObstacles.includes(b));
    assert.ok(transparent.length >= 2);
    assert.ok(transparent.every((b) => b.material === 'glass'), 'só vidro sai');
    assert.equal(w.materialBlocksSight('glass'), false);
    for (const m of ['stone', 'brick', 'earth', 'metal', 'wood_thick', 'wood_thin', 'foliage', 'desconhecido']) assert.equal(w.materialBlocksSight(m), true, m);
    const door = openingById(layout, 'door_b01_east_main');
    const a = actorAt(door.center.x + 3, door.center.z, 1.5, 0);
    const b = actorAt(door.center.x - 3, door.center.z, 1.5, 0);
    assert.equal(w.lineOfSight(a, b, { includeFoliage: true }), false, 'a folha de porta fechada bloqueia a vista');
    const wall = actorAt(hall.center.x + 3, hall.center.z + 3, 1.5, 0);
    const wallIn = actorAt(hall.center.x - 3, hall.center.z + 3, 1.5, 0);
    assert.equal(w.lineOfSight(wall, wallIn, { includeFoliage: true }), false, 'a parede bloqueia a vista');
  });

  it('a política de vista é opt-in por layout: a Área A declara ballistic-policy; as células B/C ficam em legacy-opaque (o vidro continua a bloquear a vista)', () => {
    assert.equal(layout.sightPolicy, 'ballistic-policy');
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    assert.equal(sim.world.sightPolicy, 'ballistic-policy');
    sim.enterAreaBC06();
    const b = sim.world;
    assert.equal(b.sightPolicy, 'legacy-opaque');
    const glass = b.obstacles.filter((o) => o.material === 'glass');
    assert.ok(glass.length >= 1, 'a célula B tem vidro intacto');
    assert.equal(b.materialBlocksSight('glass'), true, 'em B/C o vidro bloqueia a vista (comportamento anterior)');
    assert.equal(b.sightOpaqueObstacles.length, b.obstacles.length, 'nenhum sólido sai da oclusão visual');
    assert.throws(() => new M02QuintaWorld({ ...layout, sightPolicy: 'inventada' }), /sightPolicy desconhecida/);
  });

  it('a bala bate no vidro e parte-o (glassBrokenId); depois o vão fica partido e continua a deixar ver', () => {
    const sim = new M02BenchSimulation(SEED);
    const shot = sim.fireDirectRay({ x: hall.center.x + 5, y: 1.5, z: hall.center.z }, { x: -1, y: 0, z: 0 });
    assert.equal(shot.glassBrokenId, 'win_b01_east_hall');
    assert.equal(shot.material, 'glass');
    assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'broken');
    assert.equal(sim.world.lineOfSight(outsideEast, insideEast, { includeFoliage: true }), true);
    const second = sim.fireDirectRay({ x: hall.center.x + 5, y: 1.5, z: hall.center.z }, { x: -1, y: 0, z: 0 });
    assert.equal(second.glassBrokenId, null);
  });

  it('a avaliação da MG: atrás do vidro intacto vê-se (hasVisualLoS) mas a bala pára no vidro (canHitTarget falso, blockedById = o vidro); partido, passa', () => {
    const sim = new M02BenchSimulation(SEED);
    // As janelas de B01 ficam atrás dos muros do portão para a MG: põe-se um vidro de ensaio (mesmo material e papel dos reais) no raio.
    const target = { id: 'sonda', x: -10, y: 0, z: -30, eyeHeight: 1.65, space: 'metres', alive: true, active: true };
    const pane = { id: 'vidro_ensaio_glass', role: 'window_glass', material: 'glass', windowId: 'ensaio', min: { x: 0, y: 0.5, z: -33 }, max: { x: 0.1, y: 2.5, z: -27 } };
    const open = sim.evaluateMgLineOfFire(target);
    assert.equal(open.inArc, true);
    assert.equal(open.canHitTarget, true, 'sem vidro, a MG vê e acerta');
    assert.equal(open.hasVisualLoS, true);
    sim.world.obstacles.push(pane); // o vidro está em `obstacles` (pára a bala) e fora de `sightOpaqueObstacles` (deixa ver)
    const intact = sim.evaluateMgLineOfFire(target);
    assert.equal(intact.hasVisualLoS, true, 'a vista passa pelo vidro intacto');
    assert.equal(intact.canHitTarget, false, 'a bala não passa pelo vidro intacto');
    assert.equal(intact.blockedById, 'vidro_ensaio_glass');
    assert.equal(intact.blockedByMaterial, 'glass');
    // Uma parede no mesmo sítio bloqueia vista e bala; vidro e parede em fila: a parede decide a vista.
    sim.world.obstacles.pop();
    const wall = { id: 'parede_ensaio', role: 'wall', material: 'brick', min: { x: -5, y: 0, z: -33 }, max: { x: -4.9, y: 3, z: -27 } };
    sim.world.obstacles.push(pane, wall);
    sim.world.sightOpaqueObstacles.push(wall);
    const both = sim.evaluateMgLineOfFire(target);
    assert.equal(both.hasVisualLoS, false, 'a parede atrás do vidro bloqueia a vista');
    assert.equal(both.canHitTarget, false);
  });

  it('win_b01_east_hall já não deixa o toco de parede de 0,05 m (< 0,30 m) junto ao canto, nem encosta à porta principal', () => {
    const win = building(layout, 'B01').windows.find((w) => w.id === 'win_b01_east_hall');
    assert.ok(win.offset - win.width / 2 - (win.frameWidth ?? 0.1) >= 0.3 - 1e-9, `toco de ${(win.offset - win.width / 2 - win.frameWidth).toFixed(2)} m`);
    const door = building(layout, 'B01').doors.find((d) => d.id === 'door_b01_east_main');
    const gap = door.offset - door.width / 2 - (door.frameWidth ?? 0.08) - (win.offset + win.width / 2 + win.frameWidth);
    assert.ok(gap >= 0.3, `${gap.toFixed(2)} m de parede entre a janela e a porta`);
    const { problems } = buildOpeningsMarkdown(loadLayout());
    assert.ok(!problems.some((p) => p.subject === 'win_b01_east_hall'));
  });
});

