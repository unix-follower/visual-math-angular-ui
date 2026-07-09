import {
  DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
  gradientQuadArea,
  gradientQuadClearColor,
  gradientQuadPeakColor,
  isWebGpuGradientQuadScene,
  webGpuGradientQuadSummary,
} from "./webgpu-gradient-quad.model"

describe("webgpu-gradient-quad.model", () => {
  it("recognizes a valid gradient quad scene", () => {
    expect(isWebGpuGradientQuadScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(true)
    expect(isWebGpuGradientQuadScene({ red: 0.1, inset: 0.7 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(gradientQuadClearColor(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(
      "rgba(20, 36, 56, 1.00)",
    )
    expect(gradientQuadPeakColor(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(
      "rgba(196, 158, 153, 1.00)",
    )
  })

  it("summarizes the quad scene", () => {
    const summary = webGpuGradientQuadSummary(
      DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("six-vertex quad draw")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports quad area", () => {
    expect(gradientQuadArea(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe("2.43 clip-space units")
  })
})
