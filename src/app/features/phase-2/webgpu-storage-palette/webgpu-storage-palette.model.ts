export type WebGpuStoragePaletteScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly warmth: number
  readonly contrast: number
  readonly balance: number
  readonly glow: number
}

export const DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE: WebGpuStoragePaletteScene = {
  red: 0.05,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  warmth: 0.62,
  contrast: 0.74,
  balance: 0.12,
  glow: 0.68,
}

export function isWebGpuStoragePaletteScene(value: unknown): value is WebGpuStoragePaletteScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["warmth"]) &&
    isChannel(candidate["contrast"]) &&
    isBalance(candidate["balance"]) &&
    isChannel(candidate["glow"])
  )
}

export function webGpuStoragePaletteSummary(
  scene: WebGpuStoragePaletteScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU storage palette is ${runtimeStatus.toLowerCase()} with a static vertex mesh colored from a six-entry storage buffer targeting ${formatLabel}. The viewport clears to ${storagePaletteClearColor(scene)} while warmth ${scene.warmth.toFixed(2)}, contrast ${scene.contrast.toFixed(2)}, balance ${scene.balance.toFixed(2)}, and glow ${scene.glow.toFixed(2)} reshape the palette on the GPU.`
}

export function storagePaletteClearColor(scene: WebGpuStoragePaletteScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function storagePalettePeakColor(scene: WebGpuStoragePaletteScene): string {
  const red = Math.round((0.24 + scene.warmth * 0.62) * 255)
  const green = Math.round(
    (0.22 + (1 - scene.balance * 0.5 - 0.5) * 0.32 + scene.glow * 0.18) * 255,
  )
  const blue = Math.round((0.28 + (1 - scene.blue) * 0.24 + (1 - scene.warmth) * 0.18) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function storagePaletteSpread(scene: WebGpuStoragePaletteScene): string {
  const spread = 0.4 + scene.contrast * 0.9 + Math.abs(scene.balance) * 0.3
  return `${spread.toFixed(2)} palette units`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}

function isBalance(value: unknown): value is number {
  return typeof value === "number" && value >= -1 && value <= 1
}
