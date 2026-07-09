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
  DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
  isWebGpuPulseDiamondScene,
  pulseDiamondArea,
  pulseDiamondClearColor,
  pulseDiamondPeakColor,
  pulseDiamondScale,
  type WebGpuPulseDiamondScene,
  webGpuPulseDiamondSummary,
} from "./webgpu-pulse-diamond.model"
import {
  releaseWebGpuPulseDiamondResources,
  renderWebGpuPulseDiamondScene,
} from "./webgpu-pulse-diamond.renderer"

const WEBGPU_PULSE_DIAMOND_ROUTE_PATH = "/phase-2/webgpu-pulse-diamond"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  {
    kind: "range",
    id: "pulseAmplitude",
    label: "Pulse amplitude",
    min: 0.05,
    max: 0.32,
    step: 0.01,
  },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
  { kind: "range", id: "skew", label: "Diamond skew", min: -0.28, max: 0.28, step: 0.01 },
  { kind: "range", id: "glow", label: "Glow strength", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuPulseDiamondScene>[] = [
  {
    label: "Signal",
    description: "Balanced pulse with a moderate glow and a gentle forward lean.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.18,
      alpha: 1,
      pulseAmplitude: 0.22,
      speed: 1.1,
      skew: 0.14,
      glow: 0.72,
    },
  },
  {
    label: "Prism",
    description: "Slower motion with a broader pulse and colder backdrop.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.2,
      alpha: 1,
      pulseAmplitude: 0.28,
      speed: 0.65,
      skew: -0.08,
      glow: 0.84,
    },
  },
  {
    label: "Beacon",
    description: "Faster loop and sharper skew for a more mechanical pulse.",
    state: {
      red: 0.12,
      green: 0.08,
      blue: 0.1,
      alpha: 1,
      pulseAmplitude: 0.16,
      speed: 1.9,
      skew: 0.22,
      glow: 0.58,
    },
  },
  {
    label: "Glass pulse",
    description: "Softer alpha and reduced glow for a lighter animated surface.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.7,
      pulseAmplitude: 0.14,
      speed: 0.85,
      skew: -0.16,
      glow: 0.42,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized animated pulse-diamond scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current animated WebGPU pulse-diamond viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default pulse-diamond scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "P / Shift+P", description: "Increase or decrease the pulse amplitude." },
  { keys: "S / Shift+S", description: "Increase or decrease the animation speed." },
  { keys: "K / Shift+K", description: "Increase or decrease the skew." },
  { keys: "N / Shift+N", description: "Increase or decrease the glow strength." },
  { keys: "Escape", description: "Reset to the default animated scene." },
]

@Component({
  selector: "app-webgpu-pulse-diamond-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-pulse-diamond.page.html",
  styleUrl: "./webgpu-pulse-diamond.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuPulseDiamondPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false
  private animationFrameId: number | null = null

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.alpha)
  protected readonly pulseAmplitude = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.pulseAmplitude)
  protected readonly speed = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.speed)
  protected readonly skew = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.skew)
  protected readonly glow = signal(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE.glow)
  protected readonly phase = signal(0)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the animated pulse-diamond route checks browser support and prepares per-frame WebGPU updates.",
  )
  protected readonly highlights = [
    "Fourth Angular Phase 2 route introducing requestAnimationFrame-driven per-frame GPU buffer updates",
    "Animated six-vertex diamond with pulse amplitude, skew, glow, and speed controls",
    "Same shared bootstrap, caching, export, and teardown pattern with a route-local animation loop",
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
    pulseAmplitude: {
      value: () => this.pulseAmplitude(),
      set: (value) => this.pulseAmplitude.set(clampPulseAmplitude(value)),
      displayValue: (value) => value.toFixed(2),
    },
    speed: {
      value: () => this.speed(),
      set: (value) => this.speed.set(clampSpeed(value)),
      displayValue: (value) => value.toFixed(2),
    },
    skew: {
      value: () => this.skew(),
      set: (value) => this.skew.set(clampSkew(value)),
      displayValue: (value) => value.toFixed(2),
    },
    glow: {
      value: () => this.glow(),
      set: (value) => this.glow.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuPulseDiamondScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    pulseAmplitude: this.pulseAmplitude(),
    speed: this.speed(),
    skew: this.skew(),
    glow: this.glow(),
  }))
  protected readonly summary = computed(() =>
    webGpuPulseDiamondSummary(
      this.scene(),
      this.runtimeStatusLabel(),
      this.phase(),
      this.runtime()?.format,
    ),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: pulseDiamondClearColor(this.scene()) },
    { label: "Peak color", value: pulseDiamondPeakColor(this.scene()) },
    { label: "Pulse scale", value: `${pulseDiamondScale(this.scene(), this.phase()).toFixed(2)}` },
    { label: "Area", value: pulseDiamondArea(this.scene(), this.phase()) },
    { label: "Phase", value: this.phase().toFixed(2) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuPulseDiamondScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the animated pulse-diamond scene from the shared URL.")
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

      const runtime = this.runtime()

      if (!runtime || this.animationFrameId !== null) {
        return
      }

      this.startAnimationLoop()
    })

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const runtime = this.runtime()
      const scene = this.scene()
      const phase = this.phase()

      if (!canvasRef || !runtime) {
        return
      }

      renderWebGpuPulseDiamondScene(canvasRef.nativeElement, runtime, scene, phase)
      this.statusMessage.set(
        `Submitted an animated WebGPU pulse-diamond draw using ${runtime.format}.`,
      )
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
          buildWorkbenchShareUrl(WEBGPU_PULSE_DIAMOND_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-pulse-diamond.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)
        this.statusMessage.set("Animated pulse-diamond scene reset to the default preset.")
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
      case "p":
        event.preventDefault()
        stepNumericSignal(this.pulseAmplitude, event.shiftKey ? -0.02 : 0.02, clampPulseAmplitude)
        this.statusMessage.set("Updated the pulse amplitude.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed)
        this.statusMessage.set("Updated the animation speed.")
        break
      case "k":
        event.preventDefault()
        stepNumericSignal(this.skew, event.shiftKey ? -0.03 : 0.03, clampSkew)
        this.statusMessage.set("Updated the diamond skew.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.glow, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the glow strength.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)
        this.statusMessage.set("Animated pulse-diamond scene reset to the default preset.")
        break
      default:
        break
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    const runtime = this.runtime()

    if (!runtime) {
      return
    }

    releaseWebGpuPulseDiamondResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuPulseDiamondScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.pulseAmplitude.set(clampPulseAmplitude(scene.pulseAmplitude))
    this.speed.set(clampSpeed(scene.speed))
    this.skew.set(clampSkew(scene.skew))
    this.glow.set(clampChannel(scene.glow))
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

  private startAnimationLoop(): void {
    let previousTimestamp = 0

    const tick = (timestamp: number): void => {
      if (!this.runtime()) {
        this.animationFrameId = null
        return
      }

      if (previousTimestamp !== 0) {
        const deltaSeconds = (timestamp - previousTimestamp) / 1000
        this.phase.update((phase) => normalizePhase(phase + deltaSeconds * this.speed() * 0.35))
      }

      previousTimestamp = timestamp
      this.animationFrameId = requestAnimationFrame(tick)
    }

    this.animationFrameId = requestAnimationFrame(tick)
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

function clampPulseAmplitude(value: number): number {
  return Math.min(0.32, Math.max(0.05, Number(value.toFixed(2))))
}

function clampSpeed(value: number): number {
  return Math.min(2.4, Math.max(0.2, Number(value.toFixed(2))))
}

function clampSkew(value: number): number {
  return Math.min(0.28, Math.max(-0.28, Number(value.toFixed(2))))
}

function normalizePhase(value: number): number {
  const next = value % 1
  return next < 0 ? next + 1 : next
}
