import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {DUST,DUST_RISE_SEC,DUST_FADE_SHARE,dustSpec,dustKind,dustDensity,dustClouds,dustChord,dustThickness,dustBlocks,validDust} from '../src/game/m01-dust.js';
import {eyePosition} from '../src/world/spatial.js';

// Package 2 (2026-11-04, golden amendment 21): dust and smoke clouds are a fact of the simulation and block the AI's line of sight, for both sides. The numbers are gameplay values (m01-dust.js).

const active=(seed=17)=>{const s=new M01Simulation(seed);s.tick(.05,{skip:true});s.drainEvents();return s;};
const place=(s,a,x,z,extra={})=>{Object.assign(a,{x,z,active:true,alive:true,...extra});a.y=s.world.heightAt(x,z);return a;};
// Open ground along the strip between the approaches: nothing between two men standing on z 26 (tests/m01-bomb-effects.test.js uses the same).
const GERMAN_AT=-100,POLE_AT=-160,Z=26,MID={x:-130,y:0,z:Z};
const duel=(s)=>{
  const german=place(s,s.actor('de_east_5'),GERMAN_AT,Z),pole=place(s,s.actor('szymon_kowal'),POLE_AT,Z);
  return {german,pole};
};
const bombBetween=(s,at=MID,id='bomb_test')=>s.impact(id,{x:at.x,y:0,z:at.z},true);

test('the density of a cloud builds up, holds and thins out over the last share of its life, and is zero outside it',()=>{
  const spec=dustSpec('bomb');
  assert.deepEqual(spec,{r:16,h:12,d:1,life:40});
  assert.equal(dustDensity(spec,-1),0);assert.equal(dustDensity(spec,0),0,'a blast starts without a cloud: it builds up');
  assert.ok(Math.abs(dustDensity(spec,DUST_RISE_SEC/2)-.5)<1e-9);assert.equal(dustDensity(spec,DUST_RISE_SEC),1);assert.equal(dustDensity(spec,10),1);
  const fadeStart=spec.life*(1-DUST_FADE_SHARE);assert.equal(dustDensity(spec,fadeStart),1);
  assert.ok(Math.abs(dustDensity(spec,fadeStart+(spec.life-fadeStart)/2)-.5)<1e-9);assert.equal(dustDensity(spec,spec.life),0);assert.equal(dustDensity(spec,spec.life+5),0);
  for(const [id,kind] of [['m01_grenade_3','grenade'],['east_demolition','demolition'],['west_demolition','demolition'],['raid_0434_4','bomb'],['station_bomb','bomb'],['repair_crater','bomb']])assert.equal(dustKind(id),kind,id);
  // the grenade's cloud is the 20 s the renderer already shows its smoke for
  assert.equal(DUST.kinds.grenade.life,20);
  assert.ok(DUST.kinds.demolition.r>DUST.kinds.bomb.r&&DUST.kinds.bomb.r>DUST.kinds.grenade.r,'a demolition is wider than a bomb, a bomb than a grenade');
});

test('the chord of a ray through a cylinder, in the disc and in height; a ray beside it, above it or ending before it meets nothing',()=>{
  const c={x:0,y:0,z:0,r:10,h:8,density:1};
  const dir=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);return {x:(b.x-a.x)/d,y:(b.y-a.y)/d,z:(b.z-a.z)/d,len:d};};
  const through={x:-30,y:1.5,z:0},to={x:30,y:1.5,z:0},d=dir(through,to);
  assert.ok(Math.abs(dustChord(c,through,d,d.len)-20)<1e-9,'a diameter');
  const off={x:-30,y:1.5,z:6},offTo={x:30,y:1.5,z:6},d2=dir(off,offTo);assert.ok(Math.abs(dustChord(c,off,d2,d2.len)-16)<1e-9,'the chord at 6 m from the centre of a 10 m disc is 16 m');
  const miss={x:-30,y:1.5,z:11},missTo={x:30,y:1.5,z:11},d3=dir(miss,missTo);assert.equal(dustChord(c,miss,d3,d3.len),0);
  const over={x:-30,y:12,z:0},overTo={x:30,y:12,z:0},d4=dir(over,overTo);assert.equal(dustChord(c,over,d4,d4.len),0,'above the cloud');
  const short={x:-30,y:1.5,z:0},shortTo={x:-12,y:1.5,z:0},d5=dir(short,shortTo);assert.equal(dustChord(c,short,d5,d5.len),0,'the line ends before the cloud');
  const half={x:-30,y:1.5,z:0},halfTo={x:0,y:1.5,z:0},d6=dir(half,halfTo);assert.ok(Math.abs(dustChord(c,half,d6,d6.len)-10)<1e-9,'a line that ends at the centre: the radius');
  const rising={x:-10,y:0,z:0},risingTo={x:10,y:40,z:0},d7=dir(rising,risingTo);assert.ok(dustChord(c,rising,d7,d7.len)>0&&dustChord(c,rising,d7,d7.len)<20,'a climbing ray leaves the top');
  const vertical={x:0,y:-3,z:0},verticalTo={x:0,y:30,z:0},d8=dir(vertical,verticalTo);assert.ok(Math.abs(dustChord(c,vertical,d8,d8.len)-8.5)<1e-9,'straight up through the cloud: its height and the half metre under the crater');
  // thickness: density times chord, summed over clouds; blocking at DUST.blockAt
  assert.ok(Math.abs(dustThickness([{...c,density:.5}],through,to)-10)<1e-9);
  assert.ok(Math.abs(dustThickness([{...c,density:.5},{...c,x:5,density:.25}],through,to)-(10+.25*dustChord({...c,x:5},through,d,d.len)))<1e-9);
  assert.equal(dustBlocks([],through,to),false);assert.equal(dustBlocks([{...c,density:.14}],through,to),false,'a thin cloud (thickness 2.8) lets the line through');
  assert.equal(dustBlocks([{...c,density:.15}],through,to),true,'thickness 3 >= blockAt');
});

test('a bomb leaves a cloud in the crater record; the cloud stands for its life and blocks the sight of both sides across it, then is gone',()=>{
  const s=active(),{german,pole}=duel(s);
  assert.equal(s.sees(german,pole),true,'open ground, no cloud');assert.equal(s.sees(pole,german),true);assert.equal(s.renderState.dust.length,0);
  const t0=s.clock;bombBetween(s);
  const record=s.sectors.damage.at(-1);assert.deepEqual(record.dust,{r:16,h:12,d:1,life:40},'the cloud is part of the crater record (saved with the game)');
  assert.equal(s.sees(german,pole),true,'at the instant of the blast the cloud has not built up');
  s.clock=t0+DUST_RISE_SEC;
  assert.equal(s.world.lineOfSight(german,pole),true,'the world still sees across: it is the dust that hides them');
  assert.equal(s.sees(german,pole),false,'the German does not see the Pole through the dust');assert.equal(s.sees(pole,german),false,'nor the Pole the German: both sides');
  assert.deepEqual(s.renderState.dust.map(c=>({id:c.id,r:c.r,h:c.h,density:c.density})),[{id:'bomb_test',r:16,h:12,density:1}],'the renderer is told the same cloud');
  assert.equal(s.dustRays.blocked>=2,true,'the diagnostic counts the rays the dust refused');
  // the cloud thins over the last 40 % of its life: a line through its middle (32 m) is still blocked until the density falls under 4.5 / 32
  s.clock=t0+30;assert.equal(s.sees(german,pole),false,'at 30 s the density is .625: 20 m of dust on the line');
  s.clock=t0+37;assert.equal(s.sees(german,pole),false,'at 37 s the density is .19: 6 m');
  s.clock=t0+39;assert.equal(dustThickness(dustClouds(s.sectors.damage,s.clock),eyePosition(german),eyePosition(pole))<DUST.blockAt,true);assert.equal(s.sees(german,pole),true,'at 39 s the dust has thinned under the limit: 2 m');
  s.clock=t0+40;assert.equal(s.sees(german,pole),true);assert.equal(s.renderState.dust.length,0,'gone');
});

test('a cloud off the line, below the line\'s height or behind one of the two men hides nobody; a man standing inside the cloud is hidden from one outside it',()=>{
  const s=active(),{german,pole}=duel(s),t0=s.clock;
  bombBetween(s,{x:-130,z:Z+60});s.clock=t0+5;assert.equal(s.sees(german,pole),true,'a bomb 60 m beside the line');
  const s2=active(),d2=duel(s2),t2=s2.clock;bombBetween(s2,{x:-70,z:Z});s2.clock=t2+5;   // behind the German
  assert.equal(s2.sees(d2.german,d2.pole),true,'a cloud behind the German is not on the line (he stands at x -100, its disc ends at -86)');
  const s3=active(),d3=duel(s3),t3=s3.clock;bombBetween(s3,{x:-100,z:Z});s3.clock=t3+5;   // he stands in the middle of it
  assert.equal(s3.sees(d3.german,d3.pole),false,'a man inside the cloud does not see out of it (16 m of dust on the way)');
  const s4=active(),d4=duel(s4),t4=s4.clock;d4.pole.x=-100+15.5;   // 15.5 m east of the German, both inside the same cloud
  bombBetween(s4,{x:-100,z:Z});s4.clock=t4+5;assert.equal(s4.sees(d4.german,d4.pole),false,'two men 15.5 m apart in the same dense cloud do not see each other');
  d4.pole.x=-100+2.5;assert.equal(s4.sees(d4.german,d4.pole),true,'but two and a half metres apart they do (under the limit)');
});

test('a hand grenade leaves a small cloud that lasts the 20 s of its smoke and hides a man behind it; a demolition leaves a wide, long one',()=>{
  const s=active(),{german,pole}=duel(s);
  s.impact('m01_grenade_0',{x:-130,y:-3,z:Z},false);
  assert.deepEqual(s.sectors.damage.at(-1).dust,{r:4.5,h:3.5,d:1,life:20});
  const t0=s.sectors.damage.at(-1).started;
  assert.equal(s.sectors.damage.at(-1).smokeSeconds,s.sectors.damage.at(-1).dust.life,'the sim\'s cloud and the renderer\'s smoke (smokeVisible, 20 s) are the same 20 s');
  s.clock=t0+3;assert.equal(s.sees(german,pole),false,'9 m of smoke across the line at eye height 1.6 m (cloud top 3.5 m)');
  s.clock=t0+19.5;assert.equal(s.sees(german,pole),true,'in its last seconds the smoke has gone');
  const s2=active();s2.impact('east_demolition',{x:800,y:0,z:20},false);assert.deepEqual(s2.sectors.damage.at(-1).dust,{r:42,h:32,d:1,life:150});
});

test('a record without a cloud (a save from before package 2) is given the default of its kind; a malformed cloud is refused by the validator',()=>{
  const s=active();bombBetween(s,MID,'raid_old');s.sectors.damage.at(-1).started=s.clock;
  const snap=s.snapshot(false);
  assert.ok(snap.sectors.damage.every(d=>d.dust!==undefined),'every crater of this build carries its cloud');
  for(const d of snap.sectors.damage)delete d.dust;
  validateM01Snapshot(snap);   // an old save is valid
  const r=new M01Simulation(3);r.restoreSnapshot(snap);r.clock=snap.clock+DUST_RISE_SEC;
  assert.equal(r.renderState.dust.length,snap.sectors.damage.filter(d=>r.clock-d.started<40).length,'the recent blasts of an old save have their clouds again');
  assert.ok(r.renderState.dust.some(c=>c.id==='raid_old'&&c.r===16));
  const bad=[{r:0,h:12,d:1,life:40},{r:16,h:12,d:0,life:40},{r:16,h:12,d:2,life:40},{r:16,h:12,d:1,life:0},{r:16,h:12,d:1,life:301},{r:81,h:12,d:1,life:40},{r:16,h:61,d:1,life:40},
    {r:16,h:12,d:1},{r:16,h:12,d:1,life:40,extra:1},[16,12,1,40],'cloud',null,{r:NaN,h:12,d:1,life:40}];
  for(const dust of bad){const t=s.snapshot(false);t.sectors.damage.at(-1).dust=dust;if(dust===null)continue;assert.throws(()=>validateM01Snapshot(t),/destruição|número/,JSON.stringify(dust));assert.equal(validDust(dust),false);}
  assert.equal(validDust(dustSpec('bomb')),true);
});

test('a save made with clouds standing restores to the same clouds and the same answers, tick for tick (determinism)',()=>{
  // The German stands where a save accepts him (the east bank) and the player is put 600 m from him with a cloud between them; the question is the same on both sides of a restore.
  const setup=()=>{const s=active(),german=s.actor('de_east_5'),p=s.player;p.x=german.x-600;p.z=german.z;p.y=s.world.heightAt(p.x,p.z);
    s.impact('bomb_east',{x:p.x+300,y:0,z:p.z},true);s.clock+=DUST_RISE_SEC;return {s,german};};
  const run=()=>{const {s,german}=setup(),out=[];
    for(let i=0;i<120;i++){s.tick(.05,{skip:true});out.push([s.clock.toFixed(2),s.sees(german,s.player),s.sees(s.player,german),s.renderState.dust.length]);}
    return {out,snapshot:s.snapshot(false)};};
  const a=run(),b=run();assert.deepEqual(a.out,b.out);assert.deepEqual(a.snapshot,b.snapshot);
  assert.ok(a.out.some(o=>o[3]>0),'a cloud stood during the run');
  const {s,german}=setup();for(let i=0;i<60;i++)s.tick(.05,{skip:true});
  const saved=s.snapshot(false),r=new M01Simulation(1);r.restoreSnapshot(saved);
  assert.deepEqual(r.renderState.dust,s.renderState.dust);assert.equal(r.sees(r.actor('de_east_5'),r.player),s.sees(german,s.player));
  for(let i=0;i<40;i++){s.tick(.05,{skip:true});r.tick(.05,{skip:true});}
  assert.deepEqual(r.renderState.dust,s.renderState.dust);assert.equal(r.clock,s.clock);assert.equal(r.sees(r.actor('de_east_5'),r.player),s.sees(german,s.player));
});
