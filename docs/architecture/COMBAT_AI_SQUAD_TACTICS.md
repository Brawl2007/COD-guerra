# COMBAT_AI_SQUAD_TACTICS

Task: `M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1`  
Companion to `COMBAT_AI_SYSTEM.md`. No production integration.

## Squad model

```js
SquadState {
  id, leaderId, memberIds, order, contactSector,
  suppressorIds, moverIds, rallyPoint,
  cohesion, morale, grenadeBudget, lastCoordinationAt
}
```

Squad coordination grants temporary roles/permissions. Individual survival decisions remain local.

## Fire and maneuver

```text
contact
-> select suppressors with useful LOS/arc
-> select movers with valid safer route
-> bounded suppressive fire
-> grant BOUND_MOVE to movers
-> movers reach cover
-> roles may swap
-> reassess
```

Do not move everyone at once. Abort a bound if suppressors become pinned or the route becomes invalid. HOLD orders constrain movement to their authorized radius. Support/MG soldiers are preferred suppressors, not permanent turrets.

## Flanking gates

FLANK is valid only when the order permits lateral displacement, ThreatMemory confidence is sufficient, a real route exists, another element can keep pressure/observation, destination cover has tactical value, route exposure is acceptable, mission/historical constraints are respected and cohesion remains acceptable.

No `role=flanker => always flank`.

## Retreat / regroup

Retreat candidates are scored by:

```text
awayFromThreat
+ routeSafety
+ friendlyProximity
+ rallyAdherence
+ coverAtDestination
- exposure
- isolation
```

`SHORT_WITHDRAW` is local survival while preserving the macro order. Macro `WITHDRAW` comes from mission/leader or an explicitly authorized morale policy. REGROUP is used when isolated and not dominated by immediate danger.

## Roles

- **Rifleman:** balanced cover, bound, short suppress, optional flank.
- **Machine gunner:** stable firing arc, cover, bounded suppression; avoids chasing.
- **Assistant gunner:** stays functionally close without occupying the same slot.
- **Medic:** helps casualties only when tactical risk permits.
- **Engineer:** high objective adherence; may duck/seek local cover and resume work.
- **Officer/NCO:** coordinates order/rally/contact reports without extra perception truth.

## Wounded model

```text
LIGHT_WOUND
SERIOUS_WOUND
INCAPACITATED
DEAD
```

LIGHT can keep fighting with moderate impairment. SERIOUS reduces combat/mobility. INCAPACITATED cannot fight and may receive help. DEAD never decides. Damage transitions remain outside this task.

## Help wounded

`HELP_WOUNDED` requires an accessible casualty, compatible helper/resource, acceptable route risk, enough squad firepower remaining, order permission and a safe destination.

Future actions may include drag, first aid, covering the rescuer and calling a medic. Existing Bąk/station evacuation scripts remain mission-owned until an explicit migration.

## Morale / cohesion

Two small scalars, not an RPG.

Cohesion decreases with isolation, leader loss, excessive spacing and broken communication. Morale decreases with casualties, heavy suppression, catastrophic nearby blasts and isolation; it can recover with leadership, reinforcement, rally safety and mission success beats.

They modulate willingness for advance/hold/withdraw only. They never change HP, LOS truth or hidden information. Historical constraints may clamp behavior.

## Artillery / blast reaction

A `BlastObservation` carries position, radius class, intensity, observed time and source-known flag.

Possible reactions: crouch/drop, seek cover, interrupt exposed fire, short withdraw, temporary disorientation, then casualty check. No new physics is required here.

## Vehicle reaction

`VEHICLE_DISABLED` or `VEHICLE_FIRE` may yield crew evacuation, safety radius, wreck-as-cover when safe, fire avoidance and conditional crew rescue. VehicleController stays outside this task.

## Building combat

Use tagged slots/connections:

```text
DOORWAY_SLOT
WINDOW_SLOT
ROOM_COVER
STAIR_SLOT
CORRIDOR_LANE
BUILDING_CORNER
```

Doorways are transitions rather than default firing positions. Window capacity is limited. Doorway stacks use queue/spacing. Movement uses valid connections only. LOS/fire never crosses solid walls/floors. Future clearing reserves the next slot before crossing.

## Formation spacing

Formation follows a path centerline plus deterministic lateral/longitudinal offsets derived from seed + squad ID + actor ID. Chokepoints compress to valid slots and formation re-expands afterward.

Same seed => same lanes. No `Math.random()`.

## Friendly-fire awareness

Before SINGLE/BURST/SUPPRESS, inspect an immediate fire corridor shooter -> aim point. If a friendly occupies/crosses it, return HOLD_FIRE or choose another arc, then re-evaluate.

## Player space policy

- short-range occupancy claim for the player;
- allies do not reserve the player's cover slot;
- doorway claims expire quickly;
- side-step before any push behavior;
- never pass through the player;
- do not directly rewrite player coordinates to solve crowding.

The current M01 escort push is legacy behavior, not the future model.

## Difficulty

Difficulty may alter reaction delay, bounded accuracy, re-evaluation cadence, coordination, suppression recovery and aggression. It may never alter LOS through walls, invisible target tracking, grenade knowledge or route legality.

## Determinism

The decision core must not consult `Math.random()`, wall-clock time, renderer frame count, camera state or quality. It may use simulation time, explicit seed/RNG and deterministic decision serial.

Same seed + AI state + inputs => same intent.

## NEAR / MID / FAR

**NEAR:** full individual perception, ThreatMemory, directional cover, reservation, suppression, squad coordination, friendly-fire and building slots.

**MID:** reduced formation AI; one contact/setor per squad, aggregate cover slots, lower decision frequency, deterministic suppress/move.

**FAR:** BattleSector-style summary with order, casualties, supplies, progress and authored historical events.

Camera may influence which simulation fidelity is affordable, but never tactical truth or causal outcome.

## Canonical transition summary

```js
UnitSummary {
  unitId, memberIds, aliveState, order, anchor, threatSector,
  suppressionBand, ammoBand, moraleBand, cohesionBand, rngState
}
```

Promotion/demotion between NEAR/MID/FAR uses canonical state; never camera-derived combat results.

## Future integration order

1. Freeze mission gates/historical scripts.
2. Add read-only adapters for cover/LOS/routes.
3. Integrate 2–4 non-critical actors in a dedicated test scenario.
4. Prove save/determinism and mission-event equivalence.
5. Replace ad-hoc movement/fire with intents group by group.
6. Keep `lethalShot`, demolitions and authored evacuations mission-owned until equivalent tests exist.
7. Never migrate all actors at once.

## Main risks

- double ownership between legacy `Soldier.update` and M01 scripts;
- expensive cover/path scoring every frame;
- reservations without timeout;
- coordinator that makes every soldier unrealistically smart;
- stale ThreatMemory accidentally refreshed from hidden ground truth;
- morale breaking historical staging;
- generic wounded logic overriding authored rescues;
- fidelity switching that changes outcomes instead of only computational detail.
