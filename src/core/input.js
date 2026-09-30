export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.fire = false; this.lookDelta = 0; this.lookDeltaY = 0;
    addEventListener('keydown', e => this.keys.add(e.code));
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { this.lookDelta += e.movementX; this.lookDeltaY += e.movementY; } });
    addEventListener('mousedown', e => { if (e.button === 0) this.fire = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.fire = false; });
  }
  consumeLook() { const value = this.lookDelta; this.lookDelta = 0; return value; }
  consumeLookY() { const value = this.lookDeltaY; this.lookDeltaY = 0; return value; }
  down(code) { return this.keys.has(code); }
}
