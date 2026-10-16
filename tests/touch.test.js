import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/input.js';
import { TouchState, joystickVector, detectTouch } from '../src/core/touch-controls.js';

function setup() {
  const prev = { w: globalThis.window, d: globalThis.document };
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  const input = new Input(new EventTarget());
  let paused = 0;
  const touch = new TouchState(input, { onPause: () => paused++ }); touch.setActive(true);
  return { input, touch, get paused() { return paused; }, done() { input.dispose(); for (const [k, v] of [['window', prev.w], ['document', prev.d]]) v === undefined ? delete globalThis[k] : (globalThis[k] = v); } };
}

test('joystick: dead zone, scaling, clamp and sprint', () => {
  assert.deepEqual(joystickVector(3, 3), { side: 0, forward: 0, sprint: false });
  const f = joystickVector(0, -56); assert.equal(f.forward, 1); assert.equal(f.sprint, true);
  const half = joystickVector(28, 0); assert.ok(half.side > 0 && half.side < 1); assert.equal(half.sprint, false);
  assert.equal(joystickVector(0, 500).forward, -1);
});

test('move stick drives analog axes and returns to zero on release and cancel', () => {
  const t = setup();
  try {
    t.touch.down(1, 'move', 100, 300); t.touch.move(1, 100, 244);
    assert.equal(t.input.forwardAxis(), 1);
    t.touch.move(1, 128, 300); assert.ok(t.input.sideAxis() > 0 && t.input.forwardAxis() === 0);
    t.touch.up(1); assert.equal(t.input.forwardAxis(), 0); assert.equal(t.input.sideAxis(), 0);
    t.touch.down(2, 'move', 0, 0); t.touch.move(2, 0, -50); t.touch.cancelAll();
    assert.equal(t.input.forwardAxis(), 0); assert.equal(t.input.sprinting(), false);
  } finally { t.done(); }
});

test('look accumulates deltas from the look finger only, independent of the stick (multitouch)', () => {
  const t = setup();
  try {
    t.touch.down(1, 'move', 50, 300); t.touch.down(2, 'look', 400, 100);
    t.touch.move(2, 410, 96); t.touch.move(1, 50, 250);
    assert.ok(t.input.consumeLook() > 0); assert.ok(t.input.consumeLookY() < 0);
    assert.equal(t.input.consumeLook(), 0); assert.ok(t.input.forwardAxis() > 0);
    t.touch.down(3, 'look', 500, 100); t.touch.move(3, 600, 100);
    assert.equal(t.input.consumeLook(), 0, 'second look finger ignored');
  } finally { t.done(); }
});

test('fire is semi-automatic per touch: one firePressed per press, none while held', () => {
  const t = setup();
  try {
    t.touch.down(1, 'fire', 0, 0);
    assert.equal(t.input.consumeFire(), true); assert.equal(t.input.consumeFire(), false);
    t.touch.move(1, 1, 1); assert.equal(t.input.consumeFire(), false); assert.equal(t.input.fire, true);
    t.touch.up(1); assert.equal(t.input.fire, false);
    t.touch.down(2, 'fire', 0, 0); assert.equal(t.input.consumeFire(), true);
  } finally { t.done(); }
});

test('one-shot buttons fire once per tap and do not repeat while held; aim is hold', () => {
  const t = setup();
  try {
    t.touch.down(1, 'reload', 0, 0);
    assert.equal(t.input.consumePressed('KeyR'), true); assert.equal(t.input.consumePressed('KeyR'), false);
    t.touch.down(1, 'reload', 0, 0); assert.equal(t.input.consumePressed('KeyR'), false, 'same pointer ignored');
    t.touch.up(1);
    for (const [role, code] of [['grenade', 'KeyG'], ['interact', 'KeyE'], ['crouch', 'KeyC'], ['sight', 'KeyV'], ['skip', 'Space']]) {
      t.touch.down(9, role, 0, 0); t.touch.up(9); assert.equal(t.input.consumePressed(code), true, role);
    }
    t.touch.down(5, 'aim', 0, 0); assert.equal(t.input.aim, true); t.touch.up(5); assert.equal(t.input.aim, false);
  } finally { t.done(); }
});

test('pause button clears all input and notifies; inactive state ignores touches; deactivation clears', () => {
  const t = setup();
  try {
    t.touch.down(1, 'fire', 0, 0); t.touch.down(2, 'move', 0, 0); t.touch.move(2, 0, -50);
    t.touch.down(3, 'pause', 0, 0);
    assert.equal(t.paused, 1); assert.equal(t.input.fire, false); assert.equal(t.input.forwardAxis(), 0);
    t.touch.down(4, 'fire', 0, 0); t.touch.setActive(false); assert.equal(t.input.fire, false);
    t.touch.down(6, 'fire', 0, 0); assert.equal(t.input.fire, false, 'inactive');
  } finally { t.done(); }
});

test('keyboard and touch axes combine and clamp; detectTouch honours ?touch=1', () => {
  const t = setup();
  try {
    t.input.keys.add('KeyW'); t.input.setMove(0, 1); assert.equal(t.input.forwardAxis(), 1);
    t.input.keys.add('KeyS'); assert.equal(t.input.forwardAxis(), 1);
  } finally { t.done(); }
  assert.equal(detectTouch({ location: { search: '?touch=1' } }), true);
  assert.equal(detectTouch({ location: { search: '' }, navigator: { maxTouchPoints: 0 }, matchMedia: () => ({ matches: true }) }), false);
  assert.equal(detectTouch({ location: { search: '' }, navigator: { maxTouchPoints: 5 }, matchMedia: () => ({ matches: true }) }), true);
});
