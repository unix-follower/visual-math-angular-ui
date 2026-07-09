import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE } from "./webgl-perspective-camera.model"
import {
  releaseWebGlPerspectiveCameraResources,
  renderWebGlPerspectiveCameraScene,
} from "./webgl-perspective-camera.renderer"

describe("webgl-perspective-camera.renderer", () => {
  it("renders the layered perspective scene with a 4x4 view-projection matrix", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlPerspectiveCameraScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(harness.context.uniformMatrix4fv).toHaveBeenCalledTimes(1)
    expect(harness.context.uniform1f).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(1)
  })

  it("reuses cached camera resources and releases the program on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlPerspectiveCameraScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
    )
    renderWebGlPerspectiveCameraScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
      yaw: -12,
      pitch: 24,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(1)
    expect(releaseWebGlPerspectiveCameraResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
