// Gerador determinístico das texturas do terreno M01 (T09-lite, família terreno). Sem dependências npm.
//   node tools/assets/m01-materials/generate.mjs [--out assets/textures/m01/terrain]
// Reexecutar produz bytes idênticos (aritmética exacta + zlib com parâmetros fixos); tests/m01-terrain-textures.test.js verifica.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTerrainTextures } from './src/terrain.mjs';
import { encodePng } from './src/png.mjs';

export const AUTHOR = 'COD-guerra project, original procedural';
export const LICENSE = 'CC0-1.0';   // mesma convenção dos restantes assets originais do projecto (ver assets/models/production/m01/*/manifest.json)
export const GENERATOR = 'tools/assets/m01-materials/generate.mjs';

/** Gera texturas + manifesto em memória (sem tocar no disco). */
export function generateTerrain() {
  const textures = buildTerrainTextures().map((t) => {
    const png = encodePng(t.pixels, t.width, t.height);
    return { ...t, png, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') };
  });
  const manifest = {
    version: 1,
    family: 'terrain',
    author: AUTHOR,
    license: LICENSE,
    units: 'metres per tile (tileMetres); mask and shader work in world metres, x/z ground',
    source: GENERATOR,
    colorSpace: 'linear data (not sRGB): luma / coverage / tangent-normal xy packed in RGBA; colour comes from shader tints',
    notes: 'Original procedural art (periodic value noise, Worley, stamps; fixed seeds, exact arithmetic). Nothing extracted from or copied from any game.',
    files: textures.map((t) => ({ file: t.file, role: t.role, size: [t.width, t.height], width: t.width, height: t.height, bytes: t.bytes, sha256: t.sha256,
      channels: t.channels, tileMetres: t.tileMetres, mipmaps: true, wrap: 'repeat', flipY: false })),
  };
  return { textures, manifest };
}

export function writeTerrain(outDir) {
  const { textures, manifest } = generateTerrain();
  mkdirSync(outDir, { recursive: true });
  for (const t of textures) writeFileSync(path.join(outDir, t.file), t.png);
  writeFileSync(path.join(outDir, 'terrain.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = path.resolve(i > 0 ? process.argv[i + 1] : fileURLToPath(new URL('../../../assets/textures/m01/terrain', import.meta.url)));
  const t0 = Date.now(), manifest = writeTerrain(out);
  for (const f of manifest.files) console.log(f.file, f.width + 'x' + f.height, f.bytes, f.sha256.slice(0, 12));
  console.log(`done in ${Date.now() - t0} ms -> ${out}`);
}
