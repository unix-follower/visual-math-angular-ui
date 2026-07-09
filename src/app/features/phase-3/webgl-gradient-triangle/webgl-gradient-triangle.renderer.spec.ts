import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE } from "./webgl-gradient-triangle.model"
import {
  releaseWebGlGradientTriangleResources,
  renderWebGlGradientTriangleScene,
} from "./webgl-gradient-triangle.renderer"

describe("webgl-gradient-triangle.renderer", () => {
  it("creates program resources and submits a triangle draw", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlGradientTriangleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.useProgram).toHaveBeenCalled()
    expect(harness.context.bufferData).toHaveBeenCalled()
    expect(harness.context.drawArrays).toHaveBeenCalledWith(harness.context.TRIANGLES, 0, 3)
  })

  it("reuses cached resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlGradientTriangleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
    )
    renderWebGlGradientTriangleScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
      rotation: 24,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlGradientTriangleResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlGradientTriangleResources(harness.runtime)).toBe(false)
  })
})
