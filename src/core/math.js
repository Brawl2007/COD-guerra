export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const normalizeAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export function segmentPointDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((p.x-a.x)*dx + (p.y-a.y)*dy) / length2, 0, 1) : 0;
  return Math.hypot(p.x - (a.x + t*dx), p.y - (a.y + t*dy));
}
