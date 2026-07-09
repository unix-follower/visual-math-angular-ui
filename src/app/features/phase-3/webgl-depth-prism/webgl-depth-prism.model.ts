export type WebGlDepthPrismScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly yaw: number
  readonly pitch: number
  readonly distance: number
  readonly prismLift: number
  readonly prismSpread: number
  readonly accent: number
}

export const DEFAULT_WEBGL_DEPTH_PRISM_SCENE: WebGlDepthPrismScene = {
  red: 0.04,
  green: 0.06,
  blue: 0.1,
  alpha: 1,
  yaw: 24,
  pitch: 18,
  distance: 4.4,
  prismLift: 0.46,
  prismSpread: 0.58,
  accent: 0.42,
}

export function isWebGlDepthPrismScene(value: unknown): value is WebGlDepthPrismScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isBounded(candidate["yaw"], -80, 80) &&
    isBounded(candidate["pitch"], -50, 50) &&
    isBounded(candidate["distance"], 2.2, 6.8) &&
    isChannel(candidate["prismLift"]) &&
    isChannel(candidate["prismSpread"]) &&
    isChannel(candidate["accent"])
  )
}

export function webGlDepthPrismClearColor(scene: WebGlDepthPrismScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlDepthPrismAccentColor(scene: WebGlDepthPrismScene): string {
  return `rgb(${Math.round((0.38 + scene.accent * 0.32) * 255)}, ${Math.round((0.56 + scene.prismLift * 0.22) * 255)}, ${Math.round((0.72 + scene.prismSpread * 0.18) * 255)})`
}

export function webGlDepthPrismCameraLabel(scene: WebGlDepthPrismScene): string {
  return `yaw ${Math.round(scene.yaw)}°, pitch ${Math.round(scene.pitch)}°, distance ${scene.distance.toFixed(1)}`
}

export function webGlDepthPrismOcclusionLabel(scene: WebGlDepthPrismScene): string {
  return `lift ${scene.prismLift.toFixed(2)}, spread ${scene.prismSpread.toFixed(2)}`
}

export function webGlDepthPrismSummary(
  scene: WebGlDepthPrismScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL depth prism is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route draws solid prism faces with depth testing enabled so orbiting the camera changes which edges and faces remain visible over ${webGlDepthPrismClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isBounded(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && value >= min && value <= max
}
