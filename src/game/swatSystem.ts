import { GAME } from "../config";
import { Fly } from "./fly";
import type { EyeId } from "../types";

export interface SwatResult {
  hitCount: number;
  scoreDelta: number;
  nextCombo: number;
}

export class SwatSystem {
  swat(
    flies: Fly[],
    x: number,
    y: number,
    combo: number,
    source: EyeId | "touch",
    onHit: (fly: Fly) => void,
    onEffect: (hit: boolean, nextCombo: number) => void
  ): SwatResult {
    const hitFlies: Fly[] = [];
    const hitRadiusSq = GAME.hitRadius * GAME.hitRadius;
    const fleeRadiusSq = GAME.fleeRadius * GAME.fleeRadius;

    for (const fly of flies) {
      if (fly.state === "dead") continue;
      const dx = fly.x - x;
      const dy = fly.y - y;
      if (dx * dx + dy * dy <= hitRadiusSq) hitFlies.push(fly);
    }

    for (const fly of hitFlies) {
      fly.onHit();
      onHit(fly);
    }

    for (const fly of flies) {
      if (fly.state === "dead") continue;
      const dx = fly.x - x;
      const dy = fly.y - y;
      if (dx * dx + dy * dy <= fleeRadiusSq) {
        fly.onFlee(x, y);
      }
    }

    const hit = hitFlies.length > 0;
    const nextCombo = hit ? combo + hitFlies.length : 0;
    let scoreDelta = 0;
    for (let index = 0; index < hitFlies.length; index++) {
      scoreDelta += 100 + (combo + index) * 20;
    }

    onEffect(hit, nextCombo);
    return { hitCount: hitFlies.length, scoreDelta, nextCombo };
  }
}
