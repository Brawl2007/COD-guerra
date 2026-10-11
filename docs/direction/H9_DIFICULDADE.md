Desenho aprovado pelo Captain (D35, ao abrigo de D34). Implementação faseada D1–D5.

# H9 — M01 difficulty and danger: design (not implemented)

Worktree `COD-guerra-v7-cert`, branch `claude/m01-stack-integration-t44-t20-v1`. Approved by the user as H9 (DECISIONS.md on
`claude/gracious-franklin-u8kdin`). Design only; no code changed. Line numbers are `src/game/m01-simulation.js` unless stated.

**Changes in the game:** chance a shot wounds, damage per wound, enemy aim error, how often enemies fire, who they pick as
target, Kowal's ammo resupply, healing, one new checkpoint before the repair, death reason and a short death beat, and a
difficulty selector. **Does not change:** historical structure, events, objectives, battle-clock timings, phases, cast,
casualty-by-ID rules (east platoon, Bąk), bomb/demolition impact points, map, enemy line of sight (no sight through walls),
save schema number (stays `schema:2`) or save key (`cod-guerra:checkpoint:m01:v2`).

## 1. Inventory (evidence)

| Path | Where | Hurts player? | RNG draws |
|---|---|---|---|
| Enemy round lands | `landRound` 572–604; wound at 585–587: `rng.next()<(coverAt?.06:.2)` then `health-=8` | yes, only source of enemy damage | 1 draw, **only** when `traceRound` hits the player collider (short-circuit `hit.actor===p&&…`) |
| MG34 / Kar98k targeting (dike) | `eastFire` 473–496: MG `cooldown=8+r()*5`, targets player if `west&&sees(p)`; de_east_0 locked on the repair during `cover_repair` (482–483); rifles `9+r()*9`, `r()<.5` east, `r()<.45` repair | via rounds | fixed draws per branch |
| Spans riflemen | `spansFire` 501–506: `3+r()*3`, `r()<.25&&sees(player)` | via rounds | 2 draws |
| Burst / dispersion | `burst` 528–550; `makeRound` (`m01-fire.js:37-42`): bias+cone in mrad × range/1000. MG on player: rounds `4+floor(r*3)`, bias `[1.2,.8]`, cone `[.7,.5]`, tracer only on round index 1 (540/545). MG validator: 4–7 rounds, fixed interval (533) | — | `gauss()` 526 = 2 draws each (loop practically never repeats); shared bias + 1 gauss pair per round |
| Cover-adjust salvo | 699–713: after 42 s in one cover, one MG burst (7 rounds, bias `[.5,.3]`, tracer) or ≤4 rifles; Zieliński message at 712 | via rounds | via `burst` |
| Own grenade | 631–645: radius 8 m, `(1-d/8)*100`, needs LOS; player included | yes (self) | none |
| Aerial bombs | `impact` 266–270 + `safeImpact` 261–265: <30 m is moved to 40 m, throws if still <30 m; **no damage code at all** | no | none |
| Demolitions | 246, 251: `impact(…,false)`, no player damage | no | none |
| Falls | `tczew-world.js:82-86`: movement blocks stepping off spans | no | none |
| Water / bounds | `boundaries` 648–661: 8 s at `y<=-9` or bounds grace → `failure` text, `alive=false` | yes (fail) | none |
| Artillery / Panzerzug | 224: dialogue only | no | none |

**HP/heal/death:** health 100 (`entity` 17); no healing anywhere (only writes: 587, 643). Death = `alive=false`; next
`tick` (663) calls `restoreCheckpoint()`, emits `restored`, shows `failure` only for water/bounds (combat death has no reason).
`game.js:237-238` resets HUD and says "A retomar o último checkpoint". **Checkpoints:** CP-A 125 (intro, 04:30:44), CP-B 335
(20 s after the 04:34 bombing; mission.json clock 04:38), CP-C 336 (second raid ended, 05:34), CP-D 337 (after east demolition,
`x<-20`, not carrying). `saveCheckpoint` 278–281 snapshots and `game.js:245` persists `sim.checkpoint` to localStorage.
**Save:** `snapshot` 896–903, `restoreSnapshot` 905–932 (new candidate from `s.rng`, additive defaults at 919–921 e.g.
`enemyFire??`, `timers.kowalRounds??30`), validator 936–1062 (ids vs `definition.checkpoints` 1049; weapon invariant
`mag+reserve+shotCount===45+received`, `reserve<=40` 1007–1011; grenades `ammo<=2` 1019).

**Measured baseline** (scratch probes, subclassing `landRound`, current code, `tests/helpers/m01-route.js`):
full scripted route, 12 seeds (19390901, 1–11): 1–12 player-colliding rounds per *whole mission* (median 4), 0–3 wounds,
final health 76–100, zero deaths. Standing still exposed at (−28,28) for the entire repair (≈180–220 s sim), seeds 19390901/5/6:
1–3 collisions = **0.3–0.8 per minute**, standing ≈ crouched, never >1 per burst. So today's danger is limited first by
*incoming volume and aim*, not only by the 0.20 roll: even with p=1 and 34 damage, exposed time-to-death would be 4–10 min.

## 2. Difficulty model

Internal levels `recruta | soldado | veterano`. **`recruta` = today's constants exactly** (baseline): every existing test,
fixture and A/B proof stays byte-identical, and legacy saves keep the tuning they were played with. New rules (telegraph
clamp, burst cap, regen, CP-B2) are active only on soldado/veterano. Starting values (calibrated in D2; see bands below):

| Parameter (code site) | recruta | soldado (default) | veterano |
|---|---|---|---|
| Wound chance on collision, exposed / in cover (585) | .20 / .06 | .90 / .35 | 1.0 / .50 |
| Damage per wound (587) | 8 | 34 (3 wounds) | 50 (2 wounds) |
| Max wounds per single MG burst | — | 2 (full HP survives any one burst) | none |
| Aim error × (bias & cone, kinds `player`/`cover` only, 489/505/710) | 1.0 | 0.55 | 0.40 |
| Cooldown × for fire at the west bank (478–492, 502) | 1.0 | 0.75 | 0.60 |
| Rifle gate shooters: east-only threshold `r()<.5` (488) | .50 | .35 | .25 |
| Spans pick player `r()<.25` (504) | .25 | .40 | .50 |
| de_east_0 during repair: share on a visible player within 8 m of the sappers | 0 | 30 % | 50 % |
| Cover-adjust salvo after N s in one cover (700, 707) | 42 | 30 | 20 |
| Reaction grace after a shooter's first telegraph (§3) | — | 1.5 s | 0.8 s |
| Healing | none | +5 HP/s after 8 s unhit, cap 100 | none |
| HP on checkpoint save/restore | as saved | 100 | 100 |
| Kowal resupply pool `timers.kowalRounds` (94, 323) | 30 | 30 | 15 |
| Grenades / start ammo | 2 / 5+40 | 2 / 5+40 | 2 / 5+40 |
| Bombs | non-lethal | non-lethal | non-lethal |

**Time-to-death targets** (standing in LOS of the active MG during a hard phase; 1 km range): recruta ≫ 10 min
(effectively non-lethal, as today); **soldado 15–25 s exposed, ≥ 120 s crouched in cover**; veterano 8–12 s exposed,
≥ 60 s in cover (the 20 s cover-adjust salvo forces moves). Why: at ~1 km the MG's beaten zone, not sniping, is the threat;
15–25 s means "spotted, two or three bursts, you are dead if you stay", which matches "poucos tiros matam quem fica exposto"
while letting cover and movement save you. Reaching it needs roughly 15–25× today's exposed collision rate: aim ×0.55 gives
≈3× per round, cadence ≈1.3×, rifle/spans target choice ≈2×: ≈8–10× on its own. The rest comes from de_east_0, which today
**never** fires at the player during the repair (482–483): a 30 % share is a step change (a 4–6 round burst at the player
about every 25 s), not a multiplier. Calibration may still need soldado aim error down to 0.40 or the TTD band moved to
20–40 s; the sweep decides, and any change beyond the bands is reported back, not silently applied.
**Resources:** start loadout stays (changing it breaks the weapon/grenade invariants 1007–1024); the lever is Kowal's pool.
**Where it lives:** sim field `this.difficulty`, constructor `new M01Simulation(seed,{difficulty='recruta'})`, set before
the first `snapshot` at line 100; the fresh sims built in `restoreSnapshot` (906) and for the backup (929) receive it; snapshot
top-level `difficulty`, **omitted when `recruta`** (precedent: 903 omits redundant data) so recruta saves are byte-identical;
restore `s.difficulty ?? 'recruta'`, forwarded to the backup sim for `resumeCheckpoint`; validator: absent or one of three
strings, and `resumeCheckpoint.difficulty` must equal the outer one. UI: `#difficulty` select next to `#quality`
(`src/main.js:72`), `localStorage 'cod-guerra:difficulty'`, default **soldado** for new games; on "Continuar" the save's
level wins. Shown on the menu, the pause screen and the checkpoint card ("CP-C · Engenheiros · Soldado").

**Determinism:** per (seed, level). recruta keeps the stream exactly (constants untouched). Draw-neutral levers: thresholds
(585, 488, 491, 504), damage, bias/cone multipliers, cooldown constants (multiply after the draw), cover-call timing, regen,
clamps. Stream-changing: more player-colliding rounds ⇒ more 585 draws (accepted, per-level); new draws (de_east_0 share
on the player) only behind `difficulty!=='recruta'`. The 585 roll keeps exactly one draw per collision on all levels, also
when the telegraph clamp or burst cap applies. Death restores `rng.state` from the checkpoint: same inputs replay the same
retry (intended; real players never repeat inputs).

## 3. Fair-death rules (soldado and veterano)

Telegraph = any of: (a) a `round-impact` with `crack` (round passed ≤6 m of the player's eye, 603), (b) a tracer round
(540/545) from a burst aimed at the player, (c) muzzle flash of an `enemy-fire` (548, 377) from a shooter with LOS to the
player, (d) MG callout `co_m01_enemy_mg_fire_on_squad` / `dlg_m01_027` (494), Zieliński's cover message (712),
`dlg_m01_026` (493). Sim records `timers.telegraph = {lastAt, by:{shooterId:firstAt}}` (optional field, default `{}`).

- **Rule F1:** a wound may reduce health to 0 only if the same shooter telegraphed ≥ grace (1.5 s / 0.8 s) ago **and** some
  telegraph happened within the last **6 s**. Otherwise damage applies but health is clamped at ≥ 1. Kar98k has no tracer,
  so its first round to the player is the telegraph. Consequence: the first burst at you never kills ("MG suppresses first"
  survives as F1 on all hard levels).
- **Rule F2:** soldado burst cap (table). Rounds carry no burst id; group draw-free by `(r.by, firedAt within 7×0.075 s of
  the burst's first round)` tracked in `timers.telegraph`. Do **not** add a `burstId` to rounds: `validRound`
  (`m01-fire.js:44`) checks a fixed field set. **F3:** bombs and demolitions never damage the player (30 m rule kept on all
  levels; impact points unchanged). **F4:** no lethal wound during a cutscene — *not true today*: `updateActors`/
  `updateCombat` (686) run outside the `!locked` block and only intro/roll_call lock input, so rounds can land during
  `cs_m01_order`, bombing and blast scenes; D4 adds the clamp and the assertion. **F5:** every combat death carries `failure` with cause and shooter,
  e.g. "Abatido pela MG34 do dique (portões)."
- Telegraph bookkeeping makes no RNG draws.

## 4. Death and checkpoint flow

Death (health 0): sim sets `failure` (F5) and emits `{type:'player-down',cause,by}`; `game.js` shows a 2.5 s death beat
(fade, cause text) **without ticking the sim** (presentation pause, like menus), then the existing next-tick restore (663)
runs. Session-only death counter per checkpoint id in `game.js` (not saved).

| Hard phase | Checkpoint before it | Evidence |
|---|---|---|
| Repair cover 04:52–05:30 | **new CP-B2 "Reparo"** at `activate('cover_repair')` (303), position policy `current` like CP-D | CP-B is at 04:38 with find_sappers + fetch_material in between; repair needs 150 s work (`REPAIR_WORK_SEC` 52) |
| Cover change under adjusted fire (hold_access, 05:30–06:00) | CP-C (336, 05:34) | `pendingCheckpoint` set at `order_demolish` 226 |
| Corridor 06:10–06:45 | CP-D (337) | after `east_demolition` 06:10, before `hold_corridor` 332 |

CP-B2 needs one `mission.json` `checkpoints[]` entry (`cp_m01_b2_reparo`, label "CP-B2", trigger
`{objective:"obj_m01_cover_repair"}`, clock "current", same shape as CP-D: `player`, `restore{eventsConsumed,objectives,
actors,destruction,sectors,flags}`, `neverSaveIf`, `clockNote`); the validator (1049) accepts it automatically. Saved only
when `difficulty!=='recruta'` (keeps recruta route byte-identical). **Expected test churn** because mission.json is shared:
`tests/m01-runtime.test.js:48` asserts the route reaches every `definition.checkpoints` id → filter by level;
`tests/m01-cover-threat.test.js:80` lists the four ids explicitly (still passes on recruta). On soldado/veterano `saveCheckpoint` sets health 100 before
snapshotting (no death spiral). **No schema break:** `difficulty` and `timers.telegraph`/`timers.lastHitAt` are additive
optional fields with defaults in `restoreSnapshot` (pattern 919–921); `schema` stays 2. Old builds reject nothing new
except a CP-B2 id (forward-only, acceptable). Legacy saves load as recruta.

## 5. Implementation plan (sequential task contracts)

- **D1 Difficulty data + selection in sim** *(reviewer-critical: save compat)*. Files: new `src/game/m01-difficulty.js`
  (frozen table), `m01-simulation.js` (constructor option, snapshot/restore/validator only). Tests: new
  `tests/m01-difficulty-save.test.js` (legacy save → recruta; soldado round-trip; bad value rejected; resumeCheckpoint
  mismatch rejected; recruta snapshot has no `difficulty` key) + full `npm test`.
- **D2 Damage/accuracy/cadence wiring** *(reviewer-critical: RNG)*. Files: `m01-simulation.js` (585–587, 473–506, 699–713,
  Kowal pool), table values. Tests: recruta byte-identity (`m01-schema2-determinism`, `m01-cover-threat`,
  `tools/verify-m01-route.mjs`, `tests/helpers/m01-anim-baseline.mjs` run manually), per-level restore A/B, one-draw-per-
  collision assertion; calibration sweep (§6) tunes the table to the TTD bands.
- **D3 Death + CP-B2 + regen/HP-at-checkpoint** *(reviewer-critical: mission.json + save)*. Files: `m01-simulation.js`
  (failure cause, `player-down`, CP-B2, regen), `missions/m01-tczew/mission.json` (one checkpoint entry). Tests: death →
  restore at CP-B2/C/D per level, cause text, recruta has no CP-B2; update `m01-runtime.test.js:48` to level-applicable ids.
- **D4 Telegraph guarantees (F1–F5)**. Files: `m01-simulation.js`, new `tests/helpers/m01-danger.js`,
  `tests/m01-fair-death.test.js`. Tests: every lethal wound in the 12-seed sweep has a qualifying telegraph; first burst
  never kills; zero extra draws.
- **D5 UI/presentation**. Files: `index.html`, `src/main.js`, `src/game/game.js`, `src/ui/m01-hud.js`. Death beat, level
  select, checkpoint card level, optional "lower level" offer. Tests: `tests/game.test.js` additions + one Playwright check.
  Renderer only reads events/state; no damage logic.

## 6. Test and evidence plan

- Baseline (done, scratch): table in §1. Re-run after D2 with the same probe for A/B.
- New `tests/helpers/m01-danger.js` built on `driver`/`toRepair`/`toCoverAdjustment` (`m01-route.js`): scenario
  **exposed** = standing at an MG-visible west-bank point during repair and during hold_access; **covered** = crouched
  inside `cv_sandbag_mid_2` (coordinates from `map-layout.json`), no movement. 12 seeds (19390901, 1–11) × 3 levels.
  Metrics: deaths, time-to-death, wounds per burst, telegraph age at each lethal wound, death clock vs phase.
- Pass bars: recruta 0 deaths in both scenarios and byte-identical baseline; soldado exposed median TTD 15–25 s,
  covered ≥ 120 s or no death; veterano exposed 8–12 s, covered ≥ 60 s; F1 holds for 100 % of lethal wounds.
- Must still pass unchanged: `npm test` (incl. `m01-schema2-determinism`, `m01-cover-threat`, `m01-ckm-placement-migration`,
  `m01-combat-feedback`), `tools/verify-m01-route.mjs`, anim baseline helper. The scripted route pilot is **not** expected
  to survive soldado/veterano; full-route tests stay on recruta.
- Memory rule for sweeps: `MemAvailable ≥ 300 MB`, one run at a time, `timeout 900` (~25 s per seed per run).

## 7. PENDENTE HUMANO

1. **Recruta = today's prototype tuning?** Recommended: yes (true A/B baseline; only `m01-runtime.test.js:48` changes, for CP-B2). If recruta must be harder,
   a hidden `prototipo` profile keeps the tests.
2. **Healing model.** Recommended: soldado slow regen out of fire, veterano none, full HP at each checkpoint on both.
3. **Bombs lethal on veterano?** Recommended: no for M01 (scripted historical impacts; a lethal bomb would be a scripted,
   unavoidable death).
4. **Change level mid-mission?** Recommended: chosen at new mission; after 3 deaths at the same checkpoint the death screen
   offers "continuar em nível mais baixo" (restores the checkpoint with the lower level; never raises mid-mission).
5. **Default for new players.** Recommended: soldado.
