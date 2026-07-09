import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_DEPTH_PRISM_SCENE } from "./webgl-depth-prism.model"
import {
  releaseWebGlDepthPrismResources,
  renderWebGlDepthPrismScene,
} from "./webgl-depth-prism.renderer"

describe("webgl-depth-prism.renderer", () => {
  it("renders the prism scene with depth testing enabled", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlDepthPrismScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_DEPTH_PRISM_SCENE)

    expect(harness.context.enable).toHaveBeenCalledWith(harness.context.DEPTH_TEST)
    expect(harness.context.depthFunc).toHaveBeenCalledWith(harness.context.LESS)
    expect(harness.context.clearDepth).toHaveBeenCalledWith(1)
    expect(harness.context.uniformMatrix4fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(3)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(1)
  })

  it("reuses cached prism resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlDepthPrismScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
    renderWebGlDepthPrismScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_DEPTH_PRISM_SCENE,
      yaw: -18,
      prismLift: 0.74,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlDepthPrismResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
