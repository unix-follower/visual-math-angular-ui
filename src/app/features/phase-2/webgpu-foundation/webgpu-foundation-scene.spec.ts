import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_FOUNDATION_SCENE } from "./webgpu-foundation.model"
import {
  buildWebGpuFoundationVertexData,
  createWebGpuFoundationSceneResources,
  webGpuFoundationVertexCount,
} from "./webgpu-foundation-scene"

describe("webgpu-foundation.scene", () => {
  const originalGpuBufferUsage = (
    globalThis as typeof globalThis & {
      GPUBufferUsage?: { readonly VERTEX: number; readonly COPY_DST: number }
    }
  ).GPUBufferUsage

  beforeEach(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: {
        VERTEX: 1,
        COPY_DST: 2,
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: originalGpuBufferUsage,
    })
  })

  it("builds a pipeline and vertex buffer for the foundation scene", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuFoundationSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("builds vertex data for all foundation vertices", () => {
    const vertexData = buildWebGpuFoundationVertexData(DEFAULT_WEBGPU_FOUNDATION_SCENE)

    expect(webGpuFoundationVertexCount()).toBe(3)
    expect(vertexData).toHaveLength(18)
    expect(vertexData[1]).toBeCloseTo(0.434, 3)
    expect(vertexData[6]).toBeCloseTo(-0.4836, 3)
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
