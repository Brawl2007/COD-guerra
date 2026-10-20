// Genuine, alive corridor views from normal controls. Presentation changes never alter these gameplay inputs.
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route,driver} from '../../tests/helpers/m01-route.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='738d294edcc993fa65e434d7fd36ddda3dbe166c',root=new URL('../../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
for(const path of ['src/game/m01-simulation.js','src/game/m01-pacing.js','tests/helpers/m01-route.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json'])
 if(sha(readFileSync(new URL(path,root)))!==sha(execFileSync('git',['show',`${base}:${path}`],{cwd:root})))throw Error('Gameplay input moved since genuine view baseline: '+path);
class Soldier extends M01Simulation{constructor(seed){super(seed,{difficulty:'soldado'});}}
const views={};let west=false;
const result=route(19390901,{Simulation:Soldier,onStep:({sim})=>{
 if(sim.active('hold_corridor')){
  views.entry??=sim.snapshot();
  if(sim.actor('jozef_bak').carriedBy==='leon_dudek')views['medic-carrying']??=sim.snapshot();
  if(sim.readiness('evt_m01_west_demolition'))views['all-clear']??=sim.snapshot();
 }
 if(!west&&sim.consumedEvent('evt_m01_west_demolition')){views['west-blast']=sim.snapshot();west=true;}
}});
if(!result.sim.mission.complete||!views['all-clear'])throw Error('The real corridor route did not finish safely');
const d=driver(19390901,{Simulation:Soldier});d.sim.restoreSnapshot(views['medic-carrying']);d.sim.drainEvents();
d.walk(-275,27,30);views['outside-post']=d.sim.snapshot();
const origin={baseCommit:base,method:'Existing route/driver controls on Soldado; read-only snapshots; outside-post uses normal walking after restoring the genuine carrying snapshot. No position, HP, clock, events or LOS injected.',simulationSha256:sha(readFileSync(new URL('src/game/m01-simulation.js',root))),fixtures:{}};
for(const [name,view] of Object.entries(views)){
 if(!view.player.alive)throw Error('View must be alive: '+name);
 const file=`tests/fixtures/m01-sp08-${name}.json`,text=JSON.stringify(view)+'\n';origin.fixtures[file]={sha256:sha(text),clock:view.clock};
 if(process.argv.includes('--write'))writeFileSync(new URL(file,root),text);else if(readFileSync(new URL(file,root),'utf8')!==text)throw Error('View differs: '+file);
}
const file=new URL('tests/fixtures/m01-sp08-views-origin.json',root),text=JSON.stringify(origin,null,2)+'\n';
if(process.argv.includes('--write'))writeFileSync(file,text);else if(readFileSync(file,'utf8')!==text)throw Error('Origin differs');
console.log(JSON.stringify({completed:result.sim.mission.complete,views:Object.keys(views),sourceCommit:base}));
