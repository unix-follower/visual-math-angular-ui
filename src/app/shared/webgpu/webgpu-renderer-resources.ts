import { type WebGpuCanvasRuntime } from "./webgpu-bootstrap"

export function syncWebGpuCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const pixelRatio = globalThis.devicePixelRatio ?? 1

  if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
}

export function getOrCreateCachedWebGpuResources<T>(
  cache: WeakMap<WebGpuCanvasRuntime, T>,
  runtime: WebGpuCanvasRuntime,
  create: () => T,
): T {
  const cached = cache.get(runtime)

  if (cached) {
    return cached
  }

  const resources = create()
  cache.set(runtime, resources)
  return resources
}

export function releaseCachedWebGpuResources<T>(
  cache: WeakMap<WebGpuCanvasRuntime, T>,
  runtime: WebGpuCanvasRuntime,
  release: (resources: T) => void,
): boolean {
  const cached = cache.get(runtime)

  if (!cached) {
    return false
  }

  release(cached)
  cache.delete(runtime)
  return true
}
