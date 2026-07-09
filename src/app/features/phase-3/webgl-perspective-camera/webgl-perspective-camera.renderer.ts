import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlUniformLocation,
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

import { type WebGlPerspectiveCameraScene } from "./webgl-perspective-camera.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 7
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlPerspectiveCameraResources>()
const PANEL_VERTEX_DATA = new Float32Array([
  -0.72, -0.44, -1.0, 1.0, 0.46, 0.22, 1, 0.72, -0.44, -1.0, 1.0, 0.46, 0.22, 1, 0.72, 0.44, -1.0,
  1.0, 0.78, 0.36, 1, -0.72, -0.44, -1.0, 1.0, 0.46, 0.22, 1, 0.72, 0.44, -1.0, 1.0, 0.78, 0.36, 1,
  -0.72, 0.44, -1.0, 1.0, 0.78, 0.36, 1,

  -0.58, -0.34, 0.0, 0.24, 0.7, 1.0, 1, 0.58, -0.34, 0.0, 0.24, 0.7, 1.0, 1, 0.58, 0.34, 0.0, 0.34,
  0.92, 1.0, 1, -0.58, -0.34, 0.0, 0.24, 0.7, 1.0, 1, 0.58, 0.34, 0.0, 0.34, 0.92, 1.0, 1, -0.58,
  0.34, 0.0, 0.34, 0.92, 1.0, 1,

  -0.44, -0.24, 1.0, 0.4, 1.0, 0.82, 1, 0.44, -0.24, 1.0, 0.4, 1.0, 0.82, 1, 0.44, 0.24, 1.0, 0.72,
  1.0, 0.94, 1, -0.44, -0.24, 1.0, 0.4, 1.0, 0.82, 1, 0.44, 0.24, 1.0, 0.72, 1.0, 0.94, 1, -0.44,
  0.24, 1.0, 0.72, 1.0, 0.94, 1,
])

type WebGlPerspectiveCameraResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly colorLocation: number
  readonly viewProjectionLocation: WebGLUniformLocation
  readonly depthLocation: WebGLUniformLocation
  readonly accentLocation: WebGLUniformLocation
}

export function renderWebGlPerspectiveCameraScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlPerspectiveCameraScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.program)
  context.bindBuffer(context.ARRAY_BUFFER, resources.vertexBuffer)
  enableInterleavedWebGlAttributes(context, FLOATS_PER_VERTEX, [
    { location: resources.positionLocation, size: 3, offsetFloats: 0 },
    { location: resources.colorLocation, size: 4, offsetFloats: 3 },
  ])
  context.uniformMatrix4fv(
    resources.viewProjectionLocation,
    false,
    buildViewProjectionMatrix(scene, canvas.width / Math.max(1, canvas.height)),
  )
  context.uniform1f(resources.depthLocation, scene.depth)
  context.uniform1f(resources.accentLocation, scene.accent)
  context.drawArrays(context.TRIANGLES, 0, PANEL_VERTEX_DATA.length / FLOATS_PER_VERTEX)
}

export function releaseWebGlPerspectiveCameraResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlPerspectiveCameraResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, PANEL_VERTEX_DATA, context.STATIC_DRAW)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, program, "a_color"),
    viewProjectionLocation: createRequiredWebGlUniformLocation(
      context,
      program,
      "u_viewProjection",
    ),
    depthLocation: createRequiredWebGlUniformLocation(context, program, "u_depth"),
    accentLocation: createRequiredWebGlUniformLocation(context, program, "u_accent"),
  }
}

function buildViewProjectionMatrix(
  scene: WebGlPerspectiveCameraScene,
  aspectRatio: number,
): Float32Array {
  const yaw = (scene.yaw * Math.PI) / 180
  const pitch = (scene.pitch * Math.PI) / 180
  const distance = scene.distance
  const cameraPosition: readonly [number, number, number] = [
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  ]
  const projection = buildPerspectiveMatrix((scene.fov * Math.PI) / 180, aspectRatio, 0.1, 12)
  const view = buildLookAtMatrix(cameraPosition, [0, 0, 0], [0, 1, 0])

  return multiplyMatrices(projection, view)
}

function buildPerspectiveMatrix(
  fovRadians: number,
  aspectRatio: number,
  near: number,
  far: number,
): Float32Array {
  const focalLength = 1 / Math.tan(fovRadians / 2)
  const rangeInverse = 1 / (near - far)

  return new Float32Array([
    focalLength / aspectRatio,
    0,
    0,
    0,
    0,
    focalLength,
    0,
    0,
    0,
    0,
    (near + far) * rangeInverse,
    -1,
    0,
    0,
    near * far * rangeInverse * 2,
    0,
  ])
}

function buildLookAtMatrix(
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number],
): Float32Array {
  const zAxis = normalizeVector(subtractVectors(eye, target))
  const xAxis = normalizeVector(crossProduct(up, zAxis))
  const yAxis = crossProduct(zAxis, xAxis)

  return new Float32Array([
    xAxis[0],
    yAxis[0],
    zAxis[0],
    0,
    xAxis[1],
    yAxis[1],
    zAxis[1],
    0,
    xAxis[2],
    yAxis[2],
    zAxis[2],
    0,
    -dotProduct(xAxis, eye),
    -dotProduct(yAxis, eye),
    -dotProduct(zAxis, eye),
    1,
  ])
}

function multiplyMatrices(left: Float32Array, right: Float32Array): Float32Array {
  const result = new Float32Array(16)

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0

      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index]
      }

      result[column * 4 + row] = sum
    }
  }

  return result
}

function subtractVectors(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): readonly [number, number, number] {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]] as const
}

function crossProduct(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ] as const
}

function dotProduct(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2]
}

function normalizeVector(
  vector: readonly [number, number, number],
): readonly [number, number, number] {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1
  return [vector[0] / length, vector[1] / length, vector[2] / length] as const
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 a_position;
in vec4 a_color;
uniform mat4 u_viewProjection;
uniform float u_depth;
out vec4 v_color;

void main() {
  vec3 positioned = vec3(a_position.xy, a_position.z * mix(0.55, 1.8, u_depth));
  gl_Position = u_viewProjection * vec4(positioned, 1.0);
  v_color = a_color;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform float u_accent;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 accent = mix(v_color.rgb, vec3(1.0, 0.96, 0.84), u_accent * 0.34);
  outColor = vec4(accent, v_color.a);
}`
