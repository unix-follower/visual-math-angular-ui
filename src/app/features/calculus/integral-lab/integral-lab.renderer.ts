import {
  evaluateIntegralCurve,
  exactIntegralArea,
  IntegralLabScene,
  midpointRiemannSum,
} from "./integral-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const CHART_LEFT = 68
const CHART_RIGHT = 672
const CHART_TOP = 48
const CHART_BOTTOM = 420
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP
const DOMAIN_MAX = Math.PI * 2
const VALUE_MAX = 2.1

export function renderIntegralLabScene(canvas: HTMLCanvasElement, scene: IntegralLabScene): void {
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

  if (scene.showExactArea) {
    drawExactArea(context, scene)
  }

  if (scene.showRectangles) {
    drawRectangles(context, scene)
  }

  drawCurve(context, scene)
  drawUpperBoundGuide(context, scene)
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
  gradient.addColorStop(0, "#f4fbff")
  gradient.addColorStop(1, "#fff8ec")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawGrid(context: CanvasRenderingContext2D): void {
  context.save()
  context.strokeStyle = "rgb(19 33 59 / 0.12)"
  context.lineWidth = 1

  for (let step = 0; step <= 8; step += 1) {
    const y = CHART_TOP + (CHART_HEIGHT / 8) * step
    context.beginPath()
    context.moveTo(CHART_LEFT, y)
    context.lineTo(CHART_RIGHT, y)
    context.stroke()
  }

  for (let step = 0; step <= 6; step += 1) {
    const x = CHART_LEFT + (CHART_WIDTH / 6) * step
    context.beginPath()
    context.moveTo(x, CHART_TOP)
    context.lineTo(x, CHART_BOTTOM)
    context.stroke()
  }

  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(CHART_LEFT, projectY(0))
  context.lineTo(CHART_RIGHT, projectY(0))
  context.moveTo(CHART_LEFT, CHART_TOP)
  context.lineTo(CHART_LEFT, CHART_BOTTOM)
  context.stroke()
  context.restore()
}

function drawExactArea(context: CanvasRenderingContext2D, scene: IntegralLabScene): void {
  context.save()
  context.fillStyle = "rgb(31 94 140 / 0.18)"
  context.beginPath()
  context.moveTo(projectX(0), projectY(0))

  for (let step = 0; step <= 120; step += 1) {
    const x = (scene.upperBound / 120) * step
    context.lineTo(projectX(x), projectY(evaluateIntegralCurve(scene, x)))
  }

  context.lineTo(projectX(scene.upperBound), projectY(0))
  context.closePath()
  context.fill()
  context.restore()
}

function drawRectangles(context: CanvasRenderingContext2D, scene: IntegralLabScene): void {
  const deltaX = scene.upperBound / scene.subdivisionCount

  context.save()
  context.fillStyle = "rgb(191 91 4 / 0.16)"
  context.strokeStyle = "rgb(191 91 4 / 0.45)"
  context.lineWidth = 1

  for (let index = 0; index < scene.subdivisionCount; index += 1) {
    const midpointX = (index + 0.5) * deltaX
    const height = evaluateIntegralCurve(scene, midpointX)
    const left = projectX(index * deltaX)
    const right = projectX((index + 1) * deltaX)
    const top = projectY(height)
    const baseline = projectY(0)
    context.fillRect(left, top, right - left, baseline - top)
    context.strokeRect(left, top, right - left, baseline - top)
  }

  context.restore()
}

function drawCurve(context: CanvasRenderingContext2D, scene: IntegralLabScene): void {
  context.save()
  context.strokeStyle = "#1f5e8c"
  context.lineWidth = 3
  context.beginPath()

  for (let step = 0; step <= 220; step += 1) {
    const x = (DOMAIN_MAX / 220) * step
    const pixelX = projectX(x)
    const pixelY = projectY(evaluateIntegralCurve(scene, x))

    if (step === 0) {
      context.moveTo(pixelX, pixelY)
    } else {
      context.lineTo(pixelX, pixelY)
    }
  }

  context.stroke()
  context.restore()
}

function drawUpperBoundGuide(context: CanvasRenderingContext2D, scene: IntegralLabScene): void {
  const x = projectX(scene.upperBound)

  context.save()
  context.strokeStyle = "#1d6a43"
  context.setLineDash([8, 6])
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(x, CHART_TOP)
  context.lineTo(x, CHART_BOTTOM)
  context.stroke()
  context.setLineDash([])
  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText(`b=${scene.upperBound.toFixed(2)}`, x + 10, CHART_TOP + 20)
  context.fillText(`exact ${exactIntegralArea(scene).toFixed(2)}`, CHART_LEFT + 12, CHART_TOP + 20)
  context.fillText(
    `midpoint ${midpointRiemannSum(scene).toFixed(2)}`,
    CHART_LEFT + 12,
    CHART_TOP + 40,
  )
  context.restore()
}

function projectX(x: number): number {
  return CHART_LEFT + (x / DOMAIN_MAX) * CHART_WIDTH
}

function projectY(y: number): number {
  return CHART_BOTTOM - (y / VALUE_MAX) * CHART_HEIGHT
}
