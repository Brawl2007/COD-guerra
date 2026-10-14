import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01AmbientDirector,resolveSquadLivingMotion} from '../src/render/m01-ambient.js';
import {battlefieldProfile,blastFlashEnvelope,impactProfile,sampleMuzzleEnvironmentLight} from '../src/render/m01-battlefield-fx-profile.js';
import {M01CombatFeedback,SOUND_SPEED_MS} from '../src/render/m01-combat-feedback.js';
test('T21: visual simulation data never mutated',()=>{
 const actor={id:'pl_11',x:3,z:5,alive:true},saved=JSON.stringify(actor);
 assert.ok(resolveSquadLivingMotion(actor,4,[{x:3,z:4,start:3.8}]).blastFlinch>0);
 assert.equal(JSON.stringify(actor),saved);
 const f=new M01AmbientDirector();
 assert.deepEqual(f.sample({clock:5,battleClock:16500,player:{x:-70}},'high'),
 f.sample({clock:5,battleClock:16500,player:{x:-70}},'high'));
 assert.equal(f.sampleHorizonFlash(5,16500,'low').active,false);
});
test('T21: profile extensions for stone, brick and water',()=>{
 assert.ok(impactProfile('brick').chips>=5);assert.ok(impactProfile('water').rise>=.6);
 assert.ok(blastFlashEnvelope(.15,battlefieldProfile('east_span_demolition'),771).active);
 assert.equal(sampleMuzzleEnvironmentLight([{alive:true,active:true,firedAt:1,x:1,z:0}],1.02,{x:0,z:0},'low').active,false);
});
test('T21: distant acoustic impulse cannot trigger before sound arrival',()=>{
 const f=new M01CombatFeedback({shakeScale:.5});
 f.explosion({clock:100,distance:686,direction:.5});
 assert.equal(SOUND_SPEED_MS,343);
 assert.equal(f.sample(100.1,'high').explosionImpulse,0);
 assert.ok(f.sample(102.05,'high').explosionImpulse>0);
 f.setShakeScale(0);assert.equal(f.sample(102.1,'high').cameraY,0);
});
test('T21: renderer really samples ambient and captures only real canvas',()=>{
 const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
 const cap=readFileSync(new URL('../tools/capture-t21-proof.mjs',import.meta.url),'utf8');
 assert.match(view,/this.ambientDirector.sample\(sim/);
 assert.match(view,/this.horizonGlow.visible=/);
 assert.match(cap,/canvas.screenshot/);
 assert.doesNotMatch(cap,/window\.__t21Harness|sim\.clock\s*=|restoreSnapshot\(/);
});
