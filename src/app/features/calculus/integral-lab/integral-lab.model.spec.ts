import {
  DEFAULT_INTEGRAL_LAB_SCENE,
  exactIntegralArea,
  integralLabSummary,
  isIntegralLabScene,
  leftRiemannSum,
  midpointRiemannSum,
} from "./integral-lab.model"

describe("integral-lab.model", () => {
  it("should recognize a valid integral scene", () => {
    expect(isIntegralLabScene(DEFAULT_INTEGRAL_LAB_SCENE)).toBe(true)
    expect(isIntegralLabScene({ upperBound: 3 })).toBe(false)
  })

  it("should calculate the exact accumulated area", () => {
    expect(exactIntegralArea(DEFAULT_INTEGRAL_LAB_SCENE)).toBeCloseTo(5.22648, 5)
  })

  it("should keep the midpoint estimate closer than the left estimate for the default scene", () => {
    const exact = exactIntegralArea(DEFAULT_INTEGRAL_LAB_SCENE)
    const left = leftRiemannSum(DEFAULT_INTEGRAL_LAB_SCENE)
    const midpoint = midpointRiemannSum(DEFAULT_INTEGRAL_LAB_SCENE)

    expect(Math.abs(midpoint - exact)).toBeLessThan(Math.abs(left - exact))
  })

  it("should summarize the integral scene", () => {
    expect(integralLabSummary(DEFAULT_INTEGRAL_LAB_SCENE)).toContain(
      "exact accumulated area is 5.23",
    )
    expect(integralLabSummary(DEFAULT_INTEGRAL_LAB_SCENE)).toContain("midpoint estimate")
  })
})
