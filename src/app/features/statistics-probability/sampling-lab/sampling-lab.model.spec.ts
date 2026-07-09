import {
  DEFAULT_SAMPLING_LAB_SCENE,
  isSamplingLabScene,
  samplingLabSummary,
  simulateSamplingLab,
  theoreticalMean,
} from "./sampling-lab.model"

describe("sampling-lab.model", () => {
  it("should recognize a valid sampling-lab scene", () => {
    expect(isSamplingLabScene(DEFAULT_SAMPLING_LAB_SCENE)).toBe(true)
    expect(isSamplingLabScene({ successProbability: 0.5 })).toBe(false)
  })

  it("should simulate deterministic histogram metrics", () => {
    const metrics = simulateSamplingLab(DEFAULT_SAMPLING_LAB_SCENE)

    expect(metrics.histogram.reduce((sum, count) => sum + count, 0)).toBe(
      DEFAULT_SAMPLING_LAB_SCENE.experimentCount,
    )
    expect(metrics.theoreticalMean).toBe(theoreticalMean(DEFAULT_SAMPLING_LAB_SCENE))
    expect(metrics.empiricalMean).toBeCloseTo(4.75, 2)
  })

  it("should summarize the sampling experiment", () => {
    const summary = samplingLabSummary(DEFAULT_SAMPLING_LAB_SCENE)

    expect(summary).toContain("60 experiments")
    expect(summary).toContain("expected value is 5.00")
  })
})
