import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"

import { type WebGpuInstancedLatticeScene } from "./webgpu-instanced-lattice.model"

const FLOAT32_BYTES = 4
const MESH_VERTEX_STRIDE = 2 * FLOAT32_BYTES
const INSTANCE_FLOAT_COUNT = 8
const INSTANCE_STRIDE = INSTANCE_FLOAT_COUNT * FLOAT32_BYTES
const MESH_VERTEX_COUNT = 3
const INSTANCE_COUNT = 5

const SHADER_SOURCE = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vertexMain(
  @location(0) localPosition: vec2<f32>,
  @location(1) instanceOffset: vec2<f32>,
  @location(2) instanceScale: vec2<f32>,
  @location(3) instanceColor: vec4<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  let scaled = vec2<f32>(localPosition.x * instanceScale.x, localPosition.y * instanceScale.y);
  output.position = vec4<f32>(scaled + instanceOffset, 0.0, 1.0);
  output.color = instanceColor;
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}
`

const BASE_MESH_DATA = new Float32Array([0, 0.22, -0.18, -0.16, 0.18, -0.16])

export type WebGpuInstancedLatticeSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly meshBuffer: GPUBuffer
  readonly instanceBuffer: GPUBuffer
}

export function createWebGpuInstancedLatticeSceneResources(
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuInstancedLatticeScene,
): WebGpuInstancedLatticeSceneResources {
  const shader = runtime.device.createShaderModule({
    label: "visual-math-webgpu-instanced-lattice-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-instanced-lattice-pipeline",
    layout: "auto",
    vertex: {
      module: shader,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: MESH_VERTEX_STRIDE,
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
        },
        {
          arrayStride: INSTANCE_STRIDE,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x2" },
            { shaderLocation: 2, offset: 2 * FLOAT32_BYTES, format: "float32x2" },
            { shaderLocation: 3, offset: 4 * FLOAT32_BYTES, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: shader,
      entryPoint: "fragmentMain",
      targets: [{ format: runtime.format }],
    },
    primitive: { topology: "triangle-list" },
  })
  const meshBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-instanced-lattice-mesh",
    size: BASE_MESH_DATA.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const instanceBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-instanced-lattice-instances",
    size: buildWebGpuInstancedLatticeInstanceData(scene).byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  runtime.device.queue.writeBuffer(meshBuffer, 0, toArrayBuffer(BASE_MESH_DATA))
  runtime.device.queue.writeBuffer(
    instanceBuffer,
    0,
    toArrayBuffer(buildWebGpuInstancedLatticeInstanceData(scene)),
  )

  return { pipeline, meshBuffer, instanceBuffer }
}

export function buildWebGpuInstancedLatticeInstanceData(
  scene: WebGpuInstancedLatticeScene,
): Float32Array {
  const spacing = 0.2 + scene.spacing * 0.22
  const baseScale = 0.46 + scene.scale * 0.38
  const tilt = scene.tilt
  const rows = [
    [-2, 0.28],
    [-1, -0.1],
    [0, 0.34],
    [1, -0.16],
    [2, 0.22],
  ] as const

  return new Float32Array(
    rows.flatMap(([column, y], index) => {
      const parity = index % 2 === 0 ? 1 : -1
      const offsetX = column * spacing
      const offsetY = y + parity * tilt * 0.08
      const scaleX = baseScale * (0.52 + index * 0.08)
      const scaleY = baseScale * (0.78 + (1 - tilt) * 0.22 + parity * 0.04)
      const red = Math.min(1, scene.red + 0.2 + index * 0.08 + scene.scale * 0.14)
      const green = Math.min(1, scene.green + 0.22 + (4 - index) * 0.05 + scene.spacing * 0.1)
      const blue = Math.min(1, scene.blue + 0.18 + tilt * 0.24 + index * 0.03)

      return [offsetX, offsetY, scaleX, scaleY, red, green, blue, scene.alpha]
    }),
  )
}

export function webGpuInstancedLatticeMeshVertexCount(): number {
  return MESH_VERTEX_COUNT
}

export function webGpuInstancedLatticeInstanceCount(): number {
  return INSTANCE_COUNT
}

function toArrayBuffer(data: Float32Array): ArrayBuffer {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
  return bytes.buffer
}
