import {
  DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
  indirectRibbonAccentColor,
  indirectRibbonClearColor,
  indirectRibbonInstanceCount,
  indirectRibbonStageLabel,
  isWebGpuIndirectRibbonScene,
  webGpuIndirectRibbonSummary,
} from "./webgpu-indirect-ribbon.model"

describe("webgpu-indirect-ribbon.model", () => {
  it("recognizes a valid indirect-ribbon scene", () => {
    expect(isWebGpuIndirectRibbonScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(true)
    expect(isWebGpuIndirectRibbonScene({ span: 2, taper: 0.2 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(indirectRibbonClearColor(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(indirectRibbonAccentColor(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "rgba(113, 94, 88, 1.00)",
    )
  })

  it("summarizes the indirect scene", () => {
    const summary = webGpuIndirectRibbonSummary(
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("indirect buffer")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports the indirect stage label", () => {
    expect(indirectRibbonInstanceCount(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(2)
    expect(indirectRibbonStageLabel(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "Indirect draw / echoes 2",
    )
  })
})
