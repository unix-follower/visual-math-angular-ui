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
  DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
  isWebGlTemporalFeedbackScene,
  type WebGlTemporalFeedbackScene,
  webGlTemporalFeedbackAccentColor,
  webGlTemporalFeedbackClearColor,
  webGlTemporalFeedbackPersistence,
  webGlTemporalFeedbackStageLabel,
  webGlTemporalFeedbackSummary,
} from "./webgl-temporal-feedback.model"
import {
  releaseWebGlTemporalFeedbackResources,
  renderWebGlTemporalFeedbackScene,
} from "./webgl-temporal-feedback.renderer"

const WEBGL_TEMPORAL_FEEDBACK_ROUTE_PATH = "/phase-3/webgl-temporal-feedback"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "injection", label: "Pulse injection", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Feedback drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "decay", label: "Persistence decay", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTemporalFeedbackScene>[] = [
  {
    label: "Signal bloom",
    description: "Balanced injection with moderate drift and a readable persistence rate.",
    state: {
      red: 0.02,
      green: 0.05,
      blue: 0.11,
      alpha: 1,
      injection: 0.74,
      drift: 0.34,
      decay: 0.62,
      mix: 0.68,
      speed: 0.92,
    },
  },
  {
    label: "Ribbon wake",
    description: "Broader ribbon injection with longer-lived trails.",
    state: {
      red: 0.03,
      green: 0.06,
      blue: 0.16,
      alpha: 1,
      injection: 0.58,
      drift: 0.22,
      decay: 0.78,
      mix: 0.52,
      speed: 0.7,
    },
  },
  {
    label: "Prism current",
    description: "Faster loop with hotter injected energy and sharper drift.",
    state: {
      red: 0.05,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      injection: 0.88,
      drift: 0.54,
      decay: 0.48,
      mix: 0.76,
      speed: 1.48,
    },
  },
  {
    label: "Calm haze",
    description: "Lower injection and lighter composite for a slower moving field.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.14,
      alpha: 0.88,
      injection: 0.36,
      drift: 0.18,
      decay: 0.56,
      mix: 0.34,
      speed: 0.54,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL temporal feedback scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current animated temporal-feedback viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default temporal-feedback scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the pulse injection." },
  { keys: "S / Shift+S", description: "Increase or decrease the feedback drift." },
  { keys: "D / Shift+D", description: "Increase or decrease the persistence decay." },
  { keys: "F / Shift+F", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease the animation speed." },
  { keys: "Escape", description: "Reset to the default animated scene." },
]

@Component({
  selector: "app-webgl-temporal-feedback-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-temporal-feedback.page.html",
  styleUrl: "./webgl-temporal-feedback.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlTemporalFeedbackPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false
  private animationFrameId: number | null = null

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.alpha)
  protected readonly injection = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.injection)
  protected readonly drift = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.drift)
  protected readonly decay = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.decay)
  protected readonly mix = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.mix)
  protected readonly speed = signal(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE.speed)
  protected readonly phase = signal(0)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL temporal feedback route prepares animated ping-pong persistence across frames.",
  )
  protected readonly highlights = [
    "First Phase 3 route that advances one feedback relay per animation frame instead of rebuilding the full chain inside a single render call",
    "Keeps the same two offscreen targets alive across frames so persistence becomes a property of time, not a fixed loop length",
    "Extends the shared fullscreen post-process helper into an animated feedback route without adding new global WebGL infrastructure",
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
    injection: {
      value: () => this.injection(),
      set: (value) => this.injection.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    drift: {
      value: () => this.drift(),
      set: (value) => this.drift.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    decay: {
      value: () => this.decay(),
      set: (value) => this.decay.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    mix: {
      value: () => this.mix(),
      set: (value) => this.mix.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    speed: {
      value: () => this.speed(),
      set: (value) => this.speed.set(clampSpeed(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlTemporalFeedbackScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    injection: this.injection(),
    drift: this.drift(),
    decay: this.decay(),
    mix: this.mix(),
    speed: this.speed(),
  }))
  protected readonly summary = computed(() =>
    webGlTemporalFeedbackSummary(
      this.scene(),
      this.runtimeStatusLabel(),
      this.phase(),
      this.runtime()?.version,
    ),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTemporalFeedbackClearColor(this.scene()) },
    { label: "Accent color", value: webGlTemporalFeedbackAccentColor(this.scene()) },
    { label: "Stages", value: webGlTemporalFeedbackStageLabel(this.scene()) },
    { label: "Persistence", value: webGlTemporalFeedbackPersistence(this.scene()) },
    { label: "Phase", value: this.phase().toFixed(2) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlTemporalFeedbackScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL temporal feedback scene from the shared URL.")
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

      renderWebGlTemporalFeedbackScene(canvasRef.nativeElement, runtime, scene, phase)
      this.statusMessage.set(`Submitted a temporal-feedback WebGL frame using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_TEMPORAL_FEEDBACK_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-temporal-feedback.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)
        this.statusMessage.set("WebGL temporal feedback scene reset to the default preset.")
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
        stepNumericSignal(this.injection, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the pulse injection.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.drift, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the feedback drift.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.decay, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the persistence decay.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.mix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the composite mix.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed)
        this.statusMessage.set("Updated the animation speed.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)
        this.statusMessage.set("WebGL temporal feedback scene reset to the default preset.")
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

    releaseWebGlTemporalFeedbackResources(runtime)
  }

  private applyScene(scene: WebGlTemporalFeedbackScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.injection.set(clampChannel(scene.injection))
    this.drift.set(clampChannel(scene.drift))
    this.decay.set(clampChannel(scene.decay))
    this.mix.set(clampChannel(scene.mix))
    this.speed.set(clampSpeed(scene.speed))
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
        this.phase.update((value) => normalizePhase(value + deltaSeconds * this.speed() * 0.22))
      }

      previousTimestamp = timestamp
      this.animationFrameId = requestAnimationFrame(tick)
    }

    this.animationFrameId = requestAnimationFrame(tick)
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

function clampSpeed(value: number): number {
  return Math.min(2.4, Math.max(0.2, Number(value.toFixed(2))))
}

function normalizePhase(value: number): number {
  const next = value % 1
  return next < 0 ? next + 1 : next
}
