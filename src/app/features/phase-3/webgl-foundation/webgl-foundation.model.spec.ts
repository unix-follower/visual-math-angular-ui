import {
  DEFAULT_WEBGL_FOUNDATION_SCENE,
  formatWebGlClearColor,
  isWebGlFoundationScene,
  webGlFoundationChannelEnergy,
  webGlFoundationSummary,
} from "./webgl-foundation.model"

describe("webgl-foundation.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlFoundationScene(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe(true)
    expect(isWebGlFoundationScene({ red: 2, green: 0.2, blue: 0.2, alpha: 1 })).toBe(false)
  })

  it("formats the clear color as rgba text", () => {
    expect(formatWebGlClearColor(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe("rgba(23, 36, 56, 1.00)")
  })

  it("summarizes the current foundation scene", () => {
    const summary = webGlFoundationSummary(DEFAULT_WEBGL_FOUNDATION_SCENE, "Ready", "webgl2")

    expect(summary).toContain("ready")
    expect(summary).toContain("webgl2")
    expect(summary).toContain("clear-pass")
  })

  it("reports derived channel metadata", () => {
    expect(webGlFoundationChannelEnergy(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe("15%")
  })
})
