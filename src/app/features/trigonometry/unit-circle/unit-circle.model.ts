export type UnitCircleScene = {
  readonly angleDegrees: number
  readonly showProjection: boolean
  readonly showWave: boolean
}

export const DEFAULT_UNIT_CIRCLE_SCENE: UnitCircleScene = {
  angleDegrees: 45,
  showProjection: true,
  showWave: true,
}

export function isUnitCircleScene(value: unknown): value is UnitCircleScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["angleDegrees"] === "number" &&
    typeof candidate["showProjection"] === "boolean" &&
    typeof candidate["showWave"] === "boolean"
  )
}

export function angleRadians(scene: UnitCircleScene): number {
  return scene.angleDegrees * (Math.PI / 180)
}

export function unitCircleCoordinates(scene: UnitCircleScene): {
  readonly x: number
  readonly y: number
} {
  const radians = angleRadians(scene)
  return {
    x: Math.cos(radians),
    y: Math.sin(radians),
  }
}

export function tangentValue(scene: UnitCircleScene): number | null {
  const coordinates = unitCircleCoordinates(scene)

  if (Math.abs(coordinates.x) < 1e-6) {
    return null
  }

  return coordinates.y / coordinates.x
}

export function normalizedAngleDegrees(scene: UnitCircleScene): number {
  const normalized = ((scene.angleDegrees % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
}

export function unitCircleSummary(scene: UnitCircleScene): string {
  const coordinates = unitCircleCoordinates(scene)
  const tangent = tangentValue(scene)

  return `Angle ${scene.angleDegrees.toFixed(0)} degrees has cosine ${coordinates.x.toFixed(3)}, sine ${coordinates.y.toFixed(3)}, and tangent ${tangent === null ? "undefined" : tangent.toFixed(3)}.`
}
