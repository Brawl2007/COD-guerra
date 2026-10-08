import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { generateMotionPackage } from '../tools/assets/m01-soldiers/build-motion-clips.mjs';
import { inspectMotionPackage } from '../tools/assets/m01-soldiers/motion/validate.mjs';
import { preservedRig, PACKAGE_DIR, CHARACTER_DIR, VARIANTS, loadGLB, sha256, unpackGLB } from '../tools/assets/m01-soldiers/motion/rig.mjs';

const NAMES = ['sprint', 'crouch_walk', 'turn_left', 'turn_right', 'hit_front', 'near_miss_duck'];
const manifest = JSON.parse(await readFile(new URL('manifest.json', PACKAGE_DIR)));
const bytes = await readFile(new URL(manifest.file, PACKAGE_DIR)), json = unpackGLB(bytes).json;
const reportPromise = inspectMotionPackage();
const bonePoint = (scene, name) => scene.getObjectByName(name).getWorldPosition(new THREE.Vector3());

test('motion package contains six distinct original clips and no renderable geometry, textures or root channels', () => {
  assert.deepEqual(json.animations.map(c => c.name), NAMES);
  for (const key of ['meshes', 'materials', 'images', 'textures', 'skins']) assert.equal(json[key]?.length ?? 0, 0, key);
  const signatures = [];
  for (const a of json.animations) {
    const spec = manifest.clips.find(c => c.name === a.name);
    assert.deepEqual(a.extras, spec);
    assert.ok(a.channels.length > 25, 'actual skeletal work');
    assert.ok(!a.channels.some(c => json.nodes[c.target.node].name === 'root'));
    assert.ok(!spec.combat_events.length);
    signatures.push(JSON.stringify(a.channels.map(c => [json.nodes[c.target.node].name, c.target.path, json.accessors[a.samplers[c.sampler].output].count])));
  }
  // Turns share duration but have different quaternion payloads, not a renamed clip.
  assert.notDeepEqual(json.animations[2].samplers, json.animations[3].samplers);
  assert.equal(sha256(bytes), manifest.sha256);
});

test('documented locomotion distance, contacts and durations can be sampled from an odometer', () => {
  for (const [name, duration, cycleDistance, speed] of [['sprint', 0.64, 3.2, 5], ['crouch_walk', 0.96, 0.768, 0.8]]) {
    const spec = manifest.clips.find(c => c.name === name);
    assert.equal(spec.duration_s, duration); assert.equal(spec.cycle_distance_m, cycleDistance); assert.equal(spec.nominal_speed_mps, speed);
    assert.ok(Math.abs(cycleDistance / duration - speed) < 1e-12);
    assert.equal(spec.step_distance_m * 2, cycleDistance);
    assert.equal(spec.phase_source, 'odometer'); assert.ok(spec.loop);
    assert.deepEqual(spec.foot_strikes, [{ side: 'l', phase: 0 }, { side: 'r', phase: 0.5 }]);
    for (const side of ['l', 'r']) for (const [a, b] of spec.contact_windows[side]) assert.ok(a >= 0 && b <= 1 && a < b);
  }
  assert.equal(manifest.clips.find(c => c.name === 'hit_front').presentation_event, 'hitAt');
  assert.equal(manifest.clips.find(c => c.name === 'near_miss_duck').presentation_event, 'suppressedAt');
});

test('all PL/DE and 61/28-joint LOD variants accept the same locked bind pose', async () => {
  const expected = await preservedRig();
  for (const variant of VARIANTS) {
    const rig = await preservedRig(variant.file), lock = manifest.source_rigs.find(r => r.file === variant.file);
    assert.deepEqual(rig.offsets, expected.offsets, variant.file);
    assert.equal(sha256(rig.bytes), lock.sha256);
    assert.equal(rig.json.skins[0].joints.length, variant.lod === 2 ? 28 : 61);
  }
});

test('real GLTFLoader/AnimationMixer binds all tracks, preserves root and limb lengths, without NaN or warnings', async () => {
  const report = await reportPromise;
  assert.deepEqual(report.warnings, []); assert.deepEqual(report.failures, []);
  assert.equal(report.variants.length, 6);
  for (const v of report.variants) for (const c of v.clips) {
    assert.ok(c.samples > 150);
    assert.equal(c.maxRootError_m, 0); assert.equal(c.maxRootAngle_rad, 0);
    assert.ok(c.maxLengthError_m < 1e-5);
    assert.ok(c.finiteVertices > 0);
  }
});

test('actual skinned boot soles stay above ground; nominal root displacement cancels planted-foot drift', async () => {
  const report = await reportPromise;
  for (const v of report.variants) for (const c of v.clips) {
    for (const side of ['l', 'r']) {
      assert.ok(c.footMinimum_m[side] >= -0.0005, `${v.file}/${c.name}/${side}: ${c.footMinimum_m[side]}`);
      assert.ok(c.contactMaximum_m[side] <= 0.015);
    }
    assert.ok(c.maxContactDrift_m <= 0.004);
  }
});

test('wrists follow the weapon profile and elbows remain outside the chest envelope through the actual interpolated clips', async () => {
  for (const v of (await reportPromise).variants) for (const c of v.clips) {
    assert.ok(c.maxGripError_m <= 0.003, `${v.file}/${c.name}: ${c.maxGripError_m}`);
    assert.ok(c.minElbowChestDistance_m >= 0.13);
  }
});

test('locomotion loops have matching transforms and no single-tick joint jump', async () => {
  for (const v of (await reportPromise).variants) for (const c of v.clips) {
    if (['sprint', 'crouch_walk'].includes(c.name)) {
      assert.ok(c.endpointPosition_m < 1e-5); assert.ok(c.endpointAngle_rad < 1e-5);
    }
    assert.ok(c.maxJointStep_rad < 0.16, `${v.file}/${c.name}: ${c.maxJointStep_rad}`);
  }
});

test('left/right turns use opposite foot orders and ±90° skeletal yaw while the actor root stays fixed', async () => {
  const animation = await loadGLB(manifest.file, PACKAGE_DIR);
  for (const [name, angle, lead] of [['turn_left', Math.PI / 2, 'l'], ['turn_right', -Math.PI / 2, 'r']]) {
    const model = await loadGLB('m01_soldier_pl_lod1.glb'), mixer = new THREE.AnimationMixer(model.scene), clip = animation.animations.find(c => c.name === name), root = model.scene.getObjectByName('root');
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce); action.clampWhenFinished = true; action.play(); mixer.setTime(0); model.scene.updateMatrixWorld(true);
    const initial = root.matrixWorld.clone(); mixer.setTime(clip.duration * 0.30); model.scene.updateMatrixWorld(true);
    assert.ok(bonePoint(model.scene, `foot_${lead}`).y > bonePoint(model.scene, `foot_${lead === 'l' ? 'r' : 'l'}`).y + 0.03, 'lead foot lifts first');
    mixer.setTime(clip.duration); model.scene.updateMatrixWorld(true);
    assert.deepEqual(root.matrixWorld.elements, initial.elements);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(model.scene.getObjectByName('hips').getWorldQuaternion(new THREE.Quaternion()).normalize());
    assert.ok(Math.abs(Math.atan2(-forward.x, -forward.z) - angle) < 1e-6);
  }
});

test('reactions recover to their initial pose without deciding combat or moving the actor root', async () => {
  const animation = await loadGLB(manifest.file, PACKAGE_DIR);
  for (const name of ['hit_front', 'near_miss_duck']) {
    const model = await loadGLB('m01_soldier_de_lod2.glb'), mixer = new THREE.AnimationMixer(model.scene), clip = animation.animations.find(c => c.name === name);
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce); action.clampWhenFinished = true; action.play(); mixer.setTime(0); model.scene.updateMatrixWorld(true);
    const names = ['hips', 'head', 'foot_l', 'foot_r', 'hand_l', 'hand_r', 'weapon'], initial = names.map(n => bonePoint(model.scene, n));
    mixer.setTime(clip.duration); model.scene.updateMatrixWorld(true);
    names.forEach((n, i) => assert.ok(bonePoint(model.scene, n).distanceTo(initial[i]) < 1e-6));
  }
});

test('the full visible skin stays finite and anatomically bounded at five requested clip phases on all six models', async () => {
  const animations = await loadGLB(manifest.file, PACKAGE_DIR), point = new THREE.Vector3();
  for (const variant of VARIANTS) {
    const model = await loadGLB(variant.file), mixer = new THREE.AnimationMixer(model.scene), meshes = [];
    model.scene.traverse(o => { if (o.isSkinnedMesh && o.userData.visible !== false) meshes.push(o); });
    for (const clip of animations.animations) {
      const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce); action.clampWhenFinished = true; action.play();
      for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
        mixer.setTime(phase * clip.duration); model.scene.updateMatrixWorld(true);
        for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
          assert.ok(point.toArray().every(Number.isFinite), `${variant.file}/${clip.name}/${mesh.name}: ${i}`);
          assert.ok(Math.abs(point.x) < 1.5 && Math.abs(point.z) < 1.5 && point.y > -0.001 && point.y < 2.1, `${variant.file}/${clip.name}/${mesh.name}: ${point.toArray()}`);
        }
      }
      mixer.stopAllAction(); mixer.uncacheClip(clip);
    }
  }
});

test('generation reproduces the exact GLB and metadata twice without modifying original assets', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'm01-motion-repro-'));
  try {
    for (const sub of ['a', 'b']) {
      const out = pathToFileURL(join(folder, sub) + '/'); await generateMotionPackage(out);
      for (const file of [manifest.file, 'manifest.json']) assert.deepEqual(await readFile(new URL(file, out)), await readFile(new URL(file, PACKAGE_DIR)), file);
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('motion package source commit preserves gameplay, original assets, dependencies and workflows', () => {
  // This immutable asset source may be merged into a larger M01 integration.
  // Compare the delivered source commit, not the combined HEAD containing other approved work.
  const source='075effaf72d3ceaf4dbda153f1221dc1541b8bef';
  const result=spawnSync('git',['diff','--name-only',manifest.base_commit,source,'--','src','assets','package.json','package-lock.json','.github'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const changed=result.stdout.trim().split('\n').filter(Boolean).filter(p=>!p.startsWith('assets/models/provisional/m01/characters/motion-clips-v1/'));
  assert.deepEqual(changed,[]);
  // The integrated GLB and manifest must also be byte-identical to the source delivery.
  for(const relative of [manifest.file,'manifest.json']){
    const path='assets/models/provisional/m01/characters/motion-clips-v1/'+relative;
    const original=spawnSync('git',['show',source+':'+path],{maxBuffer:4*1024*1024});
    assert.equal(original.status,0,original.stderr.toString());
    assert.deepEqual(original.stdout,relative===manifest.file?bytes:Buffer.from(JSON.stringify(manifest,null,2)+'\n'),path);
  }
});
