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

import { type WebGlDepthPrismScene } from "./webgl-depth-prism.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 10
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlDepthPrismResources>()
const PRISM_VERTEX_DATA = new Float32Array([
  -0.7, -0.6, 0.7, 0, 0, 1, 0.34, 0.72, 1.0, 1, 0.7, -0.6, 0.7, 0, 0, 1, 0.34, 0.72, 1.0, 1, 0.7,
  0.6, 0.7, 0, 0, 1, 0.48, 0.92, 1.0, 1, -0.7, -0.6, 0.7, 0, 0, 1, 0.34, 0.72, 1.0, 1, 0.7, 0.6,
  0.7, 0, 0, 1, 0.48, 0.92, 1.0, 1, -0.7, 0.6, 0.7, 0, 0, 1, 0.48, 0.92, 1.0, 1,

  -0.7, -0.6, -0.7, 0, 0, -1, 0.18, 0.28, 0.58, 1, 0.7, 0.6, -0.7, 0, 0, -1, 0.28, 0.42, 0.74, 1,
  0.7, -0.6, -0.7, 0, 0, -1, 0.18, 0.28, 0.58, 1, -0.7, -0.6, -0.7, 0, 0, -1, 0.18, 0.28, 0.58, 1,
  -0.7, 0.6, -0.7, 0, 0, -1, 0.28, 0.42, 0.74, 1, 0.7, 0.6, -0.7, 0, 0, -1, 0.28, 0.42, 0.74, 1,

  -0.7, -0.6, -0.7, -1, 0, 0, 0.22, 0.48, 0.88, 1, -0.7, -0.6, 0.7, -1, 0, 0, 0.28, 0.62, 1.0, 1,
  -0.7, 0.6, 0.7, -1, 0, 0, 0.4, 0.8, 1.0, 1, -0.7, -0.6, -0.7, -1, 0, 0, 0.22, 0.48, 0.88, 1, -0.7,
  0.6, 0.7, -1, 0, 0, 0.4, 0.8, 1.0, 1, -0.7, 0.6, -0.7, -1, 0, 0, 0.3, 0.64, 0.98, 1,

  0.7, -0.6, -0.7, 1, 0, 0, 0.2, 0.22, 0.52, 1, 0.7, 0.6, 0.7, 1, 0, 0, 0.36, 0.42, 0.84, 1, 0.7,
  -0.6, 0.7, 1, 0, 0, 0.28, 0.3, 0.66, 1, 0.7, -0.6, -0.7, 1, 0, 0, 0.2, 0.22, 0.52, 1, 0.7, 0.6,
  -0.7, 1, 0, 0, 0.28, 0.34, 0.7, 1, 0.7, 0.6, 0.7, 1, 0, 0, 0.36, 0.42, 0.84, 1,

  -0.7, 0.6, -0.7, 0, 1, 0, 0.52, 0.86, 1.0, 1, -0.7, 0.6, 0.7, 0, 1, 0, 0.62, 0.96, 1.0, 1, 0.7,
  0.6, 0.7, 0, 1, 0, 0.72, 1.0, 1.0, 1, -0.7, 0.6, -0.7, 0, 1, 0, 0.52, 0.86, 1.0, 1, 0.7, 0.6, 0.7,
  0, 1, 0, 0.72, 1.0, 1.0, 1, 0.7, 0.6, -0.7, 0, 1, 0, 0.62, 0.94, 1.0, 1,

  -0.7, -0.6, -0.7, 0, -1, 0, 0.12, 0.16, 0.36, 1, 0.7, -0.6, 0.7, 0, -1, 0, 0.2, 0.26, 0.5, 1,
  -0.7, -0.6, 0.7, 0, -1, 0, 0.18, 0.24, 0.44, 1, -0.7, -0.6, -0.7, 0, -1, 0, 0.12, 0.16, 0.36, 1,
  0.7, -0.6, -0.7, 0, -1, 0, 0.14, 0.18, 0.4, 1, 0.7, -0.6, 0.7, 0, -1, 0, 0.2, 0.26, 0.5, 1,
])

type WebGlDepthPrismResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly normalLocation: number
  readonly colorLocation: number
  readonly viewProjectionLocation: WebGLUniformLocation
  readonly liftLocation: WebGLUniformLocation
  readonly spreadLocation: WebGLUniformLocation
  readonly accentLocation: WebGLUniformLocation
}

export function renderWebGlDepthPrismScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlDepthPrismScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  context.viewport(0, 0, canvas.width, canvas.height)
  context.enable(context.DEPTH_TEST)
  context.depthFunc(context.LESS)
  context.clearDepth(1)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)
  context.useProgram(resources.program)
  context.bindBuffer(context.ARRAY_BUFFER, resources.vertexBuffer)
  enableInterleavedWebGlAttributes(context, FLOATS_PER_VERTEX, [
    { location: resources.positionLocation, size: 3, offsetFloats: 0 },
    { location: resources.normalLocation, size: 3, offsetFloats: 3 },
    { location: resources.colorLocation, size: 4, offsetFloats: 6 },
  ])
  context.uniformMatrix4fv(
    resources.viewProjectionLocation,
    false,
    buildViewProjectionMatrix(scene, canvas.width / Math.max(1, canvas.height)),
  )
  context.uniform1f(resources.liftLocation, scene.prismLift)
  context.uniform1f(resources.spreadLocation, scene.prismSpread)
  context.uniform1f(resources.accentLocation, scene.accent)
  context.drawArrays(context.TRIANGLES, 0, PRISM_VERTEX_DATA.length / FLOATS_PER_VERTEX)
}

export function releaseWebGlDepthPrismResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlDepthPrismResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, PRISM_VERTEX_DATA, context.STATIC_DRAW)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    normalLocation: createRequiredWebGlAttributeLocation(context, program, "a_normal"),
    colorLocation: createRequiredWebGlAttributeLocation(context, program, "a_color"),
    viewProjectionLocation: createRequiredWebGlUniformLocation(
      context,
      program,
      "u_viewProjection",
    ),
    liftLocation: createRequiredWebGlUniformLocation(context, program, "u_lift"),
    spreadLocation: createRequiredWebGlUniformLocation(context, program, "u_spread"),
    accentLocation: createRequiredWebGlUniformLocation(context, program, "u_accent"),
  }
}

function buildViewProjectionMatrix(scene: WebGlDepthPrismScene, aspectRatio: number): Float32Array {
  const yaw = (scene.yaw * Math.PI) / 180
  const pitch = (scene.pitch * Math.PI) / 180
  const distance = scene.distance
  const eye: readonly [number, number, number] = [
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  ]

  return multiplyMatrices(
    buildPerspectiveMatrix((54 * Math.PI) / 180, aspectRatio, 0.1, 16),
    buildLookAtMatrix(eye, [0, scene.prismLift * 0.4, 0], [0, 1, 0]),
  )
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
in vec3 a_normal;
in vec4 a_color;
uniform mat4 u_viewProjection;
uniform float u_lift;
uniform float u_spread;
out vec3 v_normal;
out vec4 v_color;

void main() {
  vec3 scaled = vec3(a_position.xy * mix(0.72, 1.18, u_spread), a_position.z * mix(0.52, 1.4, u_lift));
  vec3 translated = scaled + vec3(0.0, (scaled.z + 0.7) * u_lift * 0.42, 0.0);
  gl_Position = u_viewProjection * vec4(translated, 1.0);
  v_normal = a_normal;
  v_color = a_color;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform float u_accent;
in vec3 v_normal;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(vec3(0.48, 0.72, 0.56));
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float lift = pow(1.0 - max(normal.z, 0.0), 2.0);
  vec3 tint = mix(v_color.rgb, vec3(1.0, 0.94, 0.86), u_accent * 0.36 + lift * 0.22);
  vec3 shaded = tint * (0.24 + diffuse * 0.78) + vec3(0.06, 0.1, 0.16) * lift;
  outColor = vec4(shaded, v_color.a);
}`
