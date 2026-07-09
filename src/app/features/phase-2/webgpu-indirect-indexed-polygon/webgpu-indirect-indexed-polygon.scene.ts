import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"

import {
  indirectIndexedPolygonEncodedIndexCount,
  type WebGpuIndirectIndexedPolygonScene,
} from "./webgpu-indirect-indexed-polygon.model"

const FLOAT32_BYTES = 4
const UINT16_BYTES = 2
const UINT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const MAX_POLYGON_SIDES = 8
const MAX_VERTEX_COUNT = MAX_POLYGON_SIDES + 1
const MAX_INDEX_COUNT = MAX_POLYGON_SIDES * 3
const INDIRECT_DRAW_ARGUMENTS = 5

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

export type WebGpuIndirectIndexedPolygonSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
  readonly indexBuffer: GPUBuffer
  readonly indirectBuffer: GPUBuffer
}

export function createWebGpuIndirectIndexedPolygonSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuIndirectIndexedPolygonSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-indirect-indexed-polygon-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-indirect-indexed-polygon-pipeline",
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
    label: "visual-math-webgpu-indirect-indexed-polygon-vertices",
    size: MAX_VERTEX_COUNT * VERTEX_STRIDE,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  const indexBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-indirect-indexed-polygon-indices",
    size: MAX_INDEX_COUNT * UINT16_BYTES,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  })
  const indirectBuffer = runtime.device.createBuffer({
    label: "visual-math-webgpu-indirect-indexed-polygon-indirect",
    size: INDIRECT_DRAW_ARGUMENTS * UINT32_BYTES,
    usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
  })

  return { pipeline, vertexBuffer, indexBuffer, indirectBuffer }
}

export function buildWebGpuIndirectIndexedPolygonVertexData(
  scene: WebGpuIndirectIndexedPolygonScene,
): Float32Array {
  const vertexData: number[] = []
  const angleOffset = (scene.rotation * Math.PI) / 180
  const centerColor = [
    0.24 + scene.intensity * 0.52,
    0.2 + (1 - scene.green) * 0.32,
    0.24 + (1 - scene.blue) * 0.22,
    1,
  ]

  vertexData.push(0, 0, ...centerColor)

  for (let index = 0; index < scene.sides; index += 1) {
    const angle = angleOffset + (index / scene.sides) * Math.PI * 2
    const x = Math.cos(angle) * scene.radius
    const y = Math.sin(angle) * scene.radius
    const blend = index / scene.sides
    const color = [
      0.18 + scene.intensity * (0.22 + blend * 0.34),
      0.24 + (1 - scene.green) * (0.14 + (1 - blend) * 0.24) + scene.coverage * 0.04,
      0.28 + (1 - scene.blue) * (0.14 + blend * 0.22) + scene.coverage * 0.06,
      1,
    ]

    vertexData.push(x, y, ...color)
  }

  return new Float32Array(vertexData)
}

export function buildWebGpuIndirectIndexedPolygonIndexData(
  scene: WebGpuIndirectIndexedPolygonScene,
): Uint16Array {
  const indices: number[] = []

  for (let index = 0; index < scene.sides; index += 1) {
    const current = index + 1
    const next = index === scene.sides - 1 ? 1 : current + 1

    indices.push(0, current, next)
  }

  return new Uint16Array(indices)
}

export function buildWebGpuIndirectIndexedPolygonDrawData(
  scene: WebGpuIndirectIndexedPolygonScene,
): Uint32Array {
  return new Uint32Array([indirectIndexedPolygonEncodedIndexCount(scene), 1, 0, 0, 0])
}
