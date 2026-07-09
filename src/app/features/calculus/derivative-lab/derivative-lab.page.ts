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
  DEFAULT_DERIVATIVE_LAB_SCENE,
  derivativeAt,
  DerivativeLabScene,
  derivativeLabSummary,
  evaluateDerivativeLabCurve,
  isDerivativeLabScene,
  secantSlope,
} from "./derivative-lab.model"
import { renderDerivativeLabScene } from "./derivative-lab.renderer"

const DERIVATIVE_LAB_ROUTE_PATH = "/calculus/derivative-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "pointX", label: "Point x", min: -4, max: 4, step: 0.25 },
  { kind: "range", id: "curvature", label: "Curvature", min: -1.5, max: 1.5, step: 0.1 },
  { kind: "range", id: "linearTerm", label: "Linear term", min: -3, max: 3, step: 0.25 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showTangent", label: "Show tangent line" },
  { kind: "toggle", id: "showSecant", label: "Show secant line" },
]
const PRESETS: readonly WorkbenchPreset<DerivativeLabScene>[] = [
  {
    label: "Balanced parabola",
    description: "Smooth positive curvature with both reference lines.",
    state: { pointX: 1.5, curvature: 0.8, linearTerm: -0.5, showTangent: true, showSecant: true },
  },
  {
    label: "Steep tangent",
    description: "Higher curvature and a point to the right of the vertex.",
    state: { pointX: 2.25, curvature: 1.2, linearTerm: -1, showTangent: true, showSecant: true },
  },
  {
    label: "Descending section",
    description: "Negative local slope to contrast tangent and secant.",
    state: { pointX: -1.5, curvature: 0.7, linearTerm: 0.4, showTangent: true, showSecant: true },
  },
  {
    label: "Concave down",
    description: "Negative curvature to flip the curve.",
    state: { pointX: 0.75, curvature: -0.9, linearTerm: 0.75, showTangent: true, showSecant: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized calculus scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current calculus viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default derivative scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the tangent point left or right." },
  { keys: "Arrow Up/Down", description: "Increase or decrease curve curvature." },
  { keys: "L / Shift+L", description: "Increase or decrease the linear term." },
  { keys: "T", description: "Toggle the tangent line." },
  { keys: "S", description: "Toggle the secant line." },
  { keys: "R", description: "Reset the derivative scene." },
]

@Component({
  selector: "app-derivative-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./derivative-lab.page.html",
  styleUrl: "./derivative-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DerivativeLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly pointX = signal(DEFAULT_DERIVATIVE_LAB_SCENE.pointX)
  protected readonly curvature = signal(DEFAULT_DERIVATIVE_LAB_SCENE.curvature)
  protected readonly linearTerm = signal(DEFAULT_DERIVATIVE_LAB_SCENE.linearTerm)
  protected readonly showTangent = signal(DEFAULT_DERIVATIVE_LAB_SCENE.showTangent)
  protected readonly showSecant = signal(DEFAULT_DERIVATIVE_LAB_SCENE.showSecant)
  protected readonly statusMessage = signal("Focus the graph area for keyboard calculus controls.")
  protected readonly highlights = [
    "First weekly-math calculus slice",
    "Tangent and secant comparison",
    "Derivative-as-slope interaction model",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    pointX: {
      value: () => this.pointX(),
      set: (value) => this.pointX.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    curvature: {
      value: () => this.curvature(),
      set: (value) => this.curvature.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    linearTerm: {
      value: () => this.linearTerm(),
      set: (value) => this.linearTerm.set(value),
      displayValue: (value) => value.toFixed(2),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showTangent: { value: () => this.showTangent(), set: (value) => this.showTangent.set(value) },
    showSecant: { value: () => this.showSecant(), set: (value) => this.showSecant.set(value) },
  }
  protected readonly scene = computed<DerivativeLabScene>(() => ({
    pointX: this.pointX(),
    curvature: this.curvature(),
    linearTerm: this.linearTerm(),
    showTangent: this.showTangent(),
    showSecant: this.showSecant(),
  }))
  protected readonly summary = computed(() => derivativeLabSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()

    return [
      { label: "f(x)", value: evaluateDerivativeLabCurve(scene, scene.pointX).toFixed(2) },
      { label: "f'(x)", value: derivativeAt(scene, scene.pointX).toFixed(2) },
      { label: "Secant slope", value: secantSlope(scene, scene.pointX).toFixed(2) },
      { label: "x value", value: scene.pointX.toFixed(2) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isDerivativeLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the derivative scene from the shared URL.")
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

      renderDerivativeLabScene(canvasRef.nativeElement, scene)
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

  protected applyPreset(preset: WorkbenchPreset<DerivativeLabScene>): void {
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
          buildWorkbenchShareUrl(DERIVATIVE_LAB_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "derivative-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_DERIVATIVE_LAB_SCENE)
        this.statusMessage.set("Derivative scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.pointX, -0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Tangent point moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.pointX, 0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Tangent point moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.curvature, 0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Curvature increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.curvature, -0.1, (value) => clampDecimal(value, -1.5, 1.5))
        this.statusMessage.set("Curvature decreased.")
        break
      case "l":
        event.preventDefault()
        stepNumericSignal(this.linearTerm, 0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Linear term increased.")
        break
      case "L":
        event.preventDefault()
        stepNumericSignal(this.linearTerm, -0.25, (value) => clampDecimal(value, -3, 3))
        this.statusMessage.set("Linear term decreased.")
        break
      case "t":
      case "T":
        event.preventDefault()
        this.showTangent.update((value) => !value)
        this.statusMessage.set("Tangent line toggled.")
        break
      case "s":
      case "S":
        event.preventDefault()
        this.showSecant.update((value) => !value)
        this.statusMessage.set("Secant line toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_DERIVATIVE_LAB_SCENE)
        this.statusMessage.set("Derivative scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: DerivativeLabScene): void {
    this.pointX.set(scene.pointX)
    this.curvature.set(scene.curvature)
    this.linearTerm.set(scene.linearTerm)
    this.showTangent.set(scene.showTangent)
    this.showSecant.set(scene.showSecant)
  }
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
