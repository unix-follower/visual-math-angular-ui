export type WebGlTextureGridScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly frequency: number
  readonly contrast: number
  readonly blend: number
}

export const DEFAULT_WEBGL_TEXTURE_GRID_SCENE: WebGlTextureGridScene = {
  red: 0.08,
  green: 0.1,
  blue: 0.22,
  alpha: 1,
  frequency: 0.5,
  contrast: 0.7,
  blend: 0.6,
}

export function isWebGlTextureGridScene(value: unknown): value is WebGlTextureGridScene {
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

export function webGlTextureGridClearColor(scene: WebGlTextureGridScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlTextureGridAccentColor(scene: WebGlTextureGridScene): string {
  return `rgb(${Math.round((scene.red + scene.blend * 0.45) * 255)}, ${Math.round((scene.green + scene.contrast * 0.36) * 255)}, ${Math.round((scene.blue + scene.frequency * 0.28) * 255)})`
}

export function webGlTextureGridDensity(scene: WebGlTextureGridScene): string {
  return `${Math.round(4 + scene.contrast * 12)} texels / row`
}

export function webGlTextureGridSummary(
  scene: WebGlTextureGridScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL texture grid is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route keeps a textured quad resident, rewrites a procedural 4x4 RGBA upload from frequency, contrast, and blend controls, and samples it in the fragment shader over ${webGlTextureGridClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
