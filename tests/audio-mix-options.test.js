import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioManager} from '../src/core/audio.js';
import {parseAudioMix,concussionScaleFor,AUDIO_MIX_DEFAULTS} from '../src/core/audio/settings.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

const fresh=()=>{const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,quality:'high',fetchImpl:async()=>{throw new Error('no network');}});return {audio,ctx};};

test('bus volumes set before init are kept and applied once the graph exists',()=>{
  const {audio}=fresh();
  assert.equal(audio.setBusVolume("sfx",.4),false);audio.setBusVolume('music',0);audio.setBusVolume('voice',2);
  assert.deepEqual(audio.busVolumes,{sfx:.4,voice:1,music:0});
  assert.equal(audio.init(),true);
  assert.equal(audio.mix.sfx.gain.value,.4);assert.equal(audio.mix.music.gain.value,0);assert.equal(audio.mix.voice.gain.value,1);
  audio.setBusVolume('voice',.5);assert.equal(audio.mix.voice.gain.value,.5);
  audio.dispose();
});

test('invalid bus volumes and names are rejected, out-of-range values clamp',()=>{
  const {audio}=fresh();
  assert.equal(audio.setBusVolume('sfx',NaN),false);assert.equal(audio.setBusVolume('sfx','x'),false);assert.equal(audio.setBusVolume('bogus',.5),false);
  assert.equal(audio.busVolumes.sfx,1);
  audio.setBusVolume('sfx',-3);assert.equal(audio.busVolumes.sfx,0);audio.setBusVolume('sfx',9);assert.equal(audio.busVolumes.sfx,1);
  assert.equal(audio.setConcussionScale(NaN),false);audio.setConcussionScale(5);assert.equal(audio.concussionScale,1);audio.setConcussionScale(-1);assert.equal(audio.concussionScale,0);
});

test('concussionScale reduces the concussion cut',()=>{
  const {audio}=fresh();audio.init();
  audio._duck({amount:.5,concussion:.8});const full=audio.lastDuck.concussion;
  const b=fresh();b.audio.init();b.audio.setConcussionScale(.35);b.audio._duck({amount:.5,concussion:.8});
  assert.equal(full,.8);assert.equal(b.audio.lastDuck.concussion,.28);
  audio.dispose();b.audio.dispose();
});

test('parseAudioMix validates stored JSON',()=>{
  assert.deepEqual(parseAudioMix(null),AUDIO_MIX_DEFAULTS);assert.deepEqual(parseAudioMix('{bad'),AUDIO_MIX_DEFAULTS);assert.deepEqual(parseAudioMix('[1]'),AUDIO_MIX_DEFAULTS);
  assert.deepEqual(parseAudioMix('{"master":0.2,"sfx":5,"voice":"a","music":null,"reduceTinnitus":true}'),{master:.2,sfx:1,voice:1,music:1,reduceTinnitus:true});
  assert.equal(parseAudioMix({master:NaN}).master,AUDIO_MIX_DEFAULTS.master);
  assert.equal(concussionScaleFor(true),.35);assert.equal(concussionScaleFor(false),1);
});

test('menu exposes the new audio controls',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['volume','volume-sfx','volume-voice','volume-music','reduce-tinnitus'])assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.includes('VOLUME GERAL')&&html.includes('REDUZIR ZUMBIDO'));
});
