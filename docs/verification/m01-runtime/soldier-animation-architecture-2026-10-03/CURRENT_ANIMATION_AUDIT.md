# Current soldier animation audit

TASK_ID: `M01-SOLDIER-LOCOMOTION-ANIMATION-ARCHITECTURE-V1`

Base audited: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

No production file is changed by this task.

## Rig / skeleton

**EXISTS.** The current soldier kit has a full gameplay presentation rig with 61 bones at LOD0/1 and a reduced 28-bone LOD2. Core bones include root/hips/spine chain/head, paired clavicle/upperarm/lowerarm/hand, fingers, thighs/calves/feet/balls, plus `weapon`, `weapon_bolt`, `weapon_mag`, `weapon_clip` and `carry_socket`.

The rig is in metres, +Y up, model forward -Z. LOD2 removes finger/eye/jaw influence for cheaper presentation without changing actor simulation data.

## Existing generic clips

**EXISTS:** `standing_idle`, `aim`, `fire_bolt`, `reload_clip`, `walk`, `run`, `crouched_idle`, `pinned`, `sapper_work`, `sapper_work_pinned`, `carry_wounded`, `carried`, `wounded`, `fallen`, `seated`.

**EXISTS for rkm wz.28:** `rkm_standing_idle`, `rkm_walk`, `rkm_run`, `rkm_aim`, `rkm_fire_burst`, `rkm_crouched_idle`, `rkm_prone`, `rkm_prone_fire`, `rkm_reload`, `rkm_clean`.

**MISSING as generic clips:** crouch walk, generic prone locomotion/crawl, backpedal, strafe, turn-in-place, stand↔crouch transition clips, generic stand↔prone transition, doorway/window/peek variants, generic hit-reaction clips and locomotion-aware fire/reload layers.

## Current locomotion selection

**PARTIAL / PLACEHOLDER.** `M01Characters.sample()` picks one whole-body clip. Generic actors use `walk` while moving, and `grp_east_platoon` uses `run`. Kowal uses rkm walk/run. There is no lower-body locomotion layer under aim/fire/reload.

`actorPose()` defines `moving` only when pose is standing, not suppressed, not firing and actor state is `ADVANCE`/`RETREAT`. Therefore a crouched moving actor has no real crouch-walk presentation, and firing/aiming generally stops locomotion presentation even when world movement could continue in a future AI system.

## Speed matching / foot sliding

**MISSING.** Generic clip time is sampled as mission time plus an actor-ID offset. Actual actor displacement or commanded m/s is not used to drive playback rate. The procedural fallback similarly uses `time*7 + actor-number` for stride.

The station drag is a useful exception: its manifest explicitly records `speed_mps: 0.65`, matching the simulation drag speed. That is a model for future locomotion metadata, not a generic runtime system.

## Transition blending

**MISSING for generic soldiers.** When clip name changes, the renderer stops all actions and starts the new action, then resets/plays and directly sets mixer time. There is no generic crossfade/transition graph for stand↔walk, walk↔run, stand↔crouch, aim↔move or fire/reload interruption.

**EXISTS for specific authored systems:** MG34 prone has phase/timing clips and station drag has paired grab/release clips. These are explicit special cases and must remain untouched.

## Facing / turning

**PLACEHOLDER.** Each render update directly sets root yaw from authoritative `actor.facing`. There is no animation-owned body-facing state, angular velocity, turn-in-place or upper-body twist budget. If gameplay facing changes sharply, the visible body can rotate instantly.

## Aim / upper body

**PARTIAL.** `aim` and weapon-specific aim clips exist. `actorPose()` can mark aiming/firing from authoritative actor state. However there is no layered upper-body aim offset over locomotion, no spine/shoulder twist limit and no generic aim-vs-body facing separation.

## Weapon / hands alignment

**EXISTS in asset authoring, PARTIAL at runtime.** The rig has `hand_l`, `hand_r`, a `weapon` bone and weapon sockets. Rifle profiles expose `grip_r`, `grip_l`, `muzzle`, `rear_sight`, `butt`, bolt/clip points; rkm also exposes grip/muzzle/butt/bipod points. Baked clips use IK/pose solvers in the asset tools.

Runtime does not currently run generic hand-to-weapon IK. Alignment is only as good as the baked clip and attached weapon transform. There is no generic stock/shoulder runtime constraint. The visual muzzle socket is presentation data and must not become gameplay authority.

## Fire / reload

**PARTIAL.** Fire clips (`fire_bolt`, rkm/MG bursts) and reload clips exist. Their timing is sampled from authoritative gameplay-linked fields such as `firedAt`, weapon state and MG34 phase. This is correct ownership.

But the renderer selects one whole-body clip, so generic locomotion + aim + recoil layering does not exist. Reload blocks the visual whole-body action even where a future weapon design might permit slow movement. Weapon-specific restrictions need metadata/policy rather than one global rule.

## Hit reaction / death

**HIT REACTION: MISSING/PARTIAL.** Simulation can set `HIT_REACTION`, but there is no generic dedicated hit-reaction clip/layer in the current character clip inventory.

**DEATH: EXISTS basic.** `alive=false` selects `fallen` at the end of its clip. Animation does not decide casualty. There is no death-clip variation or ragdoll system.

## Suppression

**EXISTS basic / PARTIAL future.** Authoritative `suppressedUntil` produces `pinned`/lowered presentation for allies and special MG34 behavior. This is presentation of simulation state, not tactical decision-making. Directional suppression pose, source-direction ducking and rushed locomotion variants are missing.

## Cover / doorways / windows

**PLACEHOLDER / MISSING.** Current renderer has crouched/pinned/aim poses but no typed low-cover/high-cover/left-peek/right-peek/window/doorway pose contract. No procedural lean or cover-side animation resolver exists.

## IK / terrain

**ASSET-TOOL IK EXISTS; RUNTIME IK MISSING.** Asset generation uses two-bone IK and measured contacts. Runtime generic soldiers do not use foot IK, hand IK, mount IK or terrain-normal adaptation. Feet therefore cannot yet adapt to uneven terrain independently of root placement.

## Formation variation / synchronization

**EXISTS basic deterministic variation.** Generic clip sampling offsets time by a stable hash of actor ID; procedural fallback uses actor numeric ID. This prevents perfect synchronization without gameplay RNG.

**PARTIAL.** The variation is simple phase offset only. There is no deterministic idle-variant selector or bounded playback-rate variation contract yet.

## LOD animation handling

**PARTIAL.** Geometry/skeleton LOD is real: LOD0/1 use 61 bones; LOD2 uses 28. Character population and source LOD depend on quality/distance. However selected actors still sample animation every render update; there is no explicit animation update-rate budget, layer reduction or IK budget by LOD.

Quality/LOD does not change gameplay position, hitboxes, AI, shots or death, which is the correct invariant.

## Pause

**EXISTS.** Presentation is sampled from saved mission time/phase rather than an unsaved renderer wall clock. When simulation time freezes, normal character/MG34/station-drag sampling freezes.

## Save / restore

**PARTIAL but strong precedent.** Generic loops derive deterministically from actor state + mission clock + actor ID, so they reconstruct without animation-only save state. Gameplay-linked special systems persist their authoritative phase/timing in simulation: MG34 prone stores phase/startedAt/progress/burst data; station drag stores phase/startedAt/duration association.

A future generic transition/blend resolver will need a clear rule for whether transitions are reconstructible from gameplay timestamps or require saved animation state. This task does not change schema 2.

## MG34 prone reference

**EXISTS and proven; do not modify.** Gunner phase state drives `enter/idle/aim/fire_burst/exit`, with pause/restore and physical muzzle/hitbox alignment already validated. It demonstrates the right ownership model: simulation owns gameplay-linked phase/timing, renderer samples presentation.

## Station drag reference

**EXISTS and proven; do not modify.** The patient/medic pair shares simulation-owned phase/start/duration and renderer samples paired clips. `drag_wounded` also documents a real playback speed target (`0.65 m/s`). It is the best current example of synchronized multi-actor animation without renderer gameplay authority.

## Audit summary

| Area | Classification |
|---|---|
| 61-bone rig + 28-bone LOD2 | EXISTS |
| idle/walk/run | EXISTS |
| crouch idle | EXISTS |
| crouch walk | MISSING |
| generic prone/crawl | MISSING |
| strafe/backpedal | MISSING |
| turn-in-place | MISSING |
| generic transition blending | MISSING |
| generic aim offset | MISSING |
| baked weapon-hand alignment | EXISTS |
| runtime hand/foot IK | MISSING |
| whole-body aim/fire/reload clips | EXISTS |
| layered locomotion + weapon upper body | MISSING |
| suppression presentation | PARTIAL |
| cover/window/doorway poses | PLACEHOLDER/MISSING |
| death presentation | EXISTS basic |
| visual hit reaction | MISSING |
| deterministic phase variation | EXISTS basic |
| LOD mesh/skeleton reduction | EXISTS |
| LOD animation-rate/layer budget | MISSING |
| pause | EXISTS |
| generic restore reconstruction | PARTIAL |
| MG34 prone phased animation | EXISTS special-case |
| station drag paired animation | EXISTS special-case |
