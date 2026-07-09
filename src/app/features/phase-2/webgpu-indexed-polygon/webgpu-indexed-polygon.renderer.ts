import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuIndexedPolygonScene } from "./webgpu-indexed-polygon.model"
import {
  buildWebGpuIndexedPolygonIndexData,
  buildWebGpuIndexedPolygonVertexData,
  createWebGpuIndexedPolygonSceneResources,
  type WebGpuIndexedPolygonSceneResources,
  webGpuIndexedPolygonIndexCount,
} from "./webgpu-indexed-polygon.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuIndexedPolygonSceneResources>()

export function renderWebGpuIndexedPolygonScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuIndexedPolygonScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const vertexData = buildWebGpuIndexedPolygonVertexData(scene)
  const indexData = buildWebGpuIndexedPolygonIndexData(scene)

  runtime.device.queue.writeBuffer(resources.vertexBuffer, 0, toArrayBuffer(vertexData))
  runtime.device.queue.writeBuffer(resources.indexBuffer, 0, toArrayBuffer(indexData))

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-indexed-polygon-render-pass",
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
  pass.setIndexBuffer(resources.indexBuffer, "uint16")
  pass.drawIndexed(webGpuIndexedPolygonIndexCount(scene))
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-indexed-polygon-command-buffer" }),
  ])
}

export function releaseWebGpuIndexedPolygonResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.indexBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuIndexedPolygonSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuIndexedPolygonSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array | Uint16Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
