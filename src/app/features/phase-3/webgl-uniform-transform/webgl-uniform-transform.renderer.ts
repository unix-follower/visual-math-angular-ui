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

import { type WebGlUniformTransformScene } from "./webgl-uniform-transform.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 6
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlUniformTransformResources>()
const STATIC_VERTEX_DATA = new Float32Array([
  -0.52, -0.38, 0.88, 0.34, 0.28, 1, 0.48, -0.38, 0.22, 0.76, 0.94, 1, 0.48, 0.34, 0.22, 0.76, 0.94,
  1, -0.52, -0.38, 0.88, 0.34, 0.28, 1, 0.48, 0.34, 0.22, 0.76, 0.94, 1, -0.52, 0.34, 0.96, 0.88,
  0.3, 1,
])

type WebGlUniformTransformResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly colorLocation: number
  readonly transformLocation: WebGLUniformLocation
  readonly accentLocation: WebGLUniformLocation
}

export function renderWebGlUniformTransformScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlUniformTransformScene,
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
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.colorLocation, size: 4, offsetFloats: 2 },
  ])
  context.uniformMatrix3fv(resources.transformLocation, false, buildTransformMatrix(scene))
  context.uniform1f(resources.accentLocation, scene.accent)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlUniformTransformResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlUniformTransformResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)
  const transformLocation = createRequiredWebGlUniformLocation(context, program, "u_transform")
  const accentLocation = createRequiredWebGlUniformLocation(context, program, "u_accent")

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, STATIC_VERTEX_DATA, context.STATIC_DRAW)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, program, "a_color"),
    transformLocation,
    accentLocation,
  }
}

function buildTransformMatrix(scene: WebGlUniformTransformScene): Float32Array {
  const rotationRadians = (scene.rotation * Math.PI) / 180
  const cosine = Math.cos(rotationRadians) * scene.scale
  const sine = Math.sin(rotationRadians) * scene.scale

  return new Float32Array([cosine, sine, 0, -sine, cosine, 0, scene.offsetX, scene.offsetY, 1])
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform mat3 u_transform;
out vec4 v_color;

void main() {
  vec3 transformed = u_transform * vec3(a_position, 1.0);
  gl_Position = vec4(transformed.xy, 0.0, 1.0);
  v_color = a_color;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform float u_accent;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 accentColor = mix(v_color.rgb, vec3(1.0, 0.95, 0.72), u_accent * 0.32);
  outColor = vec4(accentColor, v_color.a);
}`
