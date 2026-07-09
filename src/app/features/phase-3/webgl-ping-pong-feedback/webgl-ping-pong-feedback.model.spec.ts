import {
  DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
  isWebGlPingPongFeedbackScene,
  webGlPingPongFeedbackAccentColor,
  webGlPingPongFeedbackClearColor,
  webGlPingPongFeedbackStageLabel,
  webGlPingPongFeedbackSummary,
} from "./webgl-ping-pong-feedback.model"

describe("webgl-ping-pong-feedback.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlPingPongFeedbackScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(true)
    expect(
      isWebGlPingPongFeedbackScene({ ...DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE, feedback: 1.2 }),
    ).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlPingPongFeedbackClearColor(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "rgba(10, 20, 41, 1.00)",
    )
    expect(webGlPingPongFeedbackAccentColor(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "rgb(84, 74, 67)",
    )
    expect(webGlPingPongFeedbackStageLabel(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "Drift 0.34, feedback 0.62",
    )
  })

  it("summarizes the ping-pong route state", () => {
    const summary = webGlPingPongFeedbackSummary(
      DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("bounces")
    expect(summary).toContain("webgl2")
  })
})
