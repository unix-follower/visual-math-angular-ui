import { VectorScene } from "./vector-explorer.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GRID_SPACING = 32

export function renderVectorScene(canvas: HTMLCanvasElement, scene: VectorScene): void {
  const context = getRenderingContext(canvas)

  if (!context) {
    return
  }

  const pixelRatio = globalThis.devicePixelRatio ?? 1
  const logicalWidth = CANVAS_WIDTH
  const logicalHeight = CANVAS_HEIGHT

  if (canvas.width !== logicalWidth * pixelRatio || canvas.height !== logicalHeight * pixelRatio) {
    canvas.width = logicalWidth * pixelRatio
    canvas.height = logicalHeight * pixelRatio
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalHeight}px`
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, logicalWidth, logicalHeight)

  drawBackground(context, logicalWidth, logicalHeight)
  drawGrid(context, logicalWidth, logicalHeight)
  drawAxes(context, logicalWidth, logicalHeight, scene.basisVisible)
  drawVector(context, logicalWidth, logicalHeight, scene)
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

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, "#fff8eb")
  gradient.addColorStop(1, "#eef6ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.09)"
  context.lineWidth = 1

  for (let x = 0; x <= width; x += GRID_SPACING) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }

  for (let y = 0; y <= height; y += GRID_SPACING) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  context.restore()
}

function drawAxes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  basisVisible: boolean,
): void {
  const centerX = width / 2
  const centerY = height / 2

  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5

  context.beginPath()
  context.moveTo(0, centerY)
  context.lineTo(width, centerY)
  context.moveTo(centerX, 0)
  context.lineTo(centerX, height)
  context.stroke()

  if (basisVisible) {
    context.fillStyle = "#13213b"
    context.font = "600 14px Avenir Next"
    context.fillText("i", width - 20, centerY - 10)
    context.fillText("j", centerX + 10, 18)
  }

  context.restore()
}

function drawVector(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: VectorScene,
): void {
  const centerX = width / 2
  const centerY = height / 2
  const scale = GRID_SPACING
  const targetX = centerX + scene.vector.x * scale
  const targetY = centerY - scene.vector.y * scale

  if (scene.projectionVisible) {
    context.save()
    context.setLineDash([8, 6])
    context.strokeStyle = "rgba(48, 103, 140, 0.7)"
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.lineTo(targetX, centerY)
    context.lineTo(targetX, targetY)
    context.stroke()
    context.restore()
  }

  context.save()
  context.strokeStyle = "#bf5b04"
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(centerX, centerY)
  context.lineTo(targetX, targetY)
  context.stroke()

  const angle = Math.atan2(targetY - centerY, targetX - centerX)
  const arrowSize = 14
  context.fillStyle = "#bf5b04"
  context.beginPath()
  context.moveTo(targetX, targetY)
  context.lineTo(
    targetX - arrowSize * Math.cos(angle - Math.PI / 6),
    targetY - arrowSize * Math.sin(angle - Math.PI / 6),
  )
  context.lineTo(
    targetX - arrowSize * Math.cos(angle + Math.PI / 6),
    targetY - arrowSize * Math.sin(angle + Math.PI / 6),
  )
  context.closePath()
  context.fill()

  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText(
    `v = (${scene.vector.x.toFixed(1)}, ${scene.vector.y.toFixed(1)})`,
    targetX + 12,
    targetY - 12,
  )
  context.restore()
}
