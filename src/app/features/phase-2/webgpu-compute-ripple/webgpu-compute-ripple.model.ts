export type WebGpuComputeRippleScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly amplitude: number
  readonly frequency: number
  readonly drift: number
}

export const DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE: WebGpuComputeRippleScene = {
  red: 0.07,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  amplitude: 0.56,
  frequency: 0.62,
  drift: 0.34,
}

export function isWebGpuComputeRippleScene(value: unknown): value is WebGpuComputeRippleScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["amplitude"]) &&
    isChannel(candidate["frequency"]) &&
    isChannel(candidate["drift"])
  )
}

export function webGpuComputeRippleSummary(
  scene: WebGpuComputeRippleScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU compute ripple is ${runtimeStatus.toLowerCase()} with a compute pass writing ripple geometry into a shared storage-plus-vertex buffer before a render pass draws it on ${formatLabel}. The viewport clears to ${computeRippleClearColor(scene)} while amplitude ${scene.amplitude.toFixed(2)}, frequency ${scene.frequency.toFixed(2)}, and drift ${scene.drift.toFixed(2)} shape the GPU-written vertices.`
}

export function computeRippleClearColor(scene: WebGpuComputeRippleScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function computeRippleAccentColor(scene: WebGpuComputeRippleScene): string {
  const red = Math.round((0.18 + scene.amplitude * 0.46 + scene.drift * 0.12) * 255)
  const green = Math.round((0.2 + scene.frequency * 0.28 + scene.drift * 0.14) * 255)
  const blue = Math.round((0.18 + scene.blue * 0.28 + (1 - scene.amplitude) * 0.16) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function computeRippleStageLabel(scene: WebGpuComputeRippleScene): string {
  return `Compute + render / drift ${scene.drift.toFixed(2)}`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
