export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function angleToVector(angle: number): { x: number; y: number } {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function formatRank(score: number): "S" | "A" | "B" | "C" {
  if (score >= 3000) return "S";
  if (score >= 2000) return "A";
  if (score >= 1000) return "B";
  return "C";
}
