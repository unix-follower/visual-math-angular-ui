import { type WebGpuCanvasRuntime } from "../../../shared/webgpu/webgpu-bootstrap"
import { pulseDiamondScale, type WebGpuPulseDiamondScene } from "./webgpu-pulse-diamond.model"

const FLOAT32_BYTES = 4
const VERTEX_STRIDE = 6 * FLOAT32_BYTES
const DIAMOND_VERTEX_COUNT = 6

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

export type WebGpuPulseDiamondSceneResources = {
  readonly pipeline: GPURenderPipeline
  readonly vertexBuffer: GPUBuffer
}

export function createWebGpuPulseDiamondSceneResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuPulseDiamondSceneResources {
  const shaderModule = runtime.device.createShaderModule({
    label: "visual-math-webgpu-pulse-diamond-shader",
    code: SHADER_SOURCE,
  })
  const pipeline = runtime.device.createRenderPipeline({
    label: "visual-math-webgpu-pulse-diamond-pipeline",
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
    label: "visual-math-webgpu-pulse-diamond-vertices",
    size: DIAMOND_VERTEX_COUNT * VERTEX_STRIDE,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  return { pipeline, vertexBuffer }
}

export function buildWebGpuPulseDiamondVertexData(
  scene: WebGpuPulseDiamondScene,
  phase: number,
): Float32Array {
  const scale = pulseDiamondScale(scene, phase)
  const top = [scene.skew * 0.22, scale]
  const right = [scale * (0.72 + scene.skew), 0]
  const bottom = [-scene.skew * 0.18, -scale]
  const left = [-scale * (0.72 - scene.skew), 0]
  const glow = scene.glow
  const wave = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2)
  const topColor = [0.28 + glow * 0.52, 0.22 + wave * 0.3, 0.38 + (1 - scene.blue) * 0.26, 1]
  const rightColor = [0.18 + wave * 0.34, 0.32 + glow * 0.4, 0.26 + (1 - scene.blue) * 0.22, 1]
  const bottomColor = [0.24 + glow * 0.38, 0.18 + (1 - scene.green) * 0.34, 0.46 + wave * 0.22, 1]
  const leftColor = [0.22 + (1 - scene.red) * 0.26, 0.26 + glow * 0.24, 0.34 + wave * 0.28, 1]

  return new Float32Array([
    ...top,
    ...topColor,
    ...left,
    ...leftColor,
    ...right,
    ...rightColor,
    ...right,
    ...rightColor,
    ...left,
    ...leftColor,
    ...bottom,
    ...bottomColor,
  ])
}

export function webGpuPulseDiamondVertexCount(): number {
  return DIAMOND_VERTEX_COUNT
}
