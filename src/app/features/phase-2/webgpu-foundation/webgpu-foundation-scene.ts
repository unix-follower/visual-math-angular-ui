import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuFoundationScene } from "./webgpu-foundation.model"

const FLOAT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const TRIANGLE_VERTEX_COUNT = 3

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

export type WebGpuFoundationSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
}

export function createWebGpuFoundationSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuFoundationSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-foundation-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-foundation-pipeline",
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
    primitive: {
      topology: "triangle-list",
    },
  })
  const vertexBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-foundation-vertices",
    size: TRIANGLE_VERTEX_COUNT * VERTEX_STRIDE,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  return { pipeline, vertexBuffer }
}

export function buildWebGpuFoundationVertexData(scene: WebGpuFoundationScene): Float32Array {
  const scale = scene.triangleScale
  const colorA = [
    0.25 + scene.accent * 0.55,
    0.35 + (1 - scene.red) * 0.35,
    0.3 + (1 - scene.blue) * 0.4,
    1,
  ]
  const colorB = [
    0.18 + (1 - scene.green) * 0.4,
    0.2 + scene.accent * 0.5,
    0.42 + (1 - scene.blue) * 0.28,
    1,
  ]
  const colorC = [
    0.24 + (1 - scene.red) * 0.3,
    0.28 + (1 - scene.green) * 0.32,
    0.24 + scene.accent * 0.55,
    1,
  ]

  return new Float32Array([
    0,
    0.7 * scale,
    ...colorA,
    -0.78 * scale,
    -0.62 * scale,
    ...colorB,
    0.78 * scale,
    -0.62 * scale,
    ...colorC,
  ])
}

export function webGpuFoundationVertexCount(): number {
  return TRIANGLE_VERTEX_COUNT
}
