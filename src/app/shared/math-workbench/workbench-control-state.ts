export type RangeControlAdapter = {
  readonly value: () => number
  readonly set: (value: number) => void
  readonly displayValue?: (value: number) => string
}

export type ToggleControlAdapter = {
  readonly value: () => boolean
  readonly set: (value: boolean) => void
}

export function readRangeControlValue(
  adapters: Record<string, RangeControlAdapter>,
  controlId: string,
): number {
  return adapters[controlId]?.value() ?? 0
}

export function readRangeControlDisplayValue(
  adapters: Record<string, RangeControlAdapter>,
  controlId: string,
): string {
  const adapter = adapters[controlId]

  if (!adapter) {
    return "0"
  }

  const value = adapter.value()
  return adapter.displayValue ? adapter.displayValue(value) : `${value}`
}

export function writeRangeControlValue(
  adapters: Record<string, RangeControlAdapter>,
  controlId: string,
  event: Event,
): void {
  const adapter = adapters[controlId]

  if (!adapter) {
    return
  }

  adapter.set(Number((event.target as HTMLInputElement).value))
}

export function readToggleControlValue(
  adapters: Record<string, ToggleControlAdapter>,
  controlId: string,
): boolean {
  return adapters[controlId]?.value() ?? false
}

export function writeToggleControlValue(
  adapters: Record<string, ToggleControlAdapter>,
  controlId: string,
  event: Event,
): void {
  const adapter = adapters[controlId]

  if (!adapter) {
    return
  }

  adapter.set((event.target as HTMLInputElement).checked)
}
