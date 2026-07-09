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

import { type WebGlTextureGridScene } from "./webgl-texture-grid.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const FLOATS_PER_VERTEX = 4
const TEXTURE_SIZE = 4
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlTextureGridResources>()
const QUAD_VERTEX_DATA = new Float32Array([
  -0.76, -0.56, 0, 0, 0.76, -0.56, 1, 0, 0.76, 0.56, 1, 1, -0.76, -0.56, 0, 0, 0.76, 0.56, 1, 1,
  -0.76, 0.56, 0, 1,
])

type WebGlTextureGridResources = {
  readonly program: WebGLProgram
  readonly vertexBuffer: WebGLBuffer
  readonly texture: WebGLTexture
  readonly positionLocation: number
  readonly texCoordLocation: number
  readonly textureLocation: WebGLUniformLocation
}

export function renderWebGlTextureGridScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlTextureGridScene,
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
    { location: resources.texCoordLocation, size: 2, offsetFloats: 2 },
  ])
  context.activeTexture(context.TEXTURE0)
  uploadWebGlRgbaTexture(
    context,
    resources.texture,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    buildTexturePixels(scene),
  )
  context.uniform1i(resources.textureLocation, 0)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlTextureGridResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.vertexBuffer)
    runtime.context.deleteTexture(resources.texture)
    runtime.context.deleteProgram(resources.program)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlTextureGridResources {
  const program = createLinkedWebGlProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
  const vertexBuffer = createRequiredWebGlBuffer(context)
  const texture = createRequiredWebGlTexture(context)

  context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer)
  context.bufferData(context.ARRAY_BUFFER, QUAD_VERTEX_DATA, context.STATIC_DRAW)
  configureWebGlClampTexture(context, texture)

  return {
    program,
    vertexBuffer,
    texture,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    texCoordLocation: createRequiredWebGlAttributeLocation(context, program, "a_texCoord"),
    textureLocation: createRequiredWebGlUniformLocation(context, program, "u_texture"),
  }
}

function buildTexturePixels(scene: WebGlTextureGridScene): Uint8Array {
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

  for (let row = 0; row < TEXTURE_SIZE; row += 1) {
    for (let column = 0; column < TEXTURE_SIZE; column += 1) {
      const index = (row * TEXTURE_SIZE + column) * 4
      const checker = (row + column) % 2 === 0 ? 1 : -1
      const diagonal = (row + column) / (TEXTURE_SIZE * 2 - 2)
      const wave = (Math.sin((row + column + 1) * scene.frequency * Math.PI) + 1) / 2
      const contrastMix = 0.5 + checker * scene.contrast * 0.5
      const blendMix = contrastMix * (1 - scene.blend) + diagonal * scene.blend

      pixels[index] = Math.round(clamp(scene.red + blendMix * 0.82 + wave * 0.08) * 255)
      pixels[index + 1] = Math.round(
        clamp(scene.green + contrastMix * 0.58 + diagonal * 0.12) * 255,
      )
      pixels[index + 2] = Math.round(clamp(scene.blue + wave * 0.52 + scene.blend * 0.12) * 255)
      pixels[index + 3] = 255
    }
  }

  return pixels
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texCoord);
}`
