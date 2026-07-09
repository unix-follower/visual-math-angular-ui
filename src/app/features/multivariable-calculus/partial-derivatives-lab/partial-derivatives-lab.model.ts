export type PartialDerivativesLabScene = {
  readonly sampleX: number
  readonly sampleY: number
  readonly curvature: number
  readonly coupling: number
  readonly tilt: number
  readonly showGradient: boolean
  readonly showContours: boolean
}

export const DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE: PartialDerivativesLabScene = {
  sampleX: 1,
  sampleY: -1,
  curvature: 0.8,
  coupling: 0.4,
  tilt: 0.6,
  showGradient: true,
  showContours: true,
}

export function isPartialDerivativesLabScene(value: unknown): value is PartialDerivativesLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["sampleX"] === "number" &&
    typeof candidate["sampleY"] === "number" &&
    typeof candidate["curvature"] === "number" &&
    typeof candidate["coupling"] === "number" &&
    typeof candidate["tilt"] === "number" &&
    typeof candidate["showGradient"] === "boolean" &&
    typeof candidate["showContours"] === "boolean"
  )
}

export function evaluateSurface(scene: PartialDerivativesLabScene, x: number, y: number): number {
  return 0.5 * scene.curvature * (x * x + y * y) + scene.coupling * x * y + scene.tilt * (x - y)
}

export function partialDerivativeX(
  scene: PartialDerivativesLabScene,
  x: number,
  y: number,
): number {
  return scene.curvature * x + scene.coupling * y + scene.tilt
}

export function partialDerivativeY(
  scene: PartialDerivativesLabScene,
  x: number,
  y: number,
): number {
  return scene.curvature * y + scene.coupling * x - scene.tilt
}

export function gradientMagnitude(scene: PartialDerivativesLabScene): number {
  const gradientX = partialDerivativeX(scene, scene.sampleX, scene.sampleY)
  const gradientY = partialDerivativeY(scene, scene.sampleX, scene.sampleY)

  return Math.hypot(gradientX, gradientY)
}

export function sampleHeight(scene: PartialDerivativesLabScene): number {
  return evaluateSurface(scene, scene.sampleX, scene.sampleY)
}

export function partialDerivativesLabSummary(scene: PartialDerivativesLabScene): string {
  const fx = partialDerivativeX(scene, scene.sampleX, scene.sampleY)
  const fy = partialDerivativeY(scene, scene.sampleX, scene.sampleY)
  const height = sampleHeight(scene)

  return `At (${scene.sampleX.toFixed(2)}, ${scene.sampleY.toFixed(2)}), the surface height is ${height.toFixed(2)}, ∂f/∂x is ${fx.toFixed(2)}, and ∂f/∂y is ${fy.toFixed(2)}.`
}
