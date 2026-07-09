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
import {
  DEFAULT_QUADRATIC_SCENE,
  isQuadraticScene,
  QuadraticScene,
  quadraticDiscriminant,
  quadraticRoots,
  quadraticSummary,
  quadraticVertex,
} from "./quadratic-plotter.model"
import { renderQuadraticScene } from "./quadratic-plotter.renderer"

const QUADRATIC_ROUTE_PATH = "/algebra/quadratic-plotter"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "a", label: "a coefficient", min: -3, max: 3, step: 0.25 },
  { kind: "range", id: "b", label: "b coefficient", min: -6, max: 6, step: 0.5 },
  { kind: "range", id: "c", label: "c coefficient", min: -8, max: 8, step: 0.5 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showRoots", label: "Show roots" },
  { kind: "toggle", id: "showVertex", label: "Show vertex" },
]
const PRESETS: readonly WorkbenchPreset<QuadraticScene>[] = [
  {
    label: "Two real roots",
    description: "Default engineering-friendly parabola.",
    state: { a: 1, b: -2, c: -3, showRoots: true, showVertex: true },
  },
  {
    label: "Repeated root",
    description: "Tangent parabola at the x-axis.",
    state: { a: 1, b: -4, c: 4, showRoots: true, showVertex: true },
  },
  {
    label: "No real roots",
    description: "Positive discriminant disappears.",
    state: { a: 1, b: 2, c: 5, showRoots: true, showVertex: true },
  },
  {
    label: "Inverted parabola",
    description: "Concavity flips downward.",
    state: { a: -0.75, b: 1.5, c: 4, showRoots: true, showVertex: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized scene state.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current canvas view as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default quadratic scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease coefficient a while the viewport is focused.",
  },
  { keys: "Arrow Left/Right", description: "Adjust coefficient b while the viewport is focused." },
  { keys: "Page Up/Page Down", description: "Adjust coefficient c while the viewport is focused." },
  { keys: "R", description: "Reset the scene to the default preset." },
]

@Component({
  selector: "app-quadratic-plotter-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./quadratic-plotter.page.html",
  styleUrl: "./quadratic-plotter.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuadraticPlotterPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly a = signal(DEFAULT_QUADRATIC_SCENE.a)
  protected readonly b = signal(DEFAULT_QUADRATIC_SCENE.b)
  protected readonly c = signal(DEFAULT_QUADRATIC_SCENE.c)
  protected readonly showRoots = signal(DEFAULT_QUADRATIC_SCENE.showRoots)
  protected readonly showVertex = signal(DEFAULT_QUADRATIC_SCENE.showVertex)
  protected readonly statusMessage = signal(
    "Focus the graph area for keyboard coefficient controls.",
  )
  protected readonly highlights = [
    "Second Canvas-backed Phase 1 slice",
    "Shared serialized state and actions",
    "Accessible keyboard-driven graph tuning",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    a: {
      value: () => this.a(),
      set: (value) => this.a.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    b: {
      value: () => this.b(),
      set: (value) => this.b.set(value),
      displayValue: (value) => value.toFixed(2),
    },
    c: {
      value: () => this.c(),
      set: (value) => this.c.set(value),
      displayValue: (value) => value.toFixed(2),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showRoots: { value: () => this.showRoots(), set: (value) => this.showRoots.set(value) },
    showVertex: { value: () => this.showVertex(), set: (value) => this.showVertex.set(value) },
  }
  protected readonly scene = computed<QuadraticScene>(() => ({
    a: this.a(),
    b: this.b(),
    c: this.c(),
    showRoots: this.showRoots(),
    showVertex: this.showVertex(),
  }))
  protected readonly summary = computed(() => quadraticSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const vertex = quadraticVertex(scene)
    const roots = quadraticRoots(scene)

    return [
      { label: "Discriminant", value: quadraticDiscriminant(scene).toFixed(2) },
      { label: "Vertex", value: `(${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})` },
      {
        label: "Roots",
        value:
          roots.length === 0 ? "No real roots" : roots.map((root) => root.toFixed(2)).join(", "),
      },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isQuadraticScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the quadratic scene from the shared URL.")
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

      renderQuadraticScene(canvasRef.nativeElement, scene)
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

  protected applyPreset(preset: WorkbenchPreset<QuadraticScene>): void {
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
          buildWorkbenchShareUrl(QUADRATIC_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "quadratic-plotter.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_QUADRATIC_SCENE)
        this.statusMessage.set("Quadratic scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.a, 0.25, (value) => clamp(value, -3, 3))
        this.statusMessage.set("Coefficient a increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.a, -0.25, (value) => clamp(value, -3, 3))
        this.statusMessage.set("Coefficient a decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.b, 0.5, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Coefficient b increased.")
        break
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.b, -0.5, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Coefficient b decreased.")
        break
      case "PageUp":
        event.preventDefault()
        stepNumericSignal(this.c, 0.5, (value) => clamp(value, -8, 8))
        this.statusMessage.set("Coefficient c increased.")
        break
      case "PageDown":
        event.preventDefault()
        stepNumericSignal(this.c, -0.5, (value) => clamp(value, -8, 8))
        this.statusMessage.set("Coefficient c decreased.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_QUADRATIC_SCENE)
        this.statusMessage.set("Quadratic scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: QuadraticScene): void {
    this.a.set(scene.a)
    this.b.set(scene.b)
    this.c.set(scene.c)
    this.showRoots.set(scene.showRoots)
    this.showVertex.set(scene.showVertex)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
