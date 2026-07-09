export type WebGlCanvasRuntime = {
  readonly context: WebGL2RenderingContext
  readonly version: "webgl2"
}

export type WebGlCanvasSetupResult =
  | { readonly ok: true; readonly runtime: WebGlCanvasRuntime }
  | { readonly ok: false; readonly reason: string }

export function hasWebGlSupport(): boolean {
  return (
    typeof globalThis.document !== "undefined" &&
    typeof globalThis.WebGL2RenderingContext !== "undefined"
  )
}

export function getWebGlContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2") as WebGL2RenderingContext | null
  } catch {
    return null
  }
}

export function initializeWebGlCanvas(canvas: HTMLCanvasElement): WebGlCanvasSetupResult {
  if (!hasWebGlSupport()) {
    return {
      ok: false,
      reason: "WebGL2 is unavailable in this browser or test environment.",
    }
  }

  const context = getWebGlContext(canvas)

  if (!context) {
    return {
      ok: false,
      reason: "WebGL2 is unavailable in this browser or test environment.",
    }
  }

  return {
    ok: true,
    runtime: {
      context,
      version: "webgl2",
    },
  }
}
