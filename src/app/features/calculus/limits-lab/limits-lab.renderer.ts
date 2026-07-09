import {
  evaluateLimitsCurve,
  limitValue,
  LimitsLabScene,
  leftHandValue,
  rightHandValue,
} from "./limits-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const DOMAIN_MIN = -6
const DOMAIN_MAX = 6
const RANGE_MIN = -2
const RANGE_MAX = 3.2

export function renderLimitsLabScene(canvas: HTMLCanvasElement, scene: LimitsLabScene): void {
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

  if (scene.showLimitGuide) {
    drawLimitGuide(context, scene)
  }

  if (scene.showSamples) {
    drawSamples(context, scene)
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
  gradient.addColorStop(0, "#f8fbff")
  gradient.addColorStop(1, "#fff5ea")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawAxes(context: CanvasRenderingContext2D): void {
  const zeroX = projectX(0)
  const zeroY = projectY(0)

  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(0, zeroY)
  context.lineTo(CANVAS_WIDTH, zeroY)
  context.moveTo(zeroX, 0)
  context.lineTo(zeroX, CANVAS_HEIGHT)
  context.stroke()
  context.restore()
}

function drawCurve(context: CanvasRenderingContext2D, scene: LimitsLabScene): void {
  context.save()
  context.strokeStyle = "#1f5e8c"
  context.lineWidth = 3
  context.beginPath()

  let segmentStarted = false

  for (let step = 0; step <= 320; step += 1) {
    const x = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) / 320) * step
    const value = evaluateLimitsCurve(scene, x)

    if (value === null) {
      segmentStarted = false
      continue
    }

    const pixelX = projectX(x)
    const pixelY = projectY(value)

    if (!segmentStarted) {
      context.moveTo(pixelX, pixelY)
      segmentStarted = true
    } else {
      context.lineTo(pixelX, pixelY)
    }
  }

  context.stroke()
  context.restore()
}

function drawLimitGuide(context: CanvasRenderingContext2D, scene: LimitsLabScene): void {
  const x = projectX(scene.targetX)
  const y = projectY(limitValue(scene))

  context.save()
  context.strokeStyle = "#1d6a43"
  context.lineWidth = 2
  context.setLineDash([8, 6])
  context.beginPath()
  context.moveTo(x, 0)
  context.lineTo(x, CANVAS_HEIGHT)
  context.moveTo(0, y)
  context.lineTo(CANVAS_WIDTH, y)
  context.stroke()
  context.setLineDash([])
  context.fillStyle = "#1d6a43"
  context.beginPath()
  context.arc(x, y, 7, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText(`limit ${limitValue(scene).toFixed(2)}`, x + 10, y - 10)
  context.restore()
}

function drawSamples(context: CanvasRenderingContext2D, scene: LimitsLabScene): void {
  const leftX = scene.targetX - scene.windowRadius
  const rightX = scene.targetX + scene.windowRadius
  const leftY = leftHandValue(scene)
  const rightY = rightHandValue(scene)

  context.save()
  context.fillStyle = "#bf5b04"
  context.strokeStyle = "#bf5b04"
  context.lineWidth = 2
  drawSample(context, leftX, leftY, "left")
  drawSample(context, rightX, rightY, "right")
  context.restore()
}

function drawSample(
  context: CanvasRenderingContext2D,
  sampleX: number,
  sampleY: number,
  label: string,
): void {
  const x = projectX(sampleX)
  const y = projectY(sampleY)

  context.beginPath()
  context.arc(x, y, 6, 0, Math.PI * 2)
  context.fill()
  context.font = "600 13px Avenir Next"
  context.fillText(label, x + 10, y + 4)
}

function projectX(x: number): number {
  return ((x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * CANVAS_WIDTH
}

function projectY(y: number): number {
  return CANVAS_HEIGHT - ((y - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * CANVAS_HEIGHT
}
