import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuStoragePaletteScene } from "./webgpu-storage-palette.model"

const FLOAT32_BYTES = 4
const VERTEX_STRIDE = 2 * FLOAT32_BYTES
const STORAGE_ENTRY_FLOATS = 4
const VERTEX_COUNT = 6
const PALETTE_ENTRY_COUNT = 6

const SHADER_SOURCE = `
struct PaletteBuffer {
  colors: array<vec4<f32>, 6>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<storage, read> palette: PaletteBuffer;

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) position: vec2<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.color = palette.colors[vertexIndex];
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}
`

const STATIC_VERTEX_DATA = new Float32Array([
  -0.7, 0.68, -0.78, -0.32, 0.02, 0.78, 0.02, 0.78, -0.78, -0.32, 0.78, -0.62,
])

export type WebGpuStoragePaletteSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly storageBuffer: GPUBuffer
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuStoragePaletteSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuStoragePaletteSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-storage-palette-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-storage-palette-pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: VERTEX_STRIDE,
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
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
    label: "visual-math-webgpu-storage-palette-vertices",
    size: STATIC_VERTEX_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const storageBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-storage-palette-storage",
    size: PALETTE_ENTRY_COUNT * STORAGE_ENTRY_FLOATS * FLOAT32_BYTES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-storage-palette-bind-group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: storageBuffer,
        },
      },
    ],
  })

  runtime.device.queue.writeBuffer(vertexBuffer, 0, toArrayBuffer(STATIC_VERTEX_DATA))

  return { pipeline, vertexBuffer, storageBuffer, bindGroup }
}

export function buildWebGpuStoragePaletteData(scene: WebGpuStoragePaletteScene): Float32Array {
  const contrast = 0.2 + scene.contrast * 0.7
  const warm = scene.warmth
  const cool = 1 - scene.warmth
  const lift = scene.glow * 0.16
  const balance = scene.balance

  return new Float32Array([
    0.24 + warm * 0.48 + balance * 0.08,
    0.18 + contrast * 0.16 + lift,
    0.26 + cool * 0.2,
    1,
    0.18 + cool * 0.22,
    0.28 + contrast * 0.34 + lift,
    0.4 + cool * 0.16,
    1,
    0.38 + warm * 0.46,
    0.22 + lift,
    0.2 + contrast * 0.12,
    1,
    0.26 + warm * 0.34,
    0.18 + contrast * 0.2,
    0.44 + cool * 0.14 + lift,
    1,
    0.16 + cool * 0.28,
    0.34 + contrast * 0.22 + lift,
    0.32 + cool * 0.18,
    1,
    0.44 + warm * 0.34,
    0.3 + lift,
    0.18 + contrast * 0.18,
    1,
  ])
}

export function webGpuStoragePaletteVertexCount(): number {
  return VERTEX_COUNT
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
