import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE } from "./webgl-temporal-feedback.model"
import {
  releaseWebGlTemporalFeedbackResources,
  renderWebGlTemporalFeedbackScene,
} from "./webgl-temporal-feedback.renderer"

describe("webgl-temporal-feedback.renderer", () => {
  it("renders one feedback relay per frame and composites the evolving field", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTemporalFeedbackScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      0.2,
    )
    renderWebGlTemporalFeedbackScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      0.4,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(4)
  })

  it("reuses cached resources and releases the persistent targets on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlTemporalFeedbackScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      0.2,
    )

    expect(releaseWebGlTemporalFeedbackResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
  })
})
