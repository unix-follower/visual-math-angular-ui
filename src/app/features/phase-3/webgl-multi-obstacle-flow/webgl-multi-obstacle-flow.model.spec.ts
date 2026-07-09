import {
  DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  isWebGlMultiObstacleFlowScene,
  webGlMultiObstacleFlowClearColor,
  webGlMultiObstacleFlowInjectionLabel,
  webGlMultiObstacleFlowPrimaryLabel,
  webGlMultiObstacleFlowSecondaryLabel,
  webGlMultiObstacleFlowSummary,
} from "./webgl-multi-obstacle-flow.model"

describe("webgl-multi-obstacle-flow.model", () => {
  it("recognizes a valid scene", () => {
    expect(isWebGlMultiObstacleFlowScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(true)
    expect(
      isWebGlMultiObstacleFlowScene({
        ...DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
        secondaryRadius: 0.4,
      }),
    ).toBe(false)
  })

  it("formats derived labels", () => {
    expect(webGlMultiObstacleFlowClearColor(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "rgba(8, 13, 20, 1.00)",
    )
    expect(webGlMultiObstacleFlowInjectionLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.24, 0.62 at 0.78",
    )
    expect(webGlMultiObstacleFlowPrimaryLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.42, 0.50 radius 0.16",
    )
    expect(webGlMultiObstacleFlowSecondaryLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.74, 0.38 radius 0.12",
    )
  })

  it("summarizes the multi-obstacle route state", () => {
    const summary = webGlMultiObstacleFlowSummary(
      DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
      "Ready",
      "webgl2",
    )

    expect(summary).toContain("two draggable obstacles")
    expect(summary).toContain("feedback texture")
  })
})
