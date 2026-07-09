import {
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_DUAL_PASS_SCENE } from "./webgpu-dual-pass.model"
import {
  buildWebGpuDualPassGeometryData,
  createWebGpuDualPassSceneResources,
  webGpuDualPassGeometryVertexCount,
  webGpuDualPassOffscreenSize,
  webGpuDualPassQuadVertexCount,
} from "./webgpu-dual-pass.scene"

describe("webgpu-dual-pass.scene", () => {
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

  it("builds two pipelines, two vertex buffers, an intermediate texture, and a bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuDualPassSceneResources(runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.createTexture).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.firstPipeline).toBe(runtime.firstPipeline)
    expect(resources.secondPipeline).toBe(runtime.secondPipeline)
    expect(resources.geometryBuffer).toBe(runtime.geometryBuffer)
    expect(resources.quadBuffer).toBe(runtime.quadBuffer)
    expect(resources.intermediateTexture).toBe(runtime.texture)
  })

  it("builds first-pass geometry data", () => {
    const geometryData = buildWebGpuDualPassGeometryData(DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(webGpuDualPassGeometryVertexCount()).toBe(6)
    expect(webGpuDualPassQuadVertexCount()).toBe(6)
    expect(webGpuDualPassOffscreenSize()).toBe(256)
    expect(geometryData).toHaveLength(36)
    expect(geometryData[0]).toBeCloseTo(-0.6976, 4)
    expect(geometryData[2]).toBeCloseTo(0.5336, 4)
    expect(geometryData[33]).toBeCloseTo(0.4308, 4)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly firstPipeline: GPURenderPipeline
  readonly secondPipeline: GPURenderPipeline
  readonly geometryBuffer: GPUBuffer
  readonly quadBuffer: GPUBuffer
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
  const firstBindGroupLayout = {} as GPUBindGroupLayout
  const secondBindGroupLayout = {} as GPUBindGroupLayout
  const firstPipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(firstBindGroupLayout),
  } as unknown as GPURenderPipeline
  const secondPipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(secondBindGroupLayout),
  } as unknown as GPURenderPipeline
  const geometryBuffer = { kind: "geometry" } as GPUBuffer
  const quadBuffer = { kind: "quad" } as GPUBuffer
  const texture = {
    kind: "texture",
    createView: vi.fn().mockReturnValue({}),
  } as unknown as GPUTexture
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const queue = { writeBuffer: vi.fn() }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi
      .fn()
      .mockReturnValueOnce(firstPipeline)
      .mockReturnValueOnce(secondPipeline),
    createBuffer: vi.fn().mockReturnValueOnce(geometryBuffer).mockReturnValueOnce(quadBuffer),
    createTexture: vi.fn().mockReturnValue(texture),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
  } as unknown as GPUDevice & {
    readonly queue: { readonly writeBuffer: ReturnType<typeof vi.fn> }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createTexture: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    firstPipeline,
    secondPipeline,
    geometryBuffer,
    quadBuffer,
    texture,
    bindGroup,
    device,
    format: "bgra8unorm",
  }
}
