export type ModularArithmeticLabScene = {
  readonly modulus: number
  readonly operandA: number
  readonly operandB: number
  readonly showAddition: boolean
  readonly showMultiplication: boolean
  readonly showCoprimeRing: boolean
}

export type ModularArithmeticLabMetrics = {
  readonly normalizedA: number
  readonly normalizedB: number
  readonly additionResidue: number
  readonly multiplicationResidue: number
  readonly coprimeResidues: readonly number[]
  readonly invertibleA: boolean
  readonly invertibleB: boolean
}

export const DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE: ModularArithmeticLabScene = {
  modulus: 8,
  operandA: 3,
  operandB: 5,
  showAddition: true,
  showMultiplication: true,
  showCoprimeRing: true,
}

export function isModularArithmeticLabScene(value: unknown): value is ModularArithmeticLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["modulus"] === "number" &&
    typeof candidate["operandA"] === "number" &&
    typeof candidate["operandB"] === "number" &&
    typeof candidate["showAddition"] === "boolean" &&
    typeof candidate["showMultiplication"] === "boolean" &&
    typeof candidate["showCoprimeRing"] === "boolean"
  )
}

export function normalizeResidue(value: number, modulus: number): number {
  const normalizedModulus = Math.max(2, Math.round(modulus))
  const normalizedValue = Math.round(value)

  return ((normalizedValue % normalizedModulus) + normalizedModulus) % normalizedModulus
}

export function gcd(a: number, b: number): number {
  let left = Math.abs(Math.round(a))
  let right = Math.abs(Math.round(b))

  while (right !== 0) {
    const next = left % right
    left = right
    right = next
  }

  return left
}

export function modularAddition(scene: ModularArithmeticLabScene): number {
  return normalizeResidue(scene.operandA + scene.operandB, scene.modulus)
}

export function modularMultiplication(scene: ModularArithmeticLabScene): number {
  return normalizeResidue(scene.operandA * scene.operandB, scene.modulus)
}

export function coprimeResidues(modulus: number): readonly number[] {
  const normalizedModulus = Math.max(2, Math.round(modulus))

  return Array.from({ length: normalizedModulus }, (_, residue) => residue).filter(
    (residue) => gcd(residue, normalizedModulus) === 1,
  )
}

export function modularArithmeticLabMetrics(
  scene: ModularArithmeticLabScene,
): ModularArithmeticLabMetrics {
  const normalizedA = normalizeResidue(scene.operandA, scene.modulus)
  const normalizedB = normalizeResidue(scene.operandB, scene.modulus)
  const invertibleResidues = coprimeResidues(scene.modulus)

  return {
    normalizedA,
    normalizedB,
    additionResidue: modularAddition(scene),
    multiplicationResidue: modularMultiplication(scene),
    coprimeResidues: invertibleResidues,
    invertibleA: invertibleResidues.includes(normalizedA),
    invertibleB: invertibleResidues.includes(normalizedB),
  }
}

export function modularArithmeticLabSummary(
  scene: ModularArithmeticLabScene,
  metrics: ModularArithmeticLabMetrics = modularArithmeticLabMetrics(scene),
): string {
  return `Modulo ${scene.modulus}, a ≡ ${metrics.normalizedA} and b ≡ ${metrics.normalizedB}. Their sum lands at ${metrics.additionResidue} and their product lands at ${metrics.multiplicationResidue}. Operand a is ${metrics.invertibleA ? "" : "not "}invertible, and operand b is ${metrics.invertibleB ? "" : "not "}invertible.`
}
