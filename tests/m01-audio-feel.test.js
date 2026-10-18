import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager,AUDIO_PRIORITY} from '../src/core/audio.js';
import {
  WEAPON_SOUND_PROFILES,SHOT_VARIANTS,SHOT_VARIANT_SHAPES,IMPACT_MATERIALS,IMPACT_VARIANTS,EXPLOSION_VARIANTS,PASS_VARIANTS,FOOTSTEP_VARIANTS,FOOTSTEP_SURFACES,
  acousticShape,soundDelay,pickVariant,humanize,planWeaponShot,planWeaponBurst,planImpact,planExplosion,planBulletPass,planFootstep,planWz29Mechanism,
  planPlayerHit,planLanding,footstepSurface,
} from '../src/core/battlefield-audio.js';
import {M01AudioDirector} from '../src/game/audio-director-m01.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

// "Robotic sound" (owner playtest, complaint 12): the sound of an event must be a deterministic function of the event, and different events
// must differ by more than a listener can ignore. Pure plan tests (Node), a graph test with the fake context, and the director's footsteps.
const WEAPONS=Object.keys(WEAPON_SOUND_PROFILES),N=200;
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const layer=(plan,name)=>plan.filter(g=>g.layer===name);
const makeAudio=(options={})=>{const ctx=new FakeAudioContext(options),audio=new AudioManager({contextFactory:()=>ctx});assert.equal(audio.init(),true);return {audio,ctx};};

test('determinism: the same event always plans the same sound; different events plan different sounds',()=>{
  const makers={
    shot:key=>planWeaponShot('kar98k',40,{key}),burst:key=>planWeaponBurst('mg34',40,{rounds:6,interval:.075,key,cadenceJitter:.06}),
    impact:key=>planImpact('metal',8,{key}),blast:key=>planExplosion('large',60,{key}),crack:key=>planBulletPass('crack',{key}),
    step:key=>planFootstep('wood',{key}),bolt:key=>planWz29Mechanism('bolt',{key}),hit:key=>planPlayerHit({key}),landing:key=>planLanding(9,'ground',{key}),
  };
  for(const [name,make] of Object.entries(makers)){
    assert.deepEqual(make('same'),make('same'),`${name}: same key, same sound`);
    const prints=new Set();for(let i=0;i<60;i++)prints.add(JSON.stringify(make('ev'+i)));
    assert.ok(prints.size>=58,`${name}: ${prints.size}/60 distinct plans for 60 distinct events`);
  }
  // Presentation only: humanize never reads a random source (Math.random is replaced by a thrower while it runs).
  const original=Math.random;Math.random=()=>{throw new Error('Math.random in audio planning');};
  try{for(const make of Object.values(makers))make('x');humanize([{layer:'a',src:'osc',freq:100,vol:.1,at:0}],'k');}finally{Math.random=original;}
});

test('variant coverage: every variant of every weapon, material, blast, pass and footstep surface is reachable and structurally different',()=>{
  assert.equal(SHOT_VARIANTS,4);assert.equal(SHOT_VARIANT_SHAPES.length,SHOT_VARIANTS);
  for(const id of WEAPONS){
    const seen=new Set(),sigs=new Set();
    for(let i=0;i<N;i++){const key='v'+i;seen.add(pickVariant(`${id}:0`,key,SHOT_VARIANTS));}
    assert.equal(seen.size,SHOT_VARIANTS,`${id}: all ${SHOT_VARIANTS} shot variants occur in ${N} events`);
    for(let i=0;i<N;i++)sigs.add(planWeaponShot(id,30,{key:'v'+i}).map(g=>g.layer).join('>'));
    assert.ok(sigs.size>=2,`${id}: layer structure differs between variants (${sigs.size})`);
  }
  for(const m of IMPACT_MATERIALS){const seen=new Set();for(let i=0;i<N;i++)seen.add(pickVariant(`impact:${m}`,'i'+i,IMPACT_VARIANTS));assert.equal(seen.size,IMPACT_VARIANTS,`impact ${m}`);}
  for(const s of FOOTSTEP_SURFACES){const seen=new Set();for(let i=0;i<N;i++)seen.add(pickVariant(`step:${s}`,'s'+i,FOOTSTEP_VARIANTS));assert.equal(seen.size,FOOTSTEP_VARIANTS,`footstep ${s}`);}
  for(const [family,count] of [['blast:large',EXPLOSION_VARIANTS],['pass:crack',PASS_VARIANTS],['pass:whizz',PASS_VARIANTS]]){const seen=new Set();for(let i=0;i<N;i++)seen.add(pickVariant(family,'b'+i,count));assert.equal(seen.size,count,family);}
  // Metal impacts also pick one of several modal families: ring layers differ in count and partial frequencies.
  const rings=new Set();for(let i=0;i<N;i++)rings.add(layer(planImpact('metal',8,{key:'m'+i}),'ring').length);
  assert.ok(rings.size>=2,'metal rings: 3- and 4-partial families');
  // Four materials the owner asked for: wood, stone, steel, earth (plus water and brick) all have three impact voicings with their own layers.
  for(const m of ['wood','stone','metal','earth','water','brick']){
    const sigs=new Set();for(let i=0;i<N;i++)sigs.add(planImpact(m,8,{key:'z'+i}).filter(g=>!g.layer.startsWith('ricochet')).map(g=>g.layer).join('>'));
    assert.ok(sigs.size>=2,`impact ${m}: structure varies (${sigs.size})`);
  }
});

test('spread: pitch, gain and layer mix of repeated shots vary far beyond the old +-3-6 %',()=>{
  for(const id of WEAPONS)for(const d of [15,150,600]){
    const plans=Array.from({length:N},(_,i)=>planWeaponShot(id,d,{key:'s'+i}));
    const crackHz=plans.map(p=>layer(p,'crack')[0].filter.freq),crackVol=plans.map(p=>Math.log10(layer(p,'crack')[0].vol));
    const cv=std(crackHz)/mean(crackHz);
    assert.ok(cv>.07,`${id}@${d}: crack filter spread ${(cv*100).toFixed(1)} % (was 2.4-3.5 %)`);
    assert.ok(20*std(crackVol)>.8,`${id}@${d}: crack gain SD ${(20*std(crackVol)).toFixed(2)} dB (was 0.2-0.3 dB)`);
    // Layer MIX: the body-to-crack level ratio changes from shot to shot.
    const mix=plans.map(p=>20*Math.log10(layer(p,'tail')[0].vol/layer(p,'crack')[0].vol));
    assert.ok(std(mix)>1.5,`${id}@${d}: tail/crack balance SD ${std(mix).toFixed(2)} dB`);
  }
  // The player's wz.29 keeps its established crack/body/tail timings (a contract of the original design) and varies everything else.
  for(let i=0;i<50;i++){const wz=planWeaponShot('kb_wz29',0,{key:'w'+i});assert.equal(layer(wz,'crack')[0].dur,.26);assert.equal(layer(wz,'tail')[0].at,.15);assert.equal(layer(wz,'body')[0].dur,.24);}
  // Impacts and blasts used to have a constant gain; now they vary.
  const gain=(make)=>20*std(Array.from({length:N},(_,i)=>Math.log10(make('g'+i).reduce((s,g)=>s+g.vol,0))));
  assert.ok(gain(k=>planImpact('wood',8,{key:k}))>.7);assert.ok(gain(k=>planImpact('earth',8,{key:k}))>.7);assert.ok(gain(k=>planExplosion('small',30,{key:k}))>.5);
  // A single noise filter sweeps while it decays (a real report darkens as it dies): crack/tail/body of a shot carry a freqEnd.
  const shot=planWeaponShot('mg34',20,{key:'sweep'});assert.ok(layer(shot,'tail')[0].filter.freqEnd<layer(shot,'tail')[0].filter.freq);assert.ok(layer(shot,'blast')[0].filter.freqEnd<layer(shot,'blast')[0].filter.freq);
});

test('bursts: the authoritative cadence is untouched; display fire gets zero-mean jitter around the same interval',()=>{
  const exact=layer(planWeaponBurst('mg34',30,{rounds:7,interval:.075,key:'b'}),'crack').map(g=>g.at);
  exact.forEach((at,i)=>assert.ok(Math.abs(at-i*.075)<1e-12,'simulation cadence is exact'));
  const gaps=[];for(let k=0;k<N;k++){const at=layer(planWeaponBurst('mg34',30,{rounds:8,interval:.075,key:'j'+k,cadenceJitter:.06}),'crack').map(g=>g.at);
    assert.equal(at[0],0);for(let i=1;i<at.length;i++){assert.ok(at[i]>at[i-1],'rounds stay in order');gaps.push(at[i]-at[i-1]);}}
  assert.ok(Math.abs(mean(gaps)-.075)<.0015,`mean gap ${mean(gaps)}`);const sorted=[...gaps].sort((a,b)=>a-b);assert.ok(Math.abs(sorted[sorted.length>>1]-.075)<.0035,'median stays at the interval');
  assert.ok(std(gaps)>.003&&std(gaps)<.01,`gap SD ${(std(gaps)*1000).toFixed(2)} ms: irregular, never a stutter`);
  assert.ok(Math.max(...gaps)<.075*1.2&&Math.min(...gaps)>.075*.8);
});

test('distance model is monotonic: quieter, darker, wetter and later with distance; air absorption follows the physics',()=>{
  const ds=[0,1,2,5,10,20,45,46,80,150,220,221,300,450,700,950,951,1400,2000,3000];
  for(const category of ['weapon','impact','explosion','distant','vehicle','aircraft']){
    let prev=null;
    for(const d of ds){const s=acousticShape(d,{category});
      if(prev){assert.ok(s.gain<=prev.gain+1e-12,`${category} gain @${d}`);assert.ok(s.filter<=prev.filter+1e-9,`${category} lowpass @${d}`);assert.ok(s.send>=prev.send-1e-12,`${category} reverb send @${d}`);assert.ok(soundDelay(d)>=soundDelay(prev.d));}
      prev={...s,d};}
  }
  // ~ISO 9613 (15 C, 70 % RH): little loss under 4 kHz at 15 m, about 4 dB at 4 kHz by 150 m, about 13 dB by 450 m. A 12 dB/octave lowpass at fc loses 12 dB one octave above fc.
  assert.ok(acousticShape(15,{category:'weapon'}).filter>12000);
  assert.ok(acousticShape(150,{category:'weapon'}).filter<6000&&acousticShape(150,{category:'weapon'}).filter>3000);
  assert.ok(acousticShape(450,{category:'weapon'}).filter<2600&&acousticShape(950,{category:'weapon'}).filter<1200);
  assert.ok(Math.abs(soundDelay(343)-1)<1e-12);
  // The head shadows what is behind.
  assert.ok(acousticShape(60,{front:-1}).filter<acousticShape(60,{front:1}).filter);
  // Far reports are low rumble and reflections; near ones carry the mechanism and the crack (layer mix by band).
  const near=planWeaponShot('kar98k',10,{key:'band'}),far=planWeaponShot('kar98k',900,{key:'band'});
  assert.ok(layer(near,'crack')[0].vol>2*layer(far,'crack')[0].vol&&layer(far,'mechanism').length===0&&layer(near,'mechanism').length>0);
});

test('footsteps: every surface sounds like itself, pace and load change the weight, and quiet is not silent',()=>{
  assert.equal(footstepSurface('ground'),'earth');assert.equal(footstepSurface('lava'),'earth');
  const sig=s=>JSON.stringify(planFootstep(s,{key:'same'}).filter(g=>g.layer!=='gear').map(g=>[g.layer,g.src,g.wave??g.noise,g.filter?.type,Math.round((g.filter?.freq??g.freq??0)/200)]));
  assert.equal(new Set(FOOTSTEP_SURFACES.map(sig)).size,FOOTSTEP_SURFACES.length);
  const energy=plan=>plan.reduce((s,g)=>s+g.vol*g.dur,0);
  for(const s of FOOTSTEP_SURFACES){
    const e=pace=>mean(Array.from({length:80},(_,i)=>energy(planFootstep(s,{key:'p'+i,pace}))));
    assert.ok(e('crouch')<e('walk')&&e('walk')<e('run'),`${s}: crouch < walk < run`);
    assert.ok(mean(Array.from({length:80},(_,i)=>energy(planFootstep(s,{key:'p'+i,load:1}))))>e('walk'),`${s}: carrying a man is heavier`);
    const peak=Math.max(...planFootstep(s,{key:'q'}).map(g=>g.vol));assert.ok(peak>.01&&peak<.12,`${s}: audible and well under a rifle shot (${peak})`);
  }
  // Wooden planks creak now and then, but not every step.
  let creaks=0;for(let i=0;i<400;i++)if(layer(planFootstep('wood',{key:'c'+i}),'creak').length)creaks++;assert.ok(creaks>30&&creaks<90,`${creaks}/400 creaks`);
  // Gear rattles more when running than walking.
  const gear=pace=>Array.from({length:300},(_,i)=>layer(planFootstep('earth',{key:'g'+i,pace}),'gear').length>0).filter(Boolean).length;
  assert.ok(gear('run')>gear('walk')*1.8);
});

test('player body and gun sounds are synthesised events, not fixed beeps: the bolt, the reload, the hit and the landing vary and keep their sequence',()=>{
  const bolt=planWz29Mechanism('bolt',{key:'a'}),opens=layer(bolt,'open'),locks=layer(bolt,'lock');
  assert.equal(opens.length,1);assert.equal(locks.length,1);assert.ok(opens[0].at<.2&&locks[0].at>.8&&locks[0].at<1.05,'open ~0.13 s, lock ~0.91 s');
  assert.ok(bolt.every(g=>g.src==='noise'||g.wave==='sine'),'metallic clicks are filtered noise plus a sine knock: no square-wave beeps');
  assert.equal(layer(planWz29Mechanism('clip',{key:'a'}),'clip-lock')[0].at>2.3,true);assert.equal(layer(planWz29Mechanism('magazine',{key:'a'}),'mag').length>=4,true);
  const hit=planPlayerHit({key:'h'});assert.ok(layer(hit,'thump').length&&layer(hit,'slap').length&&layer(hit,'gasp').length);
  const soft=planLanding(4,'ground',{key:'l'}),hard=planLanding(13,'ground',{key:'l'}),splash=planLanding(10,'water',{key:'l'});
  assert.ok(layer(hard,'knock').length===1&&layer(soft,'knock').length===0,'a second knock only from a hard drop');
  assert.ok(layer(hard,'body')[0].vol>layer(soft,'body')[0].vol&&layer(splash,'splash').length===1&&layer(splash,'body').length===1);
  assert.ok(layer(hard,'gear').length>layer(soft,'gear').length,'more kit rattles on a hard landing');
});

test('AudioManager: footsteps, hit, landing and mechanism reach the graph with their own keys, at low priority where it matters',()=>{
  const {audio,ctx}=makeAudio();
  audio.footstep('earth',{key:'f1',side:1});audio.footstep('metal',{key:'f2',pace:'run',side:-1});audio.hit('h1');audio.landing(8,'ground','l1');audio.wz29Mechanism('bolt','b1');audio.reload('r1');
  const c=audio.diagnostics.eventCounts;
  assert.equal(c.footstep,2);assert.equal(c['player-hit'],1);assert.equal(c['player-landing'],1);assert.equal(c['wz29-mechanism'],1);
  assert.ok(ctx.sources.length>10,'grains reached the graph');
  assert.ok(audio.diagnostics.lastEvents.find(e=>e.kind==='footstep').priority<AUDIO_PRIORITY.rifle,'footsteps never evict gunfire');
  // Saturated: footsteps cannot take a voice from a rifle shot, but a rifle shot can take one from a footstep.
  const full=makeAudio().audio;full.maxVoices=3;
  for(let i=0;i<3;i++)full.footstep('earth',{key:'s'+i});
  const before=full.diagnostics.evictedVoices;full.wz29Shot(0,0,'shot');assert.ok(full.diagnostics.evictedVoices>=before,'the shot is admitted');
  assert.ok([...full.voices].some(v=>v.kind==='wz29-shot'));
  // Nothing in this path touches the global random source.
  const original=Math.random;Math.random=()=>{throw new Error('Math.random in audio');};
  try{audio.footstep('stone',{key:'f3'});audio.hit('h2');}finally{Math.random=original;}
  audio.dispose();full.dispose();
});

test('node pooling: gains, filters and panners are reused (no per-shot allocation growth), reset cleanly, and the created/disposed audit balances',()=>{
  const {audio,ctx}=makeAudio();
  const perShot=[],sources=[];
  for(let i=0;i<60;i++){const before=audio.nodesCreated,src=ctx.sources.length;audio.weaponFire('kar98k',.2,40,{key:'p'+i});audio.impact('wood',0,6,'i'+i);ctx.flush();ctx.currentTime+=1;perShot.push(audio.nodesCreated-before);sources.push(ctx.sources.length-src);}
  const first=mean(perShot.slice(0,5)),steady=mean(perShot.slice(-20)),steadySources=mean(sources.slice(-20));
  // Before pooling every grain also built an envelope gain and a filter, and every voice four more nodes: ~3 nodes per source.
  assert.ok(first>steadySources*1.3,`warm-up builds the pool (${first.toFixed(1)} new nodes for ${steadySources.toFixed(1)} sources)`);
  assert.ok(steady<=steadySources+1.5,`steady state creates only the single-use sources (${steady.toFixed(1)} new nodes for ${steadySources.toFixed(1)} sources)`);
  const d=audio.diagnostics.nodePool;assert.ok(d.hits>d.misses,`pool hits ${d.hits} > misses ${d.misses}`);
  assert.ok(d.idle.gain<=160&&d.idle.biquad<=160&&d.idle.pan<=64,'the pool is bounded');
  // A reused node starts clean: no stale automation target (the _param cache) and the voice values of the new owner.
  audio.weaponFire('ally_rifle',-.6,25,{key:'clean'});const voice=[...audio.voices].at(-1);
  assert.equal(voice.panner.pan.value,-.6);assert.equal(voice.panner.pan._target,undefined);assert.ok(voice.gain.gain.events.some(e=>e[0]==='cancel'),'automation of the previous owner was cancelled');
  ctx.flush();audio.dispose();
  assert.equal(audio.diagnostics.nodesCreated,audio.diagnostics.nodesDisposed,'everything created is disposed, pooled nodes included');
  assert.deepEqual(ctx.nodes.filter(n=>n!==ctx.destination&&!n.disconnected).map(n=>n.type),[],'every node is disconnected after dispose');
  assert.deepEqual(audio.diagnostics.nodePool.idle,{gain:0,biquad:0,pan:0});
});

// ------------------------------------------------------------------------------------------------ director
function fakeDirector(){
  const steps=[],audio={ctx:{},disposed:false,footstep:(surface,o)=>steps.push({surface,...o}),core:{surface:{material:'earth'}},setLayout(){},setDirectorProbe(){},setEmitters(){}};
  const director=new M01AudioDirector(audio);return {director,steps,audio};
}
const sim=(x,z,extra={})=>({player:{x,y:0,z,angle:0,crouched:false,sprinting:false,carrying:null,...extra},clock:0});
test('director footsteps follow the distance walked: none standing, stride by stance, none in the air, none across a teleport',()=>{
  const {director,steps}=fakeDirector();
  director._footsteps(sim(0,0));for(let i=0;i<100;i++)director._footsteps(sim(0,0));assert.equal(steps.length,0,'standing still is silent');
  for(let i=1;i<=100;i++)director._footsteps(sim(i*.05,0));   // 5 m of walking
  assert.ok(steps.length>=6&&steps.length<=7,`5 m walking: ${steps.length} steps (stride 0.78 m)`);
  const walk=steps.length;steps.length=0;
  for(let i=1;i<=100;i++)director._footsteps(sim(5+i*.05,0,{sprinting:true}));assert.ok(steps.length<walk&&steps.length>=4&&steps.length<=5,`sprint 5 m: ${steps.length} (longer stride)`);
  assert.ok(steps.every(s=>s.pace==='run'));steps.length=0;
  for(let i=1;i<=100;i++)director._footsteps(sim(10+i*.05,0,{crouched:true}));assert.ok(steps.length>=8&&steps.length<=10&&steps.every(s=>s.pace==='crouch'));steps.length=0;
  for(let i=1;i<=100;i++)director._footsteps(sim(15+i*.05,0,{fall:{vy:-3}}));assert.equal(steps.length,0,'airborne: no steps');
  director._footsteps(sim(500,500));for(let i=0;i<5;i++)director._footsteps(sim(500,500));assert.equal(steps.length,0,'a restore/teleport is not a step');
  for(let i=1;i<=40;i++)director._footsteps(sim(500+i*.05,500,{carrying:'jozef_bak'}));assert.ok(steps.length>=3&&steps.every(s=>s.load===1),'carrying a man: shorter, heavier steps');
  // Alternating feet and distinct keys.
  const {director:d2,steps:s2}=fakeDirector();d2._footsteps(sim(0,0));for(let i=1;i<=60;i++)d2._footsteps(sim(i*.05,0));
  assert.ok(s2.every((s,i)=>i===0||s.side===-s2[i-1].side)&&new Set(s2.map(s=>s.key)).size===s2.length);
  // A restore resets the baseline (no phantom step from the old position).
  d2.step.ready=false;s2.length=0;d2._footsteps(sim(400,0));assert.equal(s2.length,0);
});
test('director display fire is not a metronome: burst lengths span 2-9, double taps occur, jitter is requested, the pool bounds the work',()=>{
  const calls=[],audio={ctx:{},disposed:false,core:{layout:{},zone:{}},weaponFire:(...a)=>calls.push(a),setOcclusion(){},setLayout(){},setDirectorProbe(){},setEmitters(){}};
  const d=new M01AudioDirector(audio),e={id:'ae_test_mg',weapon:'mg34',x:300,y:0,z:0,sector:'s'},player={x:0,y:0,z:0,angle:0};
  const rounds=new Set();let scheduled=0,doubles=0,maxPending=0;
  for(let slot=0;slot<900;slot++){
    d.pending.forEach(p=>{p.used=false;});d._schedule(e,slot,slot*1.5,player);
    const used=d.pending.filter(p=>p.used);maxPending=Math.max(maxPending,used.length);if(used.length)scheduled++;if(used.length===2)doubles++;used.forEach(p=>rounds.add(p.rounds));
  }
  assert.ok(Math.min(...rounds)===2&&Math.max(...rounds)===9,`round counts ${[...rounds].sort()}`);
  assert.ok(doubles>20&&doubles<scheduled*.35,`${doubles} double taps in ${scheduled} bursts`);
  assert.ok(maxPending<=2,'a slot never queues more than a burst and its double tap');
  assert.ok(scheduled>900*.35&&scheduled<900*.85,`mean density kept (${scheduled}/900)`);
  // Pressure clusters the fire: some 6-slot windows are far busier than others.
  const hits=Array.from({length:900},(_,slot)=>{d.pending.forEach(p=>{p.used=false;});d._schedule(e,slot,slot*1.5,player);return d.pending.some(p=>p.used)?1:0;});
  const windows=[];for(let i=0;i+6<=hits.length;i+=6)windows.push(hits.slice(i,i+6).reduce((s,x)=>s+x,0));
  assert.ok(Math.max(...windows)-Math.min(...windows)>=5,`busiest vs quietest 9 s window: ${Math.max(...windows)} vs ${Math.min(...windows)} bursts of 6`);
  d.pending.forEach(p=>{p.used=false;p.emitter=null;});d.pending[0]=Object.assign(d.pending[0],{used:true,at:0,emitter:{...e,sector:'s',id:'x'},pan:0,distance:300,front:1,rounds:4,key:'k'});
  d._play(d.pending[0].emitter,d.pending[0]);assert.equal(calls.at(-1)[3].cadenceJitter,.06,'display fire asks for cadence jitter');
});
