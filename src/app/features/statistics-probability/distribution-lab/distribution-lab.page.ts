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
  DEFAULT_DISTRIBUTION_LAB_SCENE,
  distributionLabMetrics,
  distributionLabSummary,
  DistributionLabScene,
  isDistributionLabScene,
} from "./distribution-lab.model"
import { renderDistributionLabScene } from "./distribution-lab.renderer"

const DISTRIBUTION_LAB_ROUTE_PATH = "/statistics-probability/distribution-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "trialCount", label: "Trials", min: 2, max: 16, step: 1 },
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
    id: "highlightedOutcome",
    label: "Highlighted outcome",
    min: 0,
    max: 16,
    step: 1,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showExpectedValue", label: "Show expected value guide" },
  { kind: "toggle", id: "showCumulativeProbability", label: "Show cumulative probability shading" },
]
const PRESETS: readonly WorkbenchPreset<DistributionLabScene>[] = [
  {
    label: "Fair coin",
    description: "Balanced eight-trial binomial distribution centered near four successes.",
    state: {
      trialCount: 8,
      successProbability: 0.5,
      highlightedOutcome: 4,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "Rare success",
    description: "Low-probability outcomes concentrated near zero.",
    state: {
      trialCount: 12,
      successProbability: 0.2,
      highlightedOutcome: 2,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "High success",
    description: "Mass shifts toward many successes as p increases.",
    state: {
      trialCount: 10,
      successProbability: 0.75,
      highlightedOutcome: 8,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "Guide focus",
    description: "Hide cumulative shading to focus on exact point probabilities.",
    state: {
      trialCount: 14,
      successProbability: 0.4,
      highlightedOutcome: 5,
      showExpectedValue: true,
      showCumulativeProbability: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized distribution scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current probability viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default distribution scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the highlighted exact outcome." },
  { keys: "Arrow Up/Down", description: "Increase or decrease the success probability." },
  { keys: "T / Shift+T", description: "Increase or decrease the number of trials." },
  { keys: "E", description: "Toggle the expected-value guide." },
  { keys: "C", description: "Toggle cumulative shading." },
  { keys: "R", description: "Reset the distribution scene." },
]

@Component({
  selector: "app-distribution-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./distribution-lab.page.html",
  styleUrl: "./distribution-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributionLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly trialCount = signal(DEFAULT_DISTRIBUTION_LAB_SCENE.trialCount)
  protected readonly successProbability = signal(DEFAULT_DISTRIBUTION_LAB_SCENE.successProbability)
  protected readonly highlightedOutcome = signal(DEFAULT_DISTRIBUTION_LAB_SCENE.highlightedOutcome)
  protected readonly showExpectedValue = signal(DEFAULT_DISTRIBUTION_LAB_SCENE.showExpectedValue)
  protected readonly showCumulativeProbability = signal(
    DEFAULT_DISTRIBUTION_LAB_SCENE.showCumulativeProbability,
  )
  protected readonly statusMessage = signal(
    "Focus the distribution area for keyboard probability controls.",
  )
  protected readonly highlights = [
    "Weekly-math probability slice",
    "Exact binomial distribution instead of sampled experiments",
    "Cumulative probability and expected-value intuition on the shared workbench",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    trialCount: {
      value: () => this.trialCount(),
      set: (value) => {
        const nextTrialCount = clampInteger(value, 2, 16)
        this.trialCount.set(nextTrialCount)
        this.highlightedOutcome.update((outcome) =>
          clampHighlightedOutcome(outcome, nextTrialCount),
        )
      },
      displayValue: (value) => `${Math.round(value)}`,
    },
    successProbability: {
      value: () => this.successProbability(),
      set: (value) => this.successProbability.set(clampProbability(value)),
      displayValue: (value) => value.toFixed(2),
    },
    highlightedOutcome: {
      value: () => this.highlightedOutcome(),
      set: (value) =>
        this.highlightedOutcome.set(clampHighlightedOutcome(value, this.trialCount())),
      displayValue: (value) =>
        `${clampHighlightedOutcome(value, this.trialCount())} of ${this.trialCount()}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showExpectedValue: {
      value: () => this.showExpectedValue(),
      set: (value) => this.showExpectedValue.set(value),
    },
    showCumulativeProbability: {
      value: () => this.showCumulativeProbability(),
      set: (value) => this.showCumulativeProbability.set(value),
    },
  }
  protected readonly scene = computed<DistributionLabScene>(() => ({
    trialCount: this.trialCount(),
    successProbability: this.successProbability(),
    highlightedOutcome: clampHighlightedOutcome(this.highlightedOutcome(), this.trialCount()),
    showExpectedValue: this.showExpectedValue(),
    showCumulativeProbability: this.showCumulativeProbability(),
  }))
  protected readonly derivedMetrics = computed(() => distributionLabMetrics(this.scene()))
  protected readonly summary = computed(() =>
    distributionLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const metrics = this.derivedMetrics()

    return [
      { label: "P(X = k)", value: metrics.highlightedProbability.toFixed(3) },
      { label: "P(X <= k)", value: metrics.cumulativeProbability.toFixed(3) },
      { label: "Expected value", value: metrics.expectedValue.toFixed(2) },
      { label: "Variance", value: metrics.variance.toFixed(2) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isDistributionLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the distribution scene from the shared URL.")
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

      renderDistributionLabScene(canvasRef.nativeElement, scene, metrics)
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

  protected applyPreset(preset: WorkbenchPreset<DistributionLabScene>): void {
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
          buildWorkbenchShareUrl(DISTRIBUTION_LAB_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "distribution-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_DISTRIBUTION_LAB_SCENE)
        this.statusMessage.set("Distribution scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.highlightedOutcome, -1, (value) =>
          clampHighlightedOutcome(value, this.trialCount()),
        )
        this.statusMessage.set("Highlighted outcome moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.highlightedOutcome, 1, (value) =>
          clampHighlightedOutcome(value, this.trialCount()),
        )
        this.statusMessage.set("Highlighted outcome moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.successProbability, 0.05, clampProbability)
        this.statusMessage.set("Success probability increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.successProbability, -0.05, clampProbability)
        this.statusMessage.set("Success probability decreased.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.trialCount, 1, (value) => clampInteger(value, 2, 16))
        this.highlightedOutcome.update((value) => clampHighlightedOutcome(value, this.trialCount()))
        this.statusMessage.set("Trial count increased.")
        break
      case "T":
        event.preventDefault()
        stepNumericSignal(this.trialCount, -1, (value) => clampInteger(value, 2, 16))
        this.highlightedOutcome.update((value) => clampHighlightedOutcome(value, this.trialCount()))
        this.statusMessage.set("Trial count decreased.")
        break
      case "e":
      case "E":
        event.preventDefault()
        this.showExpectedValue.update((value) => !value)
        this.statusMessage.set("Expected-value guide toggled.")
        break
      case "c":
      case "C":
        event.preventDefault()
        this.showCumulativeProbability.update((value) => !value)
        this.statusMessage.set("Cumulative shading toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_DISTRIBUTION_LAB_SCENE)
        this.statusMessage.set("Distribution scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: DistributionLabScene): void {
    const trialCount = clampInteger(scene.trialCount, 2, 16)
    this.trialCount.set(trialCount)
    this.successProbability.set(clampProbability(scene.successProbability))
    this.highlightedOutcome.set(clampHighlightedOutcome(scene.highlightedOutcome, trialCount))
    this.showExpectedValue.set(scene.showExpectedValue)
    this.showCumulativeProbability.set(scene.showCumulativeProbability)
  }
}

function clampProbability(value: number): number {
  return Number(Math.max(0.05, Math.min(0.95, value)).toFixed(2))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function clampHighlightedOutcome(value: number, trialCount: number): number {
  return clampInteger(value, 0, trialCount)
}
