import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE } from "./webgpu-indirect-ribbon.model"
import {
  releaseWebGpuIndirectRibbonResources,
  renderWebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.renderer"

describe("webgpu-indirect-ribbon.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits an indirect draw from an encoded draw buffer", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuIndirectRibbonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(4)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledTimes(1)
    expect(harness.pass.drawIndirect).toHaveBeenCalledWith(harness.vertexBuffers[1], 0)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached indirect resources and only rewrites vertex and draw data on later renders", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuIndirectRibbonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )
    renderWebGpuIndirectRibbonScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
      span: 0.24,
      taper: 0.74,
      echo: 0.82,
    })

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached indirect resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuIndirectRibbonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )

    expect(releaseWebGpuIndirectRibbonResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuIndirectRibbonScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
  })
})
