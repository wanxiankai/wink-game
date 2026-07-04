interface PointLike {
  x: number;
  y: number;
}

export function calculateEar(points: PointLike[]): number {
  if (points.length < 6) return 1;
  const verticalA = dist(points[1], points[5]);
  const verticalB = dist(points[2], points[4]);
  const horizontal = dist(points[0], points[3]);
  if (horizontal <= 0.0001) return 1;
  return (verticalA + verticalB) / (2 * horizontal);
}

function dist(a: PointLike, b: PointLike): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
