# Real asset audit before the runtime port

Task: M01-RIFLEMAN-LOCOMOTION-RUNTIME-PILOT-V1. Production base: `codex/m01-schema2-determinism-audit` at `5f3cc34f53c61beec52255d67f8babd7194c9f7f`. Reference read, not merged: Soldier Animation architecture `cd91d65f0c022678ed24785eb44233bab137eb3c`.

The base `M01Characters.sample/update` maps every east platoon mover to run and every other ordinary mover to walk, independently of displacement. Its update stops the previous action and samples the new clip at `(mission clock + actor offset) % duration`, with no blend. Root position and facing already come directly from actor data. MG34 prone, station drag, CKM crew and named actor policies already have higher priority.

Four ordinary, nonessential pilot IDs: `de_spans_6`, `de_spans_7`, `pl_east_0`, `pl_east_1`. German span soldiers move at 1.5 m/s; the first four span enemies die in demolition, so indices 6/7 avoid that scripted casualty role. The ordinary east platoon retreats at 5.5 m/s; indices 0/1 have no named/cutscene role. All existing casualties remain authoritative.

## Method

Load the actual checked animation GLB through Three.js GLTFLoader/AnimationMixer, without rebuilding assets. Sample the ankle bone world transforms at 240 Hz in the stationary rig. Source clips use 30 Hz authored data (31/21 maximum keyframes for walk/run). Identify approximate support when ankle height is within 15 mm of its cycle minimum and local Z velocity is positive, >0.2 m/s; negative local Z is forward. Exclude very short contact fragments (<25 ms), swing and most toe-off. The run's quaternion interpolation dips ~7 mm between authored contact keys; a 6 mm threshold initially fragmented support, which motivated the documented 15 mm tolerance. Idle has both feet planted throughout.

No root displacement: root remains fixed. Derive nominal speed from the **median measured backward ankle velocity during support**. This supplies in-place world matching: at runtime the actual horizontal actor displacement divided by mission-time interval drives playback. No root motion, asset regeneration, or prototype 1.8/4.2 m/s values are used. The GLB's authored `speed_mps` extra is a corroborating check, not the calibration input.

The ankle origin is an approximation to boot contact. It does not measure skin/sole rotation, slope contacts or IK. Contacts below are on the **240 Hz sampling grid**, not original authored frame indices. Full ranges, SHA-256 and algorithm output are in `clip-audit.json`.

| Clip | Duration s | Cycle Hz | Cadence steps/min | Approximate left support s | Approximate right support s | Nominal m/s | Fore/aft ankle excursion m |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| standing_idle | 4 | .25 | 0 | 0–4 | 0–4 | 0 | 0 |
| walk | 1 | 1 | 120 | .037500–.529167 | 0–.029167; .537500–1 (wrap) | 1.099945 | .640537 |
| run | .68 | 1.470588 | 176.470586 | .029024–.219756 | .364878–.559756 | 3.251546 | .816428 left / .812220 right |

Standing idle's .25 Hz is its breath loop frequency, not locomotion cadence. Walk support times are sampling frames 9–127 left, 0–7 and 129–240 right. Run support frames 7–53 left, 88–135 right, on a 164-interval sampling grid.

Assets, identities, simulation movement, spatial hitboxes/muzzle, mission scripts, schema 2 and all specialized clips remain unchanged.
