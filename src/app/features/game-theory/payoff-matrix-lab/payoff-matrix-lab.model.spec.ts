import {
  payoffCellKey,
  payoffMatrix,
  payoffMatrixLabMetrics,
  payoffMatrixLabSummary,
  strategyLabel,
  type PayoffMatrixLabScene,
} from "./payoff-matrix-lab.model"

describe("payoff-matrix-lab.model", () => {
  it("builds the standard 2x2 payoff matrix", () => {
    const scene: PayoffMatrixLabScene = {
      temptation: 5,
      reward: 3,
      punishment: 1,
      sucker: 0,
      selectedRowStrategy: 0,
      selectedColumnStrategy: 0,
      showBestResponses: true,
      showNashHighlight: true,
    }

    const matrix = payoffMatrix(scene)
    expect(matrix[0][0]).toEqual({ rowPayoff: 3, columnPayoff: 3 })
    expect(matrix[1][0]).toEqual({ rowPayoff: 5, columnPayoff: 0 })
  })

  it("finds the prisoner’s dilemma equilibrium", () => {
    const scene: PayoffMatrixLabScene = {
      temptation: 5,
      reward: 3,
      punishment: 1,
      sucker: 0,
      selectedRowStrategy: 1,
      selectedColumnStrategy: 1,
      showBestResponses: true,
      showNashHighlight: true,
    }

    const metrics = payoffMatrixLabMetrics(scene)
    expect(metrics.nashEquilibria).toEqual([payoffCellKey(1, 1)])
    expect(metrics.selectedCell.rowPayoff).toBe(1)
  })

  it("labels strategies consistently", () => {
    expect(strategyLabel(0)).toBe("Cooperate")
    expect(strategyLabel(1)).toBe("Defect")
  })

  it("summarizes selected outcomes and equilibrium status", () => {
    const scene: PayoffMatrixLabScene = {
      temptation: 4,
      reward: 3,
      punishment: 2,
      sucker: 1,
      selectedRowStrategy: 0,
      selectedColumnStrategy: 0,
      showBestResponses: true,
      showNashHighlight: true,
    }

    expect(payoffMatrixLabSummary(scene)).toContain("Nash equilibrium")
    expect(payoffMatrixLabSummary(scene)).toContain("payoffs")
  })
})
