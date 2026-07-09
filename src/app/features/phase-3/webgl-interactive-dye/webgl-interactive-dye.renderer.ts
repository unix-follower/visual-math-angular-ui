import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  bindWebGlFullscreenPostProcessTexture,
  createWebGlFullscreenPostProcessResources,
  type WebGlFullscreenPostProcessResources,
} from "../../../shared/webgl/webgl-post-process-resources"
import { createLinkedWebGlProgram } from "../../../shared/webgl/webgl-program-resources"
import {
  createWebGlRenderTargetResources,
  releaseWebGlRenderTargetResources,
  type WebGlRenderTargetResources,
} from "../../../shared/webgl/webgl-render-target-resources"
import {
  getOrCreateCachedWebGlResources,
  releaseCachedWebGlResources,
  syncWebGlCanvasSize,
} from "../../../shared/webgl/webgl-renderer-resources"

import { type WebGlInteractiveDyeScene } from "./webgl-interactive-dye.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const OFFSCREEN_SIZE = 512
const RESOURCES = new WeakMap<WebGlCanvasRuntime, WebGlInteractiveDyeResources>()

type WebGlInteractiveDyeResources = {
  readonly evolveProgram: WebGLProgram
  readonly compositeProgram: WebGLProgram
  readonly evolvePass: WebGlFullscreenPostProcessResources<
    | "u_phase"
    | "u_swirl"
    | "u_dissipation"
    | "u_mix"
    | "u_speed"
    | "u_injectionX"
    | "u_injectionY"
    | "u_obstacleX"
    | "u_obstacleY"
    | "u_obstacleRadius"
    | "u_injectionStrength"
  >
  readonly compositePass: WebGlFullscreenPostProcessResources<
    "u_mix" | "u_injectionStrength" | "u_obstacleRadius"
  >
  readonly front: WebGlRenderTargetResources
  readonly back: WebGlRenderTargetResources
  activeTarget: "front" | "back"
  initialized: boolean
}

export function renderWebGlInteractiveDyeScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlInteractiveDyeScene,
  phase: number,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const context = runtime.context
  const resources = getOrCreateCachedWebGlResources(RESOURCES, runtime, () =>
    createResources(context),
  )
  const source = resources.activeTarget === "front" ? resources.front : resources.back
  const destination = resources.activeTarget === "front" ? resources.back : resources.front

  if (!resources.initialized) {
    clearTarget(context, resources.front)
    clearTarget(context, resources.back)
    resources.initialized = true
  }

  context.viewport(0, 0, canvas.width, canvas.height)

  context.bindFramebuffer(context.FRAMEBUFFER, destination.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.evolveProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.evolvePass, source.texture)
  context.uniform1f(resources.evolvePass.uniformLocations.u_phase, phase)
  context.uniform1f(resources.evolvePass.uniformLocations.u_swirl, scene.swirl)
  context.uniform1f(resources.evolvePass.uniformLocations.u_dissipation, scene.dissipation)
  context.uniform1f(resources.evolvePass.uniformLocations.u_mix, scene.mix)
  context.uniform1f(resources.evolvePass.uniformLocations.u_speed, scene.speed)
  context.uniform1f(resources.evolvePass.uniformLocations.u_injectionX, scene.injectionX)
  context.uniform1f(resources.evolvePass.uniformLocations.u_injectionY, scene.injectionY)
  context.uniform1f(resources.evolvePass.uniformLocations.u_obstacleX, scene.obstacleX)
  context.uniform1f(resources.evolvePass.uniformLocations.u_obstacleY, scene.obstacleY)
  context.uniform1f(resources.evolvePass.uniformLocations.u_obstacleRadius, scene.obstacleRadius)
  context.uniform1f(
    resources.evolvePass.uniformLocations.u_injectionStrength,
    scene.injectionStrength,
  )
  context.drawArrays(context.TRIANGLES, 0, 6)

  resources.activeTarget = resources.activeTarget === "front" ? "back" : "front"
  const current = resources.activeTarget === "front" ? resources.front : resources.back

  context.bindFramebuffer(context.FRAMEBUFFER, null)
  context.viewport(0, 0, canvas.width, canvas.height)
  context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  context.clear(context.COLOR_BUFFER_BIT)
  context.useProgram(resources.compositeProgram)
  bindWebGlFullscreenPostProcessTexture(context, resources.compositePass, current.texture)
  context.uniform1f(resources.compositePass.uniformLocations.u_mix, scene.mix)
  context.uniform1f(
    resources.compositePass.uniformLocations.u_injectionStrength,
    scene.injectionStrength,
  )
  context.uniform1f(resources.compositePass.uniformLocations.u_obstacleRadius, scene.obstacleRadius)
  context.drawArrays(context.TRIANGLES, 0, 6)
}

export function releaseWebGlInteractiveDyeResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseCachedWebGlResources(RESOURCES, runtime, (resources) => {
    runtime.context.deleteBuffer(resources.evolvePass.quad.quadBuffer)
    runtime.context.deleteBuffer(resources.compositePass.quad.quadBuffer)
    releaseWebGlRenderTargetResources(runtime.context, resources.front)
    releaseWebGlRenderTargetResources(runtime.context, resources.back)
    runtime.context.deleteProgram(resources.evolveProgram)
    runtime.context.deleteProgram(resources.compositeProgram)
  })
}

function createResources(context: WebGL2RenderingContext): WebGlInteractiveDyeResources {
  const evolveProgram = createLinkedWebGlProgram(
    context,
    FULLSCREEN_VERTEX_SHADER,
    EVOLVE_FRAGMENT_SHADER_SOURCE,
  )
  const compositeProgram = createLinkedWebGlProgram(
    context,
    FULLSCREEN_VERTEX_SHADER,
    COMPOSITE_FRAGMENT_SHADER_SOURCE,
  )

  return {
    evolveProgram,
    compositeProgram,
    evolvePass: createWebGlFullscreenPostProcessResources(context, evolveProgram, [
      "u_phase",
      "u_swirl",
      "u_dissipation",
      "u_mix",
      "u_speed",
      "u_injectionX",
      "u_injectionY",
      "u_obstacleX",
      "u_obstacleY",
      "u_obstacleRadius",
      "u_injectionStrength",
    ] as const),
    compositePass: createWebGlFullscreenPostProcessResources(context, compositeProgram, [
      "u_mix",
      "u_injectionStrength",
      "u_obstacleRadius",
    ] as const),
    front: createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
    back: createWebGlRenderTargetResources(context, OFFSCREEN_SIZE, OFFSCREEN_SIZE),
    activeTarget: "front",
    initialized: false,
  }
}

function clearTarget(context: WebGL2RenderingContext, target: WebGlRenderTargetResources): void {
  context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer)
  context.viewport(0, 0, OFFSCREEN_SIZE, OFFSCREEN_SIZE)
  context.clearColor(0, 0, 0, 0)
  context.clear(context.COLOR_BUFFER_BIT)
}

const FULLSCREEN_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_texCoord;
}`

const EVOLVE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_primary;
uniform float u_secondary;
uniform float u_tertiary;
uniform float u_mix;
uniform float u_speed;
uniform float u_injectionX;
uniform float u_injectionY;
uniform float u_obstacleX;
uniform float u_obstacleY;
uniform float u_obstacleRadius;
uniform float u_injectionStrength;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec2 centered = v_uv - vec2(0.5);
  vec2 injection = vec2(u_injectionX, u_injectionY);
  vec2 obstacle = vec2(u_obstacleX, u_obstacleY);
  vec2 toObstacle = v_uv - obstacle;
  float obstacleFalloff = smoothstep(u_obstacleRadius, u_obstacleRadius * 0.72, length(toObstacle));
  vec2 spin = vec2(-centered.y, centered.x) * (u_secondary * 0.016 + sin(u_primary * 6.2831) * 0.004 * u_speed);
  vec2 repel = normalize(toObstacle + vec2(0.0001)) * (1.0 - obstacleFalloff) * 0.014;
  vec2 sampleUv = clamp(v_uv - spin + repel, 0.0, 1.0);
  vec4 history = texture(u_texture, sampleUv);
  float dye = smoothstep(0.18, 0.0, distance(v_uv, injection)) * u_injectionStrength;
  vec3 injected = mix(history.rgb * mix(0.84, 0.98, u_tertiary), vec3(1.0, 0.56, 0.18), dye);
  injected = mix(injected, vec3(0.12, 0.46, 1.0), (1.0 - obstacleFalloff) * 0.24);
  outColor = vec4(mix(history.rgb, injected, u_mix), max(history.a, dye));
}`

const COMPOSITE_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform float u_primary;
uniform float u_secondary;
uniform float u_tertiary;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 sampleColor = texture(u_texture, v_uv);
  vec3 glow = vec3(0.12, 0.18, 0.28) * (1.0 - sampleColor.a) * u_primary;
  vec3 color = mix(sampleColor.rgb + glow, sampleColor.rgb * (1.0 + u_secondary * 0.18), 0.72);
  outColor = vec4(color + vec3(u_tertiary * 0.08), 1.0);
}`
