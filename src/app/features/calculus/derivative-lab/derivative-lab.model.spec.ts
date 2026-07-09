import {
  DEFAULT_DERIVATIVE_LAB_SCENE,
  derivativeAt,
  derivativeLabSummary,
  evaluateDerivativeLabCurve,
  isDerivativeLabScene,
  secantSlope,
  tangentPoint,
} from "./derivative-lab.model"

describe("derivative-lab.model", () => {
  it("should recognize a valid derivative scene", () => {
    expect(isDerivativeLabScene(DEFAULT_DERIVATIVE_LAB_SCENE)).toBe(true)
    expect(isDerivativeLabScene({ pointX: 2 })).toBe(false)
  })

  it("should evaluate the curve and derivative", () => {
    expect(evaluateDerivativeLabCurve(DEFAULT_DERIVATIVE_LAB_SCENE, 2)).toBeCloseTo(1.2, 6)
    expect(
      derivativeAt(DEFAULT_DERIVATIVE_LAB_SCENE, DEFAULT_DERIVATIVE_LAB_SCENE.pointX),
    ).toBeCloseTo(1.9, 6)
  })

  it("should calculate the tangent point and secant slope", () => {
    const point = tangentPoint(DEFAULT_DERIVATIVE_LAB_SCENE)

    expect(point.x).toBeCloseTo(1.5, 6)
    expect(point.y).toBeCloseTo(0.05, 6)
    expect(
      secantSlope(DEFAULT_DERIVATIVE_LAB_SCENE, DEFAULT_DERIVATIVE_LAB_SCENE.pointX),
    ).toBeCloseTo(2.7, 6)
  })

  it("should summarize the derivative scene", () => {
    expect(derivativeLabSummary(DEFAULT_DERIVATIVE_LAB_SCENE)).toContain("tangent slope is 1.90")
    expect(derivativeLabSummary(DEFAULT_DERIVATIVE_LAB_SCENE)).toContain(
      "secant slope one unit to the right is 2.70",
    )
  })
})
