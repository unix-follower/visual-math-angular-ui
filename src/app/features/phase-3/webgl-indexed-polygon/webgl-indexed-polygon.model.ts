export type WebGlIndexedPolygonScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly sides: number
  readonly radius: number
  readonly rotation: number
  readonly intensity: number
}

export const DEFAULT_WEBGL_INDEXED_POLYGON_SCENE: WebGlIndexedPolygonScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  sides: 6,
  radius: 0.68,
  rotation: 14,
  intensity: 0.72,
}

export function isWebGlIndexedPolygonScene(value: unknown): value is WebGlIndexedPolygonScene {
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

export function webGlIndexedPolygonClearColor(scene: WebGlIndexedPolygonScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlIndexedPolygonPeakColor(scene: WebGlIndexedPolygonScene): string {
  return `rgb(${Math.round((scene.red + scene.intensity * 0.34) * 255)}, ${Math.round((scene.green + scene.intensity * 0.28) * 255)}, ${Math.round((scene.blue + scene.intensity * 0.18) * 255)})`
}

export function webGlIndexedPolygonVertexCount(scene: WebGlIndexedPolygonScene): number {
  return scene.sides + 1
}

export function webGlIndexedPolygonIndexCount(scene: WebGlIndexedPolygonScene): number {
  return scene.sides * 3
}

export function webGlIndexedPolygonArea(scene: WebGlIndexedPolygonScene): string {
  const area =
    0.5 * scene.sides * scene.radius * scene.radius * Math.sin((2 * Math.PI) / scene.sides)
  return `${area.toFixed(2)} units^2`
}

export function webGlIndexedPolygonSummary(
  scene: WebGlIndexedPolygonScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL indexed polygon is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route uploads ${webGlIndexedPolygonVertexCount(scene)} shared vertices and ${webGlIndexedPolygonIndexCount(scene)} uint16 indices, then uses drawElements to fan the polygon over ${webGlIndexedPolygonClearColor(scene)} without duplicating perimeter positions.`
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
