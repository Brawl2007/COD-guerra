// Pele aproximada para medir contactos com o chão: skinning linear (LBS) dos vértices do corpo e do equipamento do
// soldado alemão (o mesmo buildNation dos GLB) com as transformações do solver. Ligação: rotações nulas nas
// articulações J (como em glb.mjs, matriz inversa = translação −J). Só para medir; não escreve geometria.
import { q } from '../../m01-soldiers/src/pose.mjs';

/** Prepara os vértices (de `step` em `step`) dos grupos pedidos: [{name, P: Float64Array, B: bones, Wt}]. */
export function skinSet(nation, groups = ['body', 'gear'], step = 2) {
  const J = nation.J, out = [];
  for (const g of nation.groups.filter(g => groups.includes(g.name))) {
    const P = [], B = [], Wt = [];
    for (const p of g.parts) for (let i = 0; i < p.positions.length / 3; i += step) {
      P.push([p.positions[i * 3], p.positions[i * 3 + 1], p.positions[i * 3 + 2]]);
      const s = [...p.skin[i]].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = s.reduce((a, x) => a + x[1], 0);   // 4 maiores, normalizados (como no GLB)
      B.push(s.map(x => x[0])); Wt.push(s.map(x => x[1] / sum));
    }
    out.push({ name: g.name, P, B, Wt, J });
  }
  return out;
}
/**
 * Vértice mais baixo (mundo) por grupo, com o osso de maior peso: {grupo: [y, [x,y,z], osso]}; `byBone` recebe também o
 * mais baixo por osso dominante ({osso: y}).
 */
export function lowest(set, W, byBone = null) {
  const res = {};
  for (const g of set) {
    let lo = [Infinity, null, ''];
    for (let i = 0; i < g.P.length; i++) {
      let x = 0, y = 0, z = 0, best = 0;
      for (let k = 0; k < g.B[i].length; k++) {
        const b = g.B[i][k], w = g.Wt[i][k], T = W[b], j = g.J[b];
        const v = q.rot(T.r, [g.P[i][0] - j[0], g.P[i][1] - j[1], g.P[i][2] - j[2]]);
        x += w * (v[0] + T.p[0]); y += w * (v[1] + T.p[1]); z += w * (v[2] + T.p[2]);
        if (w > g.Wt[i][best]) best = k;
      }
      if (y < lo[0]) lo = [y, [x, y, z], g.B[i][best]];
      if (byBone) { const b = g.B[i][best]; if (!(b in byBone) || y < byBone[b]) byBone[b] = y; }
    }
    res[g.name] = lo;
  }
  return res;
}
