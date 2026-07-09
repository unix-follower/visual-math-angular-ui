import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_DUAL_PASS_SCENE } from "./webgpu-dual-pass.model"
import {
  releaseWebGpuDualPassResources,
  renderWebGpuDualPassScene,
} from "./webgpu-dual-pass.renderer"

describe("webgpu-dual-pass.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>
  let gpuTextureUsageMock: ReturnType<typeof installMockGpuTextureUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
    gpuTextureUsageMock = installMockGpuTextureUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
    gpuTextureUsageMock.restore()
  })

  it("submits two passes that render offscreen then composite to the canvas", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(1)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(harness.device.createCommandEncoder).toHaveBeenCalledTimes(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledTimes(2)
    expect(harness.pass.setBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.pass.draw).toHaveBeenNthCalledWith(1, 6)
    expect(harness.pass.draw).toHaveBeenNthCalledWith(2, 6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached multipass resources and only rewrites geometry on later renders", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)
    renderWebGpuDualPassScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_DUAL_PASS_SCENE,
      glow: 0.22,
      skew: 0.84,
      mix: 0.3,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(1)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(4)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached multipass resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(releaseWebGpuDualPassResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)
    expect(harness.textureDestroy).toHaveBeenCalledTimes(1)

    renderWebGpuDualPassScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(4)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(4)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(2)
  })
})
