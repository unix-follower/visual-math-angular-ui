import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_FOUNDATION_SCENE } from "./webgl-foundation.model"
import {
  releaseWebGlFoundationResources,
  renderWebGlFoundationScene,
} from "./webgl-foundation.renderer"

describe("webgl-foundation.renderer", () => {
  it("clears the canvas through the WebGL2 context", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_FOUNDATION_SCENE)

    expect(harness.context.viewport).toHaveBeenCalledWith(
      0,
      0,
      harness.canvas.width,
      harness.canvas.height,
    )
    expect(harness.context.clearColor).toHaveBeenCalledWith(0.09, 0.14, 0.22, 1)
    expect(harness.context.clear).toHaveBeenCalledWith(harness.context.COLOR_BUFFER_BIT)
  })

  it("marks the runtime as releasable after a render pass", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_FOUNDATION_SCENE)

    expect(releaseWebGlFoundationResources(harness.runtime)).toBe(true)
    expect(releaseWebGlFoundationResources(harness.runtime)).toBe(false)
  })
})
