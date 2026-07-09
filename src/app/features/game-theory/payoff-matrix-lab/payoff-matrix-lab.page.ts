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
  DEFAULT_PAYOFF_MATRIX_LAB_SCENE,
  isPayoffMatrixLabScene,
  payoffMatrixLabMetrics,
  PayoffMatrixLabScene,
  payoffMatrixLabSummary,
  strategyLabel,
} from "./payoff-matrix-lab.model"
import { renderPayoffMatrixLabScene } from "./payoff-matrix-lab.renderer"

const PAYOFF_MATRIX_ROUTE_PATH = "/game-theory/payoff-matrix-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "temptation", label: "Temptation (T)", min: 0, max: 8, step: 1 },
  { kind: "range", id: "reward", label: "Reward (R)", min: 0, max: 6, step: 1 },
  { kind: "range", id: "punishment", label: "Punishment (P)", min: -1, max: 5, step: 1 },
  { kind: "range", id: "sucker", label: "Sucker payoff (S)", min: -2, max: 4, step: 1 },
  { kind: "range", id: "selectedRowStrategy", label: "Row strategy", min: 0, max: 1, step: 1 },
  {
    kind: "range",
    id: "selectedColumnStrategy",
    label: "Column strategy",
    min: 0,
    max: 1,
    step: 1,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showBestResponses", label: "Show best responses" },
  { kind: "toggle", id: "showNashHighlight", label: "Show Nash equilibrium highlight" },
]
const PRESETS: readonly WorkbenchPreset<PayoffMatrixLabScene>[] = [
  {
    label: "Prisoner’s dilemma",
    description: "Defection strictly dominates cooperation.",
    state: {
      temptation: 5,
      reward: 3,
      punishment: 1,
      sucker: 0,
      selectedRowStrategy: 1,
      selectedColumnStrategy: 1,
      showBestResponses: true,
      showNashHighlight: true,
    },
  },
  {
    label: "Stag hunt",
    description: "Two equilibria with different coordination quality.",
    state: {
      temptation: 2,
      reward: 4,
      punishment: 3,
      sucker: 0,
      selectedRowStrategy: 0,
      selectedColumnStrategy: 0,
      showBestResponses: true,
      showNashHighlight: true,
    },
  },
  {
    label: "Chicken",
    description: "Anti-coordination with asymmetric best responses.",
    state: {
      temptation: 4,
      reward: 3,
      punishment: 1,
      sucker: 0,
      selectedRowStrategy: 0,
      selectedColumnStrategy: 1,
      showBestResponses: true,
      showNashHighlight: true,
    },
  },
  {
    label: "Payoff focus",
    description: "Hide overlays and inspect the selected outcome only.",
    state: {
      temptation: 5,
      reward: 3,
      punishment: 1,
      sucker: -1,
      selectedRowStrategy: 0,
      selectedColumnStrategy: 1,
      showBestResponses: false,
      showNashHighlight: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized game-theory scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current payoff matrix as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default payoff matrix scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow keys", description: "Move the selected strategy profile across the 2x2 matrix." },
  { keys: "T / Shift+T", description: "Increase or decrease temptation." },
  { keys: "W / Shift+W", description: "Increase or decrease reward." },
  { keys: "P / Shift+P", description: "Increase or decrease punishment." },
  { keys: "S / Shift+S", description: "Increase or decrease the sucker payoff." },
  { keys: "B", description: "Toggle best-response overlays." },
  { keys: "N", description: "Toggle Nash highlighting." },
  { keys: "R", description: "Reset the payoff matrix scene." },
]

@Component({
  selector: "app-payoff-matrix-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./payoff-matrix-lab.page.html",
  styleUrl: "./payoff-matrix-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoffMatrixLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly temptation = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.temptation)
  protected readonly reward = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.reward)
  protected readonly punishment = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.punishment)
  protected readonly sucker = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.sucker)
  protected readonly selectedRowStrategy = signal<0 | 1>(
    DEFAULT_PAYOFF_MATRIX_LAB_SCENE.selectedRowStrategy,
  )
  protected readonly selectedColumnStrategy = signal<0 | 1>(
    DEFAULT_PAYOFF_MATRIX_LAB_SCENE.selectedColumnStrategy,
  )
  protected readonly showBestResponses = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.showBestResponses)
  protected readonly showNashHighlight = signal(DEFAULT_PAYOFF_MATRIX_LAB_SCENE.showNashHighlight)
  protected readonly statusMessage = signal(
    "Focus the payoff matrix for keyboard game-theory controls.",
  )
  protected readonly highlights = [
    "Monthly-math game-theory slice",
    "2x2 payoff matrix with best responses and Nash equilibrium cues",
    "Classic prisoner’s dilemma, stag hunt, and chicken presets",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    temptation: {
      value: () => this.temptation(),
      set: (value) => this.temptation.set(clampInteger(value, 0, 8)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    reward: {
      value: () => this.reward(),
      set: (value) => this.reward.set(clampInteger(value, 0, 6)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    punishment: {
      value: () => this.punishment(),
      set: (value) => this.punishment.set(clampInteger(value, -1, 5)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    sucker: {
      value: () => this.sucker(),
      set: (value) => this.sucker.set(clampInteger(value, -2, 4)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    selectedRowStrategy: {
      value: () => this.selectedRowStrategy(),
      set: (value) => this.selectedRowStrategy.set(strategyFromNumber(value)),
      displayValue: (value) => strategyLabel(strategyFromNumber(value)),
    },
    selectedColumnStrategy: {
      value: () => this.selectedColumnStrategy(),
      set: (value) => this.selectedColumnStrategy.set(strategyFromNumber(value)),
      displayValue: (value) => strategyLabel(strategyFromNumber(value)),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showBestResponses: {
      value: () => this.showBestResponses(),
      set: (value) => this.showBestResponses.set(value),
    },
    showNashHighlight: {
      value: () => this.showNashHighlight(),
      set: (value) => this.showNashHighlight.set(value),
    },
  }
  protected readonly scene = computed<PayoffMatrixLabScene>(() => ({
    temptation: this.temptation(),
    reward: this.reward(),
    punishment: this.punishment(),
    sucker: this.sucker(),
    selectedRowStrategy: this.selectedRowStrategy(),
    selectedColumnStrategy: this.selectedColumnStrategy(),
    showBestResponses: this.showBestResponses(),
    showNashHighlight: this.showNashHighlight(),
  }))
  protected readonly derivedMetrics = computed(() => payoffMatrixLabMetrics(this.scene()))
  protected readonly summary = computed(() =>
    payoffMatrixLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const metrics = this.derivedMetrics()

    return [
      {
        label: "Selected payoff",
        value: `${metrics.selectedCell.rowPayoff}, ${metrics.selectedCell.columnPayoff}`,
      },
      { label: "Nash equilibria", value: `${metrics.nashEquilibria.length}` },
      { label: "Row strategy", value: strategyLabel(this.selectedRowStrategy()) },
      { label: "Column strategy", value: strategyLabel(this.selectedColumnStrategy()) },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isPayoffMatrixLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the payoff matrix scene from the shared URL.")
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

      renderPayoffMatrixLabScene(canvasRef.nativeElement, scene, metrics)
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
          buildWorkbenchShareUrl(PAYOFF_MATRIX_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "payoff-matrix-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_PAYOFF_MATRIX_LAB_SCENE)
        this.statusMessage.set("Payoff matrix scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        this.selectedColumnStrategy.set(0)
        this.statusMessage.set("Selected the cooperate column.")
        break
      case "ArrowRight":
        event.preventDefault()
        this.selectedColumnStrategy.set(1)
        this.statusMessage.set("Selected the defect column.")
        break
      case "ArrowUp":
        event.preventDefault()
        this.selectedRowStrategy.set(0)
        this.statusMessage.set("Selected the cooperate row.")
        break
      case "ArrowDown":
        event.preventDefault()
        this.selectedRowStrategy.set(1)
        this.statusMessage.set("Selected the defect row.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.temptation, 1, (value) => clampInteger(value, 0, 8))
        this.statusMessage.set("Temptation increased.")
        break
      case "T":
        event.preventDefault()
        stepNumericSignal(this.temptation, -1, (value) => clampInteger(value, 0, 8))
        this.statusMessage.set("Temptation decreased.")
        break
      case "w":
        event.preventDefault()
        stepNumericSignal(this.reward, 1, (value) => clampInteger(value, 0, 6))
        this.statusMessage.set("Reward increased.")
        break
      case "W":
        event.preventDefault()
        stepNumericSignal(this.reward, -1, (value) => clampInteger(value, 0, 6))
        this.statusMessage.set("Reward decreased.")
        break
      case "p":
        event.preventDefault()
        stepNumericSignal(this.punishment, 1, (value) => clampInteger(value, -1, 5))
        this.statusMessage.set("Punishment increased.")
        break
      case "P":
        event.preventDefault()
        stepNumericSignal(this.punishment, -1, (value) => clampInteger(value, -1, 5))
        this.statusMessage.set("Punishment decreased.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.sucker, 1, (value) => clampInteger(value, -2, 4))
        this.statusMessage.set("Sucker payoff increased.")
        break
      case "S":
        event.preventDefault()
        stepNumericSignal(this.sucker, -1, (value) => clampInteger(value, -2, 4))
        this.statusMessage.set("Sucker payoff decreased.")
        break
      case "b":
      case "B":
        event.preventDefault()
        this.showBestResponses.update((value) => !value)
        this.statusMessage.set("Best-response overlays toggled.")
        break
      case "n":
      case "N":
        event.preventDefault()
        this.showNashHighlight.update((value) => !value)
        this.statusMessage.set("Nash highlighting toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_PAYOFF_MATRIX_LAB_SCENE)
        this.statusMessage.set("Payoff matrix scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: PayoffMatrixLabScene): void {
    this.temptation.set(clampInteger(scene.temptation, 0, 8))
    this.reward.set(clampInteger(scene.reward, 0, 6))
    this.punishment.set(clampInteger(scene.punishment, -1, 5))
    this.sucker.set(clampInteger(scene.sucker, -2, 4))
    this.selectedRowStrategy.set(strategyFromNumber(scene.selectedRowStrategy))
    this.selectedColumnStrategy.set(strategyFromNumber(scene.selectedColumnStrategy))
    this.showBestResponses.set(scene.showBestResponses)
    this.showNashHighlight.set(scene.showNashHighlight)
  }
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function strategyFromNumber(value: number): 0 | 1 {
  return Math.round(value) <= 0 ? 0 : 1
}
