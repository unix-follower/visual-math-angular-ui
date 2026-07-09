import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_LIT_MATERIAL_SCENE } from "./webgl-lit-material.model"
import {
  releaseWebGlLitMaterialResources,
  renderWebGlLitMaterialScene,
} from "./webgl-lit-material.renderer"

describe("webgl-lit-material.renderer", () => {
  it("renders the lit material orb in a single pass", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlLitMaterialScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_LIT_MATERIAL_SCENE)

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(1)
    expect(harness.context.uniformMatrix3fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(4)
  })

  it("reuses cached resources and releases the lit material program on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlLitMaterialScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
    renderWebGlLitMaterialScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_LIT_MATERIAL_SCENE,
      rim: 0.62,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlLitMaterialResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
