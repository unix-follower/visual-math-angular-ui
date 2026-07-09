import { createRequiredWebGlUniformLocation } from "./webgl-binding-resources"
import {
  bindWebGlFullscreenTextureQuad,
  createWebGlFullscreenTextureQuadResources,
  type WebGlFullscreenTextureQuadResources,
} from "./webgl-fullscreen-quad-resources"

export type WebGlFullscreenPostProcessResources<TUniformName extends string = string> = {
  readonly quad: WebGlFullscreenTextureQuadResources
  readonly uniformLocations: Readonly<Record<TUniformName, WebGLUniformLocation>>
}

export function createWebGlFullscreenPostProcessResources<TUniformName extends string>(
  context: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformNames: readonly TUniformName[],
): WebGlFullscreenPostProcessResources<TUniformName> {
  const uniformLocations = {} as Record<TUniformName, WebGLUniformLocation>

  for (const uniformName of uniformNames) {
    uniformLocations[uniformName] = createRequiredWebGlUniformLocation(
      context,
      program,
      uniformName,
    )
  }

  return {
    quad: createWebGlFullscreenTextureQuadResources(context, program),
    uniformLocations,
  }
}

export function bindWebGlFullscreenPostProcessTexture(
  context: WebGL2RenderingContext,
  resources: WebGlFullscreenPostProcessResources,
  texture: WebGLTexture,
): void {
  bindWebGlFullscreenTextureQuad(context, resources.quad, texture)
}
