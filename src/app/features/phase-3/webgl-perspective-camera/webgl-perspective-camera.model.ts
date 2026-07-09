export type WebGlPerspectiveCameraScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly yaw: number
  readonly pitch: number
  readonly distance: number
  readonly fov: number
  readonly depth: number
  readonly accent: number
}

export const DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE: WebGlPerspectiveCameraScene = {
  red: 0.04,
  green: 0.07,
  blue: 0.12,
  alpha: 1,
  yaw: 22,
  pitch: 14,
  distance: 3.8,
  fov: 58,
  depth: 0.56,
  accent: 0.62,
}

export function isWebGlPerspectiveCameraScene(
  value: unknown,
): value is WebGlPerspectiveCameraScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isAngle(candidate["yaw"]) &&
    isAngle(candidate["pitch"]) &&
    isDistance(candidate["distance"]) &&
    isFov(candidate["fov"]) &&
    isChannel(candidate["depth"]) &&
    isChannel(candidate["accent"])
  )
}

export function webGlPerspectiveCameraClearColor(scene: WebGlPerspectiveCameraScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlPerspectiveCameraAccentColor(scene: WebGlPerspectiveCameraScene): string {
  return `rgb(${Math.round((0.24 + scene.accent * 0.56) * 255)}, ${Math.round((0.34 + scene.depth * 0.34) * 255)}, ${Math.round((0.58 + scene.depth * 0.18 + scene.accent * 0.08) * 255)})`
}

export function webGlPerspectiveCameraAngles(scene: WebGlPerspectiveCameraScene): string {
  return `yaw ${scene.yaw.toFixed(0)}°, pitch ${scene.pitch.toFixed(0)}°`
}

export function webGlPerspectiveCameraLens(scene: WebGlPerspectiveCameraScene): string {
  return `${scene.fov.toFixed(0)}° fov at ${scene.distance.toFixed(1)} units`
}

export function webGlPerspectiveCameraDepthLabel(scene: WebGlPerspectiveCameraScene): string {
  return `z-span ${(0.8 + scene.depth * 1.2).toFixed(2)}`
}

export function webGlPerspectiveCameraSummary(
  scene: WebGlPerspectiveCameraScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL perspective camera is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route keeps layered geometry static in model space, then uses a perspective camera with ${webGlPerspectiveCameraAngles(scene)} and ${webGlPerspectiveCameraLens(scene)} to reveal depth over ${webGlPerspectiveCameraClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isAngle(value: unknown): value is number {
  return typeof value === "number" && value >= -75 && value <= 75
}

function isDistance(value: unknown): value is number {
  return typeof value === "number" && value >= 2 && value <= 7
}

function isFov(value: unknown): value is number {
  return typeof value === "number" && value >= 30 && value <= 90
}
