# M01 animation presentation contract V1

TASK_ID `M01-ANIM-CONTRACT-SIM-V1`. Base `99309d9cb023cc94a07d41ff863e1362e4460570`.
Reference plan `claude/exciting-planck-5ylz7z` @ `5583a4ab854a2e64dad85460bfd40031c3406ccc`; existing rifleman pilot read at `93aaa5c4a5651f22b4c696005501a2ac1014860a`. Neither merged/cherry-picked. M01 remains **PROTÓTIPO JOGÁVEL**.

## Data and units

Optional schema-2 fields on the existing 89 NPC actors; player weapon/first-person state retains its existing contract. Coordinates and odometer are metres, speed m/s, yaw radians, timestamps active mission seconds (`clock`, never historical `battleClock` or wall time).

| Field | Meaning |
| --- | --- |
| `motion.speed` | Effective net XZ displacement during `updateActors` / dt, including collision slide and existing attachment offsets. Zero when the root did not move. |
| `motion.odometer` | Accumulated effective displacement of that movement pass; future stride phase can be `(odometer / strideM + idOffset) % 1`. |
| `motion.gait` | `idle`, `walk` (≤2.2 m/s), `run` (≤4.4), `sprint` (>4.4), `crouch_walk`, `carry`, `drag`. Effective motion takes precedence over ADVANCE/RETREAT labels. Existing transported actors/pairs precede generic locomotion. |
| `motion.gaitSince` | Clock of the last gait change, unchanged during the same gait. |
| `bodyYaw` | Persisted shortest-arc chase of combat `facing`: 180°/s idle, 360°/s moving. Existing prone/mounted/seated/wounded/carried adapters align directly; death freezes the captured body orientation. |
| `posture`, `postureSince` | Presentation record of the existing stand/crouch/MG34 prone state and its transition clock. This does not grant generic prone or change geometry. |
| `suppressedAt` | Last real extension of `suppressedUntil`; not refreshed merely because suppression remains active. |
| `hitAt`, optional `hitYaw` | Actual damage or existing scripted wound clock. Direction towards the authoritative source when known; absent for scripted wounds with no incoming direction. |
| `diedAt`, `deathYaw` | Existing real death clock and captured presentation orientation. Does not create/queue deaths. |

Only the movement pass adds distance. Offscreen straggler relocation, player delivery placement and roll-call staging happen outside it and do not create footsteps. Attachment/release displacement inside the existing evacuation pass is measured exactly: Bąk's pickup reaches 33.24429142066895 m/s for one tick on both reference routes. Speed is therefore finite/nonnegative without an artificial 8 m/s cap. Specialized transport presentation must continue to take precedence over generic footfall resolution. No actor speed/root position is changed.

`facing`, roots, rays, muzzle geometry and hitboxes retain their existing authority. Generic yaw is advanced once after combat for the current tick; specialized posture is refreshed after existing state changes. The plan's additional 60° idle aim-offset cap is deferred to the resolver/animation decision; V1 enforces the stated angular rate without snapping to enforce that cap.

## Save and restore

Schema stays 2. A present motion block must have exactly four known keys, finite nonnegative speed/odometer, a closed gait enum and `gaitSince ∈ [0,clock]`. Optional yaw values are finite; posture is a closed enum; timestamps are in `[0,clock]`; directional events need their timestamp and a known death cannot be attached to a living actor. Existing validation scans nested checkpoints before committing any state.

Absent motion defaults to `{speed:0,odometer:0,gait:'idle',gaitSince:max(0,clock-1)}`; absent body yaw defaults to `facing`; posture mirrors the existing crouch/prone state and its absent timestamp defaults to `max(0,clock-1)`. Present fields are preserved exactly. Unknown past hit/death/suppression instants remain absent, allowing a resolver to use final/legacy poses instead of replaying fabricated events. The six inactive platoon reserves explicitly described as prior offscreen losses have no invented death instant.

Existing 86→89 roster, CKM placement, MG34 burst and station-drag migrations run unchanged; initialization adds only presentation fields afterwards and consumes no RNG. Checkpoints remain flat; `resumeCheckpoint` retains the previous checkpoint and its presentation data. Zero/invalid dt and completed ticks remain no-ops.

## Diagnostics and pending work

`simulation.animationPresentation` and debug-only `gameDiagnostics().m01.animationPresentation` return detached records for the existing IDs. Only latest event scalars are stored; no event history, additional snapshot mirror or automatic logging. Existing specialized adapter fields remain the source of their phases/timestamps.

Pending from the Claude plan: Animation Resolver/player/visual integration, clips/IK/LOD policy; rifleman reload/rounds changes; generic sapper prone/hitboxes; Bąk pickup/putdown gameplay phases or speed changes; cover/vault data; MG34 loader/reload/feed and CKM fire-policy changes. These require separate tasks/decisions. This pass changes no renderer, assets, HUD, mission timings or outcomes.

## Verification

`node tests/helpers/m01-anim-baseline.mjs` reads the immutable approved simulation from git into a temporary module, drives a separate candidate with the same controls and compares serialized legacy state, previous checkpoint and events **at every tick**. It removes only the nine new actor presentation keys; no rounding, RNG omission or gameplay whitelist. `--write-golden` regenerates the compact approved trace fixture; normal `npm test` checks every trace block against it without requiring git history. The fixture includes the source SHA-256 and both complete help/ignore routes. New continuation tests compare entire snapshots, including presentation, at each tick, with pause, double restore, real adapters, CP-A..D and atomic rejection.
