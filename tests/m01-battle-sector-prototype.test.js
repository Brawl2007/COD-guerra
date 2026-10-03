import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { BattleWorld, counts, materialize, dematerialize, representation } from '../tools/verification/battle-sector-model.mjs';
import { fixture, summary } from '../tools/verification/m01-battle-sectors-prototype.mjs';
const sectorId = 'fixture_sector_000', formationId = 'fixture_formation_0';
const world = (seed = 19390901) => new BattleWorld(fixture(seed));
const form = w => w.sector(sectorId).formations[0];
const noExposures = (policy = 'HISTORICAL_BOUNDED') => {
  const c = fixture(); c.events = c.events.filter(e => e.type !== 'exposure'); c.sectors[0].constraints.policy = policy; return new BattleWorld(c);
};
const input = (w, id, type, extra, at = w.time) => w.enqueue({ id, at, type, sectorId, formationId, ...extra });
const advance = (w, time) => { w.advanceTo(time); return w; };
const serialized = w => JSON.stringify(w.snapshot());

// Acceptance scenarios, including byte-comparison of complete state and RNG.
test('same seed/input/clock produces identical state, casualties, motion, events, destruction and RNG', () => {
  const a = advance(world(), 600000), b = advance(world(), 600000);
  assert.equal(serialized(a), serialized(b)); assert(a.journal.some(e => e.result.applied));
  assert(form(a).position.x < 0); assert.equal(form(a).objective, 'withdraw');
  assert.equal(a.sector(sectorId).assets.fires[0].state, 'burning');
});
test('different seeds affect emergent journal/RNG without changing authored macro outcome', () => {
  const a = advance(world(1), 600000), b = advance(world(2), 600000);
  assert.notEqual(serialized(a), serialized(b)); assert.equal(a.sector(sectorId).state, 'withdrawing'); assert.equal(b.sector(sectorId).state, 'withdrawing');
});
test('frame/tick partitions do not change state or RNG', () => {
  const a = advance(world(), 600000), b = world();
  for (let t = 137; t < 600000; t += 137) b.advanceTo(t);
  b.advanceTo(600000); assert.equal(serialized(a), serialized(b));
});
test('pause freezes time, movement, RNG and scheduled events', () => {
  const w = advance(world(), 230000), before = serialized(w); w.advanceTo(600000, { paused: true });
  assert.equal(serialized(w), before); w.advanceTo(600000); assert.equal(serialized(w), serialized(advance(world(), 600000)));
});
test('all LOW/MEDIUM/HIGH, visible/hidden, FULL/GROUP/PROXY/STATE_ONLY produce identical logical snapshots', () => {
  const reference = serialized(advance(world(), 600000));
  for (const quality of ['LOW', 'MEDIUM', 'HIGH']) for (const visible of [true, false]) {
    const w = world();
    for (const distanceM of [1000, 600, 300, 120]) {
      w.advanceTo(w.time + 150000);
      const r = representation({ distanceM, quality, visible }); materialize(w, sectorId, { budget: r.descriptorBudget });
    }
    assert.equal(serialized(w), reference);
  }
});
test('1000→600→300→120 m yields FAR→MID→MID→NEAR with no extra RNG/reset/duplicate formation or casualty', () => {
  const w = world(); let previousBand;
  const bands = [1000, 600, 300, 120].map((distanceM, i) => {
    w.advanceTo((i + 1) * 150000);
    const before = serialized(w), r = representation({ distanceM, visible: true, previousBand });
    previousBand = r.band; materialize(w, sectorId, { budget: 30 }); assert.equal(serialized(w), before); return r.band;
  });
  assert.deepEqual(bands, ['FAR', 'MID', 'MID', 'NEAR']); assert.equal(serialized(w), serialized(advance(world(), 600000)));
  assert.equal(new Set(w.consumed).size, w.consumed.length); assert.equal(w.sectors.length, 2);
});
test('hysteresis prevents border thrashing without affecting simulation', () => {
  assert.equal(representation({ distanceM: 160, visible: true, previousBand: 'NEAR' }).band, 'NEAR');
  assert.equal(representation({ distanceM: 145, visible: true, previousBand: 'MID' }).band, 'MID');
  assert.equal(representation({ distanceM: 810, visible: false, previousBand: 'MID' }).mode, 'STATE_ONLY');
});
test('hidden battles advance and materialize the latest casualties, fire and withdrawal', () => {
  const w = advance(world(), 600000), d = materialize(w, sectorId, { budget: 30 });
  assert.deepEqual(d.formations[0].counts, counts(form(w))); assert.equal(d.state, 'withdrawing');
  assert.equal(d.assets.destruction[0].state, 'damaged'); assert(d.formations[0].casualtyRuns.length);
});
test('bounded outcomes conserve population over many seeds', () => {
  for (let seed = 0; seed < 50; seed++) {
    const w = advance(world(seed), 600000);
    for (const s of w.sectors) for (const f of s.formations) {
      const c = counts(f), b = s.constraints.formations[f.id];
      assert.equal(Object.values(c).reduce((a, b) => a + b), f.nominalStrength);
      assert(c.dead <= b.maxDead); assert(c.combatReady >= b.minCombatReady);
    }
  }
});
test('bounded loss clamps before damage; no resurrection or correcting casualties', () => {
  const w = noExposures();
  for (let i = 0; i < 10; i++) input(w, `kill_${i}`, 'loss', { ordinal: i, to: 'dead' }, i * 1000);
  w.advanceTo(10000); assert.equal(counts(form(w)).dead, 8);
  assert.equal(w.journal.filter(e => e.type === 'loss' && e.result.applied).length, 3);
  assert(w.journal.some(e => e.result.reason === 'maxDead'));
});
test('known named and generated IDs never resurrect on rematerialization', () => {
  const w = noExposures(), first = materialize(w, sectorId, { budget: 30 });
  input(w, 'known_death', 'loss', { memberId: first.actors[0].id, to: 'dead' }); w.advanceTo(0);
  const second = materialize(w, sectorId, { budget: 30 });
  const dead = second.actors.find(a => a.id === first.actors[0].id); assert.equal(dead.status, 'dead');
  assert.equal(new Set(second.actors.map(a => a.id)).size, 30); assert.equal(counts(form(w)).dead, 6);
});
test('large reserve remains compressed with sparse casualty records; budgets preserve all logical counts', () => {
  const w = new BattleWorld(fixture(5, { sectorCount: 10, nominalStrength: 2000, duration: 600 }));
  w.advanceTo(600000); const d = materialize(w, sectorId, { budget: 4 });
  assert.equal(d.actors.length, 4); assert.equal(d.formations[0].nominalStrength, 2000);
  assert(Object.keys(form(w).individuals).length <= 6); assert(form(w).runs.length < 50);
});
test('return preserves deaths, wounded, individual rounds/position, formation position/reserve and assets', () => {
  const w = noExposures(), d = materialize(w, sectorId, { budget: 30 });
  const a = d.actors.find(a => a.status === 'combatReady'); a.status = 'dead'; a.position = { x: 42, y: 1, z: -3 }; a.rounds = 0;
  const wounded = d.actors.find(a => a.status === 'wounded'); wounded.rounds = 2;
  dematerialize(w, d, { id: 'return_1', formationId, members: [a, wounded], formationPosition: { x: 20, y: 0, z: 10 }, reserveAmmunition: 80 });
  const fresh = materialize(w, sectorId, { budget: 30 });
  assert.equal(fresh.actors.find(b => b.id === a.id).status, 'dead');
  assert.deepEqual(fresh.actors.find(b => b.id === a.id).position, a.position);
  assert.equal(fresh.actors.find(b => b.id === wounded.id).rounds, 2);
  assert.deepEqual(form(w).position, { x: 20, y: 0, z: 10 }); assert.equal(form(w).ammunition, 80);
  assert.deepEqual(fresh.assets, d.assets);
});
test('dead resurrection rejects the entire handoff, including earlier valid member/resource edits', () => {
  const w = noExposures(), d = materialize(w, sectorId, { budget: 30 }), before = serialized(w);
  const ready = d.actors.find(a => a.status === 'combatReady'), dead = d.actors.find(a => a.status === 'dead');
  ready.status = 'wounded'; dead.status = 'combatReady';
  assert.throws(() => dematerialize(w, d, { id: 'bad_return', formationId, members: [ready, dead], reserveAmmunition: 1 }), /resurrection/);
  assert.equal(serialized(w), before);
});
test('duplicate/unknown IDs and stale revision cannot replace a formation', () => {
  const w = noExposures(), d = materialize(w, sectorId, { budget: 30 }), a = d.actors[0];
  assert.throws(() => dematerialize(w, d, { id: 'duplicate_members', formationId, members: [a, a] }), /handoff payload/);
  assert.throws(() => dematerialize(w, d, { id: 'unknown_member', formationId, members: [{ ...a, id: 'unknown' }] }), /unknown member/);
  input(w, 'resupply_1', 'resupply', { amount: 5 }); w.advanceTo(0);
  const before = serialized(w);
  assert.throws(() => dematerialize(w, d, { id: 'stale', formationId, members: [a] }), /stale handoff/); assert.equal(serialized(w), before);
});
test('duplicate event/return cannot add a second death', () => {
  const w = noExposures(), d = materialize(w, sectorId), a = { ...d.actors[0], status: 'dead' };
  dematerialize(w, d, { id: 'return_unique', formationId, members: [a] });
  const before = serialized(w), fresh = materialize(w, sectorId);
  assert.throws(() => dematerialize(w, fresh, { id: 'return_unique', formationId, members: [a] }), /duplicate event/);
  assert.equal(serialized(w), before); w.advanceTo(0); assert.equal(serialized(w), before);
});
test('four rescued wounded persist as evacuated and cannot turn fixed retreat into victory', () => {
  for (const policy of ['HISTORICAL_FIXED', 'HISTORICAL_BOUNDED']) {
    const w = noExposures(policy);
    input(w, 'rescue_four', 'rescue', { amount: 4 }); input(w, 'win_attempt', 'intervention', { state: 'advancing' });
    w.advanceTo(300000); assert.equal(counts(form(w)).evacuated, 4); assert.equal(counts(form(w)).dead, 5);
    assert.equal(w.sector(sectorId).state, 'withdrawing'); assert.equal(w.journal.find(e => e.id === 'win_attempt').result.reason, 'historical-macro-locked');
  }
});
test('dynamic local player order can change state; resupply changes reserves', () => {
  const w = noExposures('DYNAMIC_LOCAL'); input(w, 'local_order', 'intervention', { state: 'advancing', direction: 0 });
  input(w, 'delivery', 'resupply', { amount: 30 }); w.advanceTo(1000);
  assert.equal(w.sector(sectorId).state, 'advancing'); assert.equal(form(w).position.x, .5); assert.equal(form(w).ammunition, 130);
});
test('destroying MG suppresses associated future exposures without camera or new RNG', () => {
  const c = fixture(1, { sectorCount: 1 }); c.events = c.events.filter(e => e.type === 'exposure');
  const a = new BattleWorld(c), b = new BattleWorld(c);
  input(b, 'destroy_mg', 'asset', { category: 'fixedWeapons', assetId: `${sectorId}_mg`, state: 'destroyed' });
  a.advanceTo(600000); b.advanceTo(600000);
  assert(counts(form(a)).combatReady < counts(form(b)).combatReady);
  assert.equal(b.sector(sectorId).rng, (new BattleWorld(c)).sector(sectorId).rng);
  assert.equal(b.sector(sectorId).assets.fixedWeapons[0].state, 'destroyed');
});
test('vehicle destruction/crater contract persists across repeated views and replay', () => {
  const w = noExposures(); input(w, 'destroy_vehicle', 'asset', { category: 'vehicles', assetId: `${sectorId}_vehicle`, state: 'destroyed' });
  w.advanceTo(300000); const d = materialize(w, sectorId);
  assert.equal(d.assets.vehicles[0].state, 'destroyed'); assert.equal(d.assets.fires[0].state, 'burning');
  assert.equal(serialized(BattleWorld.restore(w.snapshot())), serialized(w));
  input(w, 'revive_vehicle', 'asset', { category: 'vehicles', assetId: `${sectorId}_vehicle`, state: 'intact' });
  const before = serialized(w); assert.throws(() => w.advanceTo(300000), /asset resurrection/); assert.equal(serialized(w), before);
});
test('replay checkpoint validates full state and resumes without duplicate events/RNG', () => {
  const w = advance(world(), 123456), restored = BattleWorld.restore(w.snapshot());
  restored.advanceTo(600000); w.advanceTo(600000); assert.equal(serialized(restored), serialized(w));
  const bad = w.snapshot(); bad.sectors[0].rng ^= 1; assert.throws(() => BattleWorld.restore(bad), /snapshot differs/);
});
test('input order at same timestamp is stable by ID; adjacent timestamp inputs deterministic', () => {
  const config = fixture(); config.events = [];
  const e = [{ id: 'b', at: 0, type: 'loss', sectorId, formationId, ordinal: 0, to: 'dead' },
    { id: 'a', at: 0, type: 'resupply', sectorId, formationId, amount: 7 }];
  const a = new BattleWorld({ ...config, events: e }), b = new BattleWorld({ ...config, events: [...e].reverse() });
  a.advanceTo(1000); b.advanceTo(1000); assert.deepEqual(summary(a), summary(b)); assert.deepEqual(a.consumed, ['a', 'b']);
});
test('other sector events and input sector ordering do not change RNG or outcome of this sector', () => {
  const config = fixture(), reverse = structuredClone(config); reverse.sectors.reverse();
  reverse.events.push({ id: 'unrelated', at: 1000, type: 'exposure', sectorId: 'fixture_sector_001', formationId: 'fixture_formation_1',
    ratePerSecond: 100, durationMs: 10000, cover: 0, suppression: 0, firepower: 1, fatalFraction: 1 });
  const a = advance(new BattleWorld(config), 600000), b = advance(new BattleWorld(reverse), 600000);
  assert.deepEqual(a.sector(sectorId), b.sector(sectorId));
});
test('full cover/no incoming fire never makes casualties; ammo-zero target remains vulnerable', () => {
  for (const key of ['cover', 'suppression', 'firepower']) {
    const c = fixture(); c.events = c.events.filter(e => e.type === 'exposure').map(e => ({ ...e, [key]: key === 'firepower' ? 0 : 1 }));
    const w = advance(new BattleWorld(c), 600000); assert.equal(counts(form(w)).combatReady, 21);
  }
  const c = fixture(); c.sectors[0].formations[0].ammunition = 0; c.events = c.events.map(e => e.type === 'exposure' ? { ...e, ratePerSecond: 100, cover: 0, suppression: 0, fatalFraction: 0 } : e);
  assert(counts(form(advance(new BattleWorld(c), 600000))).combatReady < 21);
});
test('invalid config/time/payload rejected and snapshots are defensive copies', () => {
  const c = fixture(); c.sectors[0].formations[0].initial.dead = 99; assert.throws(() => new BattleWorld(c), /strength conservation/);
  const w = world(); assert.throws(() => w.advanceTo(NaN), /clock/); w.advanceTo(1000); assert.throws(() => w.advanceTo(0), /clock/);
  assert.throws(() => input(w, 'past', 'resupply', { amount: 1 }, 0), /time/);
  assert.throws(() => input(w, 'nan', 'resupply', { amount: NaN }), /amount/);
  const s = w.snapshot(); s.sectors[0].rng = 0; assert.notEqual(w.sectors[0].rng, 0);
});
test('CLI repeat bytes and graphic/camera parameters are identical (JSON/text/CSV)', () => {
  const cli = 'tools/verification/m01-battle-sectors-prototype.mjs';
  for (const format of ['json', 'text', 'csv']) {
    const run = args => spawnSync(process.execPath, [cli, '--seed', '19390901', '--duration', '600', '--format', format, ...args], { encoding: 'utf8' });
    const a = run([]), b = run([]), low = run(['--quality', 'LOW', '--hidden']);
    assert.equal(a.status, 0, a.stderr); assert.equal(b.status, 0, b.stderr); assert.equal(low.status, 0, low.stderr);
    assert.equal(a.stdout, b.stdout); assert.equal(a.stdout, low.stdout); assert(a.stdout.length > 100);
  }
  const invalid = spawnSync(process.execPath, [cli, '--duration', '-1'], { encoding: 'utf8' }); assert.equal(invalid.status, 1);
});

test('individual return and later dynamic inputs replay identically and continue motion', () => {
  const w = noExposures(), d = materialize(w, sectorId), member = { ...d.actors[0], status: 'wounded', rounds: 1 };
  dematerialize(w, d, { id: 'return', formationId, members: [member], formationPosition: { x: -12, y: 0, z: 8 }, reserveAmmunition: 20 });
  w.advanceTo(300000);
  const restored = BattleWorld.restore(w.snapshot()); assert.equal(serialized(restored), serialized(w));
  assert.deepEqual(materialize(restored, sectorId), materialize(w, sectorId));
  w.advanceTo(600000); restored.advanceTo(600000); assert.equal(serialized(restored), serialized(w));
});
test('late same-time input cannot reorder already consumed history or break replay', () => {
  const w = noExposures(); input(w, 'z_first', 'resupply', { amount: 1 }); w.advanceTo(0);
  const before = serialized(w); assert.throws(() => input(w, 'a_late', 'resupply', { amount: 2 }), /reorder consumed/);
  assert.equal(serialized(w), before); assert.equal(serialized(BattleWorld.restore(w.snapshot())), before);
});
test('no-change return repeated at later boundaries retains unique roster and casualty totals', () => {
  const w = noExposures();
  for (let i = 0; i < 10; i++) {
    w.advanceTo((i + 1) * 1000); const d = materialize(w, sectorId, { budget: 30 });
    dematerialize(w, d, { id: `return_${i}`, formationId, members: d.actors });
    assert.equal(counts(form(w)).dead, 5); assert.equal(counts(form(w)).wounded, 4);
    assert.equal(new Set(materialize(w, sectorId, { budget: 30 }).actors.map(a => a.id)).size, 30);
  }
  assert.equal(serialized(BattleWorld.restore(w.snapshot())), serialized(w));
});
test('fixed loss without RNG is an authored casualty event; exhausted bounds reject handoff atomically', () => {
  const w = noExposures('HISTORICAL_FIXED'), rng = w.sector(sectorId).rng;
  input(w, 'authored_loss', 'loss', { ordinal: 0, to: 'dead' }); w.advanceTo(0);
  assert.equal(counts(form(w)).dead, 6); assert.equal(w.sector(sectorId).rng, rng);
  const d = materialize(w, sectorId, { budget: 30 }), members = d.actors.filter(a => a.status === 'combatReady').slice(0, 3).map(a => ({ ...a, status: 'dead' }));
  const before = serialized(w);
  assert.throws(() => dematerialize(w, d, { id: 'bounded_conflict', formationId, members }), /bounded handoff conflict/);
  assert.equal(serialized(w), before);
});

test('casualty position remains at impact while formation withdraws; known combatant follows its formation', () => {
  const w = noExposures(); input(w, 'kill_before_withdraw', 'loss', { ordinal: 0, to: 'dead' }, 210000);
  w.advanceTo(230000); const d = materialize(w, sectorId, { budget: 30 });
  const dead = d.actors.find(a => a.id === 'fixture_named_0'), ready = d.actors.find(a => a.status === 'combatReady');
  const originalDead = d.actors.find(a => a.ordinal === 25);
  dematerialize(w, d, { id: 'return_known', formationId, members: [ready] });
  w.advanceTo(240000); const later = materialize(w, sectorId, { budget: 30 });
  assert.deepEqual(later.actors.find(a => a.id === dead.id).position, dead.position);
  assert.deepEqual(later.actors.find(a => a.id === originalDead.id).position, originalDead.position);
  assert.equal(later.actors.find(a => a.id === ready.id).position.x, ready.position.x - 5);
});
test('time-only motion makes old descriptors stale even without a sector event', () => {
  const w = noExposures(); w.advanceTo(230000); const d = materialize(w, sectorId);
  w.advanceTo(230001); const before = serialized(w);
  assert.throws(() => dematerialize(w, d, { id: 'old_motion', formationId, members: [d.actors[0]] }), /stale handoff time/);
  assert.equal(serialized(w), before);
});

test('handoff cannot invent loaded rounds; clip reload requires reserve transfer', () => {
  const w = noExposures(), d = materialize(w, sectorId), member = { ...d.actors[0], rounds: 10 }, before = serialized(w);
  assert.throws(() => dematerialize(w, d, { id: 'free_ammo', formationId, members: [member] }), /requires reserve transfer/);
  assert.equal(serialized(w), before);
  dematerialize(w, d, { id: 'reload_from_stock', formationId, members: [member], reserveAmmunition: 95 });
  assert.equal(form(w).ammunition, 95); assert.equal(materialize(w, sectorId).actors[0].rounds, 10);
});
