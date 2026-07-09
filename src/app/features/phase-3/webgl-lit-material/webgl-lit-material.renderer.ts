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

import { type WebGlLitMaterialScene } from "./webgl-lit-material.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 4
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlLitMaterialResources>()
const VERTEX_DATA = new Float32Array([
  -1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0, 1,
])

type WebGlLitMaterialResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly uvLocation: number
  readonly lightDirectionLocation: WebGLUniformLocation
  readonly baseColorLocation: WebGLUniformLocation
  readonly metalnessLocation: WebGLUniformLocation
  readonly roughnessLocation: WebGLUniformLocation
  readonly rimLocation: WebGLUniformLocation
}

export function renderWebGlLitMaterialScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlLitMaterialScene,
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
    resources.lightDirectionLocation,
    false,
    new Float32Array([
      lightDirection[0],
      lightDirection[1],
      lightDirection[2],
      baseColor[0],
      baseColor[1],
      baseColor[2],
      scene.metalness,
      scene.roughness,
      scene.rim,
    ]),
  )
  context.uniform1f(resources.baseColorLocation, scene.warmth)
  context.uniform1f(resources.metalnessLocation, scene.metalness)
  context.uniform1f(resources.roughnessLocation, scene.roughness)
  context.uniform1f(resources.rimLocation, scene.rim)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlLitMaterialResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlLitMaterialResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, VERTEX_DATA, context.STATIC_DRAW)

  return {
    program,
    vertexBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    uvLocation: createRequiredWebGlAttributeLocation(context, program, "a_uv"),
    lightDirectionLocation: createRequiredWebGlUniformLocation(context, program, "u_materialBlock"),
    baseColorLocation: createRequiredWebGlUniformLocation(context, program, "u_warmth"),
    metalnessLocation: createRequiredWebGlUniformLocation(context, program, "u_metalness"),
    roughnessLocation: createRequiredWebGlUniformLocation(context, program, "u_roughness"),
    rimLocation: createRequiredWebGlUniformLocation(context, program, "u_rim"),
  }
}

function normalizeLightDirection(scene: WebGlLitMaterialScene): readonly [number, number, number] {
  const x = scene.lightX * 2 - 1
  const y = scene.lightY * 2 - 1
  const z = 0.82
  const length = Math.hypot(x, y, z) || 1

  return [x / length, y / length, z / length] as const
}

function buildBaseColor(scene: WebGlLitMaterialScene): readonly [number, number, number] {
  return [
    0.26 + scene.warmth * 0.56,
    0.38 + scene.metalness * 0.34,
    0.62 + (1 - scene.roughness) * 0.24,
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
uniform float u_metalness;
uniform float u_roughness;
uniform float u_rim;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec2 centered = v_uv * 2.0 - 1.0;
  float radiusSq = dot(centered, centered);

  if (radiusSq > 1.0) {
    discard;
  }

  vec3 lightDirection = normalize(vec3(u_materialBlock[0][0], u_materialBlock[0][1], u_materialBlock[0][2]));
  vec3 baseColor = vec3(u_materialBlock[1][0], u_materialBlock[1][1], u_materialBlock[1][2]);
  vec3 normal = normalize(vec3(centered.x, -centered.y, sqrt(max(0.0, 1.0 - radiusSq))));
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 halfVector = normalize(lightDirection + viewDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specularPower = mix(8.0, 72.0, 1.0 - u_roughness);
  float specular = pow(max(dot(normal, halfVector), 0.0), specularPower);
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), mix(1.5, 4.5, u_rim));
  vec3 coolShadow = mix(baseColor * 0.24, baseColor * vec3(0.46, 0.56, 0.82), 1.0 - u_warmth);
  vec3 diffuseColor = mix(coolShadow, baseColor, diffuse);
  vec3 metallicSpecular = mix(vec3(1.0), baseColor, u_metalness);
  vec3 color = diffuseColor + metallicSpecular * specular * (0.18 + u_metalness * 0.52) + baseColor * rim * (0.12 + u_rim * 0.28);
  outColor = vec4(min(color, vec3(1.0)), 1.0);
}`
