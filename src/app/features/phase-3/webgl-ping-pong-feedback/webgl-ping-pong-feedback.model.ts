export type WebGlPingPongFeedbackScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly energy: number
  readonly drift: number
  readonly feedback: number
}

export const DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE: WebGlPingPongFeedbackScene = {
  red: 0.04,
  green: 0.08,
  blue: 0.16,
  alpha: 1,
  energy: 0.72,
  drift: 0.34,
  feedback: 0.62,
}

export function isWebGlPingPongFeedbackScene(value: unknown): value is WebGlPingPongFeedbackScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["energy"]) &&
    isChannel(candidate["drift"]) &&
    isChannel(candidate["feedback"])
  )
}

export function webGlPingPongFeedbackClearColor(scene: WebGlPingPongFeedbackScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlPingPongFeedbackAccentColor(scene: WebGlPingPongFeedbackScene): string {
  return `rgb(${Math.round((scene.red + scene.energy * 0.4) * 255)}, ${Math.round((scene.green + scene.feedback * 0.34) * 255)}, ${Math.round((scene.blue + scene.drift * 0.3) * 255)})`
}

export function webGlPingPongFeedbackStageLabel(scene: WebGlPingPongFeedbackScene): string {
  return `Drift ${scene.drift.toFixed(2)}, feedback ${scene.feedback.toFixed(2)}`
}

export function webGlPingPongFeedbackSummary(
  scene: WebGlPingPongFeedbackScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL ping-pong feedback is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route seeds one offscreen texture with emissive geometry, bounces that image through a second texture, and then samples the returned surface back to the presentation canvas with feedback ${scene.feedback.toFixed(2)} over ${webGlPingPongFeedbackClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
