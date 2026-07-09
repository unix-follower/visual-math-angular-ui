import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuDualPassScene } from "./webgpu-dual-pass.model"

const FLOAT32_BYTES = 4
const COLOR_VERTEX_STRIDE = 6 * FLOAT32_BYTES
const UV_VERTEX_STRIDE = 4 * FLOAT32_BYTES
const OFFSCREEN_SIZE = 256
const GEOMETRY_VERTEX_COUNT = 6
const QUAD_VERTEX_COUNT = 6

const FIRST_PASS_SHADER = `
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

const SECOND_PASS_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var intermediateTexture: texture_2d<f32>;

@vertex
fn vertexMain(
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = uv;
  return output;
}

@fragment
fn fragmentMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let clampedUv = clamp(uv, vec2<f32>(0.0), vec2<f32>(0.9999));
  let coord = vec2<i32>(floor(clampedUv * vec2<f32>(256.0, 256.0)));
  let color = textureLoad(intermediateTexture, coord, 0);
  return vec4<f32>(color.rgb * vec3<f32>(1.05, 0.94, 1.08), color.a);
}
`

export type WebGpuDualPassSceneResources = {
  readonly firstPipeline: GPURenderPipeline
  readonly secondPipeline: GPURenderPipeline
  readonly geometryBuffer: GPUBuffer
  readonly quadBuffer: GPUBuffer
  readonly intermediateTexture: GPUTexture
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuDualPassSceneResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuDualPassScene,
): WebGpuDualPassSceneResources {
  const firstShader = runtime.device.createShaderModule({
    label: "visual-math-webgpu-dual-pass-first-shader",
    code: FIRST_PASS_SHADER,
  })
  const secondShader = runtime.device.createShaderModule({
    label: "visual-math-webgpu-dual-pass-second-shader",
    code: SECOND_PASS_SHADER,
  })
  const firstPipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-dual-pass-first-pipeline",
    layout: "auto",
    vertex: {
      module: firstShader,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: COLOR_VERTEX_STRIDE,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 2 * FLOAT32_BYTES, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: firstShader,
      entryPoint: "fragmentMain",
      targets: [{ format: "rgba8unorm" }],
    },
    primitive: { topology: "triangle-list" },
  })
  const secondPipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-dual-pass-second-pipeline",
    layout: "auto",
    vertex: {
      module: secondShader,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: UV_VERTEX_STRIDE,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 2 * FLOAT32_BYTES, format: "float32x2" },
          ],
        },
      ],
    },
    fragment: {
      module: secondShader,
      entryPoint: "fragmentMain",
      targets: [{ format: runtime.format }],
    },
    primitive: { topology: "triangle-list" },
  })
  const geometryBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-dual-pass-geometry",
    size: buildWebGpuDualPassGeometryData(scene).byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const quadBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-dual-pass-quad",
    size: STATIC_QUAD_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const intermediateTexture = runtime.device.createTexture({
    label: "visual-math-webgpu-dual-pass-intermediate",
    size: { width: OFFSCREEN_SIZE, height: OFFSCREEN_SIZE, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-dual-pass-bind-group",
    layout: secondPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: intermediateTexture.createView() }],
  })

  runtime.device.queue.writeBuffer(
    geometryBuffer,
    0,
    toArrayBuffer(buildWebGpuDualPassGeometryData(scene)),
  )
  runtime.device.queue.writeBuffer(quadBuffer, 0, toArrayBuffer(STATIC_QUAD_DATA))

  return {
    firstPipeline,
    secondPipeline,
    geometryBuffer,
    quadBuffer,
    intermediateTexture,
    bindGroup,
  }
}

export function buildWebGpuDualPassGeometryData(scene: WebGpuDualPassScene): Float32Array {
  const skew = scene.skew * 0.28
  const glow = scene.glow
  const mix = scene.mix

  return new Float32Array([
    -0.58 - skew,
    0.62,
    0.18 + glow * 0.52,
    0.18 + mix * 0.26,
    0.24,
    1,
    -0.66,
    -0.48,
    0.12,
    0.42 + glow * 0.34,
    0.52 + (1 - mix) * 0.14,
    1,
    0.04 + skew,
    0.74,
    0.42 + mix * 0.34,
    0.22,
    0.18 + glow * 0.18,
    1,
    0.04 + skew,
    0.74,
    0.42 + mix * 0.34,
    0.22,
    0.18 + glow * 0.18,
    1,
    -0.66,
    -0.48,
    0.12,
    0.42 + glow * 0.34,
    0.52 + (1 - mix) * 0.14,
    1,
    0.72,
    -0.66 + skew,
    0.16 + glow * 0.22,
    0.28 + mix * 0.26,
    0.58,
    1,
  ])
}

export function webGpuDualPassGeometryVertexCount(): number {
  return GEOMETRY_VERTEX_COUNT
}

export function webGpuDualPassQuadVertexCount(): number {
  return QUAD_VERTEX_COUNT
}

export function webGpuDualPassOffscreenSize(): number {
  return OFFSCREEN_SIZE
}

const STATIC_QUAD_DATA = new Float32Array([
  -0.82, 0.82, 0, 0, -0.82, -0.82, 0, 1, 0.82, 0.82, 1, 0, 0.82, 0.82, 1, 0, -0.82, -0.82, 0, 1,
  0.82, -0.82, 1, 1,
])

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
