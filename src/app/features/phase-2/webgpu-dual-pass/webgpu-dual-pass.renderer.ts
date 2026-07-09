import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"
import { type WebGpuDualPassScene } from "./webgpu-dual-pass.model"
import {
  buildWebGpuDualPassGeometryData,
  createWebGpuDualPassSceneResources,
  type WebGpuDualPassSceneResources,
  webGpuDualPassGeometryVertexCount,
  webGpuDualPassQuadVertexCount,
} from "./webgpu-dual-pass.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuDualPassSceneResources>()

export function renderWebGpuDualPassScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuDualPassScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime, scene)

  runtime.device.queue.writeBuffer(
    resources.geometryBuffer,
    0,
    toArrayBuffer(buildWebGpuDualPassGeometryData(scene)),
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-dual-pass-render-pass",
  })
  const firstPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: resources.intermediateTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  firstPass.setPipeline(resources.firstPipeline)
  firstPass.setVertexBuffer(0, resources.geometryBuffer)
  firstPass.draw(webGpuDualPassGeometryVertexCount())
  firstPass.end()

  const secondPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: runtime.context.getCurrentTexture().createView(),
        clearValue: { r: scene.red, g: scene.green, b: scene.blue, a: scene.alpha },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  secondPass.setPipeline(resources.secondPipeline)
  secondPass.setBindGroup(0, resources.bindGroup)
  secondPass.setVertexBuffer(0, resources.quadBuffer)
  secondPass.draw(webGpuDualPassQuadVertexCount())
  secondPass.end()
  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-dual-pass-command-buffer" }),
  ])
}

export function releaseWebGpuDualPassResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.geometryBuffer.destroy?.()
    resources.quadBuffer.destroy?.()
    resources.intermediateTexture.destroy?.()
  })
}

function getOrCreateResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuDualPassScene,
): WebGpuDualPassSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuDualPassSceneResources(runtime, scene),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
