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


## 9. Acoustic distance model

The initial bands are deliberately close to, but not copied mechanically from, the prompt example. They are prototype tuning boundaries, not claims about human hearing:

| Band | Prototype range | Purpose |
| --- | ---: | --- |
| CLOSE | < 45 m | strong transient, mechanical detail, near reflections |
| MID | 45–220 m | clear weapon identity, reduced mechanism, moderate air loss |
| DISTANT | 220–950 m | report/tail dominates, high frequencies reduced |
| VERY_DISTANT | 950–5000 m | low-frequency report/rumble, long tail, aggressive virtualization candidate |
| BEYOND | >= 5000 m | normally virtual unless a special authored strategic event justifies presentation |

Why 45/220/950 instead of exactly 50/250/1000:
- they avoid baking round-number design examples into the engine;
- 220–950 m covers the M01 long bridge/fire geometry without making 1 km a discontinuity;
- continuous attenuation/filtering still applies across boundaries, so bands choose content/layers rather than causing gain jumps.

Prototype attenuation is continuous:

```text
gain = 1 / (1 + (distance-reference)/reference)^rolloff
```

after the reference distance, with a small floor only for mix calculation. Final tuning must be measured against licensed assets and the real mix.

Air absorption is approximated by progressively lowering a high-frequency low-pass cutoff with distance. This is not a meteorology simulator.

## 10. Speed of sound

Reference speed: **343 m/s**.

Examples:
- 343 m -> ~1.000 s
- 686 m -> ~2.000 s
- 1000 m -> ~2.915 s

Do not hardcode the 1 km case. Use a reusable `distance / speed` function.

For large flashes/explosions:
1. visual event renders at the authoritative event time;
2. scheduler computes travel delay from the actual source/listener positions;
3. sound is eligible at `audibleAt`;
4. if the one-shot is already obsolete when restored/allocated, do not replay it late.

Small local mechanical sounds tied to the player's own weapon can be immediate because source/listener separation is negligible.

## 11. Near vs distant weapon presentation

A weapon shot is not one monolithic WAV. Supported conceptual layers:

```text
muzzle_blast
mechanical
bullet_crack (trajectory-dependent)
impact
distant_report
environment_tail
```

Layer policy:

### CLOSE
- full transient;
- strongest weapon-family identity;
- mechanical action audible;
- short local reflections;
- impact/crack can remain spatially separate.

### MID
- transient remains clear;
- mechanical layer falls rapidly;
- less high-frequency energy;
- more environment tail.

### DISTANT / VERY_DISTANT
- suppress or omit tiny mechanical details;
- filtered report dominates;
- larger time/space impression from tail;
- preserve weapon class identity (rifle vs MG vs cannon) without forcing the exact near sample.

Weapon families required by architecture:
- rifle;
- SMG;
- MG;
- pistol;
- tank cannon;
- autocannon;
- artillery.

Final sample families should contain multiple licensed variants for each relevant distance/environment role.

## 12. Supersonic crack

A crack is a projectile-path event, not a source-direction trick.

Required future ballistic input:

```js
ProjectileAcousticPass {
  projectileId,
  closestPoint,
  closestDistance,
  projectileSpeed,
  sonic,
  passAt
}
```

The audio layer may present a crack only if ballistics say the projectile is supersonic and the trajectory passes close enough. Camera direction cannot create or suppress the logical crack.

Current M01 already derives a near-pass crack from the real round trajectory; future integration should preserve that authority.

## 13. Artillery contract

Keep independent semantic stages:

```text
gun firing
shell flight
incoming whistle (conditional)
impact
debris
environment tail
```

Whistle is optional. It requires trajectory/projectile data that supports it; it must not be added to every shell for drama.

A distant gun firing and its later impact are separate logical events when simulation knows both. If simulation only knows an impact, audio must not invent a gun location.

## 14. Explosion model

Near explosion layers:
- initial blast;
- low-frequency body;
- debris;
- environment reflections;
- tail.

Distant explosion layers:
- flash at event time;
- propagation delay;
- reduced high frequencies;
- low rumble/body;
- long environment tail.

The event's `intensity` is presentation magnitude, not damage and not radius. Gameplay damage remains simulation-owned.

## 15. Occlusion

Occlusion must reuse authoritative world geometry or a presentation-friendly acoustic query derived from it. Do not create a contradictory “audio wall” system.

A blocked path is **not mute**. Prototype response:

```text
direct gain reduction
+ lower low-pass cutoff
+ indirect/reverb component
```

Inputs can include:
- blocked direct path;
- approximate material/thickness class;
- number/quality of nearby openings/portals.

Final integration should batch/rate-limit acoustic ray queries instead of raycasting every voice every frame.

## 16. Interiors and reusable environments

Initial reusable families:

```text
OUTDOOR
SMALL_ROOM
LARGE_ROOM
FACTORY
TUNNEL
CASEMATE
```

These are parameter families, not necessarily a permanent enum.

Each environment supplies:
- early-reflection amount;
- decay;
- high-frequency damping;
- wet/send amount;
- optional quality-dependent reflection taps/tails.

Do not create a unique impulse/reverb for every house.

## 17. Rooms, doors, windows and portals

A practical approximation is sufficient:

```text
listener room
source room
direct visibility
portal/opening relation
environment family
```

If source and listener are in different rooms:
- direct path receives occlusion filtering;
- nearest valid opening/portal can partially restore gain/high frequencies;
- indirect/reverb send remains audible.

Door/window state should come from world state. Audio must not invent whether an opening exists.

## 18. Reverb zones

Prefer broad reusable acoustic families plus local sends. Zone transitions should cross-fade rather than switch abruptly.

Quality policy:
- LOW: no secondary reflection voices; cheap filter + one environment send.
- MEDIUM: one secondary reflection/tail where useful.
- HIGH: up to two secondary reflections/tails for high-priority events.

Changing quality cannot alter `emittedAt`, event existence, hit timing, casualty timing or mission state.

## 19. Footstep surface contract

Future footsteps should consume the actual surface/material query:

```text
wood
metal
stone
dirt
mud
grass
snow
water
```

The material is not randomized. Variation occurs *within* the correct material family using presentation-only hash/RNG.


## 20. Distant battlefield from real sector events

Battle sectors should emit semantic events such as:

```text
sector_artillery_event
sector_mg_exchange
sector_vehicle_fire
sector_explosion
```

The audio adapter converts each real sector event into an AudioEvent with a real sector/impact/source position.

Do **not** use `infinite-battle-loop.mp3` as the source of battle truth. A low-level ambience bed may exist for wind/room tone, but combat density and timing must follow BattleSector state.

A sector event can generate a compact sound scene:
- one primary report;
- optional secondary tail/reflection;
- a small deterministic cluster only when the logical event represents an exchange rather than a single shot.

The cluster must remain bounded and tied to the same event ID. It cannot create gameplay rounds, casualties or suppression.

## 21. Anti-repetition

Final licensed asset families should carry multiple variants. Selection uses presentation-only deterministic variation:

```text
sample index = hash(event ID + layer)
pitch        = tiny bounded hash variation
gain         = tiny bounded hash variation
tail family  = hash(event ID + environment)
```

Recommended pitch variation is deliberately small (prototype ±1.5%). Do not make rifles sound detuned for the sake of variety.

Additional anti-repetition tools:
- alternate layer combinations;
- timing micro-variation only inside a logical aggregate event;
- sample-family round robin/hash;
- environment-specific tail selection.

Never consume simulation RNG.

## 22. Priority model

Prototype classes:

### CRITICAL
- player's own weapon/mechanism;
- dangerous near explosion;
- mission-critical dialogue.

### HIGH
- nearby enemy weapon;
- nearby vehicle/aircraft when tactically relevant;
- squad callout.

### MEDIUM
- ordinary battlefield combat in useful range;
- artillery/explosion that is distant but still perceptually important;
- combat bark.

### LOW
- very distant minor combat;
- ambient bark;
- minor debris/low-value ambience.

Priority is for **presentation contention only**. It does not make an event more important to gameplay.

## 23. Voice budgets

Prototype budgets are intentionally conservative and can be tuned after browser/hardware measurements:

| Quality | Global | Weapons | Explosions | Dialogue | Vehicles | Aircraft | Ambience | Debris |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 32 | 12 | 6 | 4 | 4 | 3 | 5 | 2 |
| MEDIUM | 48 | 18 | 9 | 5 | 6 | 4 | 7 | 4 |
| HIGH | 72 | 28 | 12 | 6 | 8 | 6 | 10 | 6 |

The sum of category limits can exceed the global limit because the global allocator is the final ceiling.

Allocation order:
1. higher priority;
2. nearer source;
3. stable event ID tie-break.

When a budget is exceeded, virtualize/steal the lowest-value presentation voice. Never delete the simulation event.

## 24. Virtualization

A virtual voice keeps the logical scheduling decision without keeping a live AudioBufferSource.

Use virtualization when:
- the event is beyond the practical acoustic range;
- computed gain is below the audibility floor;
- category/global voice budget is exhausted;
- audio is disabled.

For persistent loops (vehicle/fire/engine), a virtual logical voice may become active later using the correct phase/time offset.

For one-shots:
- if the audible window has expired, mark it expired;
- do not restart it from the beginning when it becomes eligible later.

This distinction prevents a delayed wall of old gunshots after a restore or budget spike.

## 25. Dialogue priority and concurrency

Future voiced dialogue classes:
1. mission-critical dialogue;
2. squad callout;
3. combat bark;
4. ambient bark.

Rules:
- mission-critical speech can steal lower-priority bark voices;
- avoid four soldiers talking over a required line;
- do not reorder simulation dialogue;
- positional squad/ambient speech may use actor position;
- subtitles remain simulation/UI truth.

## 26. Ducking

Ducking should be moderate and contextual.

Prototype mission-critical voice duck:
- weapons: about -3 dB;
- vehicles: about -3 dB;
- ambience: about -5 dB;
- explosions: only about -1 dB.

Thus a dangerous nearby blast can still dominate perception. Do not silence the war to make every line perfectly clean.

## 27. Vehicles

Future vehicle presentation reads authoritative vehicle state:

```js
VehicleAudioState {
  vehicleId,
  position,
  velocity,
  rpm,
  load,
  gear?,
  damage,
  interior
}
```

Layer families:
- engine idle;
- RPM/load loop;
- track/wheel;
- gear/transient;
- damage/rattle;
- weapon;
- interior/exterior processing.

Audio does not implement VehicleController.

## 28. Aircraft

Aircraft audio reads:
- 3D position;
- velocity;
- altitude;
- approaching/receding radial velocity;
- engine/propeller state if available.

A simplified Doppler ratio is acceptable, clamped to avoid exaggerated cinema effects. Altitude and distance attenuate the engine. Aircraft visibility/camera direction does not control whether the sound exists.

The current M01 Ju 87 renderer already has real presentation positions; future integration should consume the same authoritative trajectory/state, not an independent audio orbit.

## 29. Fire / burning

Persistent fire voices are tied to destruction/fire state:

```text
fire exists in destruction state
  -> audio persistent voice exists logically
  -> distance/occlusion/voice budget decide whether backend voice is active
```

Parameters:
- position;
- intensity;
- age/state;
- local loop phase;
- occlusion.

Audio never creates the fire.

## 30. Ambience

Environmental ambience may contain:
- wind;
- river;
- structure creaks/rattle where justified;
- persistent fires;
- distant battle generated from sector events;
- aircraft generated from aircraft state;
- fauna only when historical/situational state allows it.

Fauna suppression should be driven by battle/environment state, not a random “combat mood” timer invented by the audio layer.

## 31. Audio snapshots

Presentation-only snapshots:

### NORMAL
Neutral mix.

### SUPPRESSED
Small master reduction/high-frequency damping; short recovery.

### NEAR_EXPLOSION
Temporary muffling, restrained high tone and recovery envelope.

### INDOOR
Environment filtering/send state, not a gameplay state.

### VEHICLE_INTERIOR
Interior filter + vehicle mix emphasis.

### OUTRO
Optional restrained mix state for authored conclusion.

A near-explosion snapshot must be used sparingly. Not every hit deserves tinnitus.

## 32. Accessibility / user mix

Future buses:
- master;
- effects;
- dialogue;
- music;
- ambience.

Vehicle/weapon/explosion sub-buses can exist internally without exposing every engineering control to the player.

Changing sliders cannot alter simulation, detection, AI or damage.

## 33. Sample library and licences

Never copy or extract sounds from Call of Duty, Medal of Honor, films or unlicensed libraries.

Allowed future sources:
- original recordings/design;
- CC0;
- public domain where applicable;
- CC-BY or other compatible licences with required attribution;
- properly purchased/licensed libraries whose redistribution terms permit the project.

Every production sample family should record:
- source/author;
- licence;
- original URL/reference;
- local asset path;
- modifications;
- attribution requirement.

## 34. Quality scaling

LOW/MEDIUM/HIGH may vary:
- reflection taps;
- secondary tails;
- distant voice budget;
- convolution/reverb complexity;
- maximum active persistent ambience voices.

They may not vary:
- which gameplay event occurred;
- event timestamp;
- source/impact coordinates;
- hit/casualty result;
- mission state;
- simulation RNG sequence.

## 35. Off-camera rule

Audibility is a function of physical source/listener relation and mix budgets, not whether the camera sees the source.

Rotating 180 degrees may change:
- stereo/HRTF direction;
- front/back spectral cue if implemented.

It must not change:
- logical event existence;
- propagation delay;
- distance gain;
- expiry;
- gameplay.

## 36. Future integration sequence

1. Add the new audio modules without deleting `AudioManager`.
2. Adapt M01 player-shot/enemy-fire/round-impact/m01-blast into AudioEvents.
3. Run equivalence tests for event counts/times and gameplay snapshots with audio on/off.
4. Add priority + voice manager using procedural backend first.
5. Add world acoustic query using existing authoritative geometry.
6. Add environment/room metadata incrementally.
7. Add licensed sample families weapon by weapon.
8. Add dialogue buses/ducking only when voice assets exist.
9. Add vehicles/aircraft persistent voices only when authoritative runtime state exists.
10. Remove old direct calls only after regression/browser validation.

Do not combine this migration with battle-sector, destruction, combat-AI, CKM, MG34 or world-interaction changes.

## 37. Acceptance gates before production integration

Required before calling the system integrated:
- audio enabled/disabled produces identical gameplay state;
- no gameplay RNG consumption;
- 1 km propagation test;
- off-camera audibility test;
- restore/expired one-shot test;
- room/occlusion test against authoritative geometry;
- voice-budget stress test;
- dialogue-over-battle priority test;
- quality equivalence of logical event times;
- browser test for pause/resume and user gesture;
- hardware/browser profiling before claiming Chromebook performance;
- licence manifest for every non-procedural production sound.

This task intentionally stops before those production changes.
