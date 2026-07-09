import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuPulseDiamondScene } from "./webgpu-pulse-diamond.model"
import {
  buildWebGpuPulseDiamondVertexData,
  createWebGpuPulseDiamondSceneResources,
  type WebGpuPulseDiamondSceneResources,
  webGpuPulseDiamondVertexCount,
} from "./webgpu-pulse-diamond.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuPulseDiamondSceneResources>()

export function renderWebGpuPulseDiamondScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuPulseDiamondScene,
  phase: number,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)
  const vertexData = buildWebGpuPulseDiamondVertexData(scene, phase)

  runtime.device.queue.writeBuffer(resources.vertexBuffer, 0, toArrayBuffer(vertexData))

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-pulse-diamond-render-pass",
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
  pass.draw(webGpuPulseDiamondVertexCount())
  pass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-pulse-diamond-command-buffer" }),
  ])
}

export function releaseWebGpuPulseDiamondResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
  })
}

function getOrCreateResources(runtime: WebGpuCanvasRuntime): WebGpuPulseDiamondSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuPulseDiamondSceneResources(runtime),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
