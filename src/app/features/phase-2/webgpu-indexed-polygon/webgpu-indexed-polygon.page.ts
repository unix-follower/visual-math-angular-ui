import { isPlatformBrowser } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
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
  type RangeControlAdapter,
  writeRangeControlValue,
} from "../../../shared/math-workbench/workbench-control-state"
import { stepNumericSignal } from "../../../shared/math-workbench/workbench-keyboard-state"
import { WorkbenchMetricGridComponent } from "../../../shared/math-workbench/workbench-metric-grid.component"
import { WorkbenchPresetGridComponent } from "../../../shared/math-workbench/workbench-preset-grid.component"
import { WorkbenchRangeControlComponent } from "../../../shared/math-workbench/workbench-range-control.component"
import { WorkbenchViewportSurfaceComponent } from "../../../shared/math-workbench/workbench-viewport-surface.component"
import {
  hasWebGpuSupport,
  initializeWebGpuCanvas,
  type WebGpuCanvasRuntime,
} from "../../../shared/webgpu/webgpu-bootstrap"
import {
  DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
  indexedPolygonArea,
  indexedPolygonClearColor,
  indexedPolygonIndexCount,
  indexedPolygonPeakColor,
  indexedPolygonVertexCount,
  isWebGpuIndexedPolygonScene,
  type WebGpuIndexedPolygonScene,
  webGpuIndexedPolygonSummary,
} from "./webgpu-indexed-polygon.model"
import {
  releaseWebGpuIndexedPolygonResources,
  renderWebGpuIndexedPolygonScene,
} from "./webgpu-indexed-polygon.renderer"

const WEBGPU_INDEXED_POLYGON_ROUTE_PATH = "/phase-2/webgpu-indexed-polygon"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "sides", label: "Polygon sides", min: 3, max: 8, step: 1 },
  { kind: "range", id: "radius", label: "Polygon radius", min: 0.32, max: 0.84, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "intensity", label: "Color intensity", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuIndexedPolygonScene>[] = [
  {
    label: "Hex bloom",
    description: "Balanced six-sided indexed draw with a broad radius and warm center glow.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      sides: 6,
      radius: 0.68,
      rotation: 14,
      intensity: 0.74,
    },
  },
  {
    label: "Octagon",
    description: "Dense indexed fan showing higher topology and a cooler backdrop.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      sides: 8,
      radius: 0.58,
      rotation: -12,
      intensity: 0.82,
    },
  },
  {
    label: "Triad",
    description: "Minimal indexed geometry with stronger rotation and tighter coverage.",
    state: {
      red: 0.12,
      green: 0.14,
      blue: 0.1,
      alpha: 1,
      sides: 3,
      radius: 0.74,
      rotation: 30,
      intensity: 0.62,
    },
  },
  {
    label: "Glass heptagon",
    description: "Seven-sided polygon with softer alpha and lower intensity.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.72,
      sides: 7,
      radius: 0.5,
      rotation: -26,
      intensity: 0.46,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized indexed WebGPU polygon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current indexed polygon viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default indexed polygon scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the polygon side count." },
  { keys: "D / Shift+D", description: "Increase or decrease the radius." },
  { keys: "O / Shift+O", description: "Increase or decrease the rotation." },
  { keys: "N / Shift+N", description: "Increase or decrease the color intensity." },
  { keys: "Escape", description: "Reset to the default indexed polygon scene." },
]

@Component({
  selector: "app-webgpu-indexed-polygon-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-indexed-polygon.page.html",
  styleUrl: "./webgpu-indexed-polygon.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuIndexedPolygonPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.alpha)
  protected readonly sides = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.sides)
  protected readonly radius = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.radius)
  protected readonly rotation = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.rotation)
  protected readonly intensity = signal(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE.intensity)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the indexed polygon route checks browser support and prepares indexed WebGPU geometry.",
  )
  protected readonly highlights = [
    "Third Angular Phase 2 route introducing indexed geometry instead of pure sequential vertices",
    "Triangle-fan style polygon built from shared vertices plus a uint16 index buffer",
    "Same shared WebGPU runtime helpers, caching, export, and route-local teardown pattern",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    red: {
      value: () => this.red(),
      set: (value) => this.red.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    green: {
      value: () => this.green(),
      set: (value) => this.green.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    blue: {
      value: () => this.blue(),
      set: (value) => this.blue.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    alpha: {
      value: () => this.alpha(),
      set: (value) => this.alpha.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    sides: {
      value: () => this.sides(),
      set: (value) => this.sides.set(clampSides(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
    radius: {
      value: () => this.radius(),
      set: (value) => this.radius.set(clampRadius(value)),
      displayValue: (value) => value.toFixed(2),
    },
    rotation: {
      value: () => this.rotation(),
      set: (value) => this.rotation.set(clampRotation(value)),
      displayValue: (value) => `${Math.round(value)}deg`,
    },
    intensity: {
      value: () => this.intensity(),
      set: (value) => this.intensity.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuIndexedPolygonScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    sides: this.sides(),
    radius: this.radius(),
    rotation: this.rotation(),
    intensity: this.intensity(),
  }))
  protected readonly summary = computed(() =>
    webGpuIndexedPolygonSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: indexedPolygonClearColor(this.scene()) },
    { label: "Peak color", value: indexedPolygonPeakColor(this.scene()) },
    { label: "Vertices", value: `${indexedPolygonVertexCount(this.scene())}` },
    { label: "Indices", value: `${indexedPolygonIndexCount(this.scene())}` },
    { label: "Area", value: indexedPolygonArea(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuIndexedPolygonScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the indexed polygon scene from the shared URL.")
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()

      if (!canvasRef || this.runtime() || this.initializationStarted) {
        return
      }

      this.initializationStarted = true
      void this.initializeRuntime(canvasRef.nativeElement)
    })

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const runtime = this.runtime()
      const scene = this.scene()

      if (!canvasRef || !runtime) {
        return
      }

      renderWebGpuIndexedPolygonScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted an indexed WebGPU polygon draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_INDEXED_POLYGON_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-indexed-polygon.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
        this.statusMessage.set("Indexed polygon scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    const delta = event.shiftKey ? -1 : 1
    const key = event.key.toLowerCase()

    switch (key) {
      case "r":
        event.preventDefault()
        stepNumericSignal(this.red, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the red channel.")
        break
      case "g":
        event.preventDefault()
        stepNumericSignal(this.green, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the green channel.")
        break
      case "b":
        event.preventDefault()
        stepNumericSignal(this.blue, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the blue channel.")
        break
      case "a":
        event.preventDefault()
        stepNumericSignal(this.alpha, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the alpha channel.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.sides, delta, clampSides)
        this.statusMessage.set("Updated the polygon side count.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.radius, event.shiftKey ? -0.05 : 0.05, clampRadius)
        this.statusMessage.set("Updated the polygon radius.")
        break
      case "o":
        event.preventDefault()
        stepNumericSignal(this.rotation, delta * 6, clampRotation)
        this.statusMessage.set("Updated the polygon rotation.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.intensity, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the color intensity.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
        this.statusMessage.set("Indexed polygon scene reset to the default preset.")
        break
      default:
        break
    }
  }

  ngOnDestroy(): void {
    const runtime = this.runtime()

    if (!runtime) {
      return
    }

    releaseWebGpuIndexedPolygonResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuIndexedPolygonScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.sides.set(clampSides(scene.sides))
    this.radius.set(clampRadius(scene.radius))
    this.rotation.set(clampRotation(scene.rotation))
    this.intensity.set(clampChannel(scene.intensity))
  }

  private runtimeStatusLabel(): string {
    switch (this.runtimeState()) {
      case "ready":
        return "Ready"
      case "unsupported":
        return "Unsupported"
      default:
        return "Checking"
    }
  }

  private async initializeRuntime(canvas: HTMLCanvasElement): Promise<void> {
    const setup = await initializeWebGpuCanvas(canvas)

    if (!setup.ok) {
      this.runtimeState.set("unsupported")
      this.statusMessage.set(setup.reason)
      return
    }

    this.runtime.set(setup.runtime)
    this.runtimeState.set("ready")
    this.statusMessage.set(`WebGPU adapter acquired with ${setup.runtime.format}.`)
  }
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}

function clampSides(value: number): number {
  return Math.min(8, Math.max(3, Math.round(value)))
}

function clampRadius(value: number): number {
  return Math.min(0.84, Math.max(0.32, Number(value.toFixed(2))))
}

function clampRotation(value: number): number {
  return Math.min(180, Math.max(-180, Math.round(value)))
}
