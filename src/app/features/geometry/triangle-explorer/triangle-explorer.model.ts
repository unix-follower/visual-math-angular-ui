export type Point2 = {
  readonly x: number
  readonly y: number
}

export type TriangleScene = {
  readonly base: number
  readonly height: number
  readonly rotationDegrees: number
  readonly showCentroid: boolean
  readonly showSideLengths: boolean
}

export const DEFAULT_TRIANGLE_SCENE: TriangleScene = {
  base: 6,
  height: 4,
  rotationDegrees: 0,
  showCentroid: true,
  showSideLengths: true,
}

export function isTriangleScene(value: unknown): value is TriangleScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["base"] === "number" &&
    typeof candidate["height"] === "number" &&
    typeof candidate["rotationDegrees"] === "number" &&
    typeof candidate["showCentroid"] === "boolean" &&
    typeof candidate["showSideLengths"] === "boolean"
  )
}

export function triangleArea(scene: TriangleScene): number {
  return 0.5 * scene.base * scene.height
}

export function triangleVertices(scene: TriangleScene): readonly [Point2, Point2, Point2] {
  const halfBase = scene.base / 2
  const centroidOffset = scene.height / 3
  const radians = scene.rotationDegrees * (Math.PI / 180)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const rawVertices: readonly [Point2, Point2, Point2] = [
    { x: -halfBase, y: -centroidOffset },
    { x: halfBase, y: -centroidOffset },
    { x: 0, y: scene.height - centroidOffset },
  ]

  const rotatePoint = (point: Point2): Point2 => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  })

  return [rotatePoint(rawVertices[0]), rotatePoint(rawVertices[1]), rotatePoint(rawVertices[2])]
}

export function triangleCentroid(scene: TriangleScene): Point2 {
  const [a, b, c] = triangleVertices(scene)
  return {
    x: (a.x + b.x + c.x) / 3,
    y: (a.y + b.y + c.y) / 3,
  }
}

export function triangleSideLengths(scene: TriangleScene): readonly number[] {
  const [a, b, c] = triangleVertices(scene)
  return [distanceBetween(a, b), distanceBetween(b, c), distanceBetween(c, a)]
}

export function trianglePerimeter(scene: TriangleScene): number {
  return triangleSideLengths(scene).reduce((sum, length) => sum + length, 0)
}

export function triangleSummary(scene: TriangleScene): string {
  const centroid = triangleCentroid(scene)
  return `Triangle with base ${scene.base.toFixed(1)} and height ${scene.height.toFixed(1)} has area ${triangleArea(scene).toFixed(2)} and centroid at (${centroid.x.toFixed(2)}, ${centroid.y.toFixed(2)}).`
}

function distanceBetween(a: Point2, b: Point2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}
