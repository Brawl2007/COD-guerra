import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {AudioManager} from '../src/core/audio.js';
import {M01AudioDirector} from '../src/game/audio-director-m01.js';
import {Game} from '../src/game/game.js';
import {seconds} from '../src/game/m01-simulation.js';
import {route} from './helpers/m01-route.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

test('real retreat events use Game delay scheduling and audible synth fallback with32 voices and under2percent dropped',()=>{
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,maxVoices:32,quality:'high',fetchImpl:async()=>{throw Error('intentional sample offline');}});
  audio.init();const director=new M01AudioDirector(audio),game=Object.create(Game.prototype);
  Object.assign(game,{pendingSounds:[],audio,renderer:{m01:{surfaceDamage(){},explosionFeedback(){},explosion(){},impact(){},roundFeedback(){},directionalHit(){},playerHit(){},blast(){}}},m01Hud:{hit(){}},input:{clear(){}},hitUntil:0});
  let requests=0,generated=0,events=0,played=0,delayed=0;const originalVoice=audio._voice.bind(audio);audio._voice=(...args)=>{requests++;return originalVoice(...args);};
  for(const name of ['createOscillator','createBufferSource']){const original=ctx[name].bind(ctx);ctx[name]=()=>{generated++;return original();};}
  route(19390901,{support:false,onStep:({sim,events:drained})=>{
    if(sim.battleClock<seconds('06:00:00')||sim.battleClock>seconds('06:45:00'))return;
    game.sim=sim;ctx.currentTime=sim.clock;
    // Complete only sources whose real scheduled end has arrived. Long grains/loops stay live and consume the actual budget.
    for(const source of ctx.sources)if(source.onended&&source.stopAt!==undefined&&source.stopAt<=ctx.currentTime)source.finish();
    ctx.sources=ctx.sources.filter(s=>s.onended);ctx.nodes=ctx.nodes.filter(n=>!n.disconnected);
    for(const event of drained)if(['enemy-fire','round-impact','npc-shot','m01-blast','player-hit','player-shot'].includes(event.type)){
      if(event.type==='enemy-fire')events++;game.handleM01Event(event);
    }
    for(let i=game.pendingSounds.length-1;i>=0;i--){const sound=game.pendingSounds[i];if(sound.at>sim.clock)continue;game.pendingSounds.splice(i,1);
      if(sound.kind==='fire'){assert.ok(sound.at<=sim.clock);played++;audio.weaponFire(sound.weapon,sound.pan,sound.distance,{rounds:sound.rounds,interval:sound.interval,key:sound.key,front:sound.front,source:sound.source});}
      if(sound.kind==='blast')audio.explosion(sound.pan,sound.distance,{scale:sound.scale,key:sound.key,front:sound.front});
    }
    delayed=Math.max(delayed,game.pendingSounds.filter(s=>s.kind==='fire').length);
    audio.updateM01Presentation({clock:sim.clock,state:sim.renderState,spatial:point=>game.spatial(point),phase:sim.mission.phase,quality:'high'});director.update(sim);
  }});
  const dropped=audio.dropped+audio.budgetDropped,ratio=dropped/requests,report={task:'T06',provenance:'Real-control mission retreat, production Game.handleM01Event and AudioManager/Director; FakeAudioContext tracks actual scheduled source ends. All sample fetches intentionally offline.',
    maxVoices:audio.maxVoices,requests,dropped,ratio,enemyFireEvents:events,heardRequests:played,maxDelayedRequests:delayed,generatedSynthSources:generated,peakVoices:audio.peakVoices,director:director.diagnostics};
  if(process.env.M01_PARTIALS_AUDIO_REPORT)writeFileSync(process.env.M01_PARTIALS_AUDIO_REPORT,JSON.stringify(report,null,2)+'\n');
  director.dispose();audio.dispose();assert.equal(report.maxVoices,32);assert.ok(events>10);assert.ok(played>10);assert.ok(delayed>0);assert.ok(generated>100);assert.ok(requests>100);
  assert.ok(ratio<.02,JSON.stringify(report));assert.ok(report.peakVoices<=32);assert.equal(report.director.errors,0);
});
