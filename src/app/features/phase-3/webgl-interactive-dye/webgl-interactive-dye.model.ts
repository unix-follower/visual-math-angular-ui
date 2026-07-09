export type WebGlInteractiveDyeScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly swirl: number
  readonly dissipation: number
  readonly mix: number
  readonly speed: number
  readonly injectionX: number
  readonly injectionY: number
  readonly obstacleX: number
  readonly obstacleY: number
  readonly obstacleRadius: number
  readonly injectionStrength: number
}

export const DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE: WebGlInteractiveDyeScene = {
  red: 0.03,
  green: 0.05,
  blue: 0.08,
  alpha: 1,
  swirl: 0.54,
  dissipation: 0.62,
  mix: 0.68,
  speed: 1.02,
  injectionX: 0.28,
  injectionY: 0.62,
  obstacleX: 0.68,
  obstacleY: 0.42,
  obstacleRadius: 0.16,
  injectionStrength: 0.78,
}

export function isWebGlInteractiveDyeScene(value: unknown): value is WebGlInteractiveDyeScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["swirl"]) &&
    isChannel(candidate["dissipation"]) &&
    isChannel(candidate["mix"]) &&
    isBounded(candidate["speed"], 0.2, 2.4) &&
    isChannel(candidate["injectionX"]) &&
    isChannel(candidate["injectionY"]) &&
    isChannel(candidate["obstacleX"]) &&
    isChannel(candidate["obstacleY"]) &&
    isBounded(candidate["obstacleRadius"], 0.05, 0.3) &&
    isChannel(candidate["injectionStrength"])
  )
}

export function webGlInteractiveDyeClearColor(scene: WebGlInteractiveDyeScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlInteractiveDyeInjectionLabel(scene: WebGlInteractiveDyeScene): string {
  return `${scene.injectionX.toFixed(2)}, ${scene.injectionY.toFixed(2)} at ${scene.injectionStrength.toFixed(2)}`
}

export function webGlInteractiveDyeObstacleLabel(scene: WebGlInteractiveDyeScene): string {
  return `${scene.obstacleX.toFixed(2)}, ${scene.obstacleY.toFixed(2)} radius ${scene.obstacleRadius.toFixed(2)}`
}

export function webGlInteractiveDyeFlowLabel(scene: WebGlInteractiveDyeScene): string {
  return `swirl ${scene.swirl.toFixed(2)}, retention ${scene.dissipation.toFixed(2)}, mix ${scene.mix.toFixed(2)}`
}

export function webGlInteractiveDyeSummary(
  scene: WebGlInteractiveDyeScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL interactive dye is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route keeps a feedback texture alive across frames, injects dye at a user-selected position, and bends the field around a draggable obstacle over ${webGlInteractiveDyeClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isBounded(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && value >= min && value <= max
}
