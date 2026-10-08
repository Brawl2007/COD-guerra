import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { preservedRig, VARIANTS, CHARACTER_DIR, PACKAGE_DIR, sha256, unpackGLB } from './motion/rig.mjs';
import { buildClips, GRIPS } from './motion/clips.mjs';

const SOURCE_FILES = ['build-motion-clips.mjs', 'motion/rig.mjs', 'motion/clips.mjs', 'src/human.mjs', 'src/pose.mjs', 'src/meshops.mjs'];
function withMetadata(buffer, metadata) {
  const { json, binary } = unpackGLB(Buffer.from(buffer));
  for (const a of json.animations) a.extras = metadata.find(m => m.name === a.name);
  json.asset.generator = 'COD Guerra original M01 soldier motion clips v1';
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20); text.copy(padded);
  const glb = Buffer.alloc(28 + padded.length + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + padded.length); glb.writeUInt32LE(0x004e4942, 24 + padded.length); binary.copy(glb, 28 + padded.length);
  return glb;
}

export async function generateMotionPackage(out = PACKAGE_DIR) {
  const rig = await preservedRig(), authored = buildClips(rig.R), sourceRigs = [];
  for (const variant of VARIANTS) {
    const other = await preservedRig(variant.file);
    if (JSON.stringify(other.offsets) !== JSON.stringify(rig.offsets)) throw new Error(`Bind-pose mismatch: ${variant.file}`);
    sourceRigs.push({ ...variant, sha256: sha256(other.bytes), skin_joints: other.json.skins[0].joints.length });
  }
  rig.scene.name = 'm01_motion_clip_rig';
  rig.scene.userData = { task: 'M01-SOLDIER-MOTION-CLIPS-PRODUCTION-V1', units: 'metres', up: '+Y', forward: '-Z', original_animation: true, meshes: 0, runtime_integration: false };
  const previousReader = globalThis.FileReader;
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); } };
  let buffer;
  try { buffer = await new GLTFExporter().parseAsync(rig.scene, { binary: true, animations: authored.map(x => x.clip), onlyVisible: false }); }
  finally { if (previousReader) globalThis.FileReader = previousReader; else delete globalThis.FileReader; }
  const glb = withMetadata(buffer, authored.map(x => x.meta));
  const generationSources = [];
  for (const file of SOURCE_FILES) generationSources.push({ file: `tools/assets/m01-soldiers/${file}`, sha256: sha256(await readFile(new URL(file, import.meta.url))) });
  const manifest = { schema: 1, task: 'M01-SOLDIER-MOTION-CLIPS-PRODUCTION-V1', file: 'm01_soldier_motion_clips.glb', bytes: glb.length, sha256: sha256(glb), base_commit: 'd070225d49840f5bd304a0825c0656651b82c26d',
    author: 'Original COD Guerra motion authored in this repository; existing M01 FK/IK solver reused', license: 'Original project animation; repository-wide licence remains for the owner to decide. No animation copied from games or external motion libraries.',
    units: 'metres', up: '+Y', forward: '-Z', root_motion: false, mesh_count: 0, material_count: 0, texture_count: 0, additional_draw_calls: 0,
    reference_rig: 'm01_soldier_pl_lod1.glb', source_rigs: sourceRigs, generation_sources: generationSources, grips: GRIPS, clips: authored.map(x => x.meta),
    integration: { runtime_loaded: false, names_are_additional: true, specialized_adapters_first: ['MG34', 'RKM', 'CKM', 'carry', 'drag', 'seated', 'wounded', 'dead'], turn_yaw: 'hips/spine/weapon contain visual yaw; root has no channels. Compensate authored yaw on a presentation-only group to avoid applying bodyYaw twice.', event_policy: 'Read actual hitAt/suppressedAt. Do not generate combat events from a clip or trigger locomotion solely from clock time.' },
  };
  await mkdir(out, { recursive: true });
  await writeFile(new URL('m01_soldier_motion_clips.glb', out), glb);
  await writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out'), output = i >= 0 ? new URL(`file://${resolve(process.argv[i + 1])}/`) : PACKAGE_DIR;
  const manifest = await generateMotionPackage(output);
  console.log(JSON.stringify({ file: manifest.file, bytes: manifest.bytes, sha256: manifest.sha256, clips: manifest.clips.map(c => c.name), rig_variants: manifest.source_rigs.length }));
}
