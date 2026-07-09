import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlUniformLocation,
  enableInterleavedWebGlAttributes,
} from "../../../shared/webgl/webgl-binding-resources"
import { createWebGlFullscreenTextureQuadResources } from "../../../shared/webgl/webgl-fullscreen-quad-resources"
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

import { type WebGlPingPongFeedbackScene } from "./webgl-ping-pong-feedback.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GEOMETRY_STRIDE = 6
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlPingPongFeedbackResources>()
const GEOMETRY_VERTEX_DATA = new Float32Array([
  0.0, -0.74, 1.0, 0.42, 0.16, 1, 0.62, -0.08, 0.26, 0.78, 0.98, 1, 0.1, 0.72, 1.0, 0.9, 0.36, 1,
  0.0, -0.74, 1.0, 0.42, 0.16, 1, 0.1, 0.72, 1.0, 0.9, 0.36, 1, -0.56, 0.12, 0.28, 0.58, 0.98, 1,
])

type WebGlPingPongFeedbackResources = {
  readonly seedProgram: WebGLProgram
  readonly feedbackProgram: WebGLProgram
  readonly geometryBuffer: WebGLBuffer
  readonly feedbackPass: WebGlFullscreenPostProcessResources<"u_drift" | "u_feedback">
  readonly firstTarget: WebGlRenderTargetResources
  readonly secondTarget: WebGlRenderTargetResources
  readonly positionLocation: number
  readonly colorLocation: number
  readonly energyLocation: WebGLUniformLocation
}

export function renderWebGlPingPongFeedbackScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlPingPongFeedbackScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  context.bindFramebuffer(context.FRAMEBUFFER, resources.firstTarget.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.seedProgram)
  context.bindBuffer(context.ARRAY_BUFFER, resources.geometryBuffer)
  enableInterleavedWebGlAttributes(context, GEOMETRY_STRIDE, [
    { location: resources.positionLocation, size: 2, offsetFloats: 0 },
    { location: resources.colorLocation, size: 4, offsetFloats: 2 },
  ])
  context.uniform1f(resources.energyLocation, scene.energy)
  context.drawArrays(context.TRIANGLES, 0, 6)

  context.bindFramebuffer(context.FRAMEBUFFER, resources.secondTarget.framebuffer)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.feedbackProgram)
  bindWebGlFullscreenPostProcessTexture(
    context,
    resources.feedbackPass,
    resources.firstTarget.texture,
  )
  context.uniform1f(resources.feedbackPass.uniformLocations.u_drift, scene.drift)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_feedback, scene.feedback * 0.82)
  context.drawArrays(context.TRIANGLES, 0, 6)

  context.bindFramebuffer(context.FRAMEBUFFER, resources.firstTarget.framebuffer)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  bindWebGlFullscreenPostProcessTexture(
    context,
    resources.feedbackPass,
    resources.secondTarget.texture,
  )
  context.uniform1f(resources.feedbackPass.uniformLocations.u_drift, scene.drift * 0.5)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_feedback, scene.feedback)
  context.drawArrays(context.TRIANGLES, 0, 6)

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  bindWebGlFullscreenPostProcessTexture(
    context,
    resources.feedbackPass,
    resources.firstTarget.texture,
  )
  context.uniform1f(resources.feedbackPass.uniformLocations.u_drift, 0)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_feedback, scene.feedback * 0.46)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlPingPongFeedbackResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.geometryBuffer)
    runtime.context.deleteBuffer(resources.feedbackPass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.firstTarget)
    releaseWebGlRenderTargetResources(runtime.context, resources.secondTarget)
    runtime.context.deleteProgram(resources.seedProgram)
    runtime.context.deleteProgram(resources.feedbackProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlPingPongFeedbackResources {
  const seedProgram = createLinkedWebGlProgram(context, SEED_VERTEX_SHADER, SEED_FRAGMENT_SHADER)
  const feedbackProgram = createLinkedWebGlProgram(
    context,
    FEEDBACK_VERTEX_SHADER,
    FEEDBACK_FRAGMENT_SHADER,
  )
  const geometryBuffer = createRequiredWebGlBuffer(context)
  const feedbackPass = createWebGlFullscreenPostProcessResources(context, feedbackProgram, [
    "u_drift",
    "u_feedback",
  ] as const)
  const firstTarget = createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  const secondTarget = createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE)

  context.bindBuffer(context.ARRAY_BUFFER, geometryBuffer)
  context.bufferData(context.ARRAY_BUFFER, GEOMETRY_VERTEX_DATA, context.STATIC_DRAW)

  return {
    seedProgram,
    feedbackProgram,
    geometryBuffer,
    feedbackPass,
    firstTarget,
    secondTarget,
    positionLocation: createRequiredWebGlAttributeLocation(context, seedProgram, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, seedProgram, "a_color"),
    energyLocation: createRequiredWebGlUniformLocation(context, seedProgram, "u_energy"),
  }
}

const SEED_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}`

const SEED_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform float u_energy;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 energized = mix(v_color.rgb, vec3(1.0, 0.96, 0.72), u_energy * 0.55);
  outColor = vec4(energized, 0.3 + u_energy * 0.55);
}`

const FEEDBACK_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const FEEDBACK_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_drift;
uniform float u_feedback;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 drift = vec2(u_drift / 220.0, u_drift / 340.0);
  vec4 center = texture(u_texture, v_texCoord + drift);
  vec4 echoA = texture(u_texture, v_texCoord + drift * vec2(-1.6, 1.0));
  vec4 echoB = texture(u_texture, v_texCoord + drift * vec2(1.0, -1.4));
  vec4 accumulated = center * 0.58 + echoA * 0.21 + echoB * 0.21;
  vec3 lifted = mix(accumulated.rgb, min(vec3(1.0), accumulated.rgb * vec3(1.22, 1.12, 1.08)), u_feedback);
  outColor = vec4(lifted, min(1.0, accumulated.a * (0.82 + u_feedback * 0.28)));
}`
