export type WebGpuIndexedPolygonScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly sides: number
  readonly radius: number
  readonly rotation: number
  readonly intensity: number
}

export const DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE: WebGpuIndexedPolygonScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  sides: 6,
  radius: 0.68,
  rotation: 14,
  intensity: 0.74,
}

export function isWebGpuIndexedPolygonScene(value: unknown): value is WebGpuIndexedPolygonScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isSides(candidate["sides"]) &&
    isRadius(candidate["radius"]) &&
    isRotation(candidate["rotation"]) &&
    isChannel(candidate["intensity"])
  )
}

export function webGpuIndexedPolygonSummary(
  scene: WebGpuIndexedPolygonScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU indexed polygon is ${runtimeStatus.toLowerCase()} with ${scene.sides} outer vertices and ${indexedPolygonIndexCount(scene)} indices targeting ${formatLabel}. The viewport clears to ${indexedPolygonClearColor(scene)} and fills a rotated polygon with radius ${scene.radius.toFixed(2)} and intensity ${scene.intensity.toFixed(2)}.`
}

export function indexedPolygonClearColor(scene: WebGpuIndexedPolygonScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function indexedPolygonPeakColor(scene: WebGpuIndexedPolygonScene): string {
  const red = Math.round((0.28 + scene.intensity * 0.64) * 255)
  const green = Math.round((0.24 + (1 - scene.green) * 0.46) * 255)
  const blue = Math.round((0.3 + (1 - scene.blue) * 0.34) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function indexedPolygonArea(scene: WebGpuIndexedPolygonScene): string {
  const area =
    0.5 * scene.sides * scene.radius * scene.radius * Math.sin((2 * Math.PI) / scene.sides)
  return `${area.toFixed(2)} clip-space units`
}

export function indexedPolygonVertexCount(scene: WebGpuIndexedPolygonScene): number {
  return scene.sides + 1
}

export function indexedPolygonIndexCount(scene: WebGpuIndexedPolygonScene): number {
  return scene.sides * 3
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isSides(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 3 && value <= 8
}

function isRadius(value: unknown): value is number {
  return typeof value === "number" && value >= 0.32 && value <= 0.84
}

function isRotation(value: unknown): value is number {
  return typeof value === "number" && value >= -180 && value <= 180
}
