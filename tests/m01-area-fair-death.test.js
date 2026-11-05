import test from 'node:test';
import assert from 'node:assert/strict';
import {M01AreaSimulation,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {M01_DIFFICULTY,F1_TELEGRAPH_GAP_SEC} from '../src/game/m01-difficulty.js';
import {actControls,ACT_TICK} from './helpers/m01-act-route.js';

// D35 fair-death rule F1 in the area acts (review finding: VII-a/VII-b had no clamp, so a second German's first burst could kill the player at once). Same rule as act 1 (tests/m01-difficulty-wiring.test.js).
// Not a playtest: deterministic checks of the wound rule and a measured pilot run.
const ACTS=['act_vii_a_north','act_vii_b_north_day','act_vii_c_withdrawal'];
const fresh=(difficulty,actId='act_vii_a_north',seed=19390901)=>new M01AreaSimulation(seed,{difficulty,actId});
const round=(sim,by,dt=0,kind='player')=>({by,kind,firedAt:sim.clock+dt,weapon:'kar98k'});

test('F1 in every area act: a lethal wound needs the same shooter engaging the player for reactionGraceSec (gap <= 6 s); a first round or a blind area round only takes him to 1 HP',()=>{
  for(const actId of ACTS)for(const id of ['soldado','veterano']){
    const L=M01_DIFFICULTY[id],tag=`${actId}/${id}`,probe=fresh(id,actId),shooter=probe.enemies[0]??{id:'de_np_0',team:'enemy'},a={id:shooter.id,team:'enemy'};
    let sim=fresh(id,actId);sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id,0,'area'));
    assert.equal(sim.player.health,1,`${tag}: no engagement, no death`);assert.equal(sim.player.alive,true);
    sim=fresh(id,actId);sim.player.health=L.woundDamage;sim.noteTelegraph(a,'player',1,.075);sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${tag}: the first aimed round never kills`);
    sim=fresh(id,actId);sim.noteTelegraph(a,'player',1,.075);sim.clock+=L.reactionGraceSec+.2;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,0,`${tag}: engaged >= grace, lethal`);assert.equal(sim.player.alive,false);
    sim=fresh(id,actId);sim.noteTelegraph(a,'player',1,.075);sim.clock+=F1_TELEGRAPH_GAP_SEC+1;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,1,`${tag}: a stale engagement does not count`);
    sim=fresh(id,actId);sim.noteTelegraph({id:'de_np_other',team:'enemy'},'player',1,.075);sim.clock+=3;sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${tag}: the same shooter`);
  }
  const r=fresh('recruta');r.noteTelegraph({id:'de_np_0',team:'enemy'},'player',1,.075);assert.equal(r.timers.telegraph,undefined,'recruta records no engagement');
});

test('F1 in VII-a on the active pilot (veterano, 3 seeds, 80 s): every lethal wound comes from a shooter engaged for the grace; the engagement record survives a save and a bad one is refused',()=>{
  const grace=M01_DIFFICULTY.veterano.reactionGraceSec;let wounds=0;
  for(const seed of [1,2,3]){
    const sim=new M01AreaSimulation(seed,{difficulty:'veterano',actId:'act_vii_a_north'}),state={},orig=sim.woundPlayer.bind(sim);
    sim.woundPlayer=function(r){
      const e=this.timers.telegraph?.[r.by],before=this.player.health;orig(r);wounds++;
      if(before>0&&this.player.health<=0)assert.ok(e&&r.firedAt-e.first>=grace-1e-9,`seed ${seed} t=${this.clock.toFixed(1)}: lethal round of ${r.by} (kind ${r.kind}) without ${grace} s of engagement`);
    };
    for(let i=0;i<80/ACT_TICK&&!sim.mission.complete;i++){sim.tick(ACT_TICK,actControls(sim,'active',state));sim.drainEvents();}
    if(sim.timers.telegraph){const s=sim.snapshot();validateAreaSnapshot(s);const bad=JSON.parse(JSON.stringify(s));bad.timers.telegraph={nobody:{first:0,last:0}};assert.throws(()=>validateAreaSnapshot(bad),/engajamento/);}
  }
  assert.ok(wounds>0,'the pilot was wounded at least once (the check ran)');
});
