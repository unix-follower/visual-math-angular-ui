export type LimitsLabScene = {
  readonly targetX: number
  readonly frequency: number
  readonly windowRadius: number
  readonly showSamples: boolean
  readonly showLimitGuide: boolean
}

export const DEFAULT_LIMITS_LAB_SCENE: LimitsLabScene = {
  targetX: 0,
  frequency: 1,
  windowRadius: 0.4,
  showSamples: true,
  showLimitGuide: true,
}

export function isLimitsLabScene(value: unknown): value is LimitsLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["targetX"] === "number" &&
    typeof candidate["frequency"] === "number" &&
    typeof candidate["windowRadius"] === "number" &&
    typeof candidate["showSamples"] === "boolean" &&
    typeof candidate["showLimitGuide"] === "boolean"
  )
}

export function evaluateLimitsCurve(scene: LimitsLabScene, x: number): number | null {
  const delta = x - scene.targetX

  if (Math.abs(delta) < 1e-6) {
    return null
  }

  return Math.sin(scene.frequency * delta) / delta
}

export function limitValue(scene: LimitsLabScene): number {
  return scene.frequency
}

export function leftHandValue(scene: LimitsLabScene): number {
  return evaluateLimitsCurve(scene, scene.targetX - scene.windowRadius) ?? limitValue(scene)
}

export function rightHandValue(scene: LimitsLabScene): number {
  return evaluateLimitsCurve(scene, scene.targetX + scene.windowRadius) ?? limitValue(scene)
}

export function averageApproximation(scene: LimitsLabScene): number {
  return (leftHandValue(scene) + rightHandValue(scene)) / 2
}

export function limitsLabSummary(scene: LimitsLabScene): string {
  return `As x approaches ${scene.targetX.toFixed(2)}, the left-hand value is ${leftHandValue(scene).toFixed(3)}, the right-hand value is ${rightHandValue(scene).toFixed(3)}, and the removable-discontinuity limit is ${limitValue(scene).toFixed(3)}.`
}
