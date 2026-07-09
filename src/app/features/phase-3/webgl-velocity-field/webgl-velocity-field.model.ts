export type WebGlVelocityFieldScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly swirl: number
  readonly shear: number
  readonly injection: number
  readonly dissipation: number
  readonly mix: number
  readonly speed: number
}

export const DEFAULT_WEBGL_VELOCITY_FIELD_SCENE: WebGlVelocityFieldScene = {
  red: 0.02,
  green: 0.05,
  blue: 0.1,
  alpha: 1,
  swirl: 0.62,
  shear: 0.38,
  injection: 0.74,
  dissipation: 0.56,
  mix: 0.64,
  speed: 0.98,
}

export function isWebGlVelocityFieldScene(value: unknown): value is WebGlVelocityFieldScene {
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
    isChannel(candidate["shear"]) &&
    isChannel(candidate["injection"]) &&
    isChannel(candidate["dissipation"]) &&
    isChannel(candidate["mix"]) &&
    isSpeed(candidate["speed"])
  )
}

export function webGlVelocityFieldClearColor(scene: WebGlVelocityFieldScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlVelocityFieldAccentColor(scene: WebGlVelocityFieldScene): string {
  return `rgb(${Math.round((0.2 + scene.injection * 0.54) * 255)}, ${Math.round((0.34 + scene.swirl * 0.36) * 255)}, ${Math.round((0.48 + scene.shear * 0.28) * 255)})`
}

export function webGlVelocityFieldFlowLabel(scene: WebGlVelocityFieldScene): string {
  return `swirl ${scene.swirl.toFixed(2)}, shear ${scene.shear.toFixed(2)}`
}

export function webGlVelocityFieldMemoryLabel(scene: WebGlVelocityFieldScene): string {
  return `${Math.round((0.38 + scene.dissipation * 0.44) * 100)}% retained`
}

export function webGlVelocityFieldSummary(
  scene: WebGlVelocityFieldScene,
  runtimeStatus: string,
  phase: number,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL velocity field is ${runtimeStatus.toLowerCase()} on ${versionLabel}. Each frame advects the previous texture through a synthetic velocity field with ${webGlVelocityFieldFlowLabel(scene)}, injects fresh dye, and composites the evolving fluid-like surface at phase ${phase.toFixed(2)} over ${webGlVelocityFieldClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isSpeed(value: unknown): value is number {
  return typeof value === "number" && value >= 0.2 && value <= 2.4
}
