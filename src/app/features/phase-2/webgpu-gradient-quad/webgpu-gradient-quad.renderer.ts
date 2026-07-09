import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuGradientQuadScene } from "./webgpu-gradient-quad.model"
import {
  buildWebGpuGradientQuadVertexData,
  createWebGpuGradientQuadSceneResources,
  type WebGpuGradientQuadSceneResources,
  webGpuGradientQuadVertexCount,
} from "./webgpu-gradient-quad.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuGradientQuadSceneResources>()

export function renderWebGpuGradientQuadScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuGradientQuadScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const vertexData = buildWebGpuGradientQuadVertexData(scene)

  runtime.device.queue.writeBuffer(resources.vertexBuffer, 0, toArrayBuffer(vertexData))

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-gradient-quad-render-pass",
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
  pass.setVertexBuffer(0, resources.vertexBuffer)
  pass.draw(webGpuGradientQuadVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-gradient-quad-command-buffer" }),
  ])
}

export function releaseWebGpuGradientQuadResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuGradientQuadSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuGradientQuadSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
