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
  DEFAULT_SAMPLING_LAB_SCENE,
  isSamplingLabScene,
  SamplingLabScene,
  samplingLabSummary,
  simulateSamplingLab,
} from "./sampling-lab.model"
import { renderSamplingLabScene } from "./sampling-lab.renderer"

const SAMPLING_LAB_ROUTE_PATH = "/statistics-probability/sampling-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "successProbability",
    label: "Success probability",
    min: 0.05,
    max: 0.95,
    step: 0.05,
  },
  {
    kind: "range",
    id: "trialsPerExperiment",
    label: "Trials per experiment",
    min: 2,
    max: 20,
    step: 1,
  },
  { kind: "range", id: "experimentCount", label: "Experiment count", min: 20, max: 200, step: 10 },
  { kind: "range", id: "seed", label: "Seed", min: 1, max: 99, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showExpectedValue", label: "Show expected value" },
  { kind: "toggle", id: "showEmpiricalMean", label: "Show empirical mean" },
]
const PRESETS: readonly WorkbenchPreset<SamplingLabScene>[] = [
  {
    label: "Fair coin",
    description: "Balanced binomial experiments with p = 0.50.",
    state: {
      successProbability: 0.5,
      trialsPerExperiment: 10,
      experimentCount: 60,
      seed: 17,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Rare event",
    description: "Low-probability successes with many trials.",
    state: {
      successProbability: 0.15,
      trialsPerExperiment: 18,
      experimentCount: 90,
      seed: 11,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Biased coin",
    description: "Moderately skewed success probability.",
    state: {
      successProbability: 0.7,
      trialsPerExperiment: 12,
      experimentCount: 80,
      seed: 29,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Compact sample",
    description: "Smaller sample to show noisier empirical behavior.",
    state: {
      successProbability: 0.4,
      trialsPerExperiment: 8,
      experimentCount: 30,
      seed: 7,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized sampling scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current statistics viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default sampling scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Decrease or increase the success probability." },
  { keys: "Arrow Up/Down", description: "Increase or decrease the experiment count." },
  { keys: "T / Shift+T", description: "Increase or decrease trials per experiment." },
  { keys: "E", description: "Toggle the expected-value guide." },
  { keys: "M", description: "Toggle the empirical-mean guide." },
  { keys: "R", description: "Reset the sampling scene." },
]

@Component({
  selector: "app-sampling-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./sampling-lab.page.html",
  styleUrl: "./sampling-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplingLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly successProbability = signal(DEFAULT_SAMPLING_LAB_SCENE.successProbability)
  protected readonly trialsPerExperiment = signal(DEFAULT_SAMPLING_LAB_SCENE.trialsPerExperiment)
  protected readonly experimentCount = signal(DEFAULT_SAMPLING_LAB_SCENE.experimentCount)
  protected readonly seed = signal(DEFAULT_SAMPLING_LAB_SCENE.seed)
  protected readonly showExpectedValue = signal(DEFAULT_SAMPLING_LAB_SCENE.showExpectedValue)
  protected readonly showEmpiricalMean = signal(DEFAULT_SAMPLING_LAB_SCENE.showEmpiricalMean)
  protected readonly statusMessage = signal(
    "Focus the histogram area for keyboard probability controls.",
  )
  protected readonly highlights = [
    "Daily-math statistics and probability slice",
    "Deterministic seeded experiments",
    "Histogram plus expected-versus-empirical guides",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    successProbability: {
      value: () => this.successProbability(),
      set: (value) => this.successProbability.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    trialsPerExperiment: {
      value: () => this.trialsPerExperiment(),
      set: (value) => this.trialsPerExperiment.set(Math.round(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    experimentCount: {
      value: () => this.experimentCount(),
      set: (value) => this.experimentCount.set(Math.round(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    seed: {
      value: () => this.seed(),
      set: (value) => this.seed.set(Math.round(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showExpectedValue: {
      value: () => this.showExpectedValue(),
      set: (value) => this.showExpectedValue.set(value),
    },
    showEmpiricalMean: {
      value: () => this.showEmpiricalMean(),
      set: (value) => this.showEmpiricalMean.set(value),
    },
  }
  protected readonly scene = computed<SamplingLabScene>(() => ({
    successProbability: this.successProbability(),
    trialsPerExperiment: this.trialsPerExperiment(),
    experimentCount: this.experimentCount(),
    seed: this.seed(),
    showExpectedValue: this.showExpectedValue(),
    showEmpiricalMean: this.showEmpiricalMean(),
  }))
  protected readonly derivedMetrics = computed(() => simulateSamplingLab(this.scene()))
  protected readonly summary = computed(() =>
    samplingLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const metrics = this.derivedMetrics()

    return [
      { label: "Expected value", value: metrics.theoreticalMean.toFixed(2) },
      { label: "Empirical mean", value: metrics.empiricalMean.toFixed(2) },
      { label: "Trials", value: `${scene.trialsPerExperiment}` },
      { label: "Experiments", value: `${scene.experimentCount}` },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isSamplingLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the sampling scene from the shared URL.")
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

      renderSamplingLabScene(canvasRef.nativeElement, scene, metrics)
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

  protected applyPreset(preset: WorkbenchPreset<SamplingLabScene>): void {
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
          buildWorkbenchShareUrl(SAMPLING_LAB_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "sampling-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_SAMPLING_LAB_SCENE)
        this.statusMessage.set("Sampling scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.successProbability, -0.05, clampProbability)
        this.statusMessage.set("Success probability decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.successProbability, 0.05, clampProbability)
        this.statusMessage.set("Success probability increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.experimentCount, 10, (value) => clampInteger(value, 20, 200))
        this.statusMessage.set("Experiment count increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.experimentCount, -10, (value) => clampInteger(value, 20, 200))
        this.statusMessage.set("Experiment count decreased.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.trialsPerExperiment, 1, (value) => clampInteger(value, 2, 20))
        this.statusMessage.set("Trials per experiment increased.")
        break
      case "T":
        event.preventDefault()
        stepNumericSignal(this.trialsPerExperiment, -1, (value) => clampInteger(value, 2, 20))
        this.statusMessage.set("Trials per experiment decreased.")
        break
      case "e":
      case "E":
        event.preventDefault()
        this.showExpectedValue.update((value) => !value)
        this.statusMessage.set("Expected-value guide toggled.")
        break
      case "m":
      case "M":
        event.preventDefault()
        this.showEmpiricalMean.update((value) => !value)
        this.statusMessage.set("Empirical-mean guide toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_SAMPLING_LAB_SCENE)
        this.statusMessage.set("Sampling scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: SamplingLabScene): void {
    this.successProbability.set(scene.successProbability)
    this.trialsPerExperiment.set(scene.trialsPerExperiment)
    this.experimentCount.set(scene.experimentCount)
    this.seed.set(scene.seed)
    this.showExpectedValue.set(scene.showExpectedValue)
    this.showEmpiricalMean.set(scene.showEmpiricalMean)
  }
}

function clampProbability(value: number): number {
  return Math.max(0.05, Math.min(0.95, Number(value.toFixed(2))))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}
