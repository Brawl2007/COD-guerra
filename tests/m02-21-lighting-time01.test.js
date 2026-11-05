import test from 'node:test';
import assert from 'node:assert/strict';
import { M02_LIGHTING_PRESETS } from '../src/render/m02-01-renderer.js';
import { M02_SUN_DISTANCE_M, shadowHalfHeightM, solarFromSunPosition, sunPositionFromSolar } from '../src/render/m02-solar-lighting.js';
import { LECZYCA, solarPosition } from '../tools/m02/solar-noaa.mjs';

// TIME-01 (docs/m02/research/TIME-01-solar.md): convenção norte = −Z, este = +X, azimute desde o Norte no sentido horário.
// Teste de estado/derivação: prova que a luz de cada preset é a do cálculo NOAA no momento declarado; não é playtest nem prova visual.

const TOL_ELEV_DEG = 1;
const TOL_AZ_DEG = 2;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const cet = (momentCET) => new Date(`${momentCET}:00+01:00`); // CET = UTC+1, sem horário de verão (TIME-01)

test('ida e volta elevação/azimute <-> posição da luz respeita norte=−Z, este=+X', () => {
  const [nx, ny, nz] = sunPositionFromSolar(0, 0);
  assert.ok(nz < -M02_SUN_DISTANCE_M + 0.1 && Math.abs(nx) < 0.01 && Math.abs(ny) < 0.01, 'azimute 0° é norte = −Z');
  const [ex, , ez] = sunPositionFromSolar(0, 90);
  assert.ok(ex > M02_SUN_DISTANCE_M - 0.1 && Math.abs(ez) < 0.01, 'azimute 90° é este = +X');
  const [wx] = sunPositionFromSolar(0, 270);
  assert.ok(wx < -M02_SUN_DISTANCE_M + 0.1, 'azimute 270° é oeste = −X');
  const [, zy] = sunPositionFromSolar(90, 0);
  assert.ok(Math.abs(zy - M02_SUN_DISTANCE_M) < 0.01, 'elevação 90° é zénite (+Y)');
  for (const [el, az] of [[10.7, 265], [20.8, 109], [19.3, 253], [43, 187], [3, 5], [60, 359]]) {
    const back = solarFromSunPosition(sunPositionFromSolar(el, az));
    assert.ok(Math.abs(back.elevationDeg - el) < 0.1, `elev ${el}`);
    assert.ok(angDiff(back.azimuthDeg, az) < 0.2, `az ${az}`);
  }
});

test('cada preset solar tem a direção da luz do cálculo NOAA no momento declarado (≤1° elevação, ≤2° azimute)', () => {
  const solarPresets = Object.values(M02_LIGHTING_PRESETS).filter((p) => p.lightSource === 'sun');
  assert.deepEqual(solarPresets.map((p) => p.id).sort(), ['afternoon_1939_09_09', 'afternoon_1939_09_10', 'morning_1939_09_10']);
  for (const preset of solarPresets) {
    const derived = solarFromSunPosition(preset.sunPosition); // direção realmente aplicada à DirectionalLight
    const ref = solarPosition(cet(preset.solar.momentCET), LECZYCA.lat, LECZYCA.lon);
    assert.ok(Math.abs(derived.elevationDeg - ref.elevation) <= TOL_ELEV_DEG, `${preset.id} elevação ${derived.elevationDeg.toFixed(2)} vs NOAA ${ref.elevation.toFixed(2)}`);
    assert.ok(angDiff(derived.azimuthDeg, ref.azimuth) <= TOL_AZ_DEG, `${preset.id} azimute ${derived.azimuthDeg.toFixed(2)} vs NOAA ${ref.azimuth.toFixed(2)}`);
    // O metadado declarado também tem de coincidir com o cálculo (evita um número copiado errado).
    assert.ok(Math.abs(preset.solar.elevationDeg - ref.elevation) <= TOL_ELEV_DEG && angDiff(preset.solar.azimuthDeg, ref.azimuth) <= TOL_AZ_DEG, `${preset.id} metadado`);
  }
});

test('valores corrigidos: T0 já não é 30,5°/247°, T2 já não é 28,9°/71°, T3 já não é 30,9°/248°', () => {
  const P = M02_LIGHTING_PRESETS;
  const t0 = solarFromSunPosition(P.afternoon_1939_09_09.sunPosition);
  const t2 = solarFromSunPosition(P.morning_1939_09_10.sunPosition);
  const t3 = solarFromSunPosition(P.afternoon_1939_09_10.sunPosition);
  // 9/9 entre 16:30 (15,2°/259°) e 17:30 (6,1°/271°)
  assert.ok(t0.elevationDeg >= 6.1 - 0.5 && t0.elevationDeg <= 15.2 + 0.5, `T0 elev ${t0.elevationDeg}`);
  assert.ok(t0.azimuthDeg >= 259 - 1 && t0.azimuthDeg <= 271 + 1, `T0 az ${t0.azimuthDeg}`);
  assert.ok(angDiff(t2.azimuthDeg, 109) <= TOL_AZ_DEG && Math.abs(t2.elevationDeg - 20.8) <= TOL_ELEV_DEG);
  assert.ok(angDiff(t3.azimuthDeg, 253) <= TOL_AZ_DEG && Math.abs(t3.elevationDeg - 19.3) <= TOL_ELEV_DEG);
  // De manhã o sol está a sudeste/este (ESE), nunca a leste-nordeste: +X e +Z (sul).
  assert.ok(P.morning_1939_09_10.sunPosition[0] > 0 && P.morning_1939_09_10.sunPosition[2] > 0);
  // À tarde o sol está a oeste (−X).
  assert.ok(P.afternoon_1939_09_09.sunPosition[0] < 0 && P.afternoon_1939_09_10.sunPosition[0] < 0);
});

test('a noite (T1) não tem sol acima do horizonte: o sol está abaixo e a luz direcional é um placeholder de luar', () => {
  const night = M02_LIGHTING_PRESETS.night_1939_09_09;
  const ref = solarPosition(cet(night.solar.momentCET), LECZYCA.lat, LECZYCA.lon);
  assert.ok(ref.elevation < -5, `o sol às ${night.solar.momentCET} CET tem de estar abaixo do horizonte (NOAA: ${ref.elevation.toFixed(1)}°)`);
  assert.equal(night.solar.sunBelowHorizon, true);
  assert.notEqual(night.lightSource, 'sun', 'a luz direcional da noite não pode ser rotulada como sol');
  assert.equal(night.lightSource, 'moon_placeholder');
  assert.match(night.moonLabel, /lua não calculada \(placeholder\)/);
  assert.equal(night.solar.elevationDeg, undefined, 'a noite não declara elevação solar (não há sol)');
  // Luz fraca: fonte direcional de luar bem abaixo da de dia e ambiente noturno baixo.
  const day = M02_LIGHTING_PRESETS.afternoon_1939_09_09;
  assert.ok(night.sunIntensity <= 0.4 && night.sunIntensity < day.sunIntensity / 3);
  assert.ok(night.hemiIntensity <= 0.4 && night.hemiIntensity < day.hemiIntensity);
});

test('cada preset declara a origem da luz (sol TIME-01, placeholder de luar ou técnica)', () => {
  for (const preset of Object.values(M02_LIGHTING_PRESETS)) {
    assert.ok(['sun', 'moon_placeholder', 'technical'].includes(preset.lightSource), preset.id);
  }
  assert.equal(M02_LIGHTING_PRESETS.neutral_review.lightSource, 'technical');
  assert.equal(M02_LIGHTING_PRESETS.neutral_review.solar, null);
});

test('volume de sombras acompanha a elevação: sol baixo concentra o mapa, sol alto usa o alcance total', () => {
  assert.ok(shadowHalfHeightM(10.7) < shadowHalfHeightM(30.5));
  assert.ok(shadowHalfHeightM(10.7) < 40, 'sol a 10,7° cabe em menos de ±40 m de altura de imagem');
  assert.ok(shadowHalfHeightM(90) <= 95 + 14 + 1e-9);
  assert.ok(shadowHalfHeightM(-10) >= 14 - 1e-9, 'elevação negativa não dá volume negativo');
});
