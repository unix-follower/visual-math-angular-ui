export type GradientDescentLabScene = {
  readonly startX: number
  readonly startY: number
  readonly learningRate: number
  readonly stepCount: number
  readonly anisotropy: number
  readonly showPath: boolean
  readonly showContours: boolean
}

export type GradientDescentPoint = {
  readonly x: number
  readonly y: number
  readonly value: number
}

export type GradientDescentLabMetrics = {
  readonly path: readonly GradientDescentPoint[]
  readonly finalPoint: GradientDescentPoint
  readonly gradientNorm: number
  readonly improvement: number
}

export const DEFAULT_GRADIENT_DESCENT_LAB_SCENE: GradientDescentLabScene = {
  startX: 3,
  startY: -2,
  learningRate: 0.18,
  stepCount: 8,
  anisotropy: 1.6,
  showPath: true,
  showContours: true,
}

export function isGradientDescentLabScene(value: unknown): value is GradientDescentLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["startX"] === "number" &&
    typeof candidate["startY"] === "number" &&
    typeof candidate["learningRate"] === "number" &&
    typeof candidate["stepCount"] === "number" &&
    typeof candidate["anisotropy"] === "number" &&
    typeof candidate["showPath"] === "boolean" &&
    typeof candidate["showContours"] === "boolean"
  )
}

export function objectiveValue(scene: GradientDescentLabScene, x: number, y: number): number {
  return scene.anisotropy * x * x + 0.6 * y * y + 0.35 * x * y
}

export function objectiveGradient(
  scene: GradientDescentLabScene,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return {
    x: 2 * scene.anisotropy * x + 0.35 * y,
    y: 1.2 * y + 0.35 * x,
  }
}

export function simulateGradientDescent(
  scene: GradientDescentLabScene,
): readonly GradientDescentPoint[] {
  const path: GradientDescentPoint[] = []
  let x = scene.startX
  let y = scene.startY

  for (let index = 0; index <= scene.stepCount; index += 1) {
    path.push({ x, y, value: objectiveValue(scene, x, y) })

    if (index === scene.stepCount) {
      break
    }

    const gradient = objectiveGradient(scene, x, y)
    x -= scene.learningRate * gradient.x
    y -= scene.learningRate * gradient.y
  }

  return path
}

export function gradientDescentLabMetrics(
  scene: GradientDescentLabScene,
): GradientDescentLabMetrics {
  const path = simulateGradientDescent(scene)
  const finalPoint = path[path.length - 1] ?? { x: 0, y: 0, value: 0 }
  const gradient = objectiveGradient(scene, finalPoint.x, finalPoint.y)

  return {
    path,
    finalPoint,
    gradientNorm: Math.hypot(gradient.x, gradient.y),
    improvement: (path[0]?.value ?? 0) - finalPoint.value,
  }
}

export function gradientDescentLabSummary(
  scene: GradientDescentLabScene,
  metrics: GradientDescentLabMetrics = gradientDescentLabMetrics(scene),
): string {
  return `Starting from (${scene.startX.toFixed(2)}, ${scene.startY.toFixed(2)}), ${scene.stepCount} gradient steps at learning rate ${scene.learningRate.toFixed(2)} reduce the objective to ${metrics.finalPoint.value.toFixed(2)} with remaining gradient norm ${metrics.gradientNorm.toFixed(2)}.`
}
