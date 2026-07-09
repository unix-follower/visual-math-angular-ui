import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuUniformTransformScene } from "./webgpu-uniform-transform.model"
import {
  buildWebGpuUniformTransformUniformData,
  createWebGpuUniformTransformSceneResources,
  type WebGpuUniformTransformSceneResources,
  webGpuUniformTransformVertexCount,
} from "./webgpu-uniform-transform.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuUniformTransformSceneResources>()

export function renderWebGpuUniformTransformScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuUniformTransformScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const uniformData = buildWebGpuUniformTransformUniformData(scene)

  runtime.device.queue.writeBuffer(resources.uniformBuffer, 0, toArrayBuffer(uniformData))

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-uniform-transform-render-pass",
  })
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: runtime.context.getCurrentTexture().createView(),
        clearValue: {
          r: scene.red,
          g: scene.green,
          b: scene.blue,
          a: scene.alpha,
        },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, resources.vertexBuffer)
  pass.draw(webGpuUniformTransformVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-uniform-transform-command-buffer" }),
  ])
}

export function releaseWebGpuUniformTransformResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.uniformBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuUniformTransformSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuUniformTransformSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
