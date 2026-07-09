import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import {
  DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
  webGlFeedbackTrailRelayCount,
} from "./webgl-feedback-trails.model"
import {
  releaseWebGlFeedbackTrailsResources,
  renderWebGlFeedbackTrailsScene,
} from "./webgl-feedback-trails.renderer"

describe("webgl-feedback-trails.renderer", () => {
  it("renders a seeded trail field across repeated ping-pong relays before the final composite", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlFeedbackTrailsScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(3)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.framebufferTexture2D).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(
      webGlFeedbackTrailRelayCount(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE) + 2,
    )
  })

  it("reuses cached resources and releases both shared trail targets on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlFeedbackTrailsScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
    )
    renderWebGlFeedbackTrailsScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
      relays: 0.82,
      decay: 0.44,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(3)
    expect(releaseWebGlFeedbackTrailsResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(3)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(3)
  })
})
