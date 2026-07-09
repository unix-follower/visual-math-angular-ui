export type WebGpuDualPassScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly glow: number
  readonly skew: number
  readonly mix: number
}

export const DEFAULT_WEBGPU_DUAL_PASS_SCENE: WebGpuDualPassScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.2,
  alpha: 1,
  glow: 0.68,
  skew: 0.42,
  mix: 0.58,
}

export function isWebGpuDualPassScene(value: unknown): value is WebGpuDualPassScene {
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

export function webGpuDualPassSummary(
  scene: WebGpuDualPassScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU dual pass is ${runtimeStatus.toLowerCase()} with an offscreen render target feeding a second compositing pass on ${formatLabel}. The viewport clears to ${dualPassClearColor(scene)} while glow ${scene.glow.toFixed(2)}, skew ${scene.skew.toFixed(2)}, and mix ${scene.mix.toFixed(2)} reshape the first-pass surface before the second-pass composite.`
}

export function dualPassClearColor(scene: WebGpuDualPassScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function dualPassAccentColor(scene: WebGpuDualPassScene): string {
  const red = Math.round((0.18 + scene.glow * 0.42 + scene.mix * 0.12) * 255)
  const green = Math.round((0.2 + scene.skew * 0.24 + scene.mix * 0.18) * 255)
  const blue = Math.round((0.22 + scene.blue * 0.26 + (1 - scene.mix) * 0.16) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function dualPassStageLabel(scene: WebGpuDualPassScene): string {
  return `2 passes / mix ${scene.mix.toFixed(2)}`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
