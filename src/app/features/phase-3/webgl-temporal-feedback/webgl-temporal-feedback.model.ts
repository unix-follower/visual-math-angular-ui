export type WebGlTemporalFeedbackScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly injection: number
  readonly drift: number
  readonly decay: number
  readonly mix: number
  readonly speed: number
}

export const DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE: WebGlTemporalFeedbackScene = {
  red: 0.02,
  green: 0.05,
  blue: 0.11,
  alpha: 1,
  injection: 0.74,
  drift: 0.34,
  decay: 0.62,
  mix: 0.68,
  speed: 0.92,
}

export function isWebGlTemporalFeedbackScene(value: unknown): value is WebGlTemporalFeedbackScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["injection"]) &&
    isChannel(candidate["drift"]) &&
    isChannel(candidate["decay"]) &&
    isChannel(candidate["mix"]) &&
    isSpeed(candidate["speed"])
  )
}

export function webGlTemporalFeedbackClearColor(scene: WebGlTemporalFeedbackScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlTemporalFeedbackAccentColor(scene: WebGlTemporalFeedbackScene): string {
  return `rgb(${Math.round((scene.red + scene.injection * 0.56) * 255)}, ${Math.round((scene.green + scene.mix * 0.42) * 255)}, ${Math.round((scene.blue + scene.drift * 0.58) * 255)})`
}

export function webGlTemporalFeedbackPersistence(scene: WebGlTemporalFeedbackScene): string {
  return `${Math.round((0.38 + scene.decay * 0.48) * 100)}% retained per frame`
}

export function webGlTemporalFeedbackStageLabel(scene: WebGlTemporalFeedbackScene): string {
  return `1 relay per frame, drift ${scene.drift.toFixed(2)}, decay ${scene.decay.toFixed(2)}`
}

export function webGlTemporalFeedbackSummary(
  scene: WebGlTemporalFeedbackScene,
  runtimeStatus: string,
  phase: number,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL temporal feedback is ${runtimeStatus.toLowerCase()} on ${versionLabel}. Each animation frame relays the previous offscreen texture forward once, injects a fresh procedural pulse at phase ${phase.toFixed(2)}, and composites the evolving field over ${webGlTemporalFeedbackClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isSpeed(value: unknown): value is number {
  return typeof value === "number" && value >= 0.2 && value <= 2.4
}
