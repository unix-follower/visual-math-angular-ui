import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE } from "./webgpu-indirect-indexed-polygon.model"
import {
  releaseWebGpuIndirectIndexedPolygonResources,
  renderWebGpuIndirectIndexedPolygonScene,
} from "./webgpu-indirect-indexed-polygon.renderer"

describe("webgpu-indirect-indexed-polygon.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a drawIndexedIndirect call from an encoded draw buffer", () => {
    const harness = createWebGpuRendererHarness(3)

    renderWebGpuIndirectIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(3)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(harness.pass.setIndexBuffer).toHaveBeenCalledTimes(1)
    expect(harness.pass.drawIndexedIndirect).toHaveBeenCalledWith(harness.vertexBuffers[2], 0)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached indirect indexed resources and only rewrites payload buffers later", () => {
    const harness = createWebGpuRendererHarness(3)

    renderWebGpuIndirectIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    renderWebGpuIndirectIndexedPolygonScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
      sides: 8,
      rotation: -24,
      coverage: 1,
    })

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(3)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached indirect indexed resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(6)

    renderWebGpuIndirectIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    expect(releaseWebGpuIndirectIndexedPolygonResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[2]).toHaveBeenCalledTimes(1)

    renderWebGpuIndirectIndexedPolygonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(6)
  })
})
