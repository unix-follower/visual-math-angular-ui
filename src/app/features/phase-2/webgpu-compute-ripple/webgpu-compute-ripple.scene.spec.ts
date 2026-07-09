import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE } from "./webgpu-compute-ripple.model"
import {
  buildWebGpuComputeRippleUniformData,
  createWebGpuComputeRippleSceneResources,
  webGpuComputeRippleVertexCount,
} from "./webgpu-compute-ripple.scene"

describe("webgpu-compute-ripple.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a compute pipeline, render pipeline, two buffers, and a bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuComputeRippleSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(runtime.device.createComputePipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(resources.computePipeline).toBe(runtime.computePipeline)
    expect(resources.renderPipeline).toBe(runtime.renderPipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.uniformBuffer).toBe(runtime.uniformBuffer)
    expect(resources.bindGroup).toBe(runtime.bindGroup)
  })

  it("builds compute uniform data", () => {
    const data = buildWebGpuComputeRippleUniformData(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)

    expect(webGpuComputeRippleVertexCount()).toBe(6)
    expect(data).toHaveLength(8)
    expect(data[0]).toBeCloseTo(0.56, 3)
    expect(data[1]).toBeCloseTo(0.62, 3)
    expect(data[6]).toBeCloseTo(1, 3)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly computePipeline: GPUComputePipeline
  readonly renderPipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly uniformBuffer: GPUBuffer
  readonly bindGroup: GPUBindGroup
  readonly device: {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createComputePipeline: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }
} {
  const bindGroupLayout = {} as GPUBindGroupLayout
  const computePipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPUComputePipeline
  const renderPipeline = {
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { kind: "vertex" } as GPUBuffer
  const uniformBuffer = { kind: "uniform" } as GPUBuffer
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const device = {
    createShaderModule: vi.fn().mockReturnValue({}),
    createComputePipeline: vi.fn().mockReturnValue(computePipeline),
    createRenderPipeline: vi.fn().mockReturnValue(renderPipeline),
    createBuffer: vi.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(uniformBuffer),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
    queue: { writeBuffer: vi.fn(), submit: vi.fn(), writeTexture: vi.fn() },
  } as unknown as GPUDevice & {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createComputePipeline: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
    readonly createBindGroup: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    device,
    format: "bgra8unorm",
    computePipeline,
    renderPipeline,
    vertexBuffer,
    uniformBuffer,
    bindGroup,
  }
}
