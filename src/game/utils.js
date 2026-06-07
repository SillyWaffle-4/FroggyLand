import { DRAW_MARGIN, VIEW_WIDTH } from "./constants.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isRectVisible(cameraX, x, w, margin = DRAW_MARGIN) {
  return x + w >= cameraX - margin && x <= cameraX + VIEW_WIDTH + margin;
}

export function isPointVisible(cameraX, x, margin = DRAW_MARGIN) {
  return x >= cameraX - margin && x <= cameraX + VIEW_WIDTH + margin;
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function lineCircleHit(ax, ay, bx, by, cx, cy, radius) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby || 1;
  const t = clamp(((cx - ax) * abx + (cy - ay) * aby) / lengthSq, 0, 1);
  const px = ax + abx * t;
  const py = ay + aby * t;
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy <= radius * radius;
}

export function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
