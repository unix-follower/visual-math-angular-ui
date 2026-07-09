import {
  computeRippleAccentColor,
  computeRippleClearColor,
  computeRippleStageLabel,
  DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
  isWebGpuComputeRippleScene,
  webGpuComputeRippleSummary,
} from "./webgpu-compute-ripple.model"

describe("webgpu-compute-ripple.model", () => {
  it("recognizes a valid compute-ripple scene", () => {
    expect(isWebGpuComputeRippleScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(true)
    expect(isWebGpuComputeRippleScene({ amplitude: 2, drift: 0.4 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(computeRippleClearColor(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "rgba(18, 26, 46, 1.00)",
    )
    expect(computeRippleAccentColor(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "rgba(122, 107, 77, 1.00)",
    )
  })

  it("summarizes the compute scene", () => {
    const summary = webGpuComputeRippleSummary(
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("compute pass")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports the stage label", () => {
    expect(computeRippleStageLabel(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "Compute + render / drift 0.34",
    )
  })
})
