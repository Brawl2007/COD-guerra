# World Interaction System — architecture contract

Status: design/prototype only. M01 remains **PROTÓTIPO JOGÁVEL**. This architecture does not change schema 2, controls, HUD or production runtime.

## Core rules

1. Simulation owns availability, ownership, ammo, damage, seat occupancy, mounted state and cleanup. Renderer only presents state.
2. Stable instance IDs survive actor death, pickup and later drop. Transfer changes ownership/location; it does not respawn the weapon.
3. One contextual interaction resolver serves scripted actions, pickups, mounted weapons and seats.
4. Interaction uses distance + view angle + production obstruction trace + explicit priority + player state. Never through a wall.
5. Mounted/vehicle controls obey authored physical limits and access points.
6. Crew roles are explicit. A player in a gunner station does not silently become loader/driver/commander.
7. Cleanup is deterministic and never renderer/LOD driven.
8. Mission/historical restrictions are explicit flags such as `protected`, `persistent`, `capturable`, never inferred from mesh or nationality.
9. Optional GLBs never own gameplay state.

## Domain boundary

Future state should sit beside mission simulation data:

```text
MissionSimulation
  player / actors / clocks / objectives / RNG
  current weapon/inventory references
  worldInteractions
    looseWeapons
    ammoEntities (only when physically needed)
    mountedWeapons
    vehicles
    interaction locks/reservations
```

All interaction state must be JSON-compatible data. No Three.js object, AnimationMixer, DOM node or asset handle enters save state.

## Stable IDs

Recommended examples:

```text
ww:m01:de_east_7:kar98k:0
mw:m01:gate_mg34_road
veh:m14:jeep_02
seat:veh:m14:jeep_02:driver
```

IDs are assigned by simulation when the instance is created. Pickup/drop never changes them.

## WorldWeapon

Use a small common envelope plus a discriminated feed state, not one giant record where every weapon pretends to have the same mechanism:

```js
{
  id, weaponType,
  position, orientation,
  holder: null | {kind:'actor'|'player'|'mount', id},
  feed,
  condition,
  protected, persistent,
  droppedAt,
  sourceActorId,
  presentationId
}
```

Possible feeds:

```js
{kind:'internal-magazine', rounds:4, capacity:5, chamber:'unmodelled'}
{kind:'detachable-magazine', magazineId:'mag:...', rounds:17, capacity:20, chamber:'loaded'}
{kind:'belt', beltId:'belt:...', rounds:36, capacity:50, chamber:'loaded'}
{kind:'single-shot', chamber:'loaded'}
```

`chamber:'unmodelled'` is deliberate: current M01 Wz.29 does not persist an independent chamber flag. A future migration must not invent one silently.

Reserve ammo normally belongs to inventory/ammo containers, not every loose weapon. Include reserve with a world weapon only when a physical container belongs to that instance.

## Actor death and physical drop

Death transaction:

```text
actor owns weaponInstanceId
→ actor becomes dead/DOWN
→ ownership link released once
→ same WorldWeapon gets deterministic body-relative drop transform
→ exact feed/ammo state stays unchanged
```

Presentation may leave the weapon in the hand, detach it beside the body, or apply a small deterministic impulse. Do not spend RNG just to scatter drops unless that RNG draw is part of the saved contract. A weapon attached to a living NPC is not pickup-available.

## Pickup / drop

Pickup requires all of:

```text
available loose weapon
near enough
inside interaction cone
clear interaction trace
not protected
not owned by living actor
player state allows interaction
```

For a one-primary-weapon prototype:

```text
pickup A while player owns B
→ validate drop point for B
→ drop B, preserving ID/feed/condition
→ transfer A to player
→ A.position = null
```

Future inventory capacity is a separate design decision. A failed safe-drop placement must fail the swap instead of placing an item inside solid geometry.

## Ammunition compatibility

Separate **cartridge compatibility** from **feed-device compatibility**.

```js
weapon = {id:'kar98k', caliber:'7.92x57', feed:{kind:'internal-magazine', chargeFamilies:['weapon-approved-charger-family']}}
ammo   = {kind:'cartridges', caliber:'7.92x57', rounds:12}
mag    = {kind:'magazine', caliber:'7.92x57', family:'rkm28-mag', rounds:11}
```

Same caliber can make loose cartridges compatible. It does not prove charger interchangeability and does not make a detachable magazine, belt or drum compatible. `.30-06` never converts to `7.92x57`. Clips are chargers/feed aids, not magical magazines. No generic “ammo points”.

## Context interaction resolver

Every interactable contributes a candidate:

```js
{id, kind, anchor, maxDistance, maxAngleDeg, priority, prompt, available, protected}
```

Resolver filters then sorts deterministically by:

1. explicit priority class;
2. view angle;
3. distance;
4. stable candidate ID.

Recommended priority order:

```text
mission-critical scripted
rescue/safety
current station exit
mounted weapon / vehicle seat
weapon pickup/drop
non-critical inspect/help
```

This prevents a floor rifle stealing `E` from “levar Bąk”. HUD prompt and activated action must come from the same resolved candidate ID. Integration should inject `traceInteraction(origin,target)` using production `traceObstruction()`/world collision.

## Cleanup policy

### persistent important

Never auto-remove objective/protected/persistent items, equipped/selected entities, current interaction references or sequence-required entities.

### nearby dropped

Keep drops inside authored keep radius or currently observable/interactable.

### cleanup eligible

Only unprotected, unreferenced loose entities outside keep radius and older than minimum age.

Deterministic eviction order:

```text
oldest droppedAt → distance/relevance policy → stable ID tie-break
```

Enforce a `maxLooseWeapons` budget without using render visibility or RNG.

## MountedWeapon

Generic mounted weapon state:

```js
{
  id, weaponType,
  mountTransform, pivot, muzzle,
  operatorStation, exitAnchors,
  traverse:{min,max,current},
  elevation:{min,max,current},
  feed,
  status:'operational'|'disabled'|'destroyed',
  occupantId,
  crewRequirements,
  protected,
  presentationId
}
```

Flow:

```text
approach station
→ clear interaction trace
→ reserve station atomically
→ anchor player to operator pose
→ map aim input to traverse/elevation
→ constrain to authored physical arcs
→ fire from real muzzle through production collision
→ exit via safe anchor
→ release station
```

Animation extrema are not proof of mechanical traverse. Arc limits must come from the actual mount/geometry/research. Even a legal arc does not authorize a shot through a wall or pillar.

### Fixed MG

A fixed MG is just a `MountedWeapon` with tripod/bipod state, pivot/muzzle, feed and gunner station. Existing M01 MG34/CKM runtime is not changed here. A loader/assistant only affects gameplay if the weapon's simulation contract explicitly requires that role.

## Crewed weapons

Generic crew stations:

```js
crewStations:[
  {id:'gunner', occupantId:null},
  {id:'loader', occupantId:'npc_loader'},
  {id:'ammo_handler', occupantId:null},
  {id:'commander', occupantId:null}
]
```

Action requirements are weapon-specific, for example:

```js
requirements:{
  aim:['gunner'],
  load:['loader'],
  fire:['gunner','loader']
}
```

A player occupying `gunner` does not fill `loader`. `singleUserCapable:true` must be explicit for weapons designed to work that way. If a required crew member dies, leaves or is unavailable, only dependent actions become unavailable according to the authored rule.

## Artillery interface

Future artillery uses mounted/crewed contracts plus an explicit cycle:

```text
UNLOADED → LOADING → LOADED/READY → FIRED/RECOIL → RECOVERING → UNLOADED
```

Future commands: traverse, elevate, select compatible shell, load, fire, recover. Shell count/type is real state; sitting in the gunner station never creates ammunition. Recoil belongs to simulation if it changes collision/next-shot state; cosmetic shake belongs to renderer.

## Mortar interface

Mortar adds:

```text
bearing + physical limits
minimum/maximum elevation
shell/chamber state
validated min/max range
operator/loader stations
muzzle-clearance query
```

Load and fire are separate. Fire is rejected without compatible shell/required crew, outside mount limits, or when muzzle/initial trajectory is obstructed by roof/ceiling/solid geometry. Range limits never mean “shoot through ceiling”.

## Vehicle state

```js
{
  id, type,
  transform, velocity,
  status:'operational'|'damaged'|'disabled'|'abandoned'|'burning'|'destroyed',
  mobility:{canMove, steeringFactor, speedFactor},
  faction,
  playerOperable,
  capturable,
  seats:[...],
  mountedWeapons:[...],
  damageState,
  protected,
  presentationId
}
```

`abandoned` does not automatically mean drivable. Enemy capture requires explicit `playerOperable/capturable` and mission permission.

## Seats

```js
{
  id,
  role:'driver'|'passenger'|'gunner'|'commander'|'loader',
  entryPoint,
  exitPoints,
  access:'door-left'|'door-right'|'hatch-top'|'open',
  occupantId,
  controls:['drive'] | ['mounted-weapon:...'] | [],
  enabled:true
}
```

Entry checks vehicle state, seat vacancy, distance to the physical entry point, clear path/trace, access door/hatch policy and player interaction lock. Only after those checks succeeds may the player be anchored to the seat.

## Safe exit

Each seat provides an ordered list of exit anchors. For each candidate, simulation checks:

- collision capsule/space free;
- inside mission/map boundary;
- outside vehicle footprint;
- no overlap with living actor;
- clear access segment when required.

Pick the first valid point in deterministic authored order. If all are blocked, keep the player seated and return a blocked-exit prompt. Never teleport through wall, underneath vehicle or out of map.

## Vehicle crew

Roles remain distinct:

```text
driver      → hull movement
loader      → main-gun load cycle
gunner      → turret/cannon aim/fire
commander   → observation/orders where modeled
bow gunner  → hull MG when historically applicable
passenger   → no drive/gun controls by default
```

A specific mission can author a deliberate abstraction, but the default system never gives driver+gunner+loader+commander to one seat.

## Vehicle status permissions

Safe baseline:

| state | enter | drive | mounted weapon |
|---|---|---|---|
| operational | yes | driver if allowed | if subsystem works |
| damaged | policy | mobility dependent | subsystem dependent |
| disabled | policy | no | subsystem dependent |
| abandoned | policy | only explicit operable/capturable | subsystem dependent |
| burning | no by default | no | no |
| destroyed | no | no | no |

Damage gameplay state must not be inferred from damaged renderer mesh.

## Future save contract — not schema 2

A later schema migration must preserve enough JSON to restore exactly:

```text
world weapon IDs + ownership/location + feed/condition
player equipped/inventory references
mounted angles + feed + operator occupancy + cycle state
vehicle transform/velocity/status/damage
seat occupancy
crew role occupancy/tasks
interaction transaction locks only if they must survive checkpoint
```

Prefer references by stable ID rather than duplicating full objects inside player/actor/vehicle records.

Validation must prove before mutation:

- every referenced ID exists exactly once;
- one entity has at most one owner;
- one actor does not occupy multiple exclusive stations;
- seat/mount occupant backlinks are consistent;
- ammo counts/capacities are finite non-negative integers;
- mounted angles/states are inside authored ranges;
- vehicle/seat statuses are legal.

Restore should validate a candidate graph fully and only then replace live state, matching current atomic M01 philosophy.

### Player death/checkpoint

Recommended behavior is whole-graph checkpoint restore, not partial reconciliation with the death-time world. Therefore a pickup/drop/seat/vehicle change made after checkpoint is undone exactly on checkpoint restart. Mounted angles/ammo, vehicle damage and crew occupancy return to checkpoint values. This prevents duplication and makes cleanup reversible through checkpoint state.

## Asset fallback

Gameplay entities use interaction/collision proxy data independent from asset loading. `presentationId` is optional renderer metadata only.

If a GLB is missing:

- interaction entity still exists;
- collision proxy still exists;
- ownership transfer still works;
- ammo/feed still works;
- seats/occupants still work;
- save/restore is unchanged.

Only presentation may fall back or disappear where safe.

## Integration seam with current M01

A low-risk future sequence is:

1. Keep existing `Input` mapping `KeyE → controls.interact`.
2. Add a simulation-side `ContextInteractionResolver` producing one `{candidateId,prompt}`.
3. Register current scripted M01 objective actions as high-priority candidates without changing their effects.
4. Add loose-weapon candidates only after a reviewed save migration and weapon-instance model.
5. Add mounted/vehicle station candidates through the same resolver.
6. Generalize player weapon inventory/HUD only after transfer semantics are proven.

This avoids conflicts with current MG34, CKM, destruction, battle-sector and determinism work.

## Prototype in this task

`tools/verification/m01-world-interactions-prototype.mjs` is intentionally isolated from `src/**`. It proves only the data/transaction contracts for:

- a dead enemy Kar98k retaining four rounds through pickup;
- swapping and dropping the player's old weapon without resetting ammo;
- cartridge vs feed-device compatibility;
- deterministic cleanup;
- fixed MG operator enter/aim/exit with physical limits;
- crew-role dependency for artillery;
- jeep driver/passenger/gunner seats and physical entry/safe exit;
- explicit destroyed-vehicle rejection;
- prototype snapshot/restore;
- missing-asset independence.

It is not a production gameplay implementation and is not imported by the game.
