export type WebGpuCanvasRuntime = {
  readonly adapter: GPUAdapter
  readonly device: GPUDevice
  readonly context: GPUCanvasContext
  readonly format: GPUTextureFormat
}

export type WebGpuCanvasSetupResult =
  | { readonly ok: true; readonly runtime: WebGpuCanvasRuntime }
  | { readonly ok: false; readonly reason: string }

export function hasWebGpuSupport(): boolean {
  return (
    typeof globalThis.navigator !== "undefined" && typeof globalThis.navigator.gpu !== "undefined"
  )
}

export function getWebGpuContext(canvas: HTMLCanvasElement): GPUCanvasContext | null {
  try {
    return canvas.getContext("webgpu")
  } catch {
    return null
  }
}

export async function initializeWebGpuCanvas(
  canvas: HTMLCanvasElement,
): Promise<WebGpuCanvasSetupResult> {
  if (!hasWebGpuSupport()) {
    return { ok: false, reason: "WebGPU is unavailable in this browser or test environment." }
  }

  const context = getWebGpuContext(canvas)

  if (!context) {
    return { ok: false, reason: "The browser did not provide a WebGPU canvas context." }
  }

  const adapter = await globalThis.navigator.gpu?.requestAdapter()

  if (!adapter) {
    return { ok: false, reason: "No compatible WebGPU adapter was found for this device." }
  }

  const device = await adapter.requestDevice({ label: "visual-math-webgpu-foundation" })
  const format = globalThis.navigator.gpu?.getPreferredCanvasFormat()

  if (!format) {
    return { ok: false, reason: "The browser did not report a preferred WebGPU canvas format." }
  }

  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  })

  return {
    ok: true,
    runtime: {
      adapter,
      device,
      context,
      format,
    },
  }
}
