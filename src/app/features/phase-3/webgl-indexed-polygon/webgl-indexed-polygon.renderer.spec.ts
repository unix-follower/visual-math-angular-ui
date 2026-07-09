import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_INDEXED_POLYGON_SCENE } from "./webgl-indexed-polygon.model"
import {
  releaseWebGlIndexedPolygonResources,
  renderWebGlIndexedPolygonScene,
} from "./webgl-indexed-polygon.renderer"

describe("webgl-indexed-polygon.renderer", () => {
  it("uploads vertex and index buffers then draws with drawElements", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_INDEXED_POLYGON_SCENE,
    )

    expect(harness.context.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.bufferData).toHaveBeenCalledTimes(2)
    expect(harness.context.drawElements).toHaveBeenCalledWith(
      harness.context.TRIANGLES,
      18,
      harness.context.UNSIGNED_SHORT,
      0,
    )
  })

  it("reuses cached resources and releases both buffers on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_INDEXED_POLYGON_SCENE,
    )
    renderWebGlIndexedPolygonScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_INDEXED_POLYGON_SCENE,
      sides: 8,
      rotation: -18,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.createBuffer).toHaveBeenCalledTimes(2)
    expect(releaseWebGlIndexedPolygonResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
