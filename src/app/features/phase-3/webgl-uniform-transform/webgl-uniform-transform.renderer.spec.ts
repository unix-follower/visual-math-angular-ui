import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE } from "./webgl-uniform-transform.model"
import {
  releaseWebGlUniformTransformResources,
  renderWebGlUniformTransformScene,
} from "./webgl-uniform-transform.renderer"

describe("webgl-uniform-transform.renderer", () => {
  it("uploads the static mesh once and updates uniforms for the draw", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.bufferData).toHaveBeenCalledTimes(1)
    expect(harness.context.uniformMatrix3fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledWith(expect.anything(), 0.72)
    expect(harness.context.drawArrays).toHaveBeenCalledWith(harness.context.TRIANGLES, 0, 6)
  })

  it("reuses cached resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
    )
    renderWebGlUniformTransformScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
      rotation: 30,
      offsetX: -0.12,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.bufferData).toHaveBeenCalledTimes(1)
    expect(harness.context.uniformMatrix3fv).toHaveBeenCalledTimes(2)
    expect(releaseWebGlUniformTransformResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
