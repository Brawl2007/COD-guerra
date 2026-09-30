export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set(); this.pressed = new Set();
    this.fire = false; this.firePressed = false; this.aim = false;
    this.lookDelta = 0; this.lookDeltaY = 0;
    this.listeners = [];
    const listen = (target, event, handler) => {
      target.addEventListener(event, handler);
      this.listeners.push(() => target.removeEventListener(event, handler));
    };
    listen(window, 'keydown', e => {
      if (document.pointerLockElement !== canvas) return;
      if (['KeyW','KeyA','KeyS','KeyD','KeyR','KeyG','Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    listen(window, 'keyup', e => this.keys.delete(e.code));
    listen(window, 'mousemove', e => {
      if (document.pointerLockElement === canvas) {
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
    listen(document, 'pointerlockchange', () => this.clear());
  }
  clear() {
    this.keys.clear(); this.pressed.clear(); this.fire = false; this.firePressed = false;
    this.aim = false; this.lookDelta = 0; this.lookDeltaY = 0;
  }
  consumeLook() { const value = this.lookDelta; this.lookDelta = 0; return value; }
  consumeLookY() { const value = this.lookDeltaY; this.lookDeltaY = 0; return value; }
  consumePressed(code) { const value = this.pressed.has(code); this.pressed.delete(code); return value; }
  consumeFire() { const value = this.firePressed; this.firePressed = false; return value; }
  down(code) { return this.keys.has(code); }
  dispose() { this.listeners.forEach(remove => remove()); this.listeners = []; this.clear(); }
}
