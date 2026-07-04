import "./styles.css";
import { GameEngine, type GameSnapshot } from "./game/engine";
import { Fly3DRenderer } from "./game/fly3dRenderer";
import { Renderer } from "./game/renderer";
import { PerceptionModule } from "./perception/perception";
import { PERFORMANCE } from "./config";
import type { BackgroundMode, PerceptionOutput } from "./types";

const app = mustGet<HTMLElement>("app");
const backgroundCanvas = mustGet<HTMLCanvasElement>("background");
const flyCanvas = mustGet<HTMLCanvasElement>("flies3d");
const canvas = mustGet<HTMLCanvasElement>("game");
const video = mustGet<HTMLVideoElement>("camera");
const renderer = new Renderer(canvas, backgroundCanvas);
const flyRenderer = new Fly3DRenderer(flyCanvas);
const engine = new GameEngine(renderer, flyRenderer);
const perception = new PerceptionModule(video);

const screens = {
  menu: mustGet<HTMLElement>("menu"),
  tutorial: mustGet<HTMLElement>("tutorial"),
  gameover: mustGet<HTMLElement>("gameover"),
  hud: mustGet<HTMLElement>("hud")
};

const scoreEl = mustGet<HTMLElement>("score");
const comboEl = mustGet<HTMLElement>("combo");
const timerEl = mustGet<HTMLElement>("timer");
const finalScoreEl = mustGet<HTMLElement>("finalScore");
const rankEl = mustGet<HTMLElement>("rank");
const trackingStatusEl = mustGet<HTMLElement>("trackingStatus");
const tutorialStepEl = mustGet<HTMLElement>("tutorialStep");
const toastEl = mustGet<HTMLElement>("toast");
const backgroundToggle = mustGet<HTMLInputElement>("backgroundToggle");

let perceptionStarted = false;
let cameraAvailable = false;
let activeInputMode: "eyes" | "touch" = "touch";
let trackingLoop = 0;
let lastTrackingAt = 0;
let toastTimer = 0;
let lastHudScore = "";
let lastHudCombo = "";
let lastHudTimer = "";
let lastTrackingStatus = "";
let lastTutorialStep = "";

mustGet<HTMLButtonElement>("startButton").addEventListener("click", () => startWithCamera());
mustGet<HTMLButtonElement>("touchModeButton").addEventListener("click", () => startTouchGame());
mustGet<HTMLButtonElement>("skipTutorialButton").addEventListener("click", () => {
  showGameplay();
  syncPerceptionWork();
  engine.startGame();
});
mustGet<HTMLButtonElement>("restartButton").addEventListener("click", () => {
  showGameplay();
  syncPerceptionWork();
  engine.startGame();
});
mustGet<HTMLButtonElement>("homeButton").addEventListener("click", () => {
  showScreen("menu");
  engine.showMenu();
  setBackgroundMode("fixed");
  syncPerceptionWork();
});
backgroundToggle.addEventListener("change", () => {
  if (backgroundToggle.checked && !cameraAvailable) {
    setBackgroundMode("fixed");
    showToast("开启摄像头后可使用实时背景");
    return;
  }
  if (backgroundToggle.checked && activeInputMode === "touch") {
    setBackgroundMode("fixed");
    showToast("触摸模式使用固定背景");
    return;
  }
  setBackgroundMode(backgroundToggle.checked ? "camera" : "fixed");
});

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  engine.handleTouchSwat(event.clientX - rect.left, event.clientY - rect.top);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    engine.pause();
    perception.setEnabled(false);
  } else {
    engine.resume();
    syncPerceptionWork();
  }
});

engine.onUpdate(updateHud);
engine.onEnd((snapshot) => {
  finalScoreEl.textContent = `${snapshot.score} 分`;
  rankEl.textContent = snapshot.rank;
  showScreen("gameover");
  syncPerceptionWork();
});

engine.showMenu();
setBackgroundMode("fixed");
trackPerception();

async function startWithCamera(): Promise<void> {
  showScreen("tutorial");
  activeInputMode = "eyes";
  engine.setTouchMode(false);
  engine.startTutorial();
  trackingStatusEl.textContent = "正在请求摄像头权限...";
  tutorialStepEl.textContent = "请将眼睛对准摄像头";

  try {
    await lockPortrait();
    if (!perceptionStarted) {
      await perception.start();
      perceptionStarted = true;
    }
    cameraAvailable = true;
    setBackgroundMode("camera");
    syncPerceptionWork();
    trackingStatusEl.textContent = "摄像头已开启";
    showToast("检测到眨眼后会自动挥拍");
  } catch (error) {
    const message = error instanceof Error ? error.message : "摄像头初始化失败";
    trackingStatusEl.textContent = "已切换触摸模式";
    tutorialStepEl.textContent = "点击任意位置挥拍";
    showToast(message);
    activeInputMode = "touch";
    engine.setTouchMode(true);
    setBackgroundMode("fixed");
    syncPerceptionWork();
  }
}

function startTouchGame(): void {
  activeInputMode = "touch";
  engine.setTouchMode(true);
  setBackgroundMode("fixed");
  syncPerceptionWork();
  showGameplay();
  engine.startGame();
  showToast("触摸模式已开启");
}

function showGameplay(): void {
  screens.menu.classList.remove("screen--active");
  screens.tutorial.classList.remove("screen--active");
  screens.gameover.classList.remove("screen--active");
  screens.hud.classList.add("hud--active");
}

function showScreen(name: "menu" | "tutorial" | "gameover"): void {
  screens.menu.classList.toggle("screen--active", name === "menu");
  screens.tutorial.classList.toggle("screen--active", name === "tutorial");
  screens.gameover.classList.toggle("screen--active", name === "gameover");
  screens.hud.classList.toggle("hud--active", name !== "menu" && name !== "gameover");
}

function syncPerceptionWork(): void {
  const shouldRun = cameraAvailable && activeInputMode === "eyes" && !document.hidden;
  const screenAllowsTracking =
    screens.tutorial.classList.contains("screen--active") || screens.hud.classList.contains("hud--active");
  perception.setEnabled(shouldRun && screenAllowsTracking);
}

function setBackgroundMode(mode: BackgroundMode): void {
  const canUseCameraBackground = cameraAvailable && activeInputMode === "eyes";
  const nextMode = mode === "camera" && canUseCameraBackground ? "camera" : "fixed";
  renderer.setBackgroundMode(nextMode);
  renderer.setEyeFocusVisible(canUseCameraBackground && nextMode === "fixed");
  app.classList.toggle("app--camera-background", nextMode === "camera");
  backgroundToggle.checked = nextMode === "camera";
  backgroundToggle.disabled = !canUseCameraBackground;
}

function updateHud(snapshot: GameSnapshot): void {
  const score = `${snapshot.score}`;
  const combo = `x${snapshot.combo}`;
  const timer = `${snapshot.timeLeft}`;
  if (score !== lastHudScore) {
    scoreEl.textContent = score;
    lastHudScore = score;
  }
  if (combo !== lastHudCombo) {
    comboEl.textContent = combo;
    lastHudCombo = combo;
  }
  if (timer !== lastHudTimer) {
    timerEl.textContent = timer;
    lastHudTimer = timer;
  }
}

function trackPerception(now = performance.now()): void {
  trackingLoop = requestAnimationFrame(trackPerception);
  if (now - lastTrackingAt < 1000 / PERFORMANCE.activeFps) return;
  lastTrackingAt = now;
  const output = perception.getOutput();
  engine.handlePerception(output);
  updateTutorialCopy(output);
}

function updateTutorialCopy(output: PerceptionOutput): void {
  if (!screens.tutorial.classList.contains("screen--active")) return;
  if (output.source === "touch") return;
  const count = output.eyes.length;
  if (!perceptionStarted) return;
  const nextTrackingStatus = count > 0 ? `已检测到 ${count} 只眼睛` : "正在寻找眼睛";
  const nextTutorialStep = count > 0 ? "移动头部瞄准，眨眼拍击" : "请将眼睛对准摄像头";
  if (nextTrackingStatus !== lastTrackingStatus) {
    trackingStatusEl.textContent = nextTrackingStatus;
    lastTrackingStatus = nextTrackingStatus;
  }
  if (nextTutorialStep !== lastTutorialStep) {
    tutorialStepEl.textContent = nextTutorialStep;
    lastTutorialStep = nextTutorialStep;
  }
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("toast--active");
  toastTimer = window.setTimeout(() => toastEl.classList.remove("toast--active"), 2200);
}

async function lockPortrait(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
  try {
    await orientation.lock?.("portrait");
  } catch {
    // Browsers often require fullscreen before locking orientation; CSS handles the fallback.
  }
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(trackingLoop);
  perception.stop();
});
