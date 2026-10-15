// Escritor/leitor mínimo de PNG (RGBA 8 bit) só com node:zlib, sem dependências npm. Determinístico: filtro adaptativo fixo.
import zlib from 'node:zlib';

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
export const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

/** pixels: Uint8Array w*h*4 (RGBA). Escolhe, por linha, o filtro com menor soma de |bytes| (heurística padrão), empate = menor índice. */
export function encodePng(pixels, width, height) {
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height), cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = pixels[row + i], a = i >= 4 ? pixels[row + i - 4] : 0, b = y ? pixels[row - stride + i] : 0, c = y && i >= 4 ? pixels[row - stride + i - 4] : 0;
      cand[0][i] = x; cand[1][i] = (x - a) & 255; cand[2][i] = (x - b) & 255; cand[3][i] = (x - ((a + b) >> 1)) & 255; cand[4][i] = (x - paeth(a, b, c)) & 255;
    }
    let best = 0, bestSum = Infinity;
    for (let f = 0; f < 5; f++) { let s = 0; for (let i = 0; i < stride; i++) { const v = cand[f][i]; s += v < 128 ? v : 256 - v; } if (s < bestSum) { bestSum = s; best = f; } }
    raw[y * (stride + 1)] = best; raw.set(cand[best], y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Descodifica um PNG RGBA 8 bit não entrelaçado (o que encodePng escreve). Serve aos testes. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (crc32(buf.subarray(off + 4, off + 8 + len)) !== buf.readUInt32BE(off + 8 + len)) throw new Error(`bad crc in ${type}`);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('unsupported PNG'); }
    if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * 4, out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= 4 ? out[row + i - 4] : 0, b = y ? out[row - stride + i] : 0, c = y && i >= 4 ? out[row - stride + i - 4] : 0;
      out[row + i] = (x + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
    }
  }
  return { width, height, pixels: out };
}
