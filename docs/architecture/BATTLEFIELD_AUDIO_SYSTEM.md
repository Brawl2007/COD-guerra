# Battlefield Audio System

Task: `M01-BATTLEFIELD-AUDIO-ARCHITECTURE-V1`  
Status: architecture/prototype only — **not integrated into production audio**.

## 1. Authority boundary

Audio is a presentation consumer. It never creates a battle, hit, casualty, shot, explosion, vehicle state, fire, mission event, dialogue line or AI stimulus.

Authoritative flow:

```text
simulation/world truth
  -> logical gameplay event
  -> AudioEvent adapter (metres, stable IDs, semantic category)
  -> audio scheduler / acoustic query
  -> mix decision / virtualization
  -> Web Audio voices
```

Forbidden flow:

```text
battle-loop.wav
  -> infer that combat exists
  -> alter AI / casualties / mission
```

The M01 runtime already contains useful authoritative events (`enemy-fire`, `round-impact`, `m01-blast`, dialogue state). Future integration should adapt these events; it must not duplicate their combat logic.

## 2. Coordinate contract

The audio boundary receives world positions in **metres**:

```js
position: { x, y, z }
```

M01 already operates in metres at the presentation boundary. Legacy sandbox coordinates must be converted before creating an AudioEvent. Acoustic distance bands are independent of visual LOD and renderer culling.

The listener contract is presentation data:

```js
AudioListenerState {
  position: { x, y, z },
  yaw,
  velocity?,
  environment?,
  roomId?
}
```

Changing listener orientation may change direction/pan/HRTF cues. It must not make an otherwise audible source disappear.

## 3. Minimal AudioEvent contract

```js
AudioEvent {
  id,            // stable unique logical-event ID
  type,          // semantic event: weapon_shot, explosion, artillery_impact...
  sourceId,      // player/actor/vehicle/sector/object identity
  position,      // metres; real logical source/impact position
  emittedAt,     // simulation clock seconds
  category,      // weapons, explosions, dialogue, vehicles, aircraft, ambience, debris...
  intensity,     // normalized presentation magnitude; not damage
  priority,      // explicit class or AUTO
  weaponType?    // rifle, smg, mg, pistol, tank_cannon, autocannon, artillery...
}
```

Only semantic fields that affect scheduling/presentation belong here. Pure art choices do **not** belong in the logical event: sample filename, EQ curve, reverb impulse, random pitch, tail selection, compressor settings and voice-stealing implementation remain presentation configuration.

Optional semantic fields may be added only when supplied by authoritative systems, for example:

```js
{
  impactMaterial?,
  nearTrajectory?,
  projectileSpeed?,
  trajectoryId?,
  vehicleState?,
  dialogueClass?,
  missionCritical?,
  roomId?,
  ttl?
}
```

## 4. Event identity and replay rules

`id` must be stable for a logical one-shot. The audio layer uses it for:
- duplicate suppression after restore/catch-up;
- deterministic presentation variation;
- debugging;
- late/expired one-shot policy;
- correlation of layers that belong to one event.

The audio layer must never create a second logical gameplay event. Multiple sound **layers** can reference the same event ID.

Example:

```text
enemy-fire id=m01_round_813
  -> muzzle_blast layer
  -> mechanical layer
  -> distant_report layer
```

These are three presentation voices for one simulation shot, not three shots.

## 5. Scheduling contract

For a finite-propagation event:

```text
emittedAt = logical source time
visual flash = emittedAt
audibleAt = emittedAt + distance / speedOfSound
```

Default reference speed for this prototype: **343 m/s**.

The scheduler stores logical time, not wall-clock assumptions. Pause suspends audio time mapping. Restore rebuilds only future eligible voices from authoritative state/events. An expired one-shot must not suddenly play several seconds late just because it became audible/allocated again.

Local UI sounds and selected non-world effects may declare `instantLocal`, but world weapon reports/explosions should not bypass propagation merely for convenience.

## 6. Gameplay independence

The audio subsystem must not receive the gameplay RNG object. Presentation variation uses either:
1. a dedicated presentation RNG with isolated state, or
2. a deterministic hash of `event.id + type + sourceId + layer`.

This task chooses event hashing in the isolated prototype.

Turning audio off:
- does not skip simulation events;
- does not change event times;
- does not change actors/AI;
- does not change casualties;
- does not change checkpoints/save;
- does not consume gameplay RNG.

Quality LOW/MEDIUM/HIGH may change only presentation cost (reflections, secondary tails, distant voice budget). Event occurrence and logical timing remain identical.

## 7. Proposed production modules

No production files are changed in this task. Future integration should split responsibilities roughly as:

```text
src/audio/audio-event-adapter.js
src/audio/audio-scheduler.js
src/audio/acoustics.js
src/audio/voice-manager.js
src/audio/mix-buses.js
src/audio/sample-library.js
src/audio/snapshots.js
src/audio/web-audio-backend.js
```

Suggested responsibilities:

- **adapter**: current simulation event -> normalized AudioEvent.
- **scheduler**: propagation time, expiry, cancellation, restore.
- **acoustics**: distance, occlusion, rooms/portals, environment sends.
- **voice manager**: priority, category/global budgets, virtualization.
- **mix buses**: master/effects/dialogue/music/ambience and ducking.
- **sample library**: licensed family metadata and anti-repetition.
- **snapshots**: suppression/near blast/interior/vehicle interior/outro.
- **backend**: AudioContext nodes only; no gameplay knowledge.

## 8. Migration boundary with current Game

Current `Game.pendingSounds` is the prototype predecessor of the scheduler. A future migration can proceed incrementally:

1. wrap existing `enemy-fire`, `round-impact`, `m01-blast`, player-shot and NPC-shot into AudioEvents;
2. preserve the current visual calls and simulation events;
3. route those AudioEvents through the scheduler;
4. replace direct `AudioManager` methods with backend layer requests;
5. only after equivalence tests, remove the ad-hoc pending sound shapes.

This avoids a rewrite of M01 simulation and avoids touching save schema or production RNG.
