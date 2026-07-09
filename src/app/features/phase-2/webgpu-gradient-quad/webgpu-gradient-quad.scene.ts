import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuGradientQuadScene } from "./webgpu-gradient-quad.model"

const FLOAT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const QUAD_VERTEX_COUNT = 6

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

export type WebGpuGradientQuadSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
}

export function createWebGpuGradientQuadSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuGradientQuadSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-gradient-quad-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-gradient-quad-pipeline",
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
    label: "visual-math-webgpu-gradient-quad-vertices",
    size: QUAD_VERTEX_COUNT * VERTEX_STRIDE,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  return { pipeline, vertexBuffer }
}

export function buildWebGpuGradientQuadVertexData(scene: WebGpuGradientQuadScene): Float32Array {
  const left = -1 + scene.inset + scene.tilt * 0.3
  const right = 1 - scene.inset + scene.tilt * 0.3
  const top = 1 - scene.inset
  const bottom = -1 + scene.inset
  const intensity = scene.intensity
  const colorA = [
    0.24 + intensity * 0.62,
    0.18 + (1 - scene.green) * 0.45,
    0.26 + (1 - scene.blue) * 0.38,
    1,
  ]
  const colorB = [
    0.16 + (1 - scene.red) * 0.34,
    0.34 + intensity * 0.46,
    0.36 + (1 - scene.blue) * 0.3,
    1,
  ]
  const colorC = [
    0.22 + (1 - scene.red) * 0.28,
    0.24 + (1 - scene.green) * 0.34,
    0.42 + intensity * 0.44,
    1,
  ]
  const colorD = [
    0.3 + intensity * 0.5,
    0.26 + (1 - scene.green) * 0.26,
    0.2 + (1 - scene.blue) * 0.22,
    1,
  ]

  return new Float32Array([
    left,
    top,
    ...colorA,
    left - scene.tilt,
    bottom,
    ...colorB,
    right,
    top + scene.tilt,
    ...colorC,
    right,
    top + scene.tilt,
    ...colorC,
    left - scene.tilt,
    bottom,
    ...colorB,
    right - scene.tilt,
    bottom - scene.tilt,
    ...colorD,
  ])
}

export function webGpuGradientQuadVertexCount(): number {
  return QUAD_VERTEX_COUNT
}
