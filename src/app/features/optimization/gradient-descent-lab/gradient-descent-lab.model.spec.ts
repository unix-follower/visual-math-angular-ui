import {
  gradientDescentLabMetrics,
  gradientDescentLabSummary,
  objectiveGradient,
  objectiveValue,
  simulateGradientDescent,
  type GradientDescentLabScene,
} from "./gradient-descent-lab.model"

describe("gradient-descent-lab.model", () => {
  it("evaluates the quadratic objective and gradient", () => {
    const scene: GradientDescentLabScene = {
      startX: 3,
      startY: -2,
      learningRate: 0.1,
      stepCount: 5,
      anisotropy: 1.5,
      showPath: true,
      showContours: true,
    }

    expect(objectiveValue(scene, 1, 2)).toBeCloseTo(4.6, 6)
    expect(objectiveGradient(scene, 1, 2)).toEqual({ x: 3.7, y: 2.75 })
  })

  it("simulates a descent path with stepCount + 1 points", () => {
    const scene: GradientDescentLabScene = {
      startX: 3,
      startY: -2,
      learningRate: 0.1,
      stepCount: 4,
      anisotropy: 1.5,
      showPath: true,
      showContours: true,
    }

    expect(simulateGradientDescent(scene)).toHaveLength(5)
  })

  it("improves the objective for a stable learning rate", () => {
    const scene: GradientDescentLabScene = {
      startX: 3,
      startY: -2,
      learningRate: 0.12,
      stepCount: 6,
      anisotropy: 1.5,
      showPath: true,
      showContours: true,
    }

    const metrics = gradientDescentLabMetrics(scene)
    expect(metrics.improvement).toBeGreaterThan(0)
    expect(metrics.finalPoint.value).toBeLessThan(metrics.path[0]?.value ?? Infinity)
  })

  it("summarizes the descent result", () => {
    const scene: GradientDescentLabScene = {
      startX: 2,
      startY: 1,
      learningRate: 0.1,
      stepCount: 3,
      anisotropy: 1.2,
      showPath: true,
      showContours: true,
    }

    expect(gradientDescentLabSummary(scene)).toContain("gradient steps")
    expect(gradientDescentLabSummary(scene)).toContain("objective")
  })
})
