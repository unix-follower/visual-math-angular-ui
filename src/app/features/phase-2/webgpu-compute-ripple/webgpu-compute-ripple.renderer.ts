import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"

import { type WebGpuComputeRippleScene } from "./webgpu-compute-ripple.model"
import {
  buildWebGpuComputeRippleUniformData,
  createWebGpuComputeRippleSceneResources,
  type WebGpuComputeRippleSceneResources,
  webGpuComputeRippleVertexCount,
} from "./webgpu-compute-ripple.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuComputeRippleSceneResources>()

export function renderWebGpuComputeRippleScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuComputeRippleScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)

  runtime.device.queue.writeBuffer(
    resources.uniformBuffer,
    0,
    toArrayBuffer(buildWebGpuComputeRippleUniformData(scene)),
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-compute-ripple-encoder",
  })
  const computePass = encoder.beginComputePass({
    label: "visual-math-webgpu-compute-ripple-compute-pass",
  })

  computePass.setPipeline(resources.computePipeline)
  computePass.setBindGroup(0, resources.bindGroup)
  computePass.dispatchWorkgroups(1)
  computePass.end()

  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: runtime.context.getCurrentTexture().createView(),
        clearValue: { r: scene.red, g: scene.green, b: scene.blue, a: scene.alpha },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  renderPass.setPipeline(resources.renderPipeline)
  renderPass.setVertexBuffer(0, resources.vertexBuffer)
  renderPass.draw(webGpuComputeRippleVertexCount())
  renderPass.end()

  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-compute-ripple-command-buffer" }),
  ])
}

export function releaseWebGpuComputeRippleResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.uniformBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuComputeRippleSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuComputeRippleSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
