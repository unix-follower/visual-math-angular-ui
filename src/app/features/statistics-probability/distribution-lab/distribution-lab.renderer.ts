import { DistributionLabMetrics, DistributionLabScene } from "./distribution-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const CHART_LEFT = 70
const CHART_TOP = 70
const CHART_WIDTH = 600
const CHART_HEIGHT = 320

export function renderDistributionLabScene(
  canvas: HTMLCanvasElement,
  scene: DistributionLabScene,
  metrics: DistributionLabMetrics,
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
  drawDistribution(context, scene, metrics)
  drawGuides(context, scene, metrics)
  drawSummaryBadge(context, scene, metrics)
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
  gradient.addColorStop(0, "#fef8ea")
  gradient.addColorStop(1, "#ecf5ff")
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

function drawDistribution(
  context: CanvasRenderingContext2D,
  scene: DistributionLabScene,
  metrics: DistributionLabMetrics,
): void {
  const bucketWidth = CHART_WIDTH / metrics.probabilities.length

  context.save()
  context.font = "600 13px Avenir Next"

  metrics.probabilities.forEach((probability, outcome) => {
    const barHeight =
      metrics.maxProbability === 0
        ? 0
        : (probability / metrics.maxProbability) * (CHART_HEIGHT - 28)
    const x = CHART_LEFT + outcome * bucketWidth + 6
    const y = CHART_TOP + CHART_HEIGHT - barHeight
    const barWidth = Math.max(bucketWidth - 12, 10)
    const isHighlighted = outcome === scene.highlightedOutcome
    const isCumulative = scene.showCumulativeProbability && outcome <= scene.highlightedOutcome

    context.fillStyle = isHighlighted
      ? "#bf5b04"
      : isCumulative
        ? "rgba(29, 106, 67, 0.55)"
        : "rgba(31, 94, 140, 0.78)"
    context.fillRect(x, y, barWidth, barHeight)

    if (isHighlighted) {
      context.strokeStyle = "#13213b"
      context.lineWidth = 2
      context.strokeRect(x, y, barWidth, barHeight)
    }

    context.fillStyle = "#13213b"
    context.fillText(`${outcome}`, x, CHART_TOP + CHART_HEIGHT + 20)
  })

  context.fillText(
    "Number of successes",
    CHART_LEFT + CHART_WIDTH / 2 - 60,
    CHART_TOP + CHART_HEIGHT + 48,
  )
  context.restore()
}

function drawGuides(
  context: CanvasRenderingContext2D,
  scene: DistributionLabScene,
  metrics: DistributionLabMetrics,
): void {
  const bucketWidth = CHART_WIDTH / metrics.probabilities.length

  if (scene.showExpectedValue) {
    drawVerticalGuide(
      context,
      CHART_LEFT + (metrics.expectedValue + 0.5) * bucketWidth,
      "#7d3c98",
      `E[X] ${metrics.expectedValue.toFixed(2)}`,
    )
  }

  drawVerticalGuide(
    context,
    CHART_LEFT + (metrics.mode + 0.5) * bucketWidth,
    "#1d6a43",
    `Mode ${metrics.mode}`,
  )
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

function drawSummaryBadge(
  context: CanvasRenderingContext2D,
  scene: DistributionLabScene,
  metrics: DistributionLabMetrics,
): void {
  context.save()
  context.fillStyle = "rgba(255, 255, 255, 0.9)"
  context.strokeStyle = "rgba(19, 33, 59, 0.12)"
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(24, 18, 320, 42, 14)
  context.fill()
  context.stroke()
  context.fillStyle = "#13213b"
  context.font = "600 13px Avenir Next"
  context.fillText(
    `P(X=${scene.highlightedOutcome}) ${metrics.highlightedProbability.toFixed(3)}  |  P(X<=${scene.highlightedOutcome}) ${metrics.cumulativeProbability.toFixed(3)}`,
    38,
    44,
  )
  context.restore()
}
