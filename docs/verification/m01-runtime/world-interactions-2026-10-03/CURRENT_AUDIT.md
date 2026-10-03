# M01 world interactions — current audit

TASK_ID: `M01-WORLD-INTERACTIONS-ARCHITECTURE-V1`

Base audited: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

This is an audit of the existing runtime only. No production gameplay is changed by this task.

## Player weapon today

M01 owns exactly one player weapon object: `Wz29` in `src/game/wz29.js`, created by `M01Simulation.reset()` as `this.weapon=new Wz29()`.

Persisted weapon fields today are:

- `id` (`kb_wz29` through the research profile);
- `mag`;
- `reserve`;
- `state`;
- `until` / `started`;
- `lastShot` / `shotCount`;
- `received`;
- `sight`;
- `reloadMode`.

The player has no production inventory/weapon-slot collection and no weapon-switch command. The HUD hard-codes `KARABINEK WZ.29` for M01.

`Wz29` already distinguishes:

- five-round internal magazine;
- reserve cartridges;
- full empty-magazine clip reload (`RELOAD_CLIP`);
- partial single-round reload (`RELOAD_SINGLE`);
- bolt cycle (`BOLT_CYCLE`);
- sight presets.

The current `Wz29` does **not** model a separately persisted chamber flag. Adding one later must therefore be a deliberate weapon-contract decision, not a field silently inferred by this prototype.

The older French bench uses `WeaponSystem` / `WEAPON_PROFILES` and an M1 Carbine; it is a separate legacy path and must not be generalized into M01 by accident.

## NPC weapons and ammunition today

M01 actors are data objects. Common fields include `state`, `shot`, `cooldown`, `rounds`, position and alive/active flags.

Current explicit weapon ownership is uneven by design:

- `de_east_0/1`: `weapon:'mg34'`, real prone state and real emitted burst rounds;
- other `grp_de_east` and `grp_de_spans`: `weapon:'kar98k'`;
- Kowal: presentation/logic for rkm wz.28 and `rounds:20`;
- CKM crew: group state exists, but CKM fire/ammunition are intentionally not a generic player-operable system;
- ordinary allied rifle actors mostly derive rifle presentation from role/nation rather than a complete weapon-instance object.

Therefore an actor `weapon` string must **not** simply be re-used as a future physical dropped weapon record. A drop needs a real instance ID and ammunition/feed state owned by simulation.

## Resupply today

Kowal is the only contextual player ammunition resupply in M01:

- `KeyE` is consumed as `controls.interact`;
- within 3 m and under the existing conditions, `Wz29.resupply()` adds rounds to reserve up to 40;
- `timers.kowalRounds` persists the section supply.

This proves that ammunition already belongs to simulation/save data, but it is not a general ammo-entity or caliber/feed compatibility system.

## Context interaction today

There is one input key and one HUD line suitable for future unification:

- `src/core/input.js`: `KeyE` is already a single-press action;
- `src/game/game.js`: maps it to `controls.interact` once per rendered frame/substep sequence;
- `M01Simulation.updateObjectives(dt, interact)`: handles message delivery, sapper crate, Bąk and Kowal ammunition;
- `M01Simulation.interaction`: returns the current text prompt;
- HUD `#interaction`: presents that simulation-owned prompt.

There is **no generic interaction target resolver** yet. Objective code directly checks distance to each scripted subject. No common angle/visibility/priority resolver exists.

This is the strongest integration seam for a future system: retain one `interact` action and one simulation-owned prompt, but make the simulation resolve a typed interaction candidate instead of adding one `if` chain per object type.

## Line of sight / obstruction available today

`src/world/spatial.js` already owns the production spatial primitives:

- `rayBox()`;
- `traceObstruction()`;
- `visible()`;
- `traceShot()`.

Future interaction targeting should inject/reuse those world traces. It must not introduce a renderer-only visibility test or allow pickup through collision.

## MG34 today

The two existing MG34 gunners have production simulation state for prone posture and emitted shots. Simulation owns phase/timing and renderer samples it. This is a useful architectural precedent, **not** a generic mounted-weapon controller to edit here.

The MG34 assets also contain reload/drop animation events, but presentation events are not authoritative inventory entities.

## CKM today

The CKM crew has persisted `idle/abandon/retreat` state and optional renderer assets. `aim/fire_burst/feed` are not a general interaction system. This task does not alter CKM runtime.

## Vehicles / tank / jeep today

There is no production `TankController`, jeep controller, vehicle seat state, vehicle damage state, or player vehicle runtime in `src/**` at this base.

The design specification requires a future `TankController` with separate hull/turret/cannon/coax and crew roles (`commander`, `driver`, `gunner`, `loader`, optional bow gunner). It separately requires light vehicles where the player may drive, ride or operate a mounted weapon.

`DEVELOPMENT_STATUS.md` and `IMPLEMENTATION_PLAN.md` explicitly mark tank/jeep/aircraft systems and their snapshots as pending future work. Therefore this architecture must define contracts without pretending a vehicle prototype already exists in production.

## Mortars / artillery today

No generic player-operable mortar or artillery runtime exists in `src/**` at this base. M01 has distant/support effects and historical weapon references, but they are not an operator-seat system.

## Save / restore today

M01 snapshot schema is `2`. It already persists player, the single Wz29, actors, events/flags, destruction, timers, sectors, grenades and enemy rounds, with atomic validation/restore.

This task must not add world weapons, mounted stations or vehicles to schema 2. The prototype therefore uses its **own explicitly non-production snapshot contract** so the fields can be validated before any migration is designed.

## Asset fallback precedent

Gameplay state is already intentionally separated from optional character/weapon GLBs in several systems. The future interaction domain must follow the same rule: asset availability is presentation metadata, never the authority for pickup availability, ammo, seat occupancy or mounted-weapon state.

## Gaps this architecture must solve later

1. Stable physical weapon-instance identity independent of actor/render node.
2. A unified contextual-target resolver using distance + angle + world obstruction + priority.
3. Transfer semantics that preserve exact feed/ammo state when a weapon changes owner.
4. Explicit cartridge compatibility distinct from magazine/belt/clip compatibility.
5. Deterministic cleanup policy for unimportant drops.
6. Generic mounted station with physical traverse/elevation constraints.
7. Crew-role requirements separate from “player is using weapon”.
8. Vehicle state + seats + physical entry/exit points.
9. A future save migration/version plan; **not implemented in this task**.
10. Renderer-independent fallback contract.
