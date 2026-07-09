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
  DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
  isWebGlInteractiveDyeScene,
  type WebGlInteractiveDyeScene,
  webGlInteractiveDyeClearColor,
  webGlInteractiveDyeFlowLabel,
  webGlInteractiveDyeInjectionLabel,
  webGlInteractiveDyeObstacleLabel,
  webGlInteractiveDyeSummary,
} from "./webgl-interactive-dye.model"
import {
  releaseWebGlInteractiveDyeResources,
  renderWebGlInteractiveDyeScene,
} from "./webgl-interactive-dye.renderer"

const WEBGL_INTERACTIVE_DYE_ROUTE_PATH = "/phase-3/webgl-interactive-dye"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "swirl", label: "Swirl strength", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "dissipation", label: "History retention", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "speed", label: "Animation speed", min: 0.2, max: 2.4, step: 0.05 },
  {
    kind: "range",
    id: "obstacleRadius",
    label: "Obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
  {
    kind: "range",
    id: "injectionStrength",
    label: "Injection strength",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGlInteractiveDyeScene>[] = [
  {
    label: "Counterflow",
    description: "A left-side injection point with a central blocker and moderate retention.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      swirl: 0.54,
      dissipation: 0.62,
      mix: 0.68,
      speed: 1.02,
      injectionX: 0.28,
      injectionY: 0.62,
      obstacleX: 0.68,
      obstacleY: 0.42,
      obstacleRadius: 0.16,
      injectionStrength: 0.78,
    },
  },
  {
    label: "Center pulse",
    description: "Central injection with a larger obstacle offset downward.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      swirl: 0.72,
      dissipation: 0.54,
      mix: 0.82,
      speed: 1.18,
      injectionX: 0.5,
      injectionY: 0.5,
      obstacleX: 0.56,
      obstacleY: 0.3,
      obstacleRadius: 0.22,
      injectionStrength: 0.92,
    },
  },
  {
    label: "Top spill",
    description: "Higher injection position with slower movement and tighter obstacle radius.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      swirl: 0.34,
      dissipation: 0.76,
      mix: 0.52,
      speed: 0.66,
      injectionX: 0.4,
      injectionY: 0.78,
      obstacleX: 0.74,
      obstacleY: 0.46,
      obstacleRadius: 0.1,
      injectionStrength: 0.62,
    },
  },
  {
    label: "Dual wake",
    description: "Warm background with a right-side source and a wider obstacle shadow.",
    state: {
      red: 0.06,
      green: 0.05,
      blue: 0.06,
      alpha: 1,
      swirl: 0.84,
      dissipation: 0.44,
      mix: 0.74,
      speed: 1.52,
      injectionX: 0.74,
      injectionY: 0.54,
      obstacleX: 0.36,
      obstacleY: 0.46,
      obstacleRadius: 0.24,
      injectionStrength: 0.86,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized interactive-dye scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current interactive-dye viewport as a PNG image.",
  },
  {
    id: "pulse-injection",
    label: "Pulse injection",
    description: "Temporarily boost the injection strength at the current pointer target.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default interactive-dye scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease swirl strength." },
  { keys: "D / Shift+D", description: "Increase or decrease history retention." },
  { keys: "M / Shift+M", description: "Increase or decrease the composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease animation speed." },
  { keys: "O / Shift+O", description: "Increase or decrease the obstacle radius." },
  { keys: "I / Shift+I", description: "Increase or decrease the injection strength." },
  { keys: "Escape", description: "Reset to the default interactive-dye scene." },
]

@Component({
  selector: "app-webgl-interactive-dye-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-interactive-dye.page.html",
  styleUrl: "./webgl-interactive-dye.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlInteractiveDyePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false
  private animationFrameId: number | null = null
  private draggingObstacle = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.alpha)
  protected readonly swirl = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.swirl)
  protected readonly dissipation = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.dissipation)
  protected readonly mix = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.mix)
  protected readonly speed = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.speed)
  protected readonly injectionX = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.injectionX)
  protected readonly injectionY = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.injectionY)
  protected readonly obstacleX = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.obstacleX)
  protected readonly obstacleY = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.obstacleY)
  protected readonly obstacleRadius = signal(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.obstacleRadius)
  protected readonly injectionStrength = signal(
    DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE.injectionStrength,
  )
  protected readonly phase = signal(0)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL interactive-dye route prepares a feedback field with live pointer injection.",
  )
  protected readonly highlights = [
    "Adds explicit user input to the simulation surface by mapping pointer movement to the dye injection source",
    "Lets the user drag the obstacle directly inside the viewport, so the evolving field reacts to interaction instead of only a procedural phase driver",
    "Reuses the shared fullscreen post-process and render-target helpers while keeping the injection and obstacle logic route-local",
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
    obstacleRadius: {
      value: () => this.obstacleRadius(),
      set: (value) => this.obstacleRadius.set(clampObstacleRadius(value)),
      displayValue: (value) => value.toFixed(2),
    },
    injectionStrength: {
      value: () => this.injectionStrength(),
      set: (value) => this.injectionStrength.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlInteractiveDyeScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    swirl: this.swirl(),
    dissipation: this.dissipation(),
    mix: this.mix(),
    speed: this.speed(),
    injectionX: this.injectionX(),
    injectionY: this.injectionY(),
    obstacleX: this.obstacleX(),
    obstacleY: this.obstacleY(),
    obstacleRadius: this.obstacleRadius(),
    injectionStrength: this.injectionStrength(),
  }))
  protected readonly summary = computed(() =>
    webGlInteractiveDyeSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlInteractiveDyeClearColor(this.scene()) },
    { label: "Injection target", value: webGlInteractiveDyeInjectionLabel(this.scene()) },
    { label: "Obstacle", value: webGlInteractiveDyeObstacleLabel(this.scene()) },
    { label: "Flow field", value: webGlInteractiveDyeFlowLabel(this.scene()) },
    { label: "Phase", value: this.phase().toFixed(2) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlInteractiveDyeScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL interactive-dye scene from the shared URL.")
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

      renderWebGlInteractiveDyeScene(canvasRef.nativeElement, runtime, scene, phase)
      this.statusMessage.set(`Submitted an interactive dye frame using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_INTERACTIVE_DYE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-interactive-dye.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      case "pulse-injection": {
        this.injectionStrength.update((value) => clampChannel(value + 0.12))
        this.statusMessage.set("Boosted the current injection source.")
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)
        this.statusMessage.set("WebGL interactive-dye scene reset to the default preset.")
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
        this.statusMessage.set("Updated swirl strength.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.dissipation, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated history retention.")
        break
      case "m":
        event.preventDefault()
        stepNumericSignal(this.mix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the composite mix.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed)
        this.statusMessage.set("Updated animation speed.")
        break
      case "o":
        event.preventDefault()
        stepNumericSignal(this.obstacleRadius, event.shiftKey ? -0.02 : 0.02, clampObstacleRadius)
        this.statusMessage.set("Updated obstacle radius.")
        break
      case "i":
        event.preventDefault()
        stepNumericSignal(this.injectionStrength, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated injection strength.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)
        this.statusMessage.set("WebGL interactive-dye scene reset to the default preset.")
        break
      default:
        break
    }
  }

  protected handleViewportPointer(event: PointerEvent): void {
    const target = event.target

    if (!(target instanceof HTMLCanvasElement) && !(target instanceof HTMLDivElement)) {
      return
    }

    const rect = target.getBoundingClientRect()
    const normalizedX = clampChannel((event.clientX - rect.left) / Math.max(1, rect.width))
    const normalizedY = clampChannel(1 - (event.clientY - rect.top) / Math.max(1, rect.height))

    if (event.type === "pointerleave") {
      this.draggingObstacle = false
      this.statusMessage.set("Pointer left the interactive dye viewport.")
      return
    }

    if (event.type === "pointerdown") {
      this.draggingObstacle = true
      this.obstacleX.set(normalizedX)
      this.obstacleY.set(normalizedY)
      this.statusMessage.set("Started dragging the obstacle.")
      return
    }

    if (event.type === "pointerup") {
      if (this.draggingObstacle) {
        this.obstacleX.set(normalizedX)
        this.obstacleY.set(normalizedY)
      }

      this.draggingObstacle = false
      this.statusMessage.set("Released the obstacle drag.")
      return
    }

    if (this.draggingObstacle) {
      this.obstacleX.set(normalizedX)
      this.obstacleY.set(normalizedY)
      this.statusMessage.set("Dragging the obstacle through the dye field.")
      return
    }

    this.injectionX.set(normalizedX)
    this.injectionY.set(normalizedY)
    this.statusMessage.set("Moved the dye injection source.")
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

    releaseWebGlInteractiveDyeResources(runtime)
  }

  private applyScene(scene: WebGlInteractiveDyeScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.swirl.set(clampChannel(scene.swirl))
    this.dissipation.set(clampChannel(scene.dissipation))
    this.mix.set(clampChannel(scene.mix))
    this.speed.set(clampSpeed(scene.speed))
    this.injectionX.set(clampChannel(scene.injectionX))
    this.injectionY.set(clampChannel(scene.injectionY))
    this.obstacleX.set(clampChannel(scene.obstacleX))
    this.obstacleY.set(clampChannel(scene.obstacleY))
    this.obstacleRadius.set(clampObstacleRadius(scene.obstacleRadius))
    this.injectionStrength.set(clampChannel(scene.injectionStrength))
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
  return Math.min(1, Math.max(0, value))
}

function clampSpeed(value: number): number {
  return Math.min(2.4, Math.max(0.2, value))
}

function clampObstacleRadius(value: number): number {
  return Math.min(0.3, Math.max(0.05, value))
}

function normalizePhase(value: number): number {
  return value % 1
}
