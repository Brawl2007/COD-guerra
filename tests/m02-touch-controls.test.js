import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { joystickVector, detectTouchMode, STICK_RADIUS_PX, STICK_DEADZONE } from '../src/m02/m02-touch-controls.js';

test('M02 toque: joystick — zona morta, andar, correr com histerese e sentido', () => {
  const R = STICK_RADIUS_PX;
  assert.deepEqual(joystickVector(0, 0), { forward: 0, side: 0, sprint: false, magnitude: 0 });
  const dead = joystickVector(0, -R * STICK_DEADZONE * 0.5);
  assert.equal(dead.forward, 0);
  assert.equal(dead.sprint, false);
  const half = joystickVector(0, -R * 0.5);
  assert.ok(half.forward > 0.3 && half.forward < 0.6, `forward ${half.forward}`);
  assert.equal(half.side, 0);
  assert.equal(half.sprint, false);
  const full = joystickVector(0, -R * 2);
  assert.ok(Math.abs(full.forward - 1) < 1e-9);
  assert.equal(full.sprint, true);
  // histerese: já a correr mantém-se até 0.78 do curso, a andar só entra a partir de 0.92
  assert.equal(joystickVector(0, -R * 0.85, false).sprint, false);
  assert.equal(joystickVector(0, -R * 0.85, true).sprint, true);
  assert.equal(joystickVector(0, -R * 0.7, true).sprint, false);
  // para trás e para o lado: nunca corre; direita = side > 0 (como D no teclado), trás = forward < 0 (como S)
  const back = joystickVector(0, R);
  assert.ok(back.forward < -0.9 && back.sprint === false);
  const right = joystickVector(R, 0);
  assert.ok(right.side > 0.9 && Math.abs(right.forward) < 1e-9 && right.sprint === false);
  assert.ok(Math.hypot(full.forward, full.side) <= 1 + 1e-9);
});

test('M02 toque: deteção — ?touch= força; pointer: coarse ativa; rato com hover não', () => {
  const win = (search, { coarse = false, hover = false, points = 0 } = {}) => ({
    location: { search },
    navigator: { maxTouchPoints: points },
    matchMedia: (q) => ({ matches: q === '(pointer: coarse)' ? coarse : q === '(hover: hover) and (pointer: fine)' ? hover : false }),
  });
  assert.equal(detectTouchMode(win('?touch=1')), true);
  assert.equal(detectTouchMode(win('?touch=0', { coarse: true })), false);
  assert.equal(detectTouchMode(win('', { coarse: true })), true);
  assert.equal(detectTouchMode(win('', { hover: true, points: 5 })), false); // portátil com ecrã tátil e rato
  assert.equal(detectTouchMode(win('', { points: 5 })), true);
  assert.equal(detectTouchMode(win('')), false);
});

test('M02 toque: guarda estática — a bancada liga o toque aos mesmos controlos do tick e a página impede o zoom', () => {
  const main = readFileSync(new URL('../src/m02/m02-01-main.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../m02-01.html', import.meta.url), 'utf8');
  assert.match(main, /touch \? touch\.poll\(\)/);
  assert.match(main, /lookY: tc\?\.lookY/);
  assert.match(main, /currentInteractPrompt\(\)/);
  assert.match(html, /maximum-scale=1[^"]*user-scalable=no/);
  assert.match(html, /env\(safe-area-inset-/);
  // o módulo de toque só produz controlos: nada de dano/visibilidade/estado da missão
  const mod = readFileSync(new URL('../src/m02/m02-touch-controls.js', import.meta.url), 'utf8');
  assert.doesNotMatch(mod, /\bsim\b|\.health\s*[-=]|missionFailed|Math\.random|Date\.now/);
});
