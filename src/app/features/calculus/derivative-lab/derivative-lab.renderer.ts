import {
  derivativeAt,
  DerivativeLabScene,
  evaluateDerivativeLabCurve,
  secantSlope,
  tangentPoint,
} from "./derivative-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const SCALE = 42

export function renderDerivativeLabScene(
  canvas: HTMLCanvasElement,
  scene: DerivativeLabScene,
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
  drawAxes(context)
  drawCurve(context, scene)
  drawReferencePoint(context, scene)

  if (scene.showTangent) {
    drawTangent(context, scene)
  }

  if (scene.showSecant) {
    drawSecant(context, scene)
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
  gradient.addColorStop(1, "#edf6ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
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

function drawCurve(context: CanvasRenderingContext2D, scene: DerivativeLabScene): void {
  context.save()
  context.strokeStyle = "#1f5e8c"
  context.lineWidth = 3
  context.beginPath()

  for (let pixelX = 0; pixelX <= CANVAS_WIDTH; pixelX += 4) {
    const x = (pixelX - CANVAS_WIDTH / 2) / SCALE
    const y = evaluateDerivativeLabCurve(scene, x)
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

function drawReferencePoint(context: CanvasRenderingContext2D, scene: DerivativeLabScene): void {
  const point = tangentPoint(scene)
  const projected = projectPoint(point.x, point.y)

  context.save()
  context.fillStyle = "#bf5b04"
  context.beginPath()
  context.arc(projected.x, projected.y, 7, 0, Math.PI * 2)
  context.fill()
  context.font = "600 14px Avenir Next"
  context.fillText(`x=${scene.pointX.toFixed(2)}`, projected.x + 10, projected.y - 12)
  context.restore()
}

function drawTangent(context: CanvasRenderingContext2D, scene: DerivativeLabScene): void {
  const point = tangentPoint(scene)
  const slope = derivativeAt(scene, scene.pointX)
  const leftX = -6
  const rightX = 6
  const leftY = point.y + slope * (leftX - point.x)
  const rightY = point.y + slope * (rightX - point.x)
  const projectedLeft = projectPoint(leftX, leftY)
  const projectedRight = projectPoint(rightX, rightY)

  context.save()
  context.strokeStyle = "#1d6a43"
  context.lineWidth = 2.5
  context.setLineDash([10, 8])
  context.beginPath()
  context.moveTo(projectedLeft.x, projectedLeft.y)
  context.lineTo(projectedRight.x, projectedRight.y)
  context.stroke()
  context.restore()
}

function drawSecant(context: CanvasRenderingContext2D, scene: DerivativeLabScene): void {
  const x1 = scene.pointX
  const x2 = scene.pointX + 1
  const y1 = evaluateDerivativeLabCurve(scene, x1)
  const y2 = evaluateDerivativeLabCurve(scene, x2)
  const projectedFirst = projectPoint(x1, y1)
  const projectedSecond = projectPoint(x2, y2)

  context.save()
  context.strokeStyle = "#8b3d91"
  context.lineWidth = 2.5
  context.beginPath()
  context.moveTo(projectedFirst.x, projectedFirst.y)
  context.lineTo(projectedSecond.x, projectedSecond.y)
  context.stroke()
  context.font = "600 14px Avenir Next"
  context.fillStyle = "#8b3d91"
  context.fillText(
    `secant ${secantSlope(scene, scene.pointX).toFixed(2)}`,
    projectedSecond.x + 10,
    projectedSecond.y + 18,
  )
  context.restore()
}

function projectPoint(x: number, y: number): { readonly x: number; readonly y: number } {
  return {
    x: CANVAS_WIDTH / 2 + x * SCALE,
    y: CANVAS_HEIGHT / 2 - y * SCALE,
  }
}
