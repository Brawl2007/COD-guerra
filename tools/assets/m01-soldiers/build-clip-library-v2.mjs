// Builds the soldier clip library V2: an animation-only GLB (bones + clips, no mesh, no texture, no root channel) next
// to the untouched character files, plus its manifest with the SHA-256 of every preserved file.
//   node tools/assets/m01-soldiers/build-clip-library-v2.mjs [--out dir] [--report file]
// Needs only `three` (GLTFExporter) and the preserved bind pose of the shipped character GLBs: no MakeHuman fetch.
// Two passes: export the GLB, measure it at 240 Hz with the real mixer (motion/library/audit.mjs), write the measured
// contacts / nominal speed / drift into each clip's `extras` and repack the JSON chunk (the binary chunk is unchanged).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { preservedRig, VARIANTS, CHARACTER_DIR, sha256, unpackGLB } from './motion/rig.mjs';
import { buildLibrary } from './motion/library/index.mjs';
import { parseGLB, sampleClip, auditSamples, signature, junction, HZ } from './motion/library/audit.mjs';

export const LIBRARY_DIR = new URL('clip-library-v2/', CHARACTER_DIR);
export const LIBRARY_FILE = 'm01_soldier_clip_library_v2.glb';
export const BASE_COMMIT = '11821bbb0e71a5e6a3447e00228754ff433d166a';
const SOURCE_FILES = ['build-clip-library-v2.mjs', 'motion/library/common.mjs', 'motion/library/audit.mjs', 'motion/library/index.mjs', 'motion/library/locomotion.mjs',
  'motion/library/posture.mjs', 'motion/library/idles.mjs', 'motion/library/reactions.mjs', 'motion/library/cover.mjs', 'motion/library/call.mjs'];
const PRESERVED = [...VARIANTS.map(v => v.file), 'm01_soldier_animations.glb', 'm01_station_animations.glb', 'manifest.json', 'station-animations.manifest.json',
  'motion-clips-v1/m01_soldier_motion_clips.glb', 'motion-clips-v1/manifest.json', 'station-drag-transitions/m01_station_drag_transitions.glb', 'station-drag-transitions/manifest.json'];

/** Acceptance limits of the audit (the test re-applies the same numbers). */
export const LIMITS = { contactDriftMm: 15, loopSeamMm: 1, loopSeamRad: 0.002, loopSeamVelocityShare: 0.25, nominalSpeedTolerance: 0.03, junctionMm: 2.5, junctionRad: 0.012, finalStillMm: 3, maxBoneSpeedMps: 12 };

/** Merges accessors with identical type, count, bounds and bytes (shared key times, constant tracks) and compacts the buffer. */
function dedupe(json, binary) {
  const slot = new Map(), remap = new Map(), accessors = [], views = [], chunks = []; let offset = 0;
  const canonical = index => {
    if (remap.has(index)) return remap.get(index);
    const a = json.accessors[index], v = json.bufferViews[a.bufferView], bytes = binary.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
    const key = [a.componentType, a.count, a.type, JSON.stringify(a.min ?? null), JSON.stringify(a.max ?? null), bytes.toString('base64')].join('|');
    if (!slot.has(key)) {
      const { byteOffset, ...view } = v;
      slot.set(key, accessors.length);
      views.push({ ...view, byteOffset: offset }); chunks.push(bytes); offset += bytes.length;
      const { bufferView, byteOffset: accessorOffset, ...rest } = a;
      accessors.push({ bufferView: views.length - 1, ...(accessorOffset ? { byteOffset: accessorOffset } : {}), ...rest });
    }
    remap.set(index, slot.get(key)); return slot.get(key);
  };
  for (const anim of json.animations) for (const sampler of anim.samplers) { sampler.input = canonical(sampler.input); sampler.output = canonical(sampler.output); }
  json.accessors = accessors; json.bufferViews = views; json.buffers[0].byteLength = offset;
  return Buffer.concat(chunks);
}

function pack(buffer, patch) {
  const unpacked = unpackGLB(Buffer.from(buffer)), json = unpacked.json;
  patch(json);
  const binary = dedupe(json, unpacked.binary);
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20); text.copy(padded);
  const glb = Buffer.alloc(28 + padded.length + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + padded.length); glb.writeUInt32LE(0x004e4942, 24 + padded.length); binary.copy(glb, 28 + padded.length);
  return glb;
}

async function exportGLB(scene, clips) {
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); } };
  try { return await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, onlyVisible: false }); }
  finally { if (previousReader) globalThis.FileReader = previousReader; else delete globalThis.FileReader; }
}

/** Extras of one clip: runtime keys of the shipped clips (fps, loop, pose, speed_mps, events), the plan keys, the measurement. */
function extrasOf(entry, audit, junctions) {
  const { audit: model, locomotion, ...meta } = entry.meta, loco = locomotion;
  const { contacts, ...measured } = audit;
  return {
    fps: entry.fps, loop: entry.loop, pose: meta.pose, ...(loco ? { speed_mps: loco.speedMps, cycle_distance_m: loco.cycleM } : {}),
    semantic: meta.semantic, family: meta.family, mask: meta.mask, interrupt: meta.interrupt, durationS: entry.duration,
    nominalSpeedMps: loco?.speedMps ?? 0, cycleDuration: entry.loop ? entry.duration : 0, strideM: loco?.stepM ?? 0, ...(loco ? { gait: loco.gait } : {}),
    contacts, events: meta.events ?? {},
    ...Object.fromEntries(Object.entries(meta).filter(([k]) => !['semantic', 'family', 'mask', 'interrupt', 'pose', 'events'].includes(k))),
    ...(entry.source ? { source: entry.source } : {}),
    audit: { model, ...measured, ...(junctions ? { junction: junctions } : {}) },
  };
}

function failuresOf(name, extras) {
  const a = extras.audit, f = [], bad = msg => f.push(`${name}: ${msg}`);
  if (a.rootDisplacementM > 1e-6) bad(`root moves ${a.rootDisplacementM} m`);
  if (a.maxContactDriftMm > LIMITS.contactDriftMm) bad(`contact drift ${a.maxContactDriftMm} mm`);
  if (a.maxBoneSpeedMps > LIMITS.maxBoneSpeedMps) bad(`bone speed ${a.maxBoneSpeedMps} m/s`);
  if (extras.loop) {
    if (a.loopSeam.positionMm > LIMITS.loopSeamMm || a.loopSeam.angleRad > LIMITS.loopSeamRad) bad(`loop seam ${JSON.stringify(a.loopSeam)}`);
    if (a.loopSeam.velocityMps > Math.max(0.05, LIMITS.loopSeamVelocityShare * a.maxBoneSpeedMps)) bad(`loop velocity seam ${a.loopSeam.velocityMps} m/s of ${a.maxBoneSpeedMps}`);
  }
  if (a.model.mode === 'locomotion') {
    if (!a.measuredNominalSpeedMps) bad('no support phase measured');
    else if (Math.abs(a.measuredNominalSpeedMps - a.model.speedMps) / a.model.speedMps > LIMITS.nominalSpeedTolerance) bad(`nominal ${a.model.speedMps} vs measured ${a.measuredNominalSpeedMps}`);
  }
  for (const [k, j] of Object.entries(a.junction ?? {})) if (j.positionMm > LIMITS.junctionMm || j.angleRad > LIMITS.junctionRad) bad(`junction ${k} ${JSON.stringify(j)}`);
  if (a.finalStillMm !== undefined && a.finalStillMm > LIMITS.finalStillMm) bad(`final pose moves ${a.finalStillMm} mm`);
  return f;
}

export async function generateClipLibrary(out = LIBRARY_DIR) {
  const rig = await preservedRig(), entries = buildLibrary(rig.R), sourceRigs = [];
  for (const variant of VARIANTS) {
    const other = await preservedRig(variant.file);
    if (JSON.stringify(other.offsets) !== JSON.stringify(rig.offsets)) throw new Error(`Bind-pose mismatch: ${variant.file}`);
    sourceRigs.push({ ...variant, sha256: sha256(other.bytes), skin_joints: other.json.skins[0].joints.length });
  }
  rig.scene.name = 'm01_clip_library_v2_rig';
  rig.scene.userData = { task: 'M01-ANIM-CLIP-LIBRARY-V2', units: 'metres', up: '+Y', forward: '-Z', original_animation: true, meshes: 0, runtime_integration: false };
  const pass1 = await exportGLB(rig.scene, entries.map(e => e.clip)), gltf = await parseGLB(pass1), mixer = new THREE.AnimationMixer(gltf.scene);
  const samples = {};
  for (const e of entries) samples[e.name] = sampleClip(gltf.scene, mixer, gltf.animations.find(c => c.name === e.name));

  // Reference poses for the junctions: shipped clips (t = 0) and the library's own idle poses.
  const base = await parseGLB(await readFile(new URL('m01_soldier_animations.glb', CHARACTER_DIR))), baseMixer = new THREE.AnimationMixer(base.scene), refs = {};
  for (const name of ['standing_idle', 'crouched_idle', 'seated']) refs[`${name} t0`] = signature(sampleClip(base.scene, baseMixer, base.animations.find(c => c.name === name))[0]);
  for (const e of entries) refs[`${e.name} t0`] = signature(samples[e.name][0]);

  const failures = [], extras = {};
  for (const e of entries) {
    const clip = gltf.animations.find(c => c.name === e.name), s = samples[e.name];
    const audit = auditSamples(s, clip, { model: e.meta.audit, loop: e.loop, stillS: e.meta.audit.final_still_s ?? 0 });
    const junctions = {}, m = e.meta, parse = ref => ref?.match(/^([a-z_0-9]+ t0)/)?.[1];
    const start = parse(m.reference_start ?? m.reference), end = parse(m.reference_end ?? m.reference);
    if (start) junctions.start = { ref: start, ...junction(signature(s[0]), refs[start]) };
    if (end) junctions.end = { ref: end, ...junction(signature(s.at(-1)), refs[end]) };
    if ((m.reference === 'frame 0')) junctions.end = { ref: 'own frame 0', ...junction(signature(s.at(-1)), signature(s[0])) };
    extras[e.name] = extrasOf(e, audit, Object.keys(junctions).length ? junctions : null);
    failures.push(...failuresOf(e.name, extras[e.name]));
  }
  const glb = pack(pass1, json => {
    json.asset.generator = 'COD Guerra original M01 soldier clip library v2';
    for (const a of json.animations) a.extras = extras[a.name];
  });
  const generationSources = [];
  for (const file of SOURCE_FILES) generationSources.push({ file: `tools/assets/m01-soldiers/${file}`, sha256: sha256(await readFile(new URL(file, import.meta.url))) });
  const reused = {};
  for (const file of PRESERVED) { const bytes = await readFile(new URL(file, CHARACTER_DIR)); reused[`assets/models/provisional/m01/characters/${file}`] = { bytes: bytes.length, sha256: sha256(bytes) }; }
  const manifest = { schema: 1, task: 'M01-ANIM-CLIP-LIBRARY-V2', roadmap: 'T08', file: LIBRARY_FILE, bytes: glb.length, sha256: sha256(glb), base_commit: BASE_COMMIT,
    author: 'Original COD Guerra motion authored in this repository; existing M01 FK/IK solver reused', license: 'Original project animation; repository-wide licence remains for the owner to decide. No animation copied from games or external motion libraries.',
    units: 'metres', up: '+Y', forward: '-Z', root_motion: false, mesh_count: 0, material_count: 0, texture_count: 0, additional_draw_calls: 0,
    reference_rig: 'm01_soldier_pl_lod1.glb', source_rigs: sourceRigs, reused, generation_sources: generationSources,
    audit: { sample_hz: HZ, instrument: 'three.js GLTFLoader + AnimationMixer, foot_l/foot_r ankle proxy (tools/assets/m01-soldiers/motion/library/audit.mjs; method of the rifleman locomotion pilot audit)', limits: LIMITS, failures },
    clips: entries.map(e => ({ name: e.name, ...extras[e.name] })),
    integration: { runtime_loaded: false, resolver_hooks: 'm01-animation-resolver already selects `sprint` and `crouch_walk` by name when present; no other name is referenced by src/',
      overlap_with_motion_clips_v1: ['sprint', 'crouch_walk', 'hit_front', 'near_miss_duck'], overlap_policy: 'identical track data (tests/m01-soldiers-glb.test.js); load either package, not both under different semantics',
      all_clips_in_place: true, event_policy: 'Events are clip-local seconds for presentation only; combat events come from the simulation.' } };
  await mkdir(out, { recursive: true });
  await writeFile(new URL(LIBRARY_FILE, out), glb);
  await writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
  const dir = arg('--out') ? new URL(`file://${resolve(arg('--out'))}/`) : LIBRARY_DIR;
  const manifest = await generateClipLibrary(dir);
  if (arg('--report')) await writeFile(resolve(arg('--report')), JSON.stringify({ clips: manifest.clips.map(c => ({ name: c.name, durationS: c.durationS, loop: c.loop, family: c.family, mask: c.mask, contacts: c.contacts, ...c.audit })), failures: manifest.audit.failures }, null, 2) + '\n');
  console.log(JSON.stringify({ file: manifest.file, bytes: manifest.bytes, sha256: manifest.sha256, clips: manifest.clips.length, failures: manifest.audit.failures }, null, 1));
  process.exitCode = manifest.audit.failures.length ? 1 : 0;
}
