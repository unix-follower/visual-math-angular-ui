import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  createRequiredWebGlAttributeLocation,
  createRequiredWebGlUniformLocation,
  enableInterleavedWebGlAttributes,
} from "../../../shared/webgl/webgl-binding-resources"
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

import {
  type WebGlFeedbackTrailsScene,
  webGlFeedbackTrailRelayCount,
} from "./webgl-feedback-trails.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GEOMETRY_STRIDE = 6
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlFeedbackTrailsResources>()
const GEOMETRY_VERTEX_DATA = new Float32Array([
  0.0, -0.74, 1.0, 0.44, 0.18, 1, 0.62, -0.06, 0.32, 0.76, 1.0, 1, 0.12, 0.72, 1.0, 0.94, 0.42, 1,
  0.0, -0.74, 1.0, 0.44, 0.18, 1, 0.12, 0.72, 1.0, 0.94, 0.42, 1, -0.58, 0.14, 0.28, 0.58, 0.96, 1,
])

type WebGlFeedbackTrailsResources = {
  readonly seedProgram: WebGLProgram
  readonly trailProgram: WebGLProgram
  readonly compositeProgram: WebGLProgram
  readonly geometryBuffer: WebGLBuffer
  readonly trailPass: WebGlFullscreenPostProcessResources<"u_drift" | "u_decay">
  readonly compositePass: WebGlFullscreenPostProcessResources<"u_mix">
  readonly firstTarget: WebGlRenderTargetResources
  readonly secondTarget: WebGlRenderTargetResources
  readonly positionLocation: number
  readonly colorLocation: number
  readonly glowLocation: WebGLUniformLocation
}

export function renderWebGlFeedbackTrailsScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlFeedbackTrailsScene,
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
  context.uniform1f(resources.glowLocation, scene.glow)
  context.drawArrays(context.TRIANGLES, 0, 6)

  let sourceTarget = resources.firstTarget
  let destinationTarget = resources.secondTarget
  const relayCount = webGlFeedbackTrailRelayCount(scene)

  context.useProgram(resources.trailProgram)

  for (let index = 0; index < relayCount; index += 1) {
    const driftScale = 1 - index / Math.max(1, relayCount - 1)
    const decay = Math.max(0, scene.decay - index * 0.04)

    context.bindFramebuffer(context.FRAMEBUFFER, destinationTarget.framebuffer)
    context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
    context.clearColor(0, 0, 0, 0)
    context.clear(context.COLOR_BUFFER_BIT)
    bindWebGlFullscreenPostProcessTexture(context, resources.trailPass, sourceTarget.texture)
    context.uniform1f(
      resources.trailPass.uniformLocations.u_drift,
      scene.drift * (0.45 + driftScale * 0.75),
    )
    context.uniform1f(resources.trailPass.uniformLocations.u_decay, decay)
    context.drawArrays(context.TRIANGLES, 0, 6)

    const previousSource = sourceTarget
    sourceTarget = destinationTarget
    destinationTarget = previousSource
  }

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.compositeProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.compositePass, sourceTarget.texture)
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlFeedbackTrailsResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.geometryBuffer)
    runtime.context.deleteBuffer(resources.trailPass.quad.quadBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.firstTarget)
    releaseWebGlRenderTargetResources(runtime.context, resources.secondTarget)
    runtime.context.deleteProgram(resources.seedProgram)
    runtime.context.deleteProgram(resources.trailProgram)
    runtime.context.deleteProgram(resources.compositeProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlFeedbackTrailsResources {
  const seedProgram = createLinkedWebGlProgram(context, SEED_VERTEX_SHADER, SEED_FRAGMENT_SHADER)
  const trailProgram = createLinkedWebGlProgram(context, TRAIL_VERTEX_SHADER, TRAIL_FRAGMENT_SHADER)
  const compositeProgram = createLinkedWebGlProgram(
    context,
    COMPOSITE_VERTEX_SHADER,
    COMPOSITE_FRAGMENT_SHADER,
  )
  const geometryBuffer = createRequiredWebGlBuffer(context)
  const trailPass = createWebGlFullscreenPostProcessResources(context, trailProgram, [
    "u_drift",
    "u_decay",
  ] as const)
  const compositePass = createWebGlFullscreenPostProcessResources(context, compositeProgram, [
    "u_mix",
  ] as const)
  const firstTarget = createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  const secondTarget = createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE)

  context.bindBuffer(context.ARRAY_BUFFER, geometryBuffer)
  context.bufferData(context.ARRAY_BUFFER, GEOMETRY_VERTEX_DATA, context.STATIC_DRAW)

  return {
    seedProgram,
    trailProgram,
    compositeProgram,
    geometryBuffer,
    trailPass,
    compositePass,
    firstTarget,
    secondTarget,
    positionLocation: createRequiredWebGlAttributeLocation(context, seedProgram, "a_position"),
    colorLocation: createRequiredWebGlAttributeLocation(context, seedProgram, "a_color"),
    glowLocation: createRequiredWebGlUniformLocation(context, seedProgram, "u_glow"),
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

uniform float u_glow;
in vec4 v_color;
out vec4 outColor;

void main() {
  vec3 energized = mix(v_color.rgb, vec3(1.0, 0.96, 0.74), u_glow * 0.52);
  outColor = vec4(energized, 0.32 + u_glow * 0.52);
}`

const TRAIL_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const TRAIL_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_drift;
uniform float u_decay;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 drift = vec2(u_drift / 240.0, u_drift / 320.0);
  vec4 center = texture(u_texture, v_texCoord + drift) * (0.54 + u_decay * 0.18);
  vec4 trailA = texture(u_texture, v_texCoord - drift * 0.8) * (0.18 + u_decay * 0.1);
  vec4 trailB = texture(u_texture, v_texCoord + drift * vec2(-1.3, 0.9)) * (0.14 + u_decay * 0.08);
  vec4 accumulated = center + trailA + trailB;
  vec3 cooled = mix(accumulated.rgb * vec3(0.92, 0.98, 1.08), accumulated.rgb, u_decay);
  outColor = vec4(cooled, min(1.0, accumulated.a * (0.72 + u_decay * 0.28)));
}`

const COMPOSITE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_mix;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec4 sampled = texture(u_texture, v_texCoord);
  vec3 lifted = mix(sampled.rgb, min(vec3(1.0), sampled.rgb * vec3(1.18, 1.1, 1.28)), u_mix);
  outColor = vec4(lifted, min(1.0, sampled.a + u_mix * 0.14));
}`
