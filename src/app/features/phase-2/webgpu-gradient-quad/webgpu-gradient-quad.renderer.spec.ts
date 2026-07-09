import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE } from "./webgpu-gradient-quad.model"
import {
  releaseWebGpuGradientQuadResources,
  renderWebGpuGradientQuadScene,
} from "./webgpu-gradient-quad.renderer"

describe("webgpu-gradient-quad.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a quad draw with cached pipeline resources", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuGradientQuadScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
    expect(harness.canvas.width).toBe(720)
    expect(harness.canvas.height).toBe(480)
  })

  it("reuses quad resources across later renders for the same runtime", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuGradientQuadScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
    )
    renderWebGpuGradientQuadScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
      inset: 0.18,
      tilt: -0.2,
      intensity: 0.44,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached quad resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuGradientQuadScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
    )

    expect(releaseWebGpuGradientQuadResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)

    renderWebGpuGradientQuadScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
  })
})
