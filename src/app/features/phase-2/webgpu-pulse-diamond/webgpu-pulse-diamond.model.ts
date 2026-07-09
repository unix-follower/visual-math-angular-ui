export type WebGpuPulseDiamondScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly pulseAmplitude: number
  readonly speed: number
  readonly skew: number
  readonly glow: number
}

export const DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE: WebGpuPulseDiamondScene = {
  red: 0.05,
  green: 0.08,
  blue: 0.18,
  alpha: 1,
  pulseAmplitude: 0.22,
  speed: 1.1,
  skew: 0.14,
  glow: 0.72,
}

export function isWebGpuPulseDiamondScene(value: unknown): value is WebGpuPulseDiamondScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isPulseAmplitude(candidate["pulseAmplitude"]) &&
    isSpeed(candidate["speed"]) &&
    isSkew(candidate["skew"]) &&
    isChannel(candidate["glow"])
  )
}

export function webGpuPulseDiamondSummary(
  scene: WebGpuPulseDiamondScene,
  runtimeStatus: string,
  phase: number,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU pulse diamond is ${runtimeStatus.toLowerCase()} with animated per-frame vertex updates targeting ${formatLabel}. The viewport clears to ${pulseDiamondClearColor(scene)} while the diamond pulses at speed ${scene.speed.toFixed(2)} with glow ${scene.glow.toFixed(2)} and current phase ${phase.toFixed(2)}.`
}

export function pulseDiamondClearColor(scene: WebGpuPulseDiamondScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function pulseDiamondPeakColor(scene: WebGpuPulseDiamondScene): string {
  const red = Math.round((0.34 + scene.glow * 0.58) * 255)
  const green = Math.round((0.24 + (1 - scene.green) * 0.38) * 255)
  const blue = Math.round((0.28 + (1 - scene.blue) * 0.42) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function pulseDiamondScale(scene: WebGpuPulseDiamondScene, phase: number): number {
  return Number((0.5 + scene.pulseAmplitude * Math.sin(phase * Math.PI * 2)).toFixed(3))
}

export function pulseDiamondArea(scene: WebGpuPulseDiamondScene, phase: number): string {
  const scale = pulseDiamondScale(scene, phase)
  const width = scale * (1.25 + Math.abs(scene.skew))
  const height = scale * 2

  return `${(width * height * 0.5).toFixed(2)} clip-space units`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isPulseAmplitude(value: unknown): value is number {
  return typeof value === "number" && value >= 0.05 && value <= 0.32
}

function isSpeed(value: unknown): value is number {
  return typeof value === "number" && value >= 0.2 && value <= 2.4
}

function isSkew(value: unknown): value is number {
  return typeof value === "number" && value >= -0.28 && value <= 0.28
}
