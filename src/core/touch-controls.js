// Virtual touch controls. TouchState holds no DOM so it is unit-testable; bindTouchControls wires it to the overlay.
export const JOYSTICK_RADIUS = 56, DEAD_ZONE = 0.15, SPRINT_AT = 0.95, LOOK_SCALE = 1.5;

export function detectTouch(win = globalThis.window) {
  try {
    if (new URLSearchParams(win.location.search).get('touch') === '1') return true;
    return (win.navigator?.maxTouchPoints ?? 0) > 0 && Boolean(win.matchMedia?.('(pointer: coarse)').matches);
  } catch { return false; }
}

// Maps a thumb offset (px) to a movement vector. y is screen-down, so forward is -y.
export function joystickVector(dx, dy, radius = JOYSTICK_RADIUS, dead = DEAD_ZONE) {
  const len = Math.hypot(dx, dy) / radius, mag = Math.min(1, len);
  if (mag < dead) return { side: 0, forward: 0, sprint: false };
  const scale = (mag - dead) / (1 - dead) / (len * radius);
  return { side: dx * scale, forward: -dy * scale, sprint: mag >= SPRINT_AT };
}

const HOLD = { fire: 'fire', aim: 'aim' };
const TAPS = { reload: 'KeyR', grenade: 'KeyG', interact: 'KeyE', crouch: 'KeyC', sight: 'KeyV', skip: 'Space' };

export class TouchState {
  constructor(input, { onPause = () => {} } = {}) {
    this.input = input; this.onPause = onPause; this.pointers = new Map(); this.active = false;
  }
  setActive(on) { this.active = on; if (!on) this.cancelAll(); }
  down(id, role, x, y) {
    if (!this.active || this.pointers.has(id)) return;
    // One finger per role: a second finger on the same stick/look zone is ignored.
    for (const p of this.pointers.values()) if (p.role === role && (role === 'move' || role === 'look')) return;
    this.pointers.set(id, { role, ox: x, oy: y, lx: x, ly: y });
    if (role === 'fire') this.input.setFire(true);
    else if (role === 'aim') this.input.aim = true;
    else if (TAPS[role]) this.input.tap(TAPS[role]);
    else if (role === 'pause') { this.cancelAll(); this.onPause(); }
  }
  move(id, x, y) {
    const p = this.pointers.get(id); if (!p) return;
    if (p.role === 'move') { const v = joystickVector(x - p.ox, y - p.oy); this.input.setMove(v.side, v.forward, v.sprint); }
    else if (p.role === 'look') { this.input.addLook((x - p.lx) * LOOK_SCALE, (y - p.ly) * LOOK_SCALE); }
    p.lx = x; p.ly = y;
  }
  up(id) {
    const p = this.pointers.get(id); if (!p) return;
    this.pointers.delete(id);
    if (p.role === 'move') this.input.setMove(0, 0, false);
    else if (p.role === 'fire') this.input.setFire(false);
    else if (p.role === 'aim') this.input.aim = false;
  }
  cancelAll() { this.pointers.clear(); this.input.clear(); }
}

// Binds `[data-touch]` elements in `root` to a TouchState. Returns a disposer.
export function bindTouchControls(root, state, win = window) {
  const cleanups = [];
  const on = (target, type, handler, opts) => { target.addEventListener(type, handler, opts); cleanups.push(() => target.removeEventListener(type, handler, opts)); };
  for (const el of root.querySelectorAll('[data-touch]')) {
    const role = el.dataset.touch;
    on(el, 'pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } el.classList.add('down'); state.down(e.pointerId, role, e.clientX, e.clientY); });
    on(el, 'pointermove', e => { e.preventDefault(); state.move(e.pointerId, e.clientX, e.clientY); });
    const end = e => { el.classList.remove('down'); state.up(e.pointerId); };
    on(el, 'pointerup', end); on(el, 'pointercancel', end); on(el, 'lostpointercapture', end);
    on(el, 'contextmenu', e => e.preventDefault());
  }
  on(win, 'blur', () => state.cancelAll());
  on(win.document, 'visibilitychange', () => { if (win.document.hidden) state.cancelAll(); });
  on(win, 'orientationchange', () => state.cancelAll());
  return () => cleanups.forEach(c => c());
}
