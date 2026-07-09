import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_TEXTURE_GRID_SCENE } from "./webgl-texture-grid.model"
import {
  releaseWebGlTextureGridResources,
  renderWebGlTextureGridScene,
} from "./webgl-texture-grid.renderer"

describe("webgl-texture-grid.renderer", () => {
  it("uploads a texture-backed quad draw", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_TEXTURE_GRID_SCENE)

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.createTexture).toHaveBeenCalledTimes(1)
    expect(harness.context.texImage2D).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1i).toHaveBeenCalledWith(expect.anything(), 0)
    expect(harness.context.drawArrays).toHaveBeenCalledWith(harness.context.TRIANGLES, 0, 6)
  })

  it("reuses cached resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
    renderWebGlTextureGridScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_TEXTURE_GRID_SCENE,
      contrast: 0.32,
      blend: 0.74,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.createTexture).toHaveBeenCalledTimes(1)
    expect(releaseWebGlTextureGridResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
