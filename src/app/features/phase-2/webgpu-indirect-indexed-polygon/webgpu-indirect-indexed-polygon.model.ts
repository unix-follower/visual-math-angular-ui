export type WebGpuIndirectIndexedPolygonScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly sides: number
  readonly radius: number
  readonly rotation: number
  readonly intensity: number
  readonly coverage: number
}

export const DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE: WebGpuIndirectIndexedPolygonScene = {
  red: 0.05,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  sides: 7,
  radius: 0.66,
  rotation: 10,
  intensity: 0.76,
  coverage: 0.78,
}

export function isWebGpuIndirectIndexedPolygonScene(
  value: unknown,
): value is WebGpuIndirectIndexedPolygonScene {
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
    isChannel(candidate["intensity"]) &&
    isCoverage(candidate["coverage"])
  )
}

export function webGpuIndirectIndexedPolygonSummary(
  scene: WebGpuIndirectIndexedPolygonScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU indirect indexed polygon is ${runtimeStatus.toLowerCase()} with ${indirectIndexedPolygonVertexCount(scene)} vertices, ${indirectIndexedPolygonIndexCount(scene)} total indices, and ${indirectIndexedPolygonEncodedIndexCount(scene)} indices encoded into a drawIndexedIndirect buffer for ${formatLabel}. The viewport clears to ${indirectIndexedPolygonClearColor(scene)} while coverage ${scene.coverage.toFixed(2)} trims how much of the indexed fan is actually submitted.`
}

export function indirectIndexedPolygonClearColor(scene: WebGpuIndirectIndexedPolygonScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function indirectIndexedPolygonPeakColor(scene: WebGpuIndirectIndexedPolygonScene): string {
  const red = Math.round((0.24 + scene.intensity * 0.66) * 255)
  const green = Math.round((0.24 + (1 - scene.green) * 0.42 + scene.coverage * 0.08) * 255)
  const blue = Math.round((0.3 + (1 - scene.blue) * 0.32 + scene.coverage * 0.1) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function indirectIndexedPolygonArea(scene: WebGpuIndirectIndexedPolygonScene): string {
  const area =
    0.5 * scene.sides * scene.radius * scene.radius * Math.sin((2 * Math.PI) / scene.sides)
  return `${area.toFixed(2)} clip-space units`
}

export function indirectIndexedPolygonStageLabel(scene: WebGpuIndirectIndexedPolygonScene): string {
  return `drawIndexedIndirect / ${indirectIndexedPolygonEncodedIndexCount(scene)} indices`
}

export function indirectIndexedPolygonVertexCount(
  scene: WebGpuIndirectIndexedPolygonScene,
): number {
  return scene.sides + 1
}

export function indirectIndexedPolygonIndexCount(scene: WebGpuIndirectIndexedPolygonScene): number {
  return scene.sides * 3
}

export function indirectIndexedPolygonEncodedIndexCount(
  scene: WebGpuIndirectIndexedPolygonScene,
): number {
  const fullIndexCount = indirectIndexedPolygonIndexCount(scene)
  const coveredTriangles = Math.max(1, Math.floor((scene.coverage * fullIndexCount) / 3))
  return Math.min(fullIndexCount, coveredTriangles * 3)
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

function isCoverage(value: unknown): value is number {
  return typeof value === "number" && value >= 0.34 && value <= 1
}
