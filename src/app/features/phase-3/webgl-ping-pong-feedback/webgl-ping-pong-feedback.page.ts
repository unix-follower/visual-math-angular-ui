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
  DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
  isWebGlPingPongFeedbackScene,
  type WebGlPingPongFeedbackScene,
  webGlPingPongFeedbackAccentColor,
  webGlPingPongFeedbackClearColor,
  webGlPingPongFeedbackStageLabel,
  webGlPingPongFeedbackSummary,
} from "./webgl-ping-pong-feedback.model"
import {
  releaseWebGlPingPongFeedbackResources,
  renderWebGlPingPongFeedbackScene,
} from "./webgl-ping-pong-feedback.renderer"

const WEBGL_PING_PONG_FEEDBACK_ROUTE_PATH = "/phase-3/webgl-ping-pong-feedback"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "energy", label: "Seed energy", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Feedback drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "feedback", label: "Feedback lift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlPingPongFeedbackScene>[] = [
  {
    label: "Signal echo",
    description: "Balanced seed energy with a readable two-target bounce.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.16,
      alpha: 1,
      energy: 0.72,
      drift: 0.34,
      feedback: 0.62,
    },
  },
  {
    label: "Aurora trail",
    description: "Cooler backdrop and longer drift through the second target.",
    state: {
      red: 0.03,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      energy: 0.54,
      drift: 0.68,
      feedback: 0.46,
    },
  },
  {
    label: "Heat relay",
    description: "Warmer background and a harder feedback lift after the bounce.",
    state: {
      red: 0.12,
      green: 0.08,
      blue: 0.07,
      alpha: 1,
      energy: 0.88,
      drift: 0.24,
      feedback: 0.84,
    },
  },
  {
    label: "Low haze",
    description: "Softer alpha and restrained feedback for a quieter ping-pong chain.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.14,
      alpha: 0.74,
      energy: 0.34,
      drift: 0.18,
      feedback: 0.28,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL ping-pong feedback scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current ping-pong feedback viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default ping-pong feedback scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the seed energy." },
  { keys: "S / Shift+S", description: "Increase or decrease the feedback drift." },
  { keys: "N / Shift+N", description: "Increase or decrease the feedback lift." },
  { keys: "Escape", description: "Reset to the default ping-pong feedback scene." },
]

@Component({
  selector: "app-webgl-ping-pong-feedback-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-ping-pong-feedback.page.html",
  styleUrl: "./webgl-ping-pong-feedback.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlPingPongFeedbackPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.alpha)
  protected readonly energy = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.energy)
  protected readonly drift = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.drift)
  protected readonly feedback = signal(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE.feedback)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL ping-pong feedback route prepares two offscreen targets and a return composite.",
  )
  protected readonly highlights = [
    "First Phase 3 route that alternates between two offscreen textures before the final presentation pass",
    "Builds on the extracted fullscreen quad helper and the new shared render-target helper for texture-plus-framebuffer setup",
    "Extends Phase 3 from single offscreen composite passes into a true ping-pong feedback chain that can seed later trail and echo effects",
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
    energy: {
      value: () => this.energy(),
      set: (value) => this.energy.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    drift: {
      value: () => this.drift(),
      set: (value) => this.drift.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    feedback: {
      value: () => this.feedback(),
      set: (value) => this.feedback.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlPingPongFeedbackScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    energy: this.energy(),
    drift: this.drift(),
    feedback: this.feedback(),
  }))
  protected readonly summary = computed(() =>
    webGlPingPongFeedbackSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlPingPongFeedbackClearColor(this.scene()) },
    { label: "Accent color", value: webGlPingPongFeedbackAccentColor(this.scene()) },
    { label: "Stages", value: webGlPingPongFeedbackStageLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlPingPongFeedbackScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL ping-pong feedback scene from the shared URL.")
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

      renderWebGlPingPongFeedbackScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a ping-pong WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_PING_PONG_FEEDBACK_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-ping-pong-feedback.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)
        this.statusMessage.set("WebGL ping-pong feedback scene reset to the default preset.")
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
        stepNumericSignal(this.energy, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the seed energy.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.drift, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the feedback drift.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.feedback, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the feedback lift.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)
        this.statusMessage.set("WebGL ping-pong feedback scene reset to the default preset.")
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

    releaseWebGlPingPongFeedbackResources(runtime)
  }

  private applyScene(scene: WebGlPingPongFeedbackScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.energy.set(clampChannel(scene.energy))
    this.drift.set(clampChannel(scene.drift))
    this.feedback.set(clampChannel(scene.feedback))
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
