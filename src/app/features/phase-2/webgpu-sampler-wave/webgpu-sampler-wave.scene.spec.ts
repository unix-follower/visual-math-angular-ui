import {
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE } from "./webgpu-sampler-wave.model"
import {
  buildWebGpuSamplerWaveData,
  createWebGpuSamplerWaveSceneResources,
  webGpuSamplerWaveTextureSize,
  webGpuSamplerWaveVertexCount,
} from "./webgpu-sampler-wave.scene"

describe("webgpu-sampler-wave.scene", () => {
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

  it("builds a pipeline, vertex buffer, texture, sampler, and bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuSamplerWaveSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(runtime.device.createTexture).toHaveBeenCalledTimes(1)
    expect(runtime.device.createSampler).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.texture).toBe(runtime.texture)
    expect(resources.sampler).toBe(runtime.sampler)
    expect(resources.bindGroup).toBe(runtime.bindGroup)
  })

  it("builds texture data for the sampler wave surface", () => {
    const textureData = buildWebGpuSamplerWaveData(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)

    expect(webGpuSamplerWaveTextureSize()).toBe(8)
    expect(webGpuSamplerWaveVertexCount()).toBe(6)
    expect(textureData).toHaveLength(256)
    expect(textureData[0]).toBe(17)
    expect(textureData[1]).toBe(134)
    expect(textureData[2]).toBe(85)
    expect(textureData[255]).toBe(255)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly texture: GPUTexture
  readonly sampler: GPUSampler
  readonly bindGroup: GPUBindGroup
  readonly device: {
    readonly queue: {
      readonly writeBuffer: ReturnType<typeof vi.fn>
    }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createTexture: ReturnType<typeof vi.fn>
    readonly createSampler: ReturnType<typeof vi.fn>
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
  const sampler = { kind: "sampler" } as unknown as GPUSampler
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const queue = { writeBuffer: vi.fn() }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValue(vertexBuffer),
    createTexture: vi.fn().mockReturnValue(texture),
    createSampler: vi.fn().mockReturnValue(sampler),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
  } as unknown as GPUDevice & {
    readonly queue: { readonly writeBuffer: ReturnType<typeof vi.fn> }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createTexture: ReturnType<typeof vi.fn>
    readonly createSampler: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    pipeline,
    vertexBuffer,
    texture,
    sampler,
    bindGroup,
    device,
    format: "bgra8unorm",
  }
}
