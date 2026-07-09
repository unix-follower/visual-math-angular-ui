import {
  DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
  isWebGlVelocityFieldScene,
  webGlVelocityFieldAccentColor,
  webGlVelocityFieldClearColor,
  webGlVelocityFieldFlowLabel,
  webGlVelocityFieldMemoryLabel,
  webGlVelocityFieldSummary,
} from "./webgl-velocity-field.model"

describe("webgl-velocity-field.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlVelocityFieldScene(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)).toBe(true)
    expect(isWebGlVelocityFieldScene({ ...DEFAULT_WEBGL_VELOCITY_FIELD_SCENE, speed: 3 })).toBe(
      false,
    )
  })

  it("formats derived labels", () => {
    expect(webGlVelocityFieldClearColor(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)).toBe(
      "rgba(5, 13, 26, 1.00)",
    )
    expect(webGlVelocityFieldAccentColor(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)).toBe(
      "rgb(153, 144, 150)",
    )
    expect(webGlVelocityFieldFlowLabel(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)).toBe(
      "swirl 0.62, shear 0.38",
    )
    expect(webGlVelocityFieldMemoryLabel(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)).toBe("63% retained")
  })

  it("summarizes the velocity-field route state", () => {
    const summary = webGlVelocityFieldSummary(
      DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
      "Ready",
      0.36,
      "webgl2",
    )

    expect(summary).toContain("synthetic velocity field")
    expect(summary).toContain("phase 0.36")
  })
})
