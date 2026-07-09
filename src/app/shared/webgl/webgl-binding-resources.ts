export type WebGlInterleavedAttributeBinding = {
  readonly location: number
  readonly size: number
  readonly offsetFloats: number
  readonly normalized?: boolean
}

export function createRequiredWebGlAttributeLocation(
  context: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): number {
  const location = context.getAttribLocation(program, name)

  if (location < 0) {
    throw new Error(`WebGL attribute lookup failed for ${name}.`)
  }

  return location
}

export function createRequiredWebGlUniformLocation(
  context: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = context.getUniformLocation(program, name)

  if (!location) {
    throw new Error(`WebGL uniform lookup failed for ${name}.`)
  }

  return location
}

export function createRequiredWebGlTexture(context: WebGL2RenderingContext): WebGLTexture {
  const texture = context.createTexture()

  if (!texture) {
    throw new Error("WebGL texture creation failed.")
  }

  return texture
}

export function createRequiredWebGlFramebuffer(context: WebGL2RenderingContext): WebGLFramebuffer {
  const framebuffer = context.createFramebuffer()

  if (!framebuffer) {
    throw new Error("WebGL framebuffer creation failed.")
  }

  return framebuffer
}

export function configureWebGlClampTexture(
  context: WebGL2RenderingContext,
  texture: WebGLTexture,
): void {
  context.bindTexture(context.TEXTURE_2D, texture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
}

export function uploadWebGlRgbaTexture(
  context: WebGL2RenderingContext,
  texture: WebGLTexture,
  width: number,
  height: number,
  pixels: ArrayBufferView | null,
): void {
  context.bindTexture(context.TEXTURE_2D, texture)
  context.texImage2D(
    context.TEXTURE_2D,
    0,
    context.RGBA,
    width,
    height,
    0,
    context.RGBA,
    context.UNSIGNED_BYTE,
    pixels,
  )
}

export function enableInterleavedWebGlAttributes(
  context: WebGL2RenderingContext,
  strideFloats: number,
  bindings: readonly WebGlInterleavedAttributeBinding[],
): void {
  const strideBytes = strideFloats * Float32Array.BYTES_PER_ELEMENT

  for (const binding of bindings) {
    context.enableVertexAttribArray(binding.location)
    context.vertexAttribPointer(
      binding.location,
      binding.size,
      context.FLOAT,
      binding.normalized ?? false,
      strideBytes,
      binding.offsetFloats * Float32Array.BYTES_PER_ELEMENT,
    )
  }
}
