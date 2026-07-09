export type DistributionLabScene = {
  readonly trialCount: number
  readonly successProbability: number
  readonly highlightedOutcome: number
  readonly showExpectedValue: boolean
  readonly showCumulativeProbability: boolean
}

export type DistributionLabMetrics = {
  readonly probabilities: readonly number[]
  readonly highlightedProbability: number
  readonly cumulativeProbability: number
  readonly expectedValue: number
  readonly variance: number
  readonly mode: number
  readonly maxProbability: number
}

export const DEFAULT_DISTRIBUTION_LAB_SCENE: DistributionLabScene = {
  trialCount: 8,
  successProbability: 0.45,
  highlightedOutcome: 4,
  showExpectedValue: true,
  showCumulativeProbability: true,
}

export function isDistributionLabScene(value: unknown): value is DistributionLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["trialCount"] === "number" &&
    typeof candidate["successProbability"] === "number" &&
    typeof candidate["highlightedOutcome"] === "number" &&
    typeof candidate["showExpectedValue"] === "boolean" &&
    typeof candidate["showCumulativeProbability"] === "boolean"
  )
}

export function binomialCoefficient(n: number, k: number): number {
  const boundedK = Math.min(k, n - k)

  if (boundedK < 0 || boundedK > n) {
    return 0
  }

  let result = 1

  for (let index = 1; index <= boundedK; index += 1) {
    result = (result * (n - boundedK + index)) / index
  }

  return result
}

export function binomialProbability(
  trialCount: number,
  successProbability: number,
  outcome: number,
): number {
  if (outcome < 0 || outcome > trialCount) {
    return 0
  }

  return (
    binomialCoefficient(trialCount, outcome) *
    successProbability ** outcome *
    (1 - successProbability) ** (trialCount - outcome)
  )
}

export function distributionLabMetrics(scene: DistributionLabScene): DistributionLabMetrics {
  const highlightedOutcome = clampHighlightedOutcome(scene.highlightedOutcome, scene.trialCount)
  const probabilities = Array.from({ length: scene.trialCount + 1 }, (_, outcome) =>
    binomialProbability(scene.trialCount, scene.successProbability, outcome),
  )
  const highlightedProbability = probabilities[highlightedOutcome] ?? 0
  const cumulativeProbability = probabilities
    .slice(0, highlightedOutcome + 1)
    .reduce((sum, probability) => sum + probability, 0)
  const expectedValue = scene.trialCount * scene.successProbability
  const variance = expectedValue * (1 - scene.successProbability)
  const mode = Math.min(
    scene.trialCount,
    Math.max(0, Math.floor((scene.trialCount + 1) * scene.successProbability)),
  )

  return {
    probabilities,
    highlightedProbability,
    cumulativeProbability,
    expectedValue,
    variance,
    mode,
    maxProbability: Math.max(...probabilities),
  }
}

export function distributionLabSummary(
  scene: DistributionLabScene,
  metrics: DistributionLabMetrics = distributionLabMetrics(scene),
): string {
  const highlightedOutcome = clampHighlightedOutcome(scene.highlightedOutcome, scene.trialCount)

  return `For ${scene.trialCount} Bernoulli trials at success probability ${scene.successProbability.toFixed(2)}, P(X = ${highlightedOutcome}) is ${metrics.highlightedProbability.toFixed(3)} and P(X <= ${highlightedOutcome}) is ${metrics.cumulativeProbability.toFixed(3)}. The expected number of successes is ${metrics.expectedValue.toFixed(2)}.`
}

function clampHighlightedOutcome(outcome: number, trialCount: number): number {
  return Math.min(trialCount, Math.max(0, Math.round(outcome)))
}
