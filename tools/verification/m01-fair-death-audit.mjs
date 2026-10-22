// H9 D4: actual warnings and fatal rounds, same pilot/seed/level; no table override or injected gameplay state.
import {dangerRoute} from '../../tests/helpers/m01-danger.js';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const levels=(arg('--levels')??'soldado,veterano').split(','),seeds=(arg('--seeds')??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const out=arg('--out')??'/tmp/m01-fair-death-audit';mkdirSync(out,{recursive:true});const rows=[];let captured=false;
for(const level of levels)for(const seed of seeds)for(const support of [false,true]){
 const row=dangerRoute({level,seed,support,captureDeathView:!captured});
 if(row.deathView&&!captured){writeFileSync(out+'/actual-pre-fatal-view.json',JSON.stringify(row.deathView));writeFileSync(out+'/actual-pre-fatal-origin.json',JSON.stringify({level,seed,support,deaths:row.deaths},null,2)+'\n');captured=true;}
 delete row.deathView;rows.push(row);writeFileSync(out+'/routes-progress.json',JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify({level,seed,support,complete:row.complete,died:row.died,minHealth:row.minHealth,cues:row.cueCounts,deaths:row.deaths.length,violations:row.violations.length,error:row.error}));
}
const sha=p=>createHash('sha256').update(readFileSync(new URL('../../'+p,import.meta.url))).digest('hex');
const summary={routes:rows.length,deaths:rows.reduce((n,r)=>n+r.deaths.length,0),violatingRoutes:rows.filter(r=>r.violations.length||r.error||!r.complete&&!r.died).map(r=>({level:r.level,seed:r.seed,support:r.support,violations:r.violations,error:r.error})),deathFixtureCaptured:captured};
writeFileSync(out+'/FAIR_DEATH_AUDIT.json',JSON.stringify({task:'M01-H9-D4-FAIR-DEATH-V1',method:'normal simulation route controls, actual fire/impact events and world LOS; observer instruments RNG calls without replacing their results; no gameplay state/clock/HP/LOS/table overrides',inputsSha256:Object.fromEntries(['src/game/m01-simulation.js','src/game/m01-difficulty.js','tests/helpers/m01-danger.js','tests/helpers/m01-route.js'].map(p=>[p,sha(p)])),summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary));if(summary.violatingRoutes.length)process.exitCode=1;
