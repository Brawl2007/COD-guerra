import test from 'node:test';
import assert from 'node:assert/strict';
import { solarPosition, sunriseSunset, LECZYCA, referenceTable } from '../tools/m02/solar-noaa.mjs';

// Referências independentes (valores publicados/tabelados):
// 1) Equação do tempo (almanaques/Meeus): 11 Fev ~ -14 min 15 s; 3 Nov ~ +16 min 25 s.
// 2) Declinação no equinócio de setembro 2023 (23/09 06:50 UTC) ~ 0 graus; solstício 21/06 ~ +23,44 graus.
// 3) Londres 21/06/2023 (timeanddate.com): nascer 04:43 BST = 03:43 UTC, ocaso 21:21 BST = 20:21 UTC.
// 4) Varsóvia 21/06/2023 (timeanddate.com): nascer 04:14 CEST, ocaso 21:01 CEST.
// 5) Meio-dia solar em Londres 21/06: elevação geométrica = 90 - lat + decl ~ 61,93 graus.

test('equação do tempo e declinação batem com valores tabelados', () => {
  const p = (iso) => solarPosition(new Date(iso), 0, 0);
  assert.ok(Math.abs(p('2023-02-11T12:00:00Z').eqTimeMin - -14.25) < 0.25);
  assert.ok(Math.abs(p('2023-11-03T12:00:00Z').eqTimeMin - 16.42) < 0.25);
  assert.ok(Math.abs(p('2023-09-23T06:50:00Z').declination) < 0.05);
  assert.ok(Math.abs(p('2023-06-21T12:00:00Z').declination - 23.44) < 0.02);
});

test('nascer/ocaso de referência (Londres e Varsóvia) a ±2 min', () => {
  const lon = sunriseSunset([2023, 6, 21], 51.5074, -0.1278, 0);
  assert.ok(Math.abs(lon.sunriseMin - (3 * 60 + 43)) <= 2);
  assert.ok(Math.abs(lon.sunsetMin - (20 * 60 + 21)) <= 2);
  const waw = sunriseSunset([2023, 6, 21], 52.2297, 21.0122, 2);
  assert.ok(Math.abs(waw.sunriseMin - (4 * 60 + 14)) <= 2);
  assert.ok(Math.abs(waw.sunsetMin - (21 * 60 + 1)) <= 2);
});

test('elevação ao meio-dia solar em Londres no solstício', () => {
  const p = solarPosition(new Date('2023-06-21T12:00:00Z'), 51.5074, -0.1278);
  assert.ok(Math.abs(p.elevationGeometric - 61.93) < 0.1);
  assert.ok(Math.abs(p.azimuth - 180) < 2);
});

test('Łęczyca 9-10/09/1939 (CET=UTC+1) segue a tabela TIME-01', () => {
  const { rows, s9, s10 } = referenceTable();
  const by = Object.fromEntries(rows.map((r) => [r.label.split(' ').slice(0, 2).join(' '), r]));
  const near = (r, e, a) => {
    assert.ok(Math.abs(r.elev - e) <= 0.5, `${r.label} elev ${r.elev}`);
    assert.ok(Math.abs(r.az - a) <= 2, `${r.label} az ${r.az}`);
  };
  near(by['09/09 16:30'], 15.2, 259);
  near(by['09/09 17:00'], 10.7, 265);
  near(by['09/09 17:30'], 6.1, 271);
  near(by['10/09 07:30'], 20.8, 109);
  near(by['10/09 12:00'], 43.0, 187);
  near(by['10/09 16:00'], 19.3, 253);
  assert.ok(Math.abs(s9.sunsetMin - (18 * 60 + 14)) <= 2);
  assert.ok(Math.abs(s10.sunriseMin - (5 * 60 + 8)) <= 2);
  assert.ok(LECZYCA.lat === 52.06 && LECZYCA.lon === 19.2);
});
