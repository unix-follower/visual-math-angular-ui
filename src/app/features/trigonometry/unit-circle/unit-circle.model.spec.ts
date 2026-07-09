import {
  angleRadians,
  DEFAULT_UNIT_CIRCLE_SCENE,
  isUnitCircleScene,
  normalizedAngleDegrees,
  tangentValue,
  unitCircleCoordinates,
  unitCircleSummary,
} from "./unit-circle.model"

describe("unit-circle.model", () => {
  it("should recognize a valid unit-circle scene", () => {
    expect(isUnitCircleScene(DEFAULT_UNIT_CIRCLE_SCENE)).toBe(true)
    expect(isUnitCircleScene({ angleDegrees: 30 })).toBe(false)
  })

  it("should convert the selected angle to radians and coordinates", () => {
    expect(angleRadians({ ...DEFAULT_UNIT_CIRCLE_SCENE, angleDegrees: 180 })).toBeCloseTo(
      Math.PI,
      10,
    )
    expect(unitCircleCoordinates({ ...DEFAULT_UNIT_CIRCLE_SCENE, angleDegrees: 0 })).toEqual({
      x: 1,
      y: 0,
    })
  })

  it("should normalize and summarize trigonometric values", () => {
    expect(normalizedAngleDegrees({ ...DEFAULT_UNIT_CIRCLE_SCENE, angleDegrees: 270 })).toBe(-90)
    expect(tangentValue({ ...DEFAULT_UNIT_CIRCLE_SCENE, angleDegrees: 90 })).toBeNull()
    expect(unitCircleSummary(DEFAULT_UNIT_CIRCLE_SCENE)).toContain("cosine 0.707")
  })
})
