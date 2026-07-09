import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuUniformTransformScene } from "./webgpu-uniform-transform.model"

const FLOAT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const VERTEX_COUNT = 6
const UNIFORM_FLOAT_COUNT = 8

const SHADER_SOURCE = `
struct Uniforms {
  transform: vec4<f32>,
  accent: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
) -> VertexOutput {
  let scale = uniforms.transform.x;
  let rotation = uniforms.transform.y;
  let offset = vec2<f32>(uniforms.transform.z, uniforms.transform.w);
  let c = cos(rotation);
  let s = sin(rotation);
  let scaled = position * scale;
  let rotated = vec2<f32>(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);

  var output: VertexOutput;
  output.position = vec4<f32>(rotated + offset, 0.0, 1.0);
  output.color = mix(color, uniforms.accent, uniforms.accent.a);
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}
`

const STATIC_VERTEX_DATA = new Float32Array([
  -0.45, 0.45, 0.22, 0.32, 0.78, 1, -0.45, -0.45, 0.3, 0.78, 0.54, 1, 0.45, 0.45, 0.86, 0.38, 0.44,
  1, 0.45, 0.45, 0.86, 0.38, 0.44, 1, -0.45, -0.45, 0.3, 0.78, 0.54, 1, 0.45, -0.45, 0.92, 0.72,
  0.28, 1,
])

export type WebGpuUniformTransformSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly uniformBuffer: GPUBuffer
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuUniformTransformSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuUniformTransformSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-uniform-transform-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-uniform-transform-pipeline",
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
    label: "visual-math-webgpu-uniform-transform-vertices",
    size: STATIC_VERTEX_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const uniformBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-uniform-transform-uniforms",
    size: UNIFORM_FLOAT_COUNT * FLOAT32_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-uniform-transform-bind-group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  })

  runtime.device.queue.writeBuffer(vertexBuffer, 0, toArrayBuffer(STATIC_VERTEX_DATA))

  return { pipeline, vertexBuffer, uniformBuffer, bindGroup }
}

export function buildWebGpuUniformTransformUniformData(
  scene: WebGpuUniformTransformScene,
): Float32Array {
  const rotation = (scene.rotation * Math.PI) / 180
  const tintRed = 0.24 + scene.accent * 0.52
  const tintGreen = 0.22 + (1 - scene.green) * 0.28
  const tintBlue = 0.3 + (1 - scene.blue) * 0.26

  return new Float32Array([
    scene.scale,
    rotation,
    scene.offsetX,
    scene.offsetY,
    tintRed,
    tintGreen,
    tintBlue,
    scene.accent,
  ])
}

export function webGpuUniformTransformVertexCount(): number {
  return VERTEX_COUNT
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
