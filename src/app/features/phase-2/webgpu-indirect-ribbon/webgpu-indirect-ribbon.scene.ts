import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"

import {
  indirectRibbonInstanceCount,
  type WebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.model"

const FLOAT32_BYTES = 4
const UINT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const VERTEX_COUNT = 6

const SHADER_SOURCE = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vertexMain(
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}
`

export type WebGpuIndirectRibbonSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly indirectBuffer: GPUBuffer
}

export function createWebGpuIndirectRibbonSceneResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuIndirectRibbonScene,
): WebGpuIndirectRibbonSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-indirect-ribbon-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-indirect-ribbon-pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: VERTEX_STRIDE,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 2 * FLOAT32_BYTES, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: runtime.format }],
    },
    primitive: { topology: "triangle-list" },
  })
  const vertexBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-indirect-ribbon-vertices",
    size: buildWebGpuIndirectRibbonVertexData(scene).byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const indirectBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-indirect-ribbon-indirect",
    size: buildWebGpuIndirectRibbonDrawData(scene).byteLength,
    usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
  })

  runtime.device.queue.writeBuffer(
    vertexBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectRibbonVertexData(scene)),
  )
  runtime.device.queue.writeBuffer(
    indirectBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectRibbonDrawData(scene)),
  )

  return { pipeline, vertexBuffer, indirectBuffer }
}

export function buildWebGpuIndirectRibbonVertexData(
  scene: WebGpuIndirectRibbonScene,
): Float32Array {
  const span = 0.28 + scene.span * 0.42
  const taper = 0.08 + scene.taper * 0.18
  const lift = 0.16 + scene.echo * 0.18

  return new Float32Array([
    -span,
    lift,
    0.28 + scene.span * 0.34,
    0.24 + scene.echo * 0.18,
    0.34,
    scene.alpha,
    -span,
    -taper,
    0.16,
    0.26 + scene.taper * 0.34,
    0.54,
    scene.alpha,
    0,
    lift * 0.6,
    0.52,
    0.24 + scene.echo * 0.12,
    0.3 + scene.taper * 0.12,
    scene.alpha,
    0,
    lift * 0.6,
    0.52,
    0.24 + scene.echo * 0.12,
    0.3 + scene.taper * 0.12,
    scene.alpha,
    -span,
    -taper,
    0.16,
    0.26 + scene.taper * 0.34,
    0.54,
    scene.alpha,
    span,
    -lift,
    0.24 + scene.echo * 0.18,
    0.32 + scene.span * 0.22,
    0.62,
    scene.alpha,
  ])
}

export function buildWebGpuIndirectRibbonDrawData(scene: WebGpuIndirectRibbonScene): Uint32Array {
  return new Uint32Array([VERTEX_COUNT, indirectRibbonInstanceCount(scene), 0, 0])
}

export function webGpuIndirectRibbonVertexCount(): number {
  return VERTEX_COUNT
}

function toArrayBuffer(data: Float32Array | Uint32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
