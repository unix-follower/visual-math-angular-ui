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
  hasWebGlSupport,
  initializeWebGlCanvas,
  type WebGlCanvasRuntime,
} from "../../../shared/webgl/webgl-bootstrap"

import {
  DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
  isWebGlGradientTriangleScene,
  type WebGlGradientTriangleScene,
  webGlGradientTriangleArea,
  webGlGradientTriangleClearColor,
  webGlGradientTrianglePeakColor,
  webGlGradientTriangleRotationLabel,
  webGlGradientTriangleSummary,
} from "./webgl-gradient-triangle.model"
import {
  releaseWebGlGradientTriangleResources,
  renderWebGlGradientTriangleScene,
} from "./webgl-gradient-triangle.renderer"

const WEBGL_GRADIENT_TRIANGLE_ROUTE_PATH = "/phase-3/webgl-gradient-triangle"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "scale", label: "Triangle scale", min: 0.4, max: 1.2, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "accent", label: "Accent strength", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlGradientTriangleScene>[] = [
  {
    label: "Studio",
    description: "Balanced baseline triangle with neutral rotation.",
    state: { red: 0.08, green: 0.12, blue: 0.18, alpha: 1, scale: 0.86, rotation: 0, accent: 0.78 },
  },
  {
    label: "Blueprint spin",
    description: "Cooler clear color and a slight clockwise tilt.",
    state: {
      red: 0.05,
      green: 0.11,
      blue: 0.24,
      alpha: 1,
      scale: 0.92,
      rotation: 18,
      accent: 0.84,
    },
  },
  {
    label: "Signal flare",
    description: "Warmer palette with a stronger accent and counter rotation.",
    state: {
      red: 0.18,
      green: 0.1,
      blue: 0.08,
      alpha: 1,
      scale: 0.96,
      rotation: -22,
      accent: 0.92,
    },
  },
  {
    label: "Glass mark",
    description: "Transparent clear color with a smaller triangle footprint.",
    state: {
      red: 0.14,
      green: 0.2,
      blue: 0.25,
      alpha: 0.62,
      scale: 0.72,
      rotation: 12,
      accent: 0.52,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL gradient triangle scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL gradient triangle viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL gradient triangle scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the triangle scale." },
  { keys: "T / Shift+T", description: "Rotate the triangle clockwise or counterclockwise." },
  { keys: "C / Shift+C", description: "Increase or decrease the accent strength." },
  { keys: "Escape", description: "Reset to the default WebGL gradient triangle scene." },
]

@Component({
  selector: "app-webgl-gradient-triangle-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-gradient-triangle.page.html",
  styleUrl: "./webgl-gradient-triangle.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlGradientTrianglePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.alpha)
  protected readonly scale = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.scale)
  protected readonly rotation = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.rotation)
  protected readonly accent = signal(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE.accent)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL viewport prepares the first shader-linked geometry route in Phase 3.",
  )
  protected readonly highlights = [
    "First Angular WebGL route that compiles shaders and links a reusable program",
    "Interleaved position and color buffer data uploaded through a cached WebGL buffer",
    "Route-local model, renderer, and teardown pattern matching the existing Angular workbench style",
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
    scale: {
      value: () => this.scale(),
      set: (value) => this.scale.set(clampScale(value)),
      displayValue: (value) => value.toFixed(2),
    },
    rotation: {
      value: () => this.rotation(),
      set: (value) => this.rotation.set(clampRotation(value)),
      displayValue: (value) => value.toFixed(0),
    },
    accent: {
      value: () => this.accent(),
      set: (value) => this.accent.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlGradientTriangleScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    scale: this.scale(),
    rotation: this.rotation(),
    accent: this.accent(),
  }))
  protected readonly summary = computed(() =>
    webGlGradientTriangleSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlGradientTriangleClearColor(this.scene()) },
    { label: "Peak color", value: webGlGradientTrianglePeakColor(this.scene()) },
    { label: "Triangle area", value: webGlGradientTriangleArea(this.scene()) },
    { label: "Rotation", value: webGlGradientTriangleRotationLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlGradientTriangleScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL gradient triangle scene from the shared URL.")
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
      this.initializeRuntime(canvasRef.nativeElement)
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

      renderWebGlGradientTriangleScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a WebGL triangle draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_GRADIENT_TRIANGLE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-gradient-triangle.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)
        this.statusMessage.set("WebGL gradient triangle scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
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
        stepNumericSignal(this.scale, event.shiftKey ? -0.05 : 0.05, clampScale)
        this.statusMessage.set("Updated the triangle scale.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.rotation, event.shiftKey ? -5 : 5, clampRotation)
        this.statusMessage.set("Updated the triangle rotation.")
        break
      case "c":
        event.preventDefault()
        stepNumericSignal(this.accent, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the accent strength.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)
        this.statusMessage.set("WebGL gradient triangle scene reset to the default preset.")
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

    releaseWebGlGradientTriangleResources(runtime)
  }

  private applyScene(scene: WebGlGradientTriangleScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.scale.set(clampScale(scene.scale))
    this.rotation.set(clampRotation(scene.rotation))
    this.accent.set(clampChannel(scene.accent))
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

  private initializeRuntime(canvas: HTMLCanvasElement): void {
    const setup = initializeWebGlCanvas(canvas)

    if (!setup.ok) {
      this.runtimeState.set("unsupported")
      this.statusMessage.set(setup.reason)
      return
    }

    this.runtime.set(setup.runtime)
    this.runtimeState.set("ready")
    this.statusMessage.set(`WebGL context acquired with ${setup.runtime.version}.`)
  }
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}

function clampScale(value: number): number {
  return Math.min(1.2, Math.max(0.4, Number(value.toFixed(2))))
}

function clampRotation(value: number): number {
  return Math.min(180, Math.max(-180, Number(value.toFixed(0))))
}
