export type WebGpuIndirectRibbonScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly span: number
  readonly taper: number
  readonly echo: number
}

export const DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE: WebGpuIndirectRibbonScene = {
  red: 0.05,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  span: 0.56,
  taper: 0.42,
  echo: 0.34,
}

export function isWebGpuIndirectRibbonScene(value: unknown): value is WebGpuIndirectRibbonScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["span"]) &&
    isChannel(candidate["taper"]) &&
    isChannel(candidate["echo"])
  )
}

export function webGpuIndirectRibbonSummary(
  scene: WebGpuIndirectRibbonScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU indirect ribbon is ${runtimeStatus.toLowerCase()} with draw parameters encoded in an indirect buffer before the render pass executes on ${formatLabel}. The viewport clears to ${indirectRibbonClearColor(scene)} while span ${scene.span.toFixed(2)}, taper ${scene.taper.toFixed(2)}, and echo ${scene.echo.toFixed(2)} reshape the ribbon mesh and its indirect instance count.`
}

export function indirectRibbonClearColor(scene: WebGpuIndirectRibbonScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function indirectRibbonAccentColor(scene: WebGpuIndirectRibbonScene): string {
  const red = Math.round((0.18 + scene.span * 0.4 + scene.echo * 0.12) * 255)
  const green = Math.round((0.18 + scene.taper * 0.3 + scene.echo * 0.18) * 255)
  const blue = Math.round((0.2 + scene.blue * 0.28 + (1 - scene.taper) * 0.16) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function indirectRibbonStageLabel(scene: WebGpuIndirectRibbonScene): string {
  return `Indirect draw / echoes ${indirectRibbonInstanceCount(scene)}`
}

export function indirectRibbonInstanceCount(scene: WebGpuIndirectRibbonScene): number {
  return 1 + Math.round(scene.echo * 4)
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
