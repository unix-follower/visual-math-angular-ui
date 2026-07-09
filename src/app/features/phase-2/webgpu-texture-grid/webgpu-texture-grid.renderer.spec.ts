import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_TEXTURE_GRID_SCENE } from "./webgpu-texture-grid.model"
import {
  releaseWebGpuTextureGridResources,
  renderWebGpuTextureGridScene,
} from "./webgpu-texture-grid.renderer"

describe("webgpu-texture-grid.renderer", () => {
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

  it("submits a draw call that uploads texture data and binds a textured quad", () => {
    const harness = createWebGpuRendererHarness(1)

    renderWebGpuTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(1)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeTexture).toHaveBeenCalledTimes(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setBindGroup).toHaveBeenCalledWith(0, harness.bindGroup)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached texture resources and only reuploads pixels on later renders", () => {
    const harness = createWebGpuRendererHarness(1)

    renderWebGpuTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)
    renderWebGpuTextureGridScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
      frequency: 0.82,
      contrast: 0.28,
      blend: 0.74,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(1)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeTexture).toHaveBeenCalledTimes(2)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached texture resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    expect(releaseWebGpuTextureGridResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.textureDestroy).toHaveBeenCalledTimes(1)

    renderWebGpuTextureGridScene(harness.canvas, harness.runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createTexture).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(2)
  })
})
