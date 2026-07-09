import {
  DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
  isWebGlGradientTriangleScene,
  webGlGradientTriangleArea,
  webGlGradientTriangleClearColor,
  webGlGradientTrianglePeakColor,
  webGlGradientTriangleRotationLabel,
  webGlGradientTriangleSummary,
} from "./webgl-gradient-triangle.model"

describe("webgl-gradient-triangle.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlGradientTriangleScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(true)
    expect(
      isWebGlGradientTriangleScene({ ...DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE, scale: 1.4 }),
    ).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(webGlGradientTriangleClearColor(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(
      "rgba(20, 31, 46, 1.00)",
    )
    expect(webGlGradientTrianglePeakColor(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(
      "rgb(104, 74, 66)",
    )
  })

  it("formats derived geometry labels", () => {
    expect(webGlGradientTriangleArea(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe("0.49 units^2")
    expect(webGlGradientTriangleRotationLabel(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe("0 deg")
  })

  it("summarizes the current geometry route state", () => {
    const summary = webGlGradientTriangleSummary(
      DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("ready")
    expect(summary).toContain("webgl2")
    expect(summary).toContain("compiles shaders")
  })
})
