// Gerador determinístico das texturas do terreno M01 (T09-lite, família terreno). Sem dependências npm.
//   node tools/assets/m01-materials/generate.mjs [--out assets/textures/m01/terrain]
// Reexecutar produz bytes idênticos (aritmética exacta + zlib com parâmetros fixos); tests/m01-terrain-textures.test.js verifica.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTerrainTextures } from './src/terrain.mjs';
import { encodePng } from './src/png.mjs';
import { buildMaterialAtlas, ATLAS_SIZE, CELL_SIZE, GUTTER } from './src/atlas.mjs';

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
      decodedBytes: t.width * t.height * 4, channels: t.channels, tileMetres: t.tileMetres, mipmaps: true, wrap: 'repeat', flipY: false })),
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

export function generateAtlas() {
  const { textures: raw, materials } = buildMaterialAtlas();
  const textures = raw.map(t => { const png = encodePng(t.pixels, t.width, t.height); return { ...t, png, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') }; });
  const manifest = { version: 1, family: 'shared-material-atlas', author: AUTHOR, license: LICENSE, source: GENERATOR,
    notes: 'Original procedural art; fixed seeds; no game extraction or third-party images. Scale and palette are artistic estimates, not historical measurements.',
    units: 'metres per repeating material cell', layout: { columns: 4, rows: 4, highSize: ATLAS_SIZE, cellSize: CELL_SIZE, gutter: GUTTER, lowSize: ATLAS_SIZE / 2 },
    channels: { albedo: 'sRGB RGB + opaque alpha', normal: 'linear tangent-space XYZ in RGB + opaque alpha; +Y', orm: 'linear R occlusion, G roughness, B metalness + opaque alpha' },
    materials, files: textures.map(({file,role,tier,width,height,bytes,sha256,colorSpace}) => ({file,role,tier,width,height,size:[width,height],bytes,decodedBytes:width*height*4,sha256,colorSpace,mipmaps:true,flipY:false})),
    decodedHighBytes: textures.filter(t=>t.tier==='high').reduce((n,t)=>n+t.width*t.height*4,0),
    budget: { units: 'RGBA8 decoded bytes, excluding mipmaps; computed, not measured GPU allocation', atlasHighDecodedBytes: 3 * 1024 * 1024 * 4, terrainHighDecodedBytes: (2 * 1024 * 1024 + 2 * 512 * 512) * 4, macroMaskHighDecodedBytes: 2048 * 640 * 4, totalHighDecodedBytes: (3 * 1024 * 1024 + 2 * 1024 * 1024 + 2 * 512 * 512 + 2048 * 640) * 4, limitBytes: 40 * 1048576 } };
  return { textures, manifest };
}
export function writeAtlas(outDir) {
  const { textures, manifest } = generateAtlas(); mkdirSync(outDir, { recursive: true });
  for(const t of textures) writeFileSync(path.join(outDir,t.file),t.png);
  writeFileSync(path.join(outDir,'materials.manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out'), atlasOnly=process.argv.includes('--atlas');
  const root=fileURLToPath(new URL('../../../assets/textures/m01/', import.meta.url));
  const out=path.resolve(i>0?process.argv[i+1]:path.join(root,atlasOnly?'atlas':'terrain'));
  const manifests=[];
  if(!atlasOnly)manifests.push(writeTerrain(out));
  if(atlasOnly||process.argv.includes('--all'))manifests.push(writeAtlas(atlasOnly?out:path.join(i>0?path.dirname(out):root,'atlas')));
  for(const manifest of manifests)for(const f of manifest.files)console.log(f.file,f.width+'x'+f.height,f.bytes,f.sha256.slice(0,12));
}
