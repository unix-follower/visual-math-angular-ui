import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"

import { type WebGpuComputeRippleScene } from "./webgpu-compute-ripple.model"

const FLOAT32_BYTES = 4
const VERTEX_FLOAT_COUNT = 6
const VERTEX_STRIDE = VERTEX_FLOAT_COUNT * FLOAT32_BYTES
const VERTEX_COUNT = 6
const UNIFORM_FLOAT_COUNT = 8

const COMPUTE_SHADER = `
struct Params {
  amplitude: f32,
  frequency: f32,
  drift: f32,
  red: f32,
  green: f32,
  blue: f32,
  alpha: f32,
  pad: f32,
};

struct Vertex {
  position: vec2<f32>,
  color: vec4<f32>,
};

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> params: Params;

@compute @workgroup_size(6)
fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= 6u) {
    return;
  }

  var basePositions = array<vec2<f32>, 6>(
    vec2<f32>(-0.74, 0.58),
    vec2<f32>(-0.7, -0.44),
    vec2<f32>(0.02, 0.76),
    vec2<f32>(0.02, 0.76),
    vec2<f32>(-0.7, -0.44),
    vec2<f32>(0.8, -0.6),
  );

  let phase = f32(index) * 0.55;
  let offsetX = sin(params.frequency * phase + params.drift * 3.14159) * params.amplitude * 0.24;
  let offsetY = cos(params.frequency * phase + params.drift * 2.35619) * params.amplitude * 0.18;
  let tint = 0.18 + f32(index) * 0.07 + params.amplitude * 0.22;
  let position = basePositions[index] + vec2<f32>(offsetX, offsetY);

  vertices[index].position = position;
  vertices[index].color = vec4<f32>(
    clamp(params.red + tint * 0.48, 0.0, 1.0),
    clamp(params.green + params.frequency * 0.18 + phase * 0.05, 0.0, 1.0),
    clamp(params.blue + (1.0 - params.drift) * 0.2 + f32(index) * 0.03, 0.0, 1.0),
    params.alpha,
  );
}
`

const RENDER_SHADER = `
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

export type WebGpuComputeRippleSceneResources = {
  readonly computePipeline: GPUComputePipeline
  readonly renderPipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly uniformBuffer: GPUBuffer
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuComputeRippleSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuComputeRippleSceneResources {
  const computeShader = runtime.device.createShaderModule({
    label: "visual-math-webgpu-compute-ripple-compute-shader",
    code: COMPUTE_SHADER,
  })
  const renderShader = runtime.device.createShaderModule({
    label: "visual-math-webgpu-compute-ripple-render-shader",
    code: RENDER_SHADER,
  })
  const computePipeline = runtime.device.createComputePipeline({
    label: "visual-math-webgpu-compute-ripple-compute-pipeline",
    layout: "auto",
    compute: {
      module: computeShader,
      entryPoint: "computeMain",
    },
  })
  const renderPipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-compute-ripple-render-pipeline",
    layout: "auto",
    vertex: {
      module: renderShader,
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
      module: renderShader,
      entryPoint: "fragmentMain",
      targets: [{ format: runtime.format }],
    },
    primitive: { topology: "triangle-list" },
  })
  const vertexBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-compute-ripple-vertices",
    size: VERTEX_COUNT * VERTEX_STRIDE,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
  })
  const uniformBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-compute-ripple-uniforms",
    size: UNIFORM_FLOAT_COUNT * FLOAT32_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-compute-ripple-bind-group",
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertexBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
  })

  return { computePipeline, renderPipeline, vertexBuffer, uniformBuffer, bindGroup }
}

export function buildWebGpuComputeRippleUniformData(scene: WebGpuComputeRippleScene): Float32Array {
  return new Float32Array([
    scene.amplitude,
    scene.frequency,
    scene.drift,
    scene.red,
    scene.green,
    scene.blue,
    scene.alpha,
    0,
  ])
}

export function webGpuComputeRippleVertexCount(): number {
  return VERTEX_COUNT
}
