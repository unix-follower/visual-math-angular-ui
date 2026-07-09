import {
  averageApproximation,
  DEFAULT_LIMITS_LAB_SCENE,
  limitValue,
  limitsLabSummary,
  isLimitsLabScene,
  leftHandValue,
  rightHandValue,
} from "./limits-lab.model"

describe("limits-lab.model", () => {
  it("should recognize a valid limits scene", () => {
    expect(isLimitsLabScene(DEFAULT_LIMITS_LAB_SCENE)).toBe(true)
    expect(isLimitsLabScene({ targetX: 0 })).toBe(false)
  })

  it("should calculate the exact removable-discontinuity limit", () => {
    expect(limitValue(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(1, 6)
    expect(leftHandValue(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.9735458558, 6)
    expect(rightHandValue(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.9735458558, 6)
  })

  it("should average the left and right approximations", () => {
    expect(averageApproximation(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.9735458558, 6)
  })

  it("should summarize the limits scene", () => {
    expect(limitsLabSummary(DEFAULT_LIMITS_LAB_SCENE)).toContain("left-hand value is 0.974")
    expect(limitsLabSummary(DEFAULT_LIMITS_LAB_SCENE)).toContain(
      "removable-discontinuity limit is 1.000",
    )
  })
})
