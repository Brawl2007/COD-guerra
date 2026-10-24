// R2-c evidence: saves from the real control route (tests/helpers/m01-route.js, the pilot that never fires) a few seconds BEFORE moments where the long-range
// presentation has something to show, plus a timeline of those moments. Read-only on the simulation; the saves are the sim's own snapshot() (checkpoint format).
// Usage: node tools/verification/m01-long-range-snapshots.mjs <outDir> [seed=19390901]
//   repair-<n>.json   the repair post, German MG34 / rifle fire from the east bank (round-impact events near the player), ~04:48-04:53
//   deck-polish.json  the deck post: just before the Polish section's first real round with an end point (npc-shot.end), 06:05+
//   deck-mg.json      the deck post: just before German MG34 rounds marked as tracers fly at the deck, 06:00-06:10
// The saves are not edited: the pilot already faces east (player.angle ~ 0) at both posts. Browser side: tools/verification/m01-long-range-capture.mjs.
import {mkdirSync,writeFileSync} from 'node:fs';
import {route} from '../../tests/helpers/m01-route.js';

const out=process.argv[2],seed=Number(process.argv[3]??19390901);
mkdirSync(out,{recursive:true});
const hhmm=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=Math.floor(s%60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;};
const ring=[];   // {battleClock, snap}
const want={repair:null,deckPolish:null,deckMg:null};
const timeline={impacts:[],polishEnded:[],mgTracers:[],crack:[],grenades:[]};
const at=(lead)=>{for(let i=ring.length-1;i>=0;i--)if(ring[i].battleClock<=ring.at(-1).battleClock-lead)return ring[i];return ring[0];};
route(seed,{support:false,onStep:({sim,events})=>{
  const bc=sim.battleClock;
  if(Math.round(bc*20)%60===0){ring.push({battleClock:bc,clock:sim.clock,snap:sim.snapshot()});if(ring.length>12)ring.shift();}
  for(const e of events){
    if(e.type==='round-impact'){timeline.impacts.push([hhmm(bc),Math.round(e.distance),e.material,e.crack?'crack':'']);if(e.crack)timeline.crack.push(hhmm(bc));
      if(!want.repair&&bc>=4*3600+48*60&&bc<=4*3600+53*60&&e.distance<80&&ring.length>2)want.repair=at(4);}
    if(e.type==='npc-shot'&&e.end){timeline.polishEnded.push([hhmm(bc),Math.round(Math.hypot(e.end.x-sim.player.x,e.end.z-sim.player.z)),e.hit]);if(!want.deckPolish&&bc>=6*3600+4*60&&ring.length>2)want.deckPolish=at(3);}
    if(e.type==='enemy-grenade')timeline.grenades.push(hhmm(bc));
  }
  if(bc>=6*3600&&bc<=6*3600+10*60&&sim.enemyFire.rounds.some(r=>r.tracer&&r.weapon==='mg34')){
    if(!timeline.mgTracers.length||timeline.mgTracers.at(-1)!==hhmm(bc))timeline.mgTracers.push(hhmm(bc));
    if(!want.deckMg&&ring.length>2)want.deckMg=at(2);
  }
}});
const meta={};
for(const [name,w] of Object.entries({'repair-1':want.repair,'deck-polish':want.deckPolish,'deck-mg':want.deckMg})){
  if(!w){meta[name]=null;continue;}
  writeFileSync(`${out}/${name}.json`,JSON.stringify(w.snap));meta[name]={battleClock:w.battleClock,time:hhmm(w.battleClock),simClock:w.clock};
}
const tidy=l=>l.length>40?[...l.slice(0,40),`... ${l.length} total`]:l;
writeFileSync(`${out}/timeline.json`,JSON.stringify({seed,saves:meta,impacts:tidy(timeline.impacts),polishEnded:timeline.polishEnded,mgTracerSeconds:tidy(timeline.mgTracers),crackAt:tidy(timeline.crack),grenades:timeline.grenades},null,1)+'\n');
console.log(JSON.stringify({saves:meta,impacts:timeline.impacts.length,polishEnded:timeline.polishEnded.length,mgTracerSeconds:timeline.mgTracers.length,cracks:timeline.crack.length,grenades:timeline.grenades.length}));
