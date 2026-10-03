#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { BattleWorld, counts, materialize, representation } from './battle-sector-model.mjs';

/** Fictional architecture fixture. Not a historical M01 reconstruction or proposed mission patch. */
export function fixture(seed = 19390901, { sectorCount = 2, nominalStrength = 30, duration = 600 } = {}) {
  if (!Number.isSafeInteger(sectorCount) || sectorCount < 1 || sectorCount > 1000 ||
    !Number.isSafeInteger(nominalStrength) || nominalStrength < 10 || nominalStrength > 1000000 ||
    !Number.isSafeInteger(duration) || duration < 0 || duration > 86400) throw new Error('fixture arguments');
  const sectors = [], events = [];
  for (let i = 0; i < sectorCount; i++) {
    const id = `fixture_sector_${String(i).padStart(3, '0')}`, fid = `fixture_formation_${i}`, x = i * 500;
    sectors.push({ id, missionId: 'M01-ARCHITECTURE-FIXTURE-ONLY',
      provenance: { classification: 'FICTIONAL_WITHIN_HISTORICAL_CONSTRAINTS', date: '1939-09-01', startTime: '00:00:00',
        claims: [{ field: '*', classification: 'FICTIONAL_WITHIN_HISTORICAL_CONSTRAINTS', sources: [], note: 'Synthetic test data, not real unit/location/casualty counts.' }] },
      center: { x, y: 0, z: 0 }, bounds: { minX: x - 50, maxX: x + 50, minZ: -50, maxZ: 50 },
      objective: 'hold_until_withdrawal', state: 'holding',
      constraints: { policy: i === 0 ? 'HISTORICAL_BOUNDED' : 'DYNAMIC_LOCAL',
        formations: { [fid]: { minCombatReady: Math.max(2, nominalStrength - 15), maxDead: 8 } } },
      formations: [{ id: fid, faction: i % 2 ? 'DE' : 'PL', unit: 'fictional_fixture_unit', role: 'platoon',
        nominalStrength, initial: { combatReady: nominalStrength - 9, wounded: 4, dead: 5 },
        namedIds: { 0: `fixture_named_${i}` }, position: { x, y: 0, z: 0 }, direction: Math.PI,
        objective: 'hold_until_withdrawal', state: 'holding', speedMps: .5, morale: .8, cohesion: .9, ammunition: 100, supply: .8 }],
      assets: {
        fixedWeapons: [{ id: `${id}_mg`, state: 'active', position: { x: x + 5, y: 0, z: 10 } }],
        vehicles: [{ id: `${id}_vehicle`, state: 'intact', position: { x: x + 15, y: 0, z: 15 } }],
        destruction: [{ id: `${id}_building`, state: 'intact', position: { x: x - 10, y: 0, z: 20 }, origin: { x: x + 100, y: 0, z: 300 } }],
        fires: [{ id: `${id}_fire`, state: 'inactive', position: { x: x - 10, y: 0, z: 20 } }],
        smoke: [{ id: `${id}_smoke`, state: 'inactive', position: { x: x - 10, y: 0, z: 20 } }] } });
    for (let second = 10; second <= duration; second += 10) events.push({ id: `${id}:exposure:${String(second).padStart(5, '0')}`,
      at: second * 1000, sectorId: id, formationId: fid, type: 'exposure', ratePerSecond: .08,
      durationMs: 10000, cover: .4, suppression: .2, firepower: .9, fatalFraction: .3 });
    events.push({ id: `${id}:withdrawal`, at: 220000, sectorId: id, formationId: fid,
      type: 'order', state: 'withdrawing', direction: Math.PI, objective: 'withdraw' });
    for (const [category, suffix, state] of [['destruction', 'building', 'damaged'], ['fires', 'fire', 'burning'], ['smoke', 'smoke', 'active']]) {
      events.push({ id: `${id}:impact:${category}`, at: 252000, sectorId: id, type: 'asset', category, assetId: `${id}_${suffix}`, state });
    }
  }
  return { seed, sectors, events };
}
export function summary(world) {
  return { time: world.time, sectors: world.sectors.map(s => ({ id: s.id, state: s.state, objective: s.objective,
    rng: s.rng, revision: s.revision, assets: s.assets,
    formations: s.formations.map(f => ({ id: f.id, state: f.state, position: f.position, counts: counts(f), ammunition: f.ammunition })) })),
    events: world.journal };
}
export function timeline(world) {
  return world.journal.map(e => ({ time: e.at / 1000, sector: e.sectorId, formation: e.formationId ?? '',
    event: e.id, type: e.type, result: e.result }));
}
export function benchmark({ sectorCount = 100, duration = 600, repeats = 5 } = {}) {
  const config = fixture(19390901, { sectorCount, nominalStrength: 200, duration });
  // Warm-up then independent runs. Configuration creation excluded; model construction included.
  new BattleWorld(config).advanceTo(duration * 1000);
  const milliseconds = [];
  for (let i = 0; i < repeats; i++) {
    const start = performance.now(), world = new BattleWorld(config); world.advanceTo(duration * 1000);
    milliseconds.push(performance.now() - start);
  }
  return { environment: { node: process.version, platform: process.platform, arch: process.arch },
    workload: { sectorCount, nominalStrengthPerSector: 200, representedPopulation: sectorCount * 200,
      durationSeconds: duration, scheduledEvents: config.events.length, repeats }, milliseconds,
    medianMs: [...milliseconds].sort((a, b) => a - b)[Math.floor(repeats / 2)],
    scope: 'Node prototype aggregate processing only; no browser, rendering, full AI, FPS or Chromebook measurement.' };
}
function parse(argv) {
  const opts = { seed: 19390901, duration: 600, format: 'text', sectors: 2, quality: 'HIGH', visible: true };
  const names = { '--seed': 'seed', '--duration': 'duration', '--format': 'format', '--out': 'out', '--sectors': 'sectors', '--quality': 'quality' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--benchmark') { opts.benchmark = true; continue; }
    if (arg === '--hidden') { opts.visible = false; continue; }
    if (arg === '--help') { opts.help = true; continue; }
    if (!names[arg] || argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw new Error(`invalid argument ${arg}`);
    opts[names[arg]] = argv[++i];
  }
  for (const k of ['seed', 'duration', 'sectors']) opts[k] = Number(opts[k]);
  if (!Number.isInteger(opts.seed) || opts.seed < 0 || opts.seed > 0xffffffff || !['text', 'json', 'csv'].includes(opts.format) || !['LOW', 'MEDIUM', 'HIGH'].includes(opts.quality)) throw new Error('invalid options');
  return opts;
}
function csv(world) {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  // Replaying the input log gives state at event time, not the final state repeated on every row.
  const replay = new BattleWorld(world.config), rows = ['time,sector,formation,state,x,y,z,combatReady,wounded,dead,evacuated,event,result'];
  for (const e of world.journal) {
    replay.advanceTo(e.at);
    const s = replay.sector(e.sectorId), f = s.formations.find(f => f.id === e.formationId) ?? s.formations[0], c = counts(f);
    rows.push([e.at / 1000, s.id, f.id, f.state, f.position.x, f.position.y, f.position.z,
      c.combatReady, c.wounded, c.dead, c.evacuated, e.id, JSON.stringify(e.result)].map(quote).join(','));
  }
  return rows.join('\n') + '\n';
}
export function main(argv = process.argv.slice(2)) {
  const opts = parse(argv);
  if (opts.help) { console.log('Synthetic isolated fixture: --seed N --duration seconds --sectors N --format text|json|csv --out file --quality LOW|MEDIUM|HIGH --hidden --benchmark'); return; }
  const world = new BattleWorld(fixture(opts.seed, { sectorCount: opts.sectors, duration: opts.duration }));
  world.advanceTo(opts.duration * 1000);
  const view = representation({ distanceM: 120, visible: opts.visible, quality: opts.quality });
  materialize(world, world.sectors[0].id, { budget: view.descriptorBudget }); // Pure, deliberately omitted from logical output.
  let output;
  if (opts.benchmark) output = JSON.stringify(benchmark({ sectorCount: opts.sectors, duration: opts.duration }), null, 2) + '\n';
  else if (opts.format === 'json') output = JSON.stringify(summary(world), null, 2) + '\n';
  else if (opts.format === 'csv') output = csv(world);
  else output = 'FICTIONAL ARCHITECTURE FIXTURE — not historical M01 data\n' + world.journal.map(e =>
    `${String(Math.floor(e.at / 60000)).padStart(2, '0')}:${String(e.at / 1000 % 60).padStart(2, '0')} ${e.sectorId} ${e.type} ${JSON.stringify(e.result)}`).join('\n') + '\n';
  if (opts.out) writeFileSync(opts.out, output); else process.stdout.write(output);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
