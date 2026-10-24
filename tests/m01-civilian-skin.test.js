import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {soldierVisualVariant} from '../src/render/m01-soldier-variation.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';

// Playtest 2026-10-18 follow-up: the civilians (Lipski, station-yard railwaymen and aid staff) were black procedural boxes.
// They now reuse the soldier body/atlas in workwear, without helmet, webbing, rank or rifle. No new asset.
const assets=await nodeCharacterAssets();
const sim=new M01Simulation();
const actor=(id,x,z=0)=>({...sim.actor(id),active:true,alive:true,x,y:0,z,facing:0,shot:0,firedAt:-1e9,target:null});
function characters(){const c=new M01Characters(new THREE.Scene(),{visualVariation:true});c.sources=assets.sources;c.clips=assets.clips;return c;}
const visibleNames=v=>v.meshes.filter(m=>m.visible).map(m=>m.name);

test('civilian descriptors: deterministic, the generic head; soldier descriptors are unchanged',()=>{
  for(const id of ['franciszek_lipski','yard_railway_0','yard_railway_1','yard_orderly','yard_aid']){
    const a=sim.actor(id),v=soldierVisualVariant(a);
    assert.equal(v.civilian,true,id);assert.equal(v.equipment,'civilian',id);assert.equal(v.head,'pl_a',`${id}: the only generic face of the Polish source, never a named soldier head`);
    assert.deepEqual(soldierVisualVariant(JSON.parse(JSON.stringify(a))),v);assert.ok(v.id.endsWith('c'));
  }
  const soldier=sim.actor('marek_zielinski');assert.equal(soldierVisualVariant(soldier).civilian,false);
  assert.equal(soldierVisualVariant(soldier).id,`pl:${soldierVisualVariant(soldier).profile}`,'the soldier descriptor id keeps its old form');
  // the same actor flagged as soldier gets a different identity from the civilian one
  assert.notEqual(soldierVisualVariant({...sim.actor('yard_railway_0'),civilian:false}).id,soldierVisualVariant(sim.actor('yard_railway_0')).id);
});

test('civilians are drawn as dressed skinned bodies (no helmet, webbing, rank, rifle), one head, at every LOD',()=>{
  for(const d of [10,30,100,250]){
    const c=characters();
    try{
      const ids=['franciszek_lipski','yard_railway_0','yard_orderly','yard_aid'];
      const sel=c.update(ids.map((id,i)=>actor(id,-d,i*1.5)),12,{x:0,z:0},'high');
      assert.deepEqual([...sel].sort(),[...ids].sort(),`d=${d}`);
      for(const [id,v] of c.instances){
        const names=visibleNames(v);
        assert.ok(names.includes('body'),`${id} body`);
        assert.equal(names.filter(n=>n.startsWith('head_')).length,1,`${id} exactly one head`);
        for(const hidden of ['gear','helmet_wz31','helmet_cover_wz31','cap_wz37','sapper','nco','rifle','clip','rifle_wz98a','rkm_wz28','rag'])assert.ok(!names.includes(hidden),`${id} must not show ${hidden} at ${d} m`);
        assert.equal(names.some(n=>n.startsWith('rank_')),false);
        assert.equal(v.visual.civilian,true);
      }
    }finally{c.dispose();}
  }
});

test('the yard patient and the cart keep their procedural layouts; a civilian does not take a soldier slot beyond the budget order',()=>{
  const c=characters();
  try{
    const sel=c.update([actor('yard_patient',-10),actor('yard_cart',-12),actor('franciszek_lipski',-14)],12,{x:0,z:0},'high');
    assert.deepEqual([...sel],['franciszek_lipski']);
  }finally{c.dispose();}
});

test('civilian props: lantern for the lantern carriers, armband for the aid staff, shared kit disposed with the characters',()=>{
  const c=characters();
  let kit;
  try{
    c.update([actor('yard_railway_0',-10),actor('yard_orderly',-12,2),actor('franciszek_lipski',-14,4)],12,{x:0,z:0},'high');
    const props=id=>{const out=[];c.instances.get(id).root.traverse(o=>{if(/^civilian_/.test(o.name))out.push(o.name);});return out;};
    assert.ok(props('yard_railway_0').includes('civilian_lantern'));assert.ok(!props('yard_railway_0').includes('civilian_armband'));
    assert.equal(props('yard_orderly').filter(n=>n==='civilian_armband').length,2,'band + stripe');assert.ok(!props('yard_orderly').includes('civilian_lantern'));
    assert.deepEqual(props('franciszek_lipski'),[]);
    kit=c.civilianKit();let disposed=0;kit.lantern.addEventListener('dispose',()=>disposed++);
    c.dispose();assert.equal(disposed,1);assert.equal(c._civilianKit,null);
  }finally{c.dispose();}
});

test('R1-a: the hand lantern is lit only while its carrier stands; a railwayman a bomb has killed or wounded does not leave it floating beside the body',()=>{
  const c=characters();
  try{
    const man=actor('yard_railway_0',-10),lit=()=>{const out=[];c.instances.get('yard_railway_0').root.traverse(o=>{if(o.name==='civilian_lantern')out.push(o.visible);});return out;};
    let time=12;const draw=()=>{c.update([man],time,{x:0,z:0},'high');time+=.05;return lit();};
    assert.deepEqual(draw(),[true,true],'the body and the flame of a standing carrier');
    man.state='WOUNDED';assert.deepEqual(draw(),[false,false],'wounded: he lies where he fell (the WOUNDED pose), the lantern is not drawn in the air');
    man.state='GUARD';assert.deepEqual(draw(),[true,true],'a state that is not a wound shows it again (nothing else changed)');
    Object.assign(man,{alive:false,state:'DOWN',health:0});assert.deepEqual(draw(),[false,false],'dead');
    // the aid staff carries no lantern: nothing to switch, and no record is added for them
    const medic=actor('yard_orderly',-12,2);c.update([medic],time,{x:0,z:0},'high');assert.equal(c.instances.get('yard_orderly').lantern,null);
  }finally{c.dispose();}
});

test('workwear dye: the civilian body colours differ from the soldier tunic of the same profile, and soldiers are untouched',()=>{
  const c=characters();
  try{
    const civ=actor('franciszek_lipski',-10),soldier={...actor('marek_zielinski',-10,3)};
    c.update([civ,soldier,{...actor('staszek_pawlak',-10,6)}],12,{x:0,z:0},'high');
    const body=id=>c.instances.get(id).meshes.find(m=>m.name==='body').geometry.getAttribute('color');
    const mean=a=>{const m=[0,0,0];for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)m[k]+=a.getComponent(i,k);return m.map(v=>v/a.count);};
    const [cr,cg,cb]=mean(body('franciszek_lipski')),[sr,sg,sb]=mean(body('marek_zielinski'));
    assert.ok(cr+cg+cb<sr+sg+sb,'workwear is darker than the field tunic');
    const names=visibleNames(c.instances.get('marek_zielinski'));
    assert.ok(names.includes('helmet_wz31')||names.includes('cap_wz37')||names.includes('nco'),'soldiers keep their kit');assert.ok(names.includes('gear'));
  }finally{c.dispose();}
});
