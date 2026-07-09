export type WebGlFoundationScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
}

export const DEFAULT_WEBGL_FOUNDATION_SCENE: WebGlFoundationScene = {
  red: 0.09,
  green: 0.14,
  blue: 0.22,
  alpha: 1,
}

export function isWebGlFoundationScene(value: unknown): value is WebGlFoundationScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"])
  )
}

export function formatWebGlClearColor(scene: WebGlFoundationScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlFoundationSummary(
  scene: WebGlFoundationScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL foundation is ${runtimeStatus.toLowerCase()} with a baseline clear-pass renderer targeting ${versionLabel}. The viewport clears to ${formatWebGlClearColor(scene)} so later Phase 3 slices can layer shader programs and geometry on top of a tested context/bootstrap path.`
}

export function webGlFoundationChannelEnergy(scene: WebGlFoundationScene): string {
  return `${(((scene.red + scene.green + scene.blue) / 3) * 100).toFixed(0)}%`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
