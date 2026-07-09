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
  DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE,
  eulerCharacteristicLabMetrics,
  eulerCharacteristicLabSummary,
  EulerCharacteristicLabScene,
  isEulerCharacteristicLabScene,
} from "./euler-characteristic-lab.model"
import { renderEulerCharacteristicLabScene } from "./euler-characteristic-lab.renderer"

const EULER_CHARACTERISTIC_ROUTE_PATH = "/topology/euler-characteristic-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "genus", label: "Genus", min: 0, max: 3, step: 1 },
  { kind: "range", id: "boundaryCount", label: "Boundary components", min: 0, max: 3, step: 1 },
  { kind: "range", id: "decompositionDepth", label: "Cell-hint density", min: 1, max: 5, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showFormula", label: "Show Euler characteristic formula" },
  { kind: "toggle", id: "showCellHints", label: "Show cell decomposition hints" },
]
const PRESETS: readonly WorkbenchPreset<EulerCharacteristicLabScene>[] = [
  {
    label: "Sphere",
    description: "No handles and no boundary components.",
    state: {
      genus: 0,
      boundaryCount: 0,
      decompositionDepth: 2,
      showFormula: true,
      showCellHints: true,
    },
  },
  {
    label: "Torus",
    description: "A single handle drops the Euler characteristic to zero.",
    state: {
      genus: 1,
      boundaryCount: 0,
      decompositionDepth: 3,
      showFormula: true,
      showCellHints: true,
    },
  },
  {
    label: "Pair of pants",
    description: "Three boundary circles without handles.",
    state: {
      genus: 0,
      boundaryCount: 3,
      decompositionDepth: 3,
      showFormula: true,
      showCellHints: true,
    },
  },
  {
    label: "Double torus",
    description: "Two handles produce χ = -2.",
    state: {
      genus: 2,
      boundaryCount: 0,
      decompositionDepth: 4,
      showFormula: true,
      showCellHints: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized topology scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current topology viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default topology scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Decrease or increase genus." },
  { keys: "Arrow Up/Down", description: "Decrease or increase the number of boundary components." },
  { keys: "D / Shift+D", description: "Increase or decrease the cell-hint density." },
  { keys: "F", description: "Toggle the Euler characteristic formula." },
  { keys: "C", description: "Toggle cell decomposition hints." },
  { keys: "R", description: "Reset the topology scene." },
]

@Component({
  selector: "app-euler-characteristic-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./euler-characteristic-lab.page.html",
  styleUrl: "./euler-characteristic-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EulerCharacteristicLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly genus = signal(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE.genus)
  protected readonly boundaryCount = signal(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE.boundaryCount)
  protected readonly decompositionDepth = signal(
    DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE.decompositionDepth,
  )
  protected readonly showFormula = signal(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE.showFormula)
  protected readonly showCellHints = signal(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE.showCellHints)
  protected readonly statusMessage = signal(
    "Focus the topology viewport for keyboard surface controls.",
  )
  protected readonly highlights = [
    "Rare-math topology slice",
    "Orientable surfaces classified by genus and boundary count",
    "Euler characteristic and Betti-number intuition on the shared workbench",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    genus: {
      value: () => this.genus(),
      set: (value) => this.genus.set(clampInteger(value, 0, 3)),
      displayValue: (value) => `${clampInteger(value, 0, 3)}`,
    },
    boundaryCount: {
      value: () => this.boundaryCount(),
      set: (value) => this.boundaryCount.set(clampInteger(value, 0, 3)),
      displayValue: (value) => `${clampInteger(value, 0, 3)}`,
    },
    decompositionDepth: {
      value: () => this.decompositionDepth(),
      set: (value) => this.decompositionDepth.set(clampInteger(value, 1, 5)),
      displayValue: (value) => `${clampInteger(value, 1, 5)}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showFormula: { value: () => this.showFormula(), set: (value) => this.showFormula.set(value) },
    showCellHints: {
      value: () => this.showCellHints(),
      set: (value) => this.showCellHints.set(value),
    },
  }
  protected readonly scene = computed<EulerCharacteristicLabScene>(() => ({
    genus: this.genus(),
    boundaryCount: this.boundaryCount(),
    decompositionDepth: this.decompositionDepth(),
    showFormula: this.showFormula(),
    showCellHints: this.showCellHints(),
  }))
  protected readonly derivedMetrics = computed(() => eulerCharacteristicLabMetrics(this.scene()))
  protected readonly summary = computed(() =>
    eulerCharacteristicLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const metrics = this.derivedMetrics()

    return [
      { label: "Surface", value: metrics.surfaceName },
      { label: "Euler characteristic", value: `${metrics.eulerCharacteristic}` },
      { label: "First Betti number", value: `${metrics.firstBettiNumber}` },
      {
        label: "Suggested V-E+F",
        value: `${metrics.suggestedVertexCount}-${metrics.suggestedEdgeCount}+${metrics.suggestedFaceCount}`,
      },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isEulerCharacteristicLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the topology scene from the shared URL.")
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

      renderEulerCharacteristicLabScene(canvasRef.nativeElement, scene, metrics)
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
          buildWorkbenchShareUrl(EULER_CHARACTERISTIC_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "euler-characteristic-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE)
        this.statusMessage.set("Topology scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.genus, -1, (value) => clampInteger(value, 0, 3))
        this.statusMessage.set("Genus decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.genus, 1, (value) => clampInteger(value, 0, 3))
        this.statusMessage.set("Genus increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.boundaryCount, -1, (value) => clampInteger(value, 0, 3))
        this.statusMessage.set("Boundary count decreased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.boundaryCount, 1, (value) => clampInteger(value, 0, 3))
        this.statusMessage.set("Boundary count increased.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.decompositionDepth, 1, (value) => clampInteger(value, 1, 5))
        this.statusMessage.set("Cell-hint density increased.")
        break
      case "D":
        event.preventDefault()
        stepNumericSignal(this.decompositionDepth, -1, (value) => clampInteger(value, 1, 5))
        this.statusMessage.set("Cell-hint density decreased.")
        break
      case "f":
      case "F":
        event.preventDefault()
        this.showFormula.update((value) => !value)
        this.statusMessage.set("Euler characteristic formula toggled.")
        break
      case "c":
      case "C":
        event.preventDefault()
        this.showCellHints.update((value) => !value)
        this.statusMessage.set("Cell decomposition hints toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_EULER_CHARACTERISTIC_LAB_SCENE)
        this.statusMessage.set("Topology scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: EulerCharacteristicLabScene): void {
    this.genus.set(clampInteger(scene.genus, 0, 3))
    this.boundaryCount.set(clampInteger(scene.boundaryCount, 0, 3))
    this.decompositionDepth.set(clampInteger(scene.decompositionDepth, 1, 5))
    this.showFormula.set(scene.showFormula)
    this.showCellHints.set(scene.showCellHints)
  }
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}
