export type IntegralLabScene = {
  readonly upperBound: number
  readonly waveAmplitude: number
  readonly subdivisionCount: number
  readonly showRectangles: boolean
  readonly showExactArea: boolean
}

export const DEFAULT_INTEGRAL_LAB_SCENE: IntegralLabScene = {
  upperBound: 4.5,
  waveAmplitude: 0.6,
  subdivisionCount: 8,
  showRectangles: true,
  showExactArea: true,
}

export function isIntegralLabScene(value: unknown): value is IntegralLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["upperBound"] === "number" &&
    typeof candidate["waveAmplitude"] === "number" &&
    typeof candidate["subdivisionCount"] === "number" &&
    typeof candidate["showRectangles"] === "boolean" &&
    typeof candidate["showExactArea"] === "boolean"
  )
}

export function evaluateIntegralCurve(scene: IntegralLabScene, x: number): number {
  return 1 + scene.waveAmplitude * Math.sin(x)
}

export function exactIntegralArea(scene: IntegralLabScene): number {
  return scene.upperBound + scene.waveAmplitude * (1 - Math.cos(scene.upperBound))
}

export function leftRiemannSum(scene: IntegralLabScene): number {
  const deltaX = scene.upperBound / scene.subdivisionCount
  let total = 0

  for (let index = 0; index < scene.subdivisionCount; index += 1) {
    total += evaluateIntegralCurve(scene, index * deltaX) * deltaX
  }

  return total
}

export function midpointRiemannSum(scene: IntegralLabScene): number {
  const deltaX = scene.upperBound / scene.subdivisionCount
  let total = 0

  for (let index = 0; index < scene.subdivisionCount; index += 1) {
    total += evaluateIntegralCurve(scene, (index + 0.5) * deltaX) * deltaX
  }

  return total
}

export function integralLabSummary(scene: IntegralLabScene): string {
  const exactArea = exactIntegralArea(scene)
  const leftArea = leftRiemannSum(scene)
  const midpointArea = midpointRiemannSum(scene)

  return `From x = 0 to x = ${scene.upperBound.toFixed(2)}, the exact accumulated area is ${exactArea.toFixed(2)}, the midpoint estimate is ${midpointArea.toFixed(2)}, and the left Riemann sum is ${leftArea.toFixed(2)}.`
}
