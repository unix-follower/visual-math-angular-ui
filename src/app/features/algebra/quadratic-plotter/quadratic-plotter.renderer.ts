import {
  evaluateQuadratic,
  quadraticRoots,
  QuadraticScene,
  quadraticVertex,
} from "./quadratic-plotter.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const SCALE = 36

export function renderQuadraticScene(canvas: HTMLCanvasElement, scene: QuadraticScene): void {
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
  drawCurve(context, scene)

  if (scene.showRoots) {
    drawRoots(context, scene)
  }

  if (scene.showVertex) {
    drawVertex(context, scene)
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
  gradient.addColorStop(0, "#fff7e5")
  gradient.addColorStop(1, "#eef7ff")
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

function drawCurve(context: CanvasRenderingContext2D, scene: QuadraticScene): void {
  context.save()
  context.strokeStyle = "#7f2d00"
  context.lineWidth = 3
  context.beginPath()

  for (let pixelX = 0; pixelX <= CANVAS_WIDTH; pixelX += 4) {
    const x = (pixelX - CANVAS_WIDTH / 2) / SCALE
    const y = evaluateQuadratic(scene, x)
    const pixelY = CANVAS_HEIGHT / 2 - y * SCALE

    if (pixelX === 0) {
      context.moveTo(pixelX, pixelY)
    } else {
      context.lineTo(pixelX, pixelY)
    }
  }

  context.stroke()
  context.restore()
}

function drawRoots(context: CanvasRenderingContext2D, scene: QuadraticScene): void {
  const roots = quadraticRoots(scene)

  context.save()
  context.fillStyle = "#14613f"
  context.font = "600 14px Avenir Next"

  for (const root of roots) {
    const pixelX = CANVAS_WIDTH / 2 + root * SCALE
    const pixelY = CANVAS_HEIGHT / 2
    context.beginPath()
    context.arc(pixelX, pixelY, 6, 0, Math.PI * 2)
    context.fill()
    context.fillText(`x=${root.toFixed(2)}`, pixelX + 10, pixelY - 12)
  }

  context.restore()
}

function drawVertex(context: CanvasRenderingContext2D, scene: QuadraticScene): void {
  const vertex = quadraticVertex(scene)
  const pixelX = CANVAS_WIDTH / 2 + vertex.x * SCALE
  const pixelY = CANVAS_HEIGHT / 2 - vertex.y * SCALE

  context.save()
  context.fillStyle = "#1f5e8c"
  context.strokeStyle = "rgba(31, 94, 140, 0.45)"
  context.setLineDash([8, 6])
  context.beginPath()
  context.moveTo(pixelX, CANVAS_HEIGHT / 2)
  context.lineTo(pixelX, pixelY)
  context.stroke()
  context.setLineDash([])
  context.beginPath()
  context.arc(pixelX, pixelY, 7, 0, Math.PI * 2)
  context.fill()
  context.font = "600 14px Avenir Next"
  context.fillText(
    `vertex (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})`,
    pixelX + 10,
    pixelY - 14,
  )
  context.restore()
}
