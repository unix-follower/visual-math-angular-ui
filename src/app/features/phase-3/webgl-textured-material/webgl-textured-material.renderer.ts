import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  configureWebGlClampTexture,
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlTexture,
  createRequiredWebGlUniformLocation,
  enableInterleavedWebGlAttributes,
  uploadWebGlRgbaTexture,
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

import { type WebGlTexturedMaterialScene } from "./webgl-textured-material.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 4
const TEXTURE_SIZE = 8
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlTexturedMaterialResources>()
const VERTEX_DATA = new Float32Array([
  -0.9, -0.62, 0, 0, 0.9, -0.62, 1, 0, 0.9, 0.62, 1, 1, -0.9, -0.62, 0, 0, 0.9, 0.62, 1, 1, -0.9,
  0.62, 0, 1,
])

type WebGlTexturedMaterialResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly texture: WebGLTexture
  readonly positionLocation: number
  readonly uvLocation: number
  readonly materialLocation: WebGLUniformLocation
  readonly textureLocation: WebGLUniformLocation
  readonly warmthLocation: WebGLUniformLocation
  readonly textureMixLocation: WebGLUniformLocation
  readonly reliefLocation: WebGLUniformLocation
  readonly glossLocation: WebGLUniformLocation
}

export function renderWebGlTexturedMaterialScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlTexturedMaterialScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )
  const primaryLight = normalizeLightDirection(scene.lightX, scene.lightY, 0.82)
  const fillLight = normalizeLightDirection(
    1 - scene.lightX * 0.78,
    1 - scene.lightY * 0.64,
    0.56 + scene.fill * 0.28,
  )
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
  context.activeTexture(context.TEXTURE0)
  uploadWebGlRgbaTexture(
    context,
    resources.texture,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    buildTexturePixels(scene),
  )
  context.uniformMatrix3fv(
    resources.materialLocation,
    false,
    new Float32Array([
      primaryLight[0],
      primaryLight[1],
      primaryLight[2],
      fillLight[0],
      fillLight[1],
      fillLight[2],
      baseColor[0],
      baseColor[1],
      baseColor[2],
    ]),
  )
  context.uniform1i(resources.textureLocation, 0)
  context.uniform1f(resources.warmthLocation, scene.warmth)
  context.uniform1f(resources.textureMixLocation, scene.textureMix)
  context.uniform1f(resources.reliefLocation, scene.relief)
  context.uniform1f(resources.glossLocation, scene.gloss)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlTexturedMaterialResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteTexture(resources.texture)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlTexturedMaterialResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)
  const texture = createRequiredWebGlTexture(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, VERTEX_DATA, context.STATIC_DRAW)
  configureWebGlClampTexture(context, texture)

  return {
    program,
    vertexBuffer,
    texture,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    uvLocation: createRequiredWebGlAttributeLocation(context, program, "a_uv"),
    materialLocation: createRequiredWebGlUniformLocation(context, program, "u_materialBlock"),
    textureLocation: createRequiredWebGlUniformLocation(context, program, "u_texture"),
    warmthLocation: createRequiredWebGlUniformLocation(context, program, "u_warmth"),
    textureMixLocation: createRequiredWebGlUniformLocation(context, program, "u_textureMix"),
    reliefLocation: createRequiredWebGlUniformLocation(context, program, "u_relief"),
    glossLocation: createRequiredWebGlUniformLocation(context, program, "u_gloss"),
  }
}

function buildTexturePixels(scene: WebGlTexturedMaterialScene): Uint8Array {
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

  for (let row = 0; row < TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < TEXTURE_SIZE; column += 1) {
      const index = (row * TEXTURE_SIZE + column) * 4
      const u = column / Math.max(1, TEXTURE_SIZE - 1)
      const v = row / Math.max(1, TEXTURE_SIZE - 1)
      const checker = (row + column) % 2 === 0 ? 1 : -1
      const ridge =
        (Math.sin((u + scene.textureMix) * Math.PI * 4) +
          Math.cos((v + scene.relief) * Math.PI * 5)) *
          0.25 +
        0.5
      const plate = 0.5 + checker * 0.22 + scene.warmth * 0.18

      pixels[index] = Math.round(clamp(0.18 + ridge * 0.58 + scene.warmth * 0.24) * 255)
      pixels[index + 1] = Math.round(clamp(0.24 + plate * 0.42 + scene.textureMix * 0.14) * 255)
      pixels[index + 2] = Math.round(clamp(0.32 + ridge * 0.44 + scene.relief * 0.18) * 255)
      pixels[index + 3] = 255
    }
  }

  return pixels
}

function buildBaseColor(scene: WebGlTexturedMaterialScene): readonly [number, number, number] {
  return [
    0.24 + scene.warmth * 0.6,
    0.34 + scene.textureMix * 0.28,
    0.52 + scene.relief * 0.32,
  ] as const
}

function normalizeLightDirection(
  x: number,
  y: number,
  z: number,
): readonly [number, number, number] {
  const shiftedX = x * 2 - 1
  const shiftedY = y * 2 - 1
  const length = Math.hypot(shiftedX, shiftedY, z) || 1

  return [shiftedX / length, shiftedY / length, z / length] as const
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
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
uniform sampler2D u_texture;
uniform float u_warmth;
uniform float u_textureMix;
uniform float u_relief;
uniform float u_gloss;
in vec2 v_uv;
out vec4 outColor;

float heightAt(vec2 uv) {
  vec3 sampleColor = texture(u_texture, uv).rgb;
  return dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec3 primaryLight = normalize(vec3(u_materialBlock[0][0], u_materialBlock[0][1], u_materialBlock[0][2]));
  vec3 fillLight = normalize(vec3(u_materialBlock[1][0], u_materialBlock[1][1], u_materialBlock[1][2]));
  vec3 baseColor = vec3(u_materialBlock[2][0], u_materialBlock[2][1], u_materialBlock[2][2]);
  vec3 albedo = texture(u_texture, v_uv).rgb;
  float stepX = 1.0 / 256.0;
  float stepY = 1.0 / 256.0;
  float hx = heightAt(v_uv + vec2(stepX, 0.0)) - heightAt(v_uv - vec2(stepX, 0.0));
  float hy = heightAt(v_uv + vec2(0.0, stepY)) - heightAt(v_uv - vec2(0.0, stepY));
  vec3 normal = normalize(vec3(-hx * mix(1.0, 6.0, u_relief), hy * mix(1.0, 6.0, u_relief), 1.0));
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 primaryHalf = normalize(primaryLight + viewDirection);
  vec3 fillHalf = normalize(fillLight + viewDirection);
  float primaryDiffuse = max(dot(normal, primaryLight), 0.0);
  float fillDiffuse = max(dot(normal, fillLight), 0.0);
  float primarySpecular = pow(max(dot(normal, primaryHalf), 0.0), mix(10.0, 64.0, u_gloss));
  float fillSpecular = pow(max(dot(normal, fillHalf), 0.0), mix(6.0, 30.0, u_gloss)) * 0.42;
  vec3 materialColor = mix(baseColor, albedo, u_textureMix);
  vec3 shadowColor = mix(materialColor * vec3(0.18, 0.2, 0.28), materialColor * 0.42, u_warmth);
  vec3 diffuseColor = mix(shadowColor, materialColor, primaryDiffuse);
  diffuseColor += materialColor * fillDiffuse * (0.12 + u_warmth * 0.18);
  vec3 specularColor = vec3(1.0, 0.96, 0.9) * primarySpecular + materialColor * fillSpecular;
  outColor = vec4(min(diffuseColor + specularColor, vec3(1.0)), 1.0);
}`
