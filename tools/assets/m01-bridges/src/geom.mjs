// Primitivas de geometria em metros (X leste, Y altura, Z sul), construídas com three.js.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const X = new THREE.Vector3(1, 0, 0);

/** Acumula geometrias por material para formar uma malha (uma primitiva glTF por material). */
export class Part {
  constructor() { this.byMaterial = new Map(); }
  add(material, geometry) {
    if (!this.byMaterial.has(material)) this.byMaterial.set(material, []);
    this.byMaterial.get(material).push(geometry.index ? geometry.toNonIndexed() : geometry);
    return this;
  }
  merge(other) { for (const [m, list] of other.byMaterial) for (const g of list) this.add(m, g); return this; }
  /** Devolve [{ material, geometry }] com geometria fundida e reindexada. */
  build() {
    const out = [];
    for (const [material, list] of this.byMaterial) {
      const attrs = list.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; });
      const merged = mergeVertices(mergeGeometries(attrs, false), 1e-4);
      merged.computeBoundingBox();
      out.push({ material, geometry: merged });
    }
    return out;
  }
}

/** Viga de secção retangular entre os pontos a e b. width: dimensão em `side`; height: em `up`. */
export function beam(a, b, width, height, up = new THREE.Vector3(0, 1, 0)) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  dir.normalize();
  let u = up.clone().sub(dir.clone().multiplyScalar(up.dot(dir)));
  if (u.lengthSq() < 1e-8) u = new THREE.Vector3(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z));
  u.normalize();
  const side = new THREE.Vector3().crossVectors(dir, u).normalize();
  const g = new THREE.BoxGeometry(len, height, width);
  const m = new THREE.Matrix4().makeBasis(dir, u, side).setPosition(A.clone().add(B).multiplyScalar(0.5));
  return g.applyMatrix4(m);
}

/** Caixa alinhada aos eixos por limites mínimos e máximos. */
export function box(min, max) {
  const s = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return new THREE.BoxGeometry(...s).translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
}

/** Cilindro vertical com base em y0 e topo em y1. */
export function cylinder(cx, cz, r, y0, y1, segments = 20, rTop = r) {
  return new THREE.CylinderGeometry(rTop, r, y1 - y0, segments).translate(cx, (y0 + y1) / 2, cz);
}

/** Planta de pilar com talha-mar pontiagudo a montante (+Z, o Vístula corre para norte) e jusante arredondado. */
export function pierPlan(lengthX, lengthZ, noseZ) {
  const s = new THREE.Shape();
  const hx = lengthX / 2, hz = lengthZ / 2;
  s.moveTo(-hx, -hz);
  s.absarc(0, -hz, hx, Math.PI, 0, false);       // jusante (norte, −Z): semicírculo
  s.lineTo(hx, hz);
  s.lineTo(0, hz + noseZ);                       // montante (sul, +Z): bico
  s.lineTo(-hx, hz);
  s.lineTo(-hx, -hz);
  return s;
}

/** Extrude uma forma desenhada no plano X–Z ao longo de Y, de y0 a y1. */
export function extrudePlanY(shape, y0, y1, curveSegments = 8) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments });
  // A forma está em (x, y) com extrusão em +Z. Mapear: forma.y → mundo Z, extrusão → mundo Y.
  g.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  g.translate(0, y0, 0);
  // A troca de eixos inverte a orientação dos triângulos; corrigir as faces.
  return flipFaces(g);
}

/** Muro com aberturas em arco ogival, desenhado no plano Z–Y e espessura em X. */
export function wallWithArches(z0, z1, y0, y1, thicknessX, arches, curveSegments = 10) {
  const s = new THREE.Shape();
  s.moveTo(z0, y0); s.lineTo(z1, y0); s.lineTo(z1, y1); s.lineTo(z0, y1); s.lineTo(z0, y0);
  for (const a of arches) s.holes.push(pointedArch(a.centerZ, a.width, y0, a.springY, a.apexY, curveSegments));
  const g = new THREE.ExtrudeGeometry(s, { depth: thicknessX, bevelEnabled: false, curveSegments });
  // forma (x→Z, y→Y), extrusão (+Z)→ +X. Matriz: X_mundo = extrusão, Y = y, Z = x.
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  g.translate(-thicknessX / 2, 0, 0);
  return flipFaces(g);
}

/** Contorno de arco ogival (gótico) como Path: dois arcos de círculo com centros simétricos.
 *  Para rise = √3·(width/2) o arco é equilátero (centros nos pontos de nascença opostos). */
export function pointedArch(cz, width, yBase, springY, apexY, segments = 10) {
  const h = width / 2, rise = apexY - springY;
  const d = (rise * rise - h * h) / (2 * h);       // deslocamento do centro do arco esquerdo, à direita do eixo
  const R = h + d;
  const phiEnd = Math.atan2(rise, -d);              // ângulo do ápice visto do centro esquerdo
  const p = new THREE.Path();
  p.moveTo(cz - h, yBase);
  p.lineTo(cz - h, springY);
  const left = [];
  for (let i = 1; i <= segments; i++) {
    const phi = Math.PI + (phiEnd - Math.PI) * (i / segments);
    left.push([cz + d + R * Math.cos(phi), springY + R * Math.sin(phi)]);
  }
  for (const [z, y] of left) p.lineTo(z, y);
  for (let i = left.length - 2; i >= 0; i--) p.lineTo(2 * cz - left[i][0], left[i][1]);
  p.lineTo(cz + h, springY);
  p.lineTo(cz + h, yBase);
  p.lineTo(cz - h, yBase);
  return p;
}

export function flipFaces(g) {
  const geo = g.index ? g.toNonIndexed() : g;
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    for (const attr of [pos, nor, uv].filter(Boolean)) {
      const n = attr.itemSize;
      for (let k = 0; k < n; k++) {
        const a = attr.array[(i + 1) * n + k];
        attr.array[(i + 1) * n + k] = attr.array[(i + 2) * n + k];
        attr.array[(i + 2) * n + k] = a;
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Ameias: merlões ao redor de um círculo (torre) ou ao longo de um segmento reto. */
export function merlonsRing(cx, cz, r, y0, height, count, width, depth) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const g = new THREE.BoxGeometry(depth, height, width)
      .rotateY(-a)
      .translate(cx + Math.cos(a) * (r - depth / 2), y0 + height / 2, cz + Math.sin(a) * (r - depth / 2));
    list.push(g);
  }
  return list;
}

export function merlonsLine(a, b, y0, height, count, width, depth) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = [a[0] + (b[0] - a[0]) * t, y0 + height / 2, a[1] + (b[1] - a[1]) * t];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    list.push(new THREE.BoxGeometry(width, height, depth).rotateY(-ang).translate(...p));
  }
  return list;
}

/** Gerador pseudoaleatório determinístico (entulho reproduzível). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function triangleCount(geometry) {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

export { THREE, X };
