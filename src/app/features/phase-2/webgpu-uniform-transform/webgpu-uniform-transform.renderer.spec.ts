import {
  createWebGpuRendererHarness,
  installMockGpuBufferUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE } from "./webgpu-uniform-transform.model"
import {
  releaseWebGpuUniformTransformResources,
  renderWebGpuUniformTransformScene,
} from "./webgpu-uniform-transform.renderer"

describe("webgpu-uniform-transform.renderer", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(() => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("submits a draw call that binds a uniform buffer and a static vertex buffer", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(harness.pass.setPipeline).toHaveBeenCalledWith(harness.pipeline)
    expect(harness.pass.setBindGroup).toHaveBeenCalledWith(0, harness.bindGroup)
    expect(harness.pass.setVertexBuffer).toHaveBeenCalledWith(0, harness.vertexBuffers[0])
    expect(harness.pass.draw).toHaveBeenCalledWith(6)
    expect(harness.queue.submit).toHaveBeenCalledTimes(1)
  })

  it("reuses the static mesh resources and only rewrites uniforms on later renders", () => {
    const harness = createWebGpuRendererHarness(2)

    renderWebGpuUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )
    renderWebGpuUniformTransformScene(harness.canvas, harness.runtime, {
      ...DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
      scale: 0.92,
      rotation: -24,
      offsetX: -0.12,
    })

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(1)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(1)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(harness.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(harness.queue.submit).toHaveBeenCalledTimes(2)
  })

  it("releases the cached uniform-transform resources so the next render recreates them", () => {
    const harness = createWebGpuRendererHarness(4)

    renderWebGpuUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )

    expect(releaseWebGpuUniformTransformResources(harness.runtime)).toBe(true)
    expect(harness.vertexBufferDestroyers[0]).toHaveBeenCalledTimes(1)
    expect(harness.vertexBufferDestroyers[1]).toHaveBeenCalledTimes(1)

    renderWebGpuUniformTransformScene(
      harness.canvas,
      harness.runtime,
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )

    expect(harness.device.createShaderModule).toHaveBeenCalledTimes(2)
    expect(harness.device.createRenderPipeline).toHaveBeenCalledTimes(2)
    expect(harness.device.createBuffer).toHaveBeenCalledTimes(4)
    expect(harness.device.createBindGroup).toHaveBeenCalledTimes(2)
  })
})
