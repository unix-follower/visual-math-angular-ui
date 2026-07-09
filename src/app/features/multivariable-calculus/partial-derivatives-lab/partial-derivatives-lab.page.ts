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
  DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE,
  gradientMagnitude,
  isPartialDerivativesLabScene,
  partialDerivativeX,
  partialDerivativeY,
  partialDerivativesLabSummary,
  PartialDerivativesLabScene,
  sampleHeight,
} from "./partial-derivatives-lab.model"
import { renderPartialDerivativesLabScene } from "./partial-derivatives-lab.renderer"

const PARTIAL_DERIVATIVES_LAB_ROUTE_PATH = "/multivariable-calculus/partial-derivatives-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "sampleX", label: "Sample x", min: -3, max: 3, step: 0.25 },
  { kind: "range", id: "sampleY", label: "Sample y", min: -3, max: 3, step: 0.25 },
  { kind: "range", id: "curvature", label: "Curvature", min: -1.2, max: 1.2, step: 0.1 },
  { kind: "range", id: "coupling", label: "Coupling", min: -1.5, max: 1.5, step: 0.1 },
  { kind: "range", id: "tilt", label: "Tilt", min: -1.5, max: 1.5, step: 0.1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showGradient", label: "Show gradient vector" },
  { kind: "toggle", id: "showContours", label: "Show contour hints" },
]
const PRESETS: readonly WorkbenchPreset<PartialDerivativesLabScene>[] = [
  {
    label: "Gentle bowl",
    description: "Positive curvature with a mild coupling term.",
    state: {
      sampleX: 1,
      sampleY: -1,
      curvature: 0.8,
      coupling: 0.4,
      tilt: 0.6,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Saddle point",
    description: "Negative coupling dominates to create mixed directional behavior.",
    state: {
      sampleX: 0.75,
      sampleY: 0.75,
      curvature: 0.1,
      coupling: -1.1,
      tilt: 0,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Tilted ridge",
    description: "Strong tilt shifts the local gradient direction.",
    state: {
      sampleX: -1.25,
      sampleY: 0.5,
      curvature: 0.6,
      coupling: 0.2,
      tilt: 1.1,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Contours only",
    description: "Hide the gradient and focus on level-set structure.",
    state: {
      sampleX: 1.5,
      sampleY: -0.5,
      curvature: 0.9,
      coupling: 0.5,
      tilt: -0.4,
      showGradient: false,
      showContours: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized multivariable scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current multivariable viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default partial-derivatives scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the sample point along x." },
  { keys: "Arrow Up/Down", description: "Move the sample point along y." },
  { keys: "C / Shift+C", description: "Increase or decrease curvature." },
  { keys: "U / Shift+U", description: "Increase or decrease coupling." },
  { keys: "T / Shift+T", description: "Increase or decrease tilt." },
  { keys: "G", description: "Toggle the gradient vector." },
  { keys: "L", description: "Toggle contour hints." },
  { keys: "R", description: "Reset the multivariable scene." },
]

@Component({
  selector: "app-partial-derivatives-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./partial-derivatives-lab.page.html",
  styleUrl: "./partial-derivatives-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartialDerivativesLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly sampleX = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.sampleX)
  protected readonly sampleY = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.sampleY)
  protected readonly curvature = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.curvature)
  protected readonly coupling = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.coupling)
  protected readonly tilt = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.tilt)
  protected readonly showGradient = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.showGradient)
  protected readonly showContours = signal(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE.showContours)
  protected readonly statusMessage = signal(
    "Focus the graph area for keyboard multivariable controls.",
  )
  protected readonly highlights = [
    "Weekly-math multivariable calculus slice",
    "Partial-derivative and gradient intuition on a shared 2D workbench",
    "Heatmap plus contour hints instead of a 3D-only surface view",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    sampleX: {
      value: () => this.sampleX(),
      set: (value) => this.sampleX.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    sampleY: {
      value: () => this.sampleY(),
      set: (value) => this.sampleY.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    curvature: {
      value: () => this.curvature(),
      set: (value) => this.curvature.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    coupling: {
      value: () => this.coupling(),
      set: (value) => this.coupling.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    tilt: {
      value: () => this.tilt(),
      set: (value) => this.tilt.set(value),
      displayValue: (value) => value.toFixed(2),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showGradient: {
      value: () => this.showGradient(),
      set: (value) => this.showGradient.set(value),
    },
    showContours: {
      value: () => this.showContours(),
      set: (value) => this.showContours.set(value),
    },
  }
  protected readonly scene = computed<PartialDerivativesLabScene>(() => ({
    sampleX: this.sampleX(),
    sampleY: this.sampleY(),
    curvature: this.curvature(),
    coupling: this.coupling(),
    tilt: this.tilt(),
    showGradient: this.showGradient(),
    showContours: this.showContours(),
  }))
  protected readonly summary = computed(() => partialDerivativesLabSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()

    return [
      { label: "Height", value: sampleHeight(scene).toFixed(2) },
      { label: "∂f/∂x", value: partialDerivativeX(scene, scene.sampleX, scene.sampleY).toFixed(2) },
      { label: "∂f/∂y", value: partialDerivativeY(scene, scene.sampleX, scene.sampleY).toFixed(2) },
      { label: "Gradient |∇f|", value: gradientMagnitude(scene).toFixed(2) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isPartialDerivativesLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the multivariable scene from the shared URL.")
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

      renderPartialDerivativesLabScene(canvasRef.nativeElement, scene)
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

    if (preset) {
      this.applyScene(preset.state)
      this.statusMessage.set(`Applied preset: ${preset.label}.`)
    }
  }

  protected async handleWorkbenchAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(PARTIAL_DERIVATIVES_LAB_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "partial-derivatives-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)
        this.statusMessage.set("Multivariable scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.sampleX, -0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Sample x moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.sampleX, 0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Sample x moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.sampleY, 0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Sample y moved upward.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.sampleY, -0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Sample y moved downward.")
        break
      case "c":
        event.preventDefault()
        stepNumericSignal(this.curvature, 0.1, (value) => clampDecimal(value, -1.2, 1.2))
        this.statusMessage.set("Curvature increased.")
        break
      case "C":
        event.preventDefault()
        stepNumericSignal(this.curvature, -0.1, (value) => clampDecimal(value, -1.2, 1.2))
        this.statusMessage.set("Curvature decreased.")
        break
      case "u":
        event.preventDefault()
        stepNumericSignal(this.coupling, 0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Coupling increased.")
        break
      case "U":
        event.preventDefault()
        stepNumericSignal(this.coupling, -0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Coupling decreased.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.tilt, 0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Tilt increased.")
        break
      case "T":
        event.preventDefault()
        stepNumericSignal(this.tilt, -0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Tilt decreased.")
        break
      case "g":
      case "G":
        event.preventDefault()
        this.showGradient.update((value) => !value)
        this.statusMessage.set("Gradient vector toggled.")
        break
      case "l":
      case "L":
        event.preventDefault()
        this.showContours.update((value) => !value)
        this.statusMessage.set("Contour hints toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)
        this.statusMessage.set("Multivariable scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: PartialDerivativesLabScene): void {
    this.sampleX.set(scene.sampleX)
    this.sampleY.set(scene.sampleY)
    this.curvature.set(scene.curvature)
    this.coupling.set(scene.coupling)
    this.tilt.set(scene.tilt)
    this.showGradient.set(scene.showGradient)
    this.showContours.set(scene.showContours)
  }
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
