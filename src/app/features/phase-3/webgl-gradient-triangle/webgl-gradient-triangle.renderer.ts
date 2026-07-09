import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  createRequiredWebGlAttributeLocation,
  enableInterleavedWebGlAttributes,
} from "../../../shared/webgl/webgl-binding-resources"
import {
  createLinkedWebGlProgram,
  createRequiredWebGlBuffer,
} from "../../../shared/webgl/webgl-program-resources"
import {
  getOrCreateCachedWebGlResources,
  releaseCachedWebGlResources,
  syncWebGlCanvasSize,
} from "../../../shared/webgl/webgl-renderer-resources"

import { type WebGlGradientTriangleScene } from "./webgl-gradient-triangle.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 6
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlGradientTriangleResources>()

type WebGlGradientTriangleResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly colorLocation: number
}

export function renderWebGlGradientTriangleScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlGradientTriangleScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )
  const vertexData = buildTriangleVertexData(scene)

  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.program)
  context.bindBuffer(context.ARRAY_BUFFER, resources.vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, vertexData, context.STATIC_DRAW)
  enableInterleavedWebGlAttributes(context, FLOATS_PER_VERTEX, [
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.colorLocation, size: 4, offsetFloats: 2 },
  ])
  context.drawArrays(context.TRIANGLES, 0, 3)
}

export function releaseWebGlGradientTriangleResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlGradientTriangleResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, program, "a_color"),
  }
}

function buildTriangleVertexData(scene: WebGlGradientTriangleScene): Float32Array {
  const rotationRadians = (scene.rotation * Math.PI) / 180
  const cosine = Math.cos(rotationRadians)
  const sine = Math.sin(rotationRadians)
  const triangle = [
    rotateAndScale(-0.55, -0.42, scene.scale, cosine, sine),
    rotateAndScale(0.58, -0.36, scene.scale, cosine, sine),
    rotateAndScale(0, 0.64, scene.scale, cosine, sine),
  ]
  const accentRed = clamp(scene.red + scene.accent * 0.42)
  const accentGreen = clamp(scene.green + scene.accent * 0.22)
  const accentBlue = clamp(scene.blue + scene.accent * 0.1)

  return new Float32Array([
    triangle[0][0],
    triangle[0][1],
    accentRed,
    scene.green,
    scene.blue,
    1,
    triangle[1][0],
    triangle[1][1],
    scene.red,
    accentGreen,
    scene.blue,
    1,
    triangle[2][0],
    triangle[2][1],
    scene.red,
    scene.green,
    accentBlue,
    1,
  ])
}

function rotateAndScale(
  x: number,
  y: number,
  scale: number,
  cosine: number,
  sine: number,
): readonly [number, number] {
  const scaledX = x * scale
  const scaledY = y * scale

  return [scaledX * cosine - scaledY * sine, scaledX * sine + scaledY * cosine]
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 outColor;

void main() {
  outColor = v_color;
}`
