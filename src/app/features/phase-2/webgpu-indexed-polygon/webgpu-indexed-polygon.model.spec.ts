import {
  DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
  indexedPolygonArea,
  indexedPolygonClearColor,
  indexedPolygonIndexCount,
  indexedPolygonPeakColor,
  indexedPolygonVertexCount,
  isWebGpuIndexedPolygonScene,
  webGpuIndexedPolygonSummary,
} from "./webgpu-indexed-polygon.model"

describe("webgpu-indexed-polygon.model", () => {
  it("recognizes a valid indexed polygon scene", () => {
    expect(isWebGpuIndexedPolygonScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(true)
    expect(isWebGpuIndexedPolygonScene({ sides: 10, radius: 0.6 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(indexedPolygonClearColor(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(indexedPolygonPeakColor(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(192, 167, 148, 1.00)",
    )
  })

  it("summarizes the indexed polygon scene", () => {
    const summary = webGpuIndexedPolygonSummary(
      DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("18 indices")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports polygon area and topology counts", () => {
    expect(indexedPolygonArea(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe("1.20 clip-space units")
    expect(indexedPolygonVertexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(7)
    expect(indexedPolygonIndexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(18)
  })
})
