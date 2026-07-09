import {
  DEFAULT_TRIANGLE_SCENE,
  isTriangleScene,
  triangleArea,
  triangleCentroid,
  trianglePerimeter,
  triangleSideLengths,
  triangleSummary,
  triangleVertices,
} from "./triangle-explorer.model"

describe("triangle-explorer.model", () => {
  it("should recognize a valid triangle scene", () => {
    expect(isTriangleScene(DEFAULT_TRIANGLE_SCENE)).toBe(true)
    expect(isTriangleScene({ base: 2, height: 3 })).toBe(false)
  })

  it("should calculate triangle measurements", () => {
    expect(triangleArea(DEFAULT_TRIANGLE_SCENE)).toBe(12)
    expect(trianglePerimeter(DEFAULT_TRIANGLE_SCENE)).toBeCloseTo(16, 6)
    expect(triangleSideLengths(DEFAULT_TRIANGLE_SCENE)[0]).toBeCloseTo(6, 6)
  })

  it("should place the centroid at the origin before rotation", () => {
    const centroid = triangleCentroid(DEFAULT_TRIANGLE_SCENE)

    expect(centroid.x).toBeCloseTo(0, 10)
    expect(centroid.y).toBeCloseTo(0, 10)
  })

  it("should rotate the triangle vertices", () => {
    const rotatedVertices = triangleVertices({
      ...DEFAULT_TRIANGLE_SCENE,
      rotationDegrees: 90,
    })

    expect(rotatedVertices[0].x).toBeCloseTo(1.333333, 5)
    expect(rotatedVertices[0].y).toBeCloseTo(-3, 5)
  })

  it("should summarize the triangle scene", () => {
    expect(triangleSummary(DEFAULT_TRIANGLE_SCENE)).toContain("area 12.00")
    expect(triangleSummary(DEFAULT_TRIANGLE_SCENE)).toContain("centroid at (0.00, 0.00)")
  })
})
