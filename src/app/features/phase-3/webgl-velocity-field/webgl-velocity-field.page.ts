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
  DEFAULT_WEBGL_VELOCITY_FIELD_SCENE,
  isWebGlVelocityFieldScene,
  type WebGlVelocityFieldScene,
  webGlVelocityFieldAccentColor,
  webGlVelocityFieldClearColor,
  webGlVelocityFieldFlowLabel,
  webGlVelocityFieldMemoryLabel,
  webGlVelocityFieldSummary,
} from "./webgl-velocity-field.model"
import {
  releaseWebGlVelocityFieldResources,
  renderWebGlVelocityFieldScene,
} from "./webgl-velocity-field.renderer"

const WEBGL_VELOCITY_FIELD_ROUTE_PATH = "/phase-3/webgl-velocity-field"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "swirl", label: "Swirl strength", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "shear", label: "Shear strength", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "injection", label: "Dye injection", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "dissipation", label: "History retention", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
]
const PRESETS: readonly WorkbenchPreset<WebGlVelocityFieldScene>[] = [
  {
    label: "Vortex wash",
    description: "Balanced swirl and shear with readable dye injection.",
    state: {
      red: 0.02,
      green: 0.05,
      blue: 0.1,
      alpha: 1,
      swirl: 0.62,
      shear: 0.38,
      injection: 0.74,
      dissipation: 0.56,
      mix: 0.64,
      speed: 0.98,
    },
  },
  {
    label: "River bend",
    description: "Shear-heavy flow with longer history retention.",
    state: {
      red: 0.03,
      green: 0.07,
      blue: 0.14,
      alpha: 1,
      swirl: 0.24,
      shear: 0.82,
      injection: 0.48,
      dissipation: 0.74,
      mix: 0.46,
      speed: 0.72,
    },
  },
  {
    label: "Pulse eddy",
    description: "Faster motion with hotter injection and tighter memory.",
    state: {
      red: 0.08,
      green: 0.04,
      blue: 0.05,
      alpha: 1,
      swirl: 0.88,
      shear: 0.28,
      injection: 0.92,
      dissipation: 0.34,
      mix: 0.82,
      speed: 1.58,
    },
  },
  {
    label: "Glass drift",
    description: "Quieter field with softer injection and lighter composite lift.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.12,
      alpha: 0.82,
      swirl: 0.34,
      shear: 0.22,
      injection: 0.28,
      dissipation: 0.62,
      mix: 0.28,
      speed: 0.54,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized velocity-field scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current velocity-field viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default velocity-field scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the swirl strength." },
  { keys: "S / Shift+S", description: "Increase or decrease the shear strength." },
  { keys: "D / Shift+D", description: "Increase or decrease the dye injection." },
  { keys: "F / Shift+F", description: "Increase or decrease the history retention." },
  { keys: "M / Shift+M", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease the animation speed." },
  { keys: "Escape", description: "Reset to the default velocity-field scene." },
]

@Component({
  selector: "app-webgl-velocity-field-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-velocity-field.page.html",
  styleUrl: "./webgl-velocity-field.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlVelocityFieldPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false
  private animationFrameId: number | null = null

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.alpha)
  protected readonly swirl = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.swirl)
  protected readonly shear = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.shear)
  protected readonly injection = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.injection)
  protected readonly dissipation = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.dissipation)
  protected readonly mix = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.mix)
  protected readonly speed = signal(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE.speed)
  protected readonly phase = signal(0)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL velocity-field route prepares animated advection across two persistent render targets.",
  )
  protected readonly highlights = [
    "First Phase 3 route framed as a simulation step rather than a fixed relay count or a purely procedural pulse",
    "Advects the previous frame through a synthetic velocity field so swirl and shear accumulate as time evolves",
    "Reuses the shared fullscreen post-process and render-target helpers while keeping the velocity logic route-local",
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
    swirl: {
      value: () => this.swirl(),
      set: (value) => this.swirl.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    shear: {
      value: () => this.shear(),
      set: (value) => this.shear.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    injection: {
      value: () => this.injection(),
      set: (value) => this.injection.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    dissipation: {
      value: () => this.dissipation(),
      set: (value) => this.dissipation.set(clampChannel(value)),
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
  protected readonly scene = computed<WebGlVelocityFieldScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    swirl: this.swirl(),
    shear: this.shear(),
    injection: this.injection(),
    dissipation: this.dissipation(),
    mix: this.mix(),
    speed: this.speed(),
  }))
  protected readonly summary = computed(() =>
    webGlVelocityFieldSummary(
      this.scene(),
      this.runtimeStatusLabel(),
      this.phase(),
      this.runtime()?.version,
    ),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlVelocityFieldClearColor(this.scene()) },
    { label: "Accent color", value: webGlVelocityFieldAccentColor(this.scene()) },
    { label: "Flow field", value: webGlVelocityFieldFlowLabel(this.scene()) },
    { label: "History retention", value: webGlVelocityFieldMemoryLabel(this.scene()) },
    { label: "Phase", value: this.phase().toFixed(2) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlVelocityFieldScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL velocity-field scene from the shared URL.")
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

      renderWebGlVelocityFieldScene(canvasRef.nativeElement, runtime, scene, phase)
      this.statusMessage.set(`Submitted a velocity-field WebGL frame using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_VELOCITY_FIELD_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-velocity-field.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)
        this.statusMessage.set("WebGL velocity-field scene reset to the default preset.")
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
        stepNumericSignal(this.swirl, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the swirl strength.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.shear, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the shear strength.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.injection, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the dye injection.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.dissipation, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the history retention.")
        break
      case "m":
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
        this.applyScene(DEFAULT_WEBGL_VELOCITY_FIELD_SCENE)
        this.statusMessage.set("WebGL velocity-field scene reset to the default preset.")
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

    releaseWebGlVelocityFieldResources(runtime)
  }

  private applyScene(scene: WebGlVelocityFieldScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.swirl.set(clampChannel(scene.swirl))
    this.shear.set(clampChannel(scene.shear))
    this.injection.set(clampChannel(scene.injection))
    this.dissipation.set(clampChannel(scene.dissipation))
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
        this.phase.update((value) => normalizePhase(value + deltaSeconds * this.speed() * 0.24))
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
