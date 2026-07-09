import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE } from "./webgpu-indexed-polygon.model"
import {
  buildWebGpuIndexedPolygonIndexData,
  buildWebGpuIndexedPolygonVertexData,
  createWebGpuIndexedPolygonSceneResources,
  webGpuIndexedPolygonIndexCount,
  webGpuIndexedPolygonVertexCount,
} from "./webgpu-indexed-polygon.scene"

describe("webgpu-indexed-polygon.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds a pipeline plus vertex and index buffers for the indexed polygon scene", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuIndexedPolygonSceneResources(runtime)

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.indexBuffer).toBe(runtime.indexBuffer)
  })

  it("builds indexed polygon vertex and index data", () => {
    const vertexData = buildWebGpuIndexedPolygonVertexData(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
    const indexData = buildWebGpuIndexedPolygonIndexData(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)

    expect(webGpuIndexedPolygonVertexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(7)
    expect(webGpuIndexedPolygonIndexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(18)
    expect(vertexData).toHaveLength(42)
    expect(indexData).toHaveLength(18)
    expect(vertexData[0]).toBeCloseTo(0, 3)
    expect(vertexData[1]).toBeCloseTo(0, 3)
    expect(vertexData[6]).toBeCloseTo(0.66, 2)
    expect(indexData.slice(0, 6)).toEqual(new Uint16Array([0, 1, 2, 0, 2, 3]))
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly indexBuffer: GPUBuffer
  readonly device: {
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }
} {
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = { kind: "vertex" } as GPUBuffer
  const indexBuffer = { kind: "index" } as GPUBuffer
  const device = {
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(indexBuffer),
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
    indexBuffer,
    device,
    format: "bgra8unorm",
  }
}
