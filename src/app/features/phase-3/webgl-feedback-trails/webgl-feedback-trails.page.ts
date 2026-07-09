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
  DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
  isWebGlFeedbackTrailsScene,
  type WebGlFeedbackTrailsScene,
  webGlFeedbackTrailRelayCount,
  webGlFeedbackTrailsAccentColor,
  webGlFeedbackTrailsClearColor,
  webGlFeedbackTrailsStageLabel,
  webGlFeedbackTrailsSummary,
} from "./webgl-feedback-trails.model"
import {
  releaseWebGlFeedbackTrailsResources,
  renderWebGlFeedbackTrailsScene,
} from "./webgl-feedback-trails.renderer"

const WEBGL_FEEDBACK_TRAILS_ROUTE_PATH = "/phase-3/webgl-feedback-trails"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Seed glow", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Trail drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "decay", label: "Trail decay", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relays", label: "Relay depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlFeedbackTrailsScene>[] = [
  {
    label: "Aurora streak",
    description: "Balanced relay depth with a readable trail field.",
    state: {
      red: 0.03,
      green: 0.08,
      blue: 0.16,
      alpha: 1,
      glow: 0.76,
      drift: 0.34,
      decay: 0.58,
      relays: 0.54,
      mix: 0.68,
    },
  },
  {
    label: "Heat ribbon",
    description: "Hotter seed with shorter but brighter relays.",
    state: {
      red: 0.12,
      green: 0.07,
      blue: 0.06,
      alpha: 1,
      glow: 0.92,
      drift: 0.22,
      decay: 0.72,
      relays: 0.32,
      mix: 0.82,
    },
  },
  {
    label: "Cold wake",
    description: "Cool background with longer chains and softer decay.",
    state: {
      red: 0.02,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      glow: 0.46,
      drift: 0.58,
      decay: 0.38,
      relays: 0.88,
      mix: 0.44,
    },
  },
  {
    label: "Glass traces",
    description: "Lower alpha and quieter relay energy for gentler trails.",
    state: {
      red: 0.08,
      green: 0.12,
      blue: 0.18,
      alpha: 0.76,
      glow: 0.34,
      drift: 0.28,
      decay: 0.48,
      relays: 0.42,
      mix: 0.28,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL feedback trails scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current feedback trails viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default feedback trails scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the seed glow." },
  { keys: "S / Shift+S", description: "Increase or decrease the trail drift." },
  { keys: "D / Shift+D", description: "Increase or decrease the trail decay." },
  { keys: "F / Shift+F", description: "Increase or decrease relay depth." },
  { keys: "N / Shift+N", description: "Increase or decrease the composite mix." },
  { keys: "Escape", description: "Reset to the default feedback trails scene." },
]

@Component({
  selector: "app-webgl-feedback-trails-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-feedback-trails.page.html",
  styleUrl: "./webgl-feedback-trails.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlFeedbackTrailsPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.alpha)
  protected readonly glow = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.glow)
  protected readonly drift = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.drift)
  protected readonly decay = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.decay)
  protected readonly relays = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.relays)
  protected readonly mix = signal(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE.mix)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL feedback trails route prepares the seeded pass, repeated relays, and a final composite pass.",
  )
  protected readonly highlights = [
    "First Phase 3 route that drives a longer relay chain across the same two ping-pong targets instead of stopping after one bounce",
    "Uses the extracted fullscreen post-process helper plus the shared render-target helper to keep the repeated post-process program wiring local and small",
    "Extends Phase 3 from single feedback bounces into trail-style chains that can support richer echo and persistence effects later",
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
    glow: {
      value: () => this.glow(),
      set: (value) => this.glow.set(clampChannel(value)),
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
    relays: {
      value: () => this.relays(),
      set: (value) => this.relays.set(clampChannel(value)),
      displayValue: (value) =>
        `${webGlFeedbackTrailRelayCount({ ...this.scene(), relays: clampChannel(value) })} passes`,
    },
    mix: {
      value: () => this.mix(),
      set: (value) => this.mix.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlFeedbackTrailsScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    glow: this.glow(),
    drift: this.drift(),
    decay: this.decay(),
    relays: this.relays(),
    mix: this.mix(),
  }))
  protected readonly summary = computed(() =>
    webGlFeedbackTrailsSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlFeedbackTrailsClearColor(this.scene()) },
    { label: "Accent color", value: webGlFeedbackTrailsAccentColor(this.scene()) },
    { label: "Stages", value: webGlFeedbackTrailsStageLabel(this.scene()) },
    { label: "Relay count", value: `${webGlFeedbackTrailRelayCount(this.scene())}` },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlFeedbackTrailsScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL feedback trails scene from the shared URL.")
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

      renderWebGlFeedbackTrailsScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a feedback-trail WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_FEEDBACK_TRAILS_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-feedback-trails.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)
        this.statusMessage.set("WebGL feedback trails scene reset to the default preset.")
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
        stepNumericSignal(this.glow, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the seed glow.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.drift, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the trail drift.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.decay, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the trail decay.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.relays, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated relay depth.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.mix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the composite mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)
        this.statusMessage.set("WebGL feedback trails scene reset to the default preset.")
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

    releaseWebGlFeedbackTrailsResources(runtime)
  }

  private applyScene(scene: WebGlFeedbackTrailsScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.glow.set(clampChannel(scene.glow))
    this.drift.set(clampChannel(scene.drift))
    this.decay.set(clampChannel(scene.decay))
    this.relays.set(clampChannel(scene.relays))
    this.mix.set(clampChannel(scene.mix))
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
