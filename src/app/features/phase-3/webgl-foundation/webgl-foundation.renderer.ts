import { type WebGlCanvasRuntime } from "../../../shared/webgl/webgl-bootstrap"
import {
  markWebGlRuntimeRendered,
  releaseMarkedWebGlRuntime,
  syncWebGlCanvasSize,
} from "../../../shared/webgl/webgl-renderer-resources"

import { type WebGlFoundationScene } from "./webgl-foundation.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RENDERED_RUNTIMES = new WeakSet<WebGlCanvasRuntime>()

export function renderWebGlFoundationScene(
  canvas: HTMLCanvasElement,
  runtime: WebGlCanvasRuntime,
  scene: WebGlFoundationScene,
): void {
  syncWebGlCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  runtime.context.viewport(0, 0, canvas.width, canvas.height)
  runtime.context.clearColor(scene.red, scene.green, scene.blue, scene.alpha)
  runtime.context.clear(runtime.context.COLOR_BUFFER_BIT)
  markWebGlRuntimeRendered(RENDERED_RUNTIMES, runtime)
}

export function releaseWebGlFoundationResources(runtime: WebGlCanvasRuntime): boolean {
  return releaseMarkedWebGlRuntime(RENDERED_RUNTIMES, runtime)
}
