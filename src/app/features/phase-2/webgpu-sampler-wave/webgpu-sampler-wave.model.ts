export type WebGpuSamplerWaveScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly frequency: number
  readonly softness: number
  readonly blend: number
}

export const DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE: WebGpuSamplerWaveScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.22,
  alpha: 1,
  frequency: 0.58,
  softness: 0.62,
  blend: 0.54,
}

export function isWebGpuSamplerWaveScene(value: unknown): value is WebGpuSamplerWaveScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["frequency"]) &&
    isChannel(candidate["softness"]) &&
    isChannel(candidate["blend"])
  )
}

export function webGpuSamplerWaveSummary(
  scene: WebGpuSamplerWaveScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU sampler wave is ${runtimeStatus.toLowerCase()} with a sampler-filtered texture targeting ${formatLabel}. The viewport clears to ${samplerWaveClearColor(scene)} while frequency ${scene.frequency.toFixed(2)}, softness ${scene.softness.toFixed(2)}, and blend ${scene.blend.toFixed(2)} reshape the uploaded texture before filtered sampling across the quad.`
}

export function samplerWaveClearColor(scene: WebGpuSamplerWaveScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function samplerWaveAccentColor(scene: WebGpuSamplerWaveScene): string {
  const red = Math.round((0.2 + scene.frequency * 0.34 + scene.blend * 0.18) * 255)
  const green = Math.round((0.18 + scene.softness * 0.42) * 255)
  const blue = Math.round((0.24 + scene.blue * 0.28 + (1 - scene.softness) * 0.14) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function samplerWaveFootprint(scene: WebGpuSamplerWaveScene): string {
  return `8x8 / filter ${scene.softness >= 0.5 ? "linear" : "nearest"}`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
