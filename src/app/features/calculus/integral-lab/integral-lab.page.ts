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
  DEFAULT_INTEGRAL_LAB_SCENE,
  exactIntegralArea,
  IntegralLabScene,
  integralLabSummary,
  isIntegralLabScene,
  leftRiemannSum,
  midpointRiemannSum,
} from "./integral-lab.model"
import { renderIntegralLabScene } from "./integral-lab.renderer"

const INTEGRAL_LAB_ROUTE_PATH = "/calculus/integral-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "upperBound", label: "Upper bound", min: 1, max: 6.25, step: 0.25 },
  { kind: "range", id: "waveAmplitude", label: "Wave amplitude", min: 0, max: 0.9, step: 0.05 },
  { kind: "range", id: "subdivisionCount", label: "Subdivisions", min: 2, max: 24, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showRectangles", label: "Show midpoint rectangles" },
  { kind: "toggle", id: "showExactArea", label: "Show exact area fill" },
]
const PRESETS: readonly WorkbenchPreset<IntegralLabScene>[] = [
  {
    label: "Short interval",
    description: "A compact accumulation window with visible midpoint rectangles.",
    state: {
      upperBound: 2.5,
      waveAmplitude: 0.4,
      subdivisionCount: 6,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "Wide interval",
    description: "Longer accumulation up to nearly one full sine cycle.",
    state: {
      upperBound: 5.75,
      waveAmplitude: 0.55,
      subdivisionCount: 12,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "High contrast",
    description: "Larger oscillation to emphasize approximation error.",
    state: {
      upperBound: 4.75,
      waveAmplitude: 0.85,
      subdivisionCount: 8,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "Area only",
    description: "Turn off rectangles to isolate the exact accumulated region.",
    state: {
      upperBound: 4,
      waveAmplitude: 0.6,
      subdivisionCount: 10,
      showRectangles: false,
      showExactArea: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized integral scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current integral viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default integral scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Decrease or increase the upper bound." },
  { keys: "Arrow Up/Down", description: "Increase or decrease subdivision count." },
  { keys: "W / Shift+W", description: "Increase or decrease the wave amplitude." },
  { keys: "M", description: "Toggle midpoint rectangles." },
  { keys: "G", description: "Toggle exact area shading." },
  { keys: "R", description: "Reset the integral scene." },
]

@Component({
  selector: "app-integral-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./integral-lab.page.html",
  styleUrl: "./integral-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegralLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly upperBound = signal(DEFAULT_INTEGRAL_LAB_SCENE.upperBound)
  protected readonly waveAmplitude = signal(DEFAULT_INTEGRAL_LAB_SCENE.waveAmplitude)
  protected readonly subdivisionCount = signal(DEFAULT_INTEGRAL_LAB_SCENE.subdivisionCount)
  protected readonly showRectangles = signal(DEFAULT_INTEGRAL_LAB_SCENE.showRectangles)
  protected readonly showExactArea = signal(DEFAULT_INTEGRAL_LAB_SCENE.showExactArea)
  protected readonly statusMessage = signal("Focus the graph area for keyboard integral controls.")
  protected readonly highlights = [
    "Second weekly-math calculus slice",
    "Integral accumulation with exact-versus-estimated area",
    "Shared workbench controls reused across calculus tools",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    upperBound: {
      value: () => this.upperBound(),
      set: (value) => this.upperBound.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    waveAmplitude: {
      value: () => this.waveAmplitude(),
      set: (value) => this.waveAmplitude.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    subdivisionCount: {
      value: () => this.subdivisionCount(),
      set: (value) => this.subdivisionCount.set(Math.round(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showRectangles: {
      value: () => this.showRectangles(),
      set: (value) => this.showRectangles.set(value),
    },
    showExactArea: {
      value: () => this.showExactArea(),
      set: (value) => this.showExactArea.set(value),
    },
  }
  protected readonly scene = computed<IntegralLabScene>(() => ({
    upperBound: this.upperBound(),
    waveAmplitude: this.waveAmplitude(),
    subdivisionCount: this.subdivisionCount(),
    showRectangles: this.showRectangles(),
    showExactArea: this.showExactArea(),
  }))
  protected readonly summary = computed(() => integralLabSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const deltaX = scene.upperBound / scene.subdivisionCount

    return [
      { label: "Exact area", value: exactIntegralArea(scene).toFixed(2) },
      { label: "Midpoint sum", value: midpointRiemannSum(scene).toFixed(2) },
      { label: "Left sum", value: leftRiemannSum(scene).toFixed(2) },
      { label: "Δx", value: deltaX.toFixed(2) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isIntegralLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the integral scene from the shared URL.")
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

      renderIntegralLabScene(canvasRef.nativeElement, scene)
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

  protected applyPreset(preset: WorkbenchPreset<IntegralLabScene>): void {
    this.applyScene(preset.state)
    this.statusMessage.set(`Applied preset: ${preset.label}.`)
  }

  protected applyPresetByIndex(index: number): void {
    const preset = this.presets[index]

    if (preset) {
      this.applyPreset(preset)
    }
  }

  protected async handleWorkbenchAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(INTEGRAL_LAB_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "integral-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_INTEGRAL_LAB_SCENE)
        this.statusMessage.set("Integral scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.upperBound, -0.25, (value) => clampDecimal(value, 1, 6.25))
        this.statusMessage.set("Upper bound decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.upperBound, 0.25, (value) => clampDecimal(value, 1, 6.25))
        this.statusMessage.set("Upper bound increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.subdivisionCount, 1, (value) => clampInteger(value, 2, 24))
        this.statusMessage.set("Subdivision count increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.subdivisionCount, -1, (value) => clampInteger(value, 2, 24))
        this.statusMessage.set("Subdivision count decreased.")
        break
      case "w":
        event.preventDefault()
        stepNumericSignal(this.waveAmplitude, 0.05, (value) => clampDecimal(value, 0, 0.9))
        this.statusMessage.set("Wave amplitude increased.")
        break
      case "W":
        event.preventDefault()
        stepNumericSignal(this.waveAmplitude, -0.05, (value) => clampDecimal(value, 0, 0.9))
        this.statusMessage.set("Wave amplitude decreased.")
        break
      case "m":
      case "M":
        event.preventDefault()
        this.showRectangles.update((value) => !value)
        this.statusMessage.set("Midpoint rectangles toggled.")
        break
      case "g":
      case "G":
        event.preventDefault()
        this.showExactArea.update((value) => !value)
        this.statusMessage.set("Exact area fill toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_INTEGRAL_LAB_SCENE)
        this.statusMessage.set("Integral scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: IntegralLabScene): void {
    this.upperBound.set(scene.upperBound)
    this.waveAmplitude.set(scene.waveAmplitude)
    this.subdivisionCount.set(scene.subdivisionCount)
    this.showRectangles.set(scene.showRectangles)
    this.showExactArea.set(scene.showExactArea)
  }
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}
