import {
  payoffCellKey,
  PayoffMatrixLabMetrics,
  PayoffMatrixLabScene,
  strategyLabel,
} from "./payoff-matrix-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GRID_LEFT = 150
const GRID_TOP = 100
const CELL_WIDTH = 190
const CELL_HEIGHT = 120

export function renderPayoffMatrixLabScene(
  canvas: HTMLCanvasElement,
  scene: PayoffMatrixLabScene,
  metrics: PayoffMatrixLabMetrics,
): void {
  const context = getRenderingContext(canvas)

  if (!context) {
    return
  }

  const pixelRatio = globalThis.devicePixelRatio ?? 1

  if (canvas.width !== CANVAS_WIDTH * pixelRatio || canvas.height !== CANVAS_HEIGHT * pixelRatio) {
    canvas.width = CANVAS_WIDTH * pixelRatio
    canvas.height = CANVAS_HEIGHT * pixelRatio
    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${CANVAS_HEIGHT}px`
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawBackground(context)
  drawHeaders(context)
  drawMatrix(context, scene, metrics)
  drawLegend(context, scene, metrics)
}

function getRenderingContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  if (globalThis.navigator?.userAgent?.includes("jsdom")) {
    return null
  }

  try {
    return canvas.getContext("2d")
  } catch {
    return null
  }
}

function drawBackground(context: CanvasRenderingContext2D): void {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, "#fff8ea")
  gradient.addColorStop(1, "#eef7ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawHeaders(context: CanvasRenderingContext2D): void {
  context.save()
  context.fillStyle = "#13213b"
  context.font = "700 16px Avenir Next"
  context.fillText("Column player", GRID_LEFT + 120, 52)
  context.fillText("Row player", 36, GRID_TOP + 120)

  context.font = "600 14px Avenir Next"
  context.fillText("Cooperate", GRID_LEFT + 54, 84)
  context.fillText("Defect", GRID_LEFT + CELL_WIDTH + 70, 84)
  context.save()
  context.translate(82, GRID_TOP + 68)
  context.rotate(-Math.PI / 2)
  context.fillText("Cooperate", 0, 0)
  context.restore()
  context.save()
  context.translate(82, GRID_TOP + CELL_HEIGHT + 64)
  context.rotate(-Math.PI / 2)
  context.fillText("Defect", 0, 0)
  context.restore()
  context.restore()
}

function drawMatrix(
  context: CanvasRenderingContext2D,
  scene: PayoffMatrixLabScene,
  metrics: PayoffMatrixLabMetrics,
): void {
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const x = GRID_LEFT + column * CELL_WIDTH
      const y = GRID_TOP + row * CELL_HEIGHT
      const cell = metrics.matrix[row][column]
      const key = payoffCellKey(row, column)
      const isSelected =
        row === scene.selectedRowStrategy && column === scene.selectedColumnStrategy
      const isNash = metrics.nashEquilibria.includes(key)

      context.save()
      context.fillStyle = isSelected ? "rgba(31, 94, 140, 0.16)" : "rgba(255, 255, 255, 0.9)"
      context.strokeStyle = isNash && scene.showNashHighlight ? "#bf5b04" : "#13213b"
      context.lineWidth = isNash && scene.showNashHighlight ? 3 : 1.5
      context.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT)
      context.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT)

      if (scene.showBestResponses && metrics.rowBestResponses[row][column]) {
        context.fillStyle = "rgba(29, 106, 67, 0.16)"
        context.fillRect(x + 12, y + 14, 72, 28)
      }

      if (scene.showBestResponses && metrics.columnBestResponses[row][column]) {
        context.fillStyle = "rgba(125, 60, 152, 0.14)"
        context.fillRect(x + CELL_WIDTH - 84, y + 14, 72, 28)
      }

      context.fillStyle = "#13213b"
      context.font = "700 20px Avenir Next"
      context.fillText(`${cell.rowPayoff}, ${cell.columnPayoff}`, x + 60, y + 68)
      context.font = "600 12px Avenir Next"
      context.fillText(strategyLabel(row as 0 | 1), x + 14, y + CELL_HEIGHT - 18)
      context.fillText(strategyLabel(column as 0 | 1), x + CELL_WIDTH - 78, y + CELL_HEIGHT - 18)
      context.restore()
    }
  }
}

function drawLegend(
  context: CanvasRenderingContext2D,
  scene: PayoffMatrixLabScene,
  metrics: PayoffMatrixLabMetrics,
): void {
  context.save()
  context.fillStyle = "rgba(255, 255, 255, 0.92)"
  context.strokeStyle = "rgba(19, 33, 59, 0.12)"
  context.beginPath()
  context.roundRect(24, 24, 102, 132, 14)
  context.fill()
  context.stroke()
  context.fillStyle = "#13213b"
  context.font = "600 13px Avenir Next"
  context.fillText(`T=${scene.temptation}`, 38, 52)
  context.fillText(`R=${scene.reward}`, 38, 74)
  context.fillText(`P=${scene.punishment}`, 38, 96)
  context.fillText(`S=${scene.sucker}`, 38, 118)
  context.fillText(`Nash: ${metrics.nashEquilibria.length}`, 38, 140)
  context.restore()
}
