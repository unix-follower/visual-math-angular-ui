import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_DUAL_PASS_SCENE } from "./webgl-dual-pass.model"
import { releaseWebGlDualPassResources, renderWebGlDualPassScene } from "./webgl-dual-pass.renderer"

describe("webgl-dual-pass.renderer", () => {
  it("renders through an offscreen framebuffer before compositing to the canvas", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_DUAL_PASS_SCENE)

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.framebufferTexture2D).toHaveBeenCalledTimes(1)
    expect(harness.context.bindFramebuffer).toHaveBeenCalledWith(harness.context.FRAMEBUFFER, null)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("reuses cached resources and releases framebuffer-backed resources on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_DUAL_PASS_SCENE)
    renderWebGlDualPassScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_DUAL_PASS_SCENE,
      skew: 0.2,
      mix: 0.82,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(releaseWebGlDualPassResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
  })
})
