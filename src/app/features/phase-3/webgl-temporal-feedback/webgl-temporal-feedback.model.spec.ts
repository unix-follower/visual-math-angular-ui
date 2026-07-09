import {
  DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
  isWebGlTemporalFeedbackScene,
  webGlTemporalFeedbackAccentColor,
  webGlTemporalFeedbackClearColor,
  webGlTemporalFeedbackPersistence,
  webGlTemporalFeedbackStageLabel,
  webGlTemporalFeedbackSummary,
} from "./webgl-temporal-feedback.model"

describe("webgl-temporal-feedback.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlTemporalFeedbackScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(true)
    expect(
      isWebGlTemporalFeedbackScene({ ...DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE, speed: 3 }),
    ).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlTemporalFeedbackClearColor(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "rgba(5, 13, 28, 1.00)",
    )
    expect(webGlTemporalFeedbackAccentColor(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "rgb(111, 86, 78)",
    )
    expect(webGlTemporalFeedbackPersistence(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "68% retained per frame",
    )
    expect(webGlTemporalFeedbackStageLabel(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "1 relay per frame, drift 0.34, decay 0.62",
    )
  })

  it("summarizes the temporal route state", () => {
    const summary = webGlTemporalFeedbackSummary(
      DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
      "Ready",
      0.42,
      "webgl2",
    )

    expect(summary).toContain("relays the previous offscreen texture forward once")
    expect(summary).toContain("phase 0.42")
  })
})
