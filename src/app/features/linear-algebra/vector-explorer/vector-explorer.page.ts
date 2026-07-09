import { isPlatformBrowser } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  ElementRef,
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
import { stepObjectNumericSignal } from "../../../shared/math-workbench/workbench-keyboard-state"
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
  DEFAULT_VECTOR_SCENE,
  isVectorScene,
  vectorAngleDegrees,
  vectorMagnitude,
  Vector2,
  VectorScene,
  vectorSummary,
} from "./vector-explorer.model"
import { renderVectorScene } from "./vector-explorer.renderer"

const VECTOR_ROUTE_PATH = "/linear-algebra/vectors"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "x", label: "X component", min: -6, max: 6, step: 0.5 },
  { kind: "range", id: "y", label: "Y component", min: -6, max: 6, step: 0.5 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "basisVisible", label: "Show basis labels" },
  { kind: "toggle", id: "projectionVisible", label: "Show component projection" },
]
const PRESETS: readonly WorkbenchPreset<VectorScene>[] = [
  {
    label: "Applied default",
    description: "Balanced first-quadrant engineering vector.",
    state: { vector: { x: 3, y: 2 }, basisVisible: true, projectionVisible: true },
  },
  {
    label: "Axis aligned",
    description: "Pure horizontal component.",
    state: { vector: { x: 5, y: 0 }, basisVisible: true, projectionVisible: true },
  },
  {
    label: "Quadrant II",
    description: "Negative x and positive y.",
    state: { vector: { x: -2, y: 4 }, basisVisible: true, projectionVisible: true },
  },
  {
    label: "Quadrant III",
    description: "Negative vector with both components visible.",
    state: { vector: { x: -4, y: -3 }, basisVisible: true, projectionVisible: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized vector scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current vector viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default vector scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow keys", description: "Move the vector tip while the viewport is focused." },
  { keys: "Shift + Arrow keys", description: "Move faster by one unit per keypress." },
  { keys: "B", description: "Toggle basis labels." },
  { keys: "P", description: "Toggle projection lines." },
  { keys: "R", description: "Reset the vector to the default preset." },
]

@Component({
  selector: "app-vector-explorer-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./vector-explorer.page.html",
  styleUrl: "./vector-explorer.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VectorExplorerPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly vector = signal<Vector2>(DEFAULT_VECTOR_SCENE.vector)
  protected readonly basisVisible = signal(DEFAULT_VECTOR_SCENE.basisVisible)
  protected readonly projectionVisible = signal(DEFAULT_VECTOR_SCENE.projectionVisible)
  protected readonly statusMessage = signal("Focus the graph area for keyboard vector controls.")
  protected readonly highlights = [
    "Renderer-ready scene model",
    "Signal-driven controls",
    "Serialized state with workbench actions",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    x: {
      value: () => this.vector().x,
      set: (value) => this.vector.update((vector) => ({ ...vector, x: value })),
      displayValue: (value) => value.toFixed(1),
    },
    y: {
      value: () => this.vector().y,
      set: (value) => this.vector.update((vector) => ({ ...vector, y: value })),
      displayValue: (value) => value.toFixed(1),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    basisVisible: {
      value: () => this.basisVisible(),
      set: (value) => this.basisVisible.set(value),
    },
    projectionVisible: {
      value: () => this.projectionVisible(),
      set: (value) => this.projectionVisible.set(value),
    },
  }
  protected readonly scene = computed<VectorScene>(() => ({
    vector: this.vector(),
    basisVisible: this.basisVisible(),
    projectionVisible: this.projectionVisible(),
  }))
  protected readonly summary = computed(() => vectorSummary(this.vector()))
  protected readonly metrics = computed(() => [
    { label: "Magnitude", value: vectorMagnitude(this.vector()).toFixed(2) },
    { label: "Angle", value: `${vectorAngleDegrees(this.vector()).toFixed(1)}°` },
    { label: "Quadrant", value: getQuadrantLabel(this.vector()) },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isVectorScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the vector scene from the shared URL.")
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

      renderVectorScene(canvasRef.nativeElement, scene)
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

  protected applyPreset(preset: WorkbenchPreset<VectorScene>): void {
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
          buildWorkbenchShareUrl(VECTOR_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "vector-explorer.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_VECTOR_SCENE)
        this.statusMessage.set("Vector scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 1 : 0.5

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        stepObjectNumericSignal(this.vector, "y", step, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Vector moved upward.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepObjectNumericSignal(this.vector, "y", -step, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Vector moved downward.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepObjectNumericSignal(this.vector, "x", step, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Vector moved right.")
        break
      case "ArrowLeft":
        event.preventDefault()
        stepObjectNumericSignal(this.vector, "x", -step, (value) => clamp(value, -6, 6))
        this.statusMessage.set("Vector moved left.")
        break
      case "b":
      case "B":
        event.preventDefault()
        this.basisVisible.update((value) => !value)
        this.statusMessage.set("Basis labels toggled.")
        break
      case "p":
      case "P":
        event.preventDefault()
        this.projectionVisible.update((value) => !value)
        this.statusMessage.set("Projection lines toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_VECTOR_SCENE)
        this.statusMessage.set("Vector scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: VectorScene): void {
    this.vector.set(scene.vector)
    this.basisVisible.set(scene.basisVisible)
    this.projectionVisible.set(scene.projectionVisible)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getQuadrantLabel(vector: Vector2): string {
  if (vector.x === 0 && vector.y === 0) {
    return "Origin"
  }

  if (vector.x >= 0 && vector.y >= 0) {
    return "Quadrant I"
  }

  if (vector.x < 0 && vector.y >= 0) {
    return "Quadrant II"
  }

  if (vector.x < 0 && vector.y < 0) {
    return "Quadrant III"
  }

  return "Quadrant IV"
}
