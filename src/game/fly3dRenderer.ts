import * as THREE from "three";
import { GAME } from "../config";
import { Fly } from "./fly";
import { createRealisticFlyModel, type FlyModelParts } from "./flyModel3d";

interface FlyInstance {
  parts: FlyModelParts;
  seed: number;
  sizeVariance: number;
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
      const sizeVariance = 0.96 + Math.random() * 0.08;
      parts.root.scale.setScalar(GAME.flyGroundScale * sizeVariance);
      this.scene.add(parts.root);
      this.instances.set(fly.id, { parts, seed, sizeVariance });
    }
  }

  private updateInstance(instance: FlyInstance, fly: Fly, time: number): void {
    const { parts, seed, sizeVariance } = instance;
    const root = parts.root;
    const deadProgress = fly.state === "dead" ? Math.min(fly.stateTimer / 0.45, 1) : 0;
    const alpha = fly.state === "dead" ? Math.max(0, 1 - deadProgress * 0.92) : 1;
    const velocityAngle = Math.atan2(-fly.vy, fly.vx);
    const worldX = fly.x - this.width / 2;
    const worldY = this.height / 2 - fly.y;
    const flightLift = fly.altitude;
    const isFlying = fly.state === "fleeing" && flightLift > 1;
    const bob = fly.state === "dead" ? 0 : isFlying ? 0 : Math.sin(fly.crawlPhase + seed) * 0.7;
    const crawlBank = isFlying ? 0 : Math.sin(fly.crawlPhase * 0.45 + seed) * 0.045;

    root.visible = alpha > 0.01;
    root.position.set(worldX, worldY + bob - flightLift * 0.04, flightLift);
    root.rotation.z = velocityAngle - Math.PI / 2 + crawlBank;
    root.rotation.y = fly.state === "dead" ? deadProgress * Math.PI * 1.8 : 0;
    root.rotation.x = -0.1 + (isFlying ? -0.12 : 0) + deadProgress * 1.4;

    const baseScale = GAME.flyRadius / 18;
    const deadSquash = fly.state === "dead" ? 1 - deadProgress * 0.18 : 1;
    const altitudeRatio = Math.min(flightLift / GAME.flyFlightAltitude, 1);
    const perspectiveScale = 1 + Math.pow(altitudeRatio, 1.18) * GAME.flyFlightScaleBoost;
    const scaleBreath = isFlying ? 0 : Math.sin(fly.crawlPhase + seed) * 0.006;
    root.scale.setScalar(GAME.flyGroundScale * sizeVariance * perspectiveScale * baseScale * deadSquash + scaleBreath);

    const flap = Math.sin(fly.wingPhase * 1.5);
    const groundedWingTwitch = fly.state === "idle" ? Math.sin(time * 16 + seed) * 0.035 : Math.sin(fly.crawlPhase + seed) * 0.018;

    if (isFlying) {
      const flapOpen = 0.72 + Math.abs(flap) * 0.76;
      parts.leftWing.visible = true;
      parts.rightWing.visible = true;
      parts.foldedWings.forEach((wing) => {
        wing.visible = false;
      });
      parts.leftWing.scale.set(1, 1, 1);
      parts.rightWing.scale.set(1, 1, 1);
      parts.leftWing.rotation.set(0.2 + flapOpen * 0.62, -0.24, -0.68 - flapOpen);
      parts.rightWing.rotation.set(0.2 + flapOpen * 0.62, 0.24, 0.68 + flapOpen);
    } else {
      parts.leftWing.visible = false;
      parts.rightWing.visible = false;
      parts.foldedWings.forEach((wing) => {
        wing.visible = false;
      });
      parts.leftWing.scale.set(0.16, 0.06, 1);
      parts.rightWing.scale.set(0.16, 0.06, 1);
      parts.leftWing.rotation.set(0.01, -0.02, 1.58 + groundedWingTwitch * 0.35);
      parts.rightWing.rotation.set(0.01, 0.02, -1.58 - groundedWingTwitch * 0.35);
    }

    parts.body.rotation.x = isFlying ? 0 : Math.sin(fly.crawlPhase * 0.8 + seed) * 0.018;
    parts.body.rotation.y = isFlying ? 0 : Math.sin(fly.crawlPhase * 0.5 + seed) * 0.025;

    parts.legs.forEach((leg, index) => {
      const phase = fly.crawlPhase + seed + index * 1.18;
      if (fly.state === "dead") {
        leg.rotation.x = -0.6;
        leg.rotation.z = 0.12;
      } else if (isFlying) {
        leg.rotation.x = -0.32;
        leg.rotation.z = 0.04;
      } else {
        const crawlAmount = fly.state === "idle" ? 0.045 : 0.28;
        leg.rotation.x = Math.sin(phase) * crawlAmount;
        leg.rotation.z = Math.cos(phase * 0.7) * 0.12;
      }
    });

    parts.antennae.forEach((antenna, index) => {
      antenna.rotation.z = Math.sin(time * 10 + seed + index) * 0.08;
      antenna.rotation.x = Math.cos(time * 8 + seed + index) * 0.06;
    });

    const shadowMaterial = parts.shadow.material as THREE.Material;
    shadowMaterial.opacity = Math.max(0.015, 0.12 - flightLift / 360) * alpha;
    parts.shadow.scale.set(0.72 + flightLift / 110, 0.3 + flightLift / 260, 1);

    for (const material of parts.materials) {
      material.transparent = true;
      if (material === shadowMaterial) continue;
      material.opacity = ((material.userData.baseOpacity as number | undefined) ?? 1) * alpha;
    }
    this.setWingVisibility(parts, isFlying, alpha);
  }

  private setWingVisibility(parts: FlyModelParts, isFlying: boolean, alpha: number): void {
    const wingOpacityScale = isFlying ? 1 : 0.06;
    const applyOpacity = (object: THREE.Object3D): void => {
      const mesh = object as THREE.Mesh | THREE.Line;
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        material.transparent = true;
        material.opacity = ((material.userData.baseOpacity as number | undefined) ?? 1) * alpha * wingOpacityScale;
      }
    };

    parts.leftWing.traverse(applyOpacity);
    parts.rightWing.traverse(applyOpacity);
  }
}
