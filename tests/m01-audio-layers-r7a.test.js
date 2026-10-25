import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioManager} from '../src/core/audio.js';
import {
  AUDIO_PROVISIONAL_LABEL,VISTULA_CHANNEL,VariantTracker,acousticBand,acousticShape,waterCrossing,bankOf,farBankTreatment,planWeaponShot,
  riverBedMix,riverLayerLevels,riverBedVolume,riverAlignmentPeriodMs,RIVER_LAYER_PERIODS_MS,railAmbiencePhase,railSlotKind,planRailAmbienceSlot,
  pickVariant,presentationNoise,SHOT_VARIANTS,FOOTSTEP_VARIANTS,
} from '../src/core/battlefield-audio.js';
import {enemyFireSoundPlan} from '../src/game/m01-audio-events.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

const makeAudio=()=>{const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx});assert.equal(audio.init(),true);return {audio,ctx};};
const spatial=point=>({distance:Math.hypot(point.x,point.z),pan:0,front:1,dy:0});
const layers=(grains,name)=>grains.filter(g=>g.layer===name);

test('the Vistula channel comes from the layout (x 25..265) and bank/water geometry follows it',()=>{
  assert.deepEqual({...VISTULA_CHANNEL},{minX:25,maxX:265});
  assert.equal(bankOf(-100),'west');assert.equal(bankOf(100),'channel');assert.equal(bankOf(400),'east');
  assert.equal(waterCrossing(-100,-300),0,'west bank to west bank: no river between');
  assert.equal(waterCrossing(10,400),240,'from the west abutment to the east bank: the whole channel');
  assert.equal(waterCrossing(400,10),240,'symmetric');
  assert.equal(waterCrossing(100,400),165,'from the deck: only the water east of the listener');
});

test('river bed gain by position: full over the water, falls with the distance to the nearest bank',()=>{
  const deck=riverBedMix(150,5),edge=riverBedMix(25,0),yard=riverBedMix(-352,8),far=riverBedMix(-460,0),east=riverBedMix(420,0);
  assert.equal(deck.inChannel,true);assert.equal(deck.gain,1);assert.equal(edge.gain,1);
  assert.equal(yard.inChannel,false);assert.ok(Math.abs(yard.distance-377)<1e-9);
  assert.ok(yard.gain<.15&&yard.gain>.05,`yard gain ${yard.gain}`);
  assert.ok(far.gain<yard.gain,'further from the river is quieter');
  assert.ok(riverBedMix(60-35,0).gain===1&&riverBedMix(-25,0).gain<1&&riverBedMix(-25,0).gain>riverBedMix(-125,0).gain);
  assert.ok(east.gain>far.gain,'the east bank is nearer the water than the west yard');
  assert.deepEqual({...riverBedMix(-100,3).nearest},{x:25,z:3},'the bed pans towards the nearest water');
  // louder on the deck than anywhere on the banks, in volume terms too
  assert.ok(riverBedVolume(deck,100)>riverBedVolume(yard,100)*5);
  assert.equal(riverBedMix(NaN,0).gain,0);
});

test('river bed has no audible loop shorter than 60 s: layers of different buffers and rates, incommensurate slow modulations',()=>{
  assert.equal(new Set(RIVER_LAYER_PERIODS_MS).size,RIVER_LAYER_PERIODS_MS.length,'no two layers share a period');
  assert.ok(riverAlignmentPeriodMs()>60*1000*100,`the layers realign only after ${riverAlignmentPeriodMs()/1000} s`);
  for(const p of RIVER_LAYER_PERIODS_MS)assert.ok(p>2000);
  // modulation: values vary slowly (smooth, bounded) and are not periodic over 5 minutes
  let prev=null,maxStep=0,min=1,max=0;const series=[];
  for(let t=0;t<300;t+=.5){const l=riverLayerLevels(t).flow;series.push(l);if(prev!==null)maxStep=Math.max(maxStep,Math.abs(l-prev));prev=l;min=Math.min(min,l);max=Math.max(max,l);}
  assert.ok(maxStep<.12,`slow variation, max step per 0.5 s ${maxStep}`);assert.ok(max-min>.3,'it does breathe');
  for(const lag of [60,90,120,180,240]){   // seconds: compare the two halves shifted by `lag`
    let same=0;for(let i=0;i+lag*2<series.length;i++)if(Math.abs(series[i]-series[i+lag*2])<1e-9)same++;
    assert.ok(same<3,`no exact repetition at lag ${lag} s`);
  }
  const cells=[29.7,17.3,11.9,7.3,43.1];assert.equal(new Set(cells).size,cells.length);
  assert.ok(presentationNoise('m01-river:master',10,43.1)>=0);
});

test('the river bed is a loop of the manager, follows the listener and stays within the loop budget',()=>{
  const {audio}=makeAudio();
  const call=(clock,x)=>audio.updateM01Presentation({clock,state:{},spatial,phase:'MAIN_COMBAT',listener:{x,z:0}});
  call(1,150);
  assert.ok(audio.loops.has('river'),'river loop exists');
  const voice=audio.loops.get('river'),onDeck=voice.gain.gain._target??voice.gain.gain.value;
  call(2,150);call(3,-380);
  assert.equal(voice.distance,405,'distance = metres to the water edge (drives the air filter of the loop)');
  const yard=voice.gain.gain._target??voice.gain.gain.value;
  assert.ok(yard<onDeck*.3,`yard ${yard} vs deck ${onDeck}`);
  assert.ok(audio.diagnostics.loops.includes('river'));assert.ok(audio.loops.size<=10);
  // without a listener there is no river (other callers/tests are unchanged)
  const other=makeAudio().audio;other.updateM01Presentation({clock:1,state:{},spatial,phase:'MAIN_COMBAT'});assert.ok(!other.loops.has('river'));
});

test('far-bank treatment: acousticBand, shape and shot plan read differently from near fire at the same distance',()=>{
  assert.equal(acousticBand(200),'mid');assert.equal(acousticBand(200,{water:0}),'mid');
  assert.equal(acousticBand(200,{water:240}),'far-bank');assert.equal(acousticBand(40,{water:240}),'close','too near to be read as the other bank');
  assert.equal(acousticBand(200,{water:30}),'mid');
  const none=farBankTreatment(10),some=farBankTreatment(100),full=farBankTreatment(260);
  assert.equal(none.active,false);assert.ok(some.active&&full.hfScale<some.hfScale&&full.slapDelay>=some.slapDelay);
  const plain=acousticShape(250,{category:'weapon'}),over=acousticShape(250,{category:'weapon',water:240});
  assert.ok(over.filter<plain.filter*.7,'stronger HF loss over open water');assert.ok(over.send>plain.send);assert.equal(over.band,'far-bank');
  assert.deepEqual(acousticShape(250,{category:'player',water:240}).filter,acousticShape(250,{category:'player'}).filter,'the player own weapon is never far-bank');
  const base=planWeaponShot('mg34',250,{key:'bank'}),bank=planWeaponShot('mg34',250,{key:'bank',water:240});
  assert.equal(layers(base,'water-slap').length+layers(base,'water-sheen').length,0);
  const slaps=layers(bank,'water-slap'),sheen=layers(bank,'water-sheen');
  assert.ok(slaps.length>=2&&sheen.length===1);
  assert.ok(Math.min(...slaps.map(g=>g.at))>.12,'the slap-back arrives well after the shot');
  assert.ok(sheen[0].at<.04,'the sheen is right behind the crack');
  assert.ok(layers(bank,'crack')[0].filter.freq<layers(base,'crack')[0].filter.freq*.75,'crack loses its highs');
  // same shot, same variant: the far-bank layers are added, not a different sound
  assert.equal(layers(bank,'body')[0].freq,layers(base,'body')[0].freq);
  assert.equal(planWeaponShot('mg34',250,{key:'bank',water:240,detail:'low'}).filter(g=>g.layer==='water-slap').length,1);
  // the manager passes the water to the voice filter: same distance, darker voice
  const {audio}=makeAudio();
  const a=audio.weaponFire('mg34',0,300,{key:'x:1',water:0,distant:true}),b=audio.weaponFire('mg34',0,300,{key:'x:2',water:240,distant:true});
  assert.ok(b.filter.frequency.value<a.filter.frequency.value*.7,`${b.filter.frequency.value} vs ${a.filter.frequency.value}`);
  // a sim fire event carries the water crossing from the player to the muzzle
  const plan=enemyFireSoundPlan({origin:{x:300,y:1,z:0},at:1},{x:-20,y:0,z:0,angle:0,crouched:false,prone:false});
  assert.equal(plan.water,240);
  assert.equal(enemyFireSoundPlan({origin:{x:-250,y:1,z:0},at:1},{x:-20,y:0,z:0,angle:0}).water,0);
});

test('repetition guard: no variant twice in a row, no ABAB with four variants, deterministic, off = old behaviour',()=>{
  const sequence=(guard,count,n=2000)=>{const t=new VariantTracker({guard}),out=[];for(let i=0;i<n;i++)out.push(pickVariant('fam',`ev:${i}`,count,t,'g'));return out;};
  for(const count of [3,4]){
    const off=sequence(false,count),on=sequence(true,count);
    assert.ok(off.some((v,i)=>i&&v===off[i-1]),`without the guard ${count} variants do repeat back to back`);
    for(let i=1;i<on.length;i++)assert.notEqual(on[i],on[i-1],`no back-to-back at ${i}`);
    assert.deepEqual(sequence(true,count),on,'deterministic');
    assert.equal(new Set(on).size,count,'all variants are used');
    if(count===4)for(let i=2;i<on.length;i++)assert.notEqual(on[i],on[i-2],`no A-B-A at ${i}`);
    const counts=Array(count).fill(0);for(const v of on)counts[v]++;
    assert.ok(Math.min(...counts)>on.length/count*.7,`balanced use ${counts}`);
  }
  assert.deepEqual(sequence(false,4),Array.from({length:2000},(_,i)=>pickVariant('fam',`ev:${i}`,4)),'guard off = the stateless hash choice');
  // groups are independent
  const t=new VariantTracker();const a=pickVariant('a','k',3,t),b=pickVariant('b','k',3,t);assert.ok(a>=0&&b>=0);
});

test('the manager varies MG bursts, rifle shots, impacts and footsteps: no identical consecutive variants over many events',()=>{
  const {audio}=makeAudio();audio.variants.log=[];
  for(let i=0;i<150;i++){audio.weaponFire('mg34',0,120,{rounds:6,interval:.075,key:`mg:${i}`});audio.rifleShot(0,100,'kar98k',`r:${i}`);audio.impact('stone',0,10,`im:${i}`);audio.footstep('earth',{key:`step:${i}`});
    for(const s of [...audio.voices])audio._release(s,true,false);}
  const byGroup={};for(const {group,variant} of audio.variants.log)(byGroup[group]??=[]).push(variant);
  assert.ok(byGroup['shot:mg34'].length>=900&&byGroup['shot:kar98k'].length>=150&&byGroup['impact:stone'].length>=150&&byGroup['step:earth'].length>=150);
  for(const [group,seq] of Object.entries(byGroup))for(let i=1;i<seq.length;i++)assert.notEqual(seq[i],seq[i-1],`${group} at ${i}`);
  // within a burst the rounds do not repeat the previous timbre
  assert.ok(SHOT_VARIANTS>=4&&FOOTSTEP_VARIANTS>=3);
});

test('railway ambience: shunting before the station is bombed, aftermath ticks after, quiet right after a blast',()=>{
  assert.equal(railAmbiencePhase({damage:[]},100),'shunting');assert.equal(railAmbiencePhase({},100),'shunting');
  const bomb={id:'station_bomb',soundAt:200};
  assert.equal(railAmbiencePhase({damage:[bomb]},150),'shunting','the bomb has not sounded yet');
  assert.equal(railAmbiencePhase({damage:[bomb]},202),'quiet','the first seconds after a blast are quiet');
  assert.equal(railAmbiencePhase({damage:[bomb]},260),'aftermath');
  assert.equal(railAmbiencePhase({damage:[{id:'forward_post',soundAt:300}]},301),'quiet','any audible blast quiets the yard');
  assert.equal(railAmbiencePhase({damage:[{id:'forward_post',soundAt:300}]},320),'shunting');
  // shunting content: all four kinds over time, with silences, never the same kind in consecutive slots
  const kinds=[];for(let s=0;s<400;s++)kinds.push(railSlotKind(s,'shunting'));
  assert.deepEqual([...new Set(kinds.filter(Boolean))].sort(),['buffer','couplers','creak','steam']);
  assert.ok(kinds.filter(k=>k===null).length>60,'there are gaps between events');
  for(let i=1;i<kinds.length;i++)if(kinds[i])assert.notEqual(kinds[i],kinds[i-1],`slot ${i}`);
  assert.ok(planRailAmbienceSlot(kinds.findIndex(k=>k==='couplers'),'shunting').length>=6);
  // after the raid: no shunting content at all, only sparse metal ticks; quiet: nothing
  const after=[];for(let s=0;s<400;s++)after.push(railSlotKind(s,'aftermath'));
  assert.deepEqual([...new Set(after.filter(Boolean))],['tick']);assert.ok(after.filter(Boolean).length<100);
  for(let s=0;s<50;s++)assert.deepEqual(planRailAmbienceSlot(s,'quiet'),[]);
  for(let s=0;s<400;s++)for(const g of planRailAmbienceSlot(s,'aftermath'))assert.ok(g.layer==='metal-tick');
});

test('railway ambience is played from the manager only while the phase allows it, spatially at the yard',()=>{
  const {audio}=makeAudio();const point=p=>({distance:Math.hypot(p.x+100,p.z),pan:0,front:1});
  const run=(from,to,state)=>{for(let c=from;c<to;c+=.5)audio.updateM01Presentation({clock:c,state,spatial:point,phase:'MAIN_COMBAT',listener:{x:-100,z:0}});return audio.events.get('rail-ambience')??0;};
  const early=run(1,200,{damage:[]});assert.ok(early>20,`shunting events before the raid: ${early}`);
  const kinds=audio.history.filter(h=>h.kind==='rail-ambience');assert.ok(kinds.every(h=>h.detail==='shunting'));
  const raid={damage:[{id:'station_bomb',soundAt:200}]};
  const during=run(200,205,raid);assert.equal(during-early,0,'quiet right after the blast');
  const late=run(205,600,raid);
  assert.ok(late-during<60,'only sparse ticks afterwards');
  assert.ok(audio.history.filter(h=>h.kind==='rail-ambience'&&h.serial>kinds.at(-1).serial).every(h=>h.detail==='aftermath'));
  // distant listeners (beyond 800 m) hear nothing
  const far=makeAudio().audio;for(let c=1;c<200;c+=.5)far.updateM01Presentation({clock:c,state:{},spatial:()=>({distance:900,pan:0,front:1}),phase:'MAIN_COMBAT',listener:{x:0,z:0}});
  assert.equal(far.events.get('rail-ambience')??0,0);
});

test('the provisional audio label is in the settings menu and in the pause menu, and nowhere in the HUD',()=>{
  assert.equal(AUDIO_PROVISIONAL_LABEL,'Áudio provisório sintetizado — gravações finais pendentes (T45)');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="audio-status">Áudio provisório sintetizado — gravações finais pendentes \(T45\)</);
  assert.match(html,/id="pause-audio-status">Áudio provisório sintetizado — gravações finais pendentes \(T45\)</);
  assert.equal(html.split(AUDIO_PROVISIONAL_LABEL).length-1,2,'exactly the menu and the pause card');
  const hud=readFileSync(new URL('../src/ui/m01-hud.js',import.meta.url),'utf8');assert.ok(!hud.includes('provisório sintetizado'));
});
