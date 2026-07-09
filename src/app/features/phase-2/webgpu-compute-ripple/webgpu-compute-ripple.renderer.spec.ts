import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"

import { DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE } from "./webgpu-compute-ripple.model"
import {
  releaseWebGpuComputeRippleResources,
  renderWebGpuComputeRippleScene,
} from "./webgpu-compute-ripple.renderer"

describe("webgpu-compute-ripple.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a compute pass before drawing the computed vertices", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuComputeRippleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
    )

    expect(harness.device.createComputePipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(harness.computePass.setPipeline).toHaveBeenCalledTimes(1)
    expect(harness.computePass.setBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.computePass.dispatchWorkgroups).toHaveBeenCalledWith(1)
    expect(harness.pass.setPipeline).toHaveBeenCalledTimes(1)
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses cached compute resources on later renders", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuComputeRippleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
    )
    renderWebGpuComputeRippleScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
      amplitude: 0.24,
      frequency: 0.84,
      drift: 0.72,
    })

    expect(harness.device.createComputePipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases cached compute resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuComputeRippleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
    )

    expect(releaseWebGpuComputeRippleResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuComputeRippleScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
    )

    expect(harness.device.createComputePipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(2)
  })
})
