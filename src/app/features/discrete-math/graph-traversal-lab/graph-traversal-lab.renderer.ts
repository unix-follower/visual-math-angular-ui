import {
  GRAPH_TRAVERSAL_NODES,
  graphNodeLabel,
  graphTraversalResult,
  GraphTraversalLabScene,
  revealedTraversalOrder,
  traversalPath,
} from "./graph-traversal-lab.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const EDGE_LIST: readonly [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 4],
  [4, 5],
]

export function renderGraphTraversalScene(
  canvas: HTMLCanvasElement,
  scene: GraphTraversalLabScene,
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
  drawEdges(context, scene)
  drawPath(context, scene)
  drawNodes(context, scene)
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
  gradient.addColorStop(0, "#f5fbf1")
  gradient.addColorStop(1, "#eef5ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawEdges(context: CanvasRenderingContext2D, scene: GraphTraversalLabScene): void {
  const revealed = new Set(revealedTraversalOrder(scene))

  context.save()
  context.lineWidth = 3

  for (const [from, to] of EDGE_LIST) {
    const fromNode = GRAPH_TRAVERSAL_NODES[from]
    const toNode = GRAPH_TRAVERSAL_NODES[to]
    context.strokeStyle =
      revealed.has(from) && revealed.has(to) ? "#88a9cf" : "rgb(19 33 59 / 0.18)"
    context.beginPath()
    context.moveTo(fromNode.x, fromNode.y)
    context.lineTo(toNode.x, toNode.y)
    context.stroke()
  }

  context.restore()
}

function drawPath(context: CanvasRenderingContext2D, scene: GraphTraversalLabScene): void {
  const path = traversalPath(scene)

  if (path.length < 2) {
    return
  }

  context.save()
  context.strokeStyle = "#bf5b04"
  context.lineWidth = 5
  context.setLineDash([10, 6])
  context.beginPath()

  path.forEach((nodeId, index) => {
    const node = GRAPH_TRAVERSAL_NODES[nodeId]

    if (index === 0) {
      context.moveTo(node.x, node.y)
      return
    }

    context.lineTo(node.x, node.y)
  })

  context.stroke()
  context.restore()
}

function drawNodes(context: CanvasRenderingContext2D, scene: GraphTraversalLabScene): void {
  const revealed = revealedTraversalOrder(scene)
  const revealedSet = new Set(revealed)
  const pathSet = new Set(traversalPath(scene))
  const result = graphTraversalResult(scene)

  for (const node of GRAPH_TRAVERSAL_NODES) {
    context.save()
    context.fillStyle = pickNodeColor(scene, revealedSet, pathSet, node.id)
    context.beginPath()
    context.arc(node.x, node.y, 26, 0, Math.PI * 2)
    context.fill()
    context.lineWidth = 2
    context.strokeStyle = "#13213b"
    context.stroke()

    context.fillStyle = "#13213b"
    context.font = "700 16px Avenir Next"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(node.label, node.x, node.y)

    if (scene.showVisitOrder && revealedSet.has(node.id)) {
      const orderIndex = revealed.indexOf(node.id) + 1
      context.fillStyle = "#13213b"
      context.font = "600 12px Avenir Next"
      context.fillText(`#${orderIndex}`, node.x, node.y + 38)
    }

    if (result.foundGoal && node.id === scene.goalNode && pathSet.has(node.id)) {
      context.fillStyle = "#bf5b04"
      context.font = "600 12px Avenir Next"
      context.fillText("goal", node.x, node.y - 38)
    }

    if (node.id === scene.startNode) {
      context.fillStyle = "#1d6a43"
      context.font = "600 12px Avenir Next"
      context.fillText("start", node.x, node.y - 38)
    }

    context.restore()
  }
}

function pickNodeColor(
  scene: GraphTraversalLabScene,
  revealedSet: ReadonlySet<number>,
  pathSet: ReadonlySet<number>,
  nodeId: number,
): string {
  if (pathSet.has(nodeId)) {
    return "#ffd7ad"
  }

  if (nodeId === scene.startNode) {
    return "#cfeacc"
  }

  if (nodeId === scene.goalNode) {
    return "#dbe8ff"
  }

  if (revealedSet.has(nodeId)) {
    return "#f2f6ff"
  }

  return "#ffffff"
}
