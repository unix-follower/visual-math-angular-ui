import {
  DEFAULT_GRAPH_TRAVERSAL_SCENE,
  graphNodeLabel,
  graphTraversalResult,
  graphTraversalSummary,
  isGraphTraversalLabScene,
  revealedTraversalOrder,
  traversalPath,
} from "./graph-traversal-lab.model"

describe("graph-traversal-lab.model", () => {
  it("should recognize a valid graph traversal scene", () => {
    expect(isGraphTraversalLabScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toBe(true)
    expect(isGraphTraversalLabScene({ startNode: 0 })).toBe(false)
  })

  it("should compute the breadth-first traversal order and path", () => {
    const result = graphTraversalResult(DEFAULT_GRAPH_TRAVERSAL_SCENE)

    expect(result.order).toEqual([0, 1, 3, 2, 4, 5])
    expect(result.path).toEqual([0, 1, 2, 5])
    expect(graphNodeLabel(result.path[0])).toBe("A")
  })

  it("should reveal traversal order and visible path", () => {
    const scene = { ...DEFAULT_GRAPH_TRAVERSAL_SCENE, revealSteps: 4 }

    expect(revealedTraversalOrder(scene)).toEqual([0, 1, 3, 2])
    expect(traversalPath(scene)).toEqual([])
  })

  it("should summarize the traversal scene", () => {
    expect(graphTraversalSummary(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toContain(
      "breadth-first traversal reaches F",
    )
    expect(graphTraversalSummary(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toContain("A -> B -> C -> F")
  })
})
