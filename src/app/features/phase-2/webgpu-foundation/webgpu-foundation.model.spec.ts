import {
  DEFAULT_WEBGPU_FOUNDATION_SCENE,
  formatClearColor,
  isWebGpuFoundationScene,
  triangleAreaEstimate,
  triangleColorLabel,
  webGpuFoundationSummary,
} from "./webgpu-foundation.model"

describe("webgpu-foundation.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGpuFoundationScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe(true)
    expect(isWebGpuFoundationScene({ red: 2, green: 0.2, blue: 0.2, alpha: 1 })).toBe(false)
  })

  it("formats the clear color as rgba text", () => {
    expect(formatClearColor(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("rgba(36, 59, 99, 1.00)")
  })

  it("summarizes the current foundation scene", () => {
    const summary = webGpuFoundationSummary(DEFAULT_WEBGPU_FOUNDATION_SCENE, "Ready", "bgra8unorm")

    expect(summary).toContain("ready")
    expect(summary).toContain("bgra8unorm")
    expect(summary).toContain("triangle draw")
  })

  it("reports triangle metadata derived from the scene", () => {
    expect(triangleAreaEstimate(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("0.16 viewport units")
    expect(triangleColorLabel(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("rgba(173, 166, 139, 1.00)")
  })
})
