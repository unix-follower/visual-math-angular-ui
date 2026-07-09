import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuSamplerWaveScene } from "./webgpu-sampler-wave.model"

const FLOAT32_BYTES = 4
const RGBA_BYTES = 4
const TEXTURE_SIZE = 8
const VERTEX_COUNT = 6
const VERTEX_STRIDE = 4 * FLOAT32_BYTES

const SHADER_SOURCE = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var waveTexture: texture_2d<f32>;
@group(0) @binding(1) var waveSampler: sampler;

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
  return textureSample(waveTexture, waveSampler, uv);
}
`

const STATIC_VERTEX_DATA = new Float32Array([
  -0.82, 0.82, 0, 0, -0.82, -0.82, 0, 1, 0.82, 0.82, 1, 0, 0.82, 0.82, 1, 0, -0.82, -0.82, 0, 1,
  0.82, -0.82, 1, 1,
])

export type WebGpuSamplerWaveSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly texture: GPUTexture
  readonly sampler: GPUSampler
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuSamplerWaveSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuSamplerWaveSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-sampler-wave-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-sampler-wave-pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: VERTEX_STRIDE,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 2 * FLOAT32_BYTES, format: "float32x2" },
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
    label: "visual-math-webgpu-sampler-wave-vertices",
    size: STATIC_VERTEX_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const texture = runtime.device.createTexture({
    label: "visual-math-webgpu-sampler-wave-texture",
    size: { width: TEXTURE_SIZE, height: TEXTURE_SIZE, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })
  const sampler = runtime.device.createSampler({
    label: "visual-math-webgpu-sampler-wave-sampler",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "nearest",
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-sampler-wave-bind-group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: sampler },
    ],
  })

  runtime.device.queue.writeBuffer(vertexBuffer, 0, toArrayBuffer(STATIC_VERTEX_DATA))

  return { pipeline, vertexBuffer, texture, sampler, bindGroup }
}

export function buildWebGpuSamplerWaveData(scene: WebGpuSamplerWaveScene): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * RGBA_BYTES)
  const phase = 1 + Math.round(scene.frequency * 5)

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const pixelIndex = (y * TEXTURE_SIZE + x) * RGBA_BYTES
      const wave = (Math.sin((x + phase) * 0.9) + Math.cos((y + phase) * 0.8) + 2) / 4
      const diagonal = x === y || x + y === TEXTURE_SIZE - 1 ? 1 : 0

      data[pixelIndex] = toByte(clampChannel(scene.red * 0.45 + wave * scene.blend * 0.55))
      data[pixelIndex + 1] = toByte(
        clampChannel(scene.green * 0.4 + scene.softness * 0.3 + diagonal * 0.3),
      )
      data[pixelIndex + 2] = toByte(
        clampChannel(scene.blue * 0.42 + (1 - wave) * scene.frequency * 0.48),
      )
      data[pixelIndex + 3] = toByte(scene.alpha)
    }
  }

  return data
}

export function webGpuSamplerWaveTextureSize(): number {
  return TEXTURE_SIZE
}

export function webGpuSamplerWaveVertexCount(): number {
  return VERTEX_COUNT
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toByte(value: number): number {
  return Math.round(value * 255)
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
