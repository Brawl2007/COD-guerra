# Wz.29 first-person audit and presentation contract

TASK_ID: `M01-FIRST-PERSON-WZ29-VIEWMODEL-VISUAL-RUNTIME-PASS-V1`.
Requested model/effort: GPT-6.1 Sol / HIGH. No delegation.
Exact base: `codex/m01-schema2-determinism-audit` at `5f3cc34f53c61beec52255d67f8babd7194c9f7f`.
Branch: `codex/m01-wz29-viewmodel-visual-runtime`.
M01 remains **PROTÓTIPO JOGÁVEL**.

## Actual base path, inspected before editing

`src/render/m01-view.js` creates `M01ViewModel(weaponScene, characters, atmosphere.texture)` and renders it through a separate 58° camera, near 0.03 m. `src/render/m01-characters.js` loads `assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb`, LOD1/2 and `m01_soldier_animations.glb` on every preset. The normal viewmodel clones the actual Polish rig with SkeletonUtils; it draws the `body` arm/hand subset, skinned `rifle` and `clip` meshes. A 32-triangle cartridge already exists for partial reload. The atlas embeds wood grain, surface wear, metal masks and normal/roughness textures. This is not a replacement procedural rifle.

Required clips: `aim`, `reload_clip`, `fire_bolt`, `carry_wounded`, `carried`. A station-only clip cannot activate the viewmodel. LOD0 supplies all presets; LOD1 supplies fallback when LOD0 fails. Missing required models/clips returns false to the existing procedural presentation in M01View. Missing optional content cannot freeze gameplay. World actors, MG34, CKM and station clips use the separate unchanged M01Characters path.

The old `codex/m01-viewmodel-visual-v2` at `3e879e7406109b4e03c1bb9d21631a11a6736f33` was read, not merged. It included clavicle-influenced geometry and a different ADS depth. Neither was treated as an approved correction for this base. Environment PR #41 at `5325b7b3ef678079ef08b32f8172ed62934ffe1c` was not merged or edited.

## Measured geometry and clips

GLTFLoader reads the original bytes. Node omits only texture bindings because it has no image decoder; Chromium decodes the real embedded textures. The archived base module is byte-identical to the base file and checked by SHA-256.

| Clip | Actual GLB duration | Existing authority |
| --- | ---: | --- |
| aim | 2.000000000 s | READY; visual stance only |
| fire_bolt | 1.169999957 s | BOLT_CYCLE, 1.05 s authoritative duration |
| reload_clip | 3.400000095 s | RELOAD_CLIP, 3.4 s; RELOAD_SINGLE, 0.8 s per cartridge |

Mechanical clips are sampled at `(clock*1000-started)/(until-started)` times their actual duration. Clip events such as eject/chamber/open/strip are visual metadata, never gameplay events. The single-round visual continues to use the real existing reload clip and cartridge, with the five-round clip hidden. It does not change capacity, interrupt rules or ammunition commits. No new authoritative bolt or reload states exist.

The asset frame has barrel along -Z, Y up, X right. Rear socket: `[0,0.056,-0.29]`; front blade tip: `[0,0.065,-0.752]`; muzzle: `[0,0.032,-0.765]`, metres. The actual simplified GLB blade vertices in both usable LODs reach Y=0.064999938 m, within 0.000001 m of the chosen front landmark. Rear is the provided asset socket; the tangent sight geometry is simplified, with no newly invented notch or markings.

## Camera and gameplay separation

Gameplay origin remains `src/world/spatial.js:muzzlePosition`, using the player's data eye/direction and existing 1.05 m forward offset. M01Simulation.fire still uses the eye ray plus the original muzzle obstruction test. Damage, spread, shots, ammo, reserve, reload timers, RNG, recoil authority, world/camera transforms, movement, hitboxes, AI, objectives, checkpoints, clocks and schema 2 are unchanged. M01View, the gameplay modules and all assets are byte-identical to the base.

Only the cloned presentation root moves. The camera forward axis is `[0,0,-1]` in the weapon scene. A basis built from the actual sight line and weapon up vector aligns the line before applying visual hip/reload/run/recoil offsets. Complete idle ADS places rear at `[0,0,-0.74]` and front approximately `[0,0,-1.202087654]`. It does not create root motion, camera shake, a new shooting origin or aiming authority.

The flash is parented to the weapon bone at the provided muzzle socket. Its size changes from 0.14 m to 0.105 m. The same real shot/flash window controls visibility. BASE already has zero socket-to-flash error: this invariant is preserved and now tested across poses.

## Arms, materials and motion

The source third-person geometry, skeleton and animation bytes are preserved. The first-person arm geometry clone normalizes its retained arm weights to remove the residual clavicle pull at the cut sleeve edge. A local two-segment solve places sleeve anchors below the camera while preserving the original mechanical hand targets and orientations. The right READY grip target becomes `[0.055,-0.025,0.065]` in weapon space; the adjustment fades out while the GLB operates the bolt/loads ammunition. This is a first-person correction, not generic IK for soldiers. Fingers retain the existing authored transforms.

ADS uses an exponential visual blend with 0.045 s time constant; movement 0.09 s; run 0.10 s. Blend advances only with mission-clock dt, capped at 0.05 s. The real `moveBlend` is calculated by M01Simulation from actual world displacement; real `sprinting` selects the running pose. No new sprint mechanic exists. Bob is 3 mm lateral / 4–8 mm vertical at full movement, attenuated in ADS/reload. Idle breath is 1.2 mm, sampled from mission time. Phase is presentation-only; a replaced save/checkpoint world reconstructs flags and phase instead of blending from the menu. Repeated clock/state samples retain the exact pose. No mixer or phase is saved.

The existing mechanical clips remain absolute samples, including their endpoint clamp. They are reapplied before local arm correction so PropertyMixer cannot retain externally posed constant tracks. ADS/run smoothing occurs in the presentation pose, not a wall-clock mixer fade. The recoil envelope is finite and deterministic: a damped impulse ends at 0.42 s, with weaker ADS displacement/rotation. The original clip's whole-rifle kick is normalized by sight alignment before this envelope, avoiding stacked recoil. No gameplay RNG is read.

The rifle alone gets a cloned material, retaining the existing atlas and masks. Slight neutral color attenuation, 0.65 normal scale, wood roughness floor 0.70, metal roughness floor 0.55 and metalness cap 0.74 reduce glossy/plastic readings. Existing wood grain/wear remains; no new textures, inscriptions, accessories or history claims are introduced. The world atlas remains untouched.

## Numerical evidence and limits

At 1280×720 and 58° weapon FOV, idle ADS BASE rear/front error is 0.521518 px horizontal / 8.691911 px vertical. Candidate is below 0.000001 px on both axes; tolerance 0.5 px. This tolerance applies after ADS completes, outside recoil/reload. Recoil intentionally moves the line temporarily; it does not steer the shot. All captured visual muzzle/flash distances are exactly 0 m, tolerance 1e-8 m.

The clipping checker skins every referenced visible mesh vertex into camera space and tests Z < -0.03 m. Dense Node sweeps cover 560 state/pose samples over READY, BOLT_CYCLE, RELOAD_CLIP, RELOAD_SINGLE, hip/ADS, movement/run and LOD0/1. Browser captures also cover pause, save/load and checkpoint restore. This proves near-plane clearance for the sampled mesh vertices, not universal absence of hand/rifle self-intersections. Grip contact is measured separately; hand facets, simplified finger shape and the solid tangent sight remain asset limitations requiring artistic review. No zero-sliding, historically perfect rifle or commercial-game quality claim is made.

## Reproduction

```sh
node --test tests/m01-wz29-viewmodel.test.js
node tools/verification/m01-wz29-viewmodel-audit.mjs --base
node tools/verification/m01-wz29-viewmodel-audit.mjs
CHROME_EXECUTABLE=/path/to/chromium node tools/verification/m01-wz29-viewmodel-evidence.mjs
npm ci
npm test
npm run build
CHROME_EXECUTABLE=/path/to/chromium npm run test:browser
```

Evidence uses the actual production M01View/GLBs with genuine simulation-control snapshots, restored to fixed clock/state/camera/FOV. It is staged browser verification, not a human or uninterrupted playthrough. A–H are the required BASE/CANDIDATE pairs; I–M add single cartridge, ADS walk/fire, save and checkpoint cases. `pairs.html` lays out unmodified screenshots side by side; `*-pair.png` captures that browser layout. `browser-metrics.json` keeps per-preset diagnostics and separate full-scene/weapon render counters.

All measurements are **LOCAL**, Chromium/SwiftShader. No GitHub Actions or CI result is inferred. Counters are not FPS. **FPS EM CHROMEBOOK NÃO MEDIDO.** Final validation results, failures encountered and recommendation are in HANDOFF.md.
