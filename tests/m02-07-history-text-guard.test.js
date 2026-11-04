import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WEAPON_PROFILES } from '../src/game/m02-combat-ai.js';

// M02-FIX-1 (docs/direction/M02_BZURA_DESIGN.md §4): guarda de história e equipamento.
// - DEC-02 / D-M02-3 pendente: «56.º Regimento» / «56 pp» não aparecem no ecrã nem nos dados.
// - EQP-01 pendente: sem MP38 (não consta de B6, PDF p. 10); fuzileiros alemães usam Kar98k, MG34 e Kar98k
//   ficam marcadas como PROPOSTA_EQP01.
// - «46 hostis» é o total planeado de D2, nunca um número jogável de ecrã.
// - As 7 macieiras são candidatas, não árvores confirmadas.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function scannedFiles() {
  const files = [join(ROOT, 'm02-01.html')];
  const missionDir = join(ROOT, 'missions', 'm02-bzura');
  for (const f of readdirSync(missionDir)) if (f.endsWith('.json')) files.push(join(missionDir, f));
  for (const f of walk(join(ROOT, 'src'))) {
    const base = f.split('/').pop();
    if (/^m02-.*\.js$/.test(base)) files.push(f);
  }
  return files;
}

const FORBIDDEN = [
  { name: '56.º Regimento / 56 pp (DEC-02 pendente)', re: /56\.?º?\s*(pp|Regimento)/i },
  { name: 'Mensageiro 56', re: /Mensageiro\s+56/i },
  { name: 'mp38 / MP 38 (EQP-01 pendente; sem fonte em B6)', re: /mp\s?38/i },
  { name: '46 hostis (total planeado D2, nunca número de ecrã)', re: /46\s+hostis/i },
];

function load(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

test('M02-FIX-1 scan covers the bench page, the mission data and every src m02-*.js', () => {
  const rels = scannedFiles().map((f) => relative(ROOT, f));
  assert.ok(rels.includes('m02-01.html'));
  assert.ok(rels.includes('missions/m02-bzura/m02-01-quinta-layout.json'));
  assert.ok(rels.includes('missions/m02-bzura/m02-cells-bc-layout.json'));
  assert.ok(rels.includes('src/game/m02-combat-ai.js'));
  assert.ok(rels.includes('src/game/m02-acts-director.js'));
  assert.ok(rels.includes('src/m02/m02-01-main.js'));
});

test('M02-FIX-1 no screen/data text asserts the 56th regiment, MP38 or a playable "46 hostis"', () => {
  const offences = [];
  for (const file of scannedFiles()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { name, re } of FORBIDDEN) {
        if (re.test(line)) offences.push(`${relative(ROOT, file)}:${i + 1} -> ${name}`);
      }
    });
  }
  assert.deepEqual(offences, []);
});

test('M02-FIX-1 weapon profiles: no MP38; Kar98k and MG34 are PROPOSTA_EQP01', () => {
  assert.equal(WEAPON_PROFILES.mp38, undefined);
  assert.equal(WEAPON_PROFILES.kar98k.equipmentStatus, 'PROPOSTA_EQP01');
  assert.equal(WEAPON_PROFILES.mg34.equipmentStatus, 'PROPOSTA_EQP01');
  for (const layout of ['missions/m02-bzura/m02-01-quinta-layout.json', 'missions/m02-bzura/m02-cells-bc-layout.json']) {
    const data = load(layout);
    assert.equal(data.equipmentStatus.kar98k, 'PROPOSTA_EQP01', layout);
    assert.equal(data.equipmentStatus.mg34, 'PROPOSTA_EQP01', layout);
  }
});

test('M02-FIX-1 every German rifleman profile in the data is kar98k (MG34 only for gunners)', () => {
  const quinta = load('missions/m02-bzura/m02-01-quinta-layout.json');
  const cells = load('missions/m02-bzura/m02-cells-bc-layout.json').cells;
  const rosters = [
    ...quinta.c01Corridor.enemyRosterEA0,
    ...quinta.enemyRosterEA1,
    ...cells.B.enemyRosterEB1,
    ...cells.C.enemyRosterEC1,
    ...cells.C.enemyRosterEC2,
  ];
  assert.ok(rosters.length >= 46, `expected the 46 planned hostiles, got ${rosters.length}`);
  const weapons = new Set(rosters.map((e) => e.weapon));
  assert.deepEqual([...weapons].sort(), ['kar98k', 'mg34']);
  for (const e of rosters) {
    if (/rifleman/.test(e.role ?? '')) {
      assert.equal(e.weapon, 'kar98k', `${e.id} (${e.role}) must carry kar98k, not ${e.weapon}`);
    }
  }
  assert.ok(rosters.some((e) => /rifleman/.test(e.role ?? '')), 'rifleman roles must exist in the data');
});

test('M02-FIX-1 orchard apple trees are only candidates (status candidata)', () => {
  const trees = load('missions/m02-bzura/m02-01-quinta-layout.json').orchardTrees;
  assert.equal(trees.length, 7);
  for (const t of trees) assert.equal(t.status, 'candidata', t.id);
});

test('M02-FIX-1 the mission data cites the package sources with the BZ-H prefix only', () => {
  const offences = [];
  for (const rel of ['missions/m02-bzura/m02-01-quinta-layout.json', 'missions/m02-bzura/m02-cells-bc-layout.json']) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const m of text.matchAll(/\[(?!BZ-)H\d{2}\]/g)) offences.push(`${rel}: ${m[0]}`);
  }
  assert.deepEqual(offences, []);
});
