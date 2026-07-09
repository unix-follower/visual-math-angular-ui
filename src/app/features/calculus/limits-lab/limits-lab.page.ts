import { isPlatformBrowser } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core"

import { MathWorkbenchComponent } from "../../../shared/math-workbench/math-workbench.component"
import {
  RangeControlSchema,
  ToggleControlSchema,
  WorkbenchAction,
  WorkbenchKeyboardShortcut,
  WorkbenchPreset,
} from "../../../shared/math-workbench/math-workbench.models"
import {
  buildWorkbenchShareUrl,
  copyWorkbenchText,
  deserializeWorkbenchScene,
  downloadWorkbenchCanvas,
} from "../../../shared/math-workbench/math-workbench-state"
import { WorkbenchControlSectionComponent } from "../../../shared/math-workbench/workbench-control-section.component"
import { WorkbenchMetricGridComponent } from "../../../shared/math-workbench/workbench-metric-grid.component"
import { WorkbenchPresetGridComponent } from "../../../shared/math-workbench/workbench-preset-grid.component"
import { WorkbenchRangeControlComponent } from "../../../shared/math-workbench/workbench-range-control.component"
import { WorkbenchToggleControlComponent } from "../../../shared/math-workbench/workbench-toggle-control.component"
import { WorkbenchViewportSurfaceComponent } from "../../../shared/math-workbench/workbench-viewport-surface.component"
import { stepNumericSignal } from "../../../shared/math-workbench/workbench-keyboard-state"
import {
  readRangeControlDisplayValue,
  readRangeControlValue,
  readToggleControlValue,
  type RangeControlAdapter,
  type ToggleControlAdapter,
  writeRangeControlValue,
  writeToggleControlValue,
} from "../../../shared/math-workbench/workbench-control-state"
import {
  averageApproximation,
  DEFAULT_LIMITS_LAB_SCENE,
  limitValue,
  LimitsLabScene,
  limitsLabSummary,
  isLimitsLabScene,
  leftHandValue,
  rightHandValue,
} from "./limits-lab.model"
import { renderLimitsLabScene } from "./limits-lab.renderer"

const LIMITS_LAB_ROUTE_PATH = "/calculus/limits-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "targetX", label: "Target x", min: -2, max: 2, step: 0.25 },
  { kind: "range", id: "frequency", label: "Frequency", min: 0.5, max: 3, step: 0.25 },
  { kind: "range", id: "windowRadius", label: "Window radius", min: 0.1, max: 1.5, step: 0.05 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showSamples", label: "Show left/right sample points" },
  { kind: "toggle", id: "showLimitGuide", label: "Show limit guide" },
]
const PRESETS: readonly WorkbenchPreset<LimitsLabScene>[] = [
  {
    label: "Centered sinc",
    description: "Classic removable discontinuity centered at the origin.",
    state: { targetX: 0, frequency: 1, windowRadius: 0.4, showSamples: true, showLimitGuide: true },
  },
  {
    label: "Shifted target",
    description: "Move the limit point away from the origin.",
    state: {
      targetX: 1.25,
      frequency: 1.5,
      windowRadius: 0.35,
      showSamples: true,
      showLimitGuide: true,
    },
  },
  {
    label: "Tighter window",
    description: "Shrink the left/right interval to tighten the approximation.",
    state: {
      targetX: -0.75,
      frequency: 2,
      windowRadius: 0.15,
      showSamples: true,
      showLimitGuide: true,
    },
  },
  {
    label: "Guide only",
    description: "Hide sample markers and focus on the removable hole and limit line.",
    state: {
      targetX: 0.5,
      frequency: 2.5,
      windowRadius: 0.4,
      showSamples: false,
      showLimitGuide: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized limits scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current limits viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default limits scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the target x-value." },
  { keys: "Arrow Up/Down", description: "Increase or decrease the frequency." },
  { keys: "W / Shift+W", description: "Increase or decrease the sampling window radius." },
  { keys: "S", description: "Toggle left/right sample markers." },
  { keys: "G", description: "Toggle the limit guide." },
  { keys: "R", description: "Reset the limits scene." },
]

@Component({
  selector: "app-limits-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./limits-lab.page.html",
  styleUrl: "./limits-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LimitsLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly targetX = signal(DEFAULT_LIMITS_LAB_SCENE.targetX)
  protected readonly frequency = signal(DEFAULT_LIMITS_LAB_SCENE.frequency)
  protected readonly windowRadius = signal(DEFAULT_LIMITS_LAB_SCENE.windowRadius)
  protected readonly showSamples = signal(DEFAULT_LIMITS_LAB_SCENE.showSamples)
  protected readonly showLimitGuide = signal(DEFAULT_LIMITS_LAB_SCENE.showLimitGuide)
  protected readonly statusMessage = signal("Focus the graph area for keyboard limits controls.")
  protected readonly highlights = [
    "Third weekly-math calculus slice",
    "Removable discontinuity and left/right-hand intuition",
    "Shared workbench controls with a different calculus concept",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    targetX: {
      value: () => this.targetX(),
      set: (value) => this.targetX.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    frequency: {
      value: () => this.frequency(),
      set: (value) => this.frequency.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    windowRadius: {
      value: () => this.windowRadius(),
      set: (value) => this.windowRadius.set(value),
      displayValue: (value) => value.toFixed(2),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showSamples: { value: () => this.showSamples(), set: (value) => this.showSamples.set(value) },
    showLimitGuide: {
      value: () => this.showLimitGuide(),
      set: (value) => this.showLimitGuide.set(value),
    },
  }
  protected readonly scene = computed<LimitsLabScene>(() => ({
    targetX: this.targetX(),
    frequency: this.frequency(),
    windowRadius: this.windowRadius(),
    showSamples: this.showSamples(),
    showLimitGuide: this.showLimitGuide(),
  }))
  protected readonly summary = computed(() => limitsLabSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()

    return [
      { label: "Left-hand value", value: leftHandValue(scene).toFixed(3) },
      { label: "Right-hand value", value: rightHandValue(scene).toFixed(3) },
      { label: "Average estimate", value: averageApproximation(scene).toFixed(3) },
      { label: "Limit", value: limitValue(scene).toFixed(3) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isLimitsLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the limits scene from the shared URL.")
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const scene = this.scene()

      if (!canvasRef) {
        return
      }

      renderLimitsLabScene(canvasRef.nativeElement, scene)
    })
  }

  protected rangeValue(controlId: string): number {
    return readRangeControlValue(this.rangeControlAdapters, controlId)
  }

  protected rangeDisplayValue(controlId: string): string {
    return readRangeControlDisplayValue(this.rangeControlAdapters, controlId)
  }

  protected updateRange(controlId: string, event: Event): void {
    writeRangeControlValue(this.rangeControlAdapters, controlId, event)
  }

  protected toggleValue(controlId: string): boolean {
    return readToggleControlValue(this.toggleControlAdapters, controlId)
  }

  protected toggleOption(controlId: string, event: Event): void {
    writeToggleControlValue(this.toggleControlAdapters, controlId, event)
  }

  protected applyPresetByIndex(index: number): void {
    const preset = this.presets[index]

    if (!preset) {
      return
    }

    this.applyScene(preset.state)
    this.statusMessage.set(`Applied preset: ${preset.label}.`)
  }

  protected async handleWorkbenchAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(LIMITS_LAB_ROUTE_PATH, this.scene()),
        )
        this.statusMessage.set(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const canvasRef = this.canvas()
        const didDownload = canvasRef
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "limits-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_LIMITS_LAB_SCENE)
        this.statusMessage.set("Limits scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.targetX, -0.25, (value) => clampDecimal(value, -2, 2))
        this.statusMessage.set("Target x decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.targetX, 0.25, (value) => clampDecimal(value, -2, 2))
        this.statusMessage.set("Target x increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.frequency, 0.25, (value) => clampDecimal(value, 0.5, 3))
        this.statusMessage.set("Frequency increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.frequency, -0.25, (value) => clampDecimal(value, 0.5, 3))
        this.statusMessage.set("Frequency decreased.")
        break
      case "w":
        event.preventDefault()
        stepNumericSignal(this.windowRadius, 0.05, (value) => clampDecimal(value, 0.1, 1.5))
        this.statusMessage.set("Window radius increased.")
        break
      case "W":
        event.preventDefault()
        stepNumericSignal(this.windowRadius, -0.05, (value) => clampDecimal(value, 0.1, 1.5))
        this.statusMessage.set("Window radius decreased.")
        break
      case "s":
      case "S":
        event.preventDefault()
        this.showSamples.update((value) => !value)
        this.statusMessage.set("Sample markers toggled.")
        break
      case "g":
      case "G":
        event.preventDefault()
        this.showLimitGuide.update((value) => !value)
        this.statusMessage.set("Limit guide toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_LIMITS_LAB_SCENE)
        this.statusMessage.set("Limits scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: LimitsLabScene): void {
    this.targetX.set(scene.targetX)
    this.frequency.set(scene.frequency)
    this.windowRadius.set(scene.windowRadius)
    this.showSamples.set(scene.showSamples)
    this.showLimitGuide.set(scene.showLimitGuide)
  }
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
