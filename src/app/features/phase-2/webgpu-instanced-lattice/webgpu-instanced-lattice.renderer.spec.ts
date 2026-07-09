import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE } from "./webgpu-instanced-lattice.model"
import {
  releaseWebGpuInstancedLatticeResources,
  renderWebGpuInstancedLatticeScene,
} from "./webgpu-instanced-lattice.renderer"

describe("webgpu-instanced-lattice.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("draws a shared mesh across multiple instances", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuInstancedLatticeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(harness.pass.setVertexBuffer).toHaveBeenNthCalledWith(1, 0, harness.vertexBuffers[0])
    expect(harness.pass.setVertexBuffer).toHaveBeenNthCalledWith(2, 1, harness.vertexBuffers[1])
    expect(harness.pass.draw).toHaveBeenCalledWith(3, 5)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached instancing resources and only rewrites instance data on later renders", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuInstancedLatticeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )
    renderWebGpuInstancedLatticeScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
      spacing: 0.82,
      scale: 0.28,
      tilt: 0.62,
    })

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(4)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached instancing resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuInstancedLatticeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )

    expect(releaseWebGpuInstancedLatticeResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuInstancedLatticeScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )

    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
  })
})
