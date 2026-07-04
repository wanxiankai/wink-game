import { COLORS, GAME } from "../config";
import type { EyeId } from "../types";
import { random } from "../utils";

export interface SwatAnimation {
  x: number;
  y: number;
  age: number;
  hit: boolean;
  eyeId: EyeId | "touch";
}

export interface ComboPop {
  x: number;
  y: number;
  text: string;
  age: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
}

export class Effects {
  readonly swats: SwatAnimation[] = [];
  readonly particles: Particle[] = [];
  readonly comboPops: ComboPop[] = [];

  addSwat(x: number, y: number, hit: boolean, eyeId: EyeId | "touch"): void {
    this.swats.push({ x, y, age: 0, hit, eyeId });
  }

  addCombo(x: number, y: number, combo: number): void {
    if (combo > 1) this.comboPops.push({ x, y, text: `x${combo}`, age: 0 });
  }

  burst(x: number, y: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(80, 260);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: random(0.35, 0.75),
        color: Math.random() > 0.35 ? COLORS.juice : "#d8e65f",
        size: random(3, 7)
      });
    }
    while (this.particles.length > GAME.maxParticles) this.particles.shift();
  }

  update(dt: number): void {
    this.swats.forEach((swat) => (swat.age += dt));
    this.comboPops.forEach((pop) => (pop.age += dt));
    this.particles.forEach((particle) => {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 520 * dt;
    });

    removeExpired(this.swats, (swat) => swat.age > 0.38);
    removeExpired(this.comboPops, (pop) => pop.age > 0.75);
    removeExpired(this.particles, (particle) => particle.age > particle.life);
  }
}

function removeExpired<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) items.splice(i, 1);
  }
}
