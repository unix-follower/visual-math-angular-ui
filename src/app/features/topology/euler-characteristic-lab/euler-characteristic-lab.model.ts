export type EulerCharacteristicLabScene = {
  readonly genus: number
  readonly boundaryCount: number
  readonly decompositionDepth: number
  readonly showFormula: boolean
  readonly showCellHints: boolean
}

export type EulerCharacteristicLabMetrics = {
  readonly eulerCharacteristic: number
  readonly firstBettiNumber: number
  readonly suggestedFaceCount: number
  readonly suggestedEdgeCount: number
  readonly suggestedVertexCount: number
  readonly surfaceName: string
}

export const DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE: EulerCharacteristicLabScene = {
  genus: 1,
  boundaryCount: 0,
  decompositionDepth: 3,
  showFormula: true,
  showCellHints: true,
}

export function isEulerCharacteristicLabScene(
  value: unknown,
): value is EulerCharacteristicLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["genus"] === "number" &&
    typeof candidate["boundaryCount"] === "number" &&
    typeof candidate["decompositionDepth"] === "number" &&
    typeof candidate["showFormula"] === "boolean" &&
    typeof candidate["showCellHints"] === "boolean"
  )
}

export function eulerCharacteristic(scene: EulerCharacteristicLabScene): number {
  return 2 - 2 * scene.genus - scene.boundaryCount
}

export function firstBettiNumber(scene: EulerCharacteristicLabScene): number {
  return scene.boundaryCount === 0 ? 2 * scene.genus : 2 * scene.genus + scene.boundaryCount - 1
}

export function surfaceName(scene: EulerCharacteristicLabScene): string {
  if (scene.genus === 0 && scene.boundaryCount === 0) {
    return "Sphere"
  }

  if (scene.genus === 0 && scene.boundaryCount === 1) {
    return "Disk"
  }

  if (scene.genus === 0 && scene.boundaryCount === 2) {
    return "Annulus"
  }

  if (scene.genus === 0 && scene.boundaryCount === 3) {
    return "Pair of pants"
  }

  if (scene.genus === 1 && scene.boundaryCount === 0) {
    return "Torus"
  }

  if (scene.genus === 2 && scene.boundaryCount === 0) {
    return "Double torus"
  }

  return `Orientable surface g=${scene.genus}, b=${scene.boundaryCount}`
}

export function eulerCharacteristicLabMetrics(
  scene: EulerCharacteristicLabScene,
): EulerCharacteristicLabMetrics {
  const chi = eulerCharacteristic(scene)
  const suggestedFaceCount = 2 + scene.decompositionDepth * 2 + scene.boundaryCount
  const suggestedEdgeCount = suggestedFaceCount * 2 + scene.genus + scene.boundaryCount
  const suggestedVertexCount = chi + suggestedEdgeCount - suggestedFaceCount

  return {
    eulerCharacteristic: chi,
    firstBettiNumber: firstBettiNumber(scene),
    suggestedFaceCount,
    suggestedEdgeCount,
    suggestedVertexCount,
    surfaceName: surfaceName(scene),
  }
}

export function eulerCharacteristicLabSummary(
  scene: EulerCharacteristicLabScene,
  metrics: EulerCharacteristicLabMetrics = eulerCharacteristicLabMetrics(scene),
): string {
  return `${metrics.surfaceName} has genus ${scene.genus} and ${scene.boundaryCount} boundary component${scene.boundaryCount === 1 ? "" : "s"}, so χ = ${metrics.eulerCharacteristic} and the first Betti number is ${metrics.firstBettiNumber}.`
}
