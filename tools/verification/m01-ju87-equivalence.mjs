// Equivalência de gameplay para o fecho do Ju 87: corre a rota completa de M01 (tests/helpers/m01-route.js) numa
// árvore do repositório e imprime o SHA-256 do snapshot final, dos eventos, dos checkpoints e do estado de render
// que a simulação expõe ao renderer durante o raid. Correr na base e na candidata e comparar as linhas.
// Uso: node tools/verification/m01-ju87-equivalence.mjs [raiz do repositório]
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? new URL('../../', import.meta.url).pathname);
const { route, driver } = await import(pathToFileURL(resolve(root, 'tests/helpers/m01-route.js')).href);
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const raid = [];
const d = driver(19390901, { onStep: ({ sim }) => { if (sim.renderState.stukas && raid.length < 400) raid.push([sim.clock, sim.renderState.stukas, sim.renderState.secondRaid, Object.keys(sim.consumed).length]); } });
d.step({ skip: true }); d.until(() => d.sim.renderState.stukas, 200); for (let i = 0; i < 400; i++) d.step({});
const r = route();
const out = {
  root,
  raidWindow: sha(raid), raidSnapshot: sha(d.sim.snapshot()),
  finalSnapshot: sha(r.sim.snapshot()), events: sha(r.events), checkpoints: sha(r.checkpoints),
  battleClock: r.sim.battleClock, eventCount: r.events.length,
};
console.log(JSON.stringify(out));
