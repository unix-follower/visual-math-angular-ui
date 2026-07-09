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
  DEFAULT_UNIT_CIRCLE_SCENE,
  isUnitCircleScene,
  normalizedAngleDegrees,
  tangentValue,
  UnitCircleScene,
  unitCircleCoordinates,
  unitCircleSummary,
} from "./unit-circle.model"
import { renderUnitCircleScene } from "./unit-circle.renderer"

const UNIT_CIRCLE_ROUTE_PATH = "/trigonometry/unit-circle"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "angleDegrees", label: "Angle", min: -180, max: 180, step: 5 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showProjection", label: "Show projections" },
  { kind: "toggle", id: "showWave", label: "Show sine wave preview" },
]
const PRESETS: readonly WorkbenchPreset<UnitCircleScene>[] = [
  {
    label: "30 degrees",
    description: "Classic special-angle ratio pair.",
    state: { angleDegrees: 30, showProjection: true, showWave: true },
  },
  {
    label: "45 degrees",
    description: "Balanced sine and cosine values.",
    state: { angleDegrees: 45, showProjection: true, showWave: true },
  },
  {
    label: "90 degrees",
    description: "Tangent becomes undefined.",
    state: { angleDegrees: 90, showProjection: true, showWave: true },
  },
  {
    label: "135 degrees",
    description: "Negative cosine in the second quadrant.",
    state: { angleDegrees: 135, showProjection: true, showWave: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized trigonometry scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current trigonometry viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default unit-circle scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Rotate the angle in five-degree steps." },
  { keys: "Shift + Arrow Left/Right", description: "Rotate faster in fifteen-degree steps." },
  { keys: "P", description: "Toggle projection lines." },
  { keys: "W", description: "Toggle the sine wave preview." },
  { keys: "R", description: "Reset the unit-circle scene." },
]

@Component({
  selector: "app-unit-circle-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./unit-circle.page.html",
  styleUrl: "./unit-circle.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitCirclePageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly angleDegrees = signal(DEFAULT_UNIT_CIRCLE_SCENE.angleDegrees)
  protected readonly showProjection = signal(DEFAULT_UNIT_CIRCLE_SCENE.showProjection)
  protected readonly showWave = signal(DEFAULT_UNIT_CIRCLE_SCENE.showWave)
  protected readonly statusMessage = signal("Focus the graph area for keyboard angle controls.")
  protected readonly highlights = [
    "Daily-math trigonometry slice",
    "Unit-circle and sine-wave pairing",
    "Shared presets, export, and share-link flow",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    angleDegrees: {
      value: () => this.angleDegrees(),
      set: (value) => this.angleDegrees.set(value),
      displayValue: (value) => `${value.toFixed(0)}°`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showProjection: {
      value: () => this.showProjection(),
      set: (value) => this.showProjection.set(value),
    },
    showWave: { value: () => this.showWave(), set: (value) => this.showWave.set(value) },
  }
  protected readonly scene = computed<UnitCircleScene>(() => ({
    angleDegrees: this.angleDegrees(),
    showProjection: this.showProjection(),
    showWave: this.showWave(),
  }))
  protected readonly summary = computed(() => unitCircleSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const coordinates = unitCircleCoordinates(scene)
    const tangent = tangentValue(scene)

    return [
      { label: "Cosine", value: coordinates.x.toFixed(3) },
      { label: "Sine", value: coordinates.y.toFixed(3) },
      { label: "Tangent", value: tangent === null ? "Undefined" : tangent.toFixed(3) },
      { label: "Angle", value: `${normalizedAngleDegrees(scene).toFixed(0)}°` },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isUnitCircleScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the trigonometry scene from the shared URL.")
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

      renderUnitCircleScene(canvasRef.nativeElement, scene)
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

  protected applyPreset(preset: WorkbenchPreset<UnitCircleScene>): void {
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
          buildWorkbenchShareUrl(UNIT_CIRCLE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "unit-circle.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_UNIT_CIRCLE_SCENE)
        this.statusMessage.set("Unit-circle scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 15 : 5

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.angleDegrees, -step, clampAngle)
        this.statusMessage.set("Angle rotated counterclockwise.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.angleDegrees, step, clampAngle)
        this.statusMessage.set("Angle rotated clockwise.")
        break
      case "p":
      case "P":
        event.preventDefault()
        this.showProjection.update((value) => !value)
        this.statusMessage.set("Projection visibility toggled.")
        break
      case "w":
      case "W":
        event.preventDefault()
        this.showWave.update((value) => !value)
        this.statusMessage.set("Sine-wave preview toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_UNIT_CIRCLE_SCENE)
        this.statusMessage.set("Unit-circle scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: UnitCircleScene): void {
    this.angleDegrees.set(scene.angleDegrees)
    this.showProjection.set(scene.showProjection)
    this.showWave.set(scene.showWave)
  }
}

function clampAngle(value: number): number {
  return Math.max(-180, Math.min(180, value))
}
