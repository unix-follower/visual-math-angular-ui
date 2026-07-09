import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE } from "./webgl-textured-material.model"
import {
  releaseWebGlTexturedMaterialResources,
  renderWebGlTexturedMaterialScene,
} from "./webgl-textured-material.renderer"

describe("webgl-textured-material.renderer", () => {
  it("renders the textured material surface with one texture upload and one draw", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTexturedMaterialScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.texImage2D).toHaveBeenCalled()
    expect(harness.context.uniformMatrix3fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(4)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(1)
  })

  it("reuses cached textured-material resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTexturedMaterialScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
    )
    renderWebGlTexturedMaterialScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
      textureMix: 0.42,
      relief: 0.72,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlTexturedMaterialResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
