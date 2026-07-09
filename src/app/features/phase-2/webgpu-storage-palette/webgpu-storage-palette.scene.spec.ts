import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE } from "./webgpu-storage-palette.model"
import {
  buildWebGpuStoragePaletteData,
  createWebGpuStoragePaletteSceneResources,
  webGpuStoragePaletteVertexCount,
} from "./webgpu-storage-palette.scene"

describe("webgpu-storage-palette.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline, vertex buffer, storage buffer, and bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuStoragePaletteSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.storageBuffer).toBe(runtime.storageBuffer)
    expect(resources.bindGroup).toBe(runtime.bindGroup)
  })

  it("builds storage palette data for the mesh colors", () => {
    const paletteData = buildWebGpuStoragePaletteData(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)

    expect(webGpuStoragePaletteVertexCount()).toBe(6)
    expect(paletteData).toHaveLength(24)
    expect(paletteData[0]).toBeCloseTo(0.547, 3)
    expect(paletteData[1]).toBeCloseTo(0.404, 3)
    expect(paletteData[20]).toBeCloseTo(0.651, 3)
    expect(paletteData[21]).toBeCloseTo(0.409, 3)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly storageBuffer: GPUBuffer
  readonly bindGroup: GPUBindGroup
  readonly device: {
    readonly queue: {
      readonly writeBuffer: ReturnType<typeof vi.fn>
    }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }
} {
  const bindGroupLayout = {} as GPUBindGroupLayout
  const pipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { kind: "vertex" } as GPUBuffer
  const storageBuffer = { kind: "storage" } as GPUBuffer
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const queue = {
    writeBuffer: vi.fn(),
  }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(storageBuffer),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
  } as unknown as GPUDevice & {
    readonly queue: {
      readonly writeBuffer: ReturnType<typeof vi.fn>
    }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    pipeline,
    vertexBuffer,
    storageBuffer,
    bindGroup,
    device,
    format: "bgra8unorm",
  }
}
