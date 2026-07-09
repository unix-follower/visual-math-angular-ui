import { WritableSignal } from "@angular/core"

export function stepNumericSignal(
  signal: WritableSignal<number>,
  delta: number,
  normalize: (value: number) => number,
): number {
  const nextValue = normalize(signal() + delta)
  signal.set(nextValue)
  return nextValue
}

export function stepObjectNumericSignal<T extends Record<string, unknown>>(
  signal: WritableSignal<T>,
  key: keyof T,
  delta: number,
  normalize: (value: number) => number,
): number {
  const currentValue = signal()[key]

  if (typeof currentValue !== "number") {
    return Number.NaN
  }

  const nextValue = normalize(currentValue + delta)
  signal.update((state) => ({ ...state, [key]: nextValue }))
  return nextValue
}
