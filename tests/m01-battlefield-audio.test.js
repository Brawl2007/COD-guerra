import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager,AUDIO_LIMITS} from '../src/core/audio.js';
import {
  WEAPON_SOUND_PROFILES,CATEGORY_LIMITS,AUDIO_PRIORITY,DISTANT_SLOT_SEC,M01_AUDIO_EMITTERS,PHASE_ACTIVITY,SPEED_OF_SOUND,
  acousticShape,acousticBand,soundDelay,planWeaponShot,planWeaponBurst,planBulletPass,planImpact,planExplosion,planDebris,
  planBridgeDemolition,planDistantArtillery,planDistantBattleSlot,JU87_ENGINE_HZ,planFireCrackle,planLocomotiveIdleTick,planJu87PullOut,
  aircraftLayerMix,dopplerFactor,BattleIntensity,intensityWeight,m01FireEmitters,presentationNoise,weaponProfileId,
} from '../src/core/battlefield-audio.js';
import {m01StukaPosition,m01RaidPlanePosition} from '../src/world/m01-aircraft-path.js';
import {LOCOMOTIVE_PLACEMENT} from '../src/render/m01-locomotive.js';
import {PANZERZUG_PLACEMENT} from '../src/render/m01-panzerzug.js';
import {M01_YARD_WAGON_PLAN} from '../src/render/m01-yard-wagons.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';
import {route} from './helpers/m01-route.js';

const makeAudio=(maxVoices=32,options={})=>{const ctx=new FakeAudioContext(options),audio=new AudioManager({contextFactory:()=>ctx,maxVoices});assert.equal(audio.init(),true);return {audio,ctx};};
const spatial=point=>{const dx=point.x,dz=point.z,a=Math.atan2(dz,dx);return {distance:Math.hypot(dx,dz),pan:Math.sin(a),front:Math.cos(a),dy:(point.y??0)-0};};
const layers=(grains,name)=>grains.filter(g=>g.layer===name);
const WEAPONS=Object.keys(WEAPON_SOUND_PROFILES);

test('every weapon has its own synthesized identity (spectral and mechanical signature)',()=>{
  assert.deepEqual(WEAPONS.sort(),['ally_rifle','ckm_wz30','kar98k','kb_wz29','mg34','rkm_wz28']);
  const signature=id=>{const g=planWeaponShot(id,20,{key:'identity'}),p=WEAPON_SOUND_PROFILES[id];
    return JSON.stringify([p.crack.hz,p.crack.type,p.body.wave,p.body.hz,p.blast.hz,p.mech.map(m=>m.hz),p.cadence,layers(g,'crack')[0].filter.type]);};
  const signatures=WEAPONS.map(signature);assert.equal(new Set(signatures).size,WEAPONS.length,'no two weapons share a signature');
  // MG34: corpo mais agudo e cadência rápida; ckm wz.30: o mais grave e pesado; rkm wz.28 no meio.
  const P=WEAPON_SOUND_PROFILES;
  assert.ok(P.mg34.body.hz>P.rkm_wz28.body.hz&&P.rkm_wz28.body.hz>P.ckm_wz30.body.hz);
  assert.ok(P.mg34.crack.hz>P.rkm_wz28.crack.hz&&P.rkm_wz28.crack.hz>P.ckm_wz30.crack.hz);
  assert.ok(P.mg34.cadence<P.ckm_wz30.cadence&&P.ckm_wz30.cadence<P.rkm_wz28.cadence);
  for(const id of WEAPONS)assert.equal(weaponProfileId(id),id,'canonical ids resolve to themselves');assert.equal(weaponProfileId('ally-rifle'),'ally_rifle');assert.equal(weaponProfileId('ckm'),'ckm_wz30');assert.equal(weaponProfileId('unknown'),'kar98k');
  // O wz.29 do jogador conserva as camadas e tempos estabelecidos.
  const wz=planWeaponShot('kb_wz29',0,{key:'x'});
  assert.equal(layers(wz,'crack')[0].dur,.26);assert.equal(layers(wz,'tail')[0].at,.15);assert.equal(layers(wz,'body')[0].dur,.24);
});

test('near/mid/far/very-distant shots change layers continuously: mechanism only near, more echoes and longer tail far',()=>{
  const at=d=>planWeaponShot('kar98k',d,{key:'band'});
  const near=at(10),mid=at(150),far=at(600),vfar=at(1400);
  assert.deepEqual([10,150,600,1400].map(acousticBand),['close','mid','distant','very-distant']);
  assert.ok(layers(near,'mechanism').length>0);assert.equal(layers(far,'mechanism').length,0);
  assert.ok(layers(near,'echo').length<layers(mid,'echo').length&&layers(mid,'echo').length<=layers(far,'echo').length);
  const tail=g=>layers(g,'tail')[0].dur,crack=g=>layers(g,'crack')[0].vol;
  assert.ok(tail(near)<tail(mid)&&tail(mid)<tail(far)&&tail(far)<tail(vfar));
  assert.ok(crack(near)>crack(mid)&&crack(mid)>crack(far)&&crack(far)>crack(vfar));
  const echoes=g=>layers(g,'echo').map(e=>e.at);assert.ok(Math.max(...echoes(far))>Math.max(...echoes(near)),'far reflections arrive later');
  // Atenuação, absorção do ar e envio para a reverberação são contínuos e monótonos.
  let prev=null;for(const d of [0,5,20,45,46,100,220,221,500,950,951,2000]){const s=acousticShape(d);
    if(prev){assert.ok(s.gain<=prev.gain);assert.ok(s.filter<=prev.filter);assert.ok(s.send>=prev.send);}prev=s;}
  const front=acousticShape(80,{front:1}),behind=acousticShape(80,{front:-1});assert.ok(behind.filter<front.filter&&behind.gain<front.gain);
  assert.ok(Math.abs(soundDelay(SPEED_OF_SOUND)-1)<1e-12);assert.ok(Math.abs(soundDelay(1000)-2.915)<.001);
});

test('bursts keep the authoritative cadence in one voice; later rounds have shorter tails',()=>{
  const g=planWeaponBurst('mg34',60,{rounds:7,interval:.075,key:'burst'}),cracks=layers(g,'crack');
  assert.equal(cracks.length,7);cracks.forEach((c,i)=>assert.ok(Math.abs(c.at-i*.075)<1e-12));
  const tails=layers(g,'tail');assert.ok(tails[1].vol<tails[0].vol);
  const ckm=layers(planWeaponBurst('ckm_wz30',60,{rounds:4,key:'c'}),'crack');assert.ok(Math.abs(ckm[1].at-.1)<1e-12,'ckm default cadence');
  const {audio,ctx}=makeAudio();const before=audio.voices.size;audio.mg34Burst(0,60,7,.075,'one-voice');assert.equal(audio.voices.size,before+1);
  ctx.flush();assert.equal(audio.voices.size,0);audio.dispose();
});

test('bullet crack vs whizz, material impacts and ricochets are distinct and deterministic',()=>{
  const crack=planBulletPass('crack',{key:'a'}),whizz=planBulletPass('whizz',{key:'a'});
  assert.ok(Math.max(...crack.map(g=>g.at+g.dur))<.1,'supersonic crack is a short N-wave');
  assert.ok(Math.max(...whizz.map(g=>g.at+g.dur))>.15);assert.equal(layers(whizz,'whizz')[0].filter.type,'bandpass');
  const sig=m=>JSON.stringify(planImpact(m,10,{key:'same'}).filter(g=>!g.layer.startsWith('ricochet')).map(g=>[g.layer,g.src,g.wave??g.noise,g.filter?.type]));
  const mats=['earth','wood','metal','stone','brick','water'];assert.equal(new Set(mats.map(sig)).size,mats.length);
  assert.deepEqual(planImpact('metal',10,{key:'k1'}),planImpact('metal',10,{key:'k1'}));
  let ric=0;for(let i=0;i<200;i++)if(planImpact('metal',10,{key:'m'+i}).some(g=>g.layer==='ricochet'))ric++;
  assert.ok(ric>40&&ric<120,`metal ricochets are occasional (${ric}/200)`);
  for(let i=0;i<50;i++)assert.ok(!planImpact('earth',10,{key:'e'+i}).some(g=>g.layer==='ricochet'));
  assert.ok(planImpact('earth',5,{key:'n'}).length>planImpact('earth',60,{key:'n'}).length,'spray only near');
  const {audio}=makeAudio();assert.equal(audio.impact('character',0,5,'c'),false);audio.dispose();
});

test('explosions scale from grenade to bridge demolition with debris, metal stress, splash and rumble',()=>{
  const small=planExplosion('small',20,{key:'g'}),large=planExplosion('large',20,{key:'b'}),demo=planBridgeDemolition(200,{key:'east_demolition'});
  const sub=g=>layers(g,'sub')[0];assert.ok(sub(small).freq>sub(large).freq);assert.ok(layers(large,'tail')[0].dur>layers(small,'tail')[0].dur);
  assert.ok(layers(demo,'transient').length>=4,'chain of charges');
  for(const name of ['groan','shriek','girder','splash','spray','rumble'])assert.ok(layers(demo,name).length>0,name);
  assert.ok(Math.max(...demo.map(g=>g.at+g.dur))>6,'long rolling aftermath');
  assert.ok(planDebris('large',30,{key:'d'}).length>planDebris('small',30,{key:'d'}).length);
  assert.equal(planDebris('large',800,{key:'d'}).length,0,'debris is inaudible far away');
  assert.ok(planDebris('large',30,{key:'d',detail:'low'}).length<planDebris('large',30,{key:'d',detail:'high'}).length);
  const art=planDistantArtillery(1500,{key:'a',salvo:3});assert.equal(layers(art,'boom').length,3);
  const {audio}=makeAudio(32);
  audio.explosion(0,30,{scale:'large',key:'near-bomb'});
  assert.ok(audio.lastDuck&&audio.lastDuck.concussion>0,'near blast ducks and muffles the mix');
  assert.equal(audio.buses.distant.gain.events.filter(e=>e[0]==='target').length,2,'distant bus ducks then recovers');
  audio.explosion(0,30,{scale:'demolition',key:'east_demolition'});
  const e=audio.diagnostics.eventCounts;assert.equal(e['bridge-demolition'],1);assert.equal(e['metal-stress'],1);assert.ok(e.debris>=2);
  audio.lastDuck=null;audio.explosion(0,1200,{scale:'large',key:'far-bomb'});assert.equal(audio.lastDuck,null,'far blasts do not duck');
  audio.dispose();
});

test('category limits and the global hard limit hold under a saturated battle',()=>{
  const {audio}=makeAudio(AUDIO_LIMITS.maxVoices);
  for(let i=0;i<40;i++)audio.impact(['earth','stone','metal','wood'][i%4],0,8,'flood-'+i);
  assert.ok(audio.diagnostics.categories.impact<=CATEGORY_LIMITS.impact);assert.ok(audio.diagnostics.categoryDropped.impact===undefined,'same-priority impacts replace the oldest');
  for(let i=0;i<30;i++)audio.weaponFire(i%2?'mg34':'kar98k',0,300,{rounds:i%2?5:1,key:'w'+i});
  for(let i=0;i<20;i++)audio.distantBattle(['rifle','mg','artillery'][i%3],0,900,'d'+i,{rounds:3,salvo:2});
  for(let i=0;i<10;i++)audio.explosion(0,150,{scale:'large',key:'x'+i});
  for(let i=0;i<10;i++)audio.crack(0,2,'c'+i);
  const d=audio.diagnostics;
  for(const [category,count] of Object.entries(d.categories))assert.ok(count<=CATEGORY_LIMITS[category],category);
  assert.ok(d.activeVoices<=AUDIO_LIMITS.maxVoices);assert.ok(d.peakVoices<=AUDIO_LIMITS.maxVoices);
  assert.ok([...audio.voices].some(v=>v.category==='danger'),'near-miss danger survives saturation');
  assert.ok([...audio.voices].some(v=>v.category==='explosion'));
  audio.dispose();
});

test('dynamic intensity rises with heard combat, decays on the simulation clock and drives the distant scheduler',()=>{
  const i=new BattleIntensity(7);assert.equal(i.level(0),0);
  for(let k=0;k<10;k++)i.add(1,intensityWeight('rifle',20));const hot=i.level(1);assert.ok(hot>.3);
  assert.ok(i.level(8)<hot&&i.level(30)<.05);assert.ok(intensityWeight('explosion',30)>intensityWeight('explosion',900));
  const count=(phase,intensity)=>Array.from({length:4000},(_,s)=>planDistantBattleSlot(s,{phase,intensity})).filter(Boolean).length;
  assert.ok(count('OUTRO',0)<count('MAIN_COMBAT',0)&&count('MAIN_COMBAT',0)<count('MAIN_COMBAT',1));
  assert.ok(PHASE_ACTIVITY.CLIMAX>PHASE_ACTIVITY.SETUP);
  const {audio}=makeAudio();const state={stukas:false,secondRaid:false,train963:false};
  audio.resetPresentation(0,state);audio.updateM01Presentation({clock:.1,state,spatial,phase:'MAIN_COMBAT'});
  const calm=audio.loops.get('battle-bed').volume;
  for(let k=0;k<8;k++)audio.explosion(0,200,{scale:'large',key:'heat'+k});
  audio.updateM01Presentation({clock:.2,state,spatial,phase:'MAIN_COMBAT'});
  assert.ok(audio.diagnostics.intensity>.5);assert.ok(audio.loops.get('battle-bed').volume>calm,'front bed swells with intensity');
  audio.dispose();
});

test('distant battle is deterministic, aperiodic and never repeats the same sector+kind back to back',()=>{
  const events=Array.from({length:3000},(_,s)=>planDistantBattleSlot(s,{phase:'CLIMAX',intensity:.5}));
  assert.deepEqual(events,Array.from({length:3000},(_,s)=>planDistantBattleSlot(s,{phase:'CLIMAX',intensity:.5})));
  for(let s=1;s<events.length;s++)if(events[s]&&events[s-1])assert.ok(!(events[s].kind===events[s-1].kind&&events[s].sector===events[s-1].sector),'slot '+s);
  const pattern=events.map(e=>e?`${e.kind}:${e.sector}`:'-');
  for(let period=1;period<=120;period++){let same=0;for(let s=period;s<pattern.length;s++)if(pattern[s]===pattern[s-period])same++;
    assert.ok(same/(pattern.length-period)<.7,`no audible loop with period ${period}`);}
  const kinds=new Set(events.filter(Boolean).map(e=>e.kind)),sectors=new Set(events.filter(Boolean).map(e=>e.sector));
  assert.deepEqual([...kinds].sort(),['artillery','mg','rifle']);assert.ok(sectors.size>=4);
  // Ruído de modulação suave e não periódico, no intervalo 0..1.
  const n=Array.from({length:500},(_,k)=>presentationNoise('wind',k*.37));assert.ok(n.every(x=>x>=0&&x<=1));assert.ok(new Set(n.map(x=>x.toFixed(3))).size>300);
});

test('Ju 87 engine layers follow the rendered aircraft path; pull-out siren only on request after a real aerial blast',()=>{
  for(let t=0;t<400;t+=13.7)for(let i=0;i<3;i++){const p=m01StukaPosition(t,i);
    assert.deepEqual(p,{x:80+Math.sin(t*.02+i)*250,y:160+i*20,z:240-t%90*4+i*30});}
  assert.deepEqual(m01RaidPlanePosition(10),{x:-700,y:1100,z:720});
  const near=aircraftLayerMix(120),far=aircraftLayerMix(2500);assert.ok(near.rasp>far.rasp&&near.prop>far.prop&&far.rumble>near.rumble);
  assert.ok(dopplerFactor(-10,1)>1&&dopplerFactor(10,1)<1);assert.equal(dopplerFactor(5,0),1);
  assert.ok(layers(planJu87PullOut({key:'a'}),'siren').every(g=>g.freqEnd<g.freq),'siren falls as the plane pulls away');
  const {audio}=makeAudio();const state={stukas:true,secondRaid:true,train963:false};
  audio.resetPresentation(10,state);audio.updateM01Presentation({clock:10,state,spatial});audio.updateM01Presentation({clock:10.2,state,spatial});
  assert.ok(audio.diagnostics.loops.includes('aircraft')&&audio.diagnostics.loops.includes('aircraft-high'));
  assert.equal(audio.diagnostics.eventCounts['ju87-pullout'],undefined,'no siren without an aerial blast');
  const engine=audio.loops.get('aircraft');assert.equal(engine.layers.size,5);
  audio.updateM01Presentation({clock:10.4,state:{...state,stukas:false,secondRaid:false},spatial});
  assert.ok(!audio.diagnostics.loops.includes('aircraft')&&!audio.diagnostics.loops.includes('aircraft-high'));
  audio.ju87PullOut(0,300,'bomb');assert.equal(audio.diagnostics.eventCounts['ju87-pullout'],1);audio.dispose();
});

test('trains: emitters match rendered placements; arrivals play once per live transition; idle ticks vary',()=>{
  const [lx,,lz]=LOCOMOTIVE_PLACEMENT.position,[px,,pz]=PANZERZUG_PLACEMENT.position,yard=M01_YARD_WAGON_PLAN.find(w=>w.damageKey==='station_wagon_fire');
  assert.deepEqual([M01_AUDIO_EMITTERS.locomotive.x,M01_AUDIO_EMITTERS.locomotive.z],[lx,lz]);
  assert.deepEqual([M01_AUDIO_EMITTERS.panzerzug.x,M01_AUDIO_EMITTERS.panzerzug.z],[px,pz]);
  assert.deepEqual([M01_AUDIO_EMITTERS.yardWagonFire.x,M01_AUDIO_EMITTERS.yardWagonFire.z],[yard.position[0],yard.position[2]]);
  const ticks=Array.from({length:200},(_,s)=>planLocomotiveIdleTick(s));
  assert.ok(ticks.filter(t=>t.some(g=>g.layer==='pump')).length>80);assert.ok(ticks.some(t=>t.some(g=>g.layer==='groan')));assert.ok(ticks.some(t=>!t.length));
  const {audio}=makeAudio(32);const base={stukas:false,secondRaid:false,train963:false,panzerzug:false};
  audio.resetPresentation(100,base);audio.updateM01Presentation({clock:100,state:base,spatial});
  audio.updateM01Presentation({clock:100.1,state:{...base,train963:true},spatial});
  audio.updateM01Presentation({clock:100.2,state:{...base,train963:true,panzerzug:true},spatial});
  audio.updateM01Presentation({clock:100.3,state:{...base,train963:true,panzerzug:true},spatial});
  const e=audio.diagnostics.eventCounts;assert.equal(e['train-arrival'],1);assert.equal(e['panzerzug-arrival'],1);
  assert.ok(audio.diagnostics.loops.includes('locomotive')&&audio.diagnostics.loops.includes('panzerzug'));
  for(let k=1;k<=20;k++)audio.updateM01Presentation({clock:100.3+k*1.5,state:{...base,train963:true,panzerzug:true},spatial});
  assert.ok(audio.diagnostics.eventCounts.locomotive>10);
  audio.resetPresentation(131,{...base,train963:true,panzerzug:true});audio.updateM01Presentation({clock:131,state:{...base,train963:true,panzerzug:true},spatial});
  assert.equal(audio.diagnostics.eventCounts['panzerzug-arrival'],1,'restore after arrival never replays it');audio.dispose();
});

test('fires: emitters come from presentation state; crackle only near, loop follows the nearest fire',()=>{
  const state={destruction:['station_wagon_fire'],damage:[{id:'station_bomb',x:-300,y:0,z:-40,started:0},{id:'raid_0530',x:-600,y:0,z:100,started:290},
    {id:'m01_grenade_0',x:0,y:0,z:0,started:299}],stukas:false,secondRaid:false,train963:false};
  const fires=m01FireEmitters(state,300);assert.deepEqual(fires.map(f=>f.id).sort(),['raid_0530','station_bomb','station_wagon_fire']);
  assert.equal(m01FireEmitters({...state,damage:[{id:'raid_0530',x:0,y:0,z:0,started:0}],destruction:[]},400).length,0,'old smoulders go quiet');
  const crackles=Array.from({length:400},(_,s)=>planFireCrackle(s,{key:'f',size:1})).filter(g=>g.length).length;assert.ok(crackles>60&&crackles<300);
  const near=point=>spatial({x:point.x+352,y:0,z:point.z-8}),{audio}=makeAudio();
  audio.resetPresentation(300,state);for(let k=0;k<30;k++)audio.updateM01Presentation({clock:300+k*.1,state,spatial:near});
  assert.ok(audio.diagnostics.loops.includes('fire'));assert.ok(audio.diagnostics.eventCounts['fire-crackle']>0);
  const far=point=>spatial({x:point.x+5000,y:0,z:point.z});audio.resetPresentation(400,state);
  for(let k=0;k<30;k++)audio.updateM01Presentation({clock:400+k*.1,state,spatial:far});
  assert.ok(!audio.diagnostics.loops.includes('fire'));audio.dispose();
});

test('graph: buses, compressor and outdoor reverb exist; voices send to reverb; everything created is disposed',async()=>{
  const {audio,ctx}=makeAudio();const d=audio.diagnostics;
  assert.equal(d.reverb,true);assert.equal(d.compressor,true);assert.deepEqual(d.buses,['weapons','player','impacts','explosions','distant','vehicles','ambience']);
  audio.weaponFire('kar98k',0,600,{key:'reverb'});const voice=[...audio.voices].at(-1);assert.ok(voice.send&&voice.send.connections.includes(audio.reverb));
  assert.ok(voice.send.gain.value>acousticShape(5).send,'far shot is wetter than a near one');
  audio.updateM01Presentation({clock:1,state:{stukas:true,secondRaid:true,train963:true,panzerzug:true,destruction:['station_wagon_fire'],damage:[]},spatial});
  audio.explosion(0,20,{scale:'demolition',key:'demo'});audio.impact('metal',0,5,'m');audio.crack(0,2,'c');ctx.flush();
  audio.dispose();await Promise.resolve();
  assert.equal(audio.diagnostics.activeVoices,0);assert.equal(audio.diagnostics.nodesCreated,audio.diagnostics.nodesDisposed,'no leaked nodes');
  // Sem ConvolverNode/compressor o áudio continua a funcionar (degradação graciosa).
  const bare=makeAudio(32,{convolver:false,compressor:false}).audio;bare.rifleShot(0,100,'kar98k','bare');
  assert.equal(bare.diagnostics.reverb,false);assert.equal(bare.diagnostics.eventCounts.rifle,1);bare.dispose();
});

test('full presentation pass over the complete real M01 route never changes simulation state or RNG',()=>{
  const heard={audio:null,counts:{}};
  const onStep=({sim,events})=>{
    const audio=heard.audio??=makeAudio().audio;
    const look=p=>{const dx=p.x-sim.player.x,dz=p.z-sim.player.z,a=Math.atan2(dz,dx)-sim.player.angle;return {distance:Math.hypot(dx,dz),pan:Math.sin(a),front:Math.cos(a),dy:(p.y??0)-sim.player.y};};
    for(const e of events){
      heard.counts[e.type]=(heard.counts[e.type]??0)+1;
      if(e.type==='enemy-fire'){const s=look(e.origin),source=`${e.weapon}@${Math.round(e.origin.x)},${Math.round(e.origin.z)}`;audio.weaponFire(e.weapon,s.pan,s.distance,{rounds:e.rounds,interval:e.interval,key:`${source}:${e.at}`,front:s.front,source});}
      if(e.type==='npc-shot'){const s=look(e.point);if(e.rounds>1)audio.rkmBurst(s.pan,s.distance,e.rounds,.11,'k'+sim.clock);else audio.rifleShot(s.pan,s.distance,'ally-rifle','a'+sim.clock);}
      if(e.type==='round-impact'){const s=look(e.point);if(e.crack)audio.crack(s.pan,e.distance,'c'+sim.clock);if(e.distance<120)audio.impact(e.material,s.pan,e.distance,'i'+sim.clock);}
      // Mesma escolha de escala que Game (pelo id do dano da simulação) e mesma condição do Ju 87.
      if(e.type==='m01-blast'){const s=look(e.point),damage=[...sim.sectors.damage].reverse().find(d=>d.soundAt===e.soundAt&&d.x===e.point.x&&d.z===e.point.z);
        const scale=damage?.id?.startsWith('m01_grenade_')?'small':damage?.id?.includes('demolition')?'demolition':'large';
        audio.explosion(s.pan,s.distance,{scale,key:damage?.id??'b'+sim.clock});if(e.aerial)audio.ju87PullOutNearest(sim.clock,look,'j'+sim.clock,sim.renderState.stukas);}
      if(e.type==='player-shot'){audio.wz29Shot();audio.wz29Mechanism('bolt');}
    }
    audio.updateM01Presentation({clock:sim.clock,state:sim.renderState,spatial:look,phase:sim.mission.phase});
  };
  const silent=route(19390901,{support:true}),played=route(19390901,{support:true,onStep});
  for(const type of ['enemy-fire','round-impact','m01-blast','player-shot'])assert.ok(heard.counts[type]>0,type);
  const d=heard.audio.diagnostics;
  for(const kind of ['mg34','rifle','impact','explosion','bridge-demolition','distant-battle','train-arrival','locomotive','ju87-pullout'])assert.ok(d.eventCounts[kind]>0,kind);
  assert.equal(d.eventCounts['bridge-demolition'],2,'east and west demolitions, each heard once');
  assert.ok(d.peakVoices<=AUDIO_LIMITS.maxVoices);
  assert.equal(played.sim.rng.state,silent.sim.rng.state);assert.deepEqual(played.sim.snapshot(false),silent.sim.snapshot(false));
  assert.deepEqual(played.events,silent.events);
  heard.audio.dispose();
});

test('presentation clock jumps (pause, restore, slow frames) never backlog scheduled one-shots',()=>{
  const {audio}=makeAudio(32),state={stukas:false,secondRaid:false,train963:true,destruction:['station_wagon_fire'],damage:[]};
  const near=point=>spatial({x:point.x+352,y:0,z:point.z-8});
  audio.resetPresentation(0,state);audio.updateM01Presentation({clock:0,state,spatial:near});
  const before={...audio.diagnostics.eventCounts};audio.updateM01Presentation({clock:600,state,spatial:near});
  const after=audio.diagnostics.eventCounts,delta=k=>(after[k]??0)-(before[k]??0);
  assert.ok(delta('distant-battle')<=1);assert.ok(delta('fire-crackle')<=2);assert.ok(delta('locomotive')<=1);
  assert.equal(audio.presentation.lastBattleSlot,Math.floor(600/DISTANT_SLOT_SEC));audio.dispose();
});

test('real MG34 event shape: one-round events from the same gun join one burst voice with burst tails',()=>{
  const {audio,ctx}=makeAudio();const fire=(source,i)=>audio.weaponFire('mg34',0,300,{rounds:1,interval:.075,key:`${source}:${i}`,source});
  for(let i=0;i<7;i++){ctx.currentTime=i*.075;fire('mg34@140,-60',i);}
  assert.equal(audio.voices.size,1,'seven per-round events, one burst voice');assert.equal(audio.bursts.get('mg34@140,-60').round,6);
  assert.equal(audio.diagnostics.eventCounts.mg34,7,'every authoritative round is still counted');
  const tails=[...audio.voices][0].sources.size;ctx.currentTime=.6;fire('mg34@160,-40',0);assert.equal(audio.voices.size,2,'another gunner has its own voice');
  ctx.currentTime=2;fire('mg34@140,-60',7);assert.equal(audio.bursts.get('mg34@140,-60').round,0,'a pause starts a new burst');
  assert.ok(tails<7*planWeaponShot('mg34',300,{key:'x'}).length,'later rounds drop an echo');
  const later=planWeaponShot('mg34',300,{key:'x',round:3}),first=planWeaponShot('mg34',300,{key:'x'});
  assert.ok(layers(later,'tail')[0].vol<layers(first,'tail')[0].vol);audio.dispose();
});

test('early releases fade instead of cutting; fading voices leave the budget at once and still dispose cleanly',async()=>{
  const {audio,ctx}=makeAudio(2);audio.weaponFire('kar98k',0,20,{key:'a'});audio.weaponFire('kar98k',0,20,{key:'b'});
  const first=[...audio.voices][0];audio.crack(0,2,'evicts');
  assert.ok(!audio.voices.has(first)&&audio.fading.has(first));assert.ok(audio.diagnostics.evictedVoices>=1);
  assert.ok(first.gain.gain.events.some(e=>e[0]==='target'&&e[1]===0),'gain ramps to silence');
  assert.ok([...first.sources.keys()].every(s=>s.stopAt>0&&s.stopAt<=.1),'sources stop just after the ramp');
  ctx.flush();assert.equal(audio.fading.size,0);assert.ok(first.disconnected);
  audio.dispose();await Promise.resolve();assert.equal(audio.diagnostics.nodesCreated,audio.diagnostics.nodesDisposed);
});

test('overlapping ducks keep the deepest cut and the latest release; a near-miss cannot cancel a blast duck',()=>{
  const {audio}=makeAudio();audio.explosion(0,10,{scale:'large',key:'near'});const blast={...audio.lastDuck};
  audio.crack(0,2,'after');assert.equal(audio.lastDuck.amount,blast.amount);assert.equal(audio.lastDuck.concussion,blast.concussion);
  assert.ok(audio.concussion.frequency.events.every(e=>e[0]!=='set'),'no hard step on the concussion filter');audio.dispose();
});

test('Ju 87 pull-out comes from the nearest rendered Stuka and only while the formation is shown',()=>{
  const {audio}=makeAudio();assert.equal(audio.ju87PullOutNearest(30,spatial,'none',false),null);
  audio.ju87PullOutNearest(30,spatial,'yes',true);const e=audio.history.at(-1);
  const nearest=Math.min(...[0,1,2].map(i=>{const p=m01StukaPosition(30,i);return Math.hypot(p.x,p.z,p.y);}));
  assert.equal(e.kind,'ju87-pullout');assert.ok(Math.abs(e.distance-nearest)<.01);audio.dispose();
});

test('Stuka path wrap is not heard as a Doppler dip; INTRO/SETUP stay quiet; fire loop has hysteresis',()=>{
  const {audio}=makeAudio(),state={stukas:true,secondRaid:false,train963:false};audio.resetPresentation(89.9,state);
  for(const c of [89.9,89.95,90.0,90.05])audio.updateM01Presentation({clock:c,state,spatial});
  const engine=audio.loops.get('aircraft').layers.get('engine');assert.ok(Math.abs(engine.source.frequency.value/JU87_ENGINE_HZ-1)<.02);audio.dispose();
  const count=phase=>Array.from({length:4000},(_,s)=>planDistantBattleSlot(s,{phase})).filter(Boolean).length;
  assert.ok(count('INTRO')<count('BUILDUP')/3&&count('SETUP')<count('BUILDUP')/3);assert.ok(count('UNKNOWN')<count('MAIN_COMBAT'));
  const fire={destruction:['station_wagon_fire'],damage:[],stukas:false},at=d=>p=>spatial({x:p.x+352+d,y:0,z:p.z-8});
  const a=makeAudio().audio;a.resetPresentation(0,fire);a.updateM01Presentation({clock:0,state:fire,spatial:at(210)});assert.ok(!a.loops.has('fire'),'starts only inside 200 m');
  a.updateM01Presentation({clock:.1,state:fire,spatial:at(150)});assert.ok(a.loops.has('fire'));
  a.updateM01Presentation({clock:.2,state:fire,spatial:at(230)});assert.ok(a.loops.has('fire'),'keeps burning until 240 m');
  a.updateM01Presentation({clock:.3,state:fire,spatial:at(250)});assert.ok(!a.loops.has('fire'));a.dispose();
});

test('looped brown noise has no seam; ricochets (not distance) add the whizz; budget and floor bound the graph',()=>{
  const {audio}=makeAudio(),b=audio._noiseBuffer('brown'),d=b.getChannelData(0);let step=0;for(let i=1;i<d.length;i++)step=Math.max(step,Math.abs(d[i]-d[i-1]));
  assert.ok(Math.abs(d[d.length-1]-d[0])<=step*1.5,'wrap step is no larger than a normal step');
  let whizz=0;for(let i=0;i<60;i++){audio.impact('metal',0,10,'r'+i);}whizz=audio.diagnostics.eventCounts['bullet-whizz']??0;
  assert.equal(whizz,audio.diagnostics.eventCounts.ricochet);for(let i=0;i<60;i++)audio.impact('earth',0,10,'e'+i);assert.equal(audio.diagnostics.eventCounts['bullet-whizz'],whizz);
  audio.dispose();
  const low=makeAudio(32).audio;low.setQuality('low');for(let i=0;i<200;i++)low.weaponFire('mg34',0,40,{rounds:9,key:'b'+i});
  assert.ok(low.diagnostics.liveSources<=low.diagnostics.sourceBudget+60,'source budget caps live grains');assert.ok(low.diagnostics.budgetDropped>0);
  low.explosion(0,30,{scale:'large',key:'still-heard'});assert.ok([...low.voices].some(v=>v.category==='explosion'),'explosions bypass the budget');low.dispose();
  const full=makeAudio(32).audio;full.setQuality('low');full.weaponFire('mg34',0,30,{rounds:1,key:'g0',source:'gun'});full.liveSources=full.diagnostics.sourceBudget;
  const before=full.bursts.get('gun').voice.sources.size;full.weaponFire('mg34',0,30,{rounds:1,key:'g1',source:'gun'});
  assert.equal(full.bursts.get('gun').voice.sources.size,before,'a burst round cannot exceed the source budget either');full.liveSources=before;full.dispose();
  const broken=makeAudio(),ctx=broken.ctx;const original=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{const o=original();o.start=()=>{throw new Error('start');};return o;};
  broken.audio.tone(200,.1);assert.equal(broken.audio.fading.size,0,'a source that never started is cut, not left fading');assert.equal(broken.audio.liveSources,0);broken.audio.dispose();
  const far=makeAudio().audio;far.distantBattle('mg',0,4000,'very-far',{rounds:7});assert.ok(far.diagnostics.culledGrains>0,'inaudible grains are not created');far.dispose();
});
