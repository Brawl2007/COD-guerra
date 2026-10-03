import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPEED_OF_SOUND,distanceBand,propagationDelay,attenuation,airLowPass,occlusionModel,environmentModel,presentationVariation,
  planAudioEvent,allocateVoices,convertBattleSectorEvent,dialogueMix,weaponLayers,artilleryLayers,vehicleMix,aircraftMix,snapshotMix,
} from '../tools/verification/m01-battlefield-audio-prototype.mjs';

const listener={position:{x:0,y:1.7,z:0},yaw:0};
const ev=(id,type='weapon_shot',category='weapons',position={x:10,y:1,z:0},extra={})=>({id,type,sourceId:extra.sourceId??id,position,emittedAt:12,category,intensity:1,priority:'AUTO',...extra});

test('distance delay uses distance / speed of sound and the 1 km case is not hardcoded',()=>{
  assert.equal(SPEED_OF_SOUND,343);
  assert.ok(Math.abs(propagationDelay(1000)-1000/343)<1e-12);
  assert.ok(Math.abs(propagationDelay(686)-2)<1e-12);
  const p=planAudioEvent(ev('boom','explosion','explosions',{x:1000,y:1.7,z:0}),listener);
  assert.ok(Math.abs(p.audibleAt-(12+1000/343))<1e-6);assert.equal(p.virtual,false);assert.equal(p.priority,'MEDIUM');
});

test('attenuation and air filtering change continuously with distance',()=>{
  assert.ok(attenuation(15)>attenuation(250));
  assert.ok(attenuation(250)>attenuation(1000));
  assert.ok(airLowPass(15)>airLowPass(250));
  assert.ok(airLowPass(250)>airLowPass(1000));
});

test('distance bands classify acoustic ranges independently of visual LOD',()=>{
  assert.equal(distanceBand(15),'CLOSE');
  assert.equal(distanceBand(45),'MID');
  assert.equal(distanceBand(250),'DISTANT');
  assert.equal(distanceBand(1000),'VERY_DISTANT');
  assert.equal(distanceBand(6000),'BEYOND');
});

test('occlusion filters instead of muting and portals partially reopen the path',()=>{
  const wall=occlusionModel({blocked:true,thickness:1,portals:0}),door=occlusionModel({blocked:true,thickness:1,portals:2});
  assert.ok(wall.gain>0&&wall.gain<1);assert.ok(wall.lowPass<5000);assert.ok(wall.wet>0);
  assert.ok(door.gain>wall.gain);assert.ok(door.lowPass>wall.lowPass);
});

test('indoor environment adds filtering/reflections without changing event time',()=>{
  const e=ev('room','explosion','explosions',{x:25,y:0,z:0});
  const out=planAudioEvent(e,listener,{environment:'OUTDOOR'}),room=planAudioEvent(e,listener,{environment:'CASEMATE'});
  assert.equal(out.audibleAt,room.audibleAt);assert.ok(room.lowPass<out.lowPass);assert.ok(room.wet>out.wet);
  assert.ok(environmentModel('CASEMATE','high').reflectionTaps>environmentModel('CASEMATE','low').reflectionTaps);
});

test('priority favors player/near danger and mission dialogue',()=>{
  assert.equal(planAudioEvent(ev('p','weapon_shot','player_weapon',{x:0,y:1,z:0},{sourceId:'player'}),listener).priority,'CRITICAL');
  assert.equal(planAudioEvent(ev('near','explosion','explosions',{x:20,y:0,z:0}),listener).priority,'CRITICAL');
  assert.equal(planAudioEvent(ev('far','weapon_shot','weapons',{x:1800,y:0,z:0}),listener).priority,'LOW');
  assert.equal(dialogueMix({missionCritical:true}).priority,'CRITICAL');
});

test('voice limits virtualize low-value distant shots rather than creating unbounded sources',()=>{
  const plans=Array.from({length:50},(_,i)=>planAudioEvent(ev(`shot-${i}`,'weapon_shot','weapons',{x:600+i*4,y:0,z:0}),listener,{quality:'low'}));
  const result=allocateVoices(plans,{quality:'low'});
  assert.ok(result.active.length<=32);assert.ok(result.used.weapons<=12);assert.ok(result.virtual.length>=38);
});

test('expired one-shot is not played late after virtualization',()=>{
  const p=planAudioEvent(ev('old','explosion','explosions',{x:40,y:0,z:0},{emittedAt:1}),listener,{now:10});
  assert.equal(p.expired,true);assert.equal(p.virtual,true);
});

test('dialogue survives battle budget and contextual ducking does not silence explosions',()=>{
  const dialogue=planAudioEvent(ev('dlg','dialogue','dialogue',{x:3,y:1.7,z:0},{missionCritical:true}),listener);
  const battle=Array.from({length:80},(_,i)=>planAudioEvent(ev(`b-${i}`,'weapon_shot','weapons',{x:80+i*5,y:0,z:0}),listener));
  const mix=allocateVoices([dialogue,...battle],{quality:'low'});
  assert.ok(mix.active.some(p=>p.id==='dlg'));assert.ok(dialogueMix({missionCritical:true}).duck.explosionsDb>-6);
});

test('battle-sector logical events convert to explicit audio events',()=>{
  const a=convertBattleSectorEvent({id:'s1-a',type:'sector_artillery_event',sectorId:'s1',position:{x:900,y:0,z:40},emittedAt:30});
  const m=convertBattleSectorEvent({id:'s1-mg',type:'sector_mg_exchange',sectorId:'s1',position:{x:700,y:0,z:50},emittedAt:31});
  assert.equal(a.type,'artillery_impact');assert.equal(a.weaponType,'artillery');assert.equal(m.category,'weapons');assert.equal(m.weaponType,'mg');
});

test('audio enabled/disabled and quality do not mutate or decide gameplay',()=>{
  const gameplay={rng:12345,actors:[{id:'a',health:88}],mission:{phase:'SET_PIECE'},casualties:3};
  const before=structuredClone(gameplay),event=ev('safe','weapon_shot','weapons',{x:400,y:0,z:0});
  const on=planAudioEvent(event,listener,{quality:'high',audioEnabled:true}),off=planAudioEvent(event,listener,{quality:'low',audioEnabled:false});
  assert.deepEqual(gameplay,before);assert.equal(on.emittedAt,off.emittedAt);assert.equal(on.type,off.type);assert.equal(off.virtual,true);
});

test('presentation decisions are deterministic and never call gameplay RNG',()=>{
  let calls=0;const gameplayRng=()=>{calls++;throw new Error('gameplay RNG touched');};void gameplayRng;
  const event=ev('det','weapon_shot','weapons',{x:321,y:0,z:-44});
  assert.deepEqual(presentationVariation(event),presentationVariation(structuredClone(event)));
  assert.deepEqual(planAudioEvent(event,listener),planAudioEvent(structuredClone(event),structuredClone(listener)));
  assert.equal(calls,0);
});

test('off-camera source remains audible; orientation only changes spatial direction',()=>{
  const event=ev('off','weapon_shot','weapons',{x:50,y:1,z:10});
  const front=planAudioEvent(event,{...listener,yaw:0}),back=planAudioEvent(event,{...listener,yaw:Math.PI});
  assert.equal(front.virtual,false);assert.equal(back.virtual,false);assert.equal(front.gain,back.gain);assert.equal(front.audibleAt,back.audibleAt);
  assert.notEqual(front.pan,back.pan);
});

test('quality changes presentation budget only, not occurrence or timing',()=>{
  const event=ev('q','explosion','explosions',{x:750,y:0,z:0});
  const low=planAudioEvent(event,listener,{quality:'low'}),high=planAudioEvent(event,listener,{quality:'high'});
  assert.equal(low.type,high.type);assert.equal(low.emittedAt,high.emittedAt);assert.equal(low.audibleAt,high.audibleAt);assert.equal(low.distance,high.distance);
  assert.ok(environmentModel('FACTORY','high').secondaryTails>environmentModel('FACTORY','low').secondaryTails);
});

test('weapon and artillery contracts keep distinct physical layers',()=>{
  const shot=ev('layers','weapon_shot','weapons',{x:400,y:0,z:0},{nearTrajectory:true,impact:true});const p=planAudioEvent(shot,listener);
  assert.deepEqual(weaponLayers(shot,p),['muzzle_blast','mechanical','distant_report','bullet_crack','impact']);
  const art=ev('art','artillery','explosions',{x:1000,y:0,z:0},{shellFlight:true,incomingWhistle:true,trajectorySupportsWhistle:true,impact:true});
  assert.deepEqual(artilleryLayers(art,planAudioEvent(art,listener)),['gun_report','shell_flight','incoming_whistle','impact','debris','environment_tail']);
});

test('vehicle, aircraft and snapshots expose future mix parameters without gameplay control',()=>{
  assert.ok(vehicleMix({rpm:1800,load:.7,damage:.5,interior:true}).lowPass<20000);
  assert.ok(aircraftMix({radialVelocity:-80,altitude:120}).playbackRate>1);
  assert.ok(snapshotMix('NEAR_EXPLOSION').recovery>0);assert.equal(snapshotMix('NORMAL').lowPass,20000);
});
