import {
  DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
  isWebGlTexturedMaterialScene,
  webGlTexturedMaterialBaseColor,
  webGlTexturedMaterialClearColor,
  webGlTexturedMaterialFinishLabel,
  webGlTexturedMaterialLightDirection,
  webGlTexturedMaterialSummary,
} from "./webgl-textured-material.model"

describe("webgl-textured-material.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlTexturedMaterialScene(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)).toBe(true)
    expect(
      isWebGlTexturedMaterialScene({ ...DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE, fill: 1.4 }),
    ).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlTexturedMaterialClearColor(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)).toBe(
      "rgba(10, 15, 26, 1.00)",
    )
    expect(webGlTexturedMaterialBaseColor(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)).toBe(
      "rgb(150, 140, 170)",
    )
    expect(webGlTexturedMaterialLightDirection(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)).toBe(
      "0.56, 0.40, fill 0.34",
    )
    expect(webGlTexturedMaterialFinishLabel(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)).toBe(
      "texture 0.74, relief 0.46, gloss 0.52",
    )
  })

  it("summarizes the textured-material route state", () => {
    const summary = webGlTexturedMaterialSummary(
      DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("procedural albedo texture")
    expect(summary).toContain("fill light")
  })
})
