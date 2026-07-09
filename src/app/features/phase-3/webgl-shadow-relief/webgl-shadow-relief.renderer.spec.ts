import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_SHADOW_RELIEF_SCENE } from "./webgl-shadow-relief.model"
import {
  releaseWebGlShadowReliefResources,
  renderWebGlShadowReliefScene,
} from "./webgl-shadow-relief.renderer"

describe("webgl-shadow-relief.renderer", () => {
  it("renders the shadow-relief scene with a material matrix and scalar controls", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlShadowReliefScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.uniformMatrix3fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(4)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(1)
  })

  it("reuses cached relief resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlShadowReliefScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
    renderWebGlShadowReliefScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_SHADOW_RELIEF_SCENE,
      relief: 0.74,
      shadow: 0.68,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlShadowReliefResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
