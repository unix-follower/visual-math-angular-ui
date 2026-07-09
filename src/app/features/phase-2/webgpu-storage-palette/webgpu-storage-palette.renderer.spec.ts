import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE } from "./webgpu-storage-palette.model"
import {
  releaseWebGpuStoragePaletteResources,
  renderWebGpuStoragePaletteScene,
} from "./webgpu-storage-palette.renderer"

describe("webgpu-storage-palette.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a draw call with a storage-buffer palette and static vertex mesh", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuStoragePaletteScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setBindGroup).toHaveBeenCalledWith(0, harness.bindGroup)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached palette resources across later renders for the same runtime", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuStoragePaletteScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
    )
    renderWebGpuStoragePaletteScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
      warmth: 0.34,
      contrast: 0.92,
      balance: -0.28,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached palette resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuStoragePaletteScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
    )

    expect(releaseWebGpuStoragePaletteResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuStoragePaletteScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(2)
  })
})
