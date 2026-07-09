import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlUniformLocation,
  enableInterleavedWebGlAttributes,
} from "../../../shared/webgl/webgl-binding-resources"
import {
  bindWebGlFullscreenTextureQuad,
  createWebGlFullscreenTextureQuadResources,
  type WebGlFullscreenTextureQuadResources,
} from "../../../shared/webgl/webgl-fullscreen-quad-resources"
import {
  bindWebGlFullscreenPostProcessTexture,
  createWebGlFullscreenPostProcessResources,
  type WebGlFullscreenPostProcessResources,
} from "../../../shared/webgl/webgl-post-process-resources"
import {
  createLinkedWebGlProgram,
  createRequiredWebGlBuffer,
} from "../../../shared/webgl/webgl-program-resources"
import {
  getOrCreateCachedWebGlResources,
  releaseCachedWebGlResources,
  syncWebGlCanvasSize,
} from "../../../shared/webgl/webgl-renderer-resources"
import {
  createWebGlRenderTargetResources,
  releaseWebGlRenderTargetResources,
  type WebGlRenderTargetResources,
} from "../../../shared/webgl/webgl-render-target-resources"

import { type WebGlBloomBlurScene } from "./webgl-bloom-blur.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GEOMETRY_STRIDE = 6
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlBloomBlurResources>()
const GEOMETRY_VERTEX_DATA = new Float32Array([
  0.0, -0.72, 1.0, 0.38, 0.16, 1, 0.44, -0.18, 0.94, 0.72, 0.28, 1, 0.18, 0.68, 0.96, 0.92, 0.4, 1,
  0.0, -0.72, 1.0, 0.38, 0.16, 1, 0.18, 0.68, 0.96, 0.92, 0.4, 1, -0.26, 0.62, 0.34, 0.82, 1.0, 1,
  0.0, -0.72, 1.0, 0.38, 0.16, 1, -0.26, 0.62, 0.34, 0.82, 1.0, 1, -0.58, -0.08, 0.22, 0.52, 0.96,
  1,
])

type WebGlBloomBlurResources = {
  readonly firstProgram: WebGLProgram
  readonly secondProgram: WebGLProgram
  readonly geometryBuffer: WebGLBuffer
  readonly compositePass: WebGlFullscreenPostProcessResources<"u_blur" | "u_mix">
  readonly renderTarget: WebGlRenderTargetResources
  readonly firstPositionLocation: number
  readonly firstColorLocation: number
  readonly glowLocation: WebGLUniformLocation
}

export function renderWebGlBloomBlurScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlBloomBlurScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  context.bindFramebuffer(context.FRAMEBUFFER, resources.renderTarget.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.firstProgram)
  context.bindBuffer(context.ARRAY_BUFFER, resources.geometryBuffer)
  enableInterleavedWebGlAttributes(context, GEOMETRY_STRIDE, [
    { location: resources.firstPositionLocation, size: 2, offsetFloats: 0 },
    { location: resources.firstColorLocation, size: 4, offsetFloats: 2 },
  ])
  context.uniform1f(resources.glowLocation, scene.glow)
  context.drawArrays(context.TRIANGLES, 0, 9)

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.secondProgram)
  bindWebGlFullscreenPostProcessTexture(
    context,
    resources.compositePass,
    resources.renderTarget.texture,
  )
  context.uniform1f(resources.compositePass.uniformLocations.u_blur, scene.blur)
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlBloomBlurResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.geometryBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.renderTarget)
    runtime.context.deleteProgram(resources.firstProgram)
    runtime.context.deleteProgram(resources.secondProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlBloomBlurResources {
  const firstProgram = createLinkedWebGlProgram(
    context,
    FIRST_PASS_VERTEX_SHADER,
    FIRST_PASS_FRAGMENT_SHADER,
  )
  const secondProgram = createLinkedWebGlProgram(
    context,
    SECOND_PASS_VERTEX_SHADER,
    SECOND_PASS_FRAGMENT_SHADER,
  )
  const geometryBuffer = createRequiredWebGlBuffer(context)
  const compositePass = createWebGlFullscreenPostProcessResources(context, secondProgram, [
    "u_blur",
    "u_mix",
  ] as const)
  const renderTarget = createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE)

  context.bindBuffer(context.ARRAY_BUFFER, geometryBuffer)
  context.bufferData(context.ARRAY_BUFFER, GEOMETRY_VERTEX_DATA, context.STATIC_DRAW)

  return {
    firstProgram,
    secondProgram,
    geometryBuffer,
    compositePass,
    renderTarget,
    firstPositionLocation: createRequiredWebGlAttributeLocation(
      context,
      firstProgram,
      "a_position",
    ),
    firstColorLocation: createRequiredWebGlAttributeLocation(context, firstProgram, "a_color"),
    glowLocation: createRequiredWebGlUniformLocation(context, firstProgram, "u_glow"),
  }
}

const FIRST_PASS_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`

const FIRST_PASS_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform float u_glow;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 emissive = mix(v_color.rgb, vec3(1.0, 0.94, 0.76), u_glow * 0.52);
  outColor = vec4(emissive, 0.42 + u_glow * 0.4);
}`

const SECOND_PASS_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const SECOND_PASS_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_blur;
uniform float u_mix;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 texel = vec2(u_blur / 256.0, u_blur / 256.0);
  vec4 center = texture(u_texture, v_texCoord) * 0.32;
  vec4 sampleXPositive = texture(u_texture, v_texCoord + vec2(texel.x, 0.0)) * 0.17;
  vec4 sampleXNegative = texture(u_texture, v_texCoord - vec2(texel.x, 0.0)) * 0.17;
  vec4 sampleYPositive = texture(u_texture, v_texCoord + vec2(0.0, texel.y)) * 0.17;
  vec4 sampleYNegative = texture(u_texture, v_texCoord - vec2(0.0, texel.y)) * 0.17;
  vec4 blurred = center + sampleXPositive + sampleXNegative + sampleYPositive + sampleYNegative;
  vec3 lifted = mix(blurred.rgb, min(vec3(1.0), blurred.rgb * vec3(1.22, 1.16, 1.08)), u_mix);
  outColor = vec4(lifted, min(1.0, blurred.a + u_mix * 0.18));
}`
