export function serializeWorkbenchScene<TScene extends object>(scene: TScene): string {
  return encodeURIComponent(JSON.stringify({ version: 1, scene }))
}

export function buildWorkbenchShareUrl<TScene extends object>(
  routePath: string,
  scene: TScene,
): string {
  const relativeUrl = `${routePath}?state=${serializeWorkbenchScene(scene)}`

  if (!globalThis.location?.origin) {
    return relativeUrl
  }

  return new URL(relativeUrl, globalThis.location.origin).toString()
}

export function deserializeWorkbenchScene<TScene>(
  serializedScene: string | null,
  isScene: (value: unknown) => value is TScene,
): TScene | null {
  if (!serializedScene) {
    return null
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(serializedScene)) as {
      readonly version?: number
      readonly scene?: unknown
    }

    if (parsed.version !== 1 || !isScene(parsed.scene)) {
      return null
    }

    return parsed.scene
  } catch {
    return null
  }
}

export async function copyWorkbenchText(text: string): Promise<boolean> {
  if (!globalThis.navigator?.clipboard?.writeText) {
    return false
  }

  try {
    await globalThis.navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadWorkbenchCanvas(canvas: HTMLCanvasElement, fileName: string): boolean {
  if (!globalThis.document) {
    return false
  }

  try {
    const anchor = globalThis.document.createElement("a")
    anchor.href = canvas.toDataURL("image/png")
    anchor.download = fileName
    anchor.click()
    return true
  } catch {
    return false
  }
}
