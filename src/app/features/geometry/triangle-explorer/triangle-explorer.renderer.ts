import {
  triangleCentroid,
  triangleSideLengths,
  triangleVertices,
  TriangleScene,
} from "./triangle-explorer.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const SCALE = 42

export function renderTriangleScene(canvas: HTMLCanvasElement, scene: TriangleScene): void {
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
  drawGrid(context)
  drawAxes(context)
  drawTriangle(context, scene)

  if (scene.showCentroid) {
    drawCentroid(context, scene)
  }

  if (scene.showSideLengths) {
    drawSideLabels(context, scene)
  }
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
  gradient.addColorStop(0, "#fef5e8")
  gradient.addColorStop(1, "#edf6ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawGrid(context: CanvasRenderingContext2D): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.09)"
  context.lineWidth = 1

  for (let x = 0; x <= CANVAS_WIDTH; x += SCALE) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, CANVAS_HEIGHT)
    context.stroke()
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += SCALE) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(CANVAS_WIDTH, y)
    context.stroke()
  }

  context.restore()
}

function drawAxes(context: CanvasRenderingContext2D): void {
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2

  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(0, centerY)
  context.lineTo(CANVAS_WIDTH, centerY)
  context.moveTo(centerX, 0)
  context.lineTo(centerX, CANVAS_HEIGHT)
  context.stroke()
  context.restore()
}

function drawTriangle(context: CanvasRenderingContext2D, scene: TriangleScene): void {
  const points = triangleVertices(scene).map(projectPoint)

  context.save()
  context.fillStyle = "rgba(31, 94, 140, 0.18)"
  context.strokeStyle = "#1f5e8c"
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  context.lineTo(points[1].x, points[1].y)
  context.lineTo(points[2].x, points[2].y)
  context.closePath()
  context.fill()
  context.stroke()
  context.restore()
}

function drawCentroid(context: CanvasRenderingContext2D, scene: TriangleScene): void {
  const centroid = projectPoint(triangleCentroid(scene))

  context.save()
  context.fillStyle = "#b24f00"
  context.beginPath()
  context.arc(centroid.x, centroid.y, 7, 0, Math.PI * 2)
  context.fill()
  context.font = "600 14px Avenir Next"
  context.fillText("centroid", centroid.x + 10, centroid.y - 10)
  context.restore()
}

function drawSideLabels(context: CanvasRenderingContext2D, scene: TriangleScene): void {
  const vertices = triangleVertices(scene).map(projectPoint)
  const sideLengths = triangleSideLengths(scene)

  context.save()
  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"

  for (let index = 0; index < 3; index += 1) {
    const start = vertices[index]
    const end = vertices[(index + 1) % 3]
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    context.fillText(sideLengths[index].toFixed(2), midX + 10, midY - 10)
  }

  context.restore()
}

function projectPoint(point: { readonly x: number; readonly y: number }): {
  readonly x: number
  readonly y: number
} {
  return {
    x: CANVAS_WIDTH / 2 + point.x * SCALE,
    y: CANVAS_HEIGHT / 2 - point.y * SCALE,
  }
}
