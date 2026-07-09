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

import { type WebGlIndexedPolygonScene } from "./webgl-indexed-polygon.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 6
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlIndexedPolygonResources>()

type WebGlIndexedPolygonResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly indexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly colorLocation: number
}

export function renderWebGlIndexedPolygonScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlIndexedPolygonScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )
  const geometry = buildIndexedPolygonGeometry(scene)

  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.program)
  context.bindBuffer(context.ARRAY_BUFFER, resources.vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, geometry.vertexData, context.STATIC_DRAW)
  enableInterleavedWebGlAttributes(context, FLOATS_PER_VERTEX, [
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.colorLocation, size: 4, offsetFloats: 2 },
  ])
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, resources.indexBuffer)
  context.bufferData(context.ELEMENT_ARRAY_BUFFER, geometry.indexData, context.STATIC_DRAW)
  context.drawElements(context.TRIANGLES, geometry.indexData.length, context.UNSIGNED_SHORT, 0)
}

export function releaseWebGlIndexedPolygonResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteBuffer(resources.indexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlIndexedPolygonResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)
  const indexBuffer = createRequiredWebGlBuffer(context)

  return {
    program,
    vertexBuffer,
    indexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, program, "a_color"),
  }
}

function buildIndexedPolygonGeometry(scene: WebGlIndexedPolygonScene): {
  readonly vertexData: Float32Array
  readonly indexData: Uint16Array
} {
  const rotationRadians = (scene.rotation * Math.PI) / 180
  const vertices: number[] = [
    0,
    0,
    clamp(scene.red + scene.intensity * 0.38),
    clamp(scene.green + scene.intensity * 0.26),
    clamp(scene.blue + scene.intensity * 0.16),
    1,
  ]
  const indices: number[] = []

  for (let index = 0; index < scene.sides; index += 1) {
    const ratio = index / scene.sides
    const angle = rotationRadians + ratio * Math.PI * 2
    const wave = (Math.sin(angle * 2) + 1) / 2
    const accent = scene.intensity * wave

    vertices.push(
      Math.cos(angle) * scene.radius,
      Math.sin(angle) * scene.radius,
      clamp(scene.red + accent * 0.28),
      clamp(scene.green + (1 - wave) * scene.intensity * 0.22),
      clamp(scene.blue + scene.intensity * 0.14),
      1,
    )

    const current = index + 1
    const next = ((index + 1) % scene.sides) + 1
    indices.push(0, current, next)
  }

  return {
    vertexData: new Float32Array(vertices),
    indexData: new Uint16Array(indices),
  }
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
