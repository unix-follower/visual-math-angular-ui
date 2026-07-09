import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE } from "./webgpu-indirect-indexed-polygon.model"
import {
  buildWebGpuIndirectIndexedPolygonDrawData,
  buildWebGpuIndirectIndexedPolygonIndexData,
  buildWebGpuIndirectIndexedPolygonVertexData,
  createWebGpuIndirectIndexedPolygonSceneResources,
} from "./webgpu-indirect-indexed-polygon.scene"

describe("webgpu-indirect-indexed-polygon.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline, one vertex buffer, one index buffer, one indirect buffer, and uploads on render", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuIndirectIndexedPolygonSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(3)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.indexBuffer).toBe(runtime.indexBuffer)
    expect(resources.indirectBuffer).toBe(runtime.indirectBuffer)
  })

  it("builds indexed geometry and an encoded indirect draw payload", () => {
    const vertexData = buildWebGpuIndirectIndexedPolygonVertexData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    const indexData = buildWebGpuIndirectIndexedPolygonIndexData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    const drawData = buildWebGpuIndirectIndexedPolygonDrawData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    expect(vertexData).toHaveLength(48)
    expect(vertexData[0]).toBe(0)
    expect(vertexData[1]).toBe(0)
    expect(indexData).toEqual(
      new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7, 0, 7, 1]),
    )
    expect(drawData).toEqual(new Uint32Array([15, 1, 0, 0, 0]))
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly indexBuffer: GPUBuffer
  readonly indirectBuffer: GPUBuffer
  readonly device: {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }
} {
  const pipeline = { getBindGroupLayout: vi.fn() } as unknown as GPURenderPipeline
  const vertexBuffer = { kind: "vertex-buffer" } as GPUBuffer
  const indexBuffer = { kind: "index-buffer" } as GPUBuffer
  const indirectBuffer = { kind: "indirect-buffer" } as GPUBuffer
  const device = {
    queue: { writeBuffer: vi.fn() },
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi
      .fn()
      .mockReturnValueOnce(vertexBuffer)
      .mockReturnValueOnce(indexBuffer)
      .mockReturnValueOnce(indirectBuffer),
  } as unknown as GPUDevice & {
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
    indexBuffer,
    indirectBuffer,
  }
}
