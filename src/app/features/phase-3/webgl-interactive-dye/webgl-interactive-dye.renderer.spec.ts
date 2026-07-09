import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE } from "./webgl-interactive-dye.model"
import {
  releaseWebGlInteractiveDyeResources,
  renderWebGlInteractiveDyeScene,
} from "./webgl-interactive-dye.renderer"

describe("webgl-interactive-dye.renderer", () => {
  it("renders the interactive field across an offscreen evolve pass and a canvas composite pass", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlInteractiveDyeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
      0.24,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.bindFramebuffer).toHaveBeenCalled()
    expect(harness.context.uniform1f).toHaveBeenCalled()
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("reuses cached interactive resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlInteractiveDyeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
      0.24,
    )
    renderWebGlInteractiveDyeScene(
      harness.canvas,
      harness.runtime,
      { ...DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE, injectionX: 0.56, obstacleY: 0.68 },
      0.58,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(releaseWebGlInteractiveDyeResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalled()
    expect(harness.context.deleteFramebuffer).toHaveBeenCalled()
  })
})
