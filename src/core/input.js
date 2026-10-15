export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set(); this.pressed = new Set();
    this.fire = false; this.firePressed = false; this.aim = false;
    this.lookDelta = 0; this.lookDeltaY = 0;
    this.pointerLocked = false; this.discardLookSample = false;
    // Virtual (touch) controls write here; the keyboard/mouse paths above are untouched.
    this.touchForward = 0; this.touchSide = 0; this.touchSprint = false;
    this.listeners = [];
    const listen = (target, event, handler) => {
      target.addEventListener(event, handler);
      this.listeners.push(() => target.removeEventListener(event, handler));
    };
    listen(window, 'keydown', e => {
      if (document.pointerLockElement !== canvas) return;
      if (['KeyW','KeyA','KeyS','KeyD','KeyR','KeyG','KeyE','KeyC','KeyV','Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    listen(window, 'keyup', e => this.keys.delete(e.code));
    listen(window, 'mousemove', e => {
      if (this.pointerLocked && document.pointerLockElement === canvas) {
        // Some browsers deliver a cursor repositioning sample at lock entry.
        // Wait for pointerlockchange and discard that first relative sample.
        if (this.discardLookSample) { this.discardLookSample = false; return; }
        this.lookDelta += e.movementX; this.lookDeltaY += e.movementY;
      }
    });
    listen(window, 'mousedown', e => {
      if (document.pointerLockElement !== canvas) return;
      if (e.button === 0) { this.firePressed = !this.fire; this.fire = true; }
      if (e.button === 2) this.aim = true;
    });
    listen(window, 'mouseup', e => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.aim = false;
    });
    listen(canvas, 'contextmenu', e => e.preventDefault());
    listen(window, 'blur', () => this.clear());
    listen(document, 'visibilitychange', () => { if (document.hidden) this.clear(); });
    listen(document, 'pointerlockchange', () => {
      this.clear();
      this.pointerLocked = document.pointerLockElement === canvas;
      this.discardLookSample = this.pointerLocked;
    });
  }
  clear() {
    this.keys.clear(); this.pressed.clear(); this.fire = false; this.firePressed = false;
    this.aim = false; this.lookDelta = 0; this.lookDeltaY = 0;
    this.touchForward = 0; this.touchSide = 0; this.touchSprint = false;
  }
  setMove(side, forward, sprint = false) { this.touchSide = side; this.touchForward = forward; this.touchSprint = sprint; }
  addLook(dx, dy) { this.lookDelta += dx; this.lookDeltaY += dy; }
  setFire(on) { if (on) this.firePressed = !this.fire; this.fire = on; }
  tap(code) { this.pressed.add(code); }
  forwardAxis() { return Math.max(-1, Math.min(1, Number(this.down('KeyW')) - Number(this.down('KeyS')) + this.touchForward)); }
  sideAxis() { return Math.max(-1, Math.min(1, Number(this.down('KeyD')) - Number(this.down('KeyA')) + this.touchSide)); }
  sprinting() { return this.down('ShiftLeft') || this.down('ShiftRight') || this.touchSprint; }
  consumeLook() { const value = this.lookDelta; this.lookDelta = 0; return value; }
  consumeLookY() { const value = this.lookDeltaY; this.lookDeltaY = 0; return value; }
  consumePressed(code) { const value = this.pressed.has(code); this.pressed.delete(code); return value; }
  consumeFire() { const value = this.firePressed; this.firePressed = false; return value; }
  down(code) { return this.keys.has(code); }
  dispose() { this.listeners.forEach(remove => remove()); this.listeners = []; this.clear(); }
}
