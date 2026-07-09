import {
  DEFAULT_WEBGL_DUAL_PASS_SCENE,
  isWebGlDualPassScene,
  webGlDualPassAccentColor,
  webGlDualPassClearColor,
  webGlDualPassStageLabel,
  webGlDualPassSummary,
} from "./webgl-dual-pass.model"

describe("webgl-dual-pass.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlDualPassScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe(true)
    expect(isWebGlDualPassScene({ ...DEFAULT_WEBGL_DUAL_PASS_SCENE, mix: 1.4 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlDualPassClearColor(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe("rgba(15, 26, 51, 1.00)")
    expect(webGlDualPassAccentColor(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe("rgb(88, 79, 83)")
    expect(webGlDualPassStageLabel(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe(
      "Pass 1 skew 0.42, pass 2 mix 0.58",
    )
  })

  it("summarizes the multi-pass route state", () => {
    const summary = webGlDualPassSummary(DEFAULT_WEBGL_DUAL_PASS_SCENE, "Ready", "webgl2")

    expect(summary).toContain("offscreen texture")
    expect(summary).toContain("webgl2")
  })
})
