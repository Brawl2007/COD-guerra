import fs from 'node:fs/promises';
import {chromium} from '/workspace/COD-guerra/node_modules/playwright-core/index.mjs';
const out='/workspace/scratch/m01-quality-inspector', log=out+'/observer.jsonl';
await fs.writeFile(log,'');
let browser;
for(let i=0;i<20;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9223');break;}catch{await new Promise(r=>setTimeout(r,1000));}}
if(!browser)throw new Error('Observer could not attach');
const page=browser.contexts()[0].pages()[0];let lastShot=-Infinity,seq=0;
try{while(!page.isClosed()){
 const row=await page.evaluate(()=>{const d=window.gameDiagnostics?.();if(!d?.m01)return null;return {observedAt:new Date().toISOString(),clock:d.clock,player:d.player,phase:d.missionPhase,complete:d.complete,paused:d.paused,quality:d.quality,battle:d.m01.battleClock,eventIds:d.eventIds,objectives:d.m01.objectives,threat:d.m01.threat,hud:d.m01.hudPresentation,audio:d.audio??null,actorPresentation:d.m01.characters?.actors?.map(a=>({id:a.id,lod:a.lod,clip:a.clip,clipTime:a.clipTime,ik:a.ik?.mode})),text:Object.fromEntries(['objective-text','objective-status','interaction','subtitle','message'].map(id=>[id,document.getElementById(id)?.textContent??'']))};});
 if(row){await fs.appendFile(log,JSON.stringify(row)+'\n');if(row.clock>=lastShot+120&&row.clock>12){lastShot=row.clock;const file=`observer-${++seq}-g${Math.round(row.clock)}.png`;await page.screenshot({path:`${out}/${file}`});await fs.appendFile(out+'/observer-images.jsonl',JSON.stringify({file,observedAt:row.observedAt,game:row.clock,battle:row.battle,phase:row.phase})+'\n');}}
 await new Promise(r=>setTimeout(r,30000));
}}catch(e){await fs.appendFile(log,JSON.stringify({observerStopped:e.message})+'\n');}
// Do not close the browser owned by the route pilot.
process.exit(0);
