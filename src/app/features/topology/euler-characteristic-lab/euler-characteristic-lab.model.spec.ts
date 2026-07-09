import {
  eulerCharacteristic,
  eulerCharacteristicLabMetrics,
  eulerCharacteristicLabSummary,
  firstBettiNumber,
  surfaceName,
  type EulerCharacteristicLabScene,
} from "./euler-characteristic-lab.model"

describe("euler-characteristic-lab.model", () => {
  it("computes Euler characteristic for common surfaces", () => {
    expect(
      eulerCharacteristic({
        genus: 0,
        boundaryCount: 0,
        decompositionDepth: 2,
        showFormula: true,
        showCellHints: true,
      }),
    ).toBe(2)
    expect(
      eulerCharacteristic({
        genus: 1,
        boundaryCount: 0,
        decompositionDepth: 2,
        showFormula: true,
        showCellHints: true,
      }),
    ).toBe(0)
    expect(
      eulerCharacteristic({
        genus: 0,
        boundaryCount: 2,
        decompositionDepth: 2,
        showFormula: true,
        showCellHints: true,
      }),
    ).toBe(0)
  })

  it("computes the first Betti number for orientable surfaces with boundary", () => {
    const scene: EulerCharacteristicLabScene = {
      genus: 1,
      boundaryCount: 2,
      decompositionDepth: 3,
      showFormula: true,
      showCellHints: true,
    }

    expect(firstBettiNumber(scene)).toBe(3)
  })

  it("names common surfaces", () => {
    expect(
      surfaceName({
        genus: 1,
        boundaryCount: 0,
        decompositionDepth: 3,
        showFormula: true,
        showCellHints: true,
      }),
    ).toBe("Torus")
    expect(
      surfaceName({
        genus: 0,
        boundaryCount: 3,
        decompositionDepth: 3,
        showFormula: true,
        showCellHints: true,
      }),
    ).toBe("Pair of pants")
  })

  it("derives summary metrics for the displayed surface", () => {
    const scene: EulerCharacteristicLabScene = {
      genus: 2,
      boundaryCount: 1,
      decompositionDepth: 4,
      showFormula: true,
      showCellHints: true,
    }

    const metrics = eulerCharacteristicLabMetrics(scene)
    expect(
      metrics.suggestedVertexCount - metrics.suggestedEdgeCount + metrics.suggestedFaceCount,
    ).toBe(metrics.eulerCharacteristic)
    expect(eulerCharacteristicLabSummary(scene)).toContain("χ = -3")
  })
})
