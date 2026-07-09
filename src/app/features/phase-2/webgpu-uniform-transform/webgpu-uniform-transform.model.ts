export type WebGpuUniformTransformScene = {
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

export const DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE: WebGpuUniformTransformScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.2,
  alpha: 1,
  scale: 0.78,
  rotation: 18,
  offsetX: 0.08,
  offsetY: -0.04,
  accent: 0.72,
}

export function isWebGpuUniformTransformScene(
  value: unknown,
): value is WebGpuUniformTransformScene {
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

export function webGpuUniformTransformSummary(
  scene: WebGpuUniformTransformScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU uniform transform is ${runtimeStatus.toLowerCase()} with a static vertex mesh transformed by a uniform buffer targeting ${formatLabel}. The viewport clears to ${uniformTransformClearColor(scene)} while the shader applies scale ${scene.scale.toFixed(2)}, rotation ${scene.rotation.toFixed(0)} degrees, and offset (${scene.offsetX.toFixed(2)}, ${scene.offsetY.toFixed(2)}).`
}

export function uniformTransformClearColor(scene: WebGpuUniformTransformScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function uniformTransformPeakColor(scene: WebGpuUniformTransformScene): string {
  const red = Math.round((0.22 + scene.accent * 0.68) * 255)
  const green = Math.round((0.24 + (1 - scene.green) * 0.34) * 255)
  const blue = Math.round((0.3 + (1 - scene.blue) * 0.38) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function uniformTransformArea(scene: WebGpuUniformTransformScene): string {
  const area = Math.pow(scene.scale * 1.2, 2)
  return `${area.toFixed(2)} clip-space units`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isScale(value: unknown): value is number {
  return typeof value === "number" && value >= 0.35 && value <= 1.1
}

function isRotation(value: unknown): value is number {
  return typeof value === "number" && value >= -180 && value <= 180
}

function isOffset(value: unknown): value is number {
  return typeof value === "number" && value >= -0.45 && value <= 0.45
}
