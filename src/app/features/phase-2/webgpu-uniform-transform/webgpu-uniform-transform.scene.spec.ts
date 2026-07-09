import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE } from "./webgpu-uniform-transform.model"
import {
  buildWebGpuUniformTransformUniformData,
  createWebGpuUniformTransformSceneResources,
  webGpuUniformTransformVertexCount,
} from "./webgpu-uniform-transform.scene"

describe("webgpu-uniform-transform.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline, vertex buffer, uniform buffer, and bind group", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuUniformTransformSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.uniformBuffer).toBe(runtime.uniformBuffer)
    expect(resources.bindGroup).toBe(runtime.bindGroup)
  })

  it("builds uniform data for the transform shader", () => {
    const uniformData = buildWebGpuUniformTransformUniformData(
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )

    expect(webGpuUniformTransformVertexCount()).toBe(6)
    expect(uniformData).toHaveLength(8)
    expect(uniformData[0]).toBeCloseTo(0.78, 2)
    expect(uniformData[1]).toBeCloseTo(0.314, 3)
    expect(uniformData[2]).toBeCloseTo(0.08, 2)
    expect(uniformData[7]).toBeCloseTo(0.72, 2)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly uniformBuffer: GPUBuffer
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
  const uniformBuffer = { kind: "uniform" } as GPUBuffer
  const bindGroup = { kind: "bind-group" } as GPUBindGroup
  const queue = {
    writeBuffer: vi.fn(),
  }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(uniformBuffer),
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
    uniformBuffer,
    bindGroup,
    device,
    format: "bgra8unorm",
  }
}
