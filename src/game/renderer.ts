import { COLORS, GAME } from "../config";
import type { BackgroundMode, EyeData } from "../types";
import { easeOutBack } from "../utils";
import type { Effects } from "./effects";
import { Fly } from "./fly";

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backgroundCtx: CanvasRenderingContext2D;
  private readonly backgroundCache = document.createElement("canvas");
  private dpr = 1;
  private backgroundMode: BackgroundMode = "fixed";
  private eyeFocusVisible = false;
  private cachedBackgroundWidth = 0;
  private cachedBackgroundHeight = 0;
  private cachedBackgroundDpr = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly backgroundCanvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not supported");
    const backgroundCtx = backgroundCanvas.getContext("2d");
    if (!backgroundCtx) throw new Error("Canvas 2D is not supported");
    this.ctx = ctx;
    this.backgroundCtx = backgroundCtx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  get width(): number {
    return this.backgroundCanvas.width / this.dpr;
  }

  get height(): number {
    return this.backgroundCanvas.height / this.dpr;
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const target of [this.backgroundCanvas, this.canvas]) {
      target.width = Math.floor(width * this.dpr);
      target.height = Math.floor(height * this.dpr);
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
    }
    this.backgroundCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cachedBackgroundWidth = 0;
  }

  setBackgroundMode(mode: BackgroundMode): void {
    this.backgroundMode = mode;
  }

  setEyeFocusVisible(visible: boolean): void {
    this.eyeFocusVisible = visible;
  }

  render(flies: Fly[], eyes: EyeData[], effects: Effects, pausedMessage?: string): void {
    this.drawBackground();
    void flies;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawParticles(effects);
    this.drawSwats(effects);
    if (this.eyeFocusVisible) eyes.forEach((eye) => eye.isVisible && this.drawCrosshair(eye));
    this.drawComboPops(effects);
    if (pausedMessage) this.drawCenteredMessage(pausedMessage);
  }

  private drawBackground(): void {
    const ctx = this.backgroundCtx;
    const width = this.width;
    const height = this.height;
    ctx.clearRect(0, 0, width, height);

    if (this.backgroundMode === "camera") {
      this.drawCameraOverlay(width, height);
      return;
    }

    this.ensureFixedBackgroundCache(width, height);
    ctx.drawImage(this.backgroundCache, 0, 0, width, height);
  }

  private ensureFixedBackgroundCache(width: number, height: number): void {
    if (
      this.cachedBackgroundWidth === width &&
      this.cachedBackgroundHeight === height &&
      this.cachedBackgroundDpr === this.dpr
    ) {
      return;
    }

    this.cachedBackgroundWidth = width;
    this.cachedBackgroundHeight = height;
    this.cachedBackgroundDpr = this.dpr;
    this.backgroundCache.width = Math.floor(width * this.dpr);
    this.backgroundCache.height = Math.floor(height * this.dpr);

    const ctx = this.backgroundCache.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(152,198,110,0.18)";
    for (let i = 0; i < 12; i++) {
      const x = ((i * 97) % width) - 24;
      const y = height - 36 - ((i * 31) % 90);
      ctx.beginPath();
      ctx.ellipse(x, y, 72, 16, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(46,42,36,0.06)";
    ctx.lineWidth = 1;
    for (let x = 24; x < width; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 26, height);
      ctx.stroke();
    }
  }

  private drawCameraOverlay(width: number, height: number): void {
    const ctx = this.backgroundCtx;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(248,240,216,0.24)");
    gradient.addColorStop(0.48, "rgba(248,240,216,0.06)");
    gradient.addColorStop(1, "rgba(46,42,36,0.18)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawCrosshair(eye: EyeData): void {
    const ctx = this.ctx;
    const color = eye.eyeId === "left" ? COLORS.leftEye : COLORS.rightEye;
    const pulse = eye.isBlinking ? 0.72 : 1 + Math.sin(performance.now() / 240) * 0.05;

    ctx.save();
    ctx.translate(eye.screenX, eye.screenY);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.arc(0, 0, GAME.hitRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(30, 0);
    ctx.moveTo(0, -30);
    ctx.lineTo(0, -12);
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSwats(effects: Effects): void {
    const ctx = this.ctx;
    for (const swat of effects.swats) {
      const t = Math.min(swat.age / 0.38, 1);
      const impact = easeOutBack(Math.min(t * 1.6, 1));
      ctx.save();
      ctx.translate(swat.x, swat.y);
      ctx.rotate(-0.7 + impact * 1.5);
      ctx.globalAlpha = 1 - t * 0.85;
      ctx.fillStyle = swat.hit ? "rgba(240,80,87,0.2)" : "rgba(46,42,36,0.12)";
      ctx.beginPath();
      ctx.arc(0, 0, GAME.hitRadius * (0.45 + t), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#764f33";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(58, 104);
      ctx.stroke();

      ctx.fillStyle = swat.hit ? "#f04f57" : "#f5b957";
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-34, -34, 68, 54, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.ink;
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("啪", 0, -7);
      ctx.restore();
    }
  }

  private drawParticles(effects: Effects): void {
    const ctx = this.ctx;
    for (const particle of effects.particles) {
      const alpha = 1 - particle.age / particle.life;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawComboPops(effects: Effects): void {
    const ctx = this.ctx;
    for (const pop of effects.comboPops) {
      const t = pop.age / 0.75;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(pop.x, pop.y - t * 48);
      ctx.scale(1 + Math.sin(t * Math.PI) * 0.35, 1 + Math.sin(t * Math.PI) * 0.35);
      ctx.fillStyle = COLORS.warning;
      ctx.strokeStyle = "rgba(255,255,255,0.86)";
      ctx.lineWidth = 5;
      ctx.font = "900 34px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }
  }

  private drawCenteredMessage(message: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(248,240,216,0.86)";
    ctx.fillRect(0, this.height / 2 - 42, this.width, 84);
    ctx.fillStyle = COLORS.ink;
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, this.width / 2, this.height / 2);
    ctx.restore();
  }
}
