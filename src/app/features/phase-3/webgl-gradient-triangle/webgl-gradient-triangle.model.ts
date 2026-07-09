export type WebGlGradientTriangleScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly scale: number
  readonly rotation: number
  readonly accent: number
}

export const DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE: WebGlGradientTriangleScene = {
  red: 0.08,
  green: 0.12,
  blue: 0.18,
  alpha: 1,
  scale: 0.86,
  rotation: 0,
  accent: 0.78,
}

export function isWebGlGradientTriangleScene(value: unknown): value is WebGlGradientTriangleScene {
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
    isChannel(candidate["accent"])
  )
}

export function webGlGradientTriangleClearColor(scene: WebGlGradientTriangleScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlGradientTrianglePeakColor(scene: WebGlGradientTriangleScene): string {
  return `rgb(${Math.round((scene.red + scene.accent * 0.42) * 255)}, ${Math.round((scene.green + scene.accent * 0.22) * 255)}, ${Math.round((scene.blue + scene.accent * 0.1) * 255)})`
}

export function webGlGradientTriangleArea(scene: WebGlGradientTriangleScene): string {
  return `${(0.66 * scene.scale * scene.scale).toFixed(2)} units^2`
}

export function webGlGradientTriangleRotationLabel(scene: WebGlGradientTriangleScene): string {
  return `${scene.rotation.toFixed(0)} deg`
}

export function webGlGradientTriangleSummary(
  scene: WebGlGradientTriangleScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL gradient triangle is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This Phase 3 slice compiles shaders, links a program, uploads interleaved position and color data, and draws a triangle above the clear color ${webGlGradientTriangleClearColor(scene)} with a peak vertex tint near ${webGlGradientTrianglePeakColor(scene)}.`
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
