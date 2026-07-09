import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_VELOCITY_FIELD_SCENE } from "./webgl-velocity-field.model"
import {
  releaseWebGlVelocityFieldResources,
  renderWebGlVelocityFieldScene,
} from "./webgl-velocity-field.renderer"

describe("webgl-velocity-field.renderer", () => {
  it("advects one velocity-field step per frame before compositing", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlVelocityFieldScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
      0.24,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("reuses cached velocity-field targets across frames and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlVelocityFieldScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
      0.24,
    )
    renderWebGlVelocityFieldScene(
      harness.canvas,
      harness.runtime,
      { ...DEFAULT_WEBGL_VELOCITY_FIELD_SCENE, swirl: 0.82, shear: 0.18 },
      0.52,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(4)
    expect(releaseWebGlVelocityFieldResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
  })
})
