import {
  DEFAULT_WEBGL_LIT_MATERIAL_SCENE,
  isWebGlLitMaterialScene,
  webGlLitMaterialBaseColor,
  webGlLitMaterialClearColor,
  webGlLitMaterialFinishLabel,
  webGlLitMaterialLightDirection,
  webGlLitMaterialSummary,
} from "./webgl-lit-material.model"

describe("webgl-lit-material.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlLitMaterialScene(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)).toBe(true)
    expect(isWebGlLitMaterialScene({ ...DEFAULT_WEBGL_LIT_MATERIAL_SCENE, rim: 1.2 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlLitMaterialClearColor(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)).toBe(
      "rgba(13, 18, 28, 1.00)",
    )
    expect(webGlLitMaterialBaseColor(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)).toBe("rgb(155, 137, 198)")
    expect(webGlLitMaterialLightDirection(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)).toBe(
      "0.56, 0.44, 0.82",
    )
    expect(webGlLitMaterialFinishLabel(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)).toBe(
      "metal 0.46, roughness 0.34, rim 0.38",
    )
  })

  it("summarizes the lighting route state", () => {
    const summary = webGlLitMaterialSummary(DEFAULT_WEBGL_LIT_MATERIAL_SCENE, "Ready", "webgl2")

    expect(summary).toContain("derived normal field")
    expect(summary).toContain("webgl2")
  })
})
