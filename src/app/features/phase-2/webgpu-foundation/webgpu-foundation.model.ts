export type WebGpuFoundationScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly triangleScale: number
  readonly accent: number
}

export const DEFAULT_WEBGPU_FOUNDATION_SCENE: WebGpuFoundationScene = {
  red: 0.14,
  green: 0.23,
  blue: 0.39,
  alpha: 1,
  triangleScale: 0.62,
  accent: 0.78,
}

export function isWebGpuFoundationScene(value: unknown): value is WebGpuFoundationScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isColorChannel(candidate["red"]) &&
    isColorChannel(candidate["green"]) &&
    isColorChannel(candidate["blue"]) &&
    isColorChannel(candidate["alpha"]) &&
    isTriangleScale(candidate["triangleScale"]) &&
    isColorChannel(candidate["accent"])
  )
}

export function formatClearColor(scene: WebGpuFoundationScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGpuFoundationSummary(
  scene: WebGpuFoundationScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU foundation is ${runtimeStatus.toLowerCase()} with a pipeline-backed triangle draw targeting ${formatLabel}. The viewport clears to ${formatClearColor(scene)} and overlays a triangle at ${Math.round(scene.triangleScale * 100)}% scale with accent ${scene.accent.toFixed(2)} so later Phase 2 slices can grow from real shaders and vertex buffers instead of a clear pass alone.`
}

export function triangleAreaEstimate(scene: WebGpuFoundationScene): string {
  return `${(scene.triangleScale * scene.triangleScale * 0.42).toFixed(2)} viewport units`
}

export function triangleColorLabel(scene: WebGpuFoundationScene): string {
  const red = Math.round((0.25 + scene.accent * 0.55) * 255)
  const green = Math.round((0.35 + (1 - scene.red) * 0.35) * 255)
  const blue = Math.round((0.3 + (1 - scene.blue) * 0.4) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

function isColorChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isTriangleScale(value: unknown): value is number {
  return typeof value === "number" && value >= 0.25 && value <= 0.95
}
