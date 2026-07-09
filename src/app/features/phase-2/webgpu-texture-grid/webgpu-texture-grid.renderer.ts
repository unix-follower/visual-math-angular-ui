import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuTextureGridScene } from "./webgpu-texture-grid.model"
import {
  buildWebGpuTextureGridData,
  createWebGpuTextureGridSceneResources,
  type WebGpuTextureGridSceneResources,
  webGpuTextureGridSize,
  webGpuTextureGridVertexCount,
} from "./webgpu-texture-grid.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const TEXTURE_BYTES_PER_ROW = webGpuTextureGridSize() * 4
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuTextureGridSceneResources>()

export function renderWebGpuTextureGridScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuTextureGridScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const textureData = buildWebGpuTextureGridData(scene)

  runtime.device.queue.writeTexture(
    { texture: resources.texture },
    toArrayBuffer(textureData),
    { bytesPerRow: TEXTURE_BYTES_PER_ROW, rowsPerImage: webGpuTextureGridSize() },
    { width: webGpuTextureGridSize(), height: webGpuTextureGridSize(), depthOrArrayLayers: 1 },
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-texture-grid-render-pass",
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
  pass.draw(webGpuTextureGridVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-texture-grid-command-buffer" }),
  ])
}

export function releaseWebGpuTextureGridResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.texture.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuTextureGridSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuTextureGridSceneResources(runtime),
  )
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(data)
  return bytes.buffer
}
