import {m02ObjectivePresentation} from './m02-objective-presentation.js';
import { M02Session } from './m02-session.js';
import { mountM02SessionUi } from './m02-session-ui.js';
import { m02PlayerAction, performM02PlayerAction } from '../game/m02-player-actions.js';
import { M02BenchSimulation } from '../game/m02-01-simulation.js';
import { M02BenchRenderer } from '../render/m02-01-renderer.js';

const PANORAMA_VIEWS = Object.freeze({
  SN1: { x: 0, z: -80, angle: Math.PI / 2, pitch: -0.02, label: 'SN1 · Entrada norte da bancada (0, -80)' },
  SN2: { x: -45, z: -5, angle: 0.25, pitch: 0.04, label: 'SN2 · Vala húmida oeste (-45, -5) rumo a B01' },
  SN3: { x: -21, z: -13.5, angle: Math.PI, pitch: 0.0, label: 'SN3 · Fachada este da Casa B01 (-21, -13.5)' },
  SN4: { x: 4, z: -29.5, angle: 0.0, pitch: 0.02, label: 'SN4 · Frente oeste do Celeiro B02 e abertura MG (4, -29.5)' },
  SN5: { x: 0, z: 45, angle: -Math.PI / 2, pitch: 0.0, label: 'SN5 · Pomar sul olhando para o pátio (0, 45)' },
});

const params = new URLSearchParams(window.location.search);
const initialQuality = params.get('quality') || (document.body.dataset.mission==='m02'?'auto':'medium');
const initialLighting = params.get('lighting') || 'afternoon_1939_09_09';

const canvas = document.getElementById('m02-canvas');
const missionMode=document.body.dataset.mission==='m02';
const sim = new M02BenchSimulation(19390909, {startScene:missionMode?'C01':'C02'});
const renderer = new M02BenchRenderer(canvas, sim, {
  quality: initialQuality,
  lighting: initialLighting,
});

const session=missionMode?new M02Session(sim,renderer):null;
const updateSessionUi=missionMode?mountM02SessionUi(session,renderer):()=>{};
const debugMode=!missionMode||params.get('debug')==='1';

const elObjective = document.getElementById('hud-objective');
const elPos = document.getElementById('hud-pos');
const elHealth = document.getElementById('hud-health');
const elMgStatus = document.getElementById('hud-mg-status');
const elSquadStatus = document.getElementById('hud-squad-status');
const elRouteStatus = document.getElementById('hud-route-status');
const elAmmo = document.getElementById('hud-ammo');
const elGrenades = document.getElementById('hud-grenades');
const elLastShot = document.getElementById('hud-last-shot');
const elDoorPrompt = document.getElementById('door-prompt');
const elCartelaBanner = document.getElementById('cartela-banner');
const elDialogueBanner = document.getElementById('dialogue-banner');
const elTelemetry = document.getElementById('hud-telemetry');
const selQuality = document.getElementById('select-quality');
const selLighting = document.getElementById('select-lighting');

if (selQuality) selQuality.value = renderer.qualityProfile.id;
if (selLighting) selLighting.value = renderer.lightingPreset.id;

const keys = new Set();
window.addEventListener('pointerdown', () => renderer.presentation.unlockAudio());
window.addEventListener('keydown', () => renderer.presentation.unlockAudio());
let pendingSingleActions = {
  interact: false,
  reload: false,
  crouch: false,
  fire: false,
  grenade: false,
  orderSuppress: false,
  orderAdvance: false,
  orderFlank: false,
};

window.addEventListener('keydown', (e) => {
  if(missionMode && e.code==='Escape'){session.pause();keys.clear();return;}
  if(missionMode && !session.playing)return;
  if(e.repeat)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F5','F9'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyE') pendingSingleActions.interact = true;
  if (e.code === 'KeyR') pendingSingleActions.reload = true;
  if (e.code === 'KeyC') pendingSingleActions.crouch = true;
  if (e.code === 'Space') pendingSingleActions.fire = true;
  if (e.code === 'KeyG') pendingSingleActions.grenade = true;
  if (e.code === 'KeyZ') pendingSingleActions.orderSuppress = true;
  if (e.code === 'KeyX') pendingSingleActions.orderAdvance = true;
  if (e.code === 'KeyB') pendingSingleActions.orderFlank = true;
  if (debugMode && e.code === 'F3') {
    e.preventDefault();
    renderer.toggleDebugOverlay();
  }
  if (e.code === 'F5') {
    e.preventDefault();
    sim.saveCheckpoint('cp_m02_manual');session?.save();
  }
  if (e.code === 'F9' && missionMode) {e.preventDefault();session.restart();return;}
  if (e.code === 'F9') {
    e.preventDefault();
    const id = sim.checkpoints.has('cp_m02_manual')
      ? 'cp_m02_manual'
      : sim.checkpoints.has('cp_m02_b_acesso')
        ? 'cp_m02_b_acesso'
        : 'cp_m02_a_preparacao';
    sim.restoreCheckpoint(id);
  }
  if(!debugMode)return;
  if (e.code === 'Digit0') sim.startAreaAFullC01();
  if (e.code === 'Digit1') teleportToPanorama('SN1');
  if (e.code === 'Digit2') teleportToPanorama('SN2');
  if (e.code === 'Digit3') teleportToPanorama('SN3');
  if (e.code === 'Digit4') teleportToPanorama('SN4');
  if (e.code === 'Digit5') teleportToPanorama('SN5');
  if (e.code === 'Digit6') sim.triggerTransitionTAB({ skip: false });
  if (e.code === 'Digit7') sim.enterAreaBC06();
  if (e.code === 'Digit8') sim.enterAreaCC09();
  if (e.code === 'Digit9') {
    sim.startC10OrderChanges();
    sim.detonateC10FixedArtillery();
    sim.assistLisInC11('wounded_evacuated');
  }
  if (e.code === 'KeyM') sim.completeC12Epilogue();
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{keys.clear();session?.pause();});
window.addEventListener('pointerlockchange',()=>{if(missionMode && !document.pointerLockElement){keys.clear();session.pause();}});
canvas.addEventListener('mouseup',e=>{if(e.button===2)keys.delete('KeyV');});
canvas.addEventListener('mousedown', (e) => {
  if(missionMode && !session.playing)return;
  if(e.button===2)keys.add('KeyV');
  if (e.button === 0) {
    pendingSingleActions.fire = true;
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock().catch?.(() => {});
    }
  }
});

window.addEventListener('mousemove', (e) => {
  if ((!missionMode||session.playing) && document.pointerLockElement === canvas) {
    sim.player.angle += e.movementX * 0.0024;
    sim.player.pitch = Math.max(-1.3, Math.min(1.3, sim.player.pitch - e.movementY * 0.0022));
  }
});

window.addEventListener('resize', () => renderer.resize());

selQuality?.addEventListener('change', (e) => {
  renderer.applyQualityProfile(e.target.value);
});

selLighting?.addEventListener('change', (e) => {
  const val = e.target.value;
  const preset = renderer.applyLightingPreset(val);
  if (preset.temporalId && sim.horizon) {
    sim.horizon.setTemporalState(preset.temporalId);
  }
});

document.getElementById('btn-start-c01')?.addEventListener('click', () => {
  sim.startAreaAFullC01();
});

document.getElementById('btn-transition-tab')?.addEventListener('click', () => {
  sim.triggerTransitionTAB({ skip: false });
});

document.getElementById('btn-enter-area-b')?.addEventListener('click', () => {
  sim.enterAreaBC06();
});

document.getElementById('btn-enter-area-c')?.addEventListener('click', () => {
  sim.enterAreaCC09();
});

document.getElementById('btn-c10-c11-lis')?.addEventListener('click', () => {
  sim.startC10OrderChanges();
  sim.detonateC10FixedArtillery();
  sim.assistLisInC11('wounded_evacuated');
});

document.getElementById('btn-c12-epilogue')?.addEventListener('click', () => {
  sim.completeC12Epilogue();
});

document.getElementById('btn-toggle-debug')?.addEventListener('click', () => {
  renderer.toggleDebugOverlay();
});

document.getElementById('btn-reset-bench')?.addEventListener('click', () => {
  sim.reset();
});

document.getElementById('btn-order-suppress')?.addEventListener('click', () => {
  sim.issueSquadOrder('suppress');
});
document.getElementById('btn-order-advance')?.addEventListener('click', () => {
  sim.issueSquadOrder('advance');
});
document.getElementById('btn-order-flank')?.addEventListener('click', () => {
  sim.issueSquadOrder('flank_east');
});

for (const btn of document.querySelectorAll('[data-tp]')) {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-tp');
    teleportToPanorama(id);
  });
}

function teleportToPanorama(id) {
  const view = PANORAMA_VIEWS[id];
  if (!view) return null;
  sim.teleportPlayer(view.x, view.z, view.angle, view.pitch);
  return view;
}

function updateHud() {
  const p = sim.player;
  if (elObjective) {
    elObjective.textContent = `Objetivo [${sim.objective.id}]: ${sim.objective.title}`;
  }
  if (elPos) {
    elPos.textContent = `X: ${p.x.toFixed(1)}m, Y: ${p.y.toFixed(2)}m, Z: ${p.z.toFixed(1)}m`;
  }
  if (elHealth) {
    elHealth.textContent = `${p.health}`;
  }
  if (elMgStatus) {
    if (sim.mgState.canHitPlayer) {
      elMgStatus.textContent = 'EXPOSTO AO FOGO DA MG34 (B02)';
      elMgStatus.className = 'badge-exposed';
    } else {
      const blocker = sim.mgState.blockedById || 'fora do arco';
      elMgStatus.textContent = `COBERTO (${blocker})`;
      elMgStatus.className = 'badge-covered';
    }
  }
  if (elSquadStatus) {
    const alliesOk = sim.allies.filter((a) => a.alive && a.state !== 'DOWN').length;
    const enemiesActive = sim.enemies.filter((e) => e.alive && !e.nonCombatant).length;
    const enemiesSurrendered = sim.enemies.filter((e) => e.alive && e.state === 'SURRENDERED').length;
    const enemiesWounded = sim.enemies.filter((e) => e.alive && e.state === 'WOUNDED_UNARMED').length;
    elSquadStatus.textContent =
      `Secção Polaca ${alliesOk}/${sim.allies.length} · Guarnição EA1 ${enemiesActive}/${sim.enemies.length} ativos` +
      (enemiesSurrendered > 0 ? ` · ${enemiesSurrendered} rendidos` : '') +
      (enemiesWounded > 0 ? ` · ${enemiesWounded} ferido C04` : '');
  }
  if (elRouteStatus) {
    const ditchCount = sim.routeProgress.ditchWaypointsVisited.filter(Boolean).length;
    const orchardCount = sim.routeProgress.orchardWaypointsVisited.filter(Boolean).length;
    const roomsCount = Object.values(sim.routeProgress.visitedB01Rooms).filter(Boolean).length;
    const tState = sim.horizon?.temporalState ?? 'T0';
    const hsA1State = sim.horizon?.hsA1.state ?? 'PREPARE';
    const hsA2State = sim.horizon?.hsA2.state ?? 'OFFENSIVE_FIRE';
    elRouteStatus.textContent =
      `Vala ${ditchCount}/6 · Pomar ${orchardCount}/6 · B01 ${roomsCount}/5 salas · ` +
      `Horizonte ${tState} (HS-A1: ${hsA1State} · HS-A2: ${hsA2State})`;
  }
  if (elAmmo) {
    elAmmo.textContent = `${sim.weapon.mag} / ${sim.weapon.reserve}`;
  }
  if (elGrenades) {
    const action=sim.playerGrenadeAction;
    const status=action?(action.waitingForReload||sim.clock<action.startedAt?' · em espera':' · preparando'):'';
    elGrenades.textContent = `${sim.grenadeAmmo}${status}`;
  }
  if (elLastShot) {
    const last = sim.shotLog[sim.shotLog.length - 1];
    if (!last) {
      elLastShot.textContent = 'Último disparo: —';
    } else if (last.hitTarget) {
      elLastShot.textContent = `Último disparo: ALVO ATINGIDO (${last.hitId} · ${last.part})`;
    } else if (last.glassBrokenId) {
      elLastShot.textContent = `Último disparo: VIDRO PARTIDO (${last.glassBrokenId})`;
    } else if (last.blockedBySolid) {
      elLastShot.textContent = `Último disparo: BLOQUEADO (${last.hitId} · ${last.material})`;
    } else {
      elLastShot.textContent = 'Último disparo: Céu / Sem obstáculo';
    }
  }

  // The interaction key is unavailable while the grenade is reserved. Do
  // not advertise a door or chalk action until the player's hands are free.
  const prompt = sim.playerGrenadeAction ? null : m02PlayerAction(sim) ?? sim.currentChalkPrompt() ?? sim.currentDoorPrompt();
  if (elDoorPrompt) {
    if (prompt) {
      elDoorPrompt.style.display = 'block';
      elDoorPrompt.textContent = `${prompt.prompt} (${prompt.distance}m)`;
    } else {
      elDoorPrompt.style.display = 'none';
    }
  }

  if (elCartelaBanner) {
    if (sim.activeCartela && sim.clock <= sim.activeCartela.expiresAt) {
      elCartelaBanner.style.display = 'block';
      elCartelaBanner.textContent = sim.activeCartela.text;
    } else {
      elCartelaBanner.style.display = 'none';
    }
  }

  if (elDialogueBanner) {
    const line = sim.dialogue.activeLine;
    if (line && sim.audiovisual.accessibility.subtitlesEnabled) {
      elDialogueBanner.style.display = 'block';
      elDialogueBanner.innerHTML = `<span class="speaker">${line.speakerName}:</span> «${line.text}»`;
    } else {
      elDialogueBanner.style.display = 'none';
    }
  }

  if (elTelemetry) {
    const t = renderer.getTelemetrySummary();
    elTelemetry.innerHTML = [
      `<div class="row"><span>FPS (p50):</span><strong>${t.fpsP50}</strong></div>`,
      `<div class="row"><span>Frame p50/p95/p99:</span><span>${t.frameTimeMs.p50} / ${t.frameTimeMs.p95} / ${t.frameTimeMs.p99} ms</span></div>`,
      `<div class="row"><span>Sim / Render (p50):</span><span>${t.simMsP50} / ${t.renderMsP50} ms</span></div>`,
      `<div class="row"><span>DrawCalls / Triângulos:</span><span>${t.drawCalls} / ${t.triangles}</span></div>`,
    ].join('');
  }
}

let lastTime = performance.now();
let missionAccumulator=0;

function animate(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(0.05, Math.max(0.001, rawDt || 1 / 60));

  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const side = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const lookX = (keys.has('ArrowRight') ? 1.8 * dt : 0) - (keys.has('ArrowLeft') ? 1.8 * dt : 0);

  const simStart = performance.now();
  const running=!missionMode||session.playing;
  if(missionMode)missionAccumulator=running?Math.min(.25,missionAccumulator+Math.max(0,rawDt)):0;
  const steps=missionMode?Math.floor((missionAccumulator+1e-9)/.05):1;
  if(running)for(let step=0;step<steps;step++){
  const tickDt=missionMode?.05:dt;
  if(missionMode)missionAccumulator=Math.max(0,missionAccumulator-.05);
  const missionInteraction = pendingSingleActions.interact && performM02PlayerAction(sim);
  sim.tick(tickDt, {
    forward,
    side,
    sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    aim: keys.has('KeyV'),
    lookX: missionMode?lookX/dt*tickDt:lookX,
    lookY: 0,
    interact: pendingSingleActions.interact && !missionInteraction,
    reload: pendingSingleActions.reload,
    crouch: pendingSingleActions.crouch,
    fire: pendingSingleActions.fire,
    grenade: pendingSingleActions.grenade,
    orderSuppress: pendingSingleActions.orderSuppress,
    orderAdvance: pendingSingleActions.orderAdvance,
    orderFlank: pendingSingleActions.orderFlank,
  });
  for(const key of Object.keys(pendingSingleActions))pendingSingleActions[key]=false;
  if(missionMode&&(sim.player.health<=0||sim.areaC.c12Completed))break;
  }
  const simMs = performance.now() - simStart;

  renderer.renderFrame(rawDt, simMs);
  updateHud();
  if(missionMode)elObjective.textContent=m02ObjectivePresentation(sim).title;
  session?.afterFrame(); updateSessionUi();
  requestAnimationFrame(animate);
}

const benchApi = {
  sim,
  renderer,
  PANORAMA_VIEWS,
  teleportToPanorama,
  teleportPlayer: (x, z, angle, pitch = 0) => sim.teleportPlayer(x, z, angle, pitch),
  setQuality: (q) => {
    if (selQuality) selQuality.value = q;
    return renderer.applyQualityProfile(q);
  },
  setLighting: (l) => {
    if (selLighting) selLighting.value = l;
    return renderer.applyLightingPreset(l);
  },
  interactDoor: (doorId = null) => sim.interactDoor(doorId),
  fireWeapon: () => sim.firePlayerWeapon(true, true),
  throwGrenade: (origin = null, dir = null) => sim.throwGrenade(origin, dir),
  detonateGrenadeAt: (x, y, z, r = 6.5) => sim.detonateGrenadeAt(x, y, z, r),
  issueSquadOrder: (type, axis = null) => sim.issueSquadOrder(type, axis),
  markWoundedSoldierWithChalk: () => sim.markWoundedSoldierWithChalk(),
  startAreaAFullC01: () => sim.startAreaAFullC01(),
  triggerTransitionTAB: (opts = {}) => sim.triggerTransitionTAB(opts),
  enterAreaBC06: (opts = {}) => sim.enterAreaBC06(opts),
  damageCartWheel: () => sim.damageCartWheel(),
  pickupSupplyVolume: (id, carrierId = 'piotr_sokol') => sim.pickupSupplyVolume(id, carrierId),
  deliverSupplyVolume: (id) => sim.deliverSupplyVolume(id),
  loseSupplyVolume: (id) => sim.loseSupplyVolume(id),
  completeC07Reorganization: (opts = {}) => sim.completeC07Reorganization(opts),
  enterAreaCC09: (opts = {}) => sim.enterAreaCC09(opts),
  unlockC09GateLatch: () => sim.unlockC09GateLatch(),
  startC10OrderChanges: () => sim.startC10OrderChanges(),
  detonateC10FixedArtillery: () => sim.detonateC10FixedArtillery(),
  startC11LisAndLastGroup: () => sim.startC11LisAndLastGroup(),
  assistLisInC11: (mode = 'wounded_evacuated') => sim.assistLisInC11(mode),
  completeC12Epilogue: (opts = {}) => sim.completeC12Epilogue(opts),
  exportCampaignResultToM03: () => sim.exportCampaignResultToM03(),
  setAccessibilityOptions: (opts = {}) => sim.setAccessibilityOptions(opts),
  evaluateWeaponClearance: () => sim.audiovisual.evaluateWeaponClearance(sim),
  setTemporalState: (stateId) => {
    const res = sim.horizon.setTemporalState(stateId);
    const preset = renderer.applyLightingPreset(res.lightingPreset);
    if (selLighting) selLighting.value = preset.id;
    return res;
  },
  saveCheckpoint: (id) => sim.saveCheckpoint(id),
  restoreCheckpoint: (id) => sim.restoreCheckpoint(id),
  getTelemetrySummary: () => renderer.getTelemetrySummary(),
  getStateSummary: () => ({
    clock: Number(sim.clock.toFixed(2)),
    activeCellId: sim.activeCellId,
    streaming: sim.zoneStreamer.getStreamingMetrics(),
    c01Active: sim.c01Active,
    activeCartela: sim.activeCartela ? structuredClone(sim.activeCartela) : null,
    transitionTABPayload: sim.transitionTABPayload ? structuredClone(sim.transitionTABPayload) : null,
    supplies: structuredClone(sim.supplies),
    areaB: structuredClone(sim.areaB),
    areaC: structuredClone(sim.areaC),
    m03ExportPackage: sim.m03ExportPackage ? structuredClone(sim.m03ExportPackage) : null,
    horizon: sim.horizon ? sim.horizon.snapshot() : null,
    audiovisual: sim.audiovisual ? sim.audiovisual.snapshot() : null,
    player: {
      x: Number(sim.player.x.toFixed(2)),
      y: Number(sim.player.y.toFixed(2)),
      z: Number(sim.player.z.toFixed(2)),
      angle: Number(sim.player.angle.toFixed(3)),
      pitch: Number(sim.player.pitch.toFixed(3)),
      health: sim.player.health,
    },
    mgState: structuredClone(sim.mgState),
    routeProgress: structuredClone(sim.routeProgress),
    objective: structuredClone(sim.objective),
    flags: structuredClone(sim.flags),
    squadOrder: structuredClone(sim.squadOrder),
    activeDialogue: sim.dialogue.activeLine ? structuredClone(sim.dialogue.activeLine) : null,
    alliesCount: sim.allies.length,
    enemiesCount: sim.enemies.length,
    enemiesActiveCount: sim.enemies.filter((e) => e.alive && !e.nonCombatant).length,
    doorPrompt: sim.currentChalkPrompt() ?? sim.currentDoorPrompt(),
    doors: Object.fromEntries(sim.world.doorStates.entries()),
    windows: Object.fromEntries(sim.world.windowStates.entries()),
    fences: Object.fromEntries(sim.world.fenceStates.entries()),
    lastShot: sim.shotLog[sim.shotLog.length - 1] ?? null,
    telemetry: renderer.getTelemetrySummary(),
  }),
};

if(debugMode) window.m02Bench=benchApi;
window.m02Diagnostics=()=>({state:session?.state??'bench',...benchApi.getStateSummary(),presentation:renderer.presentation.diagnostics,environment:renderer.environment.diagnostics,lighting:renderer.lighting.diagnostics,combatFx:renderer.combatFx.diagnostics,grenades:renderer.grenadeViews.diagnostics});
requestAnimationFrame(animate);
