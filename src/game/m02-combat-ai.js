import {eyePosition,traceObstruction} from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import {M01_DIFFICULTY} from './m01-difficulty.js';
import {m02ExposedLastGroup} from './m02-evacuation-targets.js';
import {m02MachineGunCover} from './m02-machinegun-team.js';
import {m02ReactToGrenade,m02ClearIncapableGrenadeThreat} from './m02-grenade-awareness.js';

export const WEAPON_PROFILES = Object.freeze({
  wz29: Object.freeze({
    id: 'wz29',
    label: 'kb wz. 29',
    magSize: 5,
    damage: 58,
    cycleSec: 1.35,
    reloadSec: 2.6,
    range: 185,
    suppressionAdd: 0.36,
    burstCount: 1,
    burstGapSec: 0,
    spreadRad: 0.012,
  }),
  rkm_wz28: Object.freeze({
    id: 'rkm_wz28',
    label: 'rkm wz. 28',
    magSize: 20,
    damage: 34,
    cycleSec: 1.55,
    reloadSec: 3.2,
    range: 195,
    suppressionAdd: 0.65,
    burstCount: 3,
    burstGapSec: 0.1,
    spreadRad: 0.018,
  }),
  kar98k: Object.freeze({
    id: 'kar98k',
    label: 'Kar98k',
    magSize: 5,
    damage: 46,
    cycleSec: 1.55,
    reloadSec: 2.8,
    range: 180,
    suppressionAdd: 0.34,
    burstCount: 1,
    burstGapSec: 0,
    spreadRad: 0.016,
  }),
  mp38: Object.freeze({
    id: 'mp38',
    label: 'MP 38',
    magSize: 32,
    damage: 22,
    cycleSec: 1.45,
    reloadSec: 2.7,
    range: 95,
    suppressionAdd: 0.42,
    burstCount: 3,
    burstGapSec: 0.11,
    spreadRad: 0.022,
  }),
  mg34: Object.freeze({
    id: 'mg34',
    label: 'MG34',
    magSize: 50,
    damage: 24,
    cycleSec: 2.1,
    reloadSec: 4.0,
    range: 98,
    suppressionAdd: 0.58,
    burstCount: 5,
    burstGapSec: 0.075,
    spreadRad: 0.024,
  }),
});

export const M02_DIALOGUE_CATALOG = Object.freeze({
  dlg_m02_001: Object.freeze({
    id: 'dlg_m02_001',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.5,
    protectedLiteral: true,
    text: 'Era a estrada de casa. Agora procuro onde esconder a cabeça.',
  }),
  bz39_c01_01: Object.freeze({
    id: 'bz39_c01_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 3.8,
    text: 'Ao próximo talude. Depois a quinta.',
  }),
  bz39_c02_01: Object.freeze({
    id: 'bz39_c02_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.6,
    text: 'Pela vala temos abrigo. Pelo pomar chegamos ao outro lado.',
  }),
  bz39_c02_02: Object.freeze({
    id: 'bz39_c02_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 1,
    durationSec: 3.5,
    text: 'O clarão. Junto ao talude.',
  }),
  bz39_c02_03: Object.freeze({
    id: 'bz39_c02_03',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.8,
    text: 'Cabeça baixa, Małek. Ainda não pararam.',
  }),
  bz39_c02_04: Object.freeze({
    id: 'bz39_c02_04',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.4,
    text: 'Estou a ver. Agora estou a ver.',
  }),
  bz39_c03_01: Object.freeze({
    id: 'bz39_c03_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Lis, casa. Wierzba, espera o rkm.',
    fallbackText: 'Equipa da esquerda, casa. Flanco, espera o rkm.',
  }),
  bz39_c03_02: Object.freeze({
    id: 'bz39_c03_02',
    speakerId: 'pl_aux_02',
    speakerName: 'Auxiliar rkm',
    priority: 1,
    durationSec: 3.5,
    text: 'A carregar. Cobre a abertura!',
  }),
  bz39_c03_03: Object.freeze({
    id: 'bz39_c03_03',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.6,
    text: 'A porta de trás está livre.',
  }),
  bz39_c03_04: Object.freeze({
    id: 'bz39_c03_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Não fiquem no portão. Verifiquem a saída.',
  }),
  bz39_c04_01: Object.freeze({
    id: 'bz39_c04_01',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 4.0,
    text: 'Deixa-o. Os nossos também ficaram.',
  }),
  bz39_c04_02: Object.freeze({
    id: 'bz39_c04_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.4,
    text: 'Não podemos levá-lo. Podemos dizer onde está.',
  }),
  bz39_c04_03: Object.freeze({
    id: 'bz39_c04_03',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 4.0,
    text: 'Marca aqui. Onde se veja do caminho.',
  }),
  bz39_c04_04: Object.freeze({
    id: 'bz39_c04_04',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.4,
    text: 'Ainda está a respirar.',
  }),
  bz39_c04_05: Object.freeze({
    id: 'bz39_c04_05',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.5,
    text: 'Baixe a arma. Ele já não combate.',
  }),
  bz39_c05_01: Object.freeze({
    id: 'bz39_c05_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Precisam de nós na passagem. Juntem os homens.',
  }),
  bz39_c06_01: Object.freeze({
    id: 'bz39_c06_01',
    speakerId: 'pl_messenger',
    speakerName: 'Mensageiro 56 pp',
    priority: 1,
    durationSec: 4.0,
    text: 'Os nossos estão mais adiante. Precisam desta passagem.',
  }),
  bz39_c06_02: Object.freeze({
    id: 'bz39_c06_02',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 3.8,
    text: 'Água nesta. Munição na outra.',
  }),
  bz39_c06_03: Object.freeze({
    id: 'bz39_c06_03',
    speakerId: 'pl_driver',
    speakerName: 'Condutor da Carroça',
    priority: 1,
    durationSec: 3.6,
    text: 'A roda! Assim não passa.',
  }),
  bz39_c06_04: Object.freeze({
    id: 'bz39_c06_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Levem a carga pelo abrigo. Dois de cada vez.',
  }),
  bz39_c06_05: Object.freeze({
    id: 'bz39_c06_05',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 4.0,
    text: 'Trouxe dois. Os outros ficaram com a companhia.',
  }),
  bz39_c07_01: Object.freeze({
    id: 'bz39_c07_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'A cidade ficou para trás. As ordens continuam para sul.',
  }),
  bz39_c07_02: Object.freeze({
    id: 'bz39_c07_02',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 4.2,
    text: 'Quem não consegue apoiar a perna fica com os feridos.',
  }),
  bz39_c07_03: Object.freeze({
    id: 'bz39_c07_03',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 3.8,
    text: 'Não dobres aí. Ainda precisamos desse caminho.',
  }),
  bz39_c08_01: Object.freeze({
    id: 'bz39_c08_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Abrimos o pátio. O grupo de lá atravessa depois.',
  }),
  bz39_c08_02: Object.freeze({
    id: 'bz39_c08_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 1,
    durationSec: 4.0,
    text: 'Vou com a ligação. Encontramo-nos na passagem.',
    fallbackText: 'O mensageiro vai com a ligação. Encontramo-nos na passagem.',
  }),
  bz39_c09_02: Object.freeze({
    id: 'bz39_c09_02',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.8,
    text: 'À oficina. Vi dois a mudar de janela.',
  }),
  dlg_m02_002: Object.freeze({
    id: 'dlg_m02_002',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.4,
    protectedLiteral: true,
    text: 'O grupo da direita recuou. Nossa ordem mudou.',
  }),
  bz39_c10_01: Object.freeze({
    id: 'bz39_c10_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Segurem esta passagem. Só até eles saírem.',
  }),
  bz39_c10_02: Object.freeze({
    id: 'bz39_c10_02',
    speakerId: 'pl_observer',
    speakerName: 'Observador Polaco',
    priority: 0,
    durationSec: 3.8,
    text: 'Vai cair na rua. Para dentro do muro!',
  }),
  bz39_c10_03: Object.freeze({
    id: 'bz39_c10_03',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.2,
    text: 'E a nossa posição?',
  }),
  bz39_c10_04: Object.freeze({
    id: 'bz39_c10_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 3.8,
    text: 'Continua aqui. Protege a passagem.',
  }),
  dlg_m02_003: Object.freeze({
    id: 'dlg_m02_003',
    speakerId: 'piotr_sokol',
    speakerName: 'strz. Piotr Sokół',
    priority: 0,
    durationSec: 4.2,
    protectedLiteral: true,
    text: 'Você vem conosco. A arma eu levo.',
  }),
  bz39_c11_01: Object.freeze({
    id: 'bz39_c11_01',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 0,
    durationSec: 3.8,
    text: 'Cobre a porta. Eu chego até ele.',
  }),
  bz39_c11_02: Object.freeze({
    id: 'bz39_c11_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 3.4,
    text: 'A perna não aguenta.',
  }),
  bz39_c11_03: Object.freeze({
    id: 'bz39_c11_03',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 3.6,
    text: 'Devagar. Põe o braço aqui.',
  }),
  bz39_c11_04: Object.freeze({
    id: 'bz39_c11_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Falta aquele grupo. Olhem para a saída!',
  }),
  bz39_c11_05: Object.freeze({
    id: 'bz39_c11_05',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Passaram. Recuem até à casa!',
  }),
  bz39_c12_01: Object.freeze({
    id: 'bz39_c12_01',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.2,
    text: 'Fica com a arma. Ainda preciso das duas mãos.',
  }),
  bz39_c12_02: Object.freeze({
    id: 'bz39_c12_02',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 3.2,
    text: 'Lis…',
  }),
  bz39_c12_03: Object.freeze({
    id: 'bz39_c12_03',
    speakerId: 'piotr_sokol',
    speakerName: 'strz. Piotr Sokół',
    priority: 2,
    durationSec: 3.0,
    text: 'Quem falta?',
  }),
});

export class M02DialogueDirector {
  constructor() {
    this.activeLine = null;
    this.queue = [];
    this.consumed = new Set();
    this.history = [];
  }

  reset() {
    this.activeLine = null;
    this.queue = [];
    this.consumed.clear();
    this.history = [];
  }

  hasTriggered(lineId) {
    return this.consumed.has(lineId);
  }

  resolveForCurrentState(entry,sim) {
    const def=M02_DIALOGUE_CATALOG[entry.id];
    if(!def)return entry; // Preserve dialogue records from older checkpoints.
    if(def.speakerId==='pl_lis'&&sim.flags?.['m02.lis_status']==='missing')return null;
    if(entry.id==='bz39_c12_02'&&sim.flags?.['m02.lis_status']!=='missing')return null;
    const speaker=sim.allies.find(a=>a.id===def.speakerId);
    if(speaker&&(!speaker.alive||speaker.state==='DOWN'||speaker.state==='EVACUATED'||speaker.detachedOutOfCell))return null;
    let text=entry.text;
    if(entry.id==='bz39_c03_01'){
      const available=id=>sim.allies.some(a=>a.id===id&&a.alive&&a.state!=='DOWN'&&!a.detachedOutOfCell);
      text=available('pl_lis')&&available('pl_wierzba')?def.text:def.fallbackText;
    }else if(entry.id==='bz39_c08_02'){
      const lis=sim.allies.find(a=>a.id==='pl_lis');
      text=lis&&lis.alive&&lis.state!=='DOWN'&&lis.state!=='EVACUATED'&&!lis.detachedOutOfCell?def.text:def.fallbackText;
    }
    return {...entry,text};
  }

  trigger(lineId, sim, { allowRepeat = false } = {}) {
    const def = M02_DIALOGUE_CATALOG[lineId];
    if (!def) return false;
    if (!allowRepeat && this.consumed.has(lineId)) return false;

    // NAR-02 / K5: If Lis is missing, he must never speak in C12 or M03
    if (def.speakerId === 'pl_lis' && sim.flags?.['m02.lis_status'] === 'missing') {
      return false;
    }
    if (lineId === 'bz39_c12_02' && sim.flags?.['m02.lis_status'] !== 'missing') {
      return false;
    }

    const speaker = sim.allies.find((a) => a.id === def.speakerId);
    if (speaker && (!speaker.alive || speaker.state === 'DOWN' || speaker.state === 'EVACUATED' || speaker.detachedOutOfCell)) {
      return false;
    }

    let resolvedText = def.text;
    if (lineId === 'bz39_c03_01') {
      const lisOk = sim.allies.some((a) => a.id === 'pl_lis' && a.alive && a.state !== 'DOWN');
      const wierzbaOk = sim.allies.some((a) => a.id === 'pl_wierzba' && a.alive && a.state !== 'DOWN');
      if (!lisOk || !wierzbaOk) resolvedText = def.fallbackText;
    } else if (lineId === 'bz39_c08_02') {
      const lisOk = sim.allies.some((a) => a.id === 'pl_lis' && a.alive && a.state !== 'DOWN' && a.state !== 'EVACUATED');
      if (!lisOk) resolvedText = def.fallbackText;
    }

    this.consumed.add(lineId);
    const entry = {
      id: def.id,
      speakerId: def.speakerId,
      speakerName: def.speakerName,
      priority: def.priority,
      text: resolvedText,
      durationSec: def.durationSec,
      queuedAt: Number(sim.clock.toFixed(2)),
    };

    // Priority 0 interrupts lower priority active speech immediately (K4)
    if (this.activeLine && entry.priority < this.activeLine.priority) {
      this.activeLine = {
        ...entry,
        startedAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + entry.durationSec).toFixed(2)),
      };
      this.history.push(this.activeLine);
      sim.events.push({ type: 'dialogue-line', line: this.activeLine });
      return true;
    }

    this.queue.push(entry);
    this.queue.sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);
    return true;
  }

  update(sim) {
    if (this.activeLine && sim.clock >= this.activeLine.expiresAt) {
      this.activeLine = null;
    }
    while (!this.activeLine && this.queue.length > 0) {
      const next = this.resolveForCurrentState(this.queue.shift(),sim);
      if(!next)continue;
      this.activeLine = {
        ...next,
        startedAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + next.durationSec).toFixed(2)),
      };
      this.history.push(this.activeLine);
      sim.events.push({ type: 'dialogue-line', line: this.activeLine });
    }
  }

  snapshot() {
    return {
      activeLine: this.activeLine ? structuredClone(this.activeLine) : null,
      queue: structuredClone(this.queue),
      consumed: [...this.consumed],
      history: structuredClone(this.history),
    };
  }

  restore(snap) {
    if (!snap) return;
    this.activeLine = snap.activeLine ? structuredClone(snap.activeLine) : null;
    this.queue = structuredClone(snap.queue ?? []);
    this.consumed = new Set(snap.consumed ?? []);
    this.history = structuredClone(snap.history ?? []);
  }
}

function normalizeAngleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function friendlyFireClear(shooter, targetPoint, friendlies, clearanceM = 0.82) {
  const dx = targetPoint.x - shooter.x;
  const dz = targetPoint.z - shooter.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return true;
  const ux = dx / len;
  const uz = dz / len;

  for (const f of friendlies) {
    if (!f || f.id === shooter.id || !f.alive) continue;
    const fx = f.x - shooter.x;
    const fz = f.z - shooter.z;
    const proj = fx * ux + fz * uz;
    if (proj <= 0.25 || proj >= len - 0.35) continue;
    const perp = Math.abs(fx * uz - fz * ux);
    if (perp < clearanceM) return false;
  }
  return true;
}

export function stepActorWeapon(sim, actor, dt) {
  sim.advanceActorBurst?.(actor);
  const prof = WEAPON_PROFILES[actor.weapon] ?? WEAPON_PROFILES.wz29;
  if(actor.reloadingUntil>0){
    const startedAt=actor.reloadingUntil-prof.reloadSec;
    for(const [phase,fraction] of [['seat',.45],['close',.85]]){
      const at=startedAt+prof.reloadSec*fraction;
      if(sim.clock-dt<at-1e-8&&sim.clock+1e-8>=at){
        sim.events.push({type:'actor-reload-cue',shooterId:actor.id,weapon:actor.weapon,phase,
          clock:Number(at.toFixed(3)),origin:{x:actor.x,y:actor.y??0,z:actor.z,eyeHeight:actor.eyeHeight??1.65}});
      }
    }
  }
  if (actor.reloadingUntil > sim.clock) return;
  if (actor.reloadingUntil > 0 && sim.clock >= actor.reloadingUntil) {
    const needed = prof.magSize - actor.mag;
    const load = Math.min(needed, actor.reserve);
    actor.mag += load;
    actor.reserve -= load;
    actor.reloadingUntil = 0;
  }
  if (actor.mag <= 0 && actor.reserve > 0 && actor.reloadingUntil === 0) {
    actor.reloadingUntil = Number((sim.clock + prof.reloadSec).toFixed(3));
    sim.events.push({type:'actor-reload-cue',shooterId:actor.id,weapon:actor.weapon,phase:'open',
      clock:Number(sim.clock.toFixed(3)),origin:{x:actor.x,y:actor.y??0,z:actor.z,eyeHeight:actor.eyeHeight??1.65}});
    if (actor.id === 'pl_aux_01') {
      sim.dialogue.trigger('bz39_c03_02', sim, { allowRepeat: true });
    }
  }
}

export function stepActorNavigation(sim, actor, dt) {
  actor.effectiveSpeed=0;
  if (!actor.alive || actor.nonCombatant || actor.state === 'DOWN' || actor.state === 'SURRENDERED' || actor.state === 'WOUNDED_UNARMED') {
    actor.moving = false;
    return;
  }
  if(actor.reloadingUntil>sim.clock){actor.moving=false;actor.crouched=true;actor.eyeHeight=1.08;return;}
  if (!actor.goal) {
    actor.moving = false;
    return;
  }

  const distToGoal = Math.hypot(actor.goal.x - actor.x, actor.goal.z - actor.z);
  if (distToGoal <= 0.45) {
    actor.moving = false;
    actor.navCorners = null;
    if (typeof actor.goal.facing === 'number') {
      actor.facing = actor.goal.facing;
    }
    if (typeof actor.goal.crouch === 'boolean') {
      actor.crouched = actor.goal.crouch;
      actor.eyeHeight = actor.crouched ? 1.08 : 1.65;
    }
    return;
  }

  // Check if any narrow door (<= 1.3m) is within 1.65m of the actor along their movement toward the goal
  for (const door of sim.world.doors) {
    const dDoor = Math.hypot(door.center.x - actor.x, door.center.z - actor.z);
    if (dDoor <= 1.65) {
      // If the door is closed, NPC opens it physically!
      if (door.state === 'closed') {
        sim.world.setDoorState(door.id, 'open');
        sim.events.push({
          type: 'door-toggled',
          doorId: door.id,
          state: 'open',
          byActorId: actor.id,
          clock: sim.clock,
        });
      }
      // Single-file portal queue for narrow doorways (width <= 1.3m)
      if (door.width <= 1.3) {
        const lock = sim.doorLocks.get(door.id);
        if (lock && lock.actorId !== actor.id && lock.expiresAt > sim.clock) {
          actor.moving = false;
          actor.waitingForDoorId = door.id;
          return;
        }
        sim.doorLocks.set(door.id, {
          actorId: actor.id,
          expiresAt: Number((sim.clock + 0.95).toFixed(3)),
        });
        actor.waitingForDoorId = null;
      }
    }
  }

  // Replan A* route when goal or world revision changes (respecting 1 route per tick budget or immediate if unrouted)
  const goalKey = `${actor.goal.x.toFixed(2)},${actor.goal.z.toFixed(2)}`;
  if (!actor.navCorners || actor.navGoalKey !== goalKey || actor.navRevision !== sim.world.revision) {
    const corners = sim.navigator.route(
      { x: actor.x, y: actor.y, z: actor.z, radius: actor.radius ?? PLAYER_PHYSICS.radius },
      { x: actor.goal.x, z: actor.goal.z },
    );
    actor.navCorners = corners && corners.length ? corners.map(([cx, cz]) => ({ x: cx, z: cz })) : [{ x: actor.goal.x, z: actor.goal.z }];
    actor.navGoalKey = goalKey;
    actor.navRevision = sim.world.revision;
  }

  while (actor.navCorners && actor.navCorners.length > 1) {
    const c0 = actor.navCorners[0];
    if (Math.hypot(c0.x - actor.x, c0.z - actor.z) <= 0.48) {
      actor.navCorners.shift();
    } else {
      break;
    }
  }

  const nextCorner = actor.navCorners?.[0] ?? actor.goal;
  const dx = nextCorner.x - actor.x;
  const dz = nextCorner.z - actor.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) {
    actor.moving = false;
    return;
  }

  const baseSpeed = actor.state==='WALKING_SUPPORTED'?1.8:actor.encounterId==='LAST_GROUP'?actor.speed:actor.suppressed > 0.55 ? 2.6 : 4.1;
  const stepDist = Math.min(dist, baseSpeed * dt);
  let vx = (dx / dist) * stepDist;
  let vz = (dz / dist) * stepDist;

  // Gentle personal-space repulsion against other living actors so capsules never stack
  const allActors = [...sim.allies, ...sim.enemies,...(actor.encounterId==='LAST_GROUP'?sim.areaC.lastGroup:[])];
  for (const other of allActors) {
    if (other.id === actor.id || !other.alive) continue;
    const ox = actor.x - other.x;
    const oz = actor.z - other.z;
    const od = Math.hypot(ox, oz);
    if (od > 1e-4 && od < 0.72) {
      const push = ((0.72 - od) / 0.72) * 1.4 * dt;
      vx += (ox / od) * push;
      vz += (oz / od) * push;
    }
  }

  actor.crouched = false;
  actor.eyeHeight = 1.65;
  actor.moving = true;
  actor.facing = Math.atan2(dz, dx);
  const x0=actor.x,z0=actor.z;
  movePlayer(sim.world, actor, vx, vz, dt);
  const moved=Math.hypot(actor.x-x0,actor.z-z0);
  actor.moving=moved>1e-5;actor.effectiveSpeed=dt>0?moved/dt:0;actor.motionDistance=(actor.motionDistance??0)+moved;
}

export function updateLowCoverExposure(sim,actor){
  if(actor.moving||!actor.goal?.crouch||actor.reloadingUntil>sim.clock||actor.role==='medic'||actor.goal.nodeId?.startsWith('prep_'))return;
  if(sim.world.layout.buildings.some(b=>actor.x>b.bounds[0]&&actor.x<b.bounds[1]&&actor.z>b.bounds[2]&&actor.z<b.bounds[3]))return;
  const cover=sim.world.obstacles.find(o=>o.max.y>actor.y+.8&&o.max.y<=actor.y+(actor.encounterId==='EA0'?1.65:1.4)&&o.min.y<=actor.y+.4&&Math.hypot(Math.max(o.min.x-actor.x,0,actor.x-o.max.x),Math.max(o.min.z-actor.z,0,actor.z-o.max.z))<=(actor.encounterId==='EA0'?2:1.4));
  if(!cover)return;
  const offset=[...actor.id].reduce((n,c)=>n+c.charCodeAt(0),0)%11*.17;
  const phase=(sim.clock+offset)%3.2;
  const exposed=actor.suppressed<.55&&(Boolean(actor.burst)||(phase>=1.75&&phase<2.8));
  if(actor.coverExposure?.exposed!==exposed)actor.coverExposure={coverId:cover.id,exposed,changedAt:Number(sim.clock.toFixed(3))};
  actor.crouched=!exposed;actor.eyeHeight=exposed?1.65:1.08;
}

// Called only after visual perception succeeds. Prefer the torso; if a solid
// parapet hides it, aim at the actually observed eye/head rather than repeatedly
// shooting the wall. No hidden target or renderer information enters this test.
export function m02VisibleAimPoint(sim,shooter,target){
  const torso={x:target.x,y:target.y+(target.crouched?.95:1.25),z:target.z};
  const origin=shooter.id==='DE-A05'?{x:11.82,y:1.42,z:-30}:eyePosition(shooter);
  const dx=torso.x-origin.x,dy=torso.y-origin.y,dz=torso.z-origin.z,d=Math.hypot(dx,dy,dz)||1;
  return traceObstruction(sim.world,origin,{x:dx/d,y:dy/d,z:dz/d},Math.max(0,d-.2))?eyePosition(target):torso;
}

export function updatePolishSquad(sim, dt) {
  const coverById = sim.coverNodesById;
  const activeAxis = sim.flags['m02.axis'] || (sim.squadOrder?.axis ?? 'ditch');
  const orderMode=sim.squadOrder?.type??'auto';
  // A suppression order holds the current phase of the farm approach. It
  // does not teleport anyone: men continue walking to their assigned cover.
  // Advance selects the next authored node and still uses the same navigator.
  const issuedAt=Number.isFinite(sim.squadOrder?.issuedAt)?sim.squadOrder.issuedAt:sim.clock;
  const orderClock=orderMode==='suppress'?Math.min(sim.clock,issuedAt):sim.clock;
  const orderElapsed=Math.max(0,orderClock-(sim.ea1StartedAt??0));
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05' && e.alive && !e.nonCombatant);

  // Assign tactical cover goals by squad state & elapsed time / progression
  for (const ally of sim.allies) {
    if (!ally.alive || ally.state === 'DOWN' || ally.detachedOutOfCell) {
      if(ally.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(ally);
      continue;
    }
    ally.suppressed = Math.max(0, ally.suppressed - dt * 0.28);
    if(['WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12'].includes(ally.state)){ally.burst=null;delete ally.m02GrenadeThreat;}
    else if(m02ReactToGrenade(sim,ally,'ally')){stepActorNavigation(sim,ally,dt);continue;}
    else stepActorWeapon(sim, ally, dt);
    // Once in the aid station Lis remains there, including after restoring an
    // older save with a stale navigation goal. Do not reassign combat cover.
    if(ally.id==='pl_lis'&&sim.activeCellId==='C'&&ally.state==='EVACUATED_B12'){
      ally.goal=null;ally.navCorners=null;ally.moving=false;ally.effectiveSpeed=0;continue;
    }
    if(ally.id==='pl_lis'&&sim.areaC?.c11Started&&!sim.areaC.lisContactedInC11){ally.goal=null;ally.moving=false;continue;}

    const held=(sim.activeCellId==='B'||sim.activeCellId==='C')&&orderMode==='suppress'&&
      sim.squadOrder?.issuedCell===sim.activeCellId&&sim.squadOrder?.holdPositions?.[ally.id];
    if(held&&!['WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12'].includes(ally.state)){
      ally.goal={x:held.x,z:held.z,crouch:true,nodeId:`order_hold_${ally.id}`};
      ally.tacticalState='HoldAndSuppress';
    } else if (sim.activeCellId === 'B') {
      // Cell B (Łęczyca Logistics Corridor): bound from south entry toward B05 workshop & B06 shop crossroads
      const bGoals = {
        pl_gruca: { x: -18.0, z: 10.0, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_west_wall' },
        pl_wierzba: { x: -32.0, z: -12.0, facing: -Math.PI / 2, crouch: false, nodeId: 'cv_b05_south' },
        pl_lis: { x: -6.0, z: 50.0, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_south_barricade' },
        pl_malek: { x: -22.0, z: 10.5, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_west_wall_2' },
        pl_szymczak: { x: -38.0, z: 38.0, facing: 0, crouch: true, nodeId: 'cv_b07_aid' },
        pl_aux_01: { x: 11.5, z: 6.5, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_east_cart' },
        pl_aux_02: { x: 14.0, z: 6.8, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_east_cart_2' },
      };
      const g = bGoals[ally.id] ?? bGoals.pl_gruca;
      ally.goal = g;
      ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
    } else if (sim.activeCellId === 'C') {
      // Cell C (Leśmierz Passage & Evacuation): secure B09/B10/B11 and then cover B09 -> B12 evacuation route
      const evacPhase = sim.c10Active || sim.c11Active;
      const cGoals = evacPhase
        ? {
            pl_gruca: { x: -32.0, z: 18.0, facing: 0.4, crouch: true, nodeId: 'cv_c_evac_gruca' },
            pl_wierzba: { x: -14.0, z: -4.0, facing: 0.3, crouch: true, nodeId: 'cv_c_b09_east' },
            pl_malek: { x: -46.0, z: 36.0, facing: 0.5, crouch: true, nodeId: 'cv_c_evac_malek' },
            pl_szymczak: { x: -56.0, z: 46.0, facing: -Math.PI / 2, crouch: false, nodeId: 'cv_c_b12_aid' },
            pl_aux_01: { x: -6.0, z: -11.5, facing: 0.5, crouch: true, nodeId: 'cv_c_yard_rkm' },
            pl_aux_02: { x: -4.0, z: -11.5, facing: 0.5, crouch: true, nodeId: 'cv_c_yard_rkm_2' },
            pl_lis: ally.goal ?? { x: -56.0, z: 50.0, facing: Math.PI / 2, crouch: false, nodeId: 'cv_c_b12_lis' },
          }
        : {
            pl_gruca: { x: -6.0, z: -15.5, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_yard_parapet' },
            pl_wierzba: { x: 12.0, z: -24.0, facing: 0.0, crouch: false, nodeId: 'cv_c_b10_flank' },
            pl_malek: { x: -28.0, z: -22.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_b09_north' },
            pl_szymczak: { x: -8.0, z: -38.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_wall' },
            pl_aux_01: { x: -4.0, z: -39.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_rkm' },
            pl_aux_02: { x: -2.0, z: -39.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_rkm_2' },
          };
      const g = cGoals[ally.id] ?? cGoals.pl_gruca;
      if (g) {
        ally.goal = g;
        ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
      }
    } else if (sim.c01Active) {
      const c01Elapsed = sim.clock - (sim.c01StartedAt ?? 0);
      const c01Stage = c01Elapsed < 4.5 ? 0 : c01Elapsed < 14.0 ? 1 : 2;
      const slot=sim.world.layout.c01Corridor?.preparationSlots?.[ally.id];
      if(c01Stage===0&&slot){
        ally.goal={x:slot.x,z:slot.z,facing:slot.facing,crouch:true,nodeId:`prep_${ally.id}`};
        ally.crouched=true;ally.eyeHeight=1.08;ally.moving=false;continue;
      }
      const c01Map = {
        pl_aux_01: ['cv_c01_p1_e', 'cv_c01_mid_e', 'cv_c01_mid_e'],
        pl_aux_02: ['cv_c01_p1_w', 'cv_c01_mid_e', 'cv_c01_mid_e'],
        pl_szymczak: ['cv_c01_p1_w', 'cv_c01_p1_w', 'cv_c01_mid_w'],
        pl_gruca: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
        pl_lis: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
        pl_wierzba: ['cv_c01_p1_e', 'cv_c01_mid_e', 'cv_c01_outpost_clear'],
        pl_malek: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
      };
      const seq = c01Map[ally.id] ?? c01Map.pl_gruca;
      const nodeId = seq[Math.min(c01Stage, seq.length - 1)];
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
      }
    } else if (ally.id === 'pl_aux_01' || ally.id === 'pl_aux_02') {
      // 1. rkm wz. 28 support pair (Nowak + Kowalski) holds fire base and advances to north courtyard wall once ditch team reaches B01
      const combatElapsed = orderElapsed;
      const ditchAdvanced = combatElapsed >= 18 || sim.player.z > -35;
      const nodeId = ditchAdvanced
        ? (ally.id === 'pl_aux_01' ? 'cv_gate_wall_west_s' : 'cv_b01_east_corner')
        : (ally.id === 'pl_aux_01' ? 'cv_start_parapet_e' : 'cv_start_parapet_w');
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = 'HoldAndSuppress';
      }
    } else if (ally.id === 'pl_szymczak') {
      // Medic stays in covered support behind Gruca and moves to orchard in C04
      const combatElapsed = orderElapsed;
      const c04Ready = sim.objective.id === 'C04' || sim.objective.id === 'O03';
      const nodeId = c04Ready
        ? 'cv_courtyard_consolidate'
        : combatElapsed >= 14
          ? 'cv_ditch_mid_b'
          : 'cv_start_parapet_w';
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = 'SupportMedic';
      }
    } else {
      // Assault & flank team (Gruca, Lis, Wierzba, Małek)
      const combatElapsed = orderElapsed;
      if (activeAxis === 'orchard' || orderMode === 'flank_east') {
        const baseStage = combatElapsed < 12 ? 0 : combatElapsed < 26 ? 1 : 2;
        const stage=Math.min(2,baseStage+(orderMode==='advance'?1:0));
        const mapByRole = {
          pl_gruca: ['cv_orchard_bank_e', 'cv_b03_south_entry', 'cv_courtyard_consolidate'],
          pl_wierzba: ['cv_orchard_bank_e', 'cv_b03_north_exit', 'cv_gate_wall_west_s'],
          pl_lis: ['cv_ditch_north_a', 'cv_b01_north_wall', 'cv_b01_hall_in'],
          pl_malek: ['cv_ditch_north_b', 'cv_b01_kitchen_in', 'cv_b01_east_corner'],
        };
        const seq = mapByRole[ally.id] ?? mapByRole.pl_gruca;
        const nodeId = seq[Math.min(stage, seq.length - 1)];
        const node = coverById.get(nodeId);
        if (node) {
          ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
          ally.tacticalState = stage >= 1 ? 'FlankMove' : 'AdvanceOrder';
        }
      } else {
        // Default / Ditch + B01 clearing bound progression
        const baseStage = combatElapsed < 8 ? 0 : combatElapsed < 18 ? 1 : combatElapsed < 30 ? 2 : 3;
        const stage=Math.min(3,baseStage+(orderMode==='advance'?1:0));
        const mapByRole = {
          pl_gruca: ['cv_ditch_north_a', 'cv_ditch_mid_a', 'cv_b01_north_wall', 'cv_b01_east_corner'],
          pl_lis: ['cv_ditch_north_b', 'cv_ditch_south_a', 'cv_b01_kitchen_in', 'cv_b01_hall_in'],
          pl_wierzba: ['cv_ditch_mid_a', 'cv_b01_north_wall', 'cv_b01_east_corner', 'cv_gate_wall_west_s'],
          pl_malek: ['cv_ditch_north_b', 'cv_ditch_mid_b', 'cv_ditch_south_a', 'cv_b01_kitchen_in'],
        };
        const seq = mapByRole[ally.id] ?? mapByRole.pl_gruca;
        const nodeId = seq[Math.min(stage, seq.length - 1)];
        const node = coverById.get(nodeId);
        if (node) {
          ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
          ally.tacticalState = nodeId.startsWith('cv_b01_') && nodeId.endsWith('_in') ? 'ClearRoom' : 'AdvanceOrder';
        }
      }
    }

    const prevNode = ally.reachedNodeId;
    stepActorNavigation(sim, ally, dt);
    updateLowCoverExposure(sim,ally);
    if (!ally.moving && ally.goal?.nodeId && ally.reachedNodeId !== ally.goal.nodeId) {
      ally.reachedNodeId = ally.goal.nodeId;
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'ally_captured_cover',
        actorId: ally.id,
        nodeId: ally.goal.nodeId,
        fromNodeId: prevNode ?? null,
      });
      if (ally.id === 'pl_malek' && ally.goal.nodeId === 'cv_ditch_north_b') {
        sim.dialogue.trigger('bz39_c02_04', sim);
      }
      if (ally.id === 'pl_gruca' && ally.goal.nodeId === 'cv_b01_north_wall') {
        sim.dialogue.trigger('bz39_c03_01', sim);
      }
      if (ally.id === 'pl_wierzba' && ally.goal.nodeId === 'cv_b01_east_corner') {
        sim.dialogue.trigger('bz39_c03_03', sim);
      }
    }

    if(['WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12'].includes(ally.state))continue;

    // 2. Allied target acquisition & causal firing (no decorative shots!)
    if (ally.reloadingUntil > sim.clock || ally.mag <= 0 || sim.clock < ally.nextFireAt) {
      continue;
    }
    if (ally.id === 'pl_szymczak' && ally.suppressed < 0.2) {
      // Medic only fires in close self-defense
      continue;
    }

    const crewCover=m02MachineGunCover(sim,ally,'ally');
    let bestEnemy = null;
    let bestScore = -Infinity;
    for (const enemy of sim.enemies) {
      if (!enemy.alive || enemy.nonCombatant) continue;
      if (sim.c01Active && enemy.encounterId !== 'EA0') continue;
      const dist = Math.hypot(enemy.x - ally.x, enemy.z - ally.z);
      if (dist > (WEAPON_PROFILES[ally.weapon]?.range ?? 180)) continue;

      const hasLoS = sim.world.lineOfSight(ally, enemy, { includeFoliage: true });
      // rkm_gunner can also lay suppressive fire on the B02 MG aperture if it has clear ray to the aperture lip
      const isMgSuppressTarget =
        !sim.c01Active &&
        ally.id === 'pl_aux_01' &&
        enemy.id === 'DE-A05' &&
        sim.world.lineOfSight(ally, { x: 11.85, y: 0, z: -30.0, eyeHeight: 1.42, space: 'metres' }, { includeFoliage: false });

      if (!hasLoS && !isMgSuppressTarget) continue;

      const aimPt = isMgSuppressTarget && !hasLoS
        ? { x: 12.2, y: 1.38, z: -30.0 }
        : m02VisibleAimPoint(sim,ally,enemy);

      if (!friendlyFireClear(ally, aimPt, [sim.player, ...sim.allies])) continue;

      let score = 200 - dist;
      if (enemy.id === 'DE-A05') score += 85; // prioritize MG34
      if (hasLoS) score += 40;
      if (enemy.id===crewCover?.targetId && hasLoS) score += 220;
      if (score > bestScore) {
        bestScore = score;
        bestEnemy = { enemy, aimPt, isMgSuppressTarget };
      }
    }

    if (bestEnemy) {
      const { enemy, aimPt } = bestEnemy;
      ally.facing = Math.atan2(aimPt.z - ally.z, aimPt.x - ally.x);
      const fired=sim.fireActorBurst(ally, enemy, aimPt, 'ally');
      if(fired&&ally.id==='pl_aux_01')ally.m02LastEngagedTargetId=enemy.id;
      if(fired&&enemy.id===crewCover?.targetId)fired.crewCoverFor=crewCover.gunnerId;
      if (ally.id === 'pl_lis' && (enemy.id === 'DE-A05' || enemy.encounterId === 'EA0')) {
        sim.dialogue.trigger('bz39_c02_02', sim);
      }
    }
  }
}

export function updateGermanGarrison(sim, dt) {
  const ea1Enemies = sim.enemies.filter((e) => e.encounterId !== 'EA0');
  const livingEa1Combat = ea1Enemies.filter((e) => e.alive && !e.nonCombatant);
  const neutralizedCount = ea1Enemies.length - livingEa1Combat.length;
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05');
  const mgDown = !mgGunner || !mgGunner.alive || mgGunner.nonCombatant;

  // Detect which flank is under pressure so local reserves (DE-A12, DE-A13) can shift (J1)
  const westPressure =
    (sim.player.x < -20 && sim.player.z > -45) ||
    sim.allies.some((a) => a.alive && a.x < -24 && a.z > -35);
  const eastPressure =
    (sim.player.x > 18 && sim.player.z > -45) ||
    sim.allies.some((a) => a.alive && a.x > 18 && a.z > -35);

  for (const enemy of sim.enemies) {
    if (!enemy.alive) {if(enemy.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(enemy);continue;}
    if (sim.c01Active && enemy.encounterId !== 'EA0') continue;
    enemy.suppressed = Math.max(0, enemy.suppressed - dt * 0.25);

    // Check C04 wounded non-combatant transition in southern orchard
    if (enemy.c04Candidate && !enemy.nonCombatant && (enemy.health <= 48 || (mgDown && neutralizedCount >= 6))) {
      enemy.state = 'WOUNDED_UNARMED';
      enemy.nonCombatant = true;
      enemy.crouched = true;
      enemy.moving = false;
      enemy.goal = null;
      enemy.health = Math.max(25, enemy.health);
      if(enemy.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(enemy);
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'enemy_wounded_unarmed_c04',
        actorId: enemy.id,
        x: Number(enemy.x.toFixed(2)),
        z: Number(enemy.z.toFixed(2)),
      });
      continue;
    }

    // Check garrison morale collapse (retreat / surrender when MG is down and >= 7 defenders neutralized)
    if (sim.activeCellId === 'A' && enemy.encounterId !== 'EA0' && !enemy.nonCombatant && mgDown && neutralizedCount >= 7) {
      enemy.state = 'SURRENDERED';
      enemy.nonCombatant = true;
      enemy.moving = false;
      enemy.goal = null;
      if(enemy.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(enemy);
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'enemy_surrendered',
        actorId: enemy.id,
      });
      continue;
    }

    if (enemy.nonCombatant) {if(enemy.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(enemy);continue;}

    if(m02ReactToGrenade(sim,enemy,'enemy')){stepActorNavigation(sim,enemy,dt);continue;}
    stepActorWeapon(sim, enemy, dt);
    if(enemy.encounterId==='EA0'&&sim.c01Active&&!enemy.goal&&!enemy.fellBack){
      enemy.goal={x:enemy.x,z:enemy.z,crouch:true,nodeId:`ea0_guard_${enemy.id}`};
    }

    // Local reserve movement (DE-A12, DE-A13 in Area A; or EC2 reserve DE-C09..DE-C20 in Area C)
    if (enemy.encounterId === 'EC2' && sim.c10Active && typeof enemy.goalX === 'number' && !enemy.goal) {
      enemy.goal = { x: enemy.goalX, z: enemy.goalZ, crouch: true };
      enemy.state = 'ADVANCE_RESERVE';
    } else if (enemy.role === 'reserve' && !enemy.reserveShifted) {
      if (westPressure && enemy.ShiftWest) {
        enemy.goal = { x: enemy.ShiftWest[0], z: enemy.ShiftWest[1], crouch: true };
        enemy.reserveShifted = 'west';
        enemy.state = 'SHIFT_COVER';
      } else if (eastPressure && enemy.ShiftEast) {
        enemy.goal = { x: enemy.ShiftEast[0], z: enemy.ShiftEast[1], crouch: true };
        enemy.reserveShifted = 'east';
        enemy.state = 'SHIFT_COVER';
      }
    }

    // Fallback to secondary cover if heavily suppressed and damaged
    if (enemy.health < 55 && enemy.suppressed > 0.65 && enemy.fallback && !enemy.fellBack) {
      enemy.goal = { x: enemy.fallback[0], z: enemy.fallback[1], crouch: true };
      enemy.fellBack = true;
      enemy.state = 'FALLBACK_COVER';
    }

    stepActorNavigation(sim, enemy, dt);
    updateLowCoverExposure(sim,enemy);

    // Honest Visual Perception (AI-02: never tracks hidden targets through solid walls!)
    const potentialTargets = [sim.player, ...sim.allies, ...m02ExposedLastGroup(sim)].filter((t) => t && t.alive && t.state !== 'DOWN');
    const crewCover=m02MachineGunCover(sim,enemy,'enemy');
    let visibleTarget = null;
    let bestTargetScore = -Infinity;

    for (const t of potentialTargets) {
      const dx = t.x - enemy.x;
      const dz = t.z - enemy.z;
      const dist = Math.hypot(dx, dz);
      const maxRange = WEAPON_PROFILES[enemy.weapon]?.range ?? 160;
      if (dist > maxRange) continue;

      const angleToTarget = Math.atan2(dz, dx);
      const angleDiff = Math.abs(normalizeAngleDiff(angleToTarget, enemy.facing));
      // MG34 is constrained to its western aperture arc; riflemen have a 150-degree front visual cone
      const maxHalfCone = enemy.weapon === 'mg34' ? sim.mgState.arcHalfAngle : 1.32;
      if (angleDiff > maxHalfCone) continue;

      const hasLoS = enemy.id === 'DE-A05' && sim.activeCellId === 'A'
        ? sim.evaluateMgLineOfFire(t).hasVisualLoS
        : sim.world.lineOfSight(enemy, t, { includeFoliage: true });

      if (!hasLoS) continue;

      const score = 180 - dist + (t.id === 'piotr_sokol' ? 15 : 0) + (t.id===crewCover?.targetId ? 220 : 0);
      if (score > bestTargetScore) {
        bestTargetScore = score;
        visibleTarget = t;
      }
    }

    if (visibleTarget) {
      const acquiredAim=m02VisibleAimPoint(sim,enemy,visibleTarget);
      if(enemy.seeingTargetId!==visibleTarget.id||!Number.isFinite(enemy.targetAcquiredAt))enemy.targetAcquiredAt=sim.clock;
      enemy.state = 'ENGAGE_VISIBLE';
      enemy.seeingTargetId = visibleTarget.id;
      enemy.memory = {
        targetId: visibleTarget.id,
        x: Number(visibleTarget.x.toFixed(2)),
        y: Number(acquiredAim.y.toFixed(2)),
        z: Number(visibleTarget.z.toFixed(2)),
        seenAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + 6.0).toFixed(2)),
        source: 'visual',
      };
      if (enemy.weapon !== 'mg34') {
        enemy.facing = Math.atan2(visibleTarget.z - enemy.z, visibleTarget.x - enemy.x);
      }

      // Reuse M01's default human reaction interval: acquisition is visible
      // before the first aimed shot. Ballistics, suppression and cover still
      // determine every hit; reacquisition state lives in actor checkpoints.
      const reacted=visibleTarget.id!==sim.player.id||sim.clock-enemy.targetAcquiredAt>=M01_DIFFICULTY.soldado.reactionGraceSec;
      if (reacted && enemy.reloadingUntil <= sim.clock && enemy.mag > 0 && sim.clock >= enemy.nextFireAt && enemy.suppressed < 0.88) {
        const aimPt = acquiredAim;
        const fired=sim.fireActorBurst(enemy, visibleTarget, aimPt, 'enemy');
        if(fired&&visibleTarget.id===crewCover?.targetId)fired.crewCoverFor=crewCover.gunnerId;
      }
    } else {
      enemy.seeingTargetId = null;
      // If memory is still active, orient toward lastKnownPosition (NEVER current hidden position!) and optionally fire 1 suppressive shot at the opening
      if (enemy.memory && sim.clock < enemy.memory.expiresAt) {
        enemy.state = 'SEARCH_MEMORY';
        if (enemy.weapon !== 'mg34') {
          enemy.facing = Math.atan2(enemy.memory.z - enemy.z, enemy.memory.x - enemy.x);
        }
      } else {
        enemy.memory = null;
        enemy.state = 'HOLD_SECTOR';
      }
    }
  }
}
