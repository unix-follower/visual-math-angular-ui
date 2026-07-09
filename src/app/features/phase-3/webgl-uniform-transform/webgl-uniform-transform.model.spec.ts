import {
  DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
  isWebGlUniformTransformScene,
  webGlUniformTransformArea,
  webGlUniformTransformClearColor,
  webGlUniformTransformPeakColor,
  webGlUniformTransformSummary,
  webGlUniformTransformTranslation,
} from "./webgl-uniform-transform.model"

describe("webgl-uniform-transform.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlUniformTransformScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(true)
    expect(
      isWebGlUniformTransformScene({ ...DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE, offsetX: 0.7 }),
    ).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(webGlUniformTransformClearColor(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(webGlUniformTransformPeakColor(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgb(70, 73, 68)",
    )
  })

  it("formats transform-derived metrics", () => {
    expect(webGlUniformTransformArea(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe("0.48 units^2")
    expect(webGlUniformTransformTranslation(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "(0.06, -0.04)",
    )
  })

  it("summarizes the uniform route state", () => {
    const summary = webGlUniformTransformSummary(
      DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("ready")
    expect(summary).toContain("webgl2")
    expect(summary).toContain("transform matrix")
  })
})
