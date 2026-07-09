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
  DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
  gradientQuadArea,
  gradientQuadClearColor,
  gradientQuadPeakColor,
  isWebGpuGradientQuadScene,
  type WebGpuGradientQuadScene,
  webGpuGradientQuadSummary,
} from "./webgpu-gradient-quad.model"
import {
  releaseWebGpuGradientQuadResources,
  renderWebGpuGradientQuadScene,
} from "./webgpu-gradient-quad.renderer"

const WEBGPU_GRADIENT_QUAD_ROUTE_PATH = "/phase-2/webgpu-gradient-quad"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "inset", label: "Quad inset", min: 0.08, max: 0.42, step: 0.01 },
  { kind: "range", id: "tilt", label: "Quad tilt", min: -0.35, max: 0.35, step: 0.01 },
  { kind: "range", id: "intensity", label: "Gradient intensity", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuGradientQuadScene>[] = [
  {
    label: "Aurora",
    description: "Balanced gradient quad with a gentle diagonal tilt.",
    state: {
      red: 0.08,
      green: 0.14,
      blue: 0.22,
      alpha: 1,
      inset: 0.22,
      tilt: 0.12,
      intensity: 0.78,
    },
  },
  {
    label: "Blueprint",
    description: "Cool background with a tighter surface and higher intensity.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.24,
      alpha: 1,
      inset: 0.16,
      tilt: -0.08,
      intensity: 0.92,
    },
  },
  {
    label: "Sun panel",
    description: "Warmer clear color and stronger skew for contrast.",
    state: {
      red: 0.24,
      green: 0.16,
      blue: 0.12,
      alpha: 1,
      inset: 0.24,
      tilt: 0.22,
      intensity: 0.7,
    },
  },
  {
    label: "Glass tile",
    description: "Transparent backdrop with a quieter gradient surface.",
    state: {
      red: 0.14,
      green: 0.2,
      blue: 0.26,
      alpha: 0.62,
      inset: 0.28,
      tilt: -0.18,
      intensity: 0.48,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGPU gradient quad scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGPU gradient quad viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGPU gradient quad scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "I / Shift+I", description: "Increase or decrease the quad inset." },
  { keys: "T / Shift+T", description: "Increase or decrease the quad tilt." },
  { keys: "N / Shift+N", description: "Increase or decrease the gradient intensity." },
  { keys: "Escape", description: "Reset to the default WebGPU gradient quad scene." },
]

@Component({
  selector: "app-webgpu-gradient-quad-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-gradient-quad.page.html",
  styleUrl: "./webgpu-gradient-quad.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuGradientQuadPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.alpha)
  protected readonly inset = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.inset)
  protected readonly tilt = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.tilt)
  protected readonly intensity = signal(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE.intensity)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGPU viewport checks browser support and prepares a second reusable scene pattern.",
  )
  protected readonly highlights = [
    "Second Angular Phase 2 route exercising the shared WebGPU renderer helpers",
    "Six-vertex quad draw with gradient color interpolation",
    "Route-local teardown and shared runtime-scoped resource caching",
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
    inset: {
      value: () => this.inset(),
      set: (value) => this.inset.set(clampInset(value)),
      displayValue: (value) => value.toFixed(2),
    },
    tilt: {
      value: () => this.tilt(),
      set: (value) => this.tilt.set(clampTilt(value)),
      displayValue: (value) => value.toFixed(2),
    },
    intensity: {
      value: () => this.intensity(),
      set: (value) => this.intensity.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuGradientQuadScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    inset: this.inset(),
    tilt: this.tilt(),
    intensity: this.intensity(),
  }))
  protected readonly summary = computed(() =>
    webGpuGradientQuadSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: gradientQuadClearColor(this.scene()) },
    { label: "Peak color", value: gradientQuadPeakColor(this.scene()) },
    { label: "Quad area", value: gradientQuadArea(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuGradientQuadScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGPU gradient quad scene from the shared URL.")
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

      renderWebGpuGradientQuadScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a WebGPU gradient quad draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_GRADIENT_QUAD_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-gradient-quad.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
        this.statusMessage.set("WebGPU gradient quad scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    const delta = event.shiftKey ? -0.05 : 0.05
    const key = event.key.toLowerCase()

    switch (key) {
      case "r":
        event.preventDefault()
        stepNumericSignal(this.red, delta, clampChannel)
        this.statusMessage.set("Updated the red channel.")
        break
      case "g":
        event.preventDefault()
        stepNumericSignal(this.green, delta, clampChannel)
        this.statusMessage.set("Updated the green channel.")
        break
      case "b":
        event.preventDefault()
        stepNumericSignal(this.blue, delta, clampChannel)
        this.statusMessage.set("Updated the blue channel.")
        break
      case "a":
        event.preventDefault()
        stepNumericSignal(this.alpha, delta, clampChannel)
        this.statusMessage.set("Updated the alpha channel.")
        break
      case "i":
        event.preventDefault()
        stepNumericSignal(this.inset, delta, clampInset)
        this.statusMessage.set("Updated the quad inset.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.tilt, delta, clampTilt)
        this.statusMessage.set("Updated the quad tilt.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.intensity, delta, clampChannel)
        this.statusMessage.set("Updated the gradient intensity.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
        this.statusMessage.set("WebGPU gradient quad scene reset to the default preset.")
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

    releaseWebGpuGradientQuadResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuGradientQuadScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.inset.set(clampInset(scene.inset))
    this.tilt.set(clampTilt(scene.tilt))
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

function clampInset(value: number): number {
  return Math.min(0.42, Math.max(0.08, Number(value.toFixed(2))))
}

function clampTilt(value: number): number {
  return Math.min(0.35, Math.max(-0.35, Number(value.toFixed(2))))
}
