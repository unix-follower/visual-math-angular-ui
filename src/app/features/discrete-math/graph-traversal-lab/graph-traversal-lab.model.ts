export type GraphTraversalLabScene = {
  readonly startNode: number
  readonly goalNode: number
  readonly revealSteps: number
  readonly useBreadthFirst: boolean
  readonly showVisitOrder: boolean
}

export type GraphTraversalNode = {
  readonly id: number
  readonly label: string
  readonly x: number
  readonly y: number
}

export type GraphTraversalResult = {
  readonly order: readonly number[]
  readonly path: readonly number[]
  readonly foundGoal: boolean
}

export const GRAPH_TRAVERSAL_NODES: readonly GraphTraversalNode[] = [
  { id: 0, label: "A", x: 140, y: 120 },
  { id: 1, label: "B", x: 310, y: 90 },
  { id: 2, label: "C", x: 540, y: 120 },
  { id: 3, label: "D", x: 210, y: 300 },
  { id: 4, label: "E", x: 400, y: 260 },
  { id: 5, label: "F", x: 590, y: 320 },
]

const ADJACENCY_LIST: Readonly<Record<number, readonly number[]>> = {
  0: [1, 3],
  1: [0, 2, 4],
  2: [1, 4, 5],
  3: [0, 4],
  4: [1, 2, 3, 5],
  5: [2, 4],
}

export const DEFAULT_GRAPH_TRAVERSAL_SCENE: GraphTraversalLabScene = {
  startNode: 0,
  goalNode: 5,
  revealSteps: 6,
  useBreadthFirst: true,
  showVisitOrder: true,
}

export function isGraphTraversalLabScene(value: unknown): value is GraphTraversalLabScene {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate["startNode"] === "number" &&
    typeof candidate["goalNode"] === "number" &&
    typeof candidate["revealSteps"] === "number" &&
    typeof candidate["useBreadthFirst"] === "boolean" &&
    typeof candidate["showVisitOrder"] === "boolean"
  )
}

export function graphNodeLabel(nodeId: number): string {
  return GRAPH_TRAVERSAL_NODES[nodeId]?.label ?? "?"
}

export function graphTraversalResult(scene: GraphTraversalLabScene): GraphTraversalResult {
  const queue: number[] = [scene.startNode]
  const visited = new Set<number>([scene.startNode])
  const order: number[] = []
  const parent = new Map<number, number | null>([[scene.startNode, null]])

  while (queue.length > 0) {
    const current = scene.useBreadthFirst ? queue.shift() : queue.pop()

    if (current === undefined) {
      break
    }

    order.push(current)

    if (current === scene.goalNode) {
      return {
        order,
        path: buildPath(parent, scene.goalNode),
        foundGoal: true,
      }
    }

    for (const neighbor of ADJACENCY_LIST[current] ?? []) {
      if (visited.has(neighbor)) {
        continue
      }

      visited.add(neighbor)
      parent.set(neighbor, current)
      queue.push(neighbor)
    }
  }

  return {
    order,
    path: [],
    foundGoal: false,
  }
}

export function revealedTraversalOrder(scene: GraphTraversalLabScene): readonly number[] {
  return graphTraversalResult(scene).order.slice(0, Math.max(1, Math.round(scene.revealSteps)))
}

export function traversalPath(scene: GraphTraversalLabScene): readonly number[] {
  const result = graphTraversalResult(scene)
  const visibleNodes = new Set(revealedTraversalOrder(scene))

  if (!result.foundGoal || !visibleNodes.has(scene.goalNode)) {
    return []
  }

  return result.path.filter((nodeId) => visibleNodes.has(nodeId))
}

export function graphTraversalSummary(scene: GraphTraversalLabScene): string {
  const result = graphTraversalResult(scene)
  const revealed = revealedTraversalOrder(scene).map(graphNodeLabel).join(" -> ")

  if (!result.foundGoal) {
    return `Starting at ${graphNodeLabel(scene.startNode)}, the ${scene.useBreadthFirst ? "breadth-first" : "depth-first"} traversal has not reached ${graphNodeLabel(scene.goalNode)} within the revealed steps. Current order: ${revealed}.`
  }

  return `Starting at ${graphNodeLabel(scene.startNode)}, the ${scene.useBreadthFirst ? "breadth-first" : "depth-first"} traversal reaches ${graphNodeLabel(scene.goalNode)} with path ${result.path.map(graphNodeLabel).join(" -> ")}. Revealed order: ${revealed}.`
}

function buildPath(
  parent: ReadonlyMap<number, number | null>,
  goalNode: number,
): readonly number[] {
  const path: number[] = []
  let current: number | null | undefined = goalNode

  while (current !== null && current !== undefined) {
    path.unshift(current)
    current = parent.get(current)
  }

  return path
}
