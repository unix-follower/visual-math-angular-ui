import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE } from "./webgl-multi-obstacle-flow.model"
import {
  releaseWebGlMultiObstacleFlowResources,
  renderWebGlMultiObstacleFlowScene,
} from "./webgl-multi-obstacle-flow.renderer"

describe("webgl-multi-obstacle-flow.renderer", () => {
  it("renders the multi-obstacle field across an evolve pass and a composite pass", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlMultiObstacleFlowScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
      0.3,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.bindFramebuffer).toHaveBeenCalled()
    expect(harness.context.uniform1f).toHaveBeenCalled()
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("reuses cached multi-obstacle resources and releases them on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlMultiObstacleFlowScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
      0.3,
    )
    renderWebGlMultiObstacleFlowScene(
      harness.canvas,
      harness.runtime,
      { ...DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE, primaryX: 0.58, secondaryY: 0.62 },
      0.64,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(releaseWebGlMultiObstacleFlowResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalled()
    expect(harness.context.deleteFramebuffer).toHaveBeenCalled()
  })
})
