# M01 — CKM wz.30 fire arc investigation

Date: 2026-10-03
Branch: `codex/m01-ckm-fire-runtime`
Base: `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`

## Result

**BLOCKED — no production implementation committed.**

The ckm crew, weapon kit and authored `aim` / `fire_burst` / `feed` clips exist, but the current west-casemate placement does not have a valid eastward firing line through the production bridge collision geometry.

Verified current muzzle:
- root: `CKM_POSITION = [24.17, -3, 43]`
- authored muzzle socket: 0.83 m along local -Z, 0.64 m above root
- yaw: -PI/2
- world muzzle: approximately `[25, -2.36, 43]`

Verified target sample:
- `de_east_0`: approximately `[1055, 0, 32]`

The direct muzzle-to-target ray intersects production solids before the east bank:
- `road_collider_pier_01` at approximately 112.4 m
- `road_collider_pier_02` at approximately 242.4 m
- farther bridge structure thereafter

A scan of all 40 current `grp_de_east` authored positions found no unobstructed direct line when tested against the bridge solid colliders (terrain/trees would only add blockers).

## Decision

Do **not** connect `fire_burst` to those targets yet.

Prohibited shortcuts:
- ignore the solid bridge piers;
- move the muzzle only in the renderer;
- let the renderer decide a different firing origin;
- suppress/damage enemies through blocked geometry;
- reinterpret `ae_s2_ckm_east` as this west-casemate gun (it is a separate east-sector emitter);
- invent a firing slit/position without map or historical support.

## Next requirement

Before runtime fire can be added, one of these must be proven:
1. a historically/map-supported firing arc and target sector for `cv_casemate_emb_s`;
2. a corrected casemate/bridge collision relationship showing an actual slit through which the gun can fire;
3. a different already-documented position for the ckm crew.

Until then, keep the existing `idle → abandon → retreat` runtime and the real asset clips unused rather than falsifying gameplay.
