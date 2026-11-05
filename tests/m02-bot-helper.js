// Ajudante dos testes M02 que jogam com ENTRADAS SIMULADAS (sem atalhos de bancada nem saltos de cena).
// O «jogador» só usa o que um jogador usa: forward/side/lookX/lookY/fire/reload/interact/crouch/grenade em `sim.tick()`.
// Lê o estado da simulação (posições, linha de visão, rota do navegador) como um jogador lê o ecrã. Não é playtest.
import { eyePosition } from '../src/world/spatial.js';

export const DT = 0.1;

export function normalizeAngle(a) {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class PlayerBot {
  constructor(sim, { dt = DT } = {}) {
    this.sim = sim;
    this.dt = dt;
    this.events = [];
    this.corners = null;
    this.goalKey = null;
    this.stuckTicks = 0;
    this.lastPos = null;
  }

  /** Um tick com os controlos dados; guarda os eventos emitidos. */
  tick(controls = {}) {
    this.sim.tick(this.dt, controls);
    const out = this.sim.drainEvents();
    for (const ev of out) this.events.push(ev);
    return out;
  }

  /** Corre ticks sem entradas até `cond()` ou ao limite (s de simulação). */
  idleUntil(cond, maxSec) {
    const n = Math.ceil(maxSec / this.dt);
    for (let i = 0; i < n; i++) {
      if (cond()) return true;
      this.tick({});
    }
    return cond();
  }

  /** Controlos para andar até ao objetivo pela rota do navegador (como a de qualquer ator). */
  walkControls(goal, { sprint = false } = {}) {
    const p = this.sim.player;
    const key = `${goal.x.toFixed(1)},${goal.z.toFixed(1)},${this.sim.activeCellId},${this.sim.world.revision}`;
    if (!this.corners || this.goalKey !== key) {
      const route = this.sim.navigator.route({ x: p.x, y: p.y, z: p.z, radius: p.radius }, { x: goal.x, z: goal.z });
      this.corners = route && route.length ? route.map(([x, z]) => ({ x, z })) : [{ x: goal.x, z: goal.z }];
      this.goalKey = key;
    }
    while (this.corners.length > 1 && Math.hypot(this.corners[0].x - p.x, this.corners[0].z - p.z) <= 0.6) this.corners.shift();
    const next = this.corners[0];
    const want = Math.atan2(next.z - p.z, next.x - p.x);
    return { forward: 1, lookX: normalizeAngle(want - p.angle), lookY: p.pitch, sprint };
  }

  /** Anda até `tol` m do objetivo (ou ao limite de tempo). Reposiciona a rota se ficar preso. */
  walkTo(goal, { tol = 1.0, maxSec = 120, sprint = false, interactDoors = true, until = null } = {}) {
    const n = Math.ceil(maxSec / this.dt);
    for (let i = 0; i < n; i++) {
      const p = this.sim.player;
      if (until && until()) return true;
      if (Math.hypot(goal.x - p.x, goal.z - p.z) <= tol) return true;
      const c = this.walkControls(goal, { sprint });
      if (interactDoors && this.sim.currentDoorPrompt()?.state === 'closed') c.interact = true;
      this.tick(c);
      const moved = this.lastPos ? Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z) : 1;
      this.lastPos = { x: p.x, z: p.z };
      this.stuckTicks = moved < 0.02 ? this.stuckTicks + 1 : 0;
      if (this.stuckTicks > 20) {
        this.corners = null; // replaneia
        this.stuckTicks = 0;
      }
    }
    return Math.hypot(goal.x - this.sim.player.x, goal.z - this.sim.player.z) <= tol;
  }

  /** Hostil combatente mais próximo com linha de visão e dentro do alcance. */
  nearestVisibleHostile(maxRange = 70) {
    const { sim } = this;
    let best = null;
    for (const e of sim.enemies) {
      if (!e.alive || e.nonCombatant) continue;
      const d = Math.hypot(e.x - sim.player.x, e.z - sim.player.z);
      if (d > maxRange) continue;
      if (!sim.world.lineOfSight(sim.player, e, { includeFoliage: true })) continue;
      if (!best || d < best.d) best = { e, d };
    }
    return best?.e ?? null;
  }

  /** Controlos para mirar ao peito do alvo (a mira exata é a da bancada) e disparar quando a arma está pronta. */
  aimAndFire(target) {
    const { sim } = this;
    const p = sim.player;
    const eye = eyePosition(p);
    const tx = target.x;
    const tz = target.z;
    const ty = target.y + (target.crouched ? 0.95 : 1.2);
    const want = Math.atan2(tz - eye.z, tx - eye.x);
    const horiz = Math.hypot(tx - eye.x, tz - eye.z);
    const wantPitch = Math.atan2(ty - eye.y, horiz);
    return {
      lookX: normalizeAngle(want - p.angle),
      lookY: p.pitch - wantPitch,
      fire: sim.weapon.state === 'READY' && sim.weapon.mag > 0,
      reload: sim.weapon.mag === 0 && sim.weapon.state === 'READY',
    };
  }
}
