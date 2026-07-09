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

import { type WebGlShadowReliefScene } from "./webgl-shadow-relief.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 4
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlShadowReliefResources>()
const VERTEX_DATA = new Float32Array([
  -1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0, 1,
])

type WebGlShadowReliefResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly uvLocation: number
  readonly materialLocation: WebGLUniformLocation
  readonly warmthLocation: WebGLUniformLocation
  readonly reliefLocation: WebGLUniformLocation
  readonly shadowLocation: WebGLUniformLocation
  readonly glossLocation: WebGLUniformLocation
}

export function renderWebGlShadowReliefScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlShadowReliefScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )
  const lightDirection = normalizeLightDirection(scene)
  const baseColor = buildBaseColor(scene)

  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.program)
  context.bindBuffer(context.ARRAY_BUFFER, resources.vertexBuffer)
  enableInterleavedWebGlAttributes(context, FLOATS_PER_VERTEX, [
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.uvLocation, size: 2, offsetFloats: 2 },
  ])
  context.uniformMatrix3fv(
    resources.materialLocation,
    false,
    new Float32Array([
      lightDirection[0],
      lightDirection[1],
      lightDirection[2],
      baseColor[0],
      baseColor[1],
      baseColor[2],
      scene.relief,
      scene.shadow,
      scene.gloss,
    ]),
  )
  context.uniform1f(resources.warmthLocation, scene.warmth)
  context.uniform1f(resources.reliefLocation, scene.relief)
  context.uniform1f(resources.shadowLocation, scene.shadow)
  context.uniform1f(resources.glossLocation, scene.gloss)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlShadowReliefResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlShadowReliefResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, VERTEX_DATA, context.STATIC_DRAW)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    uvLocation: createRequiredWebGlAttributeLocation(context, program, "a_uv"),
    materialLocation: createRequiredWebGlUniformLocation(context, program, "u_materialBlock"),
    warmthLocation: createRequiredWebGlUniformLocation(context, program, "u_warmth"),
    reliefLocation: createRequiredWebGlUniformLocation(context, program, "u_relief"),
    shadowLocation: createRequiredWebGlUniformLocation(context, program, "u_shadow"),
    glossLocation: createRequiredWebGlUniformLocation(context, program, "u_gloss"),
  }
}

function normalizeLightDirection(scene: WebGlShadowReliefScene): readonly [number, number, number] {
  const x = scene.lightX * 2 - 1
  const y = scene.lightY * 2 - 1
  const z = 0.78
  const length = Math.hypot(x, y, z) || 1

  return [x / length, y / length, z / length] as const
}

function buildBaseColor(scene: WebGlShadowReliefScene): readonly [number, number, number] {
  return [
    0.24 + scene.warmth * 0.58,
    0.34 + scene.relief * 0.26,
    0.54 + scene.shadow * 0.28,
  ] as const
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform mat3 u_materialBlock;
uniform float u_warmth;
uniform float u_relief;
uniform float u_shadow;
uniform float u_gloss;
in vec2 v_uv;
out vec4 outColor;

float heightAt(vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float ridge = sin(centered.x * 8.0) * cos(centered.y * 7.0);
  float basin = exp(-3.6 * dot(centered, centered));
  float diagonal = sin((centered.x + centered.y) * 5.5 + 0.7);
  return basin * (0.42 + ridge * 0.28) + diagonal * 0.08 * u_relief;
}

void main() {
  vec2 centered = v_uv * 2.0 - 1.0;
  float vignette = smoothstep(1.18, 0.22, dot(centered, centered));
  float height = heightAt(v_uv);
  float stepX = 1.0 / 320.0;
  float stepY = 1.0 / 240.0;
  float hx = heightAt(v_uv + vec2(stepX, 0.0)) - heightAt(v_uv - vec2(stepX, 0.0));
  float hy = heightAt(v_uv + vec2(0.0, stepY)) - heightAt(v_uv - vec2(0.0, stepY));

  vec3 lightDirection = normalize(vec3(u_materialBlock[0][0], u_materialBlock[0][1], u_materialBlock[0][2]));
  vec3 baseColor = vec3(u_materialBlock[1][0], u_materialBlock[1][1], u_materialBlock[1][2]);
  vec3 normal = normalize(vec3(-hx * mix(1.2, 4.0, u_relief), hy * mix(1.2, 4.0, u_relief), 1.0));
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 halfVector = normalize(lightDirection + viewDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(normal, halfVector), 0.0), mix(10.0, 72.0, u_gloss));
  float selfShadow = smoothstep(-0.38, 0.58, diffuse + height * mix(0.2, 0.68, u_shadow));
  float crevice = smoothstep(0.12, 0.86, height * (0.5 + u_shadow) + diffuse * 0.32);
  vec3 shadowColor = mix(baseColor * vec3(0.18, 0.22, 0.34), baseColor * 0.42, u_warmth);
  vec3 litColor = mix(shadowColor, baseColor, selfShadow);
  vec3 reliefTint = mix(litColor, litColor * vec3(1.18, 1.1, 0.96), crevice * 0.28 + specular * 0.12);
  vec3 color = reliefTint + vec3(1.0, 0.96, 0.88) * specular * (0.18 + u_gloss * 0.42);
  color = mix(baseColor * 0.22, color, vignette);
  outColor = vec4(min(color, vec3(1.0)), 1.0);
}`
