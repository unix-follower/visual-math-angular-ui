import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE } from "./webgpu-pulse-diamond.model"
import {
  releaseWebGpuPulseDiamondResources,
  renderWebGpuPulseDiamondScene,
} from "./webgpu-pulse-diamond.renderer"

describe("webgpu-pulse-diamond.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits an animated draw call with a vertex buffer and render pipeline", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuPulseDiamondScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
      0.25,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses animated resources across later renders for the same runtime", () => {
    const harness = createWebGpuRendererHarness()

    renderWebGpuPulseDiamondScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
      0.1,
    )
    renderWebGpuPulseDiamondScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
      0.6,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases animated resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuPulseDiamondScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
      0.1,
    )

    expect(releaseWebGpuPulseDiamondResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)

    renderWebGpuPulseDiamondScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
      0.1,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
  })
})
