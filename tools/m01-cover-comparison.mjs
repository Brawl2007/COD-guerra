// Compara, na simulação real, os percursos "jogador ajuda" e "jogador ignora" em "Proteja o reparo" e "Cubra a retirada".
// Uso: node tools/m01-cover-comparison.mjs [--seeds 19390901,1,2,...] [--out caminho.json]
// É uma comparação de estado (controlos + o que o jogador vê), não uma partida no navegador nem um playtest humano.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { coverRoute } from '../tests/helpers/m01-cover.js';

const args=process.argv.slice(2),opt=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
const seeds=opt('--seeds','19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const out=opt('--out','docs/verification/m01-runtime/continuous/round3/cover-comparison.json');
const runs=[];
for(const seed of seeds)for(const mode of ['help','ignore'])runs.push(coverRoute(seed,mode).stats);
const range=(mode,pick)=>{const v=runs.filter(r=>r.mode===mode).map(pick);return [Math.min(...v),Math.max(...v)];};
const summary=Object.fromEntries(['help','ignore'].map(mode=>[mode,{
  repairRealSeconds:range(mode,r=>r.repair.realSeconds),repairEnd:[...new Set(runs.filter(r=>r.mode===mode).map(r=>r.repair.end))].sort(),
  repairPins:range(mode,r=>r.repair.pins),gateMgSuppressedPct:range(mode,r=>r.repairMgSuppressedPct),
  survivors:range(mode,r=>r.survivors),health:range(mode,r=>r.health),activeSeconds:range(mode,r=>r.activeSeconds)}]));
const report={verification:'Comparação de estado na simulação de M01 (controlos e clarões visíveis em sim.threat); não é partida no navegador nem playtest humano.',
  seeds,summary,runs};
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary,null,1));
