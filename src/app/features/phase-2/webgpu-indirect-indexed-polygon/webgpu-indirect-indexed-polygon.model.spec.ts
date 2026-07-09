import {
  DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
  indirectIndexedPolygonEncodedIndexCount,
  indirectIndexedPolygonPeakColor,
  indirectIndexedPolygonClearColor,
  indirectIndexedPolygonStageLabel,
  isWebGpuIndirectIndexedPolygonScene,
  webGpuIndirectIndexedPolygonSummary,
} from "./webgpu-indirect-indexed-polygon.model"

describe("webgpu-indirect-indexed-polygon.model", () => {
  it("recognizes a valid indirect indexed scene", () => {
    expect(isWebGpuIndirectIndexedPolygonScene(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      true,
    )
    expect(isWebGpuIndirectIndexedPolygonScene({ sides: 9, coverage: 0.5 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(indirectIndexedPolygonClearColor(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(indirectIndexedPolygonPeakColor(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(189, 174, 163, 1.00)",
    )
  })

  it("summarizes the indirect indexed scene", () => {
    const summary = webGpuIndirectIndexedPolygonSummary(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("drawIndexedIndirect")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports the encoded draw stage label", () => {
    expect(
      indirectIndexedPolygonEncodedIndexCount(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE),
    ).toBe(15)
    expect(indirectIndexedPolygonStageLabel(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "drawIndexedIndirect / 15 indices",
    )
  })
})
