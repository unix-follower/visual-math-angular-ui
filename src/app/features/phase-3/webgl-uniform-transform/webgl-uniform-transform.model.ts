export type WebGlUniformTransformScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly scale: number
  readonly rotation: number
  readonly offsetX: number
  readonly offsetY: number
  readonly accent: number
}

export const DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE: WebGlUniformTransformScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  scale: 0.82,
  rotation: 14,
  offsetX: 0.06,
  offsetY: -0.04,
  accent: 0.72,
}

export function isWebGlUniformTransformScene(value: unknown): value is WebGlUniformTransformScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isScale(candidate["scale"]) &&
    isRotation(candidate["rotation"]) &&
    isOffset(candidate["offsetX"]) &&
    isOffset(candidate["offsetY"]) &&
    isChannel(candidate["accent"])
  )
}

export function webGlUniformTransformClearColor(scene: WebGlUniformTransformScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlUniformTransformPeakColor(scene: WebGlUniformTransformScene): string {
  return `rgb(${Math.round((scene.red + scene.accent * 0.3) * 255)}, ${Math.round((scene.green + scene.accent * 0.26) * 255)}, ${Math.round((scene.blue + scene.accent * 0.12) * 255)})`
}

export function webGlUniformTransformArea(scene: WebGlUniformTransformScene): string {
  return `${(0.72 * scene.scale * scene.scale).toFixed(2)} units^2`
}

export function webGlUniformTransformTranslation(scene: WebGlUniformTransformScene): string {
  return `(${scene.offsetX.toFixed(2)}, ${scene.offsetY.toFixed(2)})`
}

export function webGlUniformTransformSummary(
  scene: WebGlUniformTransformScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL uniform transform is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route keeps one static vertex mesh on the GPU, then updates a transform matrix and accent uniform each frame above the clear color ${webGlUniformTransformClearColor(scene)} so scale, rotation, and translation no longer require buffer rewrites.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isScale(value: unknown): value is number {
  return typeof value === "number" && value >= 0.4 && value <= 1.2
}

function isRotation(value: unknown): value is number {
  return typeof value === "number" && value >= -180 && value <= 180
}

function isOffset(value: unknown): value is number {
  return typeof value === "number" && value >= -0.45 && value <= 0.45
}
