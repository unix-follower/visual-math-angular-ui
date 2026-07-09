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
  computeRippleAccentColor,
  computeRippleClearColor,
  computeRippleStageLabel,
  DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
  isWebGpuComputeRippleScene,
  type WebGpuComputeRippleScene,
  webGpuComputeRippleSummary,
} from "./webgpu-compute-ripple.model"
import {
  releaseWebGpuComputeRippleResources,
  renderWebGpuComputeRippleScene,
} from "./webgpu-compute-ripple.renderer"

const WEBGPU_COMPUTE_RIPPLE_ROUTE_PATH = "/phase-2/webgpu-compute-ripple"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "amplitude", label: "Ripple amplitude", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "frequency", label: "Ripple frequency", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Phase drift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuComputeRippleScene>[] = [
  {
    label: "Signal ripple",
    description: "Balanced amplitude, frequency, and drift for the default compute surface.",
    state: {
      red: 0.07,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      amplitude: 0.56,
      frequency: 0.62,
      drift: 0.34,
    },
  },
  {
    label: "Wide pulse",
    description: "Higher amplitude with cooler tones and slower drift.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      amplitude: 0.82,
      frequency: 0.38,
      drift: 0.14,
    },
  },
  {
    label: "Dense mesh",
    description: "Tighter compute oscillation with higher frequency and moderate drift.",
    state: {
      red: 0.08,
      green: 0.1,
      blue: 0.16,
      alpha: 1,
      amplitude: 0.34,
      frequency: 0.88,
      drift: 0.46,
    },
  },
  {
    label: "Glass wake",
    description: "Softer alpha with a gentler amplitude and brighter trailing color.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.72,
      amplitude: 0.28,
      frequency: 0.54,
      drift: 0.72,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized compute-ripple scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current compute-ripple viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default compute-ripple scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease ripple amplitude." },
  { keys: "F / Shift+F", description: "Increase or decrease ripple frequency." },
  { keys: "D / Shift+D", description: "Increase or decrease phase drift." },
  { keys: "Escape", description: "Reset to the default compute-ripple scene." },
]

@Component({
  selector: "app-webgpu-compute-ripple-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-compute-ripple.page.html",
  styleUrl: "./webgpu-compute-ripple.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuComputeRipplePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.alpha)
  protected readonly amplitude = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.amplitude)
  protected readonly frequency = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.frequency)
  protected readonly drift = signal(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE.drift)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the compute-ripple route checks browser support and prepares compute plus render pipelines.",
  )
  protected readonly highlights = [
    "Tenth Angular Phase 2 route introducing a true compute pass before rendering",
    "A compute shader writes interleaved position and color data into a shared storage-plus-vertex buffer",
    "The render pass then consumes those GPU-written vertices through the same guarded runtime and teardown pattern",
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
    amplitude: {
      value: () => this.amplitude(),
      set: (value) => this.amplitude.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    frequency: {
      value: () => this.frequency(),
      set: (value) => this.frequency.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    drift: {
      value: () => this.drift(),
      set: (value) => this.drift.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuComputeRippleScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    amplitude: this.amplitude(),
    frequency: this.frequency(),
    drift: this.drift(),
  }))
  protected readonly summary = computed(() =>
    webGpuComputeRippleSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: computeRippleClearColor(this.scene()) },
    { label: "Accent color", value: computeRippleAccentColor(this.scene()) },
    { label: "Stages", value: computeRippleStageLabel(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuComputeRippleScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the compute-ripple scene from the shared URL.")
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

      renderWebGpuComputeRippleScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a compute plus render WebGPU draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_COMPUTE_RIPPLE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-compute-ripple.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
        this.statusMessage.set("Compute-ripple scene reset to the default preset.")
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
      case "w":
        event.preventDefault()
        stepNumericSignal(this.amplitude, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the ripple amplitude.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.frequency, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the ripple frequency.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.drift, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the phase drift.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
        this.statusMessage.set("Compute-ripple scene reset to the default preset.")
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

    releaseWebGpuComputeRippleResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuComputeRippleScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.amplitude.set(clampChannel(scene.amplitude))
    this.frequency.set(clampChannel(scene.frequency))
    this.drift.set(clampChannel(scene.drift))
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
