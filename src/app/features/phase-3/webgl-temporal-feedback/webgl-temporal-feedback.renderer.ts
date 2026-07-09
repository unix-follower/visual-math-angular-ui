import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  bindWebGlFullscreenPostProcessTexture,
  createWebGlFullscreenPostProcessResources,
  type WebGlFullscreenPostProcessResources,
} from "../../../shared/webgl/webgl-post-process-resources"
import { createLinkedWebGlProgram } from "../../../shared/webgl/webgl-program-resources"
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

import { type WebGlTemporalFeedbackScene } from "./webgl-temporal-feedback.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlTemporalFeedbackResources>()

type WebGlTemporalFeedbackResources = {
  readonly feedbackProgram: WebGLProgram
  readonly compositeProgram: WebGLProgram
  readonly feedbackPass: WebGlFullscreenPostProcessResources<
    "u_drift" | "u_decay" | "u_injection" | "u_phase"
  >
  readonly compositePass: WebGlFullscreenPostProcessResources<"u_mix">
  readonly targets: readonly [WebGlRenderTargetResources, WebGlRenderTargetResources]
  activeTargetIndex: 0 | 1
  seeded: boolean
}

export function renderWebGlTemporalFeedbackScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlTemporalFeedbackScene,
  phase: number,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  if (!resources.seeded) {
    for (const target of resources.targets) {
      context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer)
      context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
      context.clearColor(0, 0, 0, 0)
      context.clear(context.COLOR_BUFFER_BIT)
    }

    resources.seeded = true
  }

  const sourceTarget = resources.targets[resources.activeTargetIndex]
  const destinationTarget = resources.targets[resources.activeTargetIndex === 0 ? 1 : 0]

  context.bindFramebuffer(context.FRAMEBUFFER, destinationTarget.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.feedbackProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.feedbackPass, sourceTarget.texture)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_drift, scene.drift)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_decay, scene.decay)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_injection, scene.injection)
  context.uniform1f(resources.feedbackPass.uniformLocations.u_phase, phase)
  context.drawArrays(context.TRIANGLES, 0, 6)

  resources.activeTargetIndex = resources.activeTargetIndex === 0 ? 1 : 0

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.compositeProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.compositePass, destinationTarget.texture)
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlTemporalFeedbackResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.feedbackPass.quad.quadBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.targets[0])
    releaseWebGlRenderTargetResources(runtime.context, resources.targets[1])
    runtime.context.deleteProgram(resources.feedbackProgram)
    runtime.context.deleteProgram(resources.compositeProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlTemporalFeedbackResources {
  const feedbackProgram = createLinkedWebGlProgram(
    context,
    FEEDBACK_VERTEX_SHADER,
    FEEDBACK_FRAGMENT_SHADER,
  )
  const compositeProgram = createLinkedWebGlProgram(
    context,
    COMPOSITE_VERTEX_SHADER,
    COMPOSITE_FRAGMENT_SHADER,
  )

  return {
    feedbackProgram,
    compositeProgram,
    feedbackPass: createWebGlFullscreenPostProcessResources(context, feedbackProgram, [
      "u_drift",
      "u_decay",
      "u_injection",
      "u_phase",
    ] as const),
    compositePass: createWebGlFullscreenPostProcessResources(context, compositeProgram, [
      "u_mix",
    ] as const),
    targets: [
      createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
      createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
    ],
    activeTargetIndex: 0,
    seeded: false,
  }
}

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
uniform float u_decay;
uniform float u_injection;
uniform float u_phase;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 centered = v_texCoord * 2.0 - 1.0;
  vec2 drift = vec2(
    cos(u_phase * 6.28318) * u_drift / 180.0,
    sin(u_phase * 6.28318) * u_drift / 220.0
  );
  vec4 prior = texture(u_texture, v_texCoord - drift) * (0.38 + u_decay * 0.48);
  float radius = length(centered + vec2(sin(u_phase * 6.28318) * 0.18, cos(u_phase * 6.28318) * 0.12));
  float beam = exp(-18.0 * radius * radius);
  float ribbon = exp(-70.0 * pow(centered.y + sin((centered.x + u_phase) * 8.0) * 0.08, 2.0));
  vec3 injected = vec3(0.86, 0.62, 1.0) * beam + vec3(0.26, 0.82, 1.0) * ribbon;
  vec3 color = prior.rgb * vec3(0.98, 1.0, 1.04) + injected * (0.08 + u_injection * 0.34);
  float alpha = min(1.0, prior.a * (0.86 + u_decay * 0.08) + (beam + ribbon) * (0.04 + u_injection * 0.12));
  outColor = vec4(color, alpha);
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
  vec3 lifted = mix(sampled.rgb, min(vec3(1.0), sampled.rgb * vec3(1.16, 1.1, 1.28)), u_mix);
  outColor = vec4(lifted, min(1.0, sampled.a + u_mix * 0.1));
}`
