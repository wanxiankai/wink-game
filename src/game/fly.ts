import { GAME } from "../config";
import type { FlyState } from "../types";
import { angleToVector, clamp, random } from "../utils";

let nextFlyId = 1;

export class Fly {
  readonly id = nextFlyId++;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  baseSpeed = 100;
  state: FlyState = "moving";
  stateTimer = 0;
  respawnTimer = 0;
  rotation = 0;
  wingPhase = Math.random() * Math.PI * 2;

  constructor(private readonly bounds: () => { width: number; height: number }) {
    this.respawn(true);
  }

  update(dt: number): void {
    this.wingPhase += dt * (this.state === "fleeing" ? 34 : 18);

    if (this.state === "dead") {
      this.stateTimer += dt;
      this.y += 220 * dt;
      this.rotation += dt * 8;
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    if (this.state === "idle") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.setVelocityFromAngle(Math.random() * Math.PI * 2, this.baseSpeed);
      return;
    }

    if (this.state === "fleeing") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.setVelocityFromAngle(Math.atan2(this.vy, this.vx), this.baseSpeed);
      }
    } else if (Math.random() < GAME.idleChancePerSecond * dt) {
      this.state = "idle";
      this.stateTimer = random(0.5, 2);
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.bounceInsideBounds();
    this.rotation = Math.atan2(this.vy, this.vx);
  }

  onHit(): void {
    if (this.state === "dead") return;
    this.state = "dead";
    this.stateTimer = 0;
    this.respawnTimer = random(1, 3);
    this.vx = random(-40, 40);
    this.vy = random(-80, -20);
  }

  onFlee(fromX: number, fromY: number): void {
    if (this.state === "dead") return;
    const angle = Math.atan2(this.y - fromY, this.x - fromX);
    this.setVelocityFromAngle(angle, this.baseSpeed * 3);
    this.state = "fleeing";
    this.stateTimer = GAME.fleeDuration;
  }

  respawn(initial = false): void {
    const { width, height } = this.bounds();
    const side = Math.floor(Math.random() * 4);
    const inset = GAME.flyRadius * 2;

    if (initial) {
      this.x = random(inset, width - inset);
      this.y = random(inset + 80, height - inset);
    } else if (side === 0) {
      this.x = -inset;
      this.y = random(inset, height - inset);
    } else if (side === 1) {
      this.x = width + inset;
      this.y = random(inset, height - inset);
    } else if (side === 2) {
      this.x = random(inset, width - inset);
      this.y = -inset;
    } else {
      this.x = random(inset, width - inset);
      this.y = height + inset;
    }

    this.baseSpeed = random(80, 150);
    const targetX = random(width * 0.2, width * 0.8);
    const targetY = random(height * 0.2, height * 0.8);
    this.setVelocityFromAngle(Math.atan2(targetY - this.y, targetX - this.x), this.baseSpeed);
    this.state = "moving";
    this.stateTimer = 0;
    this.rotation = Math.atan2(this.vy, this.vx);
  }

  private setVelocityFromAngle(angle: number, speed: number): void {
    const vector = angleToVector(angle);
    this.vx = vector.x * speed;
    this.vy = vector.y * speed;
    this.state = "moving";
  }

  private bounceInsideBounds(): void {
    const { width, height } = this.bounds();
    const radius = GAME.flyRadius;
    if (this.x < radius || this.x > width - radius) {
      this.vx *= -1;
      this.x = clamp(this.x, radius, width - radius);
    }
    if (this.y < radius + 48 || this.y > height - radius) {
      this.vy *= -1;
      this.y = clamp(this.y, radius + 48, height - radius);
    }
  }
}
