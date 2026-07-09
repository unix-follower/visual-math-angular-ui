export type QuadraticScene = {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly showRoots: boolean
  readonly showVertex: boolean
}

export const DEFAULT_QUADRATIC_SCENE: QuadraticScene = {
  a: 1,
  b: -2,
  c: -3,
  showRoots: true,
  showVertex: true,
}

export function isQuadraticScene(value: unknown): value is QuadraticScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["a"] === "number" &&
    typeof candidate["b"] === "number" &&
    typeof candidate["c"] === "number" &&
    typeof candidate["showRoots"] === "boolean" &&
    typeof candidate["showVertex"] === "boolean"
  )
}

export function evaluateQuadratic(scene: QuadraticScene, x: number): number {
  return scene.a * x * x + scene.b * x + scene.c
}

export function quadraticDiscriminant(scene: QuadraticScene): number {
  return scene.b * scene.b - 4 * scene.a * scene.c
}

export function quadraticRoots(scene: QuadraticScene): readonly number[] {
  if (scene.a === 0) {
    return scene.b === 0 ? [] : [-scene.c / scene.b]
  }

  const discriminant = quadraticDiscriminant(scene)

  if (discriminant < 0) {
    return []
  }

  if (discriminant === 0) {
    return [-scene.b / (2 * scene.a)]
  }

  const squareRoot = Math.sqrt(discriminant)
  return [(-scene.b - squareRoot) / (2 * scene.a), (-scene.b + squareRoot) / (2 * scene.a)]
}

export function quadraticVertex(scene: QuadraticScene): { readonly x: number; readonly y: number } {
  if (scene.a === 0) {
    return { x: 0, y: evaluateQuadratic(scene, 0) }
  }

  const x = -scene.b / (2 * scene.a)
  return { x, y: evaluateQuadratic(scene, x) }
}

export function quadraticSummary(scene: QuadraticScene): string {
  const roots = quadraticRoots(scene)
  const vertex = quadraticVertex(scene)
  const rootsText =
    roots.length === 0
      ? "no real roots"
      : `roots ${roots.map((root) => root.toFixed(2)).join(" and ")}`

  return `Quadratic y = ${scene.a.toFixed(1)}x^2 + ${scene.b.toFixed(1)}x + ${scene.c.toFixed(1)} has ${rootsText} with vertex at (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}).`
}
