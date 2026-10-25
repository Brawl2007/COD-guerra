import { Random } from '../core/random.js';
import { EYE_HEIGHT } from '../config.js';
import {
  eyePosition,
  aimDirection,
  muzzlePosition,
  traceShot,
  traceObstruction,
} from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import { M02QuintaWorld, BALLISTIC_MATERIAL_POLICY } from '../world/m02-quinta-world.js';
import { Wz29 } from './wz29.js';

const WALK_SPEED = 4.2;
const SPRINT_SPEED = 6.1;
const CROUCH_SPEED = 2.55;
const DOOR_INTERACT_RANGE = 2.2;

export class M02BenchSimulation {
  constructor(seed = 19390909) {
    this.seed = seed;
    this.rng = new Random(seed);
    this.world = new M02QuintaWorld();
    this.weapon = new Wz29();
    this.events = [];
    this.shotLog = [];
    this.reset();
  }

  reset() {
    this.rng = new Random(this.seed);
    this.clock = 0;
    this.events = [];
    this.shotLog = [];

    for (const b of this.world.layout.buildings) {
      for (const d of b.doors ?? []) this.world.doorStates.set(d.id, d.initialState ?? 'closed');
      for (const w of b.windows ?? []) this.world.windowStates.set(w.id, w.glassState ?? 'open');
    }
    this.world.refresh();

    const start = this.world.layout.start;
    const startY = this.world.heightAt(start.x, start.z);
    this.player = {
      id: 'piotr_sokol',
      name: 'strz. Piotr Sokół',
      space: 'metres',
      x: start.x,
      y: startY,
      z: start.z,
      angle: start.angle ?? Math.PI / 2,
      pitch: start.pitch ?? 0,
      radius: PLAYER_PHYSICS.radius,
      crouched: false,
      aiming: false,
      sprinting: false,
      moving: false,
      alive: true,
      health: 100,
      maxHealth: 100,
      eyeHeight: EYE_HEIGHT,
      suppressed: 0,
    };

    this.weapon = new Wz29();
    this.weapon.mag = 5;
    this.weapon.reserve = 45;

    this.targets = (this.world.layout.testTargets ?? []).map((t) => ({
      ...t,
      space: 'metres',
      y: this.world.heightAt(t.x, t.z),
      alive: true,
      active: true,
      health: 100,
      maxHealth: 100,
      crouched: false,
      hitsReceived: 0,
      lastHitPart: null,
    }));

    const mg = this.world.layout.mgEmplacement;
    this.mgState = {
      ...mg,
      space: 'metres',
      y: this.world.heightAt(mg.x, mg.z),
      active: true,
      alive: true,
      seeingPlayer: false,
      canHitPlayer: false,
      blockedById: null,
      blockedByMaterial: null,
      burstsFired: 0,
      nextBurstAt: 1.0,
    };

    this.routeProgress = {
      ditchWaypointsVisited: [true, false, false, false, false, false],
      orchardWaypointsVisited: [true, false, false, false, false, false],
      visitedBuildings: { B01: false, B02: false, B03: false, B04: false },
      visitedB01Rooms: {
        cozinha: false,
        despensa: false,
        sala: false,
        quarto_oeste: false,
        quarto_este: false,
      },
      activeRoute: 'none',
    };

    this.objective = {
      id: 'obj_m02_01_bench',
      title: 'Ensaiar rotas (Vala ou Pomar), interiores B01/B02 e linhas de tiro',
      status: 'active',
    };

    this.updateTacticalContext();
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  teleportPlayer(x, z, angle = this.player.angle, pitch = 0) {
    this.player.x = x;
    this.player.z = z;
    this.player.y = this.world.heightAt(x, z);
    this.player.angle = angle;
    this.player.pitch = pitch;
    this.player.fall = null;
    this.updateTacticalContext();
    return { x: this.player.x, y: this.player.y, z: this.player.z, angle: this.player.angle };
  }

  currentDoorPrompt() {
    const dir = aimDirection(this.player.angle, 0);
    const door = this.world.nearestInteractableDoor(this.player, DOOR_INTERACT_RANGE, dir);
    if (!door) return null;
    const actionLabel = door.state === 'open' ? 'Fechar' : 'Abrir';
    return {
      doorId: door.id,
      state: door.state,
      distance: Number(door.distance.toFixed(2)),
      prompt: `[E] ${actionLabel} ${door.label}`,
    };
  }

  interactDoor(explicitDoorId = null) {
    let targetDoorId = explicitDoorId;
    if (!targetDoorId) {
      const prompt = this.currentDoorPrompt();
      if (!prompt) return null;
      targetDoorId = prompt.doorId;
    }
    const nextState = this.world.toggleDoor(targetDoorId);
    const evt = {
      type: 'door-toggled',
      doorId: targetDoorId,
      state: nextState,
      clock: this.clock,
    };
    this.events.push(evt);
    this.updateTacticalContext();
    return evt;
  }

  evaluateMgLineOfFire(targetActor = this.player) {
    const mg = this.mgState;
    const mgTarget = this.targets.find((t) => t.id === 'tgt_b02_mg_gunner');
    if (mgTarget && !mgTarget.alive) {
      return {
        mgActive: false,
        inArc: false,
        hasVisualLoS: false,
        canHitTarget: false,
        blockedById: 'mg_neutralized',
        blockedByMaterial: null,
        distance: 0,
      };
    }

    // Muzzle positioned at the western MG aperture of Barn B02 (x=11.82, y=1.42, z=-30.0)
    const muzzle = { x: 11.82, y: 1.42, z: -30.0 };
    const targetEye = eyePosition(targetActor);
    const dx = targetEye.x - muzzle.x;
    const dy = targetEye.y - muzzle.y;
    const dz = targetEye.z - muzzle.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-6 || dist > mg.range) {
      return {
        mgActive: true,
        inArc: false,
        hasVisualLoS: false,
        canHitTarget: false,
        blockedById: 'out_of_range',
        blockedByMaterial: null,
        distance: dist,
      };
    }

    // Check horizontal firing arc (westward through win_b02_west_mg, facing PI)
    const horizAngle = Math.atan2(dz, dx);
    let angleDiff = Math.abs(horizAngle - mg.facing);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
    const inArc = angleDiff <= mg.arcHalfAngle;

    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const obstruction = traceObstruction(this.world, muzzle, dir, Math.max(0, dist - 0.15));
    const hasVisualLoS = inArc && !obstruction && this.world.lineOfSight(
      { x: muzzle.x, y: 0, z: muzzle.z, eyeHeight: muzzle.y, space: 'metres' },
      targetActor,
      { includeFoliage: true },
    );
    const canHitTarget = inArc && !obstruction;

    return {
      mgActive: true,
      inArc,
      hasVisualLoS,
      canHitTarget,
      blockedById: obstruction?.id ?? (inArc ? null : 'outside_mg_arc'),
      blockedByRole: obstruction?.role ?? null,
      blockedByMaterial: obstruction?.material ?? null,
      distance: Number(dist.toFixed(2)),
    };
  }

  fireDirectRay(origin, direction, range = 220, muzzle = null) {
    const normLen = Math.hypot(direction.x, direction.y, direction.z) || 1;
    const dir = {
      x: direction.x / normLen,
      y: direction.y / normLen,
      z: direction.z / normLen,
    };

    const hit = traceShot(this.world, origin, dir, this.targets, range, muzzle);
    let glassBrokenId = null;

    if (hit && hit.kind === 'world' && hit.material === 'glass' && hit.windowId) {
      this.world.setWindowState(hit.windowId, 'broken');
      glassBrokenId = hit.windowId;
    }

    if (hit && hit.kind === 'actor' && hit.actor) {
      const dmg = Math.round(this.weapon.profile.damage * (hit.multiplier ?? 1));
      hit.actor.health = Math.max(0, hit.actor.health - dmg);
      hit.actor.hitsReceived = (hit.actor.hitsReceived ?? 0) + 1;
      hit.actor.lastHitPart = hit.part;
      if (hit.actor.health <= 0) hit.actor.alive = false;
    }

    const material = hit?.material ?? 'air';
    const policy = BALLISTIC_MATERIAL_POLICY[material] ?? null;

    const record = {
      id: `shot_${this.shotLog.length + 1}`,
      clock: Number(this.clock.toFixed(3)),
      origin: { x: Number(origin.x.toFixed(3)), y: Number(origin.y.toFixed(3)), z: Number(origin.z.toFixed(3)) },
      direction: { x: Number(dir.x.toFixed(4)), y: Number(dir.y.toFixed(4)), z: Number(dir.z.toFixed(4)) },
      hitKind: hit?.kind ?? 'none',
      hitId: hit?.kind === 'actor' ? hit.actor.id : (hit?.id ?? null),
      role: hit?.role ?? (hit?.kind === 'actor' ? 'target_actor' : null),
      part: hit?.part ?? null,
      material,
      materialLabel: policy?.label ?? material,
      blockedBySolid: hit?.kind === 'world',
      hitTarget: hit?.kind === 'actor',
      glassBrokenId,
      distance: hit ? Number(hit.distance.toFixed(3)) : range,
      point: hit?.point
        ? {
            x: Number(hit.point.x.toFixed(3)),
            y: Number(hit.point.y.toFixed(3)),
            z: Number(hit.point.z.toFixed(3)),
          }
        : {
            x: Number((origin.x + dir.x * range).toFixed(3)),
            y: Number((origin.y + dir.y * range).toFixed(3)),
            z: Number((origin.z + dir.z * range).toFixed(3)),
          },
    };

    this.shotLog.push(record);
    this.events.push({ type: 'shot-fired', shot: record });
    this.updateTacticalContext();
    return record;
  }

  firePlayerWeapon(exactAim = true, bypassCooldown = false) {
    const nowMs = this.clock * 1000;
    if (!bypassCooldown && !this.weapon.shoot(nowMs)) return null;

    const eye = eyePosition(this.player);
    const muzzle = muzzlePosition(this.player, this.clock);
    const shotAngles = exactAim
      ? { angle: this.player.angle, pitch: this.player.pitch }
      : this.weapon.shotDirection(
          this.player.angle,
          this.player.pitch,
          this.player.aiming,
          this.player.moving,
          () => this.rng.next(),
        );
    const dir = aimDirection(shotAngles.angle, shotAngles.pitch);
    const rec = this.fireDirectRay(eye, dir, this.weapon.profile.range, muzzle);
    this.rendererHintLastShot = rec;
    return rec;
  }

  updateTacticalContext() {
    const px = this.player.x;
    const pz = this.player.z;

    const ditchRoute = this.world.layout.routes.ditch;
    ditchRoute.forEach(([wx, wz], idx) => {
      if (Math.hypot(px - wx, pz - wz) <= 4.2) {
        this.routeProgress.ditchWaypointsVisited[idx] = true;
        if (idx >= 1 && idx <= 3) this.routeProgress.activeRoute = 'ditch';
      }
    });

    const orchardRoute = this.world.layout.routes.orchard;
    orchardRoute.forEach(([wx, wz], idx) => {
      if (Math.hypot(px - wx, pz - wz) <= 4.5) {
        this.routeProgress.orchardWaypointsVisited[idx] = true;
        if (idx >= 1 && idx <= 4) this.routeProgress.activeRoute = 'orchard';
      }
    });

    for (const b of this.world.layout.buildings) {
      const [minX, maxX, minZ, maxZ] = b.bounds;
      if (px > minX + 0.3 && px < maxX - 0.3 && pz > minZ + 0.3 && pz < maxZ - 0.3) {
        this.routeProgress.visitedBuildings[b.id] = true;
        if (b.id === 'B01') {
          const u = px - minX;
          const v = pz - minZ;
          for (const room of b.rooms ?? []) {
            if (u >= room.u0 && u <= room.u0 + room.w && v >= room.v0 && v <= room.v0 + room.d) {
              this.routeProgress.visitedB01Rooms[room.id] = true;
            }
          }
        }
      }
    }

    const mgStatus = this.evaluateMgLineOfFire(this.player);
    this.mgState.seeingPlayer = mgStatus.hasVisualLoS;
    this.mgState.canHitPlayer = mgStatus.canHitTarget;
    this.mgState.blockedById = mgStatus.blockedById;
    this.mgState.blockedByMaterial = mgStatus.blockedByMaterial;

    const mgGunner = this.targets.find((t) => t.id === 'tgt_b02_mg_gunner');
    if (mgGunner && !mgGunner.alive) {
      this.objective.title = 'Posição MG34 em B02 neutralizada — Consolidar pátio e inspecionar rotas';
      this.objective.status = 'completed';
    } else if (this.routeProgress.visitedBuildings.B01 || this.routeProgress.visitedBuildings.B02) {
      this.objective.title = 'Neutralizar a posição MG34 na abertura oeste do Celeiro B02';
    } else if (this.routeProgress.activeRoute === 'ditch') {
      this.objective.title = 'Rota A (Vala): Avançar abrigado até ao flanco oeste da Casa B01';
    } else if (this.routeProgress.activeRoute === 'orchard') {
      this.objective.title = 'Rota B (Pomar): Flanquear pelo leste/sul rumo ao Estábulo B03 e Celeiro B02';
    }
  }

  tick(dt, controls = {}) {
    if (dt <= 0) return;
    this.clock += dt;
    const nowMs = this.clock * 1000;

    if (controls.lookX) this.player.angle += controls.lookX;
    if (controls.lookY) {
      this.player.pitch = Math.max(-1.35, Math.min(1.35, this.player.pitch - controls.lookY));
    }

    if (controls.crouch) {
      this.player.crouched = !this.player.crouched;
      this.player.eyeHeight = this.player.crouched ? 1.08 : EYE_HEIGHT;
    }

    this.player.aiming = Boolean(controls.aim);
    const forward = controls.forward ?? 0;
    const side = controls.side ?? 0;
    const inputLen = Math.hypot(forward, side);
    this.player.moving = inputLen > 1e-3;
    this.player.sprinting = Boolean(controls.sprint) && !this.player.crouched && !this.player.aiming && forward > 0.1;

    if (this.player.moving) {
      const nf = forward / Math.max(1, inputLen);
      const ns = side / Math.max(1, inputLen);
      const speed = this.player.crouched
        ? CROUCH_SPEED
        : this.player.sprinting
          ? SPRINT_SPEED
          : WALK_SPEED;
      const cos = Math.cos(this.player.angle);
      const sin = Math.sin(this.player.angle);
      const dx = (cos * nf - sin * ns) * speed * dt;
      const dz = (sin * nf + cos * ns) * speed * dt;
      const landing = movePlayer(this.world, this.player, dx, dz, dt);
      if (landing && landing.damage > 0) {
        this.player.health = Math.max(0, this.player.health - landing.damage);
        this.events.push({ type: 'player-landing', ...landing, clock: this.clock });
      }
    } else if (this.player.fall) {
      movePlayer(this.world, this.player, 0, 0, dt);
    }

    this.weapon.update(nowMs);
    if (controls.reload) this.weapon.reload(nowMs);
    if (controls.sight) this.weapon.adjustSight();
    if (controls.interact) this.interactDoor();
    if (controls.fire) this.firePlayerWeapon(true);

    this.updateTacticalContext();

    if (this.mgState.seeingPlayer && this.clock >= this.mgState.nextBurstAt) {
      this.mgState.burstsFired++;
      this.mgState.nextBurstAt = this.clock + this.mgState.cooldown;
      this.player.suppressed = Math.min(1, this.player.suppressed + 0.35);
      this.events.push({
        type: 'mg-burst',
        sourceId: this.mgState.id,
        origin: { x: 12.15, y: 1.42, z: -30.0 },
        target: { x: this.player.x, y: this.player.y + 1.2, z: this.player.z },
        rounds: this.mgState.burstRounds,
        clock: this.clock,
      });
    } else {
      this.player.suppressed = Math.max(0, this.player.suppressed - dt * 0.25);
    }
  }

  snapshot() {
    return {
      schema: 'm02-01-bench-snapshot-v1',
      clock: this.clock,
      player: structuredClone(this.player),
      weapon: this.weapon.snapshot(),
      doors: Object.fromEntries(this.world.doorStates.entries()),
      windows: Object.fromEntries(this.world.windowStates.entries()),
      targets: structuredClone(this.targets),
      mgState: structuredClone(this.mgState),
      routeProgress: structuredClone(this.routeProgress),
      objective: structuredClone(this.objective),
    };
  }

  restoreSnapshot(snap) {
    if (!snap || snap.schema !== 'm02-01-bench-snapshot-v1') {
      throw new Error('Snapshot M02-01 inválido.');
    }
    this.clock = snap.clock;
    this.player = structuredClone(snap.player);
    this.weapon.restore(structuredClone(snap.weapon));
    for (const [k, v] of Object.entries(snap.doors ?? {})) this.world.doorStates.set(k, v);
    for (const [k, v] of Object.entries(snap.windows ?? {})) this.world.windowStates.set(k, v);
    this.world.refresh();
    this.targets = structuredClone(snap.targets);
    this.mgState = structuredClone(snap.mgState);
    this.routeProgress = structuredClone(snap.routeProgress);
    this.objective = structuredClone(snap.objective);
    this.events.push({ type: 'restored', clock: this.clock });
  }
}
