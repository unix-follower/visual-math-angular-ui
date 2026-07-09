import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_FOUNDATION_SCENE } from "./webgpu-foundation.model"
import {
  releaseWebGpuFoundationResources,
  renderWebGpuFoundationScene,
} from "./webgpu-foundation.renderer"

describe("webgpu-foundation.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a draw call with a vertex buffer and render pipeline", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(3)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
    expect(harness.canvas.width).toBe(720)
    expect(harness.canvas.height).toBe(480)

    const payload = harness.queue.writeBuffer.mock.calls[0]?.[2]
    expect(payload).toBeInstanceOf(ArrayBuffer)
    expect((payload as ArrayBuffer).byteLength).toBeGreaterThan(0)
  })

  it("reuses cached pipeline resources across later renders for the same runtime", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)
    renderWebGpuFoundationScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_FOUNDATION_SCENE,
      triangleScale: 0.8,
      accent: 0.33,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)

    expect(releaseWebGpuFoundationResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)

    renderWebGpuFoundationScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
  })
})
