import {
  DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE,
  evaluateSurface,
  gradientMagnitude,
  isPartialDerivativesLabScene,
  partialDerivativeX,
  partialDerivativeY,
  partialDerivativesLabSummary,
  sampleHeight,
} from "./partial-derivatives-lab.model"

describe("partial-derivatives-lab.model", () => {
  it("should recognize a valid multivariable scene", () => {
    expect(isPartialDerivativesLabScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBe(true)
    expect(isPartialDerivativesLabScene({ sampleX: 1 })).toBe(false)
  })

  it("should evaluate the surface and partial derivatives", () => {
    expect(evaluateSurface(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(1.6, 6)
    expect(partialDerivativeX(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(1.0, 6)
    expect(partialDerivativeY(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(-1.0, 6)
  })

  it("should calculate sample height and gradient magnitude", () => {
    expect(sampleHeight(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBeCloseTo(1.6, 6)
    expect(gradientMagnitude(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBeCloseTo(Math.SQRT2, 6)
  })

  it("should summarize the scene", () => {
    expect(partialDerivativesLabSummary(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toContain(
      "surface height is 1.60",
    )
    expect(partialDerivativesLabSummary(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toContain(
      "∂f/∂x is 1.00",
    )
  })
})
