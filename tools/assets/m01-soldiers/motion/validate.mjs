import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { loadGLB, PACKAGE_DIR, VARIANTS, sha256, unpackGLB } from './rig.mjs';

const distance = (a, b) => a.distanceTo(b);
const point = node => node.getWorldPosition(new THREE.Vector3());
const quat = node => node.getWorldQuaternion(new THREE.Quaternion()).normalize();
const round = n => Number(n.toFixed(9));
const onGround = (spec, side, phase) => spec.contact_windows[side].some(([a, b]) => phase >= a - 1e-8 && phase <= b + 1e-8);
const armLength = (nodes, a, b) => distance(point(nodes[a]), point(nodes[b]));

export async function inspectMotionPackage({ directory = PACKAGE_DIR, fps = 240, skinFps = 240 } = {}) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory))), bytes = await readFile(new URL(manifest.file, directory));
  const { json } = unpackGLB(bytes), animations = await loadGLB(manifest.file, directory), failures = [], variants = [];
  if (sha256(bytes) !== manifest.sha256) failures.push('Package hash mismatch');
  if ((json.meshes?.length ?? 0) || (json.materials?.length ?? 0) || (json.images?.length ?? 0) || (json.skins?.length ?? 0)) failures.push('Animation-only package must have no renderable surfaces');
  if (animations.animations.map(c => c.name).join('|') !== manifest.clips.map(c => c.name).join('|')) failures.push('Clip roster mismatch');
  for (const c of animations.animations) {
    if (!c.validate()) failures.push(`${c.name}: AnimationClip validation failed`);
    for (const tr of c.tracks) {
      if (tr.name.startsWith('root.')) failures.push(`${c.name}: root channel`);
      if ([...tr.values, ...tr.times].some(v => !Number.isFinite(v))) failures.push(`${c.name}: non-finite track`);
    }
  }
  const warnings = [];
  const savedWarn = console.warn; console.warn = (...args) => { warnings.push(args.join(' ')); };
  try {
    for (const variant of VARIANTS) {
      const gltf = await loadGLB(variant.file), scene = gltf.scene, nodes = {};
      scene.traverse(n => { if (n.name) nodes[n.name] = n; if (n.isMesh) n.visible = n.userData.visible !== false; });
      const body = nodes.body, position = body.geometry.getAttribute('position'), boots = { l: [], r: [] };
      for (let i = 0; i < position.count; i++) if (position.getY(i) < 0.18) boots[position.getX(i) < 0 ? 'l' : 'r'].push(i);
      const referenceLengths = {};
      for (const side of ['l', 'r']) for (const [a, b] of [['thigh', 'calf'], ['calf', 'foot'], ['upperarm', 'lowerarm'], ['lowerarm', 'hand']]) referenceLengths[`${a}_${side}`] = armLength(nodes, `${a}_${side}`, `${b}_${side}`);
      const rootPosition = nodes.root.position.clone(), rootQuaternion = nodes.root.quaternion.clone(), sceneTransform = scene.matrix.clone();
      const mixer = new THREE.AnimationMixer(scene), clips = [];
      for (const spec of manifest.clips) {
        const clip = animations.animations.find(c => c.name === spec.name), action = mixer.clipAction(clip).setLoop(THREE.LoopOnce); action.clampWhenFinished = true; action.play();
        for (const tr of clip.tracks) if (!nodes[tr.name.split('.')[0]]) failures.push(`${variant.file}/${spec.name}: absent binding ${tr.name}`);
        const n = Math.ceil(spec.duration_s * fps), t = new THREE.Vector3(), hand = new THREE.Vector3(), grip = new THREE.Vector3();
        const footMinimum = { l: Infinity, r: Infinity }, contactMinimum = { l: Infinity, r: Infinity }, contactMaximum = { l: -Infinity, r: -Infinity };
        const anchors = { l: new Map(), r: new Map() }, previous = {}, starts = {}, ends = {}, metrics = { maxGripError_m: 0, maxLengthError_m: 0, maxRootError_m: 0, maxRootAngle_rad: 0, maxJointStep_rad: 0, maxContactDrift_m: 0, minElbowChestDistance_m: Infinity, maxPelvisExcursion_m: 0, skinSamples: 0, finiteVertices: 0 };
        let firstHip;
        for (let i = 0; i <= n; i++) {
          const phase = i / n, time = phase * spec.duration_s; mixer.setTime(time); scene.updateMatrixWorld(true);
          metrics.maxRootError_m = Math.max(metrics.maxRootError_m, nodes.root.position.distanceTo(rootPosition));
          metrics.maxRootAngle_rad = Math.max(metrics.maxRootAngle_rad, nodes.root.quaternion.angleTo(rootQuaternion));
          const hp = point(nodes.hips); firstHip ??= hp.clone(); metrics.maxPelvisExcursion_m = Math.max(metrics.maxPelvisExcursion_m, hp.distanceTo(firstHip));
          for (const name of ['hips', 'spine_01', 'spine_02', 'spine_03', 'head', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'foot_l', 'foot_r', 'weapon']) {
            const q = nodes[name].quaternion.clone();
            if (!Number.isFinite(q.length()) || Math.abs(q.length() - 1) > 1e-5) failures.push(`${variant.file}/${spec.name}: invalid quaternion ${name}@${phase}`);
            q.normalize();
            if (previous[name]) metrics.maxJointStep_rad = Math.max(metrics.maxJointStep_rad, q.angleTo(previous[name]));
            previous[name] = q;
            if (i === 0) starts[name] = { p: point(nodes[name]), q: quat(nodes[name]) };
            if (i === n) ends[name] = { p: point(nodes[name]), q: quat(nodes[name]) };
          }
          for (const side of ['l', 'r']) {
            grip.fromArray(manifest.grips[side].pos); nodes.weapon.localToWorld(grip);
            hand.copy(point(nodes[`hand_${side}`])); metrics.maxGripError_m = Math.max(metrics.maxGripError_m, hand.distanceTo(grip));
            metrics.minElbowChestDistance_m = Math.min(metrics.minElbowChestDistance_m, point(nodes[`lowerarm_${side}`]).distanceTo(point(nodes.spine_02)));
            for (const [a, b] of [['thigh', 'calf'], ['calf', 'foot'], ['upperarm', 'lowerarm'], ['lowerarm', 'hand']]) metrics.maxLengthError_m = Math.max(metrics.maxLengthError_m, Math.abs(armLength(nodes, `${a}_${side}`, `${b}_${side}`) - referenceLengths[`${a}_${side}`]));
            const window = spec.contact_windows[side].findIndex(([a, b]) => phase >= a - 1e-8 && phase <= b + 1e-8);
            if (window >= 0) {
              const p = point(nodes[`foot_${side}`]); p.z -= spec.nominal_speed_mps * time;
              if (!anchors[side].has(window)) anchors[side].set(window, p.clone());
              metrics.maxContactDrift_m = Math.max(metrics.maxContactDrift_m, p.distanceTo(anchors[side].get(window)));
            }
          }
          if (i === n || i % Math.max(1, Math.round(fps / skinFps)) === 0) {
            metrics.skinSamples++;
            for (const side of ['l', 'r']) {
              let minimum = Infinity;
              for (const idx of boots[side]) {
                body.getVertexPosition(idx, t); t.applyMatrix4(body.matrixWorld);
                if (!t.toArray().every(Number.isFinite)) failures.push(`${variant.file}/${spec.name}: non-finite boot vertex`);
                minimum = Math.min(minimum, t.y); metrics.finiteVertices++;
              }
              footMinimum[side] = Math.min(footMinimum[side], minimum);
              if (onGround(spec, side, phase)) { contactMinimum[side] = Math.min(contactMinimum[side], minimum); contactMaximum[side] = Math.max(contactMaximum[side], minimum); }
            }
          }
        }
        let endpointPosition_m = 0, endpointAngle_rad = 0;
        for (const name of Object.keys(starts)) { endpointPosition_m = Math.max(endpointPosition_m, starts[name].p.distanceTo(ends[name].p)); endpointAngle_rad = Math.max(endpointAngle_rad, starts[name].q.angleTo(ends[name].q)); }
        const result = { name: spec.name, duration_s: clip.duration, samples: n + 1, ...Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, round(v)])), footMinimum_m: Object.fromEntries(Object.entries(footMinimum).map(([k, v]) => [k, round(v)])), contactMinimum_m: Object.fromEntries(Object.entries(contactMinimum).map(([k, v]) => [k, round(v)])), contactMaximum_m: Object.fromEntries(Object.entries(contactMaximum).map(([k, v]) => [k, round(v)])), endpointPosition_m: round(endpointPosition_m), endpointAngle_rad: round(endpointAngle_rad) };
        if (metrics.maxGripError_m > 0.003) failures.push(`${variant.file}/${spec.name}: wrist lost rifle grip (${metrics.maxGripError_m} m)`);
        if (metrics.maxLengthError_m > 1e-5 || metrics.maxRootError_m > 1e-9 || metrics.maxRootAngle_rad > 1e-9 || !scene.matrix.equals(sceneTransform)) failures.push(`${variant.file}/${spec.name}: root/limb changed`);
        if (Math.min(...Object.values(footMinimum)) < -0.0005) failures.push(`${variant.file}/${spec.name}: sole below ground`);
        if (Math.max(...Object.values(contactMaximum)) > 0.015) failures.push(`${variant.file}/${spec.name}: planted sole floated`);
        if (metrics.maxContactDrift_m > 0.004) failures.push(`${variant.file}/${spec.name}: planted foot drift`);
        if (spec.loop && (endpointPosition_m > 1e-5 || endpointAngle_rad > 1e-5)) failures.push(`${variant.file}/${spec.name}: loop endpoint jump`);
        if (metrics.minElbowChestDistance_m < 0.13) failures.push(`${variant.file}/${spec.name}: elbow inside chest envelope`);
        clips.push(result); mixer.stopAllAction(); mixer.uncacheClip(clip);
      }
      variants.push({ ...variant, skin_joints: body.skeleton.bones.length, clips });
    }
  } finally { console.warn = savedWarn; }
  if (warnings.length) failures.push(...warnings.map(w => `Binding warning: ${w}`));
  return { schema: 1, task: manifest.task, package_sha256: manifest.sha256, loader: 'Three.js GLTFLoader 0.186.1 (real mesh/skin/tracks; texture bindings removed only in Node)', sampler: 'AnimationMixer LoopOnce; bones and actual skinned boot vertices at 240 Hz, including interpolated subframes', fps, skinFps, variants, failures, warnings, pass: failures.length === 0 };
}
