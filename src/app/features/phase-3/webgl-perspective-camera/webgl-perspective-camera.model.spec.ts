import {
  DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
  isWebGlPerspectiveCameraScene,
  webGlPerspectiveCameraAccentColor,
  webGlPerspectiveCameraAngles,
  webGlPerspectiveCameraClearColor,
  webGlPerspectiveCameraDepthLabel,
  webGlPerspectiveCameraLens,
  webGlPerspectiveCameraSummary,
} from "./webgl-perspective-camera.model"

describe("webgl-perspective-camera.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlPerspectiveCameraScene(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(true)
    expect(
      isWebGlPerspectiveCameraScene({ ...DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE, yaw: 92 }),
    ).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlPerspectiveCameraClearColor(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(
      "rgba(10, 18, 31, 1.00)",
    )
    expect(webGlPerspectiveCameraAccentColor(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(
      "rgb(150, 135, 186)",
    )
    expect(webGlPerspectiveCameraAngles(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(
      "yaw 22°, pitch 14°",
    )
    expect(webGlPerspectiveCameraLens(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(
      "58° fov at 3.8 units",
    )
    expect(webGlPerspectiveCameraDepthLabel(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)).toBe(
      "z-span 1.47",
    )
  })

  it("summarizes the camera route state", () => {
    const summary = webGlPerspectiveCameraSummary(
      DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("perspective camera")
    expect(summary).toContain("yaw 22°")
  })
})
