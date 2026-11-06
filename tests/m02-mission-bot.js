// «Jogador» da missão inteira para testes M02: escolhe o comportamento pela cena do roteiro (lida do estado, como a cartela e o
// objetivo no ecrã) e só age por entradas de tick(). Não chama atalhos de bancada nem funções de salto de cena. Não é playtest.
import { PlayerBot, normalizeAngle } from './m02-bot-helper.js';
import { eyePosition, muzzlePosition, traceObstruction } from '../src/world/spatial.js';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };

const EVAC_POINT = cellsBC.cells.C.evacRoute.at(-1);

function aliveHostiles(sim) {
  return sim.enemies.filter((e) => e.alive && !e.nonCombatant);
}

/** Alturas do ponto de mira por ordem de preferência: peito, cabeça, anca (menos 0,25 m se o alvo está agachado). */
const AIM_HEIGHTS = [1.2, 1.55, 0.85];

export class MissionBot extends PlayerBot {
  /**
   * Ponto de mira com linha limpa até ao alvo (peito, depois cabeça, depois anca) ou null. Um alvo «visível» pela cabeça atrás de um
   * muro baixo não se abate a apontar ao peito: antes o bot disparava sem fim contra o muro do portão (D4: com a quinta já sem cair
   * sozinha esta limitação do bot deixou de ser invisível). O vidro não conta: o primeiro tiro parte-o.
   */
  clearAimPoint(target) {
    const { sim } = this;
    // a câmara vê por cima do muro baixo mas o cano, mais baixo, não dispara através dele (traceShot confere os dois): vale o pior
    const origins = [eyePosition(sim.player), muzzlePosition(sim.player, sim.clock)];
    const free = (origin, point) => {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const dz = point.z - origin.z;
      const dist = Math.hypot(dx, dy, dz);
      const obstruction = traceObstruction(sim.world, origin, { x: dx / dist, y: dy / dist, z: dz / dist }, Math.max(0, dist - 0.4));
      return !obstruction || obstruction.material === 'glass';
    };
    for (const h of AIM_HEIGHTS) {
      const point = { x: target.x, y: target.y + (target.crouched ? h - 0.25 : h), z: target.z };
      if (origins.every((o) => free(o, point))) return point;
    }
    return null;
  }

  /** O hostil visível mais próximo a que o bot consegue acertar de onde está ({ enemy, aim }) ou null. */
  nearestHittableHostile(maxRange) {
    const { sim } = this;
    const p = sim.player;
    const candidates = sim.enemies
      .filter((e) => e.alive && !e.nonCombatant && Math.hypot(e.x - p.x, e.z - p.z) <= maxRange && sim.world.lineOfSight(p, e, { includeFoliage: true }))
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    for (const enemy of candidates) {
      const aim = this.clearAimPoint(enemy);
      if (aim) return { enemy, aim };
    }
    return null;
  }

  /** Controlos para mirar a um ponto e disparar quando a arma está pronta (a mesma geometria de PlayerBot.aimAndFire). */
  aimAtPoint(point) {
    const { sim } = this;
    const p = sim.player;
    const eye = eyePosition(p);
    const horiz = Math.hypot(point.x - eye.x, point.z - eye.z);
    return {
      lookX: normalizeAngle(Math.atan2(point.z - eye.z, point.x - eye.x) - p.angle),
      lookY: p.pitch - Math.atan2(point.y - eye.y, horiz),
      // Merge M02 único: o fogo pelos controlos tem a dispersão da M01 (Codex 702ced95); o bot aponta pela mira, como um jogador.
      aim: true,
      fire: sim.weapon.state === 'READY' && sim.weapon.mag > 0,
      reload: sim.weapon.mag === 0 && sim.weapon.state === 'READY',
    };
  }

  /**
   * Combate com prudência: atira ao hostil visível mais próximo a que consegue acertar (a arma do jogador alcança 1200 m; os hostis,
   * 180 m, com dispersão); sem alvo aproxima-se do hostil vivo mais próximo só até uma distância de segurança e espera que a
   * secção avance; a distância de segurança encurta 10 m por cada 20 s sem ver nem abater ninguém. Devolve false sem hostis.
   */
  hunt({ range = 160, standoff = 30 } = {}) {
    const { sim } = this;
    const shot = this.nearestHittableHostile(range);
    if (shot) {
      this.waitedSec = 0;
      this.tick(this.aimAtPoint(shot.aim));
      return true;
    }
    const all = aliveHostiles(sim);
    if (all.length === 0) return false;
    const p = sim.player;
    all.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const goal = all[0];
    const wanted = Math.max(0, standoff - 10 * Math.floor((this.waitedSec ?? 0) / 20));
    if (Math.hypot(goal.x - p.x, goal.z - p.z) <= wanted) {
      this.waitedSec = (this.waitedSec ?? 0) + this.dt;
      this.tick(sim.weapon.mag === 0 && sim.weapon.state === 'READY' ? { reload: true } : {});
      return true;
    }
    const c = this.walkControls({ x: goal.x, z: goal.z });
    if (sim.currentDoorPrompt()?.state === 'closed') c.interact = true;
    if (sim.weapon.mag === 0 && sim.weapon.state === 'READY') c.reload = true;
    this.tick(c);
    return true;
  }

  /**
   * A reserva alemã de C10 (EC2, 12 homens) combate a sério e a sua moral só cede às suas próprias baixas (D3), por isso o jogador do
   * teste não corre para ela em campo aberto: fica agachado atrás do parapeito do pátio (a secção toma as suas posições de C10),
   * dispara ao que vê e espera que a reserva seja vencida ou se renda. No máximo 240 s (se não ceder, volta ao comportamento normal,
   * para não pendurar o teste). Devolve true se agiu neste tick.
   */
  holdAgainstReserve() {
    const { sim } = this;
    if (!sim.areaC?.c10Started) return false;
    if (!sim.enemies.some((e) => e.encounterId === 'EC2' && e.alive && !e.nonCombatant)) return false;
    this.reserveWaitSec = (this.reserveWaitSec ?? 0) + this.dt;
    if (this.reserveWaitSec > 240) return false;
    const shot = this.nearestHittableHostile(160);
    if (shot) {
      this.tick(this.aimAtPoint(shot.aim));
      return true;
    }
    const spot = { x: -4, z: -15.2 }; // atrás do parapeito do pátio (cov_c_yard_parapet), junto de Gruca
    if (Math.hypot(spot.x - sim.player.x, spot.z - sim.player.z) > 1.2) {
      this.walkStep(spot, 1.2);
    } else {
      this.tick(sim.player.crouched ? {} : { crouch: true });
    }
    return true;
  }

  walkStep(goal, tol) {
    const { sim } = this;
    const p = sim.player;
    if (Math.hypot(goal.x - p.x, goal.z - p.z) <= tol) return this.tick({});
    const c = this.walkControls(goal, {});
    if (sim.currentDoorPrompt()?.state === 'closed') c.interact = true;
    const moved = this.lastPos ? Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z) : 1;
    this.lastPos = { x: p.x, z: p.z };
    this.stuckTicks = moved < 0.02 ? this.stuckTicks + 1 : 0;
    if (this.stuckTicks > 20) {
      this.corners = null;
      this.stuckTicks = 0;
    }
    return this.tick(c);
  }

  /** Um tick do jogador na cena atual. */
  playTick() {
    const { sim } = this;
    const p = sim.player;
    switch (sim.script.sceneId) {
      case 'C01': {
        // ouve a ordem inicial e a fala; depois avança até à cobertura intermédia
        if (sim.dialogue.activeLine || sim.dialogue.queue.length > 0) return this.tick({});
        return this.walkStep({ x: -8.5, z: -142 }, 1.2);
      }
      case 'C02': {
        if (!sim.c01Contact.opened) return this.walkStep({ x: -8.5, z: -142 }, 1.2);
        if (this.hunt()) return undefined;
        return this.walkStep({ x: 0, z: -80 }, 2.0);
      }
      case 'C03': {
        // D4: a secção não toma a quinta sozinha (trela, m02-combat-ai.js): o jogador leva-a. Vai pela vala (E3, p. 21: «rota da vala», a de
        // menor exposição, fora do arco da MG34 de B02) até junto de B01, onde a secção já está a ≤ 30 m dos seus lanços, e daí combate.
        if (!this.ditchReached) {
          const here = { x: -45, z: -48 };
          if (Math.hypot(here.x - p.x, here.z - p.z) <= 2.5) this.ditchReached = true;
          else return this.walkStep(Math.hypot(-45 - p.x, -70 - p.z) > 6 && p.z < -66 ? { x: -45, z: -70 } : here, 1.2);
        }
        if (this.hunt()) return undefined;
        return this.tick({});
      }
      case 'C06': {
        if (this.hunt()) return undefined;
        return this.tick({});
      }
      case 'C04':
        return this.walkStep({ x: -4, z: 52 }, 1.5);
      case 'C09':
      case 'C10': {
        if (this.holdAgainstReserve()) return undefined;
        if (this.hunt()) return undefined;
        return this.walkStep({ x: -6, z: -10 }, 1.5);
      }
      case 'C11': {
        if (this.holdAgainstReserve()) return undefined;
        const a = sim.areaC;
        const lis = sim.allies.find((al) => al.id === 'pl_lis');
        const shot = this.nearestHittableHostile(160);
        if (shot) return this.tick(this.aimAtPoint(shot.aim));
        // Lis caído (não vivo) com qualquer fase (`supported`, `returning`, `waiting`): não há a quem dar amparo nem a quem esperar. Antes o
        // bot rondava-o até ao tempo limite: junto dele andava para o ponto da rota que Lis nunca ocuparia, afastava-se mais de 3,5 m,
        // voltava a ele... (e, parado ao lado, nunca ia ao ponto de evacuação). Sem Lis o desfecho é `missing` (C11 p. 14).
        if (!lis || !lis.alive || a.lisPhase === 'incapacitated' || a.lisPhase === 'sheltered' || a.lisPhase === null) {
          return this.walkStep({ x: EVAC_POINT[0], z: EVAC_POINT[1] }, 3.0);
        }
        const dl = Math.hypot(lis.x - p.x, lis.z - p.z);
        if (a.lisPhase === 'supported') {
          if (dl > 3.5) return this.walkStep({ x: lis.x, z: lis.z }, 2.5);
          // ao lado de Lis: caminha para o ponto da rota que ele vai ocupar
          const route = cellsBC.cells.C.evacRoute;
          const nextPt = route.find(([x, z]) => z > lis.z + 1 && Math.hypot(x - lis.x, z - lis.z) > 3) ?? route.at(-1);
          return this.walkStep({ x: nextPt[0], z: nextPt[1] }, 0.5);
        }
        return this.walkStep({ x: lis.x, z: lis.z }, 2.0);
      }
      default: // C05, C07, C08, C12: elipses/cartelas, o jogador espera
        return this.tick({});
    }
  }

  /** Joga até C12 (ou ao limite de tempo simulado); devolve se chegou. */
  playUntilC12(maxSec) {
    const { sim } = this;
    const n = Math.ceil(maxSec / this.dt);
    for (let i = 0; i < n; i++) {
      if (sim.script.sceneId === 'C12' || sim.script.finished) return true;
      if (!(sim.player.health > 0)) return false;
      this.playTick();
    }
    return sim.script.sceneId === 'C12';
  }
}
