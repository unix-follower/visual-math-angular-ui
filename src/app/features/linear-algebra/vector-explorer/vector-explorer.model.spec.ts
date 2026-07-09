import {
  DEFAULT_VECTOR_SCENE,
  isVectorScene,
  vectorAngleDegrees,
  vectorMagnitude,
  vectorSummary,
} from "./vector-explorer.model"

describe("vector-explorer.model", () => {
  it("should recognize a valid vector scene", () => {
    expect(isVectorScene(DEFAULT_VECTOR_SCENE)).toBe(true)
    expect(isVectorScene({ vector: { x: 1 } })).toBe(false)
  })

  it("should compute magnitude and angle", () => {
    expect(vectorMagnitude(DEFAULT_VECTOR_SCENE.vector)).toBeCloseTo(Math.sqrt(13), 6)
    expect(vectorAngleDegrees(DEFAULT_VECTOR_SCENE.vector)).toBeCloseTo(33.690067, 5)
  })

  it("should summarize the vector", () => {
    expect(vectorSummary(DEFAULT_VECTOR_SCENE.vector)).toContain("Vector (3.0, 2.0)")
    expect(vectorSummary(DEFAULT_VECTOR_SCENE.vector)).toContain("magnitude 3.61")
  })
})
