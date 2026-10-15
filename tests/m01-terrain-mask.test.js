import test from 'node:test';
import assert from 'node:assert/strict';
import { TczewWorld } from '../src/world/tczew-world.js';
import { M01_TRACK_CENTRES } from '../src/render/m01-bridge-structure.js';
import { TERRAIN_EXTENT, MASK_SIZES, MASK_ENCODING, TRACK_SPECS, BALLAST_SHOULDER, bakeTerrainMask, terrainMaskSources, sampleMask, macroField } from '../src/render/m01-terrain-mask.js';

// The macro mask is baked from the layout (read-only) and decides where the terrain shows worn track, ballast and the wet river band.
const world = new TczewWorld();
const sources = terrainMaskSources(world.features, M01_TRACK_CENTRES);
const SMALL = { width: 512, height: 160 };   // 3.9 m texels: enough for wide features, fast
const mask = bakeTerrainMask(sources, SMALL);
const at = (x, z) => sampleMask(mask, SMALL.width, SMALL.height, x, z);
const sha = (b) => Buffer.from(b).toString('base64');

test('extent equals the terrain mesh of M01View (PlaneGeometry 2000x650 translated by 300,0,40)', () => {
  assert.deepEqual({ ...TERRAIN_EXTENT }, { x0: 300 - 1000, x1: 300 + 1000, z0: 40 - 325, z1: 40 + 325 });
  for (const tier of ['high', 'medium', 'low']) { const s = MASK_SIZES[tier]; assert.ok(s.width / s.height === 3.2, `${tier} keeps the texel square`); }
});
test('sources come from the layout: roads, rails with the bridge-structure track centres, river polygon', () => {
  assert.deepEqual(sources.tracks.map((t) => t.id), TRACK_SPECS.map((t) => t.id));
  assert.deepEqual(sources.rails.map((r) => [r.id, r.halfWidth]), [['rail_embankment_west', 2 + BALLAST_SHOULDER], ['rail_line_southwest', 0 + BALLAST_SHOULDER], ['rail_line_east', 2.5 + BALLAST_SHOULDER]]);
  assert.deepEqual(sources.channel, world.features.get('vistula_channel').polygon);
  assert.equal(sources.meadow.length, 2);
});
test('bake is pure: same input -> same bytes; the world is not modified', () => {
  const before = JSON.stringify([...world.features.entries()]);
  const again = bakeTerrainMask(terrainMaskSources(world.features, M01_TRACK_CENTRES), SMALL);
  assert.equal(sha(again), sha(mask));
  assert.equal(JSON.stringify([...world.features.entries()]), before);
  assert.equal(mask.length, SMALL.width * SMALL.height * 4);
  assert.notEqual(sha(bakeTerrainMask({ ...sources, tracks: [] }, SMALL)), sha(mask), 'input matters');
  assert.throws(() => bakeTerrainMask(sources, { width: 1, height: 1 }));
});
test('worn track: ~0 on the road centre line, 1 at its edge, clamped far away', () => {
  const road = world.features.get('road_approach_west').polyline;   // [0,40] -> [-120,44]
  const z = (x) => 40 + (-x) / 120 * 4, c = at(-60, z(-60));
  assert.ok(c.track < 0.9, `centre of the cart road is inside the track (${c.track})`);
  assert.ok(at(-60, z(-60) + 12).track >= 3.9, 'twelve metres off the road there is no track');
  assert.ok(road.length >= 2);
  const f = sampleMask(bakeTerrainMask(sources, MASK_SIZES.high), MASK_SIZES.high.width, MASK_SIZES.high.height, -100, 8.5);   // ignition_line footpath, 1 m texels
  assert.ok(f.track < 1.0, `the trodden ignition_line survives at High resolution (${f.track})`);
});
test('ballast strip: inside beside the rail centre line, absent beyond the shoulder', () => {
  const rail = world.features.get('rail_embankment_west').polyline;   // (0,0,0) -> (-140,0,-1)
  const centre = at(-70, -0.5), shoulder = at(-70, 3.3), far = at(-70, 12);
  assert.ok(centre.ballast < 0.8, `ballast on the embankment (${centre.ballast})`);
  assert.ok(shoulder.ballast < 1.3 && shoulder.ballast > centre.ballast - 0.001, 'ballast thins toward the shoulder');
  assert.ok(far.ballast >= 2, `no ballast 12 m away (${far.ballast})`);
  assert.ok(rail.length >= 2);
  const east = at(1300, 3);   // rail_line_east inside the terrain extent
  assert.ok(east.ballast < 1.2, `east line ballast (${east.ballast})`);
});
test('wet band: signed distance to the Vistula channel (negative in the river, ~0 at x 25 and 265, grows inland)', () => {
  assert.ok(at(140, 0).bank < 0, 'river bed is inside the channel polygon');
  assert.equal(at(140, 0).bank, MASK_ENCODING.bankMin, 'deep inside clamps to the encoding minimum');
  for (const x of [20, 10]) assert.ok(Math.abs(at(x, 0).bank - (25 - x)) < 4.5, `west bank distance at x ${x}: ${at(x, 0).bank}`);
  assert.ok(Math.abs(at(280, 0).bank - 15) < 4.5, `east bank land side (${at(280, 0).bank})`);
  assert.ok(at(24, 0).bank > 0 && at(24, 0).bank < 6, 'land side next to the west bank is a small positive distance');
  assert.ok(at(-300, 0).bank > 20, 'far inland: no wet band');
});
test('macro field: deterministic, 0..1, uses the whole range, meadow polygons are biased green', () => {
  assert.equal(macroField(123.4, -56.7), macroField(123.4, -56.7));
  let lo = 1, hi = 0; for (let x = -400; x < 400; x += 7) for (let z = -80; z < 140; z += 7) { const v = macroField(x, z); assert.ok(v >= 0 && v <= 1); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok(lo < 0.15 && hi > 0.85, `range ${lo}..${hi}`);
  const strip = world.features.get('strip_between_approaches').polygon, [cx, cz] = [-100, 23];   // inside the strip
  assert.ok(strip.length >= 3);
  const noBias = bakeTerrainMask({ ...sources, meadow: [] }, SMALL);
  assert.ok(sampleMask(mask, SMALL.width, SMALL.height, cx, cz).macro >= sampleMask(noBias, SMALL.width, SMALL.height, cx, cz).macro);
});
test('a mission without a river or tracks still bakes (everything far / neutral)', () => {
  const empty = bakeTerrainMask(terrainMaskSources(new Map(), {}), { width: 8, height: 4 });
  for (let i = 0; i < 32; i += 4) { assert.equal(empty[i], 255); assert.equal(empty[i + 1], 255); assert.equal(empty[i + 2], 255); }
});
