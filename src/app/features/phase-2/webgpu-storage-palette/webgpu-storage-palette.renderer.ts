import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuStoragePaletteScene } from "./webgpu-storage-palette.model"
import {
  buildWebGpuStoragePaletteData,
  createWebGpuStoragePaletteSceneResources,
  type WebGpuStoragePaletteSceneResources,
  webGpuStoragePaletteVertexCount,
} from "./webgpu-storage-palette.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuStoragePaletteSceneResources>()

export function renderWebGpuStoragePaletteScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuStoragePaletteScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const paletteData = buildWebGpuStoragePaletteData(scene)

  runtime.device.queue.writeBuffer(resources.storageBuffer, 0, toArrayBuffer(paletteData))

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-storage-palette-render-pass",
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
  pass.draw(webGpuStoragePaletteVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-storage-palette-command-buffer" }),
  ])
}

export function releaseWebGpuStoragePaletteResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.storageBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuStoragePaletteSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuStoragePaletteSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
