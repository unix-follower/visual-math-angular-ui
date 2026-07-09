import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE } from "./webgpu-gradient-quad.model"
import {
  buildWebGpuGradientQuadVertexData,
  createWebGpuGradientQuadSceneResources,
  webGpuGradientQuadVertexCount,
} from "./webgpu-gradient-quad.scene"

describe("webgpu-gradient-quad.scene", () => {
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

  it("builds a pipeline and vertex buffer for the gradient quad scene", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuGradientQuadSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(1)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("builds vertex data for the quad draw", () => {
    const vertexData = buildWebGpuGradientQuadVertexData(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)

    expect(webGpuGradientQuadVertexCount()).toBe(6)
    expect(vertexData).toHaveLength(36)
    expect(vertexData[0]).toBeCloseTo(-0.744, 3)
    expect(vertexData[1]).toBeCloseTo(0.78, 3)
    expect(vertexData[30]).toBeCloseTo(0.696, 3)
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
