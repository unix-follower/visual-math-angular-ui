export type WebGlTexturedMaterialScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly warmth: number
  readonly textureMix: number
  readonly relief: number
  readonly gloss: number
  readonly lightX: number
  readonly lightY: number
  readonly fill: number
}

export const DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE: WebGlTexturedMaterialScene = {
  red: 0.04,
  green: 0.06,
  blue: 0.1,
  alpha: 1,
  warmth: 0.58,
  textureMix: 0.74,
  relief: 0.46,
  gloss: 0.52,
  lightX: 0.78,
  lightY: 0.7,
  fill: 0.34,
}

export function isWebGlTexturedMaterialScene(value: unknown): value is WebGlTexturedMaterialScene {
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
    isChannel(candidate["textureMix"]) &&
    isChannel(candidate["relief"]) &&
    isChannel(candidate["gloss"]) &&
    isChannel(candidate["lightX"]) &&
    isChannel(candidate["lightY"]) &&
    isChannel(candidate["fill"])
  )
}

export function webGlTexturedMaterialClearColor(scene: WebGlTexturedMaterialScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlTexturedMaterialBaseColor(scene: WebGlTexturedMaterialScene): string {
  return `rgb(${Math.round((0.24 + scene.warmth * 0.6) * 255)}, ${Math.round((0.34 + scene.textureMix * 0.28) * 255)}, ${Math.round((0.52 + scene.relief * 0.32) * 255)})`
}

export function webGlTexturedMaterialLightDirection(scene: WebGlTexturedMaterialScene): string {
  return `${(scene.lightX * 2 - 1).toFixed(2)}, ${(scene.lightY * 2 - 1).toFixed(2)}, fill ${scene.fill.toFixed(2)}`
}

export function webGlTexturedMaterialFinishLabel(scene: WebGlTexturedMaterialScene): string {
  return `texture ${scene.textureMix.toFixed(2)}, relief ${scene.relief.toFixed(2)}, gloss ${scene.gloss.toFixed(2)}`
}

export function webGlTexturedMaterialSummary(
  scene: WebGlTexturedMaterialScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL textured material is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route uploads a procedural albedo texture, derives relief normals from neighboring texels, and shades the result with a primary light plus a softer fill light over ${webGlTexturedMaterialClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
