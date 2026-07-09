export type Vector2 = {
  readonly x: number
  readonly y: number
}

export type VectorScene = {
  readonly vector: Vector2
  readonly basisVisible: boolean
  readonly projectionVisible: boolean
}

export const DEFAULT_VECTOR_SCENE: VectorScene = {
  vector: { x: 3, y: 2 },
  basisVisible: true,
  projectionVisible: true,
}

export function isVectorScene(value: unknown): value is VectorScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  const vector = candidate["vector"]

  return (
    !!vector &&
    typeof vector === "object" &&
    typeof (vector as Record<string, unknown>)["x"] === "number" &&
    typeof (vector as Record<string, unknown>)["y"] === "number" &&
    typeof candidate["basisVisible"] === "boolean" &&
    typeof candidate["projectionVisible"] === "boolean"
  )
}

export function vectorMagnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

export function vectorAngleDegrees(vector: Vector2): number {
  return Math.atan2(vector.y, vector.x) * (180 / Math.PI)
}

export function vectorSummary(vector: Vector2): string {
  const magnitude = vectorMagnitude(vector).toFixed(2)
  const angle = vectorAngleDegrees(vector).toFixed(1)

  return `Vector (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}) has magnitude ${magnitude} at ${angle} degrees.`
}
