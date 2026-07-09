export type WebGlMultiObstacleFlowScene = {
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
  readonly injectionStrength: number
  readonly primaryX: number
  readonly primaryY: number
  readonly primaryRadius: number
  readonly secondaryX: number
  readonly secondaryY: number
  readonly secondaryRadius: number
}

export const DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE: WebGlMultiObstacleFlowScene = {
  red: 0.03,
  green: 0.05,
  blue: 0.08,
  alpha: 1,
  swirl: 0.58,
  dissipation: 0.62,
  mix: 0.68,
  speed: 1.04,
  injectionX: 0.24,
  injectionY: 0.62,
  injectionStrength: 0.78,
  primaryX: 0.42,
  primaryY: 0.5,
  primaryRadius: 0.16,
  secondaryX: 0.74,
  secondaryY: 0.38,
  secondaryRadius: 0.12,
}

export function isWebGlMultiObstacleFlowScene(
  value: unknown,
): value is WebGlMultiObstacleFlowScene {
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
    isChannel(candidate["injectionStrength"]) &&
    isChannel(candidate["primaryX"]) &&
    isChannel(candidate["primaryY"]) &&
    isBounded(candidate["primaryRadius"], 0.05, 0.3) &&
    isChannel(candidate["secondaryX"]) &&
    isChannel(candidate["secondaryY"]) &&
    isBounded(candidate["secondaryRadius"], 0.05, 0.3)
  )
}

export function webGlMultiObstacleFlowClearColor(scene: WebGlMultiObstacleFlowScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlMultiObstacleFlowInjectionLabel(scene: WebGlMultiObstacleFlowScene): string {
  return `${scene.injectionX.toFixed(2)}, ${scene.injectionY.toFixed(2)} at ${scene.injectionStrength.toFixed(2)}`
}

export function webGlMultiObstacleFlowPrimaryLabel(scene: WebGlMultiObstacleFlowScene): string {
  return `${scene.primaryX.toFixed(2)}, ${scene.primaryY.toFixed(2)} radius ${scene.primaryRadius.toFixed(2)}`
}

export function webGlMultiObstacleFlowSecondaryLabel(scene: WebGlMultiObstacleFlowScene): string {
  return `${scene.secondaryX.toFixed(2)}, ${scene.secondaryY.toFixed(2)} radius ${scene.secondaryRadius.toFixed(2)}`
}

export function webGlMultiObstacleFlowSummary(
  scene: WebGlMultiObstacleFlowScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL multi-obstacle flow is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route keeps a feedback texture alive across frames, injects dye at a user-selected source, and bends the field around two draggable obstacles over ${webGlMultiObstacleFlowClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isBounded(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && value >= min && value <= max
}
