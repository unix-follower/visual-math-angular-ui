export type SamplingLabScene = {
  readonly successProbability: number
  readonly trialsPerExperiment: number
  readonly experimentCount: number
  readonly seed: number
  readonly showExpectedValue: boolean
  readonly showEmpiricalMean: boolean
}

export type SamplingLabMetrics = {
  readonly histogram: readonly number[]
  readonly empiricalMean: number
  readonly theoreticalMean: number
  readonly maxBucketCount: number
}

export const DEFAULT_SAMPLING_LAB_SCENE: SamplingLabScene = {
  successProbability: 0.5,
  trialsPerExperiment: 10,
  experimentCount: 60,
  seed: 17,
  showExpectedValue: true,
  showEmpiricalMean: true,
}

export function isSamplingLabScene(value: unknown): value is SamplingLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["successProbability"] === "number" &&
    typeof candidate["trialsPerExperiment"] === "number" &&
    typeof candidate["experimentCount"] === "number" &&
    typeof candidate["seed"] === "number" &&
    typeof candidate["showExpectedValue"] === "boolean" &&
    typeof candidate["showEmpiricalMean"] === "boolean"
  )
}

export function theoreticalMean(scene: SamplingLabScene): number {
  return scene.trialsPerExperiment * scene.successProbability
}

export function simulateSamplingLab(scene: SamplingLabScene): SamplingLabMetrics {
  const histogram = Array.from({ length: scene.trialsPerExperiment + 1 }, () => 0)
  let generator = createSeededGenerator(scene.seed)
  let sum = 0

  for (let experimentIndex = 0; experimentIndex < scene.experimentCount; experimentIndex += 1) {
    let successes = 0

    for (let trialIndex = 0; trialIndex < scene.trialsPerExperiment; trialIndex += 1) {
      generator = nextSeed(generator)

      if (seedToUnitInterval(generator) < scene.successProbability) {
        successes += 1
      }
    }

    histogram[successes] += 1
    sum += successes
  }

  return {
    histogram,
    empiricalMean: sum / scene.experimentCount,
    theoreticalMean: theoreticalMean(scene),
    maxBucketCount: Math.max(...histogram),
  }
}

export function samplingLabSummary(scene: SamplingLabScene, metrics?: SamplingLabMetrics): string {
  const derivedMetrics = metrics ?? simulateSamplingLab(scene)

  return `Across ${scene.experimentCount} experiments of ${scene.trialsPerExperiment} Bernoulli trials at probability ${scene.successProbability.toFixed(2)}, the empirical mean is ${derivedMetrics.empiricalMean.toFixed(2)} while the expected value is ${derivedMetrics.theoreticalMean.toFixed(2)}.`
}

function createSeededGenerator(seed: number): number {
  return Math.abs(Math.trunc(seed)) || 1
}

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) % 4294967296
}

function seedToUnitInterval(seed: number): number {
  return seed / 4294967296
}
