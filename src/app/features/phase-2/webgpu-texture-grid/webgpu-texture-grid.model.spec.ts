import {
  DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
  isWebGpuTextureGridScene,
  textureGridAccentColor,
  textureGridClearColor,
  textureGridDensity,
  webGpuTextureGridSummary,
} from "./webgpu-texture-grid.model"

describe("webgpu-texture-grid.model", () => {
  it("recognizes a valid texture-grid scene", () => {
    expect(isWebGpuTextureGridScene(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe(true)
    expect(isWebGpuTextureGridScene({ frequency: 2, blend: 0.5 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(textureGridClearColor(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe("rgba(20, 26, 56, 1.00)")
    expect(textureGridAccentColor(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe(
      "rgba(157, 109, 95, 1.00)",
    )
  })

  it("summarizes the texture-backed scene", () => {
    const summary = webGpuTextureGridSummary(
      DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("texture-backed")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports texture density", () => {
    expect(textureGridDensity(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe("4x4 / phase 3")
  })
})
