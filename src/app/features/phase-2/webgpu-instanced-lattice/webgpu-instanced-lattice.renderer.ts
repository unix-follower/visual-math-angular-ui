import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "../../../shared/webgpu/webgpu-renderer-resources"

import { type WebGpuInstancedLatticeScene } from "./webgpu-instanced-lattice.model"
import {
  buildWebGpuInstancedLatticeInstanceData,
  createWebGpuInstancedLatticeSceneResources,
  type WebGpuInstancedLatticeSceneResources,
  webGpuInstancedLatticeInstanceCount,
  webGpuInstancedLatticeMeshVertexCount,
} from "./webgpu-instanced-lattice.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<WebGpuCanvasRuntime, WebGpuInstancedLatticeSceneResources>()

export function renderWebGpuInstancedLatticeScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuInstancedLatticeScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime, scene)

  runtime.device.queue.writeBuffer(
    resources.instanceBuffer,
    0,
    toArrayBuffer(buildWebGpuInstancedLatticeInstanceData(scene)),
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-webgpu-instanced-lattice-command-encoder",
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
  pass.setVertexBuffer(0, resources.meshBuffer)
  pass.setVertexBuffer(1, resources.instanceBuffer)
  pass.draw(webGpuInstancedLatticeMeshVertexCount(), webGpuInstancedLatticeInstanceCount())
  pass.end()

  runtime.device.queue.submit([
    encoder.finish({ label: "visual-math-webgpu-instanced-lattice-command-buffer" }),
  ])
}

export function releaseWebGpuInstancedLatticeResources(runtime: WebGpuCanvasRuntime): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.meshBuffer.destroy?.()
    resources.instanceBuffer.destroy?.()
  })
}

function getOrCreateResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuInstancedLatticeScene,
): WebGpuInstancedLatticeSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuInstancedLatticeSceneResources(runtime, scene),
  )
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
