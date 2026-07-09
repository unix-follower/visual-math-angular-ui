import {
  DEFAULT_WEBGL_SHADOW_RELIEF_SCENE,
  isWebGlShadowReliefScene,
  webGlShadowReliefBaseColor,
  webGlShadowReliefClearColor,
  webGlShadowReliefFinishLabel,
  webGlShadowReliefLightDirection,
  webGlShadowReliefSummary,
} from "./webgl-shadow-relief.model"

describe("webgl-shadow-relief.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlShadowReliefScene(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)).toBe(true)
    expect(isWebGlShadowReliefScene({ ...DEFAULT_WEBGL_SHADOW_RELIEF_SCENE, gloss: 1.2 })).toBe(
      false,
    )
  })

  it("formats derived labels", () => {
    expect(webGlShadowReliefClearColor(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)).toBe(
      "rgba(10, 15, 26, 1.00)",
    )
    expect(webGlShadowReliefBaseColor(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)).toBe("rgb(156, 125, 175)")
    expect(webGlShadowReliefLightDirection(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)).toBe(
      "0.52, 0.44, 0.78",
    )
    expect(webGlShadowReliefFinishLabel(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)).toBe(
      "relief 0.58, shadow 0.52, gloss 0.44",
    )
  })

  it("summarizes the shadow-relief route state", () => {
    const summary = webGlShadowReliefSummary(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE, "Ready", "webgl2")

    expect(summary).toContain("shadow relief")
    expect(summary).toContain("contact-shadow cues")
  })
})
