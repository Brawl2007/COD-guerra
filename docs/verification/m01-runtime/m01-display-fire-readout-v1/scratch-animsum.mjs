// Summarise an animation-contract run: failing test names and the actual/expected digest blocks printed by the golden assertions.
import {readFileSync} from 'node:fs';
const text=readFileSync(process.argv[2],'utf8');
const fails=[...text.matchAll(/^✖ (.+?) \(\d+(?:\.\d+)?ms\)$/gm)].map(m=>m[1]);
const failing=[...new Set(fails)].sort();
const lines=text.split('\n');
// actual (+) / expected (-) sha256 lines with the tick that follows them, per failing golden test
const blocks=[];let current=null;
for(let i=0;i<lines.length;i++){
  const t=lines[i];
  if(/^✖ all gameplay bytes hashed each tick against approved base: seed (\d+)/.test(t)&&i>25){current=t.match(/seed (\d+)/)[1];continue;}
  if(/^✖ (gait|Bąk|legacy|optional|corrupt)/.test(t)&&i>25)current=null;
  if(current){
    const m=t.match(/^\s*([+-])\s+sha256: '([0-9a-f]{64})'/);
    if(m)blocks.push(`${current} ${m[1]} ${m[2]}`);
    const k=t.match(/^\s*tick: (\d+)/);if(k&&blocks.length)blocks.push(`${current} tick ${k[1]}`);
  }
}
const sum=text.match(/^ℹ (tests|pass|fail) (\d+)/gm);
console.log(JSON.stringify({counts:sum,failing,digestLines:blocks.length},null,1));
console.log(blocks.join('\n'));
