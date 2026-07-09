export type PayoffMatrixLabScene = {
  readonly temptation: number
  readonly reward: number
  readonly punishment: number
  readonly sucker: number
  readonly selectedRowStrategy: 0 | 1
  readonly selectedColumnStrategy: 0 | 1
  readonly showBestResponses: boolean
  readonly showNashHighlight: boolean
}

export type PayoffCell = {
  readonly rowPayoff: number
  readonly columnPayoff: number
}

export type PayoffMatrixLabMetrics = {
  readonly matrix: readonly (readonly PayoffCell[])[]
  readonly rowBestResponses: readonly (readonly boolean[])[]
  readonly columnBestResponses: readonly (readonly boolean[])[]
  readonly nashEquilibria: readonly string[]
  readonly selectedCell: PayoffCell
}

export const DEFAULT_PAYOFF_MATRIX_LAB_SCENE: PayoffMatrixLabScene = {
  temptation: 5,
  reward: 3,
  punishment: 1,
  sucker: 0,
  selectedRowStrategy: 0,
  selectedColumnStrategy: 0,
  showBestResponses: true,
  showNashHighlight: true,
}

export function isPayoffMatrixLabScene(value: unknown): value is PayoffMatrixLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["temptation"] === "number" &&
    typeof candidate["reward"] === "number" &&
    typeof candidate["punishment"] === "number" &&
    typeof candidate["sucker"] === "number" &&
    typeof candidate["selectedRowStrategy"] === "number" &&
    typeof candidate["selectedColumnStrategy"] === "number" &&
    typeof candidate["showBestResponses"] === "boolean" &&
    typeof candidate["showNashHighlight"] === "boolean"
  )
}

export function payoffMatrix(scene: PayoffMatrixLabScene): readonly (readonly PayoffCell[])[] {
  return [
    [
      { rowPayoff: scene.reward, columnPayoff: scene.reward },
      { rowPayoff: scene.sucker, columnPayoff: scene.temptation },
    ],
    [
      { rowPayoff: scene.temptation, columnPayoff: scene.sucker },
      { rowPayoff: scene.punishment, columnPayoff: scene.punishment },
    ],
  ]
}

export function payoffCellKey(row: number, column: number): string {
  return `${row}-${column}`
}

export function payoffMatrixLabMetrics(scene: PayoffMatrixLabScene): PayoffMatrixLabMetrics {
  const matrix = payoffMatrix(scene)
  const rowBestResponses = matrix.map(() => [false, false])
  const columnBestResponses = matrix.map(() => [false, false])

  for (let column = 0; column < 2; column += 1) {
    const bestRowPayoff = Math.max(matrix[0][column].rowPayoff, matrix[1][column].rowPayoff)
    for (let row = 0; row < 2; row += 1) {
      rowBestResponses[row][column] = matrix[row][column].rowPayoff === bestRowPayoff
    }
  }

  for (let row = 0; row < 2; row += 1) {
    const bestColumnPayoff = Math.max(matrix[row][0].columnPayoff, matrix[row][1].columnPayoff)
    for (let column = 0; column < 2; column += 1) {
      columnBestResponses[row][column] = matrix[row][column].columnPayoff === bestColumnPayoff
    }
  }

  const nashEquilibria = matrix.flatMap((matrixRow, row) =>
    matrixRow.flatMap((_, column) =>
      rowBestResponses[row][column] && columnBestResponses[row][column]
        ? [payoffCellKey(row, column)]
        : [],
    ),
  )

  return {
    matrix,
    rowBestResponses,
    columnBestResponses,
    nashEquilibria,
    selectedCell: matrix[scene.selectedRowStrategy][scene.selectedColumnStrategy],
  }
}

export function strategyLabel(strategy: 0 | 1): string {
  return strategy === 0 ? "Cooperate" : "Defect"
}

export function payoffMatrixLabSummary(
  scene: PayoffMatrixLabScene,
  metrics: PayoffMatrixLabMetrics = payoffMatrixLabMetrics(scene),
): string {
  const selectedRowLabel = strategyLabel(scene.selectedRowStrategy)
  const selectedColumnLabel = strategyLabel(scene.selectedColumnStrategy)
  const selectedKey = payoffCellKey(scene.selectedRowStrategy, scene.selectedColumnStrategy)
  const isNash = metrics.nashEquilibria.includes(selectedKey)

  return `At (${selectedRowLabel}, ${selectedColumnLabel}) the payoffs are (${metrics.selectedCell.rowPayoff}, ${metrics.selectedCell.columnPayoff}). ${isNash ? "This profile is a Nash equilibrium." : "This profile is not a Nash equilibrium."} There ${metrics.nashEquilibria.length === 1 ? "is" : "are"} ${metrics.nashEquilibria.length} equilibrium profile${metrics.nashEquilibria.length === 1 ? "" : "s"} in the current game.`
}
