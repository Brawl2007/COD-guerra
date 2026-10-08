// Atlas completo de um conjunto de peças: ilhas → empacotamento → pintura → dilatação → imagens codificadas
// (cor JPEG sRGB, ORM PNG com R = 1, G = rugosidade, B = metal, normal PNG em espaço tangente).
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { collectIslands, pack, atlasUVs, rasterize, normalsFromHeight, dilate, downsample } from './atlas.mjs';

const to8 = x => Math.max(0, Math.min(255, Math.round(x * 255)));

export function encodeJPEG(rgb, size, quality = 88) {
  const data = Buffer.alloc(size * size * 4);
  for (let k = 0; k < size * size; k++) { data[k * 4] = to8(rgb[k * 3]); data[k * 4 + 1] = to8(rgb[k * 3 + 1]); data[k * 4 + 2] = to8(rgb[k * 3 + 2]); data[k * 4 + 3] = 255; }
  return { mime: 'image/jpeg', data: new Uint8Array(jpeg.encode({ data, width: size, height: size }, quality).data) };
}
export function encodePNG(rgb, size) {
  const png = new PNG({ width: size, height: size, colorType: 2 });
  for (let k = 0; k < size * size; k++) { png.data[k * 4] = to8(rgb[k * 3]); png.data[k * 4 + 1] = to8(rgb[k * 3 + 1]); png.data[k * 4 + 2] = to8(rgb[k * 3 + 2]); png.data[k * 4 + 3] = 255; }
  return { mime: 'image/png', data: new Uint8Array(PNG.sync.write(png, { colorType: 2 })) };
}

/**
 * Normal de espaço tangente no formato glTF: X = +U, Y = "para cima" na imagem (−V, porque a origem do UV glTF
 * é em cima à esquerda). O relevo é derivado em píxeis com y para baixo, daí a inversão do canal Y.
 */
function packNormal(n, size) {
  const out = new Float32Array(size * size * 3);
  for (let k = 0; k < size * size; k++) { out[k * 3] = n[k * 3] * 0.5 + 0.5; out[k * 3 + 1] = -n[k * 3 + 1] * 0.5 + 0.5; out[k * 3 + 2] = n[k * 3 + 2] * 0.5 + 0.5; }
  return out;
}

/**
 * parts: peças com positions, normals, uvs (locais), indices, paint, texel opcional, attrs opcionais.
 * Devolve as imagens (cor, ORM e normal nos tamanhos pedidos) e escreve part.atlasUV em cada peça.
 */
export function bakeAtlas(parts, painters, { size = 2048, ormSize = 1024, normalSize = 1024, extraSizes = [], ormExtra = [], normalExtra = [], normalStrength = 1, ormJPEG = 0, colorQuality = 88 } = {}) {
  const islands = collectIslands(parts);
  const packed = pack(islands, size, Math.max(3, Math.round(size / 400)));
  for (const p of parts) atlasUVs(p, islands, size);
  const tex = rasterize(parts, islands, size, painters);
  const nrm = normalsFromHeight(tex, islands, normalStrength);
  const orm = new Float32Array(size * size * 3);
  for (let k = 0; k < size * size; k++) { orm[k * 3] = 1; orm[k * 3 + 1] = tex.rough[k]; orm[k * 3 + 2] = tex.metal[k]; }
  const nPacked = packNormal(nrm, size);
  dilate([{ data: tex.color, d: 3 }, { data: orm, d: 3 }, { data: nPacked, d: 3 }], tex.owner, size, 10);
  const shrink = (data, to) => { let d = data, s = size; while (s > to) { d = downsample(d, s, 3); s /= 2; } return d; };
  const encORM = (d, s) => ormJPEG ? encodeJPEG(d, s, ormJPEG) : encodePNG(d, s);   // ormJPEG = qualidade JPEG (0 = PNG)
  const images = { color: encodeJPEG(tex.color, size, colorQuality), orm: encORM(shrink(orm, ormSize), ormSize), normal: encodePNG(shrink(nPacked, normalSize), normalSize) };
  for (const s of extraSizes) images[`color_${s}`] = encodeJPEG(shrink(tex.color, s), s, 85);
  for (const s of ormExtra) images[`orm_${s}`] = encORM(shrink(orm, s), s);
  for (const s of normalExtra) images[`normal_${s}`] = encodePNG(shrink(nPacked, s), s);
  return { images, density: packed.density, islands: islands.length, size, color: tex.color };
}
