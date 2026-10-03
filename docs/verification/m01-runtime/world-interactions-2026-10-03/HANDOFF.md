# HANDOFF — M01-WORLD-INTERACTIONS-ARCHITECTURE-V1

## TASK_ID

`M01-WORLD-INTERACTIONS-ARCHITECTURE-V1`

## MODELO

GPT-5.6 Sol

## ESFORÇO

HIGH

## BASE

`codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

## BRANCH

`codex/m01-world-interactions`

## CURRENT AUDIT

See `CURRENT_AUDIT.md`.

Current M01 has one player `Wz29`, explicit magazine/reserve/reload/bolt state, one `KeyE` interaction input, one simulation-owned interaction HUD prompt, direct scripted objective interaction checks, production spatial obstruction helpers, special MG34/CKM state and no generic vehicle/mounted/pickup system.

There is no production TankController, jeep controller, seat state, artillery operator system or generic dropped-weapon entity at this base.

## INTERACTION CORE

Proposed one simulation-side contextual resolver. Candidates share ID, kind, anchor, range, angle, priority, prompt and availability. Filtering uses distance, view angle, production obstruction, policy and player state; tie-breaking is deterministic. Scripted/rescue actions outrank pickups.

## WORLD WEAPON MODEL

Stable instance ID + weapon type + transform + holder + discriminated feed state + condition/protection/persistence/provenance/presentation ID. Weapon identity survives actor death, pickup and later drop. Renderer asset identity is not gameplay authority.

## PICKUP/DROP

Pickup requires proximity, interaction cone, clear trace, availability, no living-NPC ownership and no protected flag. Swapping transfers the chosen instance and drops the old instance only after a safe point is validated. No automatic magazine refill occurs.

## AMMO COMPATIBILITY

Loose cartridge compatibility is based on explicit caliber. Feed devices additionally require an approved family/mechanism. The prototype deliberately does not assume that same-caliber chargers/magazines/belts are interchangeable. `.30-06` never becomes `7.92x57`.

## CLEANUP POLICY

Three classes: persistent important, nearby dropped, cleanup eligible. Protected/persistent/observed/actively-interacted/nearby items are preserved. Eligible overflow is removed deterministically by `droppedAt`, relevance/distance policy and stable ID. No RNG or renderer LOD controls deletion.

## FIXED WEAPONS

Generic `MountedWeapon` contract owns operator station, pivot, muzzle, traverse/elevation, feed, status, exits and crew requirements. Entry uses physical station/trace; aiming clamps to authored limits; firing still uses a world obstruction query; exit needs safe authored space.

## CREWED WEAPONS

Crew stations are independent roles. Action requirements declare which roles are needed. Player occupying gunner/operator never silently fills loader/commander/ammo-handler roles. `singleUserCapable` must be explicit.

## ARTILLERY

Generic future interface: traverse, elevation, shell selection, load, fire, recoil/recovery. No specific historical artillery piece was implemented. Prototype scenario E only proves role dependency with a generic `artillery_prototype` feed state.

## MORTARS

Architecture defines mount/bearing/elevation/shell/load/fire/min-max-range contracts plus immediate muzzle/ceiling clearance. A valid range never authorizes firing through a roof.

## VEHICLES

Vehicle record separates transform, status, mobility, faction, player-operable/capturable policy, seats, mounted weapon references and damage state. `abandoned` does not automatically mean usable, especially for enemy vehicles.

## SEATS

Every seat has stable ID, role, physical entry point, ordered exit points, access type, occupant and allowed controls. Driver/passenger/gunner/commander/loader roles remain distinct.

## ENTRY/EXIT

Entry checks status, vacancy, distance, access point and obstruction before anchoring the player. Exit searches authored candidates deterministically and refuses to eject player into blocked/unsafe space. If no safe exit exists, player stays seated.

## SAVE CONTRACT

Production schema 2 is unchanged. Prototype uses `prototypeSchema:1` only for architecture validation. A future migration must persist stable ownership references, world weapons/feed, mounted angle/ammo/occupancy, vehicles/damage/seats/crew and validate the whole graph atomically before mutation.

Checkpoint restart should restore the entire interaction graph, reversing pickups/drops/seat changes/cleanup made after the checkpoint rather than reconciling partial death-time state.

## ASSET FALLBACK

`presentationId` is optional. Tests prove removing all presentation IDs does not change gameplay fingerprint or pickup resolution. Future GLB failure must leave interaction proxy, collision, ammo, seat state and save untouched.

## TOOLS

`tools/verification/m01-world-interactions-prototype.mjs`

Exports pure helpers and five scenario fixtures; it is not imported by `src/**`.

## TESTS

`tests/m01-world-interactions-prototype.test.js`

25 focused tests covering all requested isolated contracts.

## RESULTS

- focused: **25/25 pass**;
- full `npm test`: **249/249 pass**;
- build: **PASS**;
- prototype scenarios A–E: PASS and recorded in `prototype-results.json`;
- browser: not run because no production/browser code changed.

## LIMITATIONS

- No production inventory or weapon switch exists yet.
- No production world-weapon IDs exist for ordinary actors.
- Current Wz.29 has no independent persisted chamber field; prototype uses `chamber:'unmodelled'` where appropriate.
- Current NPC ammunition modeling is uneven; actor `weapon` strings are not enough to construct truthful physical drops.
- No generic vehicle/artillery/mortar simulation exists yet.
- Physical mounted arcs still require per-asset/per-position evidence; this architecture does not infer them from animation clips.
- Save schema migration design is documented but not implemented.

## RISKS

Biggest integration risks are item duplication across checkpoint restore, accidental ammo creation during actor→world transfer, one `E` action triggering multiple systems, seat/weapon occupancy backlink corruption, cleanup deleting mission-critical items, and tying gameplay availability to renderer asset load.

Parallel MG34/CKM/determinism/destruction work should remain untouched until this system has a dedicated production-integration branch.

## NEXT INTEGRATION STEP

Do **not** start vehicles or artillery first. Lowest-risk first production increment:

1. add stable world-weapon instance data for exactly one controlled rifle case;
2. add simulation-side contextual resolver while registering existing M01 scripted interactions unchanged at higher priority;
3. design/review a schema migration before persisting any dropped weapon;
4. prove dead-actor rifle → world entity → pickup → drop → checkpoint restore with no duplicate/ammo reset;
5. only after that, reuse the same resolver/entity ownership contracts for fixed MG stations and later vehicle seats.

## RECOMMENDATION TO CAPTAIN

The architecture is ready as a basis for future implementation, but it should be integrated in small layers. The first real target should be a single dropped rifle workflow, not a tank/jeep/artillery implementation. That proves the hardest shared contracts — identity, ownership, ammo preservation, contextual priority and save determinism — before more complex stations depend on them.

M01 remains **PROTÓTIPO JOGÁVEL**. No gameplay integration was performed.
