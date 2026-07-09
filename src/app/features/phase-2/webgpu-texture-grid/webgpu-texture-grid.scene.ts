import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { type WebGpuTextureGridScene } from "./webgpu-texture-grid.model"

const FLOAT32_BYTES = 4
const RGBA_BYTES = 4
const TEXTURE_SIZE = 4
const VERTEX_COUNT = 6
const VERTEX_STRIDE = 4 * FLOAT32_BYTES

const SHADER_SOURCE = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var textureGrid: texture_2d<f32>;

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
  let sampleCoord = vec2<i32>(floor(clampedUv * vec2<f32>(4.0, 4.0)));
  return textureLoad(textureGrid, sampleCoord, 0);
}
`

const STATIC_VERTEX_DATA = new Float32Array([
  -0.82, 0.82, 0, 0, -0.82, -0.82, 0, 1, 0.82, 0.82, 1, 0, 0.82, 0.82, 1, 0, -0.82, -0.82, 0, 1,
  0.82, -0.82, 1, 1,
])

export type WebGpuTextureGridSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly texture: GPUTexture
  readonly bindGroup: GPUBindGroup
}

export function createWebGpuTextureGridSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuTextureGridSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-texture-grid-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-texture-grid-pipeline",
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
    label: "visual-math-webgpu-texture-grid-vertices",
    size: STATIC_VERTEX_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const texture = runtime.device.createTexture({
    label: "visual-math-webgpu-texture-grid-texture",
    size: { width: TEXTURE_SIZE, height: TEXTURE_SIZE, depthOrArrayLayers: 1 },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })
  const bindGroup = runtime.device.createBindGroup({
    label: "visual-math-webgpu-texture-grid-bind-group",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: texture.createView(),
      },
    ],
  })

  runtime.device.queue.writeBuffer(vertexBuffer, 0, toArrayBuffer(STATIC_VERTEX_DATA))

  return { pipeline, vertexBuffer, texture, bindGroup }
}

export function buildWebGpuTextureGridData(scene: WebGpuTextureGridScene): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * RGBA_BYTES)
  const frequencyPhase = 1 + Math.round(scene.frequency * 3)

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const pixelIndex = (y * TEXTURE_SIZE + x) * RGBA_BYTES
      const checker = (x + y + frequencyPhase) % 2 === 0 ? 1 : 0
      const diagonal = x === y ? 1 : 0

      data[pixelIndex] = toByte(
        clampChannel(
          scene.red * 0.4 + checker * scene.contrast * 0.6 + diagonal * scene.blend * 0.2,
        ),
      )
      data[pixelIndex + 1] = toByte(
        clampChannel(scene.green * 0.45 + diagonal * 0.4 + (1 - checker) * scene.blend * 0.25),
      )
      data[pixelIndex + 2] = toByte(
        clampChannel(
          scene.blue * 0.5 + (1 - checker) * scene.contrast * 0.5 + diagonal * scene.blend * 0.18,
        ),
      )
      data[pixelIndex + 3] = toByte(scene.alpha)
    }
  }

  return data
}

export function webGpuTextureGridSize(): number {
  return TEXTURE_SIZE
}

export function webGpuTextureGridVertexCount(): number {
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
