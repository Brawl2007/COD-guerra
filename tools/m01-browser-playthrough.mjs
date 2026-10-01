// Partida contínua de M01 no navegador, do menu ao debrief, numa única sessão.
// Teclado e cliques são input real do navegador (Playwright). O olhar usa eventos relativos `mousemove`
// (movementX/Y), como os testes de navegador, porque movimentos absolutos em Chromium headless se cancelam.
// O piloto só LÊ o estado por `gameDiagnostics()` (?debug=1, sem mutações) e pelo HUD; não injecta snapshots,
// relógios, eventos nem objectivos. É um piloto automático, não um playtest humano.
//
// Uso: npm run build && npx vite preview --host 127.0.0.1 --port 4173 &
//      CHROME_EXECUTABLE=/caminho/chrome node tools/m01-browser-playthrough.mjs [--out dir] [--skip-cutscenes]
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = opt('--out', 'docs/verification/m01-runtime/continuous');
const URL_BASE = opt('--url', 'http://127.0.0.1:4173/COD-guerra/');
const SKIP_CUTSCENES = args.includes('--skip-cutscenes');
// --adverse: antes da rota normal, sair dos limites e cair no Vístula (cada um restaura CP-A) e ficar parado sem seguir o sargento.
const ADVERSE = args.includes('--adverse');
const { chromium } = createRequire(import.meta.url)('@playwright/test');

await mkdir(OUT, { recursive: true });
const logFile = `${OUT}/log.jsonl`;
await writeFile(logFile, '');
const t0 = Date.now();
const real = () => +((Date.now() - t0) / 1000).toFixed(1);
const report = { adverse: ADVERSE, adverseResults: [], verification: 'Partida contínua de M01 numa única sessão Chromium (piloto automático com input do navegador); não é playtest humano.',
  startedAt: new Date().toISOString(), viewport: [1280, 720], timeline: [], blockers: [], waits: [], pauses: [], deaths: [], subtitles: [], messages: [], shots: 0, screenshots: [] };

const browser = await chromium.launch({
  ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [], failed = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

const state = () => page.evaluate(() => {
  const d = window.gameDiagnostics(), t = id => document.getElementById(id)?.textContent ?? '';
  return { clock: d.clock, paused: d.paused, complete: d.complete, phase: d.missionPhase, player: d.player, eventIds: d.eventIds,
    battle: d.m01.battleClock, weapon: d.m01.weapon, checkpoints: d.m01.checkpoints, flags: d.m01.flags, scene: d.m01.scene, gate: d.m01.gate,
    objectives: d.m01.objectives, enemyAlive: d.m01.enemyAlive, fps: d.fps ?? null, drawCalls: d.drawCalls ?? null,
    hud: { objective: t('objective-text'), interaction: t('interaction'), subtitle: t('subtitle'), message: t('message'), clock: t('battle-clock'), mag: t('mag'), reserve: t('reserve') },
    locked: document.pointerLockElement?.id === 'game', pauseVisible: !document.getElementById('pause').classList.contains('hidden'),
    completeVisible: !document.getElementById('complete').classList.contains('hidden') };
});
const hms = n => new Date(Math.round(n) * 1000).toISOString().slice(11, 19);
async function log(kind, data = {}) {
  const s = await state().catch(() => null);
  const entry = { real: real(), kind, ...(s ? { game: +s.clock.toFixed(1), battle: hms(s.battle), pos: [+s.player.x.toFixed(1), +s.player.z.toFixed(1)], objective: s.hud.objective } : {}), ...data };
  await appendFile(logFile, JSON.stringify(entry) + '\n');
  console.log(JSON.stringify(entry));
  return entry;
}
async function shot(name, note) {
  const path = `${OUT}/${String(report.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path });
  const s = await state();
  report.screenshots.push({ file: path.split('/').pop(), note, real: real(), battle: hms(s.battle), pos: [+s.player.x.toFixed(1), +s.player.z.toFixed(1)], angle: +s.player.angle.toFixed(2), objective: s.hud.objective });
}
const look = (dx, dy = 0) => page.evaluate(([x, y]) => window.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y })), [dx, dy]);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const held = new Set();
async function hold(code, on) { if (on) { await page.keyboard.down(code); held.add(code); } else if (held.has(code)) { await page.keyboard.up(code); held.delete(code); } }
async function releaseAll() { for (const c of [...held]) await hold(c, false); }

// Observação contínua: legendas, mensagens, objectivos, checkpoints, mortes e perdas de controlo.
let last = { objective: '', subtitle: '', message: '', checkpoints: 0, clock: 0 };
async function observe(s) {
  if (s.hud.objective !== last.objective) {
    report.timeline.push({ real: real(), game: +s.clock.toFixed(1), battle: hms(s.battle), objective: s.hud.objective, pos: [+s.player.x.toFixed(1), +s.player.z.toFixed(1)] });
    await log('objective', { text: s.hud.objective });
    last.objective = s.hud.objective;
    await shot(`obj-${report.timeline.length}`, `Ao aparecer: ${s.hud.objective}`);
  }
  if (s.hud.subtitle && s.hud.subtitle !== last.subtitle) { report.subtitles.push({ real: real(), battle: hms(s.battle), text: s.hud.subtitle }); last.subtitle = s.hud.subtitle; }
  if (s.hud.message && s.hud.message !== last.message) { report.messages.push({ real: real(), battle: hms(s.battle), text: s.hud.message }); last.message = s.hud.message; await log('message', { text: s.hud.message }); }
  if (s.checkpoints.length !== last.checkpoints) { last.checkpoints = s.checkpoints.length; await log('checkpoint', { id: s.checkpoints.at(-1) }); }
  if (s.clock + 0.5 < last.clock) { report.deaths.push({ real: real(), battle: hms(s.battle), restoredTo: +s.clock.toFixed(1) }); await log('restored', {}); }
  last.clock = s.clock;
  if ((!s.locked || s.paused) && !s.complete && !s.completeVisible) {
    report.pauses.push({ real: real(), battle: hms(s.battle) });
    await log('control-lost', { pauseVisible: s.pauseVisible });
    await releaseAll();
    if (s.pauseVisible) await page.locator('#resume').click();
    await page.waitForFunction(() => document.pointerLockElement?.id === 'game', null, { timeout: 30000 });
  }
}
async function tick(ms = 120) { await page.waitForTimeout(ms); const s = await state(); await observe(s); return s; }

/** Caminha até (x, z) girando o olhar e mantendo W (+Shift). Regista bloqueios e tenta contorná-los como um jogador. */
async function walk(x, z, { sprint = true, tolerance = 1.2, label = '', limitReal = 240 } = {}) {
  const start = Date.now();
  let lastPos = null, lastMove = Date.now(), recovering = 0;
  const deathsAtStart = report.deaths.length;
  await hold('ShiftLeft', sprint);
  for (;;) {
    const s = await state(); await observe(s);
    const p = s.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < tolerance || s.phase === 'OUTRO' || report.deaths.length !== deathsAtStart) break;   // chegou, outro, ou o jogo restaurou o checkpoint
    const turn = wrap(Math.atan2(dz, dx) - p.angle);
    const pitchFix = Math.abs(p.pitch) > 0.03 ? p.pitch / 0.0022 : 0;
    if (Math.abs(turn) > 0.02 || pitchFix) await look(Math.max(-700, Math.min(700, turn / 0.0022)), Math.max(-300, Math.min(300, pitchFix)));
    await hold('KeyW', Math.abs(turn) < 0.9);
    if (!lastPos || Math.hypot(p.x - lastPos.x, p.z - lastPos.z) > 0.4) { lastPos = { x: p.x, z: p.z }; lastMove = Date.now(); }
    else if (Date.now() - lastMove > 4000 && !s.scene) {
      const b = { real: real(), battle: hms(s.battle), at: [+p.x.toFixed(2), +p.z.toFixed(2)], to: [x, z], label, objective: s.hud.objective };
      report.blockers.push(b); await log('blocked', b); await shot(`blocked-${report.blockers.length}`, `Bloqueado a caminho de ${label || `${x},${z}`}`);
      // Contornar como um jogador: recuar e deslizar para o lado alternado.
      const side = recovering++ % 2 ? 'KeyA' : 'KeyD';
      await hold('KeyW', false); await hold('KeyS', true); await page.waitForTimeout(500); await hold('KeyS', false);
      await hold(side, true); await page.waitForTimeout(900); await hold(side, false);
      lastMove = Date.now();
      if (recovering > 6) throw new Error(`Bloqueio persistente em ${b.at} a caminho de ${label}`);
    }
    if ((Date.now() - start) / 1000 > limitReal) throw new Error(`Tempo esgotado a caminho de ${label || `${x},${z}`}: ${JSON.stringify(p)}`);
    await page.waitForTimeout(80);
  }
  await hold('KeyW', false); await hold('ShiftLeft', false);
}
/** Rota adversa: segue até ao ponto e continua a andar até o jogo restaurar o checkpoint; regista o que o jogador viu. */
async function untilRestored(label, points, { limitReal = 240 } = {}) {
  const r0 = Date.now(), before = report.deaths.length, seen = new Set();
  for (const [x, z] of points) {
    try { await walk(x, z, { label, limitReal: 120 }); } catch (e) { if (report.deaths.length === before) throw e; }
    if (report.deaths.length > before) break;
  }
  await hold('KeyW', true);
  while (report.deaths.length === before) {
    const s = await tick(200); if (s.hud.message) seen.add(s.hud.message);
    if ((Date.now() - r0) / 1000 > limitReal) throw new Error(`${label}: o jogo não restaurou o checkpoint`);
  }
  await releaseAll();
  for (const m of report.messages.filter(m => m.real * 1000 >= r0 - t0)) seen.add(m.text);
  const s = await state();
  const result = { label, real: +((Date.now() - r0) / 1000).toFixed(1), restoredTo: [+s.player.x.toFixed(1), +s.player.z.toFixed(1)], battle: hms(s.battle), checkpoints: s.checkpoints, messages: [...seen] };
  report.adverseResults.push(result); await log('adverse', result); await shot(`adverse-${report.adverseResults.length}`, `${label}: depois de restaurar`);
  return result;
}
async function path(points, label, opts) { for (const [x, z] of points) await walk(x, z, { label, ...opts }); await log('arrived', { label }); }
async function press(code, expectPrompt) {
  const s = await state();
  if (expectPrompt && !s.hud.interaction.includes(expectPrompt)) await log('prompt-missing', { expected: expectPrompt, got: s.hud.interaction });
  await page.keyboard.press(code);
  await tick(200);
}
/** Espera que algo aconteça (ritmo): regista a duração real e de jogo. Opcionalmente dispara para leste. */
async function wait(label, predicate, { limitReal = 900, engageEast = false, faceAngle = null, aimPitch = 0, keepRounds = 0, every = 12, snapEvery = 0, snapLabel = 'view' } = {}) {
  const s0 = await state(), r0 = Date.now(); let lastShot = 0, lastSnap = Date.now(), snapCount = 0;
  for (;;) {
    const s = await tick(250);
    if (predicate(s)) {
      const w = { label, real: +((Date.now() - r0) / 1000).toFixed(1), game: +(s.clock - s0.clock).toFixed(1), battleFrom: hms(s0.battle), battleTo: hms(s.battle) };
      report.waits.push(w); await log('waited', w); return s;
    }
    if (faceAngle !== null) { const turn = wrap(faceAngle - s.player.angle), dp = s.player.pitch - aimPitch; if (Math.abs(turn) > 0.05 || Math.abs(dp) > 0.02) await look(turn / 0.0022, dp / 0.0022); }
    if (snapEvery && Date.now() - lastSnap > snapEvery * 1000) { lastSnap = Date.now(); await shot(`${snapLabel}-${++snapCount}`, `${label}: vista para leste`); }
    if (engageEast && Date.now() - lastShot > every * 1000 && !s.scene && s.weapon.mag + s.weapon.reserve > keepRounds) {
      lastShot = Date.now();
      if (s.weapon.state === 'READY' && s.weapon.mag > 0) {
        await page.mouse.down({ button: 'right' }); await page.waitForTimeout(250);
        await page.mouse.down(); await page.mouse.up(); await page.mouse.up({ button: 'right' }); report.shots++;
      } else if (s.weapon.state === 'READY' && s.weapon.mag === 0 && s.weapon.reserve > 0) await page.keyboard.press('KeyR');
    }
    if ((Date.now() - r0) / 1000 > limitReal) throw new Error(`Espera esgotada: ${label}; ${JSON.stringify({ battle: hms(s.battle), gate: s.gate, objective: s.hud.objective })}`);
  }
}
const active = (s, id) => s.objectives[`obj_m01_${id}`]?.state === 'active';
const done = (s, id) => s.objectives[`obj_m01_${id}`]?.state === 'done';

let outcome = 'incompleto', failure = null;
try {
  await page.goto(`${URL_BASE}?debug=1`);
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.models.length === 9, null, { timeout: 120000 });
  await shot('menu', 'Menu com Tczew seleccionado');
  await page.locator('#start').click();
  await page.waitForFunction(() => document.pointerLockElement?.id === 'game' && !window.gameDiagnostics().paused, null, { timeout: 60000 });
  await log('started');
  await tick(1500); await shot('intro', 'Intro (cartela 04:30)');
  if (SKIP_CUTSCENES) await page.keyboard.press('Space');
  await wait('intro', s => s.checkpoints.includes('cp_m01_a_orientacao'), { limitReal: 400 });

  if (ADVERSE) {
    await untilRestored('limite leste (x > 401)', [[-66, 26], [-15, 26], [-15, 2], [16, 2], [380, 1], [430, 1]]);
    await untilRestored('Vístula (margem a x ≈ 25)', [[-66, 26], [-15, 26], [10, 30], [45, 30]]);
  }
  // 1. Mensagem e café ao posto da ponte ferroviária (RUNBOOK: contornar a trincheira pelo sul, portal ferroviário).
  await path([[-66, 26], [-15, 26], [-15, 2], [16, 2]], 'posto da ponte');
  await press('KeyE', 'entregar mensagem');
  await shot('delivered', 'Entrega ao posto da ponte');
  // 2. Bombardeamento: abrigar-se e seguir o sargento.
  await wait('bombardeamento e abrigo', s => active(s, 'follow_sergeant') || done(s, 'follow_sergeant'), { limitReal: 300 });
  await shot('bombing', 'Depois do bombardeamento das 04:34');
  if (ADVERSE) {
    // Ignorar o objectivo: 2 min parado. O jogo deve continuar a chamar sem falhar nem avançar sozinho.
    const s0 = await state(), r0 = Date.now(), msgs = new Set();
    while (Date.now() - r0 < 120000) { const s = await tick(500); if (s.hud.message) msgs.add(s.hud.message); }
    const s1 = await state();
    const result = { label: 'parado 2 min em "Siga a voz do sargento"', battleFrom: hms(s0.battle), battleTo: hms(s1.battle), objective: s1.hud.objective, messages: [...msgs] };
    report.adverseResults.push(result); await log('adverse', result);
  }
  await path([[-15, 2], [-15, 11], [-147, 11]], 'reorganização (Zieliński)');
  // 3. Sapadores no aterro e material do barracão.
  await path([[-50, 11], [-44, 11]], 'sapadores no aterro');
  await path([[-245, 9], [-274, 9], [-274, 21], [-265, 21]], 'barracão ferroviário (porta oeste)');
  await press('KeyE', 'carregar material');
  await path([[-274, 21], [-274, 8], [-140, 8]], 'aproximação ao segundo corte', { sprint: true });
  await shot('sappers-site2', 'Sapadores no segundo corte (ponto de entrega)');
  await path([[-123, 8]], 'entregar material', { sprint: true });
  await press('KeyE', 'entregar material');
  await shot('repair', 'Reparo da linha a decorrer');
  if (ADVERSE) {
    // Gastar a munição até ao aviso e pedir carregadores a Kowal (munição da secção).
    let s = await state(), r0 = Date.now();
    while (s.weapon.mag + s.weapon.reserve > 10 && Date.now() - r0 < 180000) {
      if (s.weapon.state === 'READY' && s.weapon.mag > 0) { await page.mouse.down(); await page.mouse.up(); report.shots++; }
      else if (s.weapon.state === 'READY' && s.weapon.mag === 0) await page.keyboard.press('KeyR');
      s = await tick(300);
    }
    await tick(500);
    const hint = report.messages.find(m => m.text.startsWith('Pouca munição'));
    await walk(-79.5, 24, { label: 'Kowal (munição)', tolerance: 1.6 });
    const before = (await state()).weapon.reserve;
    await press('KeyE', 'pedir munição a Kowal'); await tick(300);
    await press('KeyE', 'pedir munição a Kowal'); await tick(300);
    const after = await state();
    const result = { label: 'munição da secção (Kowal)', hint: hint?.text ?? null, reserveBefore: before, reserveAfter: after.weapon.reserve, received: after.weapon.received ?? 0 };
    report.adverseResults.push(result); await log('adverse', result); await shot('kowal-ammo', 'Kowal passa carregadores');
  }
  // 4. Proteger o reparo e manter a cabeça de ponte até à ordem de demolição.
  await path([[-115, 27], [-28, 28]], 'posição de cobertura do reparo');
  await page.keyboard.press('KeyC'); await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV');
  await wait('reparo e ordem de demolição', s => active(s, 'hold_access'), { limitReal: 1200, engageEast: true, faceAngle: 0, aimPitch: 0.01, keepRounds: 30, every: 15 });
  await page.keyboard.press('KeyC');
  await path([[-115, 32], [-10, 32], [-10, 40], [30, 40]], 'acesso rodoviário');
  await shot('hold-access', 'Na ponte rodoviária, a manter o acesso');
  await wait('retirada do pelotão leste', s => s.eventIds.includes('evt_m01_east_platoon_withdraws'), { limitReal: 1200, engageEast: true, faceAngle: 0, aimPitch: 0.01, keepRounds: 25, every: 15 });
  await shot('withdrawal', 'Pelotão leste em retirada');
  // 5. Bąk ferido (opcional): procurá-lo pelo aviso de interacção e levá-lo ao socorrista.
  const wounded = await wait('Bąk ferido', s => active(s, 'rescue_bak') || s.eventIds.includes('evt_m01_east_demolition'), { limitReal: 600, engageEast: true, faceAngle: 0, aimPitch: 0.005, every: 5, snapEvery: 12, snapLabel: 'withdrawal' });
  if (active(wounded, 'rescue_bak')) {
    await shot('bak-wounded', 'Bąk ferido na ponte rodoviária');
    let found = false;
    for (const x of [55, 45, 35, 25, 65, 75, 85, 95, 105]) {
      await walk(x, 40, { label: 'procurar Bąk', tolerance: 1.5 });
      const s = await state();
      if (s.hud.interaction.includes('levar Bąk')) { found = true; break; }
    }
    if (!found) await log('bak-not-found');
    else {
      await shot('bak-found', 'Junto de Bąk: aviso "levar Bąk"');
      await press('KeyE', 'levar Bąk');
      await path([[30, 40]], 'socorrista com Bąk');
      await shot('bak-carry-deck', 'Bąk ao ombro, no tabuleiro');
      await path([[12, 40], [-10, 40], [-10, 46]], 'socorrista com Bąk');
      await shot('bak-carry', 'A levar Bąk ao socorrista');
      await press('KeyE', 'entregar Bąk');
      await shot('bak-delivered', 'Bąk entregue ao socorrista');
    }
  }
  // 6. Demolição leste e saída da ponte. Esperar no eixo do portal rodoviário, com vista livre para leste.
  if (!(await state()).eventIds.includes('evt_m01_east_demolition')) await path([[-10, 46], [-5, 40]], 'eixo do portal rodoviário');
  await wait('demolição leste', s => s.eventIds.includes('evt_m01_east_demolition'), { limitReal: 900, faceAngle: 0 });
  await page.waitForTimeout(700); await shot('east-demolition', 'Demolição leste das 06:10: clarão');
  await page.waitForTimeout(6000); await shot('east-demolition-6s', 'Demolição leste, coluna de poeira 6 s depois');
  await path([[-15, 40], [-115, 27], [-275, 27], [-292, 26]], 'posto de disparo');
  await shot('firing-point', 'No posto de disparo; corredor');
  // Olhar para o corredor para ver os retardatários passarem.
  await wait('demolição oeste', s => s.eventIds.includes('evt_m01_west_demolition'), { limitReal: 1200, faceAngle: 0.08, snapEvery: 20, snapLabel: 'corridor' });
  await shot('west-demolition', 'Demolição oeste das 06:45');
  { const s = await state(); const turn = wrap(0.15 - s.player.angle); await look(turn / 0.0022, (s.player.pitch + 0.12) / 0.0022); }
  await page.waitForTimeout(6000); await shot('west-demolition-6s', 'Demolição oeste, coluna de poeira 6 s depois, acima do barracão');
  await path([[-292, 68], [-262, 70]], 'abrigo');
  await wait('chamada', s => s.scene === 'cs_m01_roll_call', { limitReal: 120 });
  await shot('roll-call', 'Chamada no abrigo (outro)');
  await page.waitForTimeout(10000); await shot('roll-call-10s', 'Chamada: secção sentada no abrigo');
  if (SKIP_CUTSCENES) await page.keyboard.press('Space');
  await wait('outro até ao debrief', s => s.complete && s.completeVisible, { limitReal: 300 });
  await shot('debrief', 'Debrief');
  outcome = 'debrief';
} catch (error) {
  failure = error.message; await log('failure', { error: error.message });
  try { await shot('failure', error.message.slice(0, 120)); } catch { /* página fechada */ }
} finally {
  const s = await state().catch(() => null);
  Object.assign(report, { finishedAt: new Date().toISOString(), realSeconds: real(), outcome, failure, pageErrors, failedRequests: failed,
    final: s && { game: +s.clock.toFixed(1), battle: hms(s.battle), complete: s.complete, flags: s.flags, checkpoints: s.checkpoints, objectives: s.objectives,
      health: s.player.health, weapon: s.weapon, enemyAlive: s.enemyAlive, events: s.eventIds.length },
    debrief: s?.completeVisible ? await page.locator('#debrief').innerText() : null });
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 1) + '\n');
  await browser.close();
  console.log(`\n${outcome}${failure ? ': ' + failure : ''} em ${real()} s reais`);
  if (outcome !== 'debrief') process.exitCode = 1;
}
