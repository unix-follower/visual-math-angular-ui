export type WebGlDualPassScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly glow: number
  readonly skew: number
  readonly mix: number
}

export const DEFAULT_WEBGL_DUAL_PASS_SCENE: WebGlDualPassScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.2,
  alpha: 1,
  glow: 0.68,
  skew: 0.42,
  mix: 0.58,
}

export function isWebGlDualPassScene(value: unknown): value is WebGlDualPassScene {
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
    isChannel(candidate["skew"]) &&
    isChannel(candidate["mix"])
  )
}

export function webGlDualPassClearColor(scene: WebGlDualPassScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlDualPassAccentColor(scene: WebGlDualPassScene): string {
  return `rgb(${Math.round((scene.red + scene.glow * 0.42) * 255)}, ${Math.round((scene.green + scene.mix * 0.36) * 255)}, ${Math.round((scene.blue + scene.skew * 0.3) * 255)})`
}

export function webGlDualPassStageLabel(scene: WebGlDualPassScene): string {
  return `Pass 1 skew ${scene.skew.toFixed(2)}, pass 2 mix ${scene.mix.toFixed(2)}`
}

export function webGlDualPassSummary(
  scene: WebGlDualPassScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL dual pass is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route renders glowing geometry into an offscreen texture during the first pass, then composites that texture back onto the presentation canvas with mix ${scene.mix.toFixed(2)} over ${webGlDualPassClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
