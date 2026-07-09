import {
  DEFAULT_WEBGL_BLOOM_BLUR_SCENE,
  isWebGlBloomBlurScene,
  webGlBloomBlurAccentColor,
  webGlBloomBlurClearColor,
  webGlBloomBlurStageLabel,
  webGlBloomBlurSummary,
} from "./webgl-bloom-blur.model"

describe("webgl-bloom-blur.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlBloomBlurScene(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe(true)
    expect(isWebGlBloomBlurScene({ ...DEFAULT_WEBGL_BLOOM_BLUR_SCENE, blur: 1.2 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlBloomBlurClearColor(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe("rgba(13, 20, 46, 1.00)")
    expect(webGlBloomBlurAccentColor(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe("rgb(84, 73, 77)")
    expect(webGlBloomBlurStageLabel(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe(
      "Glow 0.74, blur 0.36, mix 0.64",
    )
  })

  it("summarizes the blurred multi-pass route state", () => {
    const summary = webGlBloomBlurSummary(DEFAULT_WEBGL_BLOOM_BLUR_SCENE, "Ready", "webgl2")

    expect(summary).toContain("neighboring texels")
    expect(summary).toContain("webgl2")
  })
})
