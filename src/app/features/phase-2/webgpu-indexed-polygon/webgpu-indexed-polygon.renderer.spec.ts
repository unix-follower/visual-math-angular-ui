import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE } from "./webgpu-indexed-polygon.model"
import {
  releaseWebGpuIndexedPolygonResources,
  renderWebGpuIndexedPolygonScene,
} from "./webgpu-indexed-polygon.renderer"

describe("webgpu-indexed-polygon.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits an indexed draw call with vertex and index buffers", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.setIndexBuffer).toHaveBeenCalledWith(harness.vertexBuffers[1], "uint16")
    expect(harness.pass.drawIndexed).toHaveBeenCalledWith(18)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses indexed polygon resources across later renders for the same runtime", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
    )
    renderWebGpuIndexedPolygonScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
      sides: 8,
      radius: 0.52,
      rotation: -20,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(4)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases indexed polygon resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
    )

    expect(releaseWebGpuIndexedPolygonResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
  })
})
