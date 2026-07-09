import {
  configureWebGlClampTexture,
  createRequiredWebGlFramebuffer,
  createRequiredWebGlTexture,
  uploadWebGlRgbaTexture,
} from "./webgl-binding-resources"

export type WebGlRenderTargetResources = {
  readonly texture: WebGLTexture
  readonly framebuffer: WebGLFramebuffer
}

export function createWebGlRenderTargetResources(
  context: WebGL2RenderingContext,
  width: number,
  height: number,
): WebGlRenderTargetResources {
  const texture = createRequiredWebGlTexture(context)
  const framebuffer = createRequiredWebGlFramebuffer(context)

  configureWebGlClampTexture(context, texture)
  uploadWebGlRgbaTexture(context, texture, width, height, null)
  context.bindFramebuffer(context.FRAMEBUFFER, framebuffer)
  context.framebufferTexture2D(
    context.FRAMEBUFFER,
    context.COLOR_ATTACHMENT0,
    context.TEXTURE_2D,
    texture,
    0,
  )
  context.bindFramebuffer(context.FRAMEBUFFER, null)

  return { texture, framebuffer }
}

export function releaseWebGlRenderTargetResources(
  context: WebGL2RenderingContext,
  resources: WebGlRenderTargetResources,
): void {
  context.deleteFramebuffer(resources.framebuffer)
  context.deleteTexture(resources.texture)
}
