import {
  GradientDescentLabMetrics,
  GradientDescentLabScene,
  objectiveValue,
} from "./gradient-descent-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const PLOT_LEFT = 90
const PLOT_TOP = 60
const PLOT_WIDTH = 540
const PLOT_HEIGHT = 360
const DOMAIN_MIN = -4
const DOMAIN_MAX = 4

export function renderGradientDescentLabScene(
  canvas: HTMLCanvasElement,
  scene: GradientDescentLabScene,
  metrics: GradientDescentLabMetrics,
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

  drawBackground(context, scene)
  drawAxes(context)
  if (scene.showContours) {
    drawContours(context, scene)
  }
  if (scene.showPath) {
    drawPath(context, metrics)
  }
  drawBadge(context, scene, metrics)
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

function drawBackground(context: CanvasRenderingContext2D, scene: GradientDescentLabScene): void {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, "#fff8ea")
  gradient.addColorStop(1, "#eef7ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const image = context.createImageData(PLOT_WIDTH, PLOT_HEIGHT)

  for (let pixelY = 0; pixelY < PLOT_HEIGHT; pixelY += 1) {
    for (let pixelX = 0; pixelX < PLOT_WIDTH; pixelX += 1) {
      const x = mapScreenToDomain(pixelX, PLOT_WIDTH)
      const y = mapScreenToDomain(PLOT_HEIGHT - pixelY, PLOT_HEIGHT)
      const value = objectiveValue(scene, x, y)
      const normalized = Math.max(0, Math.min(1, value / 28))
      const offset = (pixelY * PLOT_WIDTH + pixelX) * 4

      image.data[offset] = 248 - normalized * 68
      image.data[offset + 1] = 250 - normalized * 92
      image.data[offset + 2] = 255 - normalized * 124
      image.data[offset + 3] = 255
    }
  }

  context.putImageData(image, PLOT_LEFT, PLOT_TOP)
}

function drawAxes(context: CanvasRenderingContext2D): void {
  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.strokeRect(PLOT_LEFT, PLOT_TOP, PLOT_WIDTH, PLOT_HEIGHT)

  const zeroX = projectX(0)
  const zeroY = projectY(0)
  context.beginPath()
  context.moveTo(zeroX, PLOT_TOP)
  context.lineTo(zeroX, PLOT_TOP + PLOT_HEIGHT)
  context.moveTo(PLOT_LEFT, zeroY)
  context.lineTo(PLOT_LEFT + PLOT_WIDTH, zeroY)
  context.stroke()
  context.restore()
}

function drawContours(context: CanvasRenderingContext2D, scene: GradientDescentLabScene): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.25)"
  context.lineWidth = 1

  const levels = [2, 4, 8, 12, 18]

  for (const level of levels) {
    context.beginPath()
    for (let angleIndex = 0; angleIndex <= 180; angleIndex += 1) {
      const angle = (Math.PI * 2 * angleIndex) / 180
      const denominator =
        scene.anisotropy * Math.cos(angle) ** 2 +
        0.6 * Math.sin(angle) ** 2 +
        0.35 * Math.cos(angle) * Math.sin(angle)
      const radius = Math.sqrt(Math.max(level / Math.max(denominator, 0.1), 0))
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)
      const screenX = projectX(x)
      const screenY = projectY(y)

      if (angleIndex === 0) {
        context.moveTo(screenX, screenY)
      } else {
        context.lineTo(screenX, screenY)
      }
    }
    context.closePath()
    context.stroke()
  }

  context.restore()
}

function drawPath(context: CanvasRenderingContext2D, metrics: GradientDescentLabMetrics): void {
  context.save()
  context.strokeStyle = "#bf5b04"
  context.lineWidth = 2.5
  context.beginPath()

  metrics.path.forEach((point, index) => {
    const x = projectX(point.x)
    const y = projectY(point.y)

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })

  context.stroke()

  metrics.path.forEach((point, index) => {
    const x = projectX(point.x)
    const y = projectY(point.y)
    context.fillStyle = index === metrics.path.length - 1 ? "#1d6a43" : "#bf5b04"
    context.beginPath()
    context.arc(x, y, index === metrics.path.length - 1 ? 5 : 4, 0, Math.PI * 2)
    context.fill()
  })

  context.restore()
}

function drawBadge(
  context: CanvasRenderingContext2D,
  scene: GradientDescentLabScene,
  metrics: GradientDescentLabMetrics,
): void {
  context.save()
  context.fillStyle = "rgba(255, 255, 255, 0.92)"
  context.strokeStyle = "rgba(19, 33, 59, 0.12)"
  context.beginPath()
  context.roundRect(24, 24, 286, 96, 14)
  context.fill()
  context.stroke()
  context.fillStyle = "#13213b"
  context.font = "600 13px Avenir Next"
  context.fillText(`η = ${scene.learningRate.toFixed(2)}  |  steps = ${scene.stepCount}`, 40, 50)
  context.fillText(`final value = ${metrics.finalPoint.value.toFixed(2)}`, 40, 74)
  context.fillText(
    `|∇f| = ${metrics.gradientNorm.toFixed(2)}  |  gain = ${metrics.improvement.toFixed(2)}`,
    40,
    98,
  )
  context.restore()
}

function mapScreenToDomain(value: number, size: number): number {
  return DOMAIN_MIN + (value / size) * (DOMAIN_MAX - DOMAIN_MIN)
}

function projectX(x: number): number {
  return PLOT_LEFT + ((x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * PLOT_WIDTH
}

function projectY(y: number): number {
  return PLOT_TOP + PLOT_HEIGHT - ((y - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * PLOT_HEIGHT
}
