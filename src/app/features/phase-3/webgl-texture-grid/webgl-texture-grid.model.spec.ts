import {
  DEFAULT_WEBGL_TEXTURE_GRID_SCENE,
  isWebGlTextureGridScene,
  webGlTextureGridAccentColor,
  webGlTextureGridClearColor,
  webGlTextureGridDensity,
  webGlTextureGridSummary,
} from "./webgl-texture-grid.model"

describe("webgl-texture-grid.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlTextureGridScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe(true)
    expect(isWebGlTextureGridScene({ ...DEFAULT_WEBGL_TEXTURE_GRID_SCENE, contrast: 1.4 })).toBe(
      false,
    )
  })

  it("formats derived color labels", () => {
    expect(webGlTextureGridClearColor(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe(
      "rgba(20, 26, 56, 1.00)",
    )
    expect(webGlTextureGridAccentColor(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe("rgb(89, 90, 92)")
  })

  it("reports texture density", () => {
    expect(webGlTextureGridDensity(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe("12 texels / row")
  })

  it("summarizes the texture route state", () => {
    const summary = webGlTextureGridSummary(DEFAULT_WEBGL_TEXTURE_GRID_SCENE, "Ready", "webgl2")

    expect(summary).toContain("4x4 RGBA upload")
    expect(summary).toContain("webgl2")
  })
})
