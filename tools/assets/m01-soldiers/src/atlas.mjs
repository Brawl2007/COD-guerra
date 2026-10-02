// Atlas de texturas de um personagem: ilhas UV de todas as peças empacotadas num quadrado, rasterização em
// espaço de textura com posição/normal 3D interpoladas e pintura procedural (cor, rugosidade, metal, relevo).
import { v3 } from './meshops.mjs';

/**
 * Ilhas de cada peça. Peças vindas da malha base (com `src`) têm várias ilhas (componentes ligadas pelos UV do
 * MakeHuman); peças em loft são uma ilha com `size` [largura, altura] em metros. `part.texel` multiplica a
 * densidade (rosto ×3, peças escondidas ×0.5).
 */
export function collectIslands(parts) {
  const islands = [];
  for (const part of parts) {
    const n = part.positions.length / 3, I = part.indices, P = part.positions, U = part.uvs;
    part.islandOf = new Int32Array(n).fill(-1);
    const groups = [];
    if (part.src || !part.size) {
      const parent = Int32Array.from({ length: n }, (_, i) => i);
      const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (let t = 0; t < I.length; t += 3) { const a = find(I[t]); parent[find(I[t + 1])] = a; parent[find(I[t + 2])] = a; }
      const byRoot = new Map();
      for (let t = 0; t < I.length; t += 3) { const r = find(I[t]); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(t); }
      groups.push(...byRoot.values());
    } else groups.push(Array.from({ length: I.length / 3 }, (_, k) => k * 3));
    for (const tris of groups) {
      let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity, a3 = 0, aUV = 0;
      for (const t of tris) {
        const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
        for (const i of [a, b, c]) { u0 = Math.min(u0, U[i * 2]); u1 = Math.max(u1, U[i * 2]); v0 = Math.min(v0, U[i * 2 + 1]); v1 = Math.max(v1, U[i * 2 + 1]); }
        const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], pb = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], pc = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
        a3 += v3.len(v3.cross(v3.sub(pb, pa), v3.sub(pc, pa))) / 2;
        aUV += Math.abs((U[b * 2] - U[a * 2]) * (U[c * 2 + 1] - U[a * 2 + 1]) - (U[c * 2] - U[a * 2]) * (U[b * 2 + 1] - U[a * 2 + 1])) / 2;
      }
      const du = Math.max(u1 - u0, 1e-6), dv = Math.max(v1 - v0, 1e-6);
      let W, H;
      if (part.size && !part.src) { W = part.size[0] * du; H = part.size[1] * dv; }
      else { const s = Math.sqrt(a3 / Math.max(aUV, 1e-12)); W = du * s; H = dv * s; }
      const id = islands.length;
      islands.push({ id, part, tris, u0, v0, du, dv, W: Math.max(W, 0.004), H: Math.max(H, 0.004), texel: part.texel ?? 1 });
      for (const t of tris) for (let k = 0; k < 3; k++) part.islandOf[I[t + k]] = id;
    }
  }
  return islands;
}

/** Empacotamento em prateleiras com procura binária da densidade (px/m) que cabe no quadrado. */
export function pack(islands, size, pad = 4) {
  const tryPack = d => {
    const rects = islands.map(is => ({ is, w: Math.max(6, Math.ceil(is.W * d * is.texel) + pad * 2), h: Math.max(6, Math.ceil(is.H * d * is.texel) + pad * 2) }));
    for (const r of rects) if (r.w > size) { const k = size / r.w; r.w = size; r.h = Math.ceil(r.h * k); }
    rects.sort((a, b) => b.h - a.h || b.w - a.w);
    let x = 0, y = 0, shelf = 0;
    for (const r of rects) {
      if (x + r.w > size) { x = 0; y += shelf; shelf = 0; }
      r.x = x; r.y = y; x += r.w; shelf = Math.max(shelf, r.h);
    }
    return { ok: y + shelf <= size, rects, used: y + shelf };
  };
  let lo = 1, hi = 20000, best = null;
  for (let it = 0; it < 30; it++) {
    const mid = (lo + hi) / 2, r = tryPack(mid);
    if (r.ok) { lo = mid; best = { ...r, density: mid }; } else hi = mid;
  }
  for (const r of best.rects) r.is.rect = { x: r.x + pad, y: r.y + pad, w: r.w - pad * 2, h: r.h - pad * 2 };
  return best;
}

/** Coordenadas UV do atlas (0..1, origem em cima à esquerda como no glTF) para cada vértice das peças. */
export function atlasUVs(part, islands, size) {
  const n = part.positions.length / 3, out = new Float32Array(n * 2), U = part.uvs;
  for (let i = 0; i < n; i++) {
    const is = islands[part.islandOf[i]];
    if (!is) { out[i * 2] = 0; out[i * 2 + 1] = 0; continue; }
    const r = is.rect;
    out[i * 2] = (r.x + ((U[i * 2] - is.u0) / is.du) * r.w) / size;
    out[i * 2 + 1] = (r.y + ((U[i * 2 + 1] - is.v0) / is.dv) * r.h) / size;
  }
  part.atlasUV = out;
  return out;
}

/**
 * Rasteriza e pinta. painters[part.paint](ctx) → { c: [r,g,b] sRGB 0..1, r: rugosidade, m: metal, h: relevo (m) }.
 * ctx = { p, n, uv (UV local da peça), a (atributos interpolados), part, island }.
 */
export function rasterize(parts, islands, size, painters) {
  const N = size * size;
  const color = new Float32Array(N * 3), rough = new Float32Array(N).fill(0.9), metal = new Float32Array(N), height = new Float32Array(N);
  const owner = new Int32Array(N).fill(-1), cover = new Float32Array(N).fill(Infinity);
  for (const part of parts) {
    const painter = painters[part.paint];
    if (!painter) throw new Error(`sem pintor para ${part.paint} (${part.name})`);
    const P = part.positions, Nn = part.normals, U = part.uvs, A = part.atlasUV, I = part.indices;
    const attrNames = Object.keys(part.attrs ?? {});
    for (let t = 0; t < I.length; t += 3) {
      const ia = I[t], ib = I[t + 1], ic = I[t + 2], island = islands[part.islandOf[ia]];
      const ax = A[ia * 2] * size, ay = A[ia * 2 + 1] * size, bx = A[ib * 2] * size, by = A[ib * 2 + 1] * size, cx = A[ic * 2] * size, cy = A[ic * 2 + 1] * size;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1)), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx) + 1));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1)), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy) + 1));
      // Distância em píxeis fora do triângulo aceite (cobre as arestas; o interior tem prioridade).
      const scale = [Math.hypot(by - cy, cx - bx), Math.hypot(cy - ay, ax - cx), Math.hypot(ay - by, bx - ax)].map(l => l / Math.abs(den));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5, sy = py + 0.5;
        let w0 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) / den, w1 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) / den, w2 = 1 - w0 - w1;
        const out = Math.max(0, -w0 / scale[0], -w1 / scale[1], -w2 / scale[2]);
        if (out > 1.0) continue;
        const k = py * size + px;
        if (out >= cover[k]) continue;
        if (out > 0) { w0 = Math.max(0, w0); w1 = Math.max(0, w1); w2 = Math.max(0, w2); const s = w0 + w1 + w2; w0 /= s; w1 /= s; w2 /= s; }
        const lerp3 = (arr, d) => { const o = []; for (let q = 0; q < d; q++) o.push(arr[ia * d + q] * w0 + arr[ib * d + q] * w1 + arr[ic * d + q] * w2); return o; };
        const a = {};
        for (const nm of attrNames) { const arr = part.attrs[nm]; a[nm] = arr[ia] * w0 + arr[ib] * w1 + arr[ic] * w2; }
        const res = painter({ p: lerp3(P, 3), n: v3.norm(lerp3(Nn, 3)), uv: lerp3(U, 2), a, part, island });
        cover[k] = out; owner[k] = island.id;
        color[k * 3] = res.c[0]; color[k * 3 + 1] = res.c[1]; color[k * 3 + 2] = res.c[2];
        rough[k] = res.r ?? 0.9; metal[k] = res.m ?? 0; height[k] = res.h ?? 0;
      }
    }
  }
  return { size, color, rough, metal, height, owner };
}

/** Normal de espaço tangente a partir do relevo (diferenças finitas dentro da mesma ilha). */
export function normalsFromHeight(tex, islands, strength = 1) {
  const { size, height, owner } = tex, out = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = y * size + x, id = owner[k];
    if (id < 0) { out[k * 3 + 2] = 1; continue; }
    const is = islands[id], mx = is.W / is.rect.w, my = is.H / is.rect.h;    // metros por píxel
    const hAt = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= size || yy >= size) return height[k]; const j = yy * size + xx; return owner[j] === id ? height[j] : height[k]; };
    const dx = (hAt(x + 1, y) - hAt(x - 1, y)) / (2 * mx), dy = (hAt(x, y + 1) - hAt(x, y - 1)) / (2 * my);
    const n = v3.norm([-dx * strength, -dy * strength, 1]);
    out[k * 3] = n[0]; out[k * 3 + 1] = n[1]; out[k * 3 + 2] = n[2];
  }
  return out;
}

/** Preenche os píxeis vazios com a média dos vizinhos já pintados (evita costuras com mipmaps). */
export function dilate(channels, owner, size, passes = 8) {
  const filled = new Uint8Array(size * size);
  for (let k = 0; k < filled.length; k++) filled[k] = owner[k] >= 0 ? 1 : 0;
  for (let it = 0; it < passes; it++) {
    const add = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const k = y * size + x;
      if (filled[k]) continue;
      let cnt = 0; const acc = channels.map(c => new Array(c.d).fill(0));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const j = yy * size + xx;
        if (!filled[j]) continue;
        cnt++;
        channels.forEach((c, ci) => { for (let q = 0; q < c.d; q++) acc[ci][q] += c.data[j * c.d + q]; });
      }
      if (cnt) add.push([k, acc.map(a => a.map(v => v / cnt))]);
    }
    for (const [k, vals] of add) { filled[k] = 1; channels.forEach((c, ci) => { for (let q = 0; q < c.d; q++) c.data[k * c.d + q] = vals[ci][q]; }); }
  }
  return filled;
}

/** Reduz para metade (média 2×2). */
export function downsample(data, size, d) {
  const h = size / 2, out = new Float32Array(h * h * d);
  for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) for (let q = 0; q < d; q++) {
    out[(y * h + x) * d + q] = (data[((2 * y) * size + 2 * x) * d + q] + data[((2 * y) * size + 2 * x + 1) * d + q] + data[((2 * y + 1) * size + 2 * x) * d + q] + data[((2 * y + 1) * size + 2 * x + 1) * d + q]) / 4;
  }
  return out;
}
