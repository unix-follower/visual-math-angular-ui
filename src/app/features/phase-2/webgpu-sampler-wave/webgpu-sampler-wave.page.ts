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
  DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE,
  isWebGpuSamplerWaveScene,
  samplerWaveAccentColor,
  samplerWaveClearColor,
  samplerWaveFootprint,
  type WebGpuSamplerWaveScene,
  webGpuSamplerWaveSummary,
} from "./webgpu-sampler-wave.model"
import {
  releaseWebGpuSamplerWaveResources,
  renderWebGpuSamplerWaveScene,
} from "./webgpu-sampler-wave.renderer"

const WEBGPU_SAMPLER_WAVE_ROUTE_PATH = "/phase-2/webgpu-sampler-wave"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "frequency", label: "Wave frequency", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "softness", label: "Filter softness", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blend", label: "Wave blend", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuSamplerWaveScene>[] = [
  {
    label: "Ribbon",
    description: "Balanced sampler route with a soft filtered wave surface.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.22,
      alpha: 1,
      frequency: 0.58,
      softness: 0.62,
      blend: 0.54,
    },
  },
  {
    label: "Cool drift",
    description: "Cooler clear color and softer blend for a smoother sampled texture.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.24,
      alpha: 1,
      frequency: 0.28,
      softness: 0.82,
      blend: 0.34,
    },
  },
  {
    label: "Sharp pulse",
    description: "Higher frequency and stronger blend for a crisper wave texture.",
    state: {
      red: 0.1,
      green: 0.08,
      blue: 0.12,
      alpha: 1,
      frequency: 0.86,
      softness: 0.24,
      blend: 0.78,
    },
  },
  {
    label: "Glass fold",
    description: "Lower alpha and moderate filtering for a layered sampler surface.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.72,
      frequency: 0.42,
      softness: 0.7,
      blend: 0.4,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized sampler-wave WebGPU scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current sampler-wave viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default sampler-wave scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "F / Shift+F", description: "Increase or decrease the wave frequency." },
  { keys: "S / Shift+S", description: "Increase or decrease the filter softness." },
  { keys: "N / Shift+N", description: "Increase or decrease the wave blend." },
  { keys: "Escape", description: "Reset to the default sampler-wave scene." },
]

@Component({
  selector: "app-webgpu-sampler-wave-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-sampler-wave.page.html",
  styleUrl: "./webgpu-sampler-wave.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuSamplerWavePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.alpha)
  protected readonly frequency = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.frequency)
  protected readonly softness = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.softness)
  protected readonly blend = signal(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE.blend)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the sampler-wave route checks browser support and prepares filtered texture sampling.",
  )
  protected readonly highlights = [
    "Eighth Angular Phase 2 route introducing a real sampler instead of textureLoad-only access",
    "Static textured quad that samples a small uploaded texture through a linear sampler in the fragment shader",
    "Same shared WebGPU runtime helpers, cache ownership, export flow, and route-local teardown pattern",
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
    frequency: {
      value: () => this.frequency(),
      set: (value) => this.frequency.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    softness: {
      value: () => this.softness(),
      set: (value) => this.softness.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    blend: {
      value: () => this.blend(),
      set: (value) => this.blend.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuSamplerWaveScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    frequency: this.frequency(),
    softness: this.softness(),
    blend: this.blend(),
  }))
  protected readonly summary = computed(() =>
    webGpuSamplerWaveSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: samplerWaveClearColor(this.scene()) },
    { label: "Accent color", value: samplerWaveAccentColor(this.scene()) },
    { label: "Footprint", value: samplerWaveFootprint(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuSamplerWaveScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the sampler-wave scene from the shared URL.")
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

      renderWebGpuSamplerWaveScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a sampler-backed WebGPU draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_SAMPLER_WAVE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-sampler-wave.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)
        this.statusMessage.set("Sampler-wave scene reset to the default preset.")
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
      case "f":
        event.preventDefault()
        stepNumericSignal(this.frequency, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the wave frequency.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.softness, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the filter softness.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.blend, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the wave blend.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)
        this.statusMessage.set("Sampler-wave scene reset to the default preset.")
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

    releaseWebGpuSamplerWaveResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuSamplerWaveScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.frequency.set(clampChannel(scene.frequency))
    this.softness.set(clampChannel(scene.softness))
    this.blend.set(clampChannel(scene.blend))
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
