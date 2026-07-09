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
import {
  readRangeControlDisplayValue,
  readRangeControlValue,
  readToggleControlValue,
  type RangeControlAdapter,
  type ToggleControlAdapter,
  writeRangeControlValue,
  writeToggleControlValue,
} from "../../../shared/math-workbench/workbench-control-state"
import { stepNumericSignal } from "../../../shared/math-workbench/workbench-keyboard-state"
import { WorkbenchMetricGridComponent } from "../../../shared/math-workbench/workbench-metric-grid.component"
import { WorkbenchPresetGridComponent } from "../../../shared/math-workbench/workbench-preset-grid.component"
import { WorkbenchRangeControlComponent } from "../../../shared/math-workbench/workbench-range-control.component"
import { WorkbenchToggleControlComponent } from "../../../shared/math-workbench/workbench-toggle-control.component"
import { WorkbenchViewportSurfaceComponent } from "../../../shared/math-workbench/workbench-viewport-surface.component"
import {
  DEFAULT_GRADIENT_DESCENT_LAB_SCENE,
  gradientDescentLabMetrics,
  GradientDescentLabScene,
  gradientDescentLabSummary,
  isGradientDescentLabScene,
} from "./gradient-descent-lab.model"
import { renderGradientDescentLabScene } from "./gradient-descent-lab.renderer"

const GRADIENT_DESCENT_ROUTE_PATH = "/optimization/gradient-descent-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "startX", label: "Start x", min: -4, max: 4, step: 0.25 },
  { kind: "range", id: "startY", label: "Start y", min: -4, max: 4, step: 0.25 },
  { kind: "range", id: "learningRate", label: "Learning rate", min: 0.02, max: 0.4, step: 0.02 },
  { kind: "range", id: "stepCount", label: "Steps", min: 1, max: 16, step: 1 },
  { kind: "range", id: "anisotropy", label: "Curvature anisotropy", min: 0.6, max: 2.4, step: 0.1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showPath", label: "Show descent path" },
  { kind: "toggle", id: "showContours", label: "Show contour lines" },
]
const PRESETS: readonly WorkbenchPreset<GradientDescentLabScene>[] = [
  {
    label: "Stable descent",
    description: "A moderate learning rate that converges smoothly.",
    state: {
      startX: 3,
      startY: -2,
      learningRate: 0.18,
      stepCount: 8,
      anisotropy: 1.6,
      showPath: true,
      showContours: true,
    },
  },
  {
    label: "Slow learner",
    description: "Tiny steps make progress predictable but gradual.",
    state: {
      startX: -3.25,
      startY: 2.75,
      learningRate: 0.06,
      stepCount: 12,
      anisotropy: 1.4,
      showPath: true,
      showContours: true,
    },
  },
  {
    label: "Steep valley",
    description: "High anisotropy creates narrow contours and sharper updates.",
    state: {
      startX: 2.5,
      startY: 3.25,
      learningRate: 0.1,
      stepCount: 10,
      anisotropy: 2.2,
      showPath: true,
      showContours: true,
    },
  },
  {
    label: "Path only",
    description: "Hide contours and focus on the step-by-step trajectory.",
    state: {
      startX: -2.5,
      startY: -3.5,
      learningRate: 0.14,
      stepCount: 9,
      anisotropy: 1.1,
      showPath: true,
      showContours: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized optimization scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current optimization viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default gradient descent scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow keys", description: "Move the starting point through the objective landscape." },
  { keys: "L / Shift+L", description: "Increase or decrease the learning rate." },
  { keys: "S / Shift+S", description: "Increase or decrease the number of steps." },
  { keys: "A / Shift+A", description: "Increase or decrease anisotropy." },
  { keys: "P", description: "Toggle the path overlay." },
  { keys: "C", description: "Toggle contour lines." },
  { keys: "R", description: "Reset the optimization scene." },
]

@Component({
  selector: "app-gradient-descent-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./gradient-descent-lab.page.html",
  styleUrl: "./gradient-descent-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradientDescentLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly startX = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.startX)
  protected readonly startY = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.startY)
  protected readonly learningRate = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.learningRate)
  protected readonly stepCount = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.stepCount)
  protected readonly anisotropy = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.anisotropy)
  protected readonly showPath = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.showPath)
  protected readonly showContours = signal(DEFAULT_GRADIENT_DESCENT_LAB_SCENE.showContours)
  protected readonly statusMessage = signal(
    "Focus the optimization viewport for keyboard gradient-descent controls.",
  )
  protected readonly highlights = [
    "Domain-specific optimization slice",
    "Gradient descent over a quadratic objective landscape",
    "Learning-rate and curvature intuition with a path overlay",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    startX: {
      value: () => this.startX(),
      set: (value) => this.startX.set(clampDecimal(value, -4, 4)),
      displayValue: (value) => value.toFixed(2),
    },
    startY: {
      value: () => this.startY(),
      set: (value) => this.startY.set(clampDecimal(value, -4, 4)),
      displayValue: (value) => value.toFixed(2),
    },
    learningRate: {
      value: () => this.learningRate(),
      set: (value) => this.learningRate.set(clampDecimal(value, 0.02, 0.4)),
      displayValue: (value) => value.toFixed(2),
    },
    stepCount: {
      value: () => this.stepCount(),
      set: (value) => this.stepCount.set(clampInteger(value, 1, 16)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    anisotropy: {
      value: () => this.anisotropy(),
      set: (value) => this.anisotropy.set(clampDecimal(value, 0.6, 2.4)),
      displayValue: (value) => value.toFixed(1),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showPath: { value: () => this.showPath(), set: (value) => this.showPath.set(value) },
    showContours: {
      value: () => this.showContours(),
      set: (value) => this.showContours.set(value),
    },
  }
  protected readonly scene = computed<GradientDescentLabScene>(() => ({
    startX: this.startX(),
    startY: this.startY(),
    learningRate: this.learningRate(),
    stepCount: this.stepCount(),
    anisotropy: this.anisotropy(),
    showPath: this.showPath(),
    showContours: this.showContours(),
  }))
  protected readonly derivedMetrics = computed(() => gradientDescentLabMetrics(this.scene()))
  protected readonly summary = computed(() =>
    gradientDescentLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const metrics = this.derivedMetrics()

    return [
      {
        label: "Final point",
        value: `(${metrics.finalPoint.x.toFixed(2)}, ${metrics.finalPoint.y.toFixed(2)})`,
      },
      { label: "Final objective", value: metrics.finalPoint.value.toFixed(2) },
      { label: "Gradient norm", value: metrics.gradientNorm.toFixed(2) },
      { label: "Improvement", value: metrics.improvement.toFixed(2) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isGradientDescentLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the optimization scene from the shared URL.")
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const scene = this.scene()
      const metrics = this.derivedMetrics()

      if (!canvasRef) {
        return
      }

      renderGradientDescentLabScene(canvasRef.nativeElement, scene, metrics)
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
          buildWorkbenchShareUrl(GRADIENT_DESCENT_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "gradient-descent-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_GRADIENT_DESCENT_LAB_SCENE)
        this.statusMessage.set("Optimization scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.startX, -0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Start x moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.startX, 0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Start x moved right.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.startY, -0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Start y moved down.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.startY, 0.25, (value) => clampDecimal(value, -4, 4))
        this.statusMessage.set("Start y moved up.")
        break
      case "l":
        event.preventDefault()
        stepNumericSignal(this.learningRate, 0.02, (value) => clampDecimal(value, 0.02, 0.4))
        this.statusMessage.set("Learning rate increased.")
        break
      case "L":
        event.preventDefault()
        stepNumericSignal(this.learningRate, -0.02, (value) => clampDecimal(value, 0.02, 0.4))
        this.statusMessage.set("Learning rate decreased.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.stepCount, 1, (value) => clampInteger(value, 1, 16))
        this.statusMessage.set("Step count increased.")
        break
      case "S":
        event.preventDefault()
        stepNumericSignal(this.stepCount, -1, (value) => clampInteger(value, 1, 16))
        this.statusMessage.set("Step count decreased.")
        break
      case "a":
        event.preventDefault()
        stepNumericSignal(this.anisotropy, 0.1, (value) => clampDecimal(value, 0.6, 2.4))
        this.statusMessage.set("Anisotropy increased.")
        break
      case "A":
        event.preventDefault()
        stepNumericSignal(this.anisotropy, -0.1, (value) => clampDecimal(value, 0.6, 2.4))
        this.statusMessage.set("Anisotropy decreased.")
        break
      case "p":
      case "P":
        event.preventDefault()
        this.showPath.update((value) => !value)
        this.statusMessage.set("Path overlay toggled.")
        break
      case "c":
      case "C":
        event.preventDefault()
        this.showContours.update((value) => !value)
        this.statusMessage.set("Contour lines toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_GRADIENT_DESCENT_LAB_SCENE)
        this.statusMessage.set("Optimization scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: GradientDescentLabScene): void {
    this.startX.set(clampDecimal(scene.startX, -4, 4))
    this.startY.set(clampDecimal(scene.startY, -4, 4))
    this.learningRate.set(clampDecimal(scene.learningRate, 0.02, 0.4))
    this.stepCount.set(clampInteger(scene.stepCount, 1, 16))
    this.anisotropy.set(clampDecimal(scene.anisotropy, 0.6, 2.4))
    this.showPath.set(scene.showPath)
    this.showContours.set(scene.showContours)
  }
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}
