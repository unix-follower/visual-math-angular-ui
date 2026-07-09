import {
  coprimeResidues,
  gcd,
  modularAddition,
  modularArithmeticLabMetrics,
  modularArithmeticLabSummary,
  modularMultiplication,
  normalizeResidue,
  type ModularArithmeticLabScene,
} from "./modular-arithmetic-lab.model"

describe("modular-arithmetic-lab.model", () => {
  it("normalizes residues into the modular range", () => {
    expect(normalizeResidue(-3, 8)).toBe(5)
    expect(normalizeResidue(11, 8)).toBe(3)
  })

  it("computes gcd and coprime residues", () => {
    expect(gcd(12, 8)).toBe(4)
    expect(coprimeResidues(8)).toEqual([1, 3, 5, 7])
  })

  it("computes modular sum and product metrics", () => {
    const scene: ModularArithmeticLabScene = {
      modulus: 8,
      operandA: 3,
      operandB: 5,
      showAddition: true,
      showMultiplication: true,
      showCoprimeRing: true,
    }

    expect(modularAddition(scene)).toBe(0)
    expect(modularMultiplication(scene)).toBe(7)

    const metrics = modularArithmeticLabMetrics(scene)
    expect(metrics.invertibleA).toBe(true)
    expect(metrics.invertibleB).toBe(true)
  })

  it("summarizes invertibility and residues", () => {
    const scene: ModularArithmeticLabScene = {
      modulus: 10,
      operandA: 4,
      operandB: 7,
      showAddition: true,
      showMultiplication: true,
      showCoprimeRing: true,
    }

    expect(modularArithmeticLabSummary(scene)).toContain("Modulo 10")
    expect(modularArithmeticLabSummary(scene)).toContain("invertible")
  })
})
