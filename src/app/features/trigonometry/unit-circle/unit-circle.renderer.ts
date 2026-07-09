import { angleRadians, unitCircleCoordinates, UnitCircleScene } from "./unit-circle.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const CIRCLE_CENTER_X = 220
const CIRCLE_CENTER_Y = 240
const CIRCLE_RADIUS = 120
const WAVE_LEFT = 420
const WAVE_RIGHT = 680
const WAVE_TOP = 110
const WAVE_HEIGHT = 260

export function renderUnitCircleScene(canvas: HTMLCanvasElement, scene: UnitCircleScene): void {
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
  drawUnitCircleAxes(context)
  drawUnitCircle(context, scene)

  if (scene.showWave) {
    drawSineWave(context, scene)
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

function drawUnitCircleAxes(context: CanvasRenderingContext2D): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.18)"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(CIRCLE_CENTER_X - CIRCLE_RADIUS - 40, CIRCLE_CENTER_Y)
  context.lineTo(CIRCLE_CENTER_X + CIRCLE_RADIUS + 40, CIRCLE_CENTER_Y)
  context.moveTo(CIRCLE_CENTER_X, CIRCLE_CENTER_Y - CIRCLE_RADIUS - 40)
  context.lineTo(CIRCLE_CENTER_X, CIRCLE_CENTER_Y + CIRCLE_RADIUS + 40)
  context.stroke()
  context.restore()
}

function drawUnitCircle(context: CanvasRenderingContext2D, scene: UnitCircleScene): void {
  const coordinates = unitCircleCoordinates(scene)
  const pointX = CIRCLE_CENTER_X + coordinates.x * CIRCLE_RADIUS
  const pointY = CIRCLE_CENTER_Y - coordinates.y * CIRCLE_RADIUS

  context.save()
  context.strokeStyle = "#1f5e8c"
  context.lineWidth = 3
  context.beginPath()
  context.arc(CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS, 0, Math.PI * 2)
  context.stroke()

  if (scene.showProjection) {
    context.setLineDash([8, 6])
    context.strokeStyle = "rgba(31, 94, 140, 0.55)"
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(CIRCLE_CENTER_X, CIRCLE_CENTER_Y)
    context.lineTo(pointX, CIRCLE_CENTER_Y)
    context.lineTo(pointX, pointY)
    context.stroke()
    context.setLineDash([])
  }

  context.strokeStyle = "#bf5b04"
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(CIRCLE_CENTER_X, CIRCLE_CENTER_Y)
  context.lineTo(pointX, pointY)
  context.stroke()

  context.fillStyle = "#bf5b04"
  context.beginPath()
  context.arc(pointX, pointY, 7, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = "#3f7f41"
  context.lineWidth = 3
  context.beginPath()
  context.arc(
    CIRCLE_CENTER_X,
    CIRCLE_CENTER_Y,
    34,
    0,
    -angleRadians(scene),
    angleRadians(scene) < 0,
  )
  context.stroke()

  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText(`cos = ${coordinates.x.toFixed(3)}`, 54, 52)
  context.fillText(`sin = ${coordinates.y.toFixed(3)}`, 54, 74)
  context.fillText(`${scene.angleDegrees.toFixed(0)} deg`, pointX + 12, pointY - 12)
  context.restore()
}

function drawSineWave(context: CanvasRenderingContext2D, scene: UnitCircleScene): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.18)"
  context.lineWidth = 1.5
  context.strokeRect(WAVE_LEFT, WAVE_TOP, WAVE_RIGHT - WAVE_LEFT, WAVE_HEIGHT)

  const midY = WAVE_TOP + WAVE_HEIGHT / 2
  context.beginPath()
  context.moveTo(WAVE_LEFT, midY)
  context.lineTo(WAVE_RIGHT, midY)
  context.stroke()

  context.strokeStyle = "#7f2d00"
  context.lineWidth = 3
  context.beginPath()

  for (let x = 0; x <= WAVE_RIGHT - WAVE_LEFT; x += 2) {
    const angle = ((x / (WAVE_RIGHT - WAVE_LEFT)) * 2 - 1) * Math.PI
    const y = midY - Math.sin(angle) * (WAVE_HEIGHT / 2 - 24)

    if (x === 0) {
      context.moveTo(WAVE_LEFT + x, y)
    } else {
      context.lineTo(WAVE_LEFT + x, y)
    }
  }

  context.stroke()

  const normalizedX = ((scene.angleDegrees + 180) / 360) * (WAVE_RIGHT - WAVE_LEFT)
  const highlightedY = midY - unitCircleCoordinates(scene).y * (WAVE_HEIGHT / 2 - 24)
  context.fillStyle = "#1f5e8c"
  context.beginPath()
  context.arc(WAVE_LEFT + normalizedX, highlightedY, 6, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText("Sine wave preview", WAVE_LEFT + 12, WAVE_TOP - 16)
  context.restore()
}
