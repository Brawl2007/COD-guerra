import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
import {M01HudPresenter,HUD_TIMING,hitMarkerOpacity,playerImpactSoundPlan} from '../src/ui/m01-hud.js';
import {M01DamageDecals,M01_TERRAIN_MESH,renderedTerrainHeight} from '../src/render/m01-damage-decals.js';
import {impactProfile} from '../src/render/m01-battlefield-fx-profile.js';
import {traceObstruction} from '../src/world/spatial.js';

// Presentation-only T19 remainder: hit marker, delayed far impact sound, water splash. Mission-clock driven; no frame rates measured.
class FakeElement {
  constructor(tag='div'){
    this.tag=tag;this.children=[];this.own='';this.className='';this.dataset={};this.styles=new Map();this.classes=new Set();
    this.style={setProperty:(k,v)=>this.styles.set(k,String(v)),removeProperty:k=>this.styles.delete(k)};
    const c=this.classes;this.classList={toggle:(n,on=!c.has(n))=>{on?c.add(n):c.delete(n);return on;},add:n=>c.add(n),remove:(...n)=>n.forEach(x=>c.delete(x)),contains:n=>c.has(n)};
  }
  get textContent(){return this.children.length?this.children.map(c=>c.textContent).join(''):this.own;}
  set textContent(v){this.children=[];this.own=String(v);}
  replaceChildren(...children){this.children=children;this.own='';}
}
const doc={createElement:tag=>new FakeElement(tag)};
const KEYS=['root','objective','objectiveStatus','objectivePanel','objectiveUpdate','clock','checkpoint','checkpointName','interaction','subtitle','message',
  'health','healthBar','status','ammo','mag','reserve','weaponName','weaponState','grenades','lowHealth','fade','titleCard','resumeCard','hitMarker'];
function hud(){
  const el=Object.fromEntries(KEYS.map(k=>[k,new FakeElement()]));
  el.rounds=new FakeElement('div',[]);el.rounds.children=Array.from({length:5},()=>new FakeElement('i'));
  return {el,presenter:new M01HudPresenter(el,{document:doc})};
}
const marker=el=>Number(el.hitMarker.styles.get('opacity')??0);
/** A simulation that is out of any closed scene so the HUD is live; only the mission clock moves. */
function liveSim(clock=100){const sim=new M01Simulation(19390901);sim.scene=null;sim.clock=clock;return sim;}

// Game wired to recording stubs: exercises the real handleM01Event / drain / restore code of game.js, without DOM or WebGL.
function harness(){
  const sim=liveSim(50),{el,presenter}=hud(),calls=[];
  const game=Object.create(Game.prototype);
  Object.assign(game,{sim,m01Hud:presenter,pendingSounds:[],pendingM01HitFeedback:null,hud:{message:new FakeElement()},input:{clear(){}},
    audio:{crack(){},wz29Shot(){},wz29Mechanism(){},resetPresentation(){},impact:(...a)=>calls.push(['impact',...a])},
    renderer:{resetEffects(){},m01:{surfaceDamage(){},lastSurface:null,muzzle(){},impact(){},roundFeedback(){},directionalHit(){}}}});
  sim.player.x=0;sim.player.z=0;
  return {game,sim,el,presenter,calls};
}
const shot=(extra={})=>({type:'player-shot',point:{x:0,y:1,z:30},material:'earth',hit:false,weapon:'kb_wz29',...extra});

test('hit marker lights only for player-shot hit:true and lives 0.15 s of mission clock',()=>{
  const {game,sim,el,presenter}=harness();
  assert.equal(HUD_TIMING.hitMarker,.15);
  presenter.update(sim);assert.equal(marker(el),0);
  game.handleM01Event(shot({hit:false}));presenter.update(sim);assert.equal(marker(el),0);
  game.handleM01Event(shot({hit:undefined,material:'character'}));presenter.update(sim);assert.equal(marker(el),0);
  game.handleM01Event({type:'round-impact',point:{x:0,y:1,z:30},material:'earth',hit:true,by:'x',distance:30});
  game.handleM01Event(shot({hit:true,material:'character'}));
  presenter.update(sim);assert.equal(marker(el),1);
  sim.clock+=.05;presenter.update(sim);assert.ok(marker(el)>0);
  sim.clock=50+.1499;presenter.update(sim);assert.ok(marker(el)>0&&marker(el)<=1);
  sim.clock=50+.1501;presenter.update(sim);assert.equal(marker(el),0);
  assert.equal(hitMarkerOpacity(-.01),0);assert.equal(hitMarkerOpacity(0),1);assert.equal(hitMarkerOpacity(.15),0);
});

test('hit marker freezes while paused (clock constant), is hidden in cinematic scenes and cleared by reset/clear',()=>{
  const {sim,el,presenter}=harness();
  presenter.hit(sim.clock);sim.clock+=.06;presenter.update(sim);const frozen=marker(el);assert.ok(frozen>0);
  for(let i=0;i<5;i++)presenter.update(sim);assert.equal(marker(el),frozen);   // paused: frames pass, mission clock does not
  sim.scene={id:'cs_m01_roll_call',elapsed:3};presenter.update(sim);assert.equal(marker(el),0);
  sim.scene=null;presenter.update(sim);assert.equal(marker(el),frozen);
  presenter.reset('restore',sim.clock);assert.equal(marker(el),0);presenter.update(sim);assert.equal(marker(el),0);
  presenter.hit(sim.clock);presenter.update(sim);assert.equal(marker(el),1);
  presenter.clear();assert.equal(el.hitMarker.styles.has('opacity'),false);
  presenter.reset('new',sim.clock);presenter.update(sim);assert.equal(marker(el),0);
});

test('sound plan: <= 60 m immediate, beyond 60 m due at clock + distance/343',()=>{
  assert.deepEqual(playerImpactSoundPlan(60,12),{immediate:true,at:12});
  assert.deepEqual(playerImpactSoundPlan(5,12),{immediate:true,at:12});
  const far=playerImpactSoundPlan(343,12);assert.equal(far.immediate,false);assert.equal(far.at,13);
  assert.ok(Math.abs(playerImpactSoundPlan(60.5,0).at-60.5/343)<1e-12);
});

test('game.js: far player impact is queued with the same key, drained when due, and never replays after restore',()=>{
  const {game,sim,calls}=harness();
  sim.weapon.shotCount=7;
  game.handleM01Event(shot({point:{x:0,y:1,z:20}}));                  // 20 m: heard now, unchanged
  assert.equal(calls.length,1);assert.equal(calls[0][1],'earth');assert.equal(calls[0][4],'player:7');assert.equal(game.pendingSounds.length,0);
  game.handleM01Event(shot({point:{x:0,y:1,z:343}}));                 // 343 m: one second later
  assert.equal(calls.length,1);assert.equal(game.pendingSounds.length,1);
  const p=game.pendingSounds[0];assert.equal(p.kind,'impact');assert.equal(p.key,'player:7');assert.equal(p.material,'earth');
  assert.ok(Math.abs(p.at-(50+p.distance/343))<1e-9);assert.ok(p.distance>300);
  // the loop's own drain predicate: not due yet / due
  assert.equal(game.pendingSounds.filter(s=>s.at<=50.5).length,0);assert.equal(game.pendingSounds.filter(s=>s.at<=p.at).length,1);
  // restore: rebuildSounds clears it (sim.sectors.damage holds only authored blasts)
  game.handleM01Event({type:'restored'});assert.deepEqual(game.pendingSounds.filter(s=>s.kind==='impact'),[]);
  // restart/new mission paths reassign pendingSounds=[]; rebuildSounds is the one used by continue/restore
  game.pendingSounds.push({...p});game.rebuildSounds();assert.equal(game.pendingSounds.filter(s=>s.kind==='impact').length,0);
});

test('a player shot into the Vistula yields water FX and water sound material, not earth dust',()=>{
  const sim=new M01Simulation(19390901),w=M01_TERRAIN_MESH.water,decals=new M01DamageDecals(new THREE.Scene());
  const o={x:70,y:0,z:120},len=Math.hypot(30,10),d={x:30/len,y:-10/len,z:0};
  const t=traceObstruction(sim.world,o,d,500),point={x:o.x+d.x*t.distance,y:o.y+d.y*t.distance,z:o.z};
  assert.equal(t.material,'earth');assert.ok(point.x>w.x0&&point.x<w.x1);assert.ok(point.y<w.top);   // the simulation's own bed hit
  const ev={type:'player-shot',point,material:'earth',hit:false},before=sim.snapshot(false),rng=sim.rng.state;
  const r=decals.impact(ev,{world:sim.world,player:sim.player,shooter:sim.player,clock:3,quality:'medium'});
  assert.equal(r.kind,'water');assert.equal(r.secondaryFx,'water');assert.equal(r.placed,false);assert.equal(r.fxPoint.y,w.top);assert.equal(decals.marks.length,0);
  assert.notEqual(impactProfile('water'),impactProfile('earth'));assert.ok(impactProfile('water').dust>0);
  // game.js uses the drawn surface for the sound too
  const h=harness();h.game.renderer.m01.lastSurface=r;h.sim.player.x=point.x;h.sim.player.z=point.z-20;
  h.game.handleM01Event({...ev,point:{...point,z:point.z}});assert.equal(h.calls.at(-1)[1],'water');
  // shots on the bank still use the earth path (mesh above the water)
  const bank={type:'player-shot',point:{x:10,y:renderedTerrainHeight(sim.world,10,120),z:120},material:'earth'};
  assert.notEqual(decals.impact(bank,{world:sim.world,player:sim.player,shooter:sim.player,clock:3,quality:'medium'})?.kind,'water');
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),before);
});

test('hit marker and sound scheduling consume no gameplay RNG and leave the snapshot unchanged',()=>{
  const {game,sim,presenter}=harness();const before=sim.snapshot(false),rng=sim.rng.state;
  game.handleM01Event(shot({hit:true,point:{x:0,y:1,z:400}}));presenter.update(sim);presenter.reset('restore',sim.clock);playerImpactSoundPlan(200,sim.clock);
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),before);
});
