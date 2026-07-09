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

import { type WebGlVelocityFieldScene } from "./webgl-velocity-field.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlVelocityFieldResources>()

type WebGlVelocityFieldResources = {
  readonly evolveProgram: WebGLProgram
  readonly compositeProgram: WebGLProgram
  readonly evolvePass: WebGlFullscreenPostProcessResources<
    "u_phase" | "u_swirl" | "u_shear" | "u_injection" | "u_dissipation"
  >
  readonly compositePass: WebGlFullscreenPostProcessResources<"u_mix">
  readonly firstTarget: WebGlRenderTargetResources
  readonly secondTarget: WebGlRenderTargetResources
  activeTargetIndex: 0 | 1
  initialized: boolean
}

export function renderWebGlVelocityFieldScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlVelocityFieldScene,
  phase: number,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )

  if (!resources.initialized) {
    clearTarget(context, resources.firstTarget)
    clearTarget(context, resources.secondTarget)
    resources.initialized = true
  }

  const sourceTarget =
    resources.activeTargetIndex === 0 ? resources.firstTarget : resources.secondTarget
  const destinationTarget =
    resources.activeTargetIndex === 0 ? resources.secondTarget : resources.firstTarget

  context.bindFramebuffer(context.FRAMEBUFFER, destinationTarget.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.evolveProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.evolvePass, sourceTarget.texture)
  context.uniform1f(resources.evolvePass.uniformLocations.u_phase, phase)
  context.uniform1f(resources.evolvePass.uniformLocations.u_swirl, scene.swirl)
  context.uniform1f(resources.evolvePass.uniformLocations.u_shear, scene.shear)
  context.uniform1f(resources.evolvePass.uniformLocations.u_injection, scene.injection)
  context.uniform1f(resources.evolvePass.uniformLocations.u_dissipation, scene.dissipation)
  context.drawArrays(context.TRIANGLES, 0, 6)

  resources.activeTargetIndex = resources.activeTargetIndex === 0 ? 1 : 0
  const currentTarget =
    resources.activeTargetIndex === 0 ? resources.firstTarget : resources.secondTarget

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.compositeProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.compositePass, currentTarget.texture)
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlVelocityFieldResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.evolvePass.quad.quadBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.firstTarget)
    releaseWebGlRenderTargetResources(runtime.context, resources.secondTarget)
    runtime.context.deleteProgram(resources.evolveProgram)
    runtime.context.deleteProgram(resources.compositeProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlVelocityFieldResources {
  const evolveProgram = createLinkedWebGlProgram(
    context,
    EVOLVE_VERTEX_SHADER,
    EVOLVE_FRAGMENT_SHADER,
  )
  const compositeProgram = createLinkedWebGlProgram(
    context,
    COMPOSITE_VERTEX_SHADER,
    COMPOSITE_FRAGMENT_SHADER,
  )

  return {
    evolveProgram,
    compositeProgram,
    evolvePass: createWebGlFullscreenPostProcessResources(context, evolveProgram, [
      "u_phase",
      "u_swirl",
      "u_shear",
      "u_injection",
      "u_dissipation",
    ] as const),
    compositePass: createWebGlFullscreenPostProcessResources(context, compositeProgram, [
      "u_mix",
    ] as const),
    firstTarget: createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
    secondTarget: createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
    activeTargetIndex: 0,
    initialized: false,
  }
}

function clearTarget(context: WebGL2RenderingContext, target: WebGlRenderTargetResources): void {
  context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
}

const EVOLVE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`

const EVOLVE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_phase;
uniform float u_swirl;
uniform float u_shear;
uniform float u_injection;
uniform float u_dissipation;
in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 centered = v_texCoord * 2.0 - 1.0;
  float angle = u_phase * 6.2831853;
  vec2 swirlVelocity = vec2(-centered.y, centered.x) * (u_swirl / 220.0);
  vec2 shearVelocity = vec2(centered.y, sin((centered.x + u_phase) * 7.0) * 0.08) * (u_shear / 180.0);
  vec2 velocity = swirlVelocity + shearVelocity;
  vec4 history = texture(u_texture, v_texCoord - velocity) * (0.42 + u_dissipation * 0.42);
  vec4 echo = texture(u_texture, v_texCoord - velocity * 1.6) * (0.08 + u_dissipation * 0.08);
  vec2 injector = vec2(cos(angle * 0.83), sin(angle * 1.13)) * 0.34;
  float dye = exp(-22.0 * dot(centered - injector, centered - injector));
  vec3 dyeColor = mix(vec3(0.22, 0.92, 1.0), vec3(1.0, 0.72, 0.34), u_injection);
  vec3 color = history.rgb + echo.rgb + dyeColor * dye * (0.1 + u_injection * 0.46);
  float alpha = min(1.0, history.a + echo.a + dye * (0.08 + u_injection * 0.24));
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
  vec3 lifted = mix(sampled.rgb, min(vec3(1.0), sampled.rgb * vec3(1.18, 1.12, 1.28)), u_mix);
  outColor = vec4(lifted, min(1.0, sampled.a + u_mix * 0.12));
}`
