// Leitura de GLB (nós, esqueleto, clips) e cinemática directa, sem three.js: amostra um clip num instante e devolve a
// posição/rotação no mundo de cada osso. Usado para ligar os extremos às poses reais e medir contactos.
import { readFileSync } from 'node:fs';

const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
export function readGLB(path) {
  const buf = readFileSync(path), len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const binStart = 20 + len + 8, bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + len));
  const acc = i => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = COMP[a.type], st = v.byteStride ?? n * 4, off = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (a.componentType !== 5126) throw new Error('só float');
    return Array.from({ length: a.count }, (_, k) => Array.from({ length: n }, (_, c) => bin.readFloatLE(off + k * st + c * 4)));
  };
  return { json, acc, bytes: buf };
}

export const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qrot = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
export function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1;
  if (d < 0) { d = -d; s = -1; }
  if (d > 0.9995) { const r = a.map((x, i) => x + (s * b[i] - x) * t), n = Math.hypot(...r); return r.map(x => x / n); }
  const th = Math.acos(d), k0 = Math.sin((1 - t) * th) / Math.sin(th), k1 = s * Math.sin(t * th) / Math.sin(th);
  return a.map((x, i) => x * k0 + b[i] * k1);
}

/** Esqueleto (nome → {parent, t, r, s}) a partir dos nós de um GLB, com os nomes de `bones`. */
export function skeleton(glb, bones) {
  const { json } = glb, out = {};
  for (const b of bones) {
    const n = json.nodes.find(x => x.name === b.name);
    if (!n) throw new Error(`osso em falta: ${b.name}`);
    out[b.name] = { parent: b.parent ?? null, t: n.translation ?? [0, 0, 0], r: n.rotation ?? [0, 0, 0, 1], s: n.scale ?? [1, 1, 1] };
  }
  return out;
}

/** Clip → {duration, tracks: {osso: {rotation?, translation?, scale?: {times, values, step}}}}. */
export function clip(glb, name) {
  const { json, acc } = glb, a = json.animations.find(x => x.name === name);
  if (!a) throw new Error(`clip em falta: ${name}`);
  const tracks = {}; let duration = 0;
  for (const c of a.channels) {
    const s = a.samplers[c.sampler], times = acc(s.input).map(v => v[0]), values = acc(s.output), node = json.nodes[c.target.node].name;
    (tracks[node] ??= {})[c.target.path] = { times, values, step: s.interpolation === 'STEP' };
    duration = Math.max(duration, times.at(-1));
  }
  return { name, duration, tracks };
}

function sampleTrack(tr, t, path) {
  const { times, values } = tr;
  if (t <= times[0]) return values[0];
  if (t >= times.at(-1)) return values.at(-1);
  let i = 1; while (times[i] < t) i++;
  if (tr.step) return values[i - 1];
  const u = (t - times[i - 1]) / (times[i] - times[i - 1]);
  return path === 'rotation' ? slerp(values[i - 1], values[i], u) : values[i - 1].map((x, k) => x + (values[i][k] - x) * u);
}

/** Pose local (osso → {t, r, s}) de um clip no instante t; ossos sem pista ficam no bind. */
export function localPose(skel, c, t) {
  const out = {};
  for (const [name, b] of Object.entries(skel)) {
    const tr = c?.tracks[name] ?? {};
    out[name] = { t: tr.translation ? sampleTrack(tr.translation, t, 'translation') : b.t, r: tr.rotation ? sampleTrack(tr.rotation, t, 'rotation') : b.r, s: tr.scale ? sampleTrack(tr.scale, t, 'scale') : b.s };
  }
  return out;
}

/** Mundo (relativo à raiz do actor, mais `root` = {t, r} opcional): osso → {p, r}. */
export function worldPose(skel, local, root = { t: [0, 0, 0], r: [0, 0, 0, 1] }) {
  const W = {};
  for (const name of Object.keys(skel)) {
    const b = skel[name], L = local[name], P = b.parent ? W[b.parent] : { p: root.t, r: root.r };
    W[name] = { p: P.p.map((x, k) => x + qrot(P.r, L.t)[k]), r: qmul(P.r, L.r) };
  }
  return W;
}
