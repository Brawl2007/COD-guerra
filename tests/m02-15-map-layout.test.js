// M02 mapa (PDF E pp. 19-22 e F pp. 23-27): dimensões B01-B12, caminho da carroça, entrada da evacuação por B09 (porta norte),
// versão de layout dos saves, decisão pendente das portas de B08 e macas de B12. Testes de estado (não são playtest).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { M02_LAYOUT_SCHEMA_BY_CELL } from '../src/game/m02-save-store.js';
import cellALayout from '../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { buildCellWorldLayout } from '../src/world/m02-zone-streamer.js';

// Tabela da p. 20 do PDF (E2, «Implantação»): ID, célula, X mín/máx, Z mín/máx, largura × profundidade.
const PDF_P20_TABLE = [
  ['B01', 'A', -40, -26, -18, -8, 14, 10],
  ['B02', 'A', 12, 36, -38, -24, 24, 14],
  ['B03', 'A', 20, 38, 0, 12, 18, 12],
  ['B04', 'A', -37, -29, 20, 26, 8, 6],
  ['B05', 'B', -52, -34, -30, -18, 18, 12],
  ['B06', 'B', 20, 36, -35, -13, 16, 22],
  ['B07', 'B', -60, -40, 35, 47, 20, 12],
  ['B08', 'B', 45, 57, 35, 45, 12, 10],
  ['B09', 'C', -40, -12, -20, -2, 28, 18],
  ['B10', 'C', 16, 36, -32, -16, 20, 16],
  ['B11', 'C', 4, 14, -5, 3, 10, 8],
  ['B12', 'C', -64, -46, 48, 60, 18, 12],
];

function layoutBuildings() {
  const byId = {};
  for (const b of cellALayout.buildings) byId[b.id] = { cell: 'A', bounds: b.bounds };
  for (const [cellId, cell] of Object.entries(cellsBC.cells)) {
    for (const b of cell.buildings) byId[b.id] = { cell: cellId, bounds: b.bounds };
  }
  return byId;
}

describe('M02 mapa — dimensões B01-B12 conforme a tabela da p. 20 do PDF (o handoff da Gemini estava errado em B05-B12)', () => {
  const byId = layoutBuildings();
  for (const [id, cell, x0, x1, z0, z1, w, d] of PDF_P20_TABLE) {
    it(`${id} (célula ${cell}): X ${x0}..${x1}, Z ${z0}..${z1}, ${w} × ${d} m`, () => {
      assert.equal(byId[id].cell, cell);
      assert.deepEqual(byId[id].bounds, [x0, x1, z0, z1]);
      assert.equal(x1 - x0, w);
      assert.equal(z1 - z0, d);
      // o mundo construído a partir do layout (streamer) tem as mesmas dimensões
      if (cell !== 'A') {
        const built = buildCellWorldLayout(cell).buildings.find((b) => b.id === id);
        assert.deepEqual(built.bounds, [x0, x1, z0, z1]);
      }
    });
  }

  it('o handoff já não afirma as medidas erradas de B05-B12 e cita as da tabela (18×12, 16×22, 20×12, 12×10, 28×18, 20×16, 10×8, 18×12)', () => {
    const doc = readFileSync(new URL('../docs/m02/M02_HANDOFF.md', import.meta.url), 'utf8');
    for (const wrong of [
      'Casa-oficina (`16 × 11 m`)',
      'Loja de esquina (`12 × 9 m`)',
      'Telheiro de carroças (`15 × 7 m`)',
      'Habitação fechada (`10 × 8 m`)',
      'Armazém agrícola (`22 × 12 m`)',
      'Oficina mecânica (`14 × 10 m`)',
      'Portaria e muro (`6 × 5 m`)',
      'abrigo de bombas (`12 × 9 m`',
    ]) {
      assert.ok(!doc.includes(wrong), `handoff ainda cita ${wrong}`);
    }
    for (const right of ['Casa-oficina (`18 × 12 m`)', 'Loja de esquina (`16 × 22 m`)', 'Telheiro de carroças (`20 × 12 m`)', 'Habitação fechada (`12 × 10 m`)', 'Armazém agrícola (`28 × 18 m`)', 'Oficina mecânica (`20 × 16 m`)', 'Portaria e muro (`10 × 8 m`)', 'abrigo de bombas (`18 × 12 m`']) {
      assert.ok(doc.includes(right), `handoff devia citar ${right}`);
    }
  });
});

describe('M02 mapa — versão de layout dos saves (layoutVersion)', () => {
  it('o layout B/C subiu para v2 (caminho da carroça e entrada da evacuação mudaram); A não mudou', () => {
    assert.equal(cellsBC.schema, 'm02-cells-bc-layout-v2');
    assert.equal(M02_LAYOUT_SCHEMA_BY_CELL.B, 'm02-cells-bc-layout-v2');
    assert.equal(M02_LAYOUT_SCHEMA_BY_CELL.C, 'm02-cells-bc-layout-v2');
    assert.equal(M02_LAYOUT_SCHEMA_BY_CELL.A, 'm02-01-quinta-bench-v1', 'A só ganhou bounds.c01Approach (alarga o limite; saves antigos continuam válidos)');
  });

  it('um save de B ou C gravado com o layout v1 é recusado com mensagem explícita (posições/waypoints antigos), não restaurado', () => {
    for (const enter of ['enterAreaBC06', 'enterAreaCC09']) {
      const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
      sim[enter]();
      const snap = sim.snapshot();
      assert.equal(snap.world.layoutSchema, 'm02-cells-bc-layout-v2');
      assert.equal(validateM02Snapshot(snap).valid, true);
      snap.world.layoutSchema = 'm02-cells-bc-layout-v1';
      const r = validateM02Snapshot(snap);
      assert.equal(r.valid, false);
      assert.match(r.reason, /Save incompatível: layout m02-cells-bc-layout-v1 da célula [BC], atual m02-cells-bc-layout-v2/);
      assert.throws(() => sim.restoreSnapshot(snap), /Save incompatível/);
    }
  });
});

describe('M02 mapa — caminho da carroça (E3, p. 21)', () => {
  it('(-70,60) → (-20,60) → (0,30) → (0,-70); parte fora de B07 e a carroça nasce no 1.º ponto', () => {
    const B = cellsBC.cells.B;
    assert.deepEqual(B.cartRoute, [[-70, 60], [-20, 60], [0, 30], [0, -70]]);
    assert.deepEqual([B.supplyCart.startX, B.supplyCart.startZ], B.cartRoute[0]);
    assert.deepEqual([B.supplyCart.goalX, B.supplyCart.goalZ], B.cartRoute[3]);
    const b07 = B.buildings.find((b) => b.id === 'B07').bounds;
    const [sx, sz] = B.cartRoute[0];
    assert.ok(!(sx >= b07[0] && sx <= b07[1] && sz >= b07[2] && sz <= b07[3]), 'o início (v1: (-50,41)) estava dentro de B07');
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.enterAreaBC06();
    assert.deepEqual([sim.areaB.supplyCart.x, sim.areaB.supplyCart.z], [-70, 60]);
    assert.deepEqual(sim.world.layout.cartRoute, [{ x: -70, z: 60 }, { x: -20, z: 60 }, { x: 0, z: 30 }, { x: 0, z: -70 }]);
  });
});

describe('M02 mapa — evacuação entra em B09 pela porta norte (-30,-20) (E3, p. 21)', () => {
  const C = cellsBC.cells.C;
  const b09 = C.buildings.find((b) => b.id === 'B09');
  const [bx0, bx1, bz0, bz1] = b09.bounds;
  const inside = (x, z) => x > bx0 + 0.01 && x < bx1 - 0.01 && z > bz0 + 0.01 && z < bz1 - 0.01;

  function samples(route) {
    const out = [];
    for (let i = 0; i < route.length - 1; i++) {
      const [x0, z0] = route[i];
      const [x1, z1] = route[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25));
      for (let k = 0; k <= n; k++) out.push({ x: x0 + ((x1 - x0) * k) / n, z: z0 + ((z1 - z0) * k) / n });
    }
    return out;
  }

  it('a rota tem troço horizontal em z=-32 (x -6..-30), vertical em x=-30 e passa por (-30,-20)', () => {
    const r = C.evacRoute;
    const i = r.findIndex(([x, z]) => x === -6 && z === -32);
    assert.ok(i >= 0);
    assert.deepEqual(r[i + 1], [-30, -32]);
    assert.deepEqual(r[i + 2], [-30, -20]);
    assert.deepEqual(r[i + 3], [-30, -2]);
  });

  it('a primeira entrada em B09 é pela porta norte (vão de 3,2 m) e a saída é a sul (-30,-2); nunca pela porta este', () => {
    const s = samples(C.evacRoute);
    const firstIn = s.find((p) => inside(p.x, p.z));
    const north = b09.doors.find((d) => d.id === 'door_b09_north_gate');
    assert.deepEqual([north.x, north.z], [-30, -20]);
    assert.ok(Math.abs(firstIn.x - north.x) <= north.width / 2 && Math.abs(firstIn.z - north.z) <= 0.5, `entra em (${firstIn.x},${firstIn.z})`);
    const last = [...s].reverse().find((p) => inside(p.x, p.z));
    const south = b09.doors.find((d) => d.id === 'door_b09_south_exit');
    assert.ok(Math.abs(last.x - south.x) <= south.width / 2 && Math.abs(last.z - south.z) <= 0.5, `sai por (${last.x},${last.z})`);
    const east = b09.doors.find((d) => d.id === 'door_b09_east_yard');
    const throughEast = s.filter((p) => Math.abs(p.x - east.x) < 0.3 && Math.abs(p.z - east.z) <= east.width / 2);
    assert.equal(throughEast.length, 0, 'a rota não atravessa a porta este de B09');
  });

  it('o mundo expõe a mesma rota e o último ponto é a saída (-85,105)', () => {
    const w = buildCellWorldLayout('C');
    assert.deepEqual(w.evacRoute[3], { x: -30, z: -20 });
    assert.deepEqual(w.evacRoute.at(-1), { x: -85, z: 105 });
  });
});

describe('M02 mapa — portas de B08: decisão do proprietário pendente (F9, p. 26)', () => {
  const b08 = cellsBC.cells.B.buildings.find((b) => b.id === 'B08');
  it('está marcada decision:"pendente" com o que o PDF diz e o que está implementado (nada inventado)', () => {
    assert.equal(b08.doorsDecision.decision, 'pendente');
    assert.equal(b08.doorsDecision.implemented, 'A');
    assert.match(b08.doorsDecision.pdf, /porta deslocada e duas janelas vedadas/);
    assert.equal(b08.doorsDecision.options.length, 2);
  });
  it('enquanto pendente mantém-se o estado anterior: massa opaca, 0 portas, 0 janelas, não navegável', () => {
    assert.equal(b08.navigable, false);
    assert.equal(b08.solidOpaque, true);
    assert.deepEqual([b08.doors.length, b08.windows.length], [0, 0]);
  });
});

describe('M02 mapa — macas de B12 coerentes entre layout, mundo e renderer (F13, p. 27: «duas macas»)', () => {
  const b12 = cellsBC.cells.C.buildings.find((b) => b.id === 'B12');
  const stretcherProps = b12.props.filter((p) => p.id.startsWith('prop_b12_stretcher'));
  it('o layout tem 2 macas e as ranhuras apontam para elas', () => {
    assert.equal(stretcherProps.length, 2);
    assert.deepEqual(b12.stretcherSlots, stretcherProps.map((p) => p.id));
  });
  it('o mundo da célula C cria 2 obstáculos de maca nas posições do layout, dentro de B12', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.enterAreaCC09();
    const found = sim.world.obstacles.filter((c) => String(c.id).startsWith('prop_b12_stretcher'));
    assert.equal(found.length, 2);
    for (const prop of stretcherProps) {
      const c = found.find((f) => f.id === prop.id);
      assert.ok(c, prop.id);
      assert.deepEqual([c.min.x, c.max.x, c.min.z, c.max.z], prop.bounds);
      const [x0, x1, z0, z1] = b12.bounds;
      assert.ok(prop.bounds[0] >= x0 && prop.bounds[1] <= x1 && prop.bounds[2] >= z0 && prop.bounds[3] <= z1, 'dentro de B12');
    }
  });
  it('o renderer já não desenha 2 macas fixas por cima (posições -58,5/-54,5 · z 52, que duplicavam as macas do layout)', () => {
    const src = readFileSync(new URL('../src/render/m02-01-renderer.js', import.meta.url), 'utf8');
    assert.ok(!/\[-58\.5,\s*-54\.5\]/.test(src), 'sem macas fixas no renderer');
  });
});
