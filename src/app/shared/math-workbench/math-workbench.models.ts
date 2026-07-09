export type WorkbenchAction = {
  readonly id: string
  readonly label: string
  readonly description: string
}

export type WorkbenchKeyboardShortcut = {
  readonly keys: string
  readonly description: string
}

export type WorkbenchPreset<TScene> = {
  readonly label: string
  readonly description: string
  readonly state: TScene
}

export type RangeControlSchema = {
  readonly kind: "range"
  readonly id: string
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
}

export type ToggleControlSchema = {
  readonly kind: "toggle"
  readonly id: string
  readonly label: string
}
