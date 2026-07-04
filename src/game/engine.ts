import { GAME, PERFORMANCE } from "../config";
import type { EyeData, EyeId, GameState, PerceptionOutput } from "../types";
import { formatRank, randomInt } from "../utils";
import { Effects } from "./effects";
import { Fly } from "./fly";
import { Fly3DRenderer } from "./fly3dRenderer";
import { Renderer } from "./renderer";
import { SwatSystem } from "./swatSystem";

export interface GameSnapshot {
  score: number;
  combo: number;
  timeLeft: number;
  state: GameState;
  rank: "S" | "A" | "B" | "C";
}

export class GameEngine {
  private readonly flies: Fly[] = [];
  private readonly effects = new Effects();
  private readonly swats = new SwatSystem();
  private state: GameState = "menu";
  private score = 0;
  private combo = 0;
  private timeLeft = GAME.durationSeconds;
  private lastTime = performance.now();
  private lastFrameAt = performance.now();
  private raf = 0;
  private currentEyes: EyeData[] = [];
  private touchMode = false;
  private noEyesFrames = 0;
  private endCallback: ((snapshot: GameSnapshot) => void) | undefined;
  private updateCallback: ((snapshot: GameSnapshot) => void) | undefined;

  constructor(private readonly renderer: Renderer, private readonly flyRenderer: Fly3DRenderer) {
    for (let i = 0; i < randomInt(GAME.minFlies, GAME.maxFlies); i++) {
      this.flies.push(new Fly(() => ({ width: this.renderer.width, height: this.renderer.height })));
    }
    this.loop();
  }

  onUpdate(callback: (snapshot: GameSnapshot) => void): void {
    this.updateCallback = callback;
  }

  onEnd(callback: (snapshot: GameSnapshot) => void): void {
    this.endCallback = callback;
  }

  setTouchMode(enabled: boolean): void {
    this.touchMode = enabled;
  }

  showMenu(): void {
    this.state = "menu";
    this.timeLeft = GAME.durationSeconds;
    this.score = 0;
    this.combo = 0;
    this.emitUpdate();
  }

  startTutorial(): void {
    this.resetRound();
    this.state = "tutorial";
    this.timeLeft = GAME.tutorialSeconds;
  }

  startGame(): void {
    this.resetRound();
    this.state = "playing";
  }

  pause(): void {
    if (this.state === "playing") this.state = "paused";
  }

  resume(): void {
    if (this.state === "paused") {
      this.lastTime = performance.now();
      this.state = "playing";
    }
  }

  handlePerception(output: PerceptionOutput): void {
    this.currentEyes = output.eyes;
    if (this.state !== "playing" && this.state !== "tutorial") return;

    if (this.touchMode) {
      this.noEyesFrames = 0;
      return;
    }

    let visibleCount = 0;
    for (const eye of output.eyes) {
      if (!eye.isVisible) continue;
      visibleCount++;
      if (eye.blinkTriggered) this.applySwat(eye.screenX, eye.screenY, eye.eyeId);
    }
    this.noEyesFrames = visibleCount === 0 ? this.noEyesFrames + 1 : 0;
  }

  handleTouchSwat(x: number, y: number): void {
    if (!this.touchMode) return;
    if (this.state === "menu" || this.state === "gameover") return;
    this.applySwat(x, y, "touch");
  }

  getSnapshot(): GameSnapshot {
    return {
      score: this.score,
      combo: this.combo,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      state: this.state,
      rank: formatRank(this.score)
    };
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (document.hidden) {
      this.lastTime = now;
      this.lastFrameAt = now;
      return;
    }

    const targetFps = this.state === "playing" || this.state === "tutorial" ? PERFORMANCE.activeFps : PERFORMANCE.idleFps;
    if (now - this.lastFrameAt < 1000 / targetFps) return;
    this.lastFrameAt = now;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.render();
  };

  private update(dt: number): void {
    const active = this.state === "playing" || this.state === "tutorial";
    if (!active) {
      this.effects.update(dt);
      return;
    }

    const pausedByTracking = this.noEyesFrames > 12 && !this.touchMode;
    this.flies.forEach((fly) => fly.update(dt));
    this.effects.update(dt);

    if (active && !pausedByTracking) {
      const previousDisplayTime = Math.max(0, Math.ceil(this.timeLeft));
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        if (this.state === "tutorial") this.startGame();
        else this.endGame();
        return;
      }

      const nextDisplayTime = Math.max(0, Math.ceil(this.timeLeft));
      if (nextDisplayTime !== previousDisplayTime) {
        this.emitUpdate();
      }
    }
  }

  private render(): void {
    const pausedMessage =
      (this.state === "playing" || this.state === "tutorial") && this.noEyesFrames > 12 && !this.touchMode
        ? "请将眼睛对准摄像头"
        : undefined;
    this.renderer.render(this.flies, this.currentEyes, this.effects, pausedMessage);
    this.flyRenderer.render(this.flies);
  }

  private applySwat(x: number, y: number, source: EyeId | "touch"): void {
    if (this.state !== "playing" && this.state !== "tutorial") return;
    const result = this.swats.swat(
      this.flies,
      x,
      y,
      this.combo,
      source,
      (fly) => {
        this.effects.burst(fly.x, fly.y);
      },
      (hit, nextCombo) => {
        this.effects.addSwat(x, y, hit, source);
        this.effects.addCombo(x, y, nextCombo);
      }
    );

    if (this.state === "playing") {
      this.score += result.scoreDelta;
      this.combo = result.nextCombo;
      this.emitUpdate();
    }
  }

  private resetRound(): void {
    this.score = 0;
    this.combo = 0;
    this.timeLeft = GAME.durationSeconds;
    this.noEyesFrames = 0;
    this.currentEyes = [];
    this.flies.splice(0, this.flies.length);
    for (let i = 0; i < randomInt(GAME.minFlies, GAME.maxFlies); i++) {
      this.flies.push(new Fly(() => ({ width: this.renderer.width, height: this.renderer.height })));
    }
    this.lastTime = performance.now();
    this.lastFrameAt = this.lastTime;
    this.emitUpdate();
  }

  private endGame(): void {
    this.state = "gameover";
    this.timeLeft = 0;
    this.emitUpdate();
    this.endCallback?.(this.getSnapshot());
  }

  private emitUpdate(): void {
    this.updateCallback?.(this.getSnapshot());
  }
}
