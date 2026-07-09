import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE } from "./webgpu-pulse-diamond.model"
import {
  buildWebGpuPulseDiamondVertexData,
  createWebGpuPulseDiamondSceneResources,
  webGpuPulseDiamondVertexCount,
} from "./webgpu-pulse-diamond.scene"

describe("webgpu-pulse-diamond.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline and vertex buffer for the pulse diamond scene", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuPulseDiamondSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("builds animated vertex data for the pulse diamond draw", () => {
    const vertexData = buildWebGpuPulseDiamondVertexData(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)

    expect(webGpuPulseDiamondVertexCount()).toBe(6)
    expect(vertexData).toHaveLength(36)
    expect(vertexData[0]).toBeCloseTo(0.031, 3)
    expect(vertexData[1]).toBeCloseTo(0.72, 3)
    expect(vertexData[30]).toBeCloseTo(-0.025, 3)
    expect(vertexData[31]).toBeCloseTo(-0.72, 3)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly device: {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }
} {
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = {} as GPUBuffer
  const device = {
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValue(vertexBuffer),
  } as unknown as GPUDevice & {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    pipeline,
    vertexBuffer,
    device,
    format: "bgra8unorm",
  }
}
