import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadIkAssets,createIkCharacters} from './helpers/m01-ik-fixture.js';
import {soldierProfile} from '../src/render/m01-characters.js';

// The weapons/sockets extras are on the child of the empty m01_soldier_<nation> Group: every skinned actor must use the authored muzzle, not the default.
const actor=(id,team)=>({id,team,active:true,alive:true,role:'RIFLEMAN'});
const CASES=[
  ['wz29 (generic PL)',actor('pl_rifle','ally'),'pl',[0,.032,-.765]],
  ['wz98a (Jozef Bak)',actor('jozef_bak','ally'),'pl',[0,.032,-.895]],
  ['rkm wz.28 (Szymon Kowal)',actor('szymon_kowal','ally'),'pl',[0,.035,-.755]],
  ['kar98k (DE)',actor('de_rifle','enemy'),'de',[0,.032,-.765]]
];

test('soldierProfile reads weapons/sockets from the node that carries them, for all LODs and nations', async () => {
  const {sources}=await loadIkAssets();
  for(const [key,src] of sources){
    const nation=key.split(':')[0],root=src.scene;
    assert.deepEqual(root.getObjectByName(`m01_soldier_${nation}`).userData,{},`${key}: the named Group itself is empty (the latent bug)`);
    const p=soldierProfile(root,nation);
    assert.ok(p?.weapons&&p.sockets,`${key}: profile found`);
  }
});

for(const [label,a,nation,expected] of CASES)test(`character muzzle uses the authored GLB socket: ${label}`, async () => {
  const c=await createIkCharacters();
  for(const lod of [0,1,2]){
    const authored=soldierProfile(c.sources.get(`${nation}:${lod}`).scene,nation);
    const weapon=a.id==='szymon_kowal'?'rkm_wz28':a.id==='jozef_bak'?'wz98a':nation==='pl'?'wz29':'kar98k';
    const v=c.create(a,`${nation}:${lod}`,lod);
    assert.equal(v.weapon,weapon);
    assert.deepEqual(v.muzzle,authored.weapons[weapon].muzzle,`${label} lod${lod}: profile muzzle`);
    assert.deepEqual(v.muzzle,expected,`${label} lod${lod}: authored value`);
    c.release(v);c.instances.delete(a.id);
  }
});

test('Bak and Kowal no longer fall back to the 13 cm-off default muzzle; simulation shot origin is independent of the render muzzle', () => {
  const DEFAULT=[0,.032,-.765];
  assert.notDeepEqual(CASES[1][3],DEFAULT);assert.notDeepEqual(CASES[2][3],DEFAULT);
  const spatial=readFileSync(new URL('../src/world/spatial.js',import.meta.url),'utf8');
  assert.doesNotMatch(spatial,/render\/|m01-characters|userData|\.muzzle\(/,'sim muzzlePosition is computed from eye/aim only');
});
