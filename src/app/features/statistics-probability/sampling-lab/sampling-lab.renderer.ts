import { SamplingLabMetrics, SamplingLabScene } from "./sampling-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const CHART_LEFT = 70
const CHART_TOP = 70
const CHART_WIDTH = 600
const CHART_HEIGHT = 320

export function renderSamplingLabScene(
  canvas: HTMLCanvasElement,
  scene: SamplingLabScene,
  metrics: SamplingLabMetrics,
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
  drawHistogram(context, scene, metrics)
  drawGuideLines(context, scene, metrics)
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
  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(CHART_LEFT, CHART_TOP)
  context.lineTo(CHART_LEFT, CHART_TOP + CHART_HEIGHT)
  context.lineTo(CHART_LEFT + CHART_WIDTH, CHART_TOP + CHART_HEIGHT)
  context.stroke()
  context.restore()
}

function drawHistogram(
  context: CanvasRenderingContext2D,
  scene: SamplingLabScene,
  metrics: SamplingLabMetrics,
): void {
  const bucketWidth = CHART_WIDTH / metrics.histogram.length

  context.save()
  context.fillStyle = "#1f5e8c"
  context.font = "600 13px Avenir Next"

  metrics.histogram.forEach((count, successCount) => {
    const barHeight =
      metrics.maxBucketCount === 0 ? 0 : (count / metrics.maxBucketCount) * (CHART_HEIGHT - 20)
    const x = CHART_LEFT + successCount * bucketWidth + 6
    const y = CHART_TOP + CHART_HEIGHT - barHeight

    context.fillStyle = "rgba(31, 94, 140, 0.78)"
    context.fillRect(x, y, Math.max(bucketWidth - 12, 10), barHeight)
    context.fillStyle = "#13213b"
    context.fillText(`${successCount}`, x, CHART_TOP + CHART_HEIGHT + 20)
  })

  context.fillText(
    "Successes per experiment",
    CHART_LEFT + CHART_WIDTH / 2 - 68,
    CHART_TOP + CHART_HEIGHT + 46,
  )
  context.restore()
}

function drawGuideLines(
  context: CanvasRenderingContext2D,
  scene: SamplingLabScene,
  metrics: SamplingLabMetrics,
): void {
  const bucketWidth = CHART_WIDTH / metrics.histogram.length

  if (scene.showExpectedValue) {
    drawVerticalGuide(
      context,
      CHART_LEFT + (metrics.theoreticalMean + 0.5) * bucketWidth,
      "#bf5b04",
      `E[X] ${metrics.theoreticalMean.toFixed(2)}`,
    )
  }

  if (scene.showEmpiricalMean) {
    drawVerticalGuide(
      context,
      CHART_LEFT + (metrics.empiricalMean + 0.5) * bucketWidth,
      "#1d6a43",
      `Mean ${metrics.empiricalMean.toFixed(2)}`,
    )
  }
}

function drawVerticalGuide(
  context: CanvasRenderingContext2D,
  x: number,
  color: string,
  label: string,
): void {
  context.save()
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = 2
  context.setLineDash([8, 6])
  context.beginPath()
  context.moveTo(x, CHART_TOP)
  context.lineTo(x, CHART_TOP + CHART_HEIGHT)
  context.stroke()
  context.setLineDash([])
  context.font = "600 13px Avenir Next"
  context.fillText(label, x + 10, CHART_TOP + 18)
  context.restore()
}
