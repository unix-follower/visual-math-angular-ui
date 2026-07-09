export type WebGpuInstancedLatticeScene = {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
  readonly spacing: number
  readonly scale: number
  readonly tilt: number
}

export const DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE: WebGpuInstancedLatticeScene = {
  red: 0.06,
  green: 0.1,
  blue: 0.18,
  alpha: 1,
  spacing: 0.48,
  scale: 0.56,
  tilt: 0.34,
}

export function isWebGpuInstancedLatticeScene(
  value: unknown,
): value is WebGpuInstancedLatticeScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isChannel(candidate["red"]) &&
    isChannel(candidate["green"]) &&
    isChannel(candidate["blue"]) &&
    isChannel(candidate["alpha"]) &&
    isChannel(candidate["spacing"]) &&
    isChannel(candidate["scale"]) &&
    isChannel(candidate["tilt"])
  )
}

export function webGpuInstancedLatticeSummary(
  scene: WebGpuInstancedLatticeScene,
  runtimeStatus: string,
  format?: string,
): string {
  const formatLabel = format ?? "pending detection"

  return `WebGPU instanced lattice is ${runtimeStatus.toLowerCase()} with a shared triangle mesh drawn across multiple instance records on ${formatLabel}. The viewport clears to ${instancedLatticeClearColor(scene)} while spacing ${scene.spacing.toFixed(2)}, scale ${scene.scale.toFixed(2)}, and tilt ${scene.tilt.toFixed(2)} reshape the per-instance offsets and colors.`
}

export function instancedLatticeClearColor(scene: WebGpuInstancedLatticeScene): string {
  return `rgba(${Math.round(scene.red * 255)}, ${Math.round(scene.green * 255)}, ${Math.round(scene.blue * 255)}, ${scene.alpha.toFixed(2)})`
}

export function instancedLatticeAccentColor(scene: WebGpuInstancedLatticeScene): string {
  const red = Math.round((0.18 + scene.scale * 0.44 + scene.tilt * 0.1) * 255)
  const green = Math.round((0.18 + scene.spacing * 0.28 + scene.tilt * 0.18) * 255)
  const blue = Math.round((0.22 + scene.blue * 0.26 + (1 - scene.scale) * 0.18) * 255)

  return `rgba(${red}, ${green}, ${blue}, 1.00)`
}

export function instancedLatticeStageLabel(): string {
  return "1 mesh / 5 instances"
}

function isChannel(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1
}
