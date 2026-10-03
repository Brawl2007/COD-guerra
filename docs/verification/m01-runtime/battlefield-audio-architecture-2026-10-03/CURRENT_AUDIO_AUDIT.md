# CURRENT_AUDIO_AUDIT.md

Task: `M01-BATTLEFIELD-AUDIO-ARCHITECTURE-V1`  
Base: `codex/m01-mg34-prone-runtime@fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`  
Branch: `codex/m01-battlefield-audio-architecture`  
Scope: audit only; no production audio/runtime integration.

## Classification

- **EXISTS**: present and used in the current runtime.
- **PARTIAL**: useful implementation exists, but it does not satisfy the future battlefield-audio contract.
- **PLACEHOLDER**: intentionally simple/procedural presentation standing in for a future system.
- **MISSING**: no current implementation was found in the audited runtime.

## Current architecture

The current audio path is deliberately small. `Game` owns `AudioSystem` from `src/core/audio.js`, translates simulation events into immediate calls or entries in `pendingSounds`, and the renderer independently presents visual effects. This already respects the most important authority boundary: simulation produces combat facts; audio presents those facts.

M01 uses metres directly in `Game.spatial()`. The legacy sandbox converts its legacy units at the adapter boundary. Any future audio event contract should therefore normalize positions to metres before they enter the audio scheduler.

## Audit table

| Area | Status | Current evidence | Gap / implication |
| --- | --- | --- | --- |
| Web Audio / AudioContext | EXISTS | `AudioManager.init()` creates `AudioContext`, master gain and resumes after user gesture. | Only one master bus; no category graph. |
| Suspend / resume / dispose | EXISTS | `suspend()`, `dispose()`, pointer-lock/visibility integration in `Game`. | Future scheduler must also pause scheduled/virtual voices coherently. |
| Master volume | EXISTS | UI slider calls `game.audio.setVolume()`. | Effects/dialogue/music/ambience categories are missing. |
| Buffer loading | PARTIAL | `load(name,url)` + `play(name,...)`. | No asset manifest, family metadata, licence metadata or streaming strategy. |
| Procedural fallback | EXISTS | `tone()`, `noise()`, procedural wz.29/impact/explosion/fire. | Useful prototype fallback, not a final acoustic library. |
| Positional audio | PLACEHOLDER | Call sites compute a scalar stereo `pan`; `channel()` uses `StereoPanner`. | No 3D panner, listener transform, elevation, cone, room propagation or HRTF policy. |
| Distance attenuation | PARTIAL | Hand-written formulas in `wz29Shot`, `impact`, `distantFire`, `explosion`. | Different functions use unrelated curves/floors; no shared calibrated model. |
| Speed-of-sound delay | PARTIAL | M01 `enemy-fire` and `m01-blast` schedule by distance/343; sandbox sector impacts do likewise. | Logic lives in `Game`; no reusable scheduler contract, late-event policy or source-time model. |
| Audio event queue | PARTIAL | `Game.pendingSounds` schedules delayed fire/blast and rebuilds future sector damage after restore. | Queue knows only a few ad-hoc shapes; no IDs, priorities, category limits, virtual voices or cancellation semantics. |
| Player rifle shot | PARTIAL | `wz29Shot()` plus `wz29Mechanism('bolt')`. | Blast/mechanism are separate calls but no near/mid/far family routing, interior layer or reflections. |
| NPC/MG fire | PARTIAL | `distantFire()`; M01 `enemy-fire` supplies real origin, rounds and interval. | No calibre-specific envelopes/sample families; MG/kar/rkm ultimately share a small procedural vocabulary. |
| Bullet crack | EXISTS | M01 `round-impact` emits `crack` from real trajectory proximity; `AudioManager.crack()` presents it. | Needs future ballistic contract for sonic condition and closest-pass geometry; must remain trajectory-based, not camera-based. |
| Impacts | PARTIAL | Stone/metal procedural impact and M01 round-impact event. | Limited materials, no debris family, reflections or surface-driven family manifest. |
| Explosions | PARTIAL | `explosion()` sample/procedural fallback; M01 blast uses real point and delayed sound. | Single presentation path; no initial blast/body/debris/reflection/tail layering. |
| Artillery | PLACEHOLDER | `ambience('artillery')` exists procedurally, but M01 distant events are not a structured artillery sound system. | Fire / shell flight / incoming / impact / debris / tail need independent contracts. |
| Distant battlefield | PARTIAL | Real distant-shot/enemy-fire/sector-impact events exist; there is no infinite battle loop in the audited M01 path. | BattleSector-to-audio semantic conversion and density management are missing. |
| Ambience | PLACEHOLDER | `ambience()` can synthesize artillery/distant gunfire. | No evidence of an environmental ambience graph for wind/river/structures/fire/fauna. |
| Aircraft audio | MISSING | Aircraft visuals/trajectories exist in M01 renderer. | No engine/propeller/pass/Doppler/altitude audio model found. |
| Vehicle audio | MISSING | Future vehicle systems are not integrated. | No RPM/load/track/damage/interior/exterior audio model. |
| Fire/burning loops | MISSING | Destruction state can mark fire/damage visually. | No local persistent fire voice tied to destruction state. |
| Dialogue audio | MISSING | M01 has dialogue queue and subtitles. | No voiced playback, talker position, dialogue bus or voice concurrency policy. |
| Dialogue priority/ducking | MISSING | HUD/subtitle sequencing exists in simulation. | Audio manager has no mission-critical voice priority or contextual ducking. |
| Footsteps / surface audio | MISSING | World geometry and materials exist. | No audio mapping for wood/metal/stone/dirt/mud/grass/snow/water. |
| Occlusion | MISSING | Authoritative world obstruction exists for gameplay. | Audio does not consume it; no low-pass/gain/indirect component. |
| Interior detection | MISSING | No audio environment state found. | Need room/environment classification supplied by world presentation data. |
| Doors/windows/portals | MISSING | No acoustic portal layer. | Future approximation should reuse authoritative geometry/room relationships. |
| Reverb zones | MISSING | No Convolver/reverb graph found. | Need reusable families, not unique reverb per building. |
| Priority | MISSING | Every requested current sound is played directly if available. | No CRITICAL/HIGH/MEDIUM/LOW arbitration. |
| Voice limits | MISSING | Each `play/tone/noise` creates nodes. | No global/category budgets or priority stealing. |
| Virtualization | MISSING | No logical voice representation separate from Web Audio sources. | Distant/inaudible sources can scale poorly once battle density increases. |
| Pooling | MISSING | Nodes are created per call; buffers are cached. | Buffer cache exists, but source/filter/gain scheduling is not pooled/budgeted. |
| Anti-repetition | PARTIAL | Procedural synthesis varies naturally; `ambience()` varies playback rate. | `Math.random()` is used inside audio presentation, so repeatability is not guaranteed. It is separate from M01 gameplay RNG, but there is no explicit presentation RNG/hash contract. |
| Audio snapshots | MISSING | No mix-state system. | Suppressed/near-explosion/indoor/vehicle-interior/outro states need a presentation-only layer. |
| Accessibility buses | PARTIAL | Master volume exists. | effects/dialogue/music/ambience category controls are missing. |
| Quality scaling | MISSING for audio | Visual renderer has low/medium/high. | Audio quality currently has no independent reflection/tail/distant-voice budgets. |
| Asset licensing | PARTIAL | Repository policy forbids proprietary COD extraction and requires licensed assets. | Future audio manifest should record origin/licence per family; no final sound library is present. |

## Event sources already worth preserving

### M01 enemy fire

`M01Simulation` emits `enemy-fire` with real origin, weapon, round count, interval and emission time. `Game` delays the report by source-listener distance / 343. The underlying rounds are authoritative simulation data; the future audio layer must not invent extra rounds.

### M01 round impacts / crack

`round-impact` contains actual point/material and a trajectory-derived `crack` boolean. Presentation currently plays a crack when the round passed close enough. This is the correct authority direction and should remain.

### M01 blasts

`M01Simulation.impact()` records destruction/damage and emits `m01-blast` with a real point and `soundAt`. Visual flash occurs immediately while the boom is scheduled later. This is already the intended “flash first, sound later” pattern.

### Legacy sector battle

`SectorBattle` emits `sector-impact`, `sector-order` and `distant-shot`. These are usable logical inputs, but the future M01 BattleSector worker should emit semantic events such as artillery, MG exchange, vehicle fire and explosion rather than forcing the audio layer to guess from generic ambience.

### Dialogue

M01 simulation owns dialogue ordering and subtitles. Audio must never reorder mission facts. Future voice playback should attach to those real dialogue items and apply priority/ducking only in presentation.

## Determinism finding

The audited M01 combat RNG lives in simulation (`Random`, `this.rng`, `gauss()`, etc.). `src/core/audio.js` uses global `Math.random()` only for generated noise and an ambience playback-rate variation, so current audio does not appear to consume M01 gameplay RNG. However, presentation decisions are not reproducible because the audio layer has no dedicated deterministic hash/RNG. The prototype for this task therefore uses event-ID hashing and never receives the gameplay RNG.

## Performance risk

Current audio density is low enough that direct node creation is simple. It is not a safe architecture for the requested battlefield scale. Fifty distant shots, multiple sector events, vehicles, aircraft, dialogue, fire and debris could create many AudioBufferSource/Oscillator/Gain/Filter nodes unless a voice budget and virtualization layer is introduced before production expansion.

## Preserve / replace

Preserve:
- simulation-owned event truth;
- real M01 source/impact positions;
- speed-of-sound concept;
- crack tied to trajectory;
- pause/resume lifecycle;
- master volume and licensed-asset rule;
- procedural fallback as development fallback.

Replace/evolve:
- ad-hoc `pendingSounds` shapes into a typed logical audio scheduler;
- hand-written per-method distance curves into shared calibrated models;
- scalar pan-only spatialization into listener/source 3D presentation;
- unbounded direct node creation into priority + budgets + virtualization;
- global `Math.random()` presentation variation into local event-hash/dedicated presentation RNG;
- generic explosion/fire synthesis into layered families with environment processing.

## Audit conclusion

The current code is a useful prototype, not a dead end. The strongest parts are the authority boundary and several real M01 events. The future system should be inserted after simulation events and before Web Audio playback, leaving gameplay, save schema, production RNG, battle sectors, MG34/CKM and world authority untouched during this task.
