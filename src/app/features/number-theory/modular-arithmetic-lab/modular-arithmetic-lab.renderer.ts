import {
  ModularArithmeticLabMetrics,
  ModularArithmeticLabScene,
} from "./modular-arithmetic-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const CENTER_X = 360
const CENTER_Y = 240
const BASE_RADIUS = 150

export function renderModularArithmeticLabScene(
  canvas: HTMLCanvasElement,
  scene: ModularArithmeticLabScene,
  metrics: ModularArithmeticLabMetrics,
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
  drawResidueRing(context, scene, metrics)
  drawLegend(context, scene, metrics)
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
  gradient.addColorStop(0, "#fff8ea")
  gradient.addColorStop(1, "#eef6ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawResidueRing(
  context: CanvasRenderingContext2D,
  scene: ModularArithmeticLabScene,
  metrics: ModularArithmeticLabMetrics,
): void {
  const residues = Array.from({ length: scene.modulus }, (_, index) => index)

  context.save()
  context.translate(CENTER_X, CENTER_Y)

  context.strokeStyle = "#13213b"
  context.lineWidth = 2
  context.beginPath()
  context.arc(0, 0, BASE_RADIUS, 0, Math.PI * 2)
  context.stroke()

  for (const residue of residues) {
    const angle = (Math.PI * 2 * residue) / scene.modulus - Math.PI / 2
    const x = Math.cos(angle) * BASE_RADIUS
    const y = Math.sin(angle) * BASE_RADIUS
    const isCoprime = metrics.coprimeResidues.includes(residue)

    context.fillStyle = scene.showCoprimeRing && isCoprime ? "rgba(29, 106, 67, 0.16)" : "#ffffff"
    context.beginPath()
    context.arc(x, y, 22, 0, Math.PI * 2)
    context.fill()

    context.strokeStyle = "#13213b"
    context.lineWidth = 1.5
    context.stroke()

    context.fillStyle = "#13213b"
    context.font = "600 13px Avenir Next"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(`${residue}`, x, y)
  }

  drawResidueMarker(context, metrics.normalizedA, scene.modulus, "#1f5e8c", "a")
  drawResidueMarker(context, metrics.normalizedB, scene.modulus, "#1d6a43", "b")

  if (scene.showAddition) {
    drawResidueMarker(context, metrics.additionResidue, scene.modulus, "#bf5b04", "a+b")
  }

  if (scene.showMultiplication) {
    drawResidueMarker(context, metrics.multiplicationResidue, scene.modulus, "#7d3c98", "ab")
  }

  context.restore()
}

function drawResidueMarker(
  context: CanvasRenderingContext2D,
  residue: number,
  modulus: number,
  color: string,
  label: string,
): void {
  const angle = (Math.PI * 2 * residue) / modulus - Math.PI / 2
  const x = Math.cos(angle) * (BASE_RADIUS + 38)
  const y = Math.sin(angle) * (BASE_RADIUS + 38)

  context.fillStyle = color
  context.beginPath()
  context.arc(x, y, 16, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = "#ffffff"
  context.font = "700 11px Avenir Next"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, x, y + 0.5)
}

function drawLegend(
  context: CanvasRenderingContext2D,
  scene: ModularArithmeticLabScene,
  metrics: ModularArithmeticLabMetrics,
): void {
  const legendRows = [
    { color: "#1f5e8c", label: `a ≡ ${metrics.normalizedA}` },
    { color: "#1d6a43", label: `b ≡ ${metrics.normalizedB}` },
    { color: "#bf5b04", label: `(a + b) mod m ≡ ${metrics.additionResidue}` },
    { color: "#7d3c98", label: `(ab) mod m ≡ ${metrics.multiplicationResidue}` },
  ]

  context.save()
  context.fillStyle = "rgba(255, 255, 255, 0.92)"
  context.strokeStyle = "rgba(19, 33, 59, 0.12)"
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(24, 24, 280, 128, 14)
  context.fill()
  context.stroke()

  context.fillStyle = "#13213b"
  context.font = "600 13px Avenir Next"
  context.fillText(`Modulo ${scene.modulus} residues`, 42, 48)

  legendRows.forEach((row, index) => {
    const y = 74 + index * 22

    if ((index === 2 && !scene.showAddition) || (index === 3 && !scene.showMultiplication)) {
      return
    }

    context.fillStyle = row.color
    context.fillRect(42, y - 9, 12, 12)
    context.fillStyle = "#13213b"
    context.fillText(row.label, 62, y)
  })

  context.fillText(
    `Units: ${metrics.coprimeResidues.length} residues coprime to ${scene.modulus}`,
    42,
    136,
  )
  context.restore()
}
