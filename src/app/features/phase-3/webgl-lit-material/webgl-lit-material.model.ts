export type WebGlLitMaterialScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly warmth: number
  readonly metalness: number
  readonly roughness: number
  readonly lightX: number
  readonly lightY: number
  readonly rim: number
}

export const DEFAULT_WEBGL_LIT_MATERIAL_SCENE: WebGlLitMaterialScene = {
  red: 0.05,
  green: 0.07,
  blue: 0.11,
  alpha: 1,
  warmth: 0.62,
  metalness: 0.46,
  roughness: 0.34,
  lightX: 0.78,
  lightY: 0.72,
  rim: 0.38,
}

export function isWebGlLitMaterialScene(value: unknown): value is WebGlLitMaterialScene {
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
    isChannel(candidate["metalness"]) &&
    isChannel(candidate["roughness"]) &&
    isChannel(candidate["lightX"]) &&
    isChannel(candidate["lightY"]) &&
    isChannel(candidate["rim"])
  )
}

export function webGlLitMaterialClearColor(scene: WebGlLitMaterialScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlLitMaterialBaseColor(scene: WebGlLitMaterialScene): string {
  return `rgb(${Math.round((0.26 + scene.warmth * 0.56) * 255)}, ${Math.round((0.38 + scene.metalness * 0.34) * 255)}, ${Math.round((0.62 + (1 - scene.roughness) * 0.24) * 255)})`
}

export function webGlLitMaterialLightDirection(scene: WebGlLitMaterialScene): string {
  return `${(scene.lightX * 2 - 1).toFixed(2)}, ${(scene.lightY * 2 - 1).toFixed(2)}, 0.82`
}

export function webGlLitMaterialFinishLabel(scene: WebGlLitMaterialScene): string {
  return `metal ${scene.metalness.toFixed(2)}, roughness ${scene.roughness.toFixed(2)}, rim ${scene.rim.toFixed(2)}`
}

export function webGlLitMaterialSummary(
  scene: WebGlLitMaterialScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL lit material is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route shades a procedural orb with a derived normal field, a movable light direction, and a material blend between diffuse, metallic, and rim-lit responses over ${webGlLitMaterialClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
