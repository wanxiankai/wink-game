export type EyeId = "left" | "right";

export interface EyeData {
  eyeId: EyeId;
  screenX: number;
  screenY: number;
  isVisible: boolean;
  isBlinking: boolean;
  blinkTriggered: boolean;
  ear: number;
}

export interface PerceptionOutput {
  eyes: EyeData[];
  hasFace: boolean;
  source: "camera" | "touch";
}

export type GameState = "menu" | "tutorial" | "playing" | "paused" | "gameover";

export type FlyState = "moving" | "idle" | "fleeing" | "dead";

export type BackgroundMode = "fixed" | "camera";
