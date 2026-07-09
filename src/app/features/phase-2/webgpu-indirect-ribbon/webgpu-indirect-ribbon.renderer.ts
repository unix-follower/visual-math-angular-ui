import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"

import { type WebGpuIndirectRibbonScene } from "./webgpu-indirect-ribbon.model"
import {
  buildWebGpuIndirectRibbonDrawData,
  buildWebGpuIndirectRibbonVertexData,
  createWebGpuIndirectRibbonSceneResources,
  type WebGpuIndirectRibbonSceneResources,
} from "./webgpu-indirect-ribbon.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuIndirectRibbonSceneResources>()

export function renderWebGpuIndirectRibbonScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuIndirectRibbonScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime, scene)

  runtime.device.queue.writeBuffer(
    resources.vertexBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectRibbonVertexData(scene)),
  )
  runtime.device.queue.writeBuffer(
    resources.indirectBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectRibbonDrawData(scene)),
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-indirect-ribbon-command-encoder",
  })
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: runtime.context.getCurrentTexture().createView(),
        clearValue: { r: scene.red, g: scene.green, b: scene.blue, a: scene.alpha },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  pass.setPipeline(resources.pipeline)
  pass.setVertexBuffer(0, resources.vertexBuffer)
  pass.drawIndirect(resources.indirectBuffer, 0)
  pass.end()

  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-indirect-ribbon-command-buffer" }),
  ])
}

export function releaseWebGpuIndirectRibbonResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.indirectBuffer.destroy?.()
  })
}

function getOrCreateResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuIndirectRibbonScene,
): WebGpuIndirectRibbonSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuIndirectRibbonSceneResources(runtime, scene),
  )
}

function toArrayBuffer(data: Float32Array | Uint32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
