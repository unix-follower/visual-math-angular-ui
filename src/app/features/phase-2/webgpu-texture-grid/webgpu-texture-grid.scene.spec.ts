import {
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_TEXTURE_GRID_SCENE } from "./webgpu-texture-grid.model"
import {
  buildWebGpuTextureGridData,
  createWebGpuTextureGridSceneResources,
  webGpuTextureGridSize,
  webGpuTextureGridVertexCount,
} from "./webgpu-texture-grid.scene"

describe("webgpu-texture-grid.scene", () => {
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

  it("builds a pipeline, vertex buffer, texture, and bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuTextureGridSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(runtime.device.createTexture).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.texture).toBe(runtime.texture)
    expect(resources.bindGroup).toBe(runtime.bindGroup)
  })

  it("builds texture data for the grid pattern", () => {
    const textureData = buildWebGpuTextureGridData(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    expect(webGpuTextureGridSize()).toBe(4)
    expect(webGpuTextureGridVertexCount()).toBe(6)
    expect(textureData).toHaveLength(64)
    expect(textureData[0]).toBe(39)
    expect(textureData[1]).toBe(152)
    expect(textureData[4]).toBe(115)
    expect(textureData[5]).toBe(11)
    expect(textureData[63]).toBe(255)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly texture: GPUTexture
  readonly bindGroup: GPUBindGroup
  readonly device: {
    readonly queue: {
      readonly writeBuffer: ReturnType<typeof vi.fn>
    }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createTexture: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }
} {
  const bindGroupLayout = {} as GPUBindGroupLayout
  const pipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { kind: "vertex" } as GPUBuffer
  const texture = {
    kind: "texture",
    createView: vi.fn().mockReturnValue({}),
  } as unknown as GPUTexture
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const queue = {
    writeBuffer: vi.fn(),
  }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValue(vertexBuffer),
    createTexture: vi.fn().mockReturnValue(texture),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
  } as unknown as GPUDevice & {
    readonly queue: {
      readonly writeBuffer: ReturnType<typeof vi.fn>
    }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createTexture: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    pipeline,
    vertexBuffer,
    texture,
    bindGroup,
    device,
    format: "bgra8unorm",
  }
}
