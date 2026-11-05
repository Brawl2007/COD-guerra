// M02-24: prova N0 sem browser (PDF N pp. 47-49, N5): planta SVG com escala + tabela de vãos / linhas de tiro / comparação com o PDF.
// Os geradores são deterministas e os ficheiros do repo têm de estar atualizados (regenerar = sem diff).
// Teste de geometria sobre os dados do layout; não é playtest nem aprova o N0.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildPlanSvg } from '../tools/m02/plan-svg.mjs';
import { buildOpeningsMarkdown } from '../tools/m02/openings-table.mjs';
import { loadLayout, openingGeometry, REPO_ROOT } from '../tools/m02/n0-common.mjs';

const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const input = loadLayout();
const ops = openingGeometry(input.layout);

describe('N0 plan: planta SVG', () => {
  const svg = buildPlanSvg(input);

  it('é determinista (mesmo input, mesmos bytes)', () => {
    assert.equal(buildPlanSvg(loadLayout()), svg);
  });

  it('é SVG bem formado e declara escala, norte e grelha', () => {
    assert.match(svg, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<svg /);
    assert.ok(svg.trimEnd().endsWith('</svg>'));
    for (const id of ['escala', 'norte', 'grelha', 'legenda', 'contorno-slice', 'rota-ditch', 'rota-orchard', 'zona-vala', 'zona-pomar', 'zona-patio', 'arco-mg']) {
      assert.ok(svg.includes(`id="${id}"`), `falta o grupo ${id}`);
    }
    assert.match(svg, /norte = −Z/);
  });

  it('contém todos os edifícios, portas, janelas, SN, cercas, macieiras e atores', () => {
    const { layout } = input;
    const ids = [
      ...layout.buildings.map((b) => b.id),
      ...ops.map((o) => o.id),
      ...layout.slicePanoramaPoints.map((p) => p.id),
      ...layout.orchardTrees.map((t) => t.id),
      ...layout.exteriorCovers.map((c) => c.id),
      ...layout.polishSquad.map((a) => a.id),
      ...layout.enemyRosterEA1.map((a) => a.id),
      ...layout.c01Corridor.enemyRosterEA0.map((a) => a.id),
      layout.mgEmplacement.id,
    ];
    for (const id of ids) assert.ok(svg.includes(`id="${id}"`), `a planta não contém ${id}`);
    assert.equal(layout.orchardTrees.length, 7);
    assert.equal(ops.length, 17);
  });

  it('usa as posições SN do PDF N5 p. 49 (SN3 (-23,-12), SN4 (8,-28))', () => {
    const sn = Object.fromEntries(input.layout.slicePanoramaPoints.map((p) => [p.id, [p.x, p.z]]));
    assert.deepEqual(sn, { SN1: [0, -80], SN2: [-45, -5], SN3: [-23, -12], SN4: [8, -28], SN5: [0, 45] });
  });

  it('não tem NaN/undefined nem coordenadas com expoente', () => {
    assert.doesNotMatch(svg, /NaN|undefined|e[+-]\d/);
  });

  it('o ficheiro docs/m02/n0/quinta-planta.svg está atualizado', () => {
    assert.equal(read('docs/m02/n0/quinta-planta.svg'), svg, 'regenerar com: node tools/m02/plan-svg.mjs');
  });
});

describe('N0 plan: tabela de vãos', () => {
  const { markdown, problems } = buildOpeningsMarkdown(input);

  it('é determinista (mesmo input, mesmos bytes)', () => {
    assert.equal(buildOpeningsMarkdown(loadLayout()).markdown, markdown);
  });

  it('lista todos os vãos com os campos pedidos', () => {
    for (const op of ops) assert.ok(markdown.includes(`| ${op.id} |`), `a tabela não contém ${op.id}`);
    for (const col of ['Centro (x; z) m', 'L × A livre (m)', 'Estado inicial', 'Atravessável', 'LoS em pé', 'Tiro a meio-vão']) {
      assert.ok(markdown.includes(col), `falta a coluna ${col}`);
    }
    assert.match(markdown, /raio 0,36 m/);
  });

  it('inclui MG→pontos das rotas, comparação B01–B04 com página do PDF e lista de problemas', () => {
    for (const h of ['## 2. Linhas de tiro da MG34 de B02', 'Rota «vala»', 'Rota «pomar»', '## 3. Comparação PDF', '## 6. Lista de problemas']) {
      assert.ok(markdown.includes(h), `falta ${h}`);
    }
    for (const id of ['B01', 'B02', 'B03', 'B04']) assert.match(markdown, new RegExp(`\\| ${id} \\| F[2-5], p\\. 2[45] \\|`));
    for (const sn of ['SN1', 'SN2', 'SN3', 'SN4', 'SN5']) assert.ok(markdown.includes(`| ${sn} |`));
  });

  it('as dimensões B01–B04 do layout coincidem com o PDF (F2–F5)', () => {
    assert.ok(!problems.some((p) => p.area === 'PDF' && /^B0[1-4]$/.test(p.subject)), 'dimensões divergem do PDF');
  });

  it('a entrada este de B01 (u=14, v=2,5, F2 p. 24) não é falso problema', () => {
    assert.ok(!problems.some((p) => p.subject === 'door_b01_east_main posição'));
  });

  it('classifica cada problema (ERRO/AVISO/INFO) e deteta o bloqueio conhecido da porta de B04', () => {
    for (const p of problems) assert.ok(['ERRO', 'AVISO', 'INFO'].includes(p.sev));
    assert.ok(problems.some((p) => p.sev === 'ERRO' && p.subject === 'door_b04_south' && p.text.includes('cov_b04_woodpile')));
  });

  it('o ficheiro docs/m02/n0/tabela-vaos.md está atualizado', () => {
    assert.equal(read('docs/m02/n0/tabela-vaos.md'), markdown, 'regenerar com: node tools/m02/openings-table.mjs');
  });
});
