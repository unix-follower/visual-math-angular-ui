import { createWebGlRendererHarness } from "../../../shared/webgl/webgl-renderer-test-harness"

import { DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE } from "./webgl-ping-pong-feedback.model"
import {
  releaseWebGlPingPongFeedbackResources,
  renderWebGlPingPongFeedbackScene,
} from "./webgl-ping-pong-feedback.renderer"

describe("webgl-ping-pong-feedback.renderer", () => {
  it("bounces image data between two offscreen targets before presenting to the canvas", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlPingPongFeedbackScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
    )

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(harness.context.createFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.createTexture).toHaveBeenCalledTimes(2)
    expect(harness.context.framebufferTexture2D).toHaveBeenCalledTimes(2)
    expect(harness.context.drawArrays).toHaveBeenCalledTimes(4)
  })

  it("reuses cached resources and releases both ping-pong targets on teardown", () => {
    const harness = createWebGlRendererHarness()

    renderWebGlPingPongFeedbackScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
    )
    renderWebGlPingPongFeedbackScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
      drift: 0.52,
      feedback: 0.78,
    })

    expect(harness.context.createProgram).toHaveBeenCalledTimes(2)
    expect(releaseWebGlPingPongFeedbackResources(harness.runtime)).toBe(true)
    expect(harness.context.deleteFramebuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteTexture).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteBuffer).toHaveBeenCalledTimes(2)
    expect(harness.context.deleteProgram).toHaveBeenCalledTimes(2)
  })
})
