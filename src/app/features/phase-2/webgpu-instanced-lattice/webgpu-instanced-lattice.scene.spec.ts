import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE } from "./webgpu-instanced-lattice.model"
import {
  buildWebGpuInstancedLatticeInstanceData,
  createWebGpuInstancedLatticeSceneResources,
  webGpuInstancedLatticeInstanceCount,
  webGpuInstancedLatticeMeshVertexCount,
} from "./webgpu-instanced-lattice.scene"

describe("webgpu-instanced-lattice.scene", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("builds one pipeline and two vertex buffers for mesh and instance data", () => {
    const runtime = createRuntimeHarness()

    const resources = createWebGpuInstancedLatticeSceneResources(
      runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )

    expect(runtime.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(runtime.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.pipeline).toBe(runtime.pipeline)
    expect(resources.meshBuffer).toBe(runtime.meshBuffer)
    expect(resources.instanceBuffer).toBe(runtime.instanceBuffer)
  })

  it("builds per-instance lattice data", () => {
    const data = buildWebGpuInstancedLatticeInstanceData(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)

    expect(webGpuInstancedLatticeMeshVertexCount()).toBe(3)
    expect(webGpuInstancedLatticeInstanceCount()).toBe(5)
    expect(data).toHaveLength(40)
    expect(data[0]).toBeCloseTo(-0.6112, 4)
    expect(data[1]).toBeCloseTo(0.3072, 4)
    expect(data[2]).toBeCloseTo(0.349856, 4)
    expect(data[39]).toBeCloseTo(1, 4)
  })
})

function createRuntimeHarness(): WebGpuCanvasRuntime & {
  readonly pipeline: GPURenderPipeline
  readonly meshBuffer: GPUBuffer
  readonly instanceBuffer: GPUBuffer
  readonly device: {
    readonly queue: { readonly writeBuffer: ReturnType<typeof vi.fn> }
    readonly createShaderModule: ReturnType<typeof vi.fn>
    readonly createRenderPipeline: ReturnType<typeof vi.fn>
    readonly createBuffer: ReturnType<typeof vi.fn>
  }
} {
  const pipeline = { getBindGroupLayout: vi.fn() } as unknown as GPURenderPipeline
  const meshBuffer = { kind: "mesh-buffer" } as GPUBuffer
  const instanceBuffer = { kind: "instance-buffer" } as GPUBuffer
  const queue = { writeBuffer: vi.fn() }
  const device = {
    queue,
    createShaderModule: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createBuffer: vi.fn().mockReturnValueOnce(meshBuffer).mockReturnValueOnce(instanceBuffer),
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
    meshBuffer,
    instanceBuffer,
  }
}
