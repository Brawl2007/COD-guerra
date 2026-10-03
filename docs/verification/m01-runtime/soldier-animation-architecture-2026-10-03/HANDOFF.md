# HANDOFF — M01-SOLDIER-LOCOMOTION-ANIMATION-ARCHITECTURE-V1

## TASK_ID
`M01-SOLDIER-LOCOMOTION-ANIMATION-ARCHITECTURE-V1`

## MODELO
GPT-5.6 Sol

## ESFORÇO
HIGH

## BASE
`codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

## BRANCH
`codex/m01-soldier-locomotion-animation`

## HEAD FINAL
Read the final branch ref after this handoff commit; report the exact SHA to the captain. No merge to `main` is part of this task.

## COMMITS
The branch uses separate commits for audit, architecture, prototype, restore clarification, focused tests and final evidence/handoff. Exact SHAs are reported from the final branch history.

## CURRENT ANIMATION AUDIT
`CURRENT_ANIMATION_AUDIT.md` classifies the existing system as EXISTS / PARTIAL / PLACEHOLDER / MISSING. The current rig, idle/walk/run, crouch idle, weapon clips, suppression basic pose, MG34 prone, station drag, deterministic phase offsets, LOD skeleton reduction, pause and basic restore behavior exist. Generic crouch-walk/prone-crawl/strafe/backpedal/turn-in-place, speed matching, crossfades, upper/lower-body layering, runtime IK, aim offsets and generic hit reactions are missing or placeholders.

## STATE MODEL
Animation consumes authoritative AI/simulation data and returns a presentation plan with orthogonal axes: base locomotion, posture/transition, visual body yaw, bounded aim offset, upper-body weapon layer, reaction, cover metadata, additive detail and IK targets. It never changes tactics, HP, actor world transform, hitboxes, ammo or shot timing.

The approved Combat AI `Intent` is the upstream seam; animation treats `desiredPosture` as a request until simulation exposes an accepted physical posture.

## LOCOMOTION
Semantic states cover idle, walk, run, crouch idle/walk, prone/crawl, backpedal, strafe and turn-in-place. Missing clips remain explicit missing semantics rather than being falsely marked complete.

World movement is authoritative. For in-place locomotion, playback uses `worldSpeed / nominalClipSpeed` inside an asset-specific safe range. Outside the safe range, choose a neighboring gait rather than extreme time-warping. The prototype proves the relation but its speed thresholds are not final asset measurements.

## POSTURE
Stand/crouch/prone/mounted/dragging are authoritative whenever they affect physical gameplay. Animation owns only visual blending. Large suppression silhouette changes require simulation to accept the lower posture first. MG34 prone remains the proven special-case reference and is untouched.

## AIM
Aim yaw/pitch is a bounded upper-body presentation offset. A twist beyond the asset limit is clamped and flagged as requiring body follow; animation never permits 180° torso twist. Final twist limits must be measured from real rig/weapon poses.

## TURNING
`visualBodyYaw` follows authoritative facing at a bounded presentation rate. Stationary large yaw differences request turn-left/right semantics; moving actors use locomotion turning instead of turn-in-place. Visual yaw does not rewrite authoritative actor facing or hitboxes.

## WEAPON ALIGNMENT
Current rig already has `hand_l`, `hand_r`, `weapon`, `weapon_bolt`, `weapon_mag`, `weapon_clip`. Current rifle/rkm data already exposes `grip_r`, `grip_l`, `muzzle`, `rear_sight`, `butt` and mechanism points. Future IK should align hands/stock from these sockets. Visual muzzle remains presentation only; simulation/spatial code remains shot authority.

## FIRE/RELOAD
Fire/recoil and reload/bolt are upper-body weapon layers over base locomotion when a weapon policy allows it. Animation never decides whether fire/reload is legal. Weapon-specific policies decide which layers are blocked; crew-served reloads do not inherit rifle rules automatically.

## SUPPRESSION
Animation can show directional flinch, duck/head response and a tighter pose from authoritative suppression/pinned inputs. It cannot alter suppression value, AI action or hitbox. Pinned actors only become physically crouched/prone after authoritative posture acceptance.

## COVER
Future cover animation consumes read-only cover kind/side/height/peek/normal/anchor. Needed semantics include low/high cover, corner peeks, window fire and doorway lean. Animation does not reserve cover, decide LOS or bend actors through walls.

## IK
Future contracts cover feet-to-ground, hands-to-weapon and mount/interaction handles. Foot/hip corrections are bounded presentation offsets and never move gameplay root. Missing weapon sockets disable hand IK instead of inventing targets.

## LOD
Core semantic animation resolution is independent of camera and quality. A separate fidelity policy may reduce skeleton complexity, update frequency, IK, secondary motion and additive layers. LOD never changes world transform, posture/hitbox, AI intent, shots, ammo, health/death or save state. Prototype fidelity Hz values are budgets for architecture only, not measured renderer performance.

## PAUSE
Gameplay-linked animation uses mission/simulation clock and authoritative action timestamps. The prototype proves that phase, posture-transition progress and visual yaw do not advance while the simulation state is paused/frozen.

## SAVE/RESTORE CONTRACT
Schema 2 is unchanged. Cosmetic idle detail can be reconstructed from mission clock + actor ID. Exact speed-matched locomotion stride phase may need either deterministic reconstruction from authoritative movement history/distance or a compact future presentation field such as `locomotionPhaseCycles`. Gameplay-linked fire/reload/posture/specialized actions should use authoritative timestamps/phases. Generic transition continuity should prefer reconstruction; only a reviewed future schema migration should persist compact presentation state.

## DETERMINISM
Actor-ID hashing supplies phase/idle/detail variation without gameplay RNG. Same state/time/ID gives the same plan. Camera and quality do not change semantic state. Benchmark checksums were identical across all three runs.

## TOOLS
`tools/verification/m01-soldier-animation-state-prototype.mjs`

Pure Node mathematical/state prototype; no GLB load and no production import.

## TESTS
`tests/m01-soldier-animation-state-prototype.test.js`

Focused: **27/27 PASS**. Full repository Node: **251/251 PASS**. Build: **PASS**.

## PERFORMANCE
Isolated prototype benchmark: 3 × 50,000 decisions, median **34.1645261 µs/decision**, identical checksum. This is only state/math cost in the sandbox — not FPS, GPU, mixer, skinning or Chromebook evidence.

## LIMITATIONS
- semantic states exist in architecture even where clips are missing;
- nominal clip speeds and safe playback bands are prototype parameters until measured from the actual assets;
- no production bone masks/crossfades are implemented;
- no runtime hand/foot IK exists;
- no generic aim-offset clip/additive asset exists;
- no generic hit-reaction clip set exists;
- no browser visual comparison was performed because production renderer/assets were not changed;
- MG34 prone and station drag remain specialized systems by design.

## RISKS
- animation accidentally becoming movement authority;
- visual body lag diverging too far from gameplay muzzle/hitbox;
- speed warping causing foot slide instead of gait switching;
- upper-body masks breaking hand/weapon alignment;
- quality/LOD accidentally changing semantic decisions;
- generic resolver overriding MG34 prone or station drag;
- saving too much renderer state and destabilizing schema/determinism;
- suppression visuals changing silhouette without matching hitbox.

## NEXT STEP
Create a separate production-integration branch from the captain-approved consolidated base. Start only with ordinary riflemen and idle/walk/run crossfades + measured speed matching. Measure real clip cadence/foot contacts first. Keep MG34 prone/station drag on their existing adapters. Then add crouch-walk/turn-in-place assets, upper-body aim/fire masks, and finally IK behind fidelity gates.

## RECOMMENDATION
Architecture is ready for later integration but should **not** be merged as gameplay functionality from this branch. First production slice should solve visible sliding and hard idle/walk/run transitions for a small non-critical actor subset while proving that actor transforms, hitboxes, shots, AI decisions and save results stay byte/semantically equivalent. Only after that should aim layering and IK be introduced.

M01 remains **PROTÓTIPO JOGÁVEL**.
