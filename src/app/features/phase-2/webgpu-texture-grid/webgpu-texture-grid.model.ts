export type WebGpuTextureGridScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly frequency: number
  readonly contrast: number
  readonly blend: number
}

export const DEFAULT_WEBGPU_TEXTURE_GRID_SCENE: WebGpuTextureGridScene = {
  red: 0.08,
  green: 0.1,
  blue: 0.22,
  alpha: 1,
  frequency: 0.5,
  contrast: 0.7,
  blend: 0.6,
}

export function isWebGpuTextureGridScene(value: unknown): value is WebGpuTextureGridScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["frequency"]) &&
    isChannel(candidate["contrast"]) &&
    isChannel(candidate["blend"])
  )
}

export function webGpuTextureGridSummary(
  scene: WebGpuTextureGridScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU texture grid is ${runtimeStatus.toLowerCase()} with a texture-backed fragment surface targeting ${formatLabel}. The viewport clears to ${textureGridClearColor(scene)} while frequency ${scene.frequency.toFixed(2)}, contrast ${scene.contrast.toFixed(2)}, and blend ${scene.blend.toFixed(2)} rewrite a 4x4 GPU texture before each draw.`
}

export function textureGridClearColor(scene: WebGpuTextureGridScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function textureGridAccentColor(scene: WebGpuTextureGridScene): string {
  const red = Math.round((0.18 + scene.contrast * 0.52 + scene.blend * 0.12) * 255)
  const green = Math.round((0.18 + scene.frequency * 0.28 + scene.blend * 0.18) * 255)
  const blue = Math.round((0.24 + (1 - scene.blend) * 0.18 + scene.blue * 0.28) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function textureGridDensity(scene: WebGpuTextureGridScene): string {
  return `4x4 / phase ${1 + Math.round(scene.frequency * 3)}`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
