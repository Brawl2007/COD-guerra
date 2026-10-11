// Gera o kit de props de M01: assets/models/provisional/m01/props/*.glb (LOD0/LOD1) e manifest.json.
// Uso: node tools/assets/m01-props/build.mjs [--check]   (sem dependências; determinístico)
// --check compara com o disco e falha se algum ficheiro mudaria.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Model, weather, MATERIALS } from './src/mesh.mjs';
import { encodeGlb } from './src/glb.mjs';
import { PROPS } from './src/registry.mjs';

const ROOT = new URL('../../../', import.meta.url).pathname;
export const OUT = join(ROOT, 'assets/models/provisional/m01/props');
export const BUDGET = { lod0: 1500, lod1: 300 };
const round = v => +v.toFixed(4);

/** Gera todos os ficheiros em memória: devolve { files: Map<nome, Buffer>, manifest }. */
export function generate() {
  const files = new Map(), props = [];
  for (const p of PROPS) {
    const entry = {
      id: p.id, name: p.name, category: p.category, description: p.description, reference: p.reference, files: {},
    };
    for (const lod of [0, 1]) {
      const m = new Model(p.id, lod, p.seed);
      p.fn(m, lod);
      weather(m);
      const enc = encodeGlb(m);
      const file = `m01_prop_${p.id}_lod${lod}.glb`;
      files.set(file, enc.buffer);
      entry.files[`lod${lod}`] = {
        file, bytes: enc.buffer.length, sha256: createHash('sha256').update(enc.buffer).digest('hex'),
        triangles: enc.triangles, vertices: enc.vertices, materials: enc.materials,
        bounds: { min: enc.bounds.min.map(round), max: enc.bounds.max.map(round) },
      };
      if (lod === 0) {
        entry.size_m = { x: round(enc.bounds.max[0] - enc.bounds.min[0]), y: round(enc.bounds.max[1] - enc.bounds.min[1]), z: round(enc.bounds.max[2] - enc.bounds.min[2]) };
        if (Object.keys(m.sockets).length) entry.sockets = m.sockets;
      }
    }
    props.push(entry);
  }
  const manifest = {
    version: 1,
    asset: 'Kit de props de guerra e ferrovia de M01 Tczew (Setembro de 1939) — LOD0/LOD1',
    status: 'PROVISÓRIO VERIFICADO (M01 continua PROTÓTIPO JOGÁVEL); ainda não ligado ao jogo (ligação = T33)',
    generator: 'tools/assets/m01-props/build.mjs',
    source: 'tools/assets/m01-props/',
    author: 'COD-guerra project, original procedural',
    license: 'CC0-1.0',
    units: 'metres',
    axes: '+Y para cima; origem no contacto com o solo; troços longos ao longo de X; carroças e carrinho com a frente (varais) para −Z',
    scale: 'tamanho real em metros; ver size_m e files.*.bounds de cada prop',
    colour: 'cor de vértice (COLOR_0, linear) com envelhecimento procedural (lama junto ao chão, pó, sombras de baixo); sem texturas; baseColorFactor branco',
    third_party: 'nenhum: geometria, cores e materiais criados por código neste repositório; nada extraído de jogos; sem dependências npm',
    budgets: { lod0_triangles_max: BUDGET.lod0, lod1_triangles_max: BUDGET.lod1 },
    materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, { roughness: v.roughness, metallic: v.metallic, ...(v.doubleSided ? { doubleSided: true } : {}) }])),
    props,
  };
  return { files, manifest };
}

const json = o => JSON.stringify(o, null, 2) + '\n';

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const { files, manifest } = generate();
  files.set('manifest.json', Buffer.from(json(manifest)));
  if (check) {
    const diff = [...files].filter(([n, b]) => !existsSync(join(OUT, n)) || !readFileSync(join(OUT, n)).equals(b)).map(([n]) => n);
    if (diff.length) { console.error('Diferem do disco:', diff.join(', ')); process.exit(1); }
    console.log(`OK: ${files.size} ficheiros iguais ao disco`);
  } else {
    mkdirSync(OUT, { recursive: true });
    for (const [n, b] of files) writeFileSync(join(OUT, n), b);
    let t0 = 0, t1 = 0;
    for (const p of manifest.props) {
      t0 += p.files.lod0.triangles; t1 += p.files.lod1.triangles;
      console.log(`${p.id.padEnd(22)} lod0 ${String(p.files.lod0.triangles).padStart(5)}  lod1 ${String(p.files.lod1.triangles).padStart(4)}  ${p.size_m.x.toFixed(2)}×${p.size_m.y.toFixed(2)}×${p.size_m.z.toFixed(2)} m`);
    }
    console.log(`${manifest.props.length} props, ${files.size} ficheiros, triângulos LOD0 ${t0}, LOD1 ${t1}`);
  }
}
