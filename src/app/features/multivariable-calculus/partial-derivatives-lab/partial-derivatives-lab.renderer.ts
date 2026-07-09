import {
  evaluateSurface,
  gradientMagnitude,
  partialDerivativeX,
  partialDerivativeY,
  PartialDerivativesLabScene,
} from "./partial-derivatives-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const DOMAIN_MIN = -4
const DOMAIN_MAX = 4

export function renderPartialDerivativesLabScene(
  canvas: HTMLCanvasElement,
  scene: PartialDerivativesLabScene,
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

  drawHeatmap(context, scene)

  if (scene.showContours) {
    drawContours(context, scene)
  }

  drawAxes(context)
  drawSampleMarker(context, scene)

  if (scene.showGradient) {
    drawGradient(context, scene)
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

function drawHeatmap(context: CanvasRenderingContext2D, scene: PartialDerivativesLabScene): void {
  for (let pixelY = 0; pixelY < CANVAS_HEIGHT; pixelY += 8) {
    for (let pixelX = 0; pixelX < CANVAS_WIDTH; pixelX += 8) {
      const x = DOMAIN_MIN + (pixelX / CANVAS_WIDTH) * (DOMAIN_MAX - DOMAIN_MIN)
      const y = DOMAIN_MAX - (pixelY / CANVAS_HEIGHT) * (DOMAIN_MAX - DOMAIN_MIN)
      const z = evaluateSurface(scene, x, y)
      const hue = 210 - z * 24
      const lightness = 76 - z * 4
      context.fillStyle = `hsl(${clamp(hue, 10, 220)} 68% ${clamp(lightness, 34, 86)}%)`
      context.fillRect(pixelX, pixelY, 8, 8)
    }
  }
}

function drawContours(context: CanvasRenderingContext2D, scene: PartialDerivativesLabScene): void {
  context.save()
  context.strokeStyle = "rgb(255 255 255 / 0.35)"
  context.lineWidth = 1

  for (let contour = -4; contour <= 4; contour += 1) {
    context.beginPath()
    let started = false

    for (let step = 0; step <= 200; step += 1) {
      const x = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) / 200) * step

      for (let yStep = 0; yStep <= 200; yStep += 1) {
        const y = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) / 200) * yStep
        const z = evaluateSurface(scene, x, y)

        if (Math.abs(z - contour) < 0.05) {
          const projected = projectPoint(x, y)

          if (!started) {
            context.moveTo(projected.x, projected.y)
            started = true
          } else {
            context.lineTo(projected.x, projected.y)
          }

          break
        }
      }
    }

    context.stroke()
  }

  context.restore()
}

function drawAxes(context: CanvasRenderingContext2D): void {
  const zero = projectPoint(0, 0)

  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(0, zero.y)
  context.lineTo(CANVAS_WIDTH, zero.y)
  context.moveTo(zero.x, 0)
  context.lineTo(zero.x, CANVAS_HEIGHT)
  context.stroke()
  context.restore()
}

function drawSampleMarker(
  context: CanvasRenderingContext2D,
  scene: PartialDerivativesLabScene,
): void {
  const point = projectPoint(scene.sampleX, scene.sampleY)

  context.save()
  context.fillStyle = "#bf5b04"
  context.beginPath()
  context.arc(point.x, point.y, 7, 0, Math.PI * 2)
  context.fill()
  context.font = "600 14px Avenir Next"
  context.fillStyle = "#13213b"
  context.fillText(
    `z=${evaluateSurface(scene, scene.sampleX, scene.sampleY).toFixed(2)}`,
    point.x + 10,
    point.y - 12,
  )
  context.restore()
}

function drawGradient(context: CanvasRenderingContext2D, scene: PartialDerivativesLabScene): void {
  const point = projectPoint(scene.sampleX, scene.sampleY)
  const gradientX = partialDerivativeX(scene, scene.sampleX, scene.sampleY)
  const gradientY = partialDerivativeY(scene, scene.sampleX, scene.sampleY)
  const scale = gradientMagnitude(scene) === 0 ? 0 : 32 / gradientMagnitude(scene)
  const tip = projectPoint(scene.sampleX + gradientX * scale, scene.sampleY + gradientY * scale)

  context.save()
  context.strokeStyle = "#1d6a43"
  context.fillStyle = "#1d6a43"
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(point.x, point.y)
  context.lineTo(tip.x, tip.y)
  context.stroke()
  context.beginPath()
  context.arc(tip.x, tip.y, 5, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function projectPoint(x: number, y: number): { readonly x: number; readonly y: number } {
  return {
    x: ((x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * CANVAS_WIDTH,
    y: CANVAS_HEIGHT - ((y - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * CANVAS_HEIGHT,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
