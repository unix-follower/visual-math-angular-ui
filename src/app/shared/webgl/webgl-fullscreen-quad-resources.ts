import {
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlUniformLocation,
  createRequiredWebGlTexture,
  enableInterleavedWebGlAttributes,
} from "./webgl-binding-resources"
import { createRequiredWebGlBuffer } from "./webgl-program-resources"

const FULLSCREEN_QUAD_STRIDE = 4
const FULLSCREEN_QUAD_VERTEX_DATA = new Float32Array([
  -1, -1, 0, 0, 1, -1, 1, 0, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, -1, 1, 0, 1,
])

export type WebGlFullscreenTextureQuadResources = {
  readonly quadBuffer: WebGLBuffer
  readonly positionLocation: number
  readonly texCoordLocation: number
  readonly sourceTextureLocation: WebGLUniformLocation
}

export function createWebGlFullscreenTextureQuadResources(
  context: WebGL2RenderingContext,
  program: WebGLProgram,
): WebGlFullscreenTextureQuadResources {
  const quadBuffer = createRequiredWebGlBuffer(context)

  context.bindBuffer(context.ARRAY_BUFFER, quadBuffer)
  context.bufferData(context.ARRAY_BUFFER, FULLSCREEN_QUAD_VERTEX_DATA, context.STATIC_DRAW)

  return {
    quadBuffer,
    positionLocation: createRequiredWebGlAttributeLocation(context, program, "a_position"),
    texCoordLocation: createRequiredWebGlAttributeLocation(context, program, "a_texCoord"),
    sourceTextureLocation: createRequiredWebGlUniformLocation(context, program, "u_texture"),
  }
}

export function bindWebGlFullscreenTextureQuad(
  context: WebGL2RenderingContext,
  resources: WebGlFullscreenTextureQuadResources,
  texture: WebGLTexture,
): void {
  context.bindBuffer(context.ARRAY_BUFFER, resources.quadBuffer)
  enableInterleavedWebGlAttributes(context, FULLSCREEN_QUAD_STRIDE, [
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.texCoordLocation, size: 2, offsetFloats: 2 },
  ])
  context.activeTexture(context.TEXTURE0)
  context.bindTexture(context.TEXTURE_2D, texture)
  context.uniform1i(resources.sourceTextureLocation, 0)
}

export function createRequiredWebGlQuadTexture(context: WebGL2RenderingContext): WebGLTexture {
  return createRequiredWebGlTexture(context)
}
