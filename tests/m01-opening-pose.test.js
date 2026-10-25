// R1-b (2026-10-25, golden amendment 20): the presentation of the opening life (src/render/m01-opening-pose.js, m01-opening-kit.js, m01-opening-ik.js and their wiring in M01Characters), all reading
// actor.act. No browser here (the captures are in docs/verification/m01-runtime/opening-r1b-2026-10-25): the pure choice of clip per act, the procedural pose (lean, head, hand targets), the props, and the real
// soldier rig posed on the CPU: the hands reach their targets, the pose is bracketed by the IK capture/restore so that a man without an act is bit-identical to what he was, props show only while the act asks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {OPENING,OPENING_ACTS} from '../src/game/m01-opening.js';
import {OPENING_POSE_CLIPS,HANDS_BUSY,openingSample,openingPose,openingProps,PROP_KEYS,kowalCleans} from '../src/render/m01-opening-pose.js';
import {OpeningKit,OPENING_FIT,propsOf} from '../src/render/m01-opening-kit.js';
import {boneSnapshot,createIkCharacters} from './helpers/m01-ik-fixture.js';

const manifest=path=>JSON.parse(readFileSync(new URL(`../assets/models/provisional/m01/characters/${path}`,import.meta.url),'utf8'));
const LIBRARY=new Set([...manifest('manifest.json').files['m01_soldier_animations.glb'].clips.map(c=>c.name),...manifest('clip-library-v2/manifest.json').clips.map(c=>c.name),
  ...manifest('crews-evacuation/manifest.json').clips.map(c=>c.name),...manifest('motion-clips-v1/manifest.json').clips.map(c=>c.name)]);
const clips={has:n=>LIBRARY.has(n),size:LIBRARY.size};
const world=new TczewWorld();
const man=(id,act,extra={})=>({id,alive:true,active:true,state:'GUARD',crouched:false,team:'ally',role:'RIFLEMAN',act:{k:act,at:10,until:40,rng:1,n:1,b:0,tn:0,s:123456,hx:0,hz:0},...extra});
const ACTS=Object.keys(OPENING_ACTS);

test('every clip the opening plays is in the T08 library or the base packs: nothing here needed a new clip',()=>{
  for(const c of OPENING_POSE_CLIPS)assert.ok(LIBRARY.has(c),`${c} is in the clip library`);
  for(const id of OPENING.order)for(const act of ACTS){
    const c=openingSample(man(id,act),14,0,clips,{name:'standing'});if(c)assert.ok(LIBRARY.has(c.clip),`${id} ${act}: ${c.clip}`);
  }
});

test('the clip of each act: the watching and talking acts use the library\'s idles, the work acts their own, the crew keeps the crew\'s clips and only its own acts leave them',()=>{
  const clip=(id,act,t=14,extra={})=>openingSample(man(id,act,extra),t,0,clips,{name:'standing'})?.clip??null;
  for(const act of ['map','binoculars','look_up','point','deliver'])assert.equal(clip('pl_west_2',act),'standing_idle_c',act);assert.equal(clip('pl_west_2','brace'),'standing_idle','brace: hunched over the rifle at the ready');
  for(const act of ['smoke','coffee'])assert.equal(clip('pl_west_2',act),'standing_idle_b',act);
  for(const act of ['phone','phone_dead','ammo_check','aid_kit'])assert.equal(clip('pl_west_2',act),'standing_idle',act);
  assert.equal(clip('franciszek_lipski','track_check'),'crouched_idle');assert.equal(clip('jozef_bak','cover',14,{crouched:true}),'crouched_idle');
  assert.equal(clip('szymon_kowal','cover',14,{crouched:true}),'rkm_crouched_idle');assert.equal(clip('szymon_kowal','clean_rkm'),'rkm_clean');assert.equal(clip('pl_west_2','clean_rkm'),null);
  assert.equal(clip('pawel_krawiec','cable_inspect'),'sapper_work');assert.equal(openingSample(man('pawel_krawiec','cable_inspect'),14,0,clips,{}).rate,.55);
  assert.equal(clip('pl_west_2','cable_hold'),'crouched_idle_b');assert.equal(clip('sapper_3','cable_watch'),'crouched_idle');
  // the crew keeps the clips authored to the gun's own animation: the opening moves their heads only
  for(const act of ['ckm_scan','ckm_belt','ckm_up','idle','look_up','brace','map','binoculars'])for(const id of ['ckm_gunner','ckm_loader'])assert.equal(clip(id,act),null,`${id} ${act}: the crew keeps the crew's clips`);
  assert.equal(clip('pl_west_2','ckm_scan'),null);assert.equal(clip('pl_west_2','ckm_belt'),null);
  // the walking acts, and idle: the ordinary rules of the gait and the idles decide
  for(const act of ['idle','errand','deliver_walk','cover_run','cable_walk','cable_wait','home'])if(Object.hasOwn(OPENING_ACTS,act))assert.ok([null,'standing_idle_c'].includes(clip('pl_west_2',act)),act);
  // a shout is the one-shot of call_out and then the watching idle; the rifle check is the library's fidget now and then, the base idle in between
  assert.equal(clip('marek_zielinski','shout',10.5),'call_out');assert.equal(clip('marek_zielinski','shout',40-1),'standing_idle_c');
  const fidgets=new Set();for(let t=10;t<40;t+=.25)fidgets.add(clip('pl_west_3','rifle_check',t));
  assert.deepEqual([...fidgets].sort(),['fidget_check_rifle','standing_idle']);
});

test('no clip of the opening for a man who is shaken, hit, dead, carried or pinned: the combat poses decide, as before',()=>{
  const s=man('pl_west_2','binoculars');
  assert.equal(openingSample(s,14,0,clips,{name:'standing'}).clip,'standing_idle_c');
  for(const [label,a,pose] of [['dead',{...s,alive:false},{name:'standing'}],['wounded',{...s,state:'WOUNDED'},{name:'standing'}],['carried',{...s,carriedBy:'leon_dudek'},{name:'standing'}],
    ['fallen',s,{name:'fallen'}],['pinned',s,{name:'pinned'}],['under fire',s,{name:'standing',underFire:true}],['no act',{...s,act:undefined},{name:'standing'}]])
    assert.equal(openingSample(a,14,0,clips,pose),null,label);
  assert.equal(openingPose({...s,alive:false},14),null);assert.equal(openingPose({...s,state:'WOUNDED'},14),null);assert.equal(openingPose({...s,act:undefined},14),null);
  assert.equal(kowalCleans({act:{k:'clean_rkm'}},16400,false),true);assert.equal(kowalCleans({act:{k:'cover'}},16300,false),false,'with an act, the act decides');
  assert.equal(kowalCleans({},4*3600+33*60,false),true,'without one, the old rule: until 04:33:10, before he has fired');assert.equal(kowalCleans({},4*3600+34*60,false),false);
  assert.equal(kowalCleans({firedAt:3},4*3600+30*60,false),false);
});

test('the procedural pose is a pure function of the act and the time: finite numbers, weights in 0..1, known anchors, the same twice, whatever the order of the questions',()=>{
  const snap=x=>x&&JSON.parse(JSON.stringify(x)),spec=(act,t)=>snap(openingPose(man('pl_west_2',act),t));
  const ANCHORS=new Set(['head','root','chest','shoulder']);
  const seen=new Map();
  for(const act of ACTS)for(let t=9;t<45;t+=.37){
    const p=spec(act,t);if(!p)continue;
    assert.ok(Number.isFinite(p.lean)&&Number.isFinite(p.head)&&Number.isFinite(p.look)&&Math.abs(p.look)<=.5&&Math.abs(p.head)<=.7&&Math.abs(p.lean)<=.6,`${act} ${t}`);
    for(const h of [p.l,p.r])if(h){
      assert.ok(h.w>=0&&h.w<=1,`${act} ${t}: weight ${h.w}`);assert.ok(h.p.length===3&&h.p.every(Number.isFinite));assert.ok(ANCHORS.has(h.a),`${act}: anchor ${h.a}`);
      if(h.dir)assert.ok(h.dir.every(Number.isFinite)&&h.len>0&&h.len<=.56,`${act}: the arm that points is no longer than the arm (${h.len})`);else assert.ok(h.o.every(Number.isFinite)&&Math.hypot(...h.o)<1.2);
    }
    seen.set(act,(seen.get(act)??0)+1);
  }
  for(const act of ['binoculars','smoke','coffee','phone','phone_dead','map','ammo_check','aid_kit','track_check','look_up','point','deliver','brace','cover','cable_watch','ckm_scan','ckm_belt','ckm_up'])assert.ok(seen.get(act)>10,`${act} has a pose`);
  for(const act of ['idle','errand','cable_walk','home','shout','rifle_check','cable_inspect','cable_hold','clean_rkm'])assert.ok(!seen.has(act),`${act}: the clip alone`);
  // the crew's acts are the head and nothing else: no hand, no lean (the clips are authored to the gun), a look that moves
  for(const act of ['ckm_scan','ckm_belt','ckm_up']){const looks=new Set();for(let t=10;t<40;t+=.5){const p=spec(act,t);assert.ok(p&&!p.l&&!p.r&&p.lean===0,act);looks.add(p.look.toFixed(2));}assert.ok(looks.size>5,`${act}: the head moves (${looks.size} looks)`);}
  // the same questions in another order give the same answers (the reused record is read at once, never kept)
  const A=[],B=[];for(const act of ['binoculars','map'])for(const t of [12,20,31])A.push(spec(act,t));
  for(const act of ['map','binoculars'].reverse())for(const t of [31,20,12])B.unshift(spec(act,t));
  assert.deepEqual(A,B.reverse().length?A:B);
  const once=spec('smoke',17.3);spec('coffee',22);spec('binoculars',30);assert.deepEqual(spec('smoke',17.3),once);
  // the pose eases in at the start of the act and out at its end (the hands come from the clip and go back to it)
  for(const act of ['binoculars','map','phone']){assert.equal(spec(act,10).r?.w??spec(act,10).l.w,0,`${act} starts at 0`);assert.ok((spec(act,25).r??spec(act,25).l).w>.99,`${act} holds`);assert.ok((spec(act,40).r??spec(act,40).l).w<.01,`${act} ends at 0`);}
});

test('the props: each act shows its own and nothing else; a man carries only the props of the acts of his plan; the sapper team gets one tool each',()=>{
  const props=(id,act,t=14)=>Object.entries(openingProps(man(id,act),t)).filter(([k,v])=>PROP_KEYS.includes(k)&&v).map(([k])=>k);
  assert.deepEqual(props('pl_west_2','binoculars'),['binoculars']);assert.deepEqual(props('pl_west_4','smoke'),['cigarette']);assert.deepEqual(props('pl_west_5','coffee'),['mug']);
  assert.deepEqual(props('marek_zielinski','map'),['map']);assert.deepEqual(props('staszek_pawlak','phone'),['phone','handset'].sort((a,b)=>PROP_KEYS.indexOf(a)-PROP_KEYS.indexOf(b)));
  assert.deepEqual(props('pl_west_0','ammo_check'),['box']);assert.deepEqual(props('leon_dudek','aid_kit'),['bag']);assert.deepEqual(props('pl_west_1','deliver'),['note']);
  assert.deepEqual(props('pawel_krawiec','cable_inspect'),['meter']);assert.deepEqual(props('sapper_2','cable_hold'),['coil']);assert.deepEqual(props('sapper_3','cable_wait'),[]);assert.deepEqual(props('sapper_3','cable_watch'),['binoculars']);
  for(const act of ['idle','look_up','point','brace','cover','shout','rifle_check','track_check','clean_rkm','ckm_scan','ckm_belt','home','cover_run'])assert.deepEqual(props('pl_west_2',act),[],act);
  // the ember of the cigarette: 0 outside smoke, within 0..1 while it burns, never dark
  assert.equal(openingProps(man('pl_west_4','idle'),14).ember,0);
  for(let t=10;t<40;t+=.3){const e=openingProps(man('pl_west_4','smoke'),t).ember;assert.ok(e>=0&&e<=1,`ember ${e}`);}
  // who can ever carry what
  assert.deepEqual(propsOf('pawel_krawiec'),['meter']);assert.deepEqual(propsOf('sapper_2'),['coil']);assert.deepEqual(propsOf('sapper_3'),['binoculars']);
  assert.ok(propsOf('pl_west_1').includes('note')&&propsOf('pl_west_1').includes('cigarette'));assert.deepEqual(propsOf('de_east_0'),[]);assert.deepEqual(propsOf('ckm_gunner'),[]);
  for(const k of PROP_KEYS)assert.ok(OPENING_FIT[k]&&OPENING_FIT[k].pos.length===3&&OPENING_FIT[k].rot.length===3,`${k} has a place`);
});

test('the rifle is slung only while both hands work (the glasses, the map, the telephone, the box, the bag, the cable); one hand still holds it for a cigarette, a mug and the note',()=>{
  assert.deepEqual([...HANDS_BUSY].sort(),['aid_kit','ammo_check','binoculars','cable_hold','cable_inspect','cable_watch','map','phone','phone_dead']);
  for(const act of HANDS_BUSY)assert.ok(Object.hasOwn(OPENING_ACTS,act));
  for(const act of ['smoke','coffee','deliver','errand','look_up','point','brace','idle','rifle_check','shout'])assert.ok(!HANDS_BUSY.has(act),act);
});

test('the kit builds every prop on a skeleton, shows only what is asked, animates the ember and releases what it made',()=>{
  const root=new THREE.Group();root.name='root';
  const bone=(name,parent)=>{const b=new THREE.Bone();b.name=name;parent.add(b);return b;};
  const hips=bone('hips',root),s1=bone('spine_01',hips),s2=bone('spine_02',s1),s3=bone('spine_03',s2),neck=bone('neck',s3);bone('head',neck);bone('hand_r',s3);bone('hand_l',s3);
  const kit=new OpeningKit();
  assert.equal(kit.attach(root,'de_east_0'),null,'a man without props has no kit');
  const mine=kit.attach(root,'pl_west_1');assert.ok(mine&&mine.cigarette&&mine.note&&mine.binoculars&&!mine.meter,Object.keys(mine??{}).join());
  for(const o of Object.values(mine))assert.equal(o.visible,false,'hidden until an act asks');
  kit.sync(mine,{...Object.fromEntries(PROP_KEYS.map(k=>[k,false])),binoculars:true,cigarette:true,ember:1},12.5);
  assert.equal(mine.binoculars.visible,true);assert.equal(mine.cigarette.visible,true);assert.equal(mine.note.visible,false);
  const glow=mine.cigarette.getObjectByName('opening_ember');assert.ok(glow.material.opacity>.9);
  kit.sync(mine,{...Object.fromEntries(PROP_KEYS.map(k=>[k,false])),ember:0},13);assert.ok(Object.values(mine).every(o=>!o.visible));
  const full=kit.attach(new THREE.Group(),'staszek_pawlak');assert.equal(full,null,'no skeleton: nothing is attached and nothing is thrown');
  assert.doesNotThrow(()=>kit.sync(null,{},0));assert.doesNotThrow(()=>kit.dispose());
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const soldier=(id,act,x=-70,z=22,extra={})=>({id,active:true,alive:true,team:'ally',role:'RIFLEMAN',state:'GUARD',crouched:false,suppressedUntil:0,x,y:world.heightAt(x,z),z,facing:0,bodyYaw:0,shot:0,firedAt:-100,rounds:5,
  motion:{speed:0,odometer:0,gait:'idle',gaitSince:0},...(act?{act:{k:act,at:10,until:40,rng:1,n:1,b:0,tn:0,s:123456,hx:x,hz:z}}:{}),...extra});
const P=(inst,name)=>inst.root.getObjectByName(name).getWorldPosition(new THREE.Vector3());
const frame=(c,actors,time,at={x:-70,z:22},quality='high')=>{c.update(actors,time-.05,at,quality,16300,world);c.update(actors,time,at,quality,16300,world);return c.diagnostics.actors;};

test('on the real soldier rig the hands reach the targets of the act (binoculars at the eyes, the map at the chest, the handset at the ear, the box at the belly) and the props show',async()=>{
  const c=await createIkCharacters();
  for(const [id,act,wantProps] of [['pl_west_2','binoculars',['binoculars']],['marek_zielinski','map',['map']],['staszek_pawlak','phone',['handset','phone']],['pl_west_0','ammo_check',['box']],['pl_west_4','smoke',['cigarette']]]){
    const a=soldier(id,act),d=frame(c,[a],25).find(x=>x.id===id),inst=c.instances.get(id);
    assert.ok(d.opening&&d.opening.act===act&&d.opening.pose===true,`${id} ${act}: the pose was applied`);assert.deepEqual([...d.opening.props].sort(),[...wantProps].sort(),`${act} props`);
    const spec=openingPose(a,25),head=P(inst,'head'),chest=P(inst,'spine_03');inst.root.updateMatrixWorld(true);
    const R=new THREE.Vector3(1,0,0).transformDirection(inst.root.matrixWorld),U=new THREE.Vector3(0,1,0).transformDirection(inst.root.matrixWorld),F=new THREE.Vector3(0,0,-1).transformDirection(inst.root.matrixWorld);
    for(const [side,bone] of [['l','hand_l'],['r','hand_r']]){
      const h=spec[side];if(!h)continue;
      const base=h.a==='head'?head:h.a==='chest'?chest:new THREE.Vector3().setFromMatrixPosition(inst.root.matrixWorld),t=base.clone().addScaledVector(R,h.o[0]).addScaledVector(U,h.o[1]).addScaledVector(F,h.o[2]);
      assert.ok(P(inst,bone).distanceTo(t)<.03,`${act}: ${bone} is ${P(inst,bone).distanceTo(t).toFixed(3)} m from its target`);
    }
  }
  // the prop is on the bone it is fitted to, and not visible once the act is over
  frame(c,[soldier('pl_west_2','binoculars')],25);const inst=c.instances.get('pl_west_2');assert.ok(inst.okit.binoculars&&inst.okit.binoculars.visible);
  frame(c,[soldier('pl_west_2','idle')],26);assert.equal(inst.okit.binoculars.visible,false);
});

test('a man without an act is bit-identical to what he always was, and the frame after an act undoes the whole pose (captured and restored with the foot IK)',async()=>{
  const [withAct,reference]=[await createIkCharacters(),await createIkCharacters()];
  const plain=()=>[soldier('pl_west_2',null),soldier('pl_west_3',null)];
  frame(withAct,plain(),30);frame(reference,plain(),30);
  assert.deepEqual(boneSnapshot(withAct.instances.get('pl_west_2')),boneSnapshot(reference.instances.get('pl_west_2')),'no act: the same bones');
  // an act on both, then none: the bones are those of a man who never had one
  frame(withAct,[soldier('pl_west_2','binoculars'),soldier('pl_west_3','map')],31);
  const moved=boneSnapshot(withAct.instances.get('pl_west_2'));
  frame(withAct,plain(),32);frame(reference,plain(),32);
  assert.deepEqual(boneSnapshot(withAct.instances.get('pl_west_2')),boneSnapshot(reference.instances.get('pl_west_2')),'after the act: the bones are the clip\'s again');
  assert.notDeepEqual(moved,boneSnapshot(withAct.instances.get('pl_west_2')),'and the act had moved them');
});

test('the procedural pose is kept near the player and for a few men at a time (cost bounded per quality); the clip and the props are not',async()=>{
  const c=await createIkCharacters();
  const near=soldier('pl_west_2','binoculars',-70,22),far=soldier('pl_west_3','binoculars',-70+100,22);
  const d=frame(c,[near,far],25,{x:-70,z:22}),n=d.find(x=>x.id==='pl_west_2').opening,f=d.find(x=>x.id==='pl_west_3').opening;
  assert.equal(n.pose,true);assert.equal(f.pose,false,'100 m away: no arms');assert.deepEqual(f.props,['binoculars'],'the props are still on the man');
  // low quality: a shorter reach
  const l=frame(await createIkCharacters(),[soldier('pl_west_2','binoculars',-70+30,22)],25,{x:-70,z:22},'low').find(x=>x.id==='pl_west_2').opening;assert.equal(l.pose,false,'30 m at low quality');
  // many men at once: at most fourteen get the arms in a frame
  const many=Array.from({length:20},(_,i)=>soldier(`pl_west_${i%6}`.replace(/_(\d+)$/,(m,k)=>`_${k}`),'binoculars',-70+i*.9,22+(i%3)));
  const ids=['pl_west_0','pl_west_1','pl_west_2','pl_west_3','pl_west_4','pl_west_5','marek_zielinski','szymon_kowal','jozef_bak','staszek_pawlak','east_platoon_voice','tadeusz_nowicki','leon_dudek','franciszek_lipski','ckm_reserve','pl_east_0','pl_east_1','pl_east_2','pl_east_3','pl_east_4'];
  const crowd=ids.map((id,i)=>soldier(id,'binoculars',-70+i*.8,22+(i%4)*.9));void many;
  const posed=frame(await createIkCharacters(),crowd,25).filter(x=>x.opening?.pose).length;assert.ok(posed>0&&posed<=14,`${posed} men posed`);
});
