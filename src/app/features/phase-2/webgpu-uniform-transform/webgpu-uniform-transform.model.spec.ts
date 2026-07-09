import {
  DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
  isWebGpuUniformTransformScene,
  uniformTransformArea,
  uniformTransformClearColor,
  uniformTransformPeakColor,
  webGpuUniformTransformSummary,
} from "./webgpu-uniform-transform.model"

describe("webgpu-uniform-transform.model", () => {
  it("recognizes a valid uniform transform scene", () => {
    expect(isWebGpuUniformTransformScene(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(true)
    expect(isWebGpuUniformTransformScene({ scale: 2, accent: 0.5 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(uniformTransformClearColor(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(15, 26, 51, 1.00)",
    )
    expect(uniformTransformPeakColor(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(181, 139, 154, 1.00)",
    )
  })

  it("summarizes the uniform-buffer scene", () => {
    const summary = webGpuUniformTransformSummary(
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("uniform buffer")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports transformed area", () => {
    expect(uniformTransformArea(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "0.88 clip-space units",
    )
  })
})
