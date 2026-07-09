import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE } from "./webgpu-indirect-ribbon.model"
import {
  buildWebGpuIndirectRibbonDrawData,
  buildWebGpuIndirectRibbonVertexData,
  createWebGpuIndirectRibbonSceneResources,
  webGpuIndirectRibbonVertexCount,
} from "./webgpu-indirect-ribbon.scene"

describe("webgpu-indirect-ribbon.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline, one vertex buffer, one indirect buffer, and uploads both", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuIndirectRibbonSceneResources(
      runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.indirectBuffer).toBe(runtime.indirectBuffer)
  })

  it("builds ribbon vertex and indirect draw data", () => {
    const vertexData = buildWebGpuIndirectRibbonVertexData(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
    const drawData = buildWebGpuIndirectRibbonDrawData(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)

    expect(webGpuIndirectRibbonVertexCount()).toBe(6)
    expect(vertexData).toHaveLength(36)
    expect(vertexData[0]).toBeCloseTo(-0.5152, 4)
    expect(vertexData[1]).toBeCloseTo(0.2212, 4)
    expect(drawData).toEqual(new Uint32Array([6, 2, 0, 0]))
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly indirectBuffer: GPUBuffer
  readonly device: {
    readonly queue: { readonly writeBuffer: ReturnType<typeof vi.fn> }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }
} {
  const pipeline = { getBindGroupLayout: vi.fn() } as unknown as GPURenderPipeline
  const vertexBuffer = { kind: "vertex-buffer" } as GPUBuffer
  const indirectBuffer = { kind: "indirect-buffer" } as GPUBuffer
  const queue = { writeBuffer: vi.fn() }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(indirectBuffer),
  } as unknown as GPUDevice & {
    readonly queue: { readonly writeBuffer: ReturnType<typeof vi.fn> }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }

  return {
    adapter: {} as GPUAdapter,
    context: {} as GPUCanvasContext,
    device,
    format: "bgra8unorm",
    pipeline,
    vertexBuffer,
    indirectBuffer,
  }
}
