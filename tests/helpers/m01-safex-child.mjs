// Test-only child process (tests/m01-pkg2-saves.test.js): loads the game under another safeX and loads one saved checkpoint of a fixture into it.
//   node tests/helpers/m01-safex-child.mjs <safeX> <fixture.json> <label> [seconds]
// Prints one JSON line: the live plan's lines, the deck records of the save as written and as restored, and whether the restored game validates strictly and plays on `seconds` (default 20) of game time.
// A load that fails exits non-zero with the validator's message on stderr.
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
const [,,safeX,fixture,label,seconds='20']=process.argv;
register('./m01-safex-hook.mjs',import.meta.url,{data:{safeX:Number(safeX)}});
const {M01Simulation,validateM01Snapshot}=await import('../../src/game/m01-simulation.js');
const {DECK_ASSAULT,validDeckRecord}=await import('../../src/game/m01-deck-assault.js');
const save=JSON.parse(readFileSync(fixture,'utf8')).saves.find(s=>s.label===label);
if(!save)throw new Error(`no save ${label} in ${fixture}`);
const records=snap=>snap.actors.filter(a=>a.deck&&a.group==='grp_de_spans').map(a=>({id:a.id,lim:a.deck.lim??null,node:a.deck.node,phase:a.deck.phase,alive:a.alive,x:a.x}));
const written=records(save.snapshot);
validateM01Snapshot(structuredClone(save.snapshot));
const s=new M01Simulation(1);s.restoreSnapshot(structuredClone(save.snapshot));s.drainEvents();
const restored=records(s.snapshot());
const strict=snap=>snap.actors.every(a=>!(a.deck&&a.group==='grp_de_spans')||validDeckRecord(a,snap.clock));
const strictAtLoad=strict(s.snapshot())&&strict(s.checkpoint);
for(let i=0;i<Number(seconds)/.05;i++)s.tick(.05,{});
const after=s.snapshot();validateM01Snapshot(structuredClone(after));
console.log(JSON.stringify({safeX:DECK_ASSAULT.safeX,lines:DECK_ASSAULT.lines,maxNodes:DECK_ASSAULT.maxNodes,last:DECK_ASSAULT.paths.map(p=>p.length-1),written,restored,strictAtLoad,strictAfter:strict(after),
  clock:[save.snapshot.clock,after.clock]}));
