// Valida os GLB provisórios das pontes de M01 contra map-layout.json e o manifesto, sem dependências:
// lê o cabeçalho e o chunk JSON do glTF binário. Não substitui a revisão visual.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const DIR = 'assets/models/provisional/m01/';
const layout = JSON.parse(read('missions/m01-tczew/map-layout.json'));
const manifest = JSON.parse(read(`${DIR}bridges.manifest.json`));
const feature = id => layout.features.find(f => f.id === id);

function glb(file) {
  const buf = read(DIR + file);
  assert.equal(buf.readUInt32LE(0), 0x46546c67, `${file}: assinatura glTF`);
  assert.equal(buf.readUInt32LE(4), 2, `${file}: glTF 2.0`);
  assert.equal(buf.readUInt32LE(8), buf.length, `${file}: tamanho declarado`);
  const jsonLen = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(16), 0x4e4f534a, `${file}: chunk JSON`);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const byName = new Map(json.nodes.map((n, i) => [n.name, { ...n, index: i }]));
  const triangles = mesh => json.meshes[mesh].primitives.reduce((s, p) => s + json.accessors[p.indices].count / 3, 0);
  return { json, byName, triangles, bytes: buf.length };
}

const BRIDGES = [
  { file: 'bridge_rail_1891_1912', feature: 'rail_bridge' },
  { file: 'bridge_road_lentze_1857_1912', feature: 'road_bridge' },
];

test('M01 bridge GLBs place every support at the measured supportsX and keep 9 spans', () => {
  for (const b of BRIDGES) {
    const { byName, json } = glb(`${b.file}.glb`);
    const f = feature(b.feature);
    assert.deepEqual(json.extras.units, 'meters');
    const root = byName.get(b.file);
    assert.deepEqual(root.extras.m01.placement.translation, [f.polyline[0][0], 0, f.polyline[0][2]], `${b.file}: colocação no mapa`);
    assert.deepEqual(root.extras.m01.supportsX, f.supportsX, `${b.file}: supportsX copiado de map-layout.json`);
    for (let i = 1; i < f.supportsX.length - 1; i++) {
      const name = i === 6 ? 'pier_06_old_east_abutment' : `pier_${String(i).padStart(2, '0')}`;
      const n = byName.get(name);
      assert.ok(n, `${b.file}: falta ${name}`);
      assert.ok(Math.abs(n.translation[0] - f.supportsX[i]) < 1e-3, `${b.file}: ${name} em x=${n.translation[0]}, esperado ${f.supportsX[i]}`);
    }
    const spans = [...byName.keys()].filter(k => /^span_\d\d$/.test(k));
    assert.equal(spans.length, 9, `${b.file}: 9 vãos`);
    for (let i = 1; i <= 9; i++) {
      const s = byName.get(`span_${String(i).padStart(2, '0')}`);
      const x0 = s.translation[0], L = s.extras.m01.lengthM;
      assert.ok(x0 > f.supportsX[i - 1] - 25 && x0 + L < f.supportsX[i] + 1, `${b.file}: span_${i} entre os apoios ${i - 1} e ${i}`);
      // Desvio grande em relação ao vão documentado só é aceito se vier sinalizado como conflito de medição.
      if (Math.abs(L - f.spansM[i - 1]) / f.spansM[i - 1] >= 0.1) {
        assert.ok(s.extras.m01.lengthConflict, `${b.file}: span_${i} com ${L} m (documentado ${f.spansM[i - 1]} m) sem lengthConflict`);
        assert.equal(s.extras.m01.appearanceCertainty, 'UNCERTAIN');
      }
    }
  }
});

test('M01 bridge GLBs separate the pieces destroyed at 06:10 and 06:40 and ship their destroyed states', () => {
  const expected = {
    evt_m01_west_demolition: ['abutment_west', 'pier_01', 'span_01', 'span_02'],
    evt_m01_east_demolition: ['pier_06_old_east_abutment', 'portal_old_east', 'span_06', 'span_07'],
  };
  for (const b of BRIDGES) {
    const { byName } = glb(`${b.file}.glb`);
    for (const [event, names] of Object.entries(expected)) for (const name of names) {
      const n = byName.get(name);
      assert.ok(n?.mesh !== undefined, `${b.file}: ${name} precisa ser nó com malha própria`);
      assert.equal(n.extras.m01.destroyedBy, event, `${b.file}: ${name}`);
      for (const r of n.extras.m01.replacedBy) {
        const d = byName.get(r);
        assert.ok(d?.mesh !== undefined, `${b.file}: estado destruído ${r}`);
        assert.equal(d.extras.m01.replaces, name);
        assert.equal(d.extras.m01.initiallyHidden, true);
      }
    }
    const others = [...byName.values()].filter(n => n.extras?.m01?.destroyedBy && !Object.values(expected).flat().includes(n.name));
    assert.deepEqual(others.map(n => n.name), [], `${b.file}: só as peças das demolições documentadas são destrutíveis`);
  }
});

test('M01 bridge GLBs mark uncertain 1939 appearance and match the manifest counts', () => {
  for (const b of BRIDGES) {
    const { byName } = glb(`${b.file}.glb`);
    for (const name of ['portal_west', 'portal_old_east', 'span_07', 'span_08', 'span_09', 'abutment_east_1912']) {
      assert.equal(byName.get(name).extras.m01.appearanceCertainty, 'UNCERTAIN', `${b.file}: ${name} deve estar marcado como INCERTO`);
    }
    assert.equal(byName.get('portal_old_east').extras.m01.existenceIn1939, 'UNCERTAIN');
  }
  for (const entry of manifest.files) {
    const file = entry.file.replace(DIR, '');
    const { json, triangles, bytes } = glb(file);
    assert.equal(bytes, entry.bytes, `${file}: tamanho no manifesto`);
    const unique = (json.meshes ?? []).reduce((s, _, i) => s + triangles(i), 0);
    const scene = json.nodes.filter(n => n.mesh !== undefined).reduce((s, n) => s + triangles(n.mesh), 0);
    assert.equal(unique, entry.uniqueTriangles, `${file}: triângulos únicos`);
    assert.equal(scene, entry.sceneTriangles, `${file}: triângulos em cena`);
    assert.ok(bytes < 6 * 1024 * 1024, `${file}: ${bytes} bytes; manter abaixo de 6 MB`);
  }
});
