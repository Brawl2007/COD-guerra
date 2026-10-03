# Soldier Animation System — architecture contract

Status: architecture/prototype only. M01 remains **PROTÓTIPO JOGÁVEL**. No production renderer, simulation, GLB or save schema is changed by this task.

## 1. Ownership boundary

Combat AI decides intent. Simulation remains authoritative for position, facing used by gameplay, posture when it changes hitboxes, fire/reload timing, damage, death, suppression state and weapon state. Animation only presents that state.

Approved Combat AI output already provides the right upstream seam:

```js
Intent {
  action,
  targetPosition,
  targetActorId,
  coverNodeId,
  desiredPosture,   // STAND | CROUCH | PRONE | MOUNTED | DRAGGING
  fireMode,         // NONE | AIM | SINGLE | BURST | SUPPRESS
  reason,
  validUntil
}
```

Animation may receive additional read-only presentation inputs derived by adapters, such as measured world speed, aim yaw/pitch, cover side/height and gameplay event timestamps. It never rewrites the Intent or actor.

```text
Combat AI Intent
      ↓
authoritative simulation/adapters
      ↓
AnimationInput (read only)
      ↓
AnimationStateResolver
      ↓
layer plan + clip phase + IK targets
      ↓
renderer / mixer
```

## 2. State model

A future resolver should output orthogonal presentation axes instead of one giant clip state:

```js
AnimationPlan {
  baseLocomotion,
  posture,
  postureTransition,
  visualBodyYaw,
  aimOffset,
  upperBodyWeapon,
  reaction,
  coverPose,
  additive,
  ikTargets,
  phase,
  playbackRate
}
```

Recommended layers:

1. **Base locomotion** — idle/walk/run/backpedal/strafe/crawl/turn-in-place.
2. **Posture** — stand/crouch/prone/mounted/dragging and transitions.
3. **Upper-body weapon** — carry/aim/fire/reload/bolt/weapon-specific crew action.
4. **Aim offset** — bounded spine/shoulder/head offset around body facing.
5. **Reaction** — hit flinch, suppression flinch, explosion duck; visual only.
6. **Additive detail** — breath, small head motion, recoil, deterministic idle detail.
7. **IK** — hands-to-weapon, feet-to-ground, mount/handle contacts where fidelity allows.

MG34 prone and station drag remain explicit specialized state machines until consciously migrated. The generic resolver must not override them.

## 3. Input contract

```js
AnimationInput {
  now,                 // mission/simulation clock
  paused,
  actorId,
  actor: {
    position,
    facing,             // authoritative simulation facing
    alive,
    health,
    posture,            // authoritative if hitbox-affecting
    velocity,           // or measured speed + movement yaw
    weaponId
  },
  intent: {
    action,
    desiredPosture,
    movementYaw,
    desiredSpeed,
    aimYaw,
    aimPitch,
    fireMode,
    cover
  },
  weapon: {
    firing,
    fireStartedAt,
    reloading,
    reloadStartedAt,
    reloadPolicy
  },
  condition: {
    suppressed,
    pinned,
    sourceDirection,
    hitReaction
  }
}
```

Camera and quality are **not** inputs to the core state decision. Quality is consumed later by a presentation fidelity policy only.

## 4. Locomotion semantic states

Future semantic states:

```text
idle
walk
run
sprint (only where a specific gameplay design uses it)
crouch_idle
crouch_walk
prone
prone_crawl
backpedal
strafe_left
strafe_right
turn_left
turn_right
```

These are semantic requests. A missing asset does not change gameplay. The renderer may temporarily fall back to the nearest safe existing clip while the architecture still reports the missing semantic state.

Current M01 does not justify a universal NPC sprint. `run` is sufficient until an actor/system explicitly distinguishes sprint in gameplay intent.

## 5. Speed matching / foot sliding

World movement remains authoritative. Generic locomotion clips should be authored with metadata:

```js
LocomotionClipMeta {
  semantic:'walk',
  nominalSpeedMps:1.8,
  cycleDuration:1.0,
  safePlayback:[0.8,1.2]
}
```

For an in-place locomotion clip:

```text
rawPlaybackRate = measuredWorldSpeed / nominalSpeedMps
```

If `rawPlaybackRate` lies inside the clip's safe range, use it. If outside, choose a neighboring gait before stretching the clip excessively.

Example policy:

```text
0 speed → idle
slow movement → walk with rate clamp
speed above walk safe band → crossfade to run
speed below run safe band → crossfade back to walk
```

The exact speed thresholds and safe-rate bands must be measured/approved per asset; prototype defaults in this task are architectural parameters, not final animation data.

Animation must never move the actor root to “catch up”. No root-motion authority in the generic system unless a future gameplay action explicitly hands movement ownership to a synchronized action adapter.

## 6. Transitions

Generic state changes need a transition record:

```js
Transition {
  from,
  to,
  startedAt,
  duration,
  progress
}
```

Use authored transition clips where available; otherwise a bounded mixer crossfade is presentation fallback.

Important transitions:

```text
idle ↔ walk
walk ↔ run
stand ↔ crouch
crouch ↔ prone
stand ↔ prone (normally through an authored intermediate)
locomotion ↔ turn-in-place
locomotion/aim ↔ reload according to weapon policy
```

No hard `stopAllAction()` visual cut should be the target architecture for ordinary state changes.

## 7. Posture

Posture is authoritative whenever it changes gameplay geometry/hitbox. Animation may blend *toward* the posture but cannot independently decide that a standing actor is now physically crouched/prone.

Rules:

- AI may request `desiredPosture`.
- Simulation accepts/rejects it according to gameplay/collision.
- Animation consumes the accepted posture and transition timestamp.
- Small suppression flinch/duck may be additive inside the current hitbox envelope.
- Large silhouette change requires authoritative posture state first.

MG34 prone already follows this ownership model and is the reference.

## 8. Turning and visual body facing

Do not instantly rotate the visible body every time desired aim changes.

Maintain presentation-only `visualBodyYaw` that chases authoritative facing with bounded angular speed. It never writes actor facing or hitboxes.

```text
yawError = shortestAngle(authoritativeFacing - visualBodyYaw)
visualBodyYaw += clamp(yawError, ±maxVisualTurnRate*dt)
```

When stationary and yaw error exceeds an authored threshold, request `turn_left`/`turn_right`. While moving, use moving-turn blending rather than turn-in-place.

The visual lag budget must remain small enough that gameplay muzzle/hitbox does not visibly diverge. At a gameplay fire event, weapon presentation aligns to the authoritative shot direction; visual muzzle remains presentation, never authority.

## 9. Aim offset and body follow

Aim can twist within asset-driven limits without rotating the whole body immediately:

```text
aimDelta = shortestAngle(aimYaw - visualBodyYaw)
aimOffset = clamp(aimDelta, -maxTwist, +maxTwist)
```

If desired aim exceeds `maxTwist`, body follow target advances until residual twist returns inside the safe range.

Never allow 180° torso twist. Final limits must be measured from rig/weapon poses. Prototype constants in this task are placeholders used to prove the math.

Aim pitch similarly clamps to per-posture/per-weapon limits.

## 10. Weapon / hand alignment

Current rig already provides:

```text
hand_r
hand_l
weapon
weapon_bolt
weapon_mag
weapon_clip
```

Current rifle/rkm data provides sockets including:

```text
grip_r
grip_l
muzzle
rear_sight
butt
bolt/clip/mag points
```

Future hand IK contract:

```js
WeaponIKTargets {
  rightHandGrip,
  leftHandGrip,
  butt/stockReference,
  weaponRoot,
  optional mountReference
}
```

Preferred ownership:

1. weapon/root transform comes from animation/mount presentation;
2. right hand drives/anchors primary grip according to weapon design;
3. left hand IK resolves support grip;
4. shoulder/stock alignment uses bounded clavicle/spine correction;
5. finger detail may be disabled at lower LOD.

The visual `muzzle` socket is for presentation/evidence. Gameplay shot origin/direction continues to come from simulation/spatial code.

## 11. Fire / reload layering

Weapon actions are policy-driven, not globally identical.

Possible policy:

```js
WeaponAnimationPolicy {
  fire:{upperBody:true, allowLocomotion:true, recoilAdditive:true},
  reload:{upperBody:true, allowLocomotion:'slow'|'none'|'normal', blockAim:true},
  bolt:{upperBody:true, allowLocomotion:true}
}
```

Animation does not decide whether firing/reloading is legal. It receives the authoritative weapon state and represents it.

Examples:

- rifle firing can be upper-body aim + recoil while legs continue a permitted walk;
- bolt cycle can occupy upper body without stopping the base gait if gameplay allowed movement;
- rifle reload may allow slow locomotion if the weapon/gameplay contract says so;
- crew-served MG reload may require a specialized paired/mounted state and should not inherit rifle rules.

If simulation says the actor is moving during an action whose animation asset currently lacks a layered variant, presentation chooses a documented fallback; it does not cancel simulation movement.

## 12. Hit reaction / death

Damage and casualty are authoritative simulation events.

`ReactionLayer` may contain:

```js
{kind:'hit', direction, startedAt, intensity}
{kind:'blast-duck', direction, startedAt, intensity}
```

It can add bounded spine/shoulder/head motion but never subtract HP or decide death.

On authoritative death:

```text
alive true → false
→ animation receives death event/state
→ choose deterministic death presentation variant
→ optional future ragdoll handoff
```

Variant choice must use a stable event/actor hash or saved authoritative event ID, not gameplay RNG hidden in renderer.

## 13. Suppression

Combat AI/simulation provides suppression/pinned/source direction. Animation may reflect it through:

- small directional flinch;
- head duck;
- tighter weapon posture;
- rushed playback detail;
- accepted lower posture from authoritative posture state.

Animation cannot change AI action, movement destination, suppression value or hitbox. If `pinned` should make the actor truly crouch/prone, simulation must first accept that posture.

## 14. Cover, doorways and windows

Future adapter can provide:

```js
CoverAnimationContext {
  kind:'low'|'high'|'window'|'doorway'|'corner',
  side:'left'|'right'|'center',
  height,
  peek:'none'|'left'|'right'|'over',
  normal,
  anchor
}
```

Animation chooses a compatible semantic pose/lean while gameplay owns cover reservation/position/LOS.

Needed future presentation states include:

```text
low-cover crouch
high-cover stand
left/right corner peek
window fire
short doorway lean
return-to-cover
```

Do not procedurally bend the torso through walls. Cover-space constraints come from world/AI adapters.

## 15. Runtime IK contract

### Feet

A future foot solver receives read-only ground samples per foot and outputs bounded presentation offsets/rotations. It may adjust hips visually within a small range but cannot move gameplay root or hitbox.

```js
FootIKInput {footBone, desiredWorldPoint, groundPoint, groundNormal, maxCorrection}
```

### Hands / weapon

Hand IK targets come from weapon sockets and the sampled weapon transform, not from camera. Missing sockets disable the IK layer rather than inventing a grip.

### Mounted weapons / interactions

Mount/handle IK targets come from authoritative mount/interaction anchors. IK never changes station occupancy or weapon angle limits.

## 16. Terrain

Terrain adaptation should be presentation-only:

```text
actor root = authoritative world position
feet sample terrain
hips receive bounded visual compensation
foot bones align to local ground normals
```

On large steps/slopes where bounded IK is insufficient, locomotion/pathing must solve the gameplay problem; animation must not silently move the actor uphill/downhill.

## 17. Deterministic formation variation

Use actor ID hashing for visual variation; never gameplay RNG.

Allowed examples:

```text
loop phase offset
idle variant index
breath/head detail phase
small non-locomotion playback variation
```

For foot-sliding safety, locomotion playback should be driven primarily by measured speed. Do **not** add arbitrary ±speed variance to walk/run if it breaks stride/world matching.

A stable helper can derive:

```js
variation(actorId) = {
  phase01,
  idleVariant,
  detailRate
}
```

Same actor ID always yields the same values across save/reload and camera/quality changes.

## 18. LOD / quality

Split **state resolution** from **fidelity policy**.

Core animation state must be independent from camera/quality. A later renderer policy may reduce work:

| Fidelity | bones | update rate | foot IK | hand IK | reaction/additive | secondary |
|---|---:|---:|---|---|---|---|
| near/high | full | every render sample | yes | yes | full | full |
| mid | reduced/full as asset permits | bounded lower Hz | optional | weapon-critical only | important | reduced |
| far | reduced skeleton | lower Hz | no | no | coarse | no |

Exact Hz/budgets must be measured in the actual renderer. This document does not claim FPS/GPU cost.

LOD may never change:

```text
actor world transform
gameplay posture/hitbox
AI intent
shot timing
ammo
health/death
save state
```

## 19. Pause / clock ownership

Gameplay-linked animation uses mission/simulation clock or authoritative action timestamps. Pause freezes those clocks, so animation freezes without a separate wall-clock timer.

Pure cosmetic loop phase can be derived from:

```text
missionClock + stable actor phase offset
```

Do not advance a hidden `performance.now()` animation state while the mission is paused.

## 20. Save / restore contract

Do **not** save every mixer action/time. Separate reconstructible cosmetic state from gameplay-linked transition state.

### Reconstructible — no save field needed

- idle/walk/run loop phase derived from mission clock + actor ID;
- idle variant derived from actor ID;
- LOD/fidelity choice;
- cosmetic breath/additive phase.

### Gameplay-linked timing — authoritative simulation data

- firing/reload/bolt startedAt/state;
- accepted posture transition when it changes hitboxes;
- MG34 prone phases;
- synchronized drag/mounted/interactions;
- death event/state.

### Presentation transition continuity

If future generic visual smoothing (`visualBodyYaw`, crossfade startedAt/from/to) must reproduce the exact frame after reload, either:

1. make it reconstructible from authoritative actor/action timestamps, preferred; or
2. store a compact presentation substate in a future reviewed schema migration.

Possible future presentation state:

```js
AnimationRestoreState {
  bodyYaw,
  postureTransition:{from,to,startedAt,duration}|null,
  clipTransition:{from,to,startedAt,duration}|null
}
```

This task does not add it to schema 2.

## 21. Specialized systems precedence

The resolver needs explicit bypass/adapter priority:

```text
authoritative specialized action (MG34 prone / station drag / future mounted crew)
> generic death/wounded handling when compatible
> generic locomotion/posture layers
```

Do not partially layer generic walk/run under a synchronized drag or MG34 prone transition unless that specialized system explicitly opts in.

## 22. Fallback when semantic clip is missing

State resolver reports the semantic state independently of asset availability.

Renderer fallback table can temporarily map:

```text
crouch_walk → crouched_idle + world translation (known visual limitation)
backpedal   → walk (playback/pose fallback only)
strafe      → walk
turn-in-place → standing_idle while visual yaw catches up
prone_crawl → prone hold
```

Fallback must be visible in diagnostics so missing animation is not mistaken for completed quality.

## 23. Integration plan

1. Add read-only animation intent adapter for a tiny non-critical actor set on a future integration branch.
2. Introduce semantic resolver without changing simulation position/facing/AI.
3. Measure nominal walk/run speeds and transition compatibility from real GLBs.
4. Replace hard clip cuts with bounded crossfades for idle/walk/run first.
5. Add crouch-walk/turn-in-place assets before claiming those states complete.
6. Add aim-offset/upper-body masking only after bone masks are validated on LOD0/1/2.
7. Add hand/foot IK behind fidelity policy, proving gameplay transform/hitboxes unchanged.
8. Preserve MG34 prone and station drag special adapters until equivalent generic support is proven.

## 24. Acceptance invariants

A future production implementation is acceptable only if tests prove:

```text
same AI/sim inputs + same mission time → same semantic animation plan
camera changes → no semantic state change
quality changes → no gameplay/semantic intent change
pause → no gameplay-linked animation time advance
restore → same gameplay-linked frame/phase
LOD → no actor transform/hitbox/shot/death changes
visual hit reaction → no HP mutation
animation → never changes AI intent/order
visual muzzle → never becomes shot authority
```

The isolated prototype in this task proves the state/math side of these invariants without loading GLBs.
