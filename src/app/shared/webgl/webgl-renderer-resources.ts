import { type WebGlCanvasRuntime } from "./webgl-bootstrap"

export function syncWebGlCanvasSize(
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

export function markWebGlRuntimeRendered(
  cache: WeakSet<WebGlCanvasRuntime>,
  runtime: WebGlCanvasRuntime,
): void {
  cache.add(runtime)
}

export function releaseMarkedWebGlRuntime(
  cache: WeakSet<WebGlCanvasRuntime>,
  runtime: WebGlCanvasRuntime,
): boolean {
  return cache.delete(runtime)
}

export function getOrCreateCachedWebGlResources<T>(
  cache: WeakMap<WebGlCanvasRuntime, T>,
  runtime: WebGlCanvasRuntime,
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

export function releaseCachedWebGlResources<T>(
  cache: WeakMap<WebGlCanvasRuntime, T>,
  runtime: WebGlCanvasRuntime,
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
