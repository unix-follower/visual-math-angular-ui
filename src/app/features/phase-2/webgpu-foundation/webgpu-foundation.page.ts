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
  DEFAULT_WEBGPU_FOUNDATION_SCENE,
  formatClearColor,
  isWebGpuFoundationScene,
  triangleAreaEstimate,
  triangleColorLabel,
  type WebGpuFoundationScene,
  webGpuFoundationSummary,
} from "./webgpu-foundation.model"
import {
  releaseWebGpuFoundationResources,
  renderWebGpuFoundationScene,
} from "./webgpu-foundation.renderer"

const WEBGPU_FOUNDATION_ROUTE_PATH = "/phase-2/webgpu-foundation"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "triangleScale", label: "Triangle scale", min: 0.25, max: 0.95, step: 0.01 },
  { kind: "range", id: "accent", label: "Triangle accent", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuFoundationScene>[] = [
  {
    label: "Slate default",
    description: "A restrained engineering palette with a balanced triangle overlay.",
    state: { red: 0.14, green: 0.23, blue: 0.39, alpha: 1, triangleScale: 0.62, accent: 0.78 },
  },
  {
    label: "Ocean",
    description: "Cool tones with a slightly larger primitive to emphasize the first draw call.",
    state: { red: 0.07, green: 0.36, blue: 0.56, alpha: 1, triangleScale: 0.74, accent: 0.58 },
  },
  {
    label: "Sunrise",
    description: "Warm tones with a bright triangle accent for stronger fragment output.",
    state: { red: 0.83, green: 0.42, blue: 0.22, alpha: 1, triangleScale: 0.56, accent: 0.92 },
  },
  {
    label: "Glass",
    description: "Lower alpha with a smaller primitive to show layered composition clearly.",
    state: { red: 0.42, green: 0.72, blue: 0.78, alpha: 0.55, triangleScale: 0.44, accent: 0.66 },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGPU foundation scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGPU foundation viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGPU clear-pass scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the triangle scale." },
  { keys: "T / Shift+T", description: "Increase or decrease the triangle accent." },
  { keys: "Escape", description: "Reset to the default WebGPU foundation scene." },
]

@Component({
  selector: "app-webgpu-foundation-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-foundation.page.html",
  styleUrl: "./webgpu-foundation.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuFoundationPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.alpha)
  protected readonly triangleScale = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.triangleScale)
  protected readonly accent = signal(DEFAULT_WEBGPU_FOUNDATION_SCENE.accent)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGPU viewport checks browser support and prepares the first pipeline-backed draw.",
  )
  protected readonly highlights = [
    "First Angular Phase 2 route inside the existing workbench shell",
    "Local WebGPU bootstrap with browser and adapter guards",
    "GPU triangle draw backed by shaders, a render pipeline, and a vertex buffer",
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
    triangleScale: {
      value: () => this.triangleScale(),
      set: (value) => this.triangleScale.set(clampScale(value)),
      displayValue: (value) => value.toFixed(2),
    },
    accent: {
      value: () => this.accent(),
      set: (value) => this.accent.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuFoundationScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    triangleScale: this.triangleScale(),
    accent: this.accent(),
  }))
  protected readonly summary = computed(() =>
    webGpuFoundationSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: formatClearColor(this.scene()) },
    { label: "Triangle color", value: triangleColorLabel(this.scene()) },
    { label: "Triangle area", value: triangleAreaEstimate(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuFoundationScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGPU foundation scene from the shared URL.")
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

      renderWebGpuFoundationScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a WebGPU pipeline draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_FOUNDATION_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-foundation.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)
        this.statusMessage.set("WebGPU foundation scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        stepNumericSignal(this.triangleScale, delta, clampScale)
        this.statusMessage.set("Updated the triangle scale.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.accent, delta, clampChannel)
        this.statusMessage.set("Updated the triangle accent.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)
        this.statusMessage.set("WebGPU foundation scene reset to the default preset.")
        break
      default:
        break
    }
  }

  private applyScene(scene: WebGpuFoundationScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.triangleScale.set(clampScale(scene.triangleScale))
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

  ngOnDestroy(): void {
    const runtime = this.runtime()

    if (!runtime) {
      return
    }

    releaseWebGpuFoundationResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}

function clampScale(value: number): number {
  return Math.min(0.95, Math.max(0.25, Number(value.toFixed(2))))
}
