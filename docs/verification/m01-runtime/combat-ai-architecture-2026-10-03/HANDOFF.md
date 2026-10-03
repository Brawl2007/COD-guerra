# HANDOFF — M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1

## TASK_ID

`M01-COMBAT-AI-BEHAVIOR-ARCHITECTURE-V1`

## MODELO

GPT-5.6 Sol

## ESFORÇO

HIGH

## BASE BRANCH / HEAD

- Base branch: `codex/m01-mg34-prone-runtime`
- Base HEAD: `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

## BRANCH

`codex/m01-combat-ai-architecture`

No merge, no publish, no production integration, no change to `main`.

## HEAD FINAL REMOTO

The exact final remote HEAD is the commit that contains this handoff. It must be read from the branch ref after this file is committed and reported to the captain. The pre-handoff remote HEAD was:

`3320860997ec3da1042c434c3f4fd21850afe745`

## COMMITS BEFORE THIS HANDOFF

1. `43b2fa3ab6ef101a68393bb35ffc02bea570cab0` — `docs(ai): audit current M01 combat behavior`
2. `68404f8f5a6807f44f2ae2784990b7f320e798ae` — `docs(ai): define layered combat state and orders`
3. `04580c7d5af3471bf25a8369592793f5937bf85b` — `docs(ai): specify perception cover and suppression contracts`
4. `5ca0b06024fe0fdb340ac813bebe3f56d733c2e5` — `docs(ai): define squad tactics retreat wounded and scaling`
5. `88a377298f6252a073b59c5f336d384d01cad30e` — `docs(ai): define squad tactics roles and casualty behavior`
6. `0475dafd02f19cc8bcd124c3fcf956283d923ba1` — `feat(ai): add isolated deterministic combat AI prototype`
7. `226630e88d5c28f44d661e89496bcae46e21f010` — `test(ai): cover deterministic combat AI prototype`
8. `3320860997ec3da1042c434c3f4fd21850afe745` — `test(ai): record prototype tests and performance evidence`

Note: commit `88a3772` was accepted remotely even though the connector request timed out client-side; the branch parent chain later proved the write succeeded.

## CURRENT AI AUDIT

Full audit: `docs/architecture/CURRENT_COMBAT_AI_AUDIT.md`.

Main finding: current combat behavior is split across three systems.

1. **Generic/legacy Soldier AI** — `src/game/actors.js` + `src/world/world.js`: small state machine, simple visual memory, cover/peek/flank/reload and legacy grenade danger.
2. **M01 production prototype** — `src/game/m01-simulation.js`: data entities plus authored group/task movement, LOS fire, deterministic M01 RNG, temporal suppression and historical mission rules. It does **not** use `Soldier.update()` as its tactical brain.
3. **FAR/sector simulation** — `src/game/sector-battle.js`: reduced authored timeline with advance/bombardment/retreat/regroup; not individual combat AI.

The audit classifies each requested behavior as EXISTS, PARTIAL, SCRIPTED or MISSING.

## STATE MACHINE

The proposal deliberately avoids one giant state machine. Four axes are separated:

- **Order:** HOLD / ADVANCE / DEFEND / WITHDRAW / COVER_WITHDRAWAL / RALLY.
- **Immediate action:** OBSERVE, SEEK_COVER, MOVE_TO_COVER, HOLD_COVER, PEEK, SUPPRESS, BOUND_MOVE, FLANK, THROW_GRENADE, EVADE_GRENADE, RELOAD, PINNED, SHORT_WITHDRAW, REGROUP, HELP_WOUNDED.
- **Posture:** STAND / CROUCH / PRONE / MOUNTED / DRAGGING.
- **Condition:** wound state, suppression, pinned, ammo state, morale and cohesion.

The core returns an `Intent`; it does not directly move actors or fire production weapons.

## ORDERS

Orders are persistent mission/squad constraints, not immediate animations.

Example: `ORDER=HOLD` can still allow local cover search, peek, suppress and reload without abandoning the ordered area. Immediate survival behavior never silently rewrites the macro order.

## PERCEPTION

Perception is event/observation driven:

- VISION
- HEARING
- IMPACT
- ALLY_REPORT
- RADIO
- MUZZLE_FLASH

No consumer receives invisible ground truth as tactical truth.

## THREAT MEMORY

`ThreatMemory` stores source, last known position, confidence, uncertainty, observation times and direction.

Critical invariant: once LOS is lost, the hidden target's real position is not copied into memory. Confidence decays and uncertainty grows. A weak memory can justify watching/suppressing a probable exit, not exact wall tracking.

The focused test for this passes.

## COVER SYSTEM

Cover is directional and scored only after hard gates:

- active;
- inside order constraints;
- route exists;
- not unavailable by reservation;
- destination not blocked;
- useful protection when urgent.

Score considers:

- protection from threat direction;
- route safety;
- firing arc;
- squad spacing;
- objective adherence;
- role/weapon fit;
- travel cost;
- crowding.

This avoids `nearest cover` behavior.

## COVER RESERVATION

Prototype contract:

```text
coverNodeId
reservedBy
reservedUntil
slot
```

Leases expire, can be renewed by the same actor, and capacity-1 cover rejects a second actor. No permanent deadlock lock.

## SUPPRESSION

Suppression is an intensity with source direction and deterministic decay, not HP.

Prototype thresholds:

- SUPPRESSED: `>= 0.35`
- PINNED enter: `>= 0.72`
- PINNED recover: `< 0.48`

Hysteresis prevents state chatter. Heavy suppression blocks aggressive movement temporarily but recovery continues.

## PINNED

PINNED is distinct from merely suppressed. It lowers posture/initiative and blocks flank/bound behavior until suppression decays below the recovery threshold.

Focused PINNED recovery test passes.

## FIRE AND MANEUVER

Squad coordinator is intentionally lightweight:

```text
contact
-> select suppressors
-> select movers with valid route
-> bounded suppressive fire
-> BOUND_MOVE
-> mover reaches cover
-> roles may swap
-> reassess
```

It does not make every soldier share perfect knowledge.

## FLANKING

Flank only passes gates for:

- compatible order;
- sufficient ThreatMemory confidence;
- enough allied support;
- real route;
- acceptable exposure;
- useful destination;
- mission/historical bounds;
- acceptable cohesion.

No “every flanker always flanks”.

## GRENADES

Prototype architecture covers both sides:

- reaction chooses reachable safe cover outside blast radius;
- throwing checks distance/path and rejects throws with allies inside blast risk;
- no spam contract is documented for future squad budget/cooldown.

No M01 production grenade code was changed.

## RELOAD

If magazine is empty:

- in cover -> RELOAD;
- exposed with valid cover -> SEEK_COVER before reload;
- no safer option -> emergency exposed reload remains possible.

## ROLES

Documented role biases:

- rifleman: balanced;
- machine gunner: stable arc/suppressor preference;
- assistant gunner: supports collective weapon without sharing exact slot;
- medic: casualty help only if tactically permitted;
- engineer: strong objective adherence;
- officer/NCO: coordination without supernatural perception.

## WOUNDED

Architecture uses:

```text
LIGHT_WOUND
SERIOUS_WOUND
INCAPACITATED
DEAD
```

The existing authored Bąk/station rescue flows remain mission-owned and untouched.

## MORALE / COHESION

Simple non-RPG scalars are proposed. They influence willingness to advance/hold/withdraw based on casualties, suppression, leader state, isolation, reinforcement and historical constraints. They never change hidden information or HP.

## RETREAT

Retreat scores real candidate destinations using threat separation, route safety, friendly/rally proximity, destination cover and exposure. It does not run backward forever.

Prototype scenario G selects `r-west`, away from the threat and toward rally/friendlies.

## BUILDING COMBAT

Architecture defines capacity/connection tags such as doorway, window, room cover, stair, corridor and building corner.

Policies prevent permanent doorway camping, five soldiers sharing a window, wall traversal and firing through floors.

## FORMATION SPACING

Offsets are deterministic from seed + squad ID + actor ID. Chokepoints compress into valid slots and formations can re-expand afterward.

## FRIENDLY FIRE

Before firing, the proposed core checks an immediate shooter-to-aim corridor. A friendly in that corridor produces HOLD_FIRE/alternate arc instead of permanent fire through teammates.

Focused test passes.

## DETERMINISM

Prototype uses explicit deterministic RNG/hash. The decision core does not use `Math.random()`, wall-clock time, camera state or render quality.

Same seed + same state + same inputs => same timeline in the focused test.

## CAMERA INDEPENDENCE

Focused test compares identical tactical input with radically different camera positions/yaws. Decisions are identical.

The architecture also separates camera-driven simulation fidelity from causal combat results.

## QUALITY INDEPENDENCE

Focused test runs LOW / MEDIUM / HIGH quality with identical tactical input. Decisions are identical.

## TOOLS

- `tools/verification/m01-combat-ai-prototype.mjs`

The prototype includes deterministic threat memory, suppression, cover scoring/reservation, grenade safety, flank gates, retreat choice, formation spacing, friendly-fire check, wounded-help gates, scenario runner and isolated performance benchmark.

## TESTS

- `tests/m01-combat-ai-prototype.test.js`
- 21 focused tests executed locally.
- Result: **21/21 PASS**.

Covered requested invariants include no magic tracking, cover direction/reservation, suppression/decay/PINNED, reload preference, flank route gating, grenade reaction/safety, retreat direction, spacing, determinism, camera/quality independence, duplicate reservation, no wall traversal and friendly fire.

Full repository `npm test`, build and browser suite were not claimed as executed in this isolated checkpoint.

## PERFORMANCE RESULTS

Evidence: `docs/verification/m01-runtime/combat-ai-architecture-2026-10-03/VALIDATION.md`.

Three runs per population, 25 decisions per synthetic agent; median:

| Agents | Decisions | Median elapsed | Median microseconds/decision |
| ---: | ---: | ---: | ---: |
| 100 | 2,500 | 141.054 ms | 56.422 |
| 500 | 12,500 | 615.731 ms | 49.258 |
| 1,000 | 25,000 | 1,370.941 ms | 54.838 |

Deterministic checksum stayed identical across all three repetitions for each population.

Approximate serialized-state proxy: 555 bytes/agent, about 54.2 KiB / 271.0 KiB / 542.0 KiB for 100 / 500 / 1000 agents.

These are isolated prototype costs, **not FPS**.

## LIMITATIONS

- no production M01 integration;
- no save schema for future combat brain state;
- no real Tczew cover adapter/path adapter;
- no production weapon/grenade/vehicle controller integration;
- no full building navigation graph;
- no full squad coordinator runtime;
- no real animation binding;
- no browser/FPS conclusion;
- focused tests used Node 22.16 locally; project CI uses Node 24;
- full repository suite/build/browser were not executed in this checkpoint.

## RISKS

- dual ownership if legacy `Soldier.update()` and M01 scripts both control the same actor;
- expensive cover/path scoring if evaluated every frame;
- reservation deadlock if leases are removed;
- coordinator becoming unrealistically intelligent;
- hidden target position accidentally refreshing ThreatMemory;
- morale changing authored historical events;
- generic wounded logic overriding scripted rescues;
- NEAR/MID/FAR switching changing outcomes instead of only computation level.

## FUTURE INTEGRATION PLAN

1. Freeze historical mission gates/scripts.
2. Build read-only adapters for M01 cover nodes, LOS and route queries.
3. Integrate only 2–4 non-critical actors in a dedicated integration scenario.
4. Prove determinism/save and mission-event equivalence.
5. Replace ad-hoc movement/fire group by group.
6. Keep `lethalShot`, demolitions and authored evacuations mission-owned until explicitly migrated with equivalent tests.
7. Use NEAR full individual AI, MID reduced formation AI and FAR BattleSector summary with canonical state handoff.
8. Never migrate the whole M01 combat population in one change.

## RECOMMENDATION TO CAPTAIN

**Architecture is ready for a future integration task, but should NOT be integrated from this branch.**

Keep this branch as audit/design/prototype evidence. When parallel workers for determinism, CKM, battle sectors, destruction and world interactions are reconciled, create a separate integration task/branch starting from the captain-approved consolidated base. First integration target should be a tiny non-critical actor subset with adapter-only reads and regression tests.

## DIFF SAFETY BEFORE HANDOFF COMMIT

Comparison from base `fbaac1e...` to pre-handoff HEAD `3320860...` was:

- ahead by 8 commits;
- behind by 0;
- only new architecture/verification/test/prototype files;
- no modifications to production runtime files;
- no modifications to `main`.

The final diff must be rechecked after this handoff file is added.

## STOP CONDITION

This task ends after the final branch/diff verification.

Do not merge.  
Do not integrate.  
Do not touch `main`.  
Do not choose another task.
