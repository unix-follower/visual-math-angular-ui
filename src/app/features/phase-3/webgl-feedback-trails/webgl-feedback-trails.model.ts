export type WebGlFeedbackTrailsScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly glow: number
  readonly drift: number
  readonly decay: number
  readonly relays: number
  readonly mix: number
}

export const DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE: WebGlFeedbackTrailsScene = {
  red: 0.03,
  green: 0.08,
  blue: 0.16,
  alpha: 1,
  glow: 0.76,
  drift: 0.34,
  decay: 0.58,
  relays: 0.54,
  mix: 0.68,
}

export function isWebGlFeedbackTrailsScene(value: unknown): value is WebGlFeedbackTrailsScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["glow"]) &&
    isChannel(candidate["drift"]) &&
    isChannel(candidate["decay"]) &&
    isChannel(candidate["relays"]) &&
    isChannel(candidate["mix"])
  )
}

export function webGlFeedbackTrailsClearColor(scene: WebGlFeedbackTrailsScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlFeedbackTrailsAccentColor(scene: WebGlFeedbackTrailsScene): string {
  return `rgb(${Math.round((scene.red + scene.glow * 0.42) * 255)}, ${Math.round((scene.green + scene.mix * 0.3) * 255)}, ${Math.round((scene.blue + scene.drift * 0.34) * 255)})`
}

export function webGlFeedbackTrailRelayCount(scene: WebGlFeedbackTrailsScene): number {
  return 4 + Math.round(scene.relays * 8)
}

export function webGlFeedbackTrailsStageLabel(scene: WebGlFeedbackTrailsScene): string {
  return `${webGlFeedbackTrailRelayCount(scene)} relays, drift ${scene.drift.toFixed(2)}, decay ${scene.decay.toFixed(2)}`
}

export function webGlFeedbackTrailsSummary(
  scene: WebGlFeedbackTrailsScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL feedback trails is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route seeds one offscreen target, then relays the image ${webGlFeedbackTrailRelayCount(scene)} times across the same two ping-pong targets before the final composite pass returns the trail field over ${webGlFeedbackTrailsClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
