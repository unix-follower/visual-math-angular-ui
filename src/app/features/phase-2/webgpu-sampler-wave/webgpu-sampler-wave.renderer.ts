import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuSamplerWaveScene } from "./webgpu-sampler-wave.model"
import {
  buildWebGpuSamplerWaveData,
  createWebGpuSamplerWaveSceneResources,
  type WebGpuSamplerWaveSceneResources,
  webGpuSamplerWaveTextureSize,
  webGpuSamplerWaveVertexCount,
} from "./webgpu-sampler-wave.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const TEXTURE_BYTES_PER_ROW = webGpuSamplerWaveTextureSize() * 4
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuSamplerWaveSceneResources>()

export function renderWebGpuSamplerWaveScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuSamplerWaveScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const textureData = buildWebGpuSamplerWaveData(scene)

  runtime.device.queue.writeTexture(
    { texture: resources.texture },
    toArrayBuffer(textureData),
    { bytesPerRow: TEXTURE_BYTES_PER_ROW, rowsPerImage: webGpuSamplerWaveTextureSize() },
    {
      width: webGpuSamplerWaveTextureSize(),
      height: webGpuSamplerWaveTextureSize(),
      depthOrArrayLayers: 1,
    },
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-sampler-wave-render-pass",
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
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, resources.vertexBuffer)
  pass.draw(webGpuSamplerWaveVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-sampler-wave-command-buffer" }),
  ])
}

export function releaseWebGpuSamplerWaveResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.texture.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuSamplerWaveSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuSamplerWaveSceneResources(runtime),
  )
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(data)
  return bytes.buffer
}
