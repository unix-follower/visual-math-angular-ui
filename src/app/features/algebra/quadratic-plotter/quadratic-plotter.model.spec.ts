import {
  DEFAULT_QUADRATIC_SCENE,
  evaluateQuadratic,
  isQuadraticScene,
  quadraticDiscriminant,
  quadraticRoots,
  quadraticSummary,
  quadraticVertex,
} from "./quadratic-plotter.model"

describe("quadratic-plotter.model", () => {
  it("should recognize a valid quadratic scene", () => {
    expect(isQuadraticScene(DEFAULT_QUADRATIC_SCENE)).toBe(true)
    expect(isQuadraticScene({ a: 1, b: 2 })).toBe(false)
  })

  it("should evaluate the quadratic and its discriminant", () => {
    expect(evaluateQuadratic(DEFAULT_QUADRATIC_SCENE, 3)).toBe(0)
    expect(quadraticDiscriminant(DEFAULT_QUADRATIC_SCENE)).toBe(16)
  })

  it("should calculate roots and vertex", () => {
    expect(quadraticRoots(DEFAULT_QUADRATIC_SCENE)).toEqual([-1, 3])
    expect(quadraticVertex(DEFAULT_QUADRATIC_SCENE)).toEqual({ x: 1, y: -4 })
  })

  it("should summarize the quadratic scene", () => {
    expect(quadraticSummary(DEFAULT_QUADRATIC_SCENE)).toContain("roots -1.00 and 3.00")
    expect(quadraticSummary(DEFAULT_QUADRATIC_SCENE)).toContain("vertex at (1.00, -4.00)")
  })
})
