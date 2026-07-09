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

import { type WebGlDualPassScene } from "./webgl-dual-pass.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GEOMETRY_STRIDE = 6
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlDualPassResources>()
const GEOMETRY_VERTEX_DATA = new Float32Array([
  0, -0.62, 1, 0.44, 0.2, 1, 0.58, 0, 0.24, 0.72, 0.96, 1, 0, 0.62, 1, 0.92, 0.34, 1, 0, -0.62, 1,
  0.44, 0.2, 1, 0, 0.62, 1, 0.92, 0.34, 1, -0.58, 0, 0.3, 0.84, 0.96, 1,
])

type WebGlDualPassResources = {
  readonly firstProgram: WebGLProgram
  readonly secondProgram: WebGLProgram
  readonly geometryBuffer: WebGLBuffer
  readonly compositePass: WebGlFullscreenPostProcessResources<"u_mix">
  readonly renderTarget: WebGlRenderTargetResources
  readonly firstPositionLocation: number
  readonly firstColorLocation: number
  readonly skewLocation: WebGLUniformLocation
  readonly glowLocation: WebGLUniformLocation
}

export function renderWebGlDualPassScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlDualPassScene,
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
  context.uniform1f(resources.skewLocation, scene.skew)
  context.uniform1f(resources.glowLocation, scene.glow)
  context.drawArrays(context.TRIANGLES, 0, 6)

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
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlDualPassResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.geometryBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.renderTarget)
    runtime.context.deleteProgram(resources.firstProgram)
    runtime.context.deleteProgram(resources.secondProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlDualPassResources {
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
    skewLocation: createRequiredWebGlUniformLocation(context, firstProgram, "u_skew"),
    glowLocation: createRequiredWebGlUniformLocation(context, firstProgram, "u_glow"),
  }
}

const FIRST_PASS_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform float u_skew;
out vec4 v_color;

void main() {
  vec2 position = vec2(a_position.x + a_position.y * (u_skew - 0.5), a_position.y);
  gl_Position = vec4(position, 0.0, 1.0);
  v_color = a_color;
}`

const FIRST_PASS_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform float u_glow;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 glowColor = mix(v_color.rgb, vec3(1.0, 0.94, 0.72), u_glow * 0.45);
  outColor = vec4(glowColor, 0.58 + u_glow * 0.3);
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
uniform float u_mix;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec4 sampled = texture(u_texture, v_texCoord);
  vec3 lifted = mix(sampled.rgb, sampled.rgb * vec3(1.0, 1.1, 1.18), u_mix);
  outColor = vec4(lifted, sampled.a);
}`
