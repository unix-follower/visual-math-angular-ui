export type WebGlBloomBlurScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly glow: number
  readonly blur: number
  readonly mix: number
}

export const DEFAULT_WEBGL_BLOOM_BLUR_SCENE: WebGlBloomBlurScene = {
  red: 0.05,
  green: 0.08,
  blue: 0.18,
  alpha: 1,
  glow: 0.74,
  blur: 0.36,
  mix: 0.64,
}

export function isWebGlBloomBlurScene(value: unknown): value is WebGlBloomBlurScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["glow"]) &&
    isChannel(candidate["blur"]) &&
    isChannel(candidate["mix"])
  )
}

export function webGlBloomBlurClearColor(scene: WebGlBloomBlurScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function webGlBloomBlurAccentColor(scene: WebGlBloomBlurScene): string {
  return `rgb(${Math.round((scene.red + scene.glow * 0.38) * 255)}, ${Math.round((scene.green + scene.mix * 0.32) * 255)}, ${Math.round((scene.blue + scene.blur * 0.34) * 255)})`
}

export function webGlBloomBlurStageLabel(scene: WebGlBloomBlurScene): string {
  return `Glow ${scene.glow.toFixed(2)}, blur ${scene.blur.toFixed(2)}, mix ${scene.mix.toFixed(2)}`
}

export function webGlBloomBlurSummary(
  scene: WebGlBloomBlurScene,
  runtimeStatus: string,
  version?: string,
): string {
  const versionLabel = version ?? "pending detection"

  return `WebGL bloom blur is ${runtimeStatus.toLowerCase()} on ${versionLabel}. This route renders emissive geometry into an offscreen texture, then samples neighboring texels during the second pass to blur and lift the bloom contribution with mix ${scene.mix.toFixed(2)} over ${webGlBloomBlurClearColor(scene)}.`
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
