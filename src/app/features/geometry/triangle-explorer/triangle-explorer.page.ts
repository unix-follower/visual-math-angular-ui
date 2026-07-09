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
  DEFAULT_TRIANGLE_SCENE,
  isTriangleScene,
  triangleArea,
  triangleCentroid,
  trianglePerimeter,
  TriangleScene,
  triangleSummary,
} from "./triangle-explorer.model"
import { renderTriangleScene } from "./triangle-explorer.renderer"

const TRIANGLE_ROUTE_PATH = "/geometry/triangle-explorer"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "base", label: "Base length", min: 2, max: 10, step: 0.5 },
  { kind: "range", id: "height", label: "Height", min: 2, max: 8, step: 0.5 },
  { kind: "range", id: "rotationDegrees", label: "Rotation", min: -180, max: 180, step: 5 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showCentroid", label: "Show centroid" },
  { kind: "toggle", id: "showSideLengths", label: "Show side lengths" },
]
const PRESETS: readonly WorkbenchPreset<TriangleScene>[] = [
  {
    label: "Balanced triangle",
    description: "Readable baseline for area and centroid intuition.",
    state: { base: 6, height: 4, rotationDegrees: 0, showCentroid: true, showSideLengths: true },
  },
  {
    label: "Tall triangle",
    description: "Pushes centroid upward and changes perimeter.",
    state: { base: 4, height: 7, rotationDegrees: 0, showCentroid: true, showSideLengths: true },
  },
  {
    label: "Wide rotated",
    description: "Highlights rigid rotation and unchanged area.",
    state: { base: 9, height: 3.5, rotationDegrees: 35, showCentroid: true, showSideLengths: true },
  },
  {
    label: "Minimal labels",
    description: "Focuses on shape alone.",
    state: {
      base: 5,
      height: 4.5,
      rotationDegrees: -25,
      showCentroid: false,
      showSideLengths: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized triangle scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current geometry viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default triangle scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Adjust the base length while the viewport is focused.",
  },
  { keys: "Arrow Up/Down", description: "Adjust the height." },
  { keys: "[ and ]", description: "Rotate the triangle by five degrees." },
  { keys: "C", description: "Toggle centroid visibility." },
  { keys: "L", description: "Toggle side-length labels." },
  { keys: "R", description: "Reset to the default triangle preset." },
]

@Component({
  selector: "app-triangle-explorer-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./triangle-explorer.page.html",
  styleUrl: "./triangle-explorer.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriangleExplorerPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly base = signal(DEFAULT_TRIANGLE_SCENE.base)
  protected readonly height = signal(DEFAULT_TRIANGLE_SCENE.height)
  protected readonly rotationDegrees = signal(DEFAULT_TRIANGLE_SCENE.rotationDegrees)
  protected readonly showCentroid = signal(DEFAULT_TRIANGLE_SCENE.showCentroid)
  protected readonly showSideLengths = signal(DEFAULT_TRIANGLE_SCENE.showSideLengths)
  protected readonly statusMessage = signal("Focus the graph area for keyboard geometry controls.")
  protected readonly highlights = [
    "Daily-math geometry slice",
    "Shared preset and share-link contract",
    "Canvas measurements and rotation cues",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    base: {
      value: () => this.base(),
      set: (value) => this.base.set(value),
      displayValue: (value) => value.toFixed(1),
    },
    height: {
      value: () => this.height(),
      set: (value) => this.height.set(value),
      displayValue: (value) => value.toFixed(1),
    },
    rotationDegrees: {
      value: () => this.rotationDegrees(),
      set: (value) => this.rotationDegrees.set(value),
      displayValue: (value) => value.toFixed(0),
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showCentroid: {
      value: () => this.showCentroid(),
      set: (value) => this.showCentroid.set(value),
    },
    showSideLengths: {
      value: () => this.showSideLengths(),
      set: (value) => this.showSideLengths.set(value),
    },
  }
  protected readonly scene = computed<TriangleScene>(() => ({
    base: this.base(),
    height: this.height(),
    rotationDegrees: this.rotationDegrees(),
    showCentroid: this.showCentroid(),
    showSideLengths: this.showSideLengths(),
  }))
  protected readonly summary = computed(() => triangleSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const centroid = triangleCentroid(scene)

    return [
      { label: "Area", value: triangleArea(scene).toFixed(2) },
      { label: "Perimeter", value: trianglePerimeter(scene).toFixed(2) },
      { label: "Centroid", value: `(${centroid.x.toFixed(2)}, ${centroid.y.toFixed(2)})` },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isTriangleScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the triangle scene from the shared URL.")
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

      renderTriangleScene(canvasRef.nativeElement, scene)
    })
  }

  protected rangeValue(controlId: string): number {
    return readRangeControlValue(this.rangeControlAdapters, controlId)
  }

  protected updateRange(controlId: string, event: Event): void {
    writeRangeControlValue(this.rangeControlAdapters, controlId, event)
  }

  protected rangeDisplayValue(controlId: string): string {
    return readRangeControlDisplayValue(this.rangeControlAdapters, controlId)
  }

  protected toggleValue(controlId: string): boolean {
    return readToggleControlValue(this.toggleControlAdapters, controlId)
  }

  protected toggleOption(controlId: string, event: Event): void {
    writeToggleControlValue(this.toggleControlAdapters, controlId, event)
  }

  protected applyPreset(preset: WorkbenchPreset<TriangleScene>): void {
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
          buildWorkbenchShareUrl(TRIANGLE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "triangle-explorer.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_TRIANGLE_SCENE)
        this.statusMessage.set("Triangle scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.base, -0.5, (value) => clamp(value, 2, 10))
        this.statusMessage.set("Base length decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.base, 0.5, (value) => clamp(value, 2, 10))
        this.statusMessage.set("Base length increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.height, 0.5, (value) => clamp(value, 2, 8))
        this.statusMessage.set("Height increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.height, -0.5, (value) => clamp(value, 2, 8))
        this.statusMessage.set("Height decreased.")
        break
      case "[":
        event.preventDefault()
        stepNumericSignal(this.rotationDegrees, -5, (value) => clamp(value, -180, 180))
        this.statusMessage.set("Triangle rotated counterclockwise.")
        break
      case "]":
        event.preventDefault()
        stepNumericSignal(this.rotationDegrees, 5, (value) => clamp(value, -180, 180))
        this.statusMessage.set("Triangle rotated clockwise.")
        break
      case "c":
      case "C":
        event.preventDefault()
        this.showCentroid.update((value) => !value)
        this.statusMessage.set("Centroid visibility toggled.")
        break
      case "l":
      case "L":
        event.preventDefault()
        this.showSideLengths.update((value) => !value)
        this.statusMessage.set("Side-length labels toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_TRIANGLE_SCENE)
        this.statusMessage.set("Triangle scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: TriangleScene): void {
    this.base.set(scene.base)
    this.height.set(scene.height)
    this.rotationDegrees.set(scene.rotationDegrees)
    this.showCentroid.set(scene.showCentroid)
    this.showSideLengths.set(scene.showSideLengths)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
