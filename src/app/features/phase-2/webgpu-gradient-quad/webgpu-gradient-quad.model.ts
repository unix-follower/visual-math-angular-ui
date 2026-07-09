export type WebGpuGradientQuadScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly inset: number
  readonly tilt: number
  readonly intensity: number
}

export const DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE: WebGpuGradientQuadScene = {
  red: 0.08,
  green: 0.14,
  blue: 0.22,
  alpha: 1,
  inset: 0.22,
  tilt: 0.12,
  intensity: 0.78,
}

export function isWebGpuGradientQuadScene(value: unknown): value is WebGpuGradientQuadScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isInset(candidate["inset"]) &&
    isTilt(candidate["tilt"]) &&
    isChannel(candidate["intensity"])
  )
}

export function webGpuGradientQuadSummary(
  scene: WebGpuGradientQuadScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU gradient quad is ${runtimeStatus.toLowerCase()} with a six-vertex quad draw targeting ${formatLabel}. The viewport clears to ${gradientQuadClearColor(scene)} and overlays a tilted gradient surface with inset ${scene.inset.toFixed(2)} and intensity ${scene.intensity.toFixed(2)}.`
}

export function gradientQuadClearColor(scene: WebGpuGradientQuadScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function gradientQuadArea(scene: WebGpuGradientQuadScene): string {
  const side = 2 - scene.inset * 2
  return `${(side * side).toFixed(2)} clip-space units`
}

export function gradientQuadPeakColor(scene: WebGpuGradientQuadScene): string {
  const red = Math.round((0.3 + scene.intensity * 0.6) * 255)
  const green = Math.round((0.26 + (1 - scene.green) * 0.42) * 255)
  const blue = Math.round((0.32 + (1 - scene.blue) * 0.36) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isInset(value: unknown): value is number {
  return typeof value === "number" && value >= 0.08 && value <= 0.42
}

function isTilt(value: unknown): value is number {
  return typeof value === "number" && value >= -0.35 && value <= 0.35
}
