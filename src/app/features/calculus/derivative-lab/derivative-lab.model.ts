export type DerivativeLabScene = {
  readonly pointX: number
  readonly curvature: number
  readonly linearTerm: number
  readonly showTangent: boolean
  readonly showSecant: boolean
}

export const DEFAULT_DERIVATIVE_LAB_SCENE: DerivativeLabScene = {
  pointX: 1.5,
  curvature: 0.8,
  linearTerm: -0.5,
  showTangent: true,
  showSecant: true,
}

export function isDerivativeLabScene(value: unknown): value is DerivativeLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["pointX"] === "number" &&
    typeof candidate["curvature"] === "number" &&
    typeof candidate["linearTerm"] === "number" &&
    typeof candidate["showTangent"] === "boolean" &&
    typeof candidate["showSecant"] === "boolean"
  )
}

export function evaluateDerivativeLabCurve(scene: DerivativeLabScene, x: number): number {
  return scene.curvature * x * x + scene.linearTerm * x - 1
}

export function derivativeAt(scene: DerivativeLabScene, x: number): number {
  return 2 * scene.curvature * x + scene.linearTerm
}

export function secantSlope(scene: DerivativeLabScene, x: number, delta = 1): number {
  return (
    (evaluateDerivativeLabCurve(scene, x + delta) - evaluateDerivativeLabCurve(scene, x)) / delta
  )
}

export function tangentPoint(scene: DerivativeLabScene): {
  readonly x: number
  readonly y: number
} {
  return {
    x: scene.pointX,
    y: evaluateDerivativeLabCurve(scene, scene.pointX),
  }
}

export function derivativeLabSummary(scene: DerivativeLabScene): string {
  const point = tangentPoint(scene)
  const slope = derivativeAt(scene, scene.pointX)
  const secant = secantSlope(scene, scene.pointX)

  return `At x = ${scene.pointX.toFixed(2)}, the curve value is ${point.y.toFixed(2)}, the tangent slope is ${slope.toFixed(2)}, and the secant slope one unit to the right is ${secant.toFixed(2)}.`
}
