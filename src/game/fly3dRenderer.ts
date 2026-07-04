import * as THREE from "three";
import { GAME } from "../config";
import { Fly } from "./fly";
import { createRealisticFlyModel, type FlyModelParts } from "./flyModel3d";

interface FlyInstance {
  parts: FlyModelParts;
  seed: number;
}

export class Fly3DRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly instances = new Map<number, FlyInstance>();
  private dpr = 1;
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x2b251d, 2.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-80, 140, 160);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9fd6ff, 0.9);
    rimLight.position.set(120, -80, 90);
    this.scene.add(rimLight);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  render(flies: Fly[], now = performance.now()): void {
    this.syncInstances(flies);

    for (const fly of flies) {
      const instance = this.instances.get(fly.id);
      if (!instance) continue;
      this.updateInstance(instance, fly, now / 1000);
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);

    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.near = -500;
    this.camera.far = 500;
    this.camera.position.set(0, 0, 180);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private syncInstances(flies: Fly[]): void {
    const activeIds = new Set(flies.map((fly) => fly.id));
    for (const [id, instance] of this.instances) {
      if (activeIds.has(id)) continue;
      this.scene.remove(instance.parts.root);
      this.instances.delete(id);
    }

    for (const fly of flies) {
      if (this.instances.has(fly.id)) continue;
      const parts = createRealisticFlyModel();
      const seed = Math.random() * Math.PI * 2;
      parts.root.scale.setScalar(0.92 + Math.random() * 0.18);
      this.scene.add(parts.root);
      this.instances.set(fly.id, { parts, seed });
    }
  }

  private updateInstance(instance: FlyInstance, fly: Fly, time: number): void {
    const { parts, seed } = instance;
    const root = parts.root;
    const deadProgress = fly.state === "dead" ? Math.min(fly.stateTimer / 0.45, 1) : 0;
    const alpha = fly.state === "dead" ? Math.max(0, 1 - deadProgress * 0.92) : 1;
    const velocityAngle = Math.atan2(-fly.vy, fly.vx);
    const worldX = fly.x - this.width / 2;
    const worldY = this.height / 2 - fly.y;
    const bob = fly.state === "dead" ? 0 : Math.sin(time * 8 + seed) * 2.1;
    const fleeBank = fly.state === "fleeing" ? Math.sin(time * 24 + seed) * 0.32 : Math.sin(time * 5 + seed) * 0.08;

    root.visible = alpha > 0.01;
    root.position.set(worldX, worldY + bob, 0);
    root.rotation.z = velocityAngle - Math.PI / 2 + fleeBank;
    root.rotation.y = fly.state === "dead" ? deadProgress * Math.PI * 1.8 : Math.sin(time * 4 + seed) * 0.1;
    root.rotation.x = -0.74 + (fly.state === "fleeing" ? -0.28 : 0) + deadProgress * 1.4;

    const baseScale = GAME.flyRadius / 18;
    const deadSquash = fly.state === "dead" ? 1 - deadProgress * 0.18 : 1;
    root.scale.setScalar((0.92 + Math.sin(seed) * 0.04) * baseScale * deadSquash);

    const wingSpeed = fly.state === "fleeing" ? 1.42 : fly.state === "idle" ? 0.38 : 1;
    const flap = Math.sin(fly.wingPhase * wingSpeed);
    const flapOpen = fly.state === "dead" ? 0.18 : 0.72 + Math.abs(flap) * 0.62;
    const tremor = fly.state === "idle" ? Math.sin(time * 16 + seed) * 0.05 : 0;

    parts.leftWing.rotation.set(0.18 + flapOpen * 0.58, -0.24, -0.56 - flapOpen + tremor);
    parts.rightWing.rotation.set(0.18 + flapOpen * 0.58, 0.24, 0.56 + flapOpen - tremor);

    parts.body.rotation.x = fly.state === "fleeing" ? -0.18 : Math.sin(time * 6 + seed) * 0.035;
    parts.body.rotation.y = Math.sin(time * 3.2 + seed) * 0.055;

    parts.legs.forEach((leg, index) => {
      const phase = time * (fly.state === "fleeing" ? 22 : 9) + seed + index * 0.88;
      const crawl = fly.state === "dead" ? -0.6 : Math.sin(phase) * (fly.state === "idle" ? 0.08 : 0.18);
      leg.rotation.x = crawl;
      leg.rotation.z = Math.cos(phase * 0.7) * 0.08;
    });

    parts.antennae.forEach((antenna, index) => {
      antenna.rotation.z = Math.sin(time * 10 + seed + index) * 0.08;
      antenna.rotation.x = Math.cos(time * 8 + seed + index) * 0.06;
    });

    for (const material of parts.materials) {
      material.transparent = true;
      material.opacity = alpha;
    }
  }
}
