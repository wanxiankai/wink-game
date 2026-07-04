import { FaceMesh, type Results } from "@mediapipe/face_mesh";
import { GAME, PERFORMANCE } from "../config";
import type { EyeData, EyeId, PerceptionOutput } from "../types";
import { clamp } from "../utils";
import { calculateEar } from "./ear";

type Landmark = { x: number; y: number; z?: number };

const LEFT_EAR = [33, 160, 158, 133, 153, 144];
const RIGHT_EAR = [362, 385, 387, 263, 373, 380];
const LEFT_FALLBACK = [33, 133, 159, 145];
const RIGHT_FALLBACK = [362, 263, 386, 374];

interface BlinkState {
  closedFrames: number;
  lastBlinkAt: number;
  isBlinking: boolean;
  triggeredInClosure: boolean;
}

interface RawEyeData {
  eyeId: EyeId;
  screenX: number;
  screenY: number;
  isVisible: boolean;
  ear: number;
}

export class PerceptionModule {
  private faceMesh?: FaceMesh;
  private stream?: MediaStream;
  private raf = 0;
  private processing = false;
  private enabled = false;
  private lastInferenceAt = 0;
  private latest: PerceptionOutput = { eyes: [], hasFace: false, source: "camera" };
  private readonly blinkStates: Record<EyeId, BlinkState> = {
    left: { closedFrames: 0, lastBlinkAt: 0, isBlinking: false, triggeredInClosure: false },
    right: { closedFrames: 0, lastBlinkAt: 0, isBlinking: false, triggeredInClosure: false }
  };

  constructor(private readonly video: HTMLVideoElement) {}

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("当前浏览器不支持摄像头");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: PERFORMANCE.cameraWidth },
        height: { ideal: PERFORMANCE.cameraHeight }
      },
      audio: false
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.faceMesh.onResults((results: Results) => this.handleResults(results));
    this.tick();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.enabled = false;
  }

  getOutput(): PerceptionOutput {
    return this.latest;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.latest = { eyes: [], hasFace: false, source: "camera" };
    }
  }

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.enabled || document.hidden) return;
    if (!this.faceMesh || this.processing || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const now = performance.now();
    const inferenceInterval = 1000 / PERFORMANCE.perceptionFps;
    if (now - this.lastInferenceAt < inferenceInterval) return;

    this.processing = true;
    this.lastInferenceAt = now;
    this.faceMesh
      .send({ image: this.video })
      .catch(() => {
        this.latest = { eyes: [], hasFace: false, source: "camera" };
      })
      .finally(() => {
        this.processing = false;
      });
  };

  private handleResults(results: Results): void {
    if (!this.enabled) return;
    const landmarks = results.multiFaceLandmarks?.[0] as Landmark[] | undefined;
    if (!landmarks) {
      this.latest = { eyes: [], hasFace: false, source: "camera" };
      return;
    }

    const rawEyes = [
      this.extractEye("left", landmarks, LEFT_EAR, LEFT_FALLBACK),
      this.extractEye("right", landmarks, RIGHT_EAR, RIGHT_FALLBACK)
    ];
    const eyes: EyeData[] = rawEyes
      .map((eye) => {
        const blink = this.updateBlinkState(eye.eyeId, eye.ear);
        return {
          ...eye,
          isBlinking: blink.isBlinking,
          blinkTriggered: blink.blinkTriggered
        };
      })
      .filter((eye) => eye.isVisible);

    this.latest = { eyes, hasFace: true, source: "camera" };
  }

  private extractEye(
    eyeId: EyeId,
    landmarks: Landmark[],
    earIndices: number[],
    centerIndices: number[]
  ): RawEyeData {
    const earPoints = earIndices.map((index) => landmarks[index]).filter(Boolean);
    const center = averageLandmarks(centerIndices.map((index) => landmarks[index]));
    const ear = calculateEar(earPoints);
    const visible = Boolean(center) && center.x > 0.02 && center.x < 0.98 && center.y > 0.02 && center.y < 0.98;

    return {
      eyeId,
      ...this.mapVideoPointToScreen(center),
      isVisible: visible,
      ear
    };
  }

  private mapVideoPointToScreen(point: Landmark): { screenX: number; screenY: number } {
    const rect = this.video.getBoundingClientRect();
    const viewportWidth = rect.width || window.innerWidth;
    const viewportHeight = rect.height || window.innerHeight;
    const videoWidth = this.video.videoWidth || viewportWidth;
    const videoHeight = this.video.videoHeight || viewportHeight;
    const scale = Math.max(viewportWidth / videoWidth, viewportHeight / videoHeight);
    const renderedWidth = videoWidth * scale;
    const renderedHeight = videoHeight * scale;
    const offsetX = rect.left + (viewportWidth - renderedWidth) / 2;
    const offsetY = rect.top + (viewportHeight - renderedHeight) / 2;

    const mirroredX = 1 - point.x;
    return {
      screenX: clamp(offsetX + mirroredX * renderedWidth, 0, window.innerWidth),
      screenY: clamp(offsetY + point.y * renderedHeight, 0, window.innerHeight)
    };
  }

  private updateBlinkState(
    eyeId: EyeId,
    ear: number
  ): { isBlinking: boolean; blinkTriggered: boolean } {
    const state = this.blinkStates[eyeId];
    const now = performance.now();
    const closed = ear < GAME.earClosedThreshold;

    state.closedFrames = closed ? state.closedFrames + 1 : 0;
    state.isBlinking = closed;
    if (!closed) state.triggeredInClosure = false;

    const canTrigger = now - state.lastBlinkAt > GAME.blinkCooldownMs;
    const blinkTriggered =
      closed && state.closedFrames >= GAME.blinkClosedFrames && canTrigger && !state.triggeredInClosure;
    if (blinkTriggered) {
      state.lastBlinkAt = now;
      state.triggeredInClosure = true;
    }
    return { isBlinking: state.isBlinking, blinkTriggered };
  }
}

function averageLandmarks(points: Array<Landmark | undefined>): Landmark {
  const visible = points.filter(Boolean) as Landmark[];
  if (visible.length === 0) return { x: 0.5, y: 0.5 };
  return {
    x: visible.reduce((sum, point) => sum + point.x, 0) / visible.length,
    y: visible.reduce((sum, point) => sum + point.y, 0) / visible.length
  };
}
