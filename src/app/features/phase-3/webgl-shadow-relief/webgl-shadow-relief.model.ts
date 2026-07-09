export type WebGlShadowReliefScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly warmth: number
  readonly relief: number
  readonly shadow: number
  readonly gloss: number
  readonly lightX: number
  readonly lightY: number
}

export const DEFAULT_WEBGL_SHADOW_RELIEF_SCENE: WebGlShadowReliefScene = {
  red: 0.04,
  green: 0.06,
  blue: 0.1,
  alpha: 1,
  warmth: 0.64,
  relief: 0.58,
  shadow: 0.52,
  gloss: 0.44,
  lightX: 0.76,
  lightY: 0.72,
}

export function isWebGlShadowReliefScene(value: unknown): value is WebGlShadowReliefScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["warmth"]) &&
    isChannel(candidate["relief"]) &&
    isChannel(candidate["shadow"]) &&
    isChannel(candidate["gloss"]) &&
    isChannel(candidate["lightX"]) &&
    isChannel(candidate["lightY"])
  )
}

export function webGlShadowReliefClearColor(scene: WebGlShadowReliefScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlShadowReliefBaseColor(scene: WebGlShadowReliefScene): string {
  return `rgb(${Math.round((0.24 + scene.warmth * 0.58) * 255)}, ${Math.round((0.34 + scene.relief * 0.26) * 255)}, ${Math.round((0.54 + scene.shadow * 0.28) * 255)})`
}

export function webGlShadowReliefLightDirection(scene: WebGlShadowReliefScene): string {
  return `${(scene.lightX * 2 - 1).toFixed(2)}, ${(scene.lightY * 2 - 1).toFixed(2)}, 0.78`
}

export function webGlShadowReliefFinishLabel(scene: WebGlShadowReliefScene): string {
  return `relief ${scene.relief.toFixed(2)}, shadow ${scene.shadow.toFixed(2)}, gloss ${scene.gloss.toFixed(2)}`
}

export function webGlShadowReliefSummary(
  scene: WebGlShadowReliefScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL shadow relief is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route derives normals from a procedural height field and shades them with contact-shadow cues, directional light, and glossy highlights over ${webGlShadowReliefClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
