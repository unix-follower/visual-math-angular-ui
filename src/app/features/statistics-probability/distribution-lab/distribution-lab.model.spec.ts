import {
  binomialCoefficient,
  binomialProbability,
  distributionLabMetrics,
  distributionLabSummary,
  type DistributionLabScene,
} from "./distribution-lab.model"

describe("distribution-lab.model", () => {
  it("computes binomial coefficients and exact probabilities", () => {
    expect(binomialCoefficient(5, 2)).toBe(10)
    expect(binomialProbability(4, 0.5, 2)).toBeCloseTo(0.375, 6)
  })

  it("builds a normalized probability distribution", () => {
    const scene: DistributionLabScene = {
      trialCount: 6,
      successProbability: 0.35,
      highlightedOutcome: 2,
      showExpectedValue: true,
      showCumulativeProbability: true,
    }

    const metrics = distributionLabMetrics(scene)
    const totalProbability = metrics.probabilities.reduce(
      (sum, probability) => sum + probability,
      0,
    )

    expect(totalProbability).toBeCloseTo(1, 6)
    expect(metrics.maxProbability).toBeGreaterThan(0)
  })

  it("derives cumulative probability and expectation", () => {
    const scene: DistributionLabScene = {
      trialCount: 4,
      successProbability: 0.5,
      highlightedOutcome: 2,
      showExpectedValue: true,
      showCumulativeProbability: true,
    }

    const metrics = distributionLabMetrics(scene)

    expect(metrics.highlightedProbability).toBeCloseTo(0.375, 6)
    expect(metrics.cumulativeProbability).toBeCloseTo(0.6875, 6)
    expect(metrics.expectedValue).toBeCloseTo(2, 6)
    expect(metrics.variance).toBeCloseTo(1, 6)
  })

  it("summarizes the highlighted distribution outcome", () => {
    const scene: DistributionLabScene = {
      trialCount: 8,
      successProbability: 0.45,
      highlightedOutcome: 4,
      showExpectedValue: true,
      showCumulativeProbability: true,
    }

    expect(distributionLabSummary(scene)).toContain("P(X = 4)")
    expect(distributionLabSummary(scene)).toContain("expected number of successes")
  })
})
