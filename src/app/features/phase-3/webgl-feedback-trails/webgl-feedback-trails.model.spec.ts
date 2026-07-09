import {
  DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
  isWebGlFeedbackTrailsScene,
  webGlFeedbackTrailRelayCount,
  webGlFeedbackTrailsAccentColor,
  webGlFeedbackTrailsClearColor,
  webGlFeedbackTrailsStageLabel,
  webGlFeedbackTrailsSummary,
} from "./webgl-feedback-trails.model"

describe("webgl-feedback-trails.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlFeedbackTrailsScene(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)).toBe(true)
    expect(isWebGlFeedbackTrailsScene({ ...DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE, decay: 1.2 })).toBe(
      false,
    )
  })

  it("formats derived labels", () => {
    expect(webGlFeedbackTrailsClearColor(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)).toBe(
      "rgba(8, 20, 41, 1.00)",
    )
    expect(webGlFeedbackTrailsAccentColor(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)).toBe(
      "rgb(89, 72, 70)",
    )
    expect(webGlFeedbackTrailRelayCount(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)).toBe(8)
    expect(webGlFeedbackTrailsStageLabel(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)).toBe(
      "8 relays, drift 0.34, decay 0.58",
    )
  })

  it("summarizes the trail route state", () => {
    const summary = webGlFeedbackTrailsSummary(
      DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("relays the image 8 times")
    expect(summary).toContain("webgl2")
  })
})
