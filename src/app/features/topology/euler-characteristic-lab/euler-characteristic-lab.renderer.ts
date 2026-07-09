import {
  EulerCharacteristicLabMetrics,
  EulerCharacteristicLabScene,
} from "./euler-characteristic-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const SURFACE_LEFT = 140
const SURFACE_TOP = 88
const SURFACE_WIDTH = 440
const SURFACE_HEIGHT = 280

export function renderEulerCharacteristicLabScene(
  canvas: HTMLCanvasElement,
  scene: EulerCharacteristicLabScene,
  metrics: EulerCharacteristicLabMetrics,
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
  drawSurface(context, scene)
  drawBadges(context, scene, metrics)
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
  gradient.addColorStop(0, "#fdf7ea")
  gradient.addColorStop(1, "#edf7ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawSurface(context: CanvasRenderingContext2D, scene: EulerCharacteristicLabScene): void {
  context.save()
  context.fillStyle = "#e6f2ff"
  context.strokeStyle = "#13213b"
  context.lineWidth = 2
  context.beginPath()
  context.roundRect(SURFACE_LEFT, SURFACE_TOP, SURFACE_WIDTH, SURFACE_HEIGHT, 48)
  context.fill()
  context.stroke()

  const holeCount = scene.genus + scene.boundaryCount
  const holeSpacing = holeCount > 0 ? SURFACE_WIDTH / (holeCount + 1) : 0

  for (let index = 0; index < holeCount; index += 1) {
    const x = SURFACE_LEFT + holeSpacing * (index + 1)
    const y = SURFACE_TOP + SURFACE_HEIGHT / 2 + (index % 2 === 0 ? -12 : 12)
    const radiusX = index < scene.genus ? 36 : 24
    const radiusY = index < scene.genus ? 26 : 18

    context.fillStyle = "#ffffff"
    context.beginPath()
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }

  if (scene.showCellHints) {
    drawCellHints(context, scene)
  }

  context.restore()
}

function drawCellHints(
  context: CanvasRenderingContext2D,
  scene: EulerCharacteristicLabScene,
): void {
  context.save()
  context.strokeStyle = "rgba(31, 94, 140, 0.35)"
  context.lineWidth = 1.25
  const verticalStep = SURFACE_WIDTH / (scene.decompositionDepth + 2)
  const horizontalStep = SURFACE_HEIGHT / (scene.decompositionDepth + 2)

  for (let index = 1; index <= scene.decompositionDepth; index += 1) {
    const x = SURFACE_LEFT + verticalStep * index
    const y = SURFACE_TOP + horizontalStep * index

    context.beginPath()
    context.moveTo(x, SURFACE_TOP + 16)
    context.lineTo(x, SURFACE_TOP + SURFACE_HEIGHT - 16)
    context.stroke()

    context.beginPath()
    context.moveTo(SURFACE_LEFT + 16, y)
    context.lineTo(SURFACE_LEFT + SURFACE_WIDTH - 16, y)
    context.stroke()
  }

  context.restore()
}

function drawBadges(
  context: CanvasRenderingContext2D,
  scene: EulerCharacteristicLabScene,
  metrics: EulerCharacteristicLabMetrics,
): void {
  context.save()
  context.fillStyle = "rgba(255, 255, 255, 0.92)"
  context.strokeStyle = "rgba(19, 33, 59, 0.12)"
  context.beginPath()
  context.roundRect(24, 24, 260, 132, 14)
  context.fill()
  context.stroke()

  context.fillStyle = "#13213b"
  context.font = "700 14px Avenir Next"
  context.fillText(metrics.surfaceName, 40, 50)
  context.font = "600 13px Avenir Next"
  context.fillText(`genus = ${scene.genus}`, 40, 76)
  context.fillText(`boundaries = ${scene.boundaryCount}`, 40, 98)
  context.fillText(`χ = ${metrics.eulerCharacteristic}`, 40, 120)

  if (scene.showFormula) {
    context.fillText(`2 - 2g - b = ${metrics.eulerCharacteristic}`, 40, 142)
  }

  context.restore()
}
