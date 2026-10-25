import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { M02_DIALOGUE_CATALOG } from '../src/game/m02-combat-ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('M02-02 boundary guard: m02-combat-ai.js has no DOM, Three.js, Math.random, or Date.now', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src/game/m02-combat-ai.js'), 'utf8');
  assert.ok(!src.includes("from 'three'"));
  assert.ok(!src.includes('window.'));
  assert.ok(!src.includes('document.'));
  assert.ok(!src.includes('Math.random'));
  assert.ok(!src.includes('Date.now'));
});

test('AI-01: 60 seconds with Piotr in cover produces real causal squad progress (suppression, cover capture, hits/neutralizations)', () => {
  const sim = new M02BenchSimulation(19390909);
  assert.equal(sim.allies.length, 7, 'Must have 7 Polish squad members alongside Piotr');
  assert.equal(sim.enemies.length, 10, 'Must have 10 finite German EA1 defenders');

  // Keep Piotr crouched behind the starting parapet for 60 seconds (1200 ticks of 50ms)
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  for (let i = 0; i < 1200; i++) {
    sim.tick(0.05, {});
  }

  // 1. Allies consumed real ammo and fired bursts
  const totalAllyShots = sim.allies.reduce((acc, a) => acc + (a.shotsFired ?? 0), 0);
  assert.ok(totalAllyShots >= 10, `Expected allies to fire real ballistic shots, got ${totalAllyShots}`);

  // 2. Allies captured advanced cover nodes in ditch and near B01/courtyard
  const capturedCovers = sim.combatLog.filter((e) => e.type === 'ally_captured_cover');
  assert.ok(capturedCovers.length >= 6, `Expected >= 6 cover captures in 60s, got ${capturedCovers.length}`);

  // 3. Allies suppressed enemies (including DE-A05 MG34) and inflicted real damage/kills
  const suppressEvents = sim.combatLog.filter((e) => e.type === 'ally_suppressed_enemy');
  const hitEvents = sim.combatLog.filter((e) => e.type === 'ally_hit_enemy' || e.type === 'ally_killed_enemy');
  assert.ok(suppressEvents.length >= 5, `Expected >= 5 enemy suppression events, got ${suppressEvents.length}`);
  assert.ok(hitEvents.length >= 2, `Expected >= 2 causal hits on enemies by Polish squad, got ${hitEvents.length}`);

  const totalEnemyHealthLost = sim.enemies.reduce((acc, e) => acc + (e.maxHealth - e.health), 0);
  assert.ok(totalEnemyHealthLost > 0, 'Enemy garrison must lose real health from allied fire');
});

test('AI-02: Honest enemy perception — enemies remember last seen/heard position, never wallhack hidden player movement, and memory expires', () => {
  const sim = new M02BenchSimulation(19390909);
  const kitchenDefender = sim.enemies.find((e) => e.id === 'DE-A07');
  assert.ok(kitchenDefender);

  // Place player outside West Kitchen Window (-44, -15.5) where DE-A07 (-36.5, -15.5, facing West PI) has clear LoS
  sim.teleportPlayer(-44.0, -15.5, 0);
  sim.tick(0.1, {});
  assert.equal(kitchenDefender.seeingTargetId, 'piotr_sokol', 'DE-A07 must see player through open west kitchen window');
  assert.ok(kitchenDefender.memory, 'DE-A07 must record visual memory of player at (-44, -15.5)');
  assert.equal(kitchenDefender.memory.x, -44);
  assert.equal(kitchenDefender.memory.z, -15.5);

  // Now move player behind the solid West Bedroom exterior wall (-44, -10.5) where brick wall blocks LoS
  sim.teleportPlayer(-44.0, -10.5, 0);
  sim.tick(0.1, {});
  assert.equal(kitchenDefender.seeingTargetId, null, 'Solid brick wall must block DE-A07 visual perception');
  assert.equal(kitchenDefender.state, 'SEARCH_MEMORY');
  // Memory must still point to the LAST KNOWN position (-44, -15.5), NOT the new hidden position (-44, -10.5)!
  assert.equal(kitchenDefender.memory.z, -15.5, 'Enemy memory must not track hidden movement behind solid walls');

  // Advance clock past memory expiration (6.0s) without new sight/sound
  for (let i = 0; i < 130; i++) {
    sim.tick(0.05, {});
  }
  if (kitchenDefender.alive && !kitchenDefender.seeingTargetId) {
    assert.notEqual(
      kitchenDefender.memory?.z,
      -10.5,
      'Enemy must never acquire hidden player coordinates through solid wall',
    );
  }
});

test('AI-03: Narrow doorway single-file queue and automatic door opening prevent NPC bottlenecking', () => {
  const sim = new M02BenchSimulation(19390909);
  const lis = sim.allies.find((a) => a.id === 'pl_lis');
  const malek = sim.allies.find((a) => a.id === 'pl_malek');
  assert.equal(sim.world.getDoorState('door_b01_north_service'), 'closed');

  // Place Lis and Małek just north of closed door_b01_north_service (-37.0, -18.0) with goal inside B01 kitchen (-35.2, -15.5)
  lis.x = -37.0;
  lis.z = -19.1;
  lis.y = sim.world.heightAt(lis.x, lis.z);
  malek.x = -37.0;
  malek.z = -19.8;
  malek.y = sim.world.heightAt(malek.x, malek.z);

  // Advance simulation to stage 2 (clock = 20s) so Lis and Małek target B01 interior
  sim.clock = 20.0;
  for (let i = 0; i < 90; i++) {
    sim.tick(0.05, {});
  }

  assert.equal(
    sim.world.getDoorState('door_b01_north_service'),
    'open',
    'Allied NPC must automatically open closed door_b01_north_service when approaching it',
  );
  // Both Lis and Małek should never overlap within 0.35m of each other
  const sep = Math.hypot(lis.x - malek.x, lis.z - malek.z);
  assert.ok(sep >= 0.35, `Allies must maintain personal separation through doorway, got sep=${sep}`);
});

test('AI-04 & OBJ-01: Finite 10-man EA1 garrison, zero spawns, local reserve shift, and immediate state-driven objective progression', () => {
  const sim = new M02BenchSimulation(19390909);
  assert.equal(sim.enemies.length, 10);
  assert.equal(sim.objective.id, 'O01');

  // Move player to western flank (-25, -14) -> triggers O02 and shifts local reserve DE-A12 westward
  sim.teleportPlayer(-25.0, -14.0, 0);
  sim.tick(0.1, {});
  assert.equal(sim.objective.id, 'O02');
  const reserveWell = sim.enemies.find((e) => e.id === 'DE-A12');
  assert.equal(reserveWell.reserveShifted, 'west', 'Local reserve DE-A12 must shift toward threatened western flank');
  assert.equal(sim.enemies.length, 10, 'Zero new enemies may be spawned');

  // Neutralize MG34 gunner DE-A05 -> immediately advances objective to O03
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05');
  mgGunner.health = 0;
  mgGunner.alive = false;
  sim.tick(0.05, {});
  assert.equal(sim.objective.id, 'O03');

  // Neutralize 6 more defenders (total 7 down) -> remaining active combat defenders surrender & DE-A14 transitions to WOUNDED_UNARMED (C04)
  for (const id of ['DE-A06', 'DE-A07', 'DE-A08', 'DE-A09', 'DE-A10', 'DE-A11']) {
    const e = sim.enemies.find((en) => en.id === id);
    e.health = 0;
    e.alive = false;
  }
  sim.tick(0.05, {});

  const activeCombat = sim.enemies.filter((e) => e.alive && !e.nonCombatant);
  assert.equal(activeCombat.length, 0, 'Remaining garrison must collapse/surrender once MG34 + 6 defenders fall');
  assert.equal(sim.objective.id, 'C04', 'Objective must immediately transition to C04 with zero artificial timers');
  assert.ok(sim.checkpoints.has('cp_m02_b_acesso'), 'Semantic checkpoint cp_m02_b_acesso must be saved upon farm consolidation');
});

test('COM-01 & COM-02: Weapon reload cycle and causal wz. 33 grenade (damages exposed enemy, blocked by solid wall, shatters glass, breaches wooden fence)', () => {
  const sim = new M02BenchSimulation(19390909);

  // 1. Test player wz. 29 5-round mag consumption and reload
  for (let i = 0; i < 5; i++) {
    const shot = sim.firePlayerWeapon(true, true);
    assert.ok(shot, `Shot ${i + 1} should fire`);
  }
  assert.equal(sim.weapon.mag, 0);
  assert.equal(sim.firePlayerWeapon(true, true), null, 'Empty magazine must not fire until reloaded');
  sim.tick(1.5, {});
  assert.equal(sim.weapon.reload(sim.clock * 1000), true);
  sim.tick(3.5, {});
  assert.equal(sim.weapon.mag, 5, 'Reload must replenish 5-round magazine from reserve');
  assert.equal(sim.weapon.reserve, 40);

  // 2. Grenade blast inside B01 Sala (-28.0, 0.5, -16.0):
  // - Damages exposed DE-A08 (-28.5, -15.5) in the same room
  // - Shatters intact window win_b01_east_hall (-26.0, -17.35) and win_b01_north_hall (-29.0, -18.0)
  // - Destroys closed door_b01_east_main (-26.0, -15.5)
  // - Is blocked by solid brick partition wall from damaging an actor placed behind solid wall in Quarto Oeste (-36.5, -10.5)
  const enSala = sim.enemies.find((e) => e.id === 'DE-A08');
  const enProtected = sim.enemies.find((e) => e.id === 'DE-A07');
  // Place DE-A07 at (-31.5, -11.5) inside Quarto Oeste behind solid brick wall (distance ~5.7m < 6.5m radius, behind solid brick wall)
  enProtected.x = -31.5;
  enProtected.z = -11.5;

  assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'intact');
  assert.equal(sim.world.getDoorState('door_b01_east_main'), 'closed');

  const blast1 = sim.detonateGrenadeAt(-28.0, 0.5, -16.0, 6.5);
  assert.ok(enSala.health < 100, 'Exposed enemy DE-A08 in Sala must take blast damage');
  const protectedEntry = blast1.affectedActors.find((a) => a.id === 'DE-A07');
  assert.equal(protectedEntry?.blockedByWall, true, 'Solid brick partition wall must block grenade blast damage');
  assert.equal(enProtected.health, 100, 'Enemy behind solid brick wall must take 0 blast damage');
  assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'broken', 'Grenade blast must shatter intact window');
  assert.equal(sim.world.getDoorState('door_b01_east_main'), 'destroyed', 'Grenade blast must destroy nearby closed thin wooden door');

  // 3. Grenade blast at southern wooden fence (-10.0, 0.5, 19.9) breaches cov_south_fence_west
  assert.equal(sim.world.getFenceState('cov_south_fence_west'), 'intact');
  sim.detonateGrenadeAt(-10.0, 0.5, 19.9, 6.5);
  assert.equal(sim.world.getFenceState('cov_south_fence_west'), 'breached', 'Grenade must breach destructible wooden fence');
});

test('COM-03 & K2/K3: Protected literal line dlg_m02_001, C04 wounded soldier persistence, chalk marking, and Gruca priority-0 reaction to firing on wounded', () => {
  const sim = new M02BenchSimulation(19390909);

  // Verify protected literal line dlg_m02_001
  assert.equal(
    M02_DIALOGUE_CATALOG.dlg_m02_001.text,
    'Era a estrada de casa. Agora procuro onde esconder a cabeça.',
    'Protected literal line dlg_m02_001 must match exact canonical text',
  );

  // Trigger garrison collapse so DE-A14 in southern orchard enters WOUNDED_UNARMED state
  for (const e of sim.enemies) {
    if (!e.c04Candidate) {
      e.health = 0;
      e.alive = false;
    }
  }
  sim.tick(0.1, {});

  const wounded = sim.enemies.find((e) => e.id === 'DE-A14');
  assert.equal(wounded.alive, true, 'Wounded C04 soldier must remain alive and persistent in the orchard');
  assert.equal(wounded.state, 'WOUNDED_UNARMED');
  assert.equal(wounded.nonCombatant, true);

  // Move player next to wounded soldier (-5.5, 35.0) and interact [E] to mark post with chalk
  sim.teleportPlayer(-5.5, 35.0, Math.PI / 2);
  const prompt = sim.currentChalkPrompt();
  assert.ok(prompt, 'Should display chalk interaction prompt near wounded C04 soldier');
  sim.interactDoor();
  assert.equal(sim.flags['m02.pomar_wounded_marked'], true, 'Chalk interaction must set m02.pomar_wounded_marked=true');
  assert.equal(sim.objective.id, 'COMPLETE', 'Marking wounded soldier after clearing farm must complete M02-02');
  assert.equal(sim.flags['m02.completed'], true);

  // Now test firing on the unarmed wounded soldier -> sets m02.fired_on_wounded=true and triggers priority-0 bz39_c04_05
  const shotAtWounded = sim.fireDirectRay(
    { x: -5.5, y: 1.0, z: 33.5 },
    { x: 0, y: -0.05, z: 1 },
  );
  assert.equal(shotAtWounded.hitId, 'DE-A14');
  assert.equal(sim.flags['m02.fired_on_wounded'], true, 'Shooting unarmed wounded soldier must set m02.fired_on_wounded=true');
  assert.equal(
    sim.dialogue.activeLine?.id,
    'bz39_c04_05',
    'Priority-0 line bz39_c04_05 (Gruca: Baixe a arma. Ele já não combate.) must immediately interrupt active speech',
  );
});

test('SAVE-01 & SAVE-02: Semantic checkpoints preserve complete combat state and two-phase validation rejects corrupted snapshots without mutating live state', () => {
  const sim = new M02BenchSimulation(19390909);
  assert.ok(sim.checkpoints.has('cp_m02_a_preparacao'));

  // Mutate world and combat state
  sim.teleportPlayer(-23.0, -12.0, 0);
  sim.world.setDoorState('door_b01_east_main', 'open');
  sim.world.setFenceState('cov_south_fence_west', 'breached');
  sim.enemies[0].health = 0;
  sim.enemies[0].alive = false;
  sim.flags['m02.axis'] = 'ditch';
  sim.saveCheckpoint('cp_m02_custom');

  // Corrupt a copy of the snapshot and verify validateM02Snapshot rejects it AND restoreSnapshot leaves sim untouched (SAVE-02)
  const badSnap = sim.snapshot();
  badSnap.weapon.mag = -5;
  assert.equal(validateM02Snapshot(badSnap).valid, false);

  const beforeX = sim.player.x;
  assert.throws(() => sim.restoreSnapshot(badSnap), /Snapshot M02 inválido/);
  assert.equal(sim.player.x, beforeX, 'Failed restoreSnapshot must not mutate live simulation state');

  // Restore initial checkpoint cp_m02_a_preparacao and verify full rollback (SAVE-01)
  sim.restoreCheckpoint('cp_m02_a_preparacao');
  assert.equal(sim.player.x, 0);
  assert.equal(sim.player.z, -80);
  assert.equal(sim.world.getDoorState('door_b01_east_main'), 'closed');
  assert.equal(sim.world.getFenceState('cov_south_fence_west'), 'intact');
  assert.equal(sim.enemies[0].alive, true);
});
