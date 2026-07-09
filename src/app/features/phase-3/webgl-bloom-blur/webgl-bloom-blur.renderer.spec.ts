import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_BLOOM_BLUR_SCENE } from "./webgl-bloom-blur.model"
import {
  releaseWebGlBloomBlurResources,
  renderWebGlBloomBlurScene,
} from "./webgl-bloom-blur.renderer"

describe("webgl-bloom-blur.renderer", () => {
  it("renders emissive geometry into an offscreen texture and blurs it during the composite pass", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlBloomBlurScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_BLOOM_BLUR_SCENE)

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.framebufferTexture2D).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(3)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("reuses cached resources and releases the blur-composite surfaces on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlBloomBlurScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_BLOOM_BLUR_SCENE)
    renderWebGlBloomBlurScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_BLOOM_BLUR_SCENE,
      blur: 0.52,
      mix: 0.82,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(releaseWebGlBloomBlurResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
  })
})
