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
  DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  isWebGlMultiObstacleFlowScene,
  type WebGlMultiObstacleFlowScene,
  webGlMultiObstacleFlowClearColor,
  webGlMultiObstacleFlowInjectionLabel,
  webGlMultiObstacleFlowPrimaryLabel,
  webGlMultiObstacleFlowSecondaryLabel,
  webGlMultiObstacleFlowSummary,
} from "./webgl-multi-obstacle-flow.model"
import {
  releaseWebGlMultiObstacleFlowResources,
  renderWebGlMultiObstacleFlowScene,
} from "./webgl-multi-obstacle-flow.renderer"

const WEBGL_MULTI_OBSTACLE_FLOW_ROUTE_PATH = "/phase-3/webgl-multi-obstacle-flow"
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
    id: "injectionStrength",
    label: "Injection strength",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "primaryRadius",
    label: "Primary obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
  {
    kind: "range",
    id: "secondaryRadius",
    label: "Secondary obstacle radius",
    min: 0.05,
    max: 0.3,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGlMultiObstacleFlowScene>[] = [
  {
    label: "Twin wake",
    description: "Two blockers split one bright injection wake into separate flow channels.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      swirl: 0.58,
      dissipation: 0.62,
      mix: 0.68,
      speed: 1.04,
      injectionX: 0.24,
      injectionY: 0.62,
      injectionStrength: 0.78,
      primaryX: 0.42,
      primaryY: 0.5,
      primaryRadius: 0.16,
      secondaryX: 0.74,
      secondaryY: 0.38,
      secondaryRadius: 0.12,
    },
  },
  {
    label: "Gate flow",
    description: "Primary and secondary obstacles form a narrow channel through the center.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      swirl: 0.44,
      dissipation: 0.74,
      mix: 0.58,
      speed: 0.72,
      injectionX: 0.18,
      injectionY: 0.52,
      injectionStrength: 0.62,
      primaryX: 0.46,
      primaryY: 0.62,
      primaryRadius: 0.22,
      secondaryX: 0.62,
      secondaryY: 0.34,
      secondaryRadius: 0.2,
    },
  },
  {
    label: "Cross current",
    description: "Faster motion with smaller obstacles and a more central source.",
    state: {
      red: 0.05,
      green: 0.05,
      blue: 0.07,
      alpha: 1,
      swirl: 0.82,
      dissipation: 0.42,
      mix: 0.78,
      speed: 1.62,
      injectionX: 0.5,
      injectionY: 0.56,
      injectionStrength: 0.9,
      primaryX: 0.34,
      primaryY: 0.38,
      primaryRadius: 0.1,
      secondaryX: 0.74,
      secondaryY: 0.62,
      secondaryRadius: 0.08,
    },
  },
  {
    label: "Slow basin",
    description: "Longer persistence with a heavier secondary blocker.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      swirl: 0.28,
      dissipation: 0.82,
      mix: 0.42,
      speed: 0.44,
      injectionX: 0.32,
      injectionY: 0.76,
      injectionStrength: 0.48,
      primaryX: 0.42,
      primaryY: 0.44,
      primaryRadius: 0.18,
      secondaryX: 0.78,
      secondaryY: 0.46,
      secondaryRadius: 0.24,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized multi-obstacle flow scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current multi-obstacle flow viewport as a PNG image.",
  },
  {
    id: "pulse-injection",
    label: "Pulse injection",
    description: "Temporarily boost the current injection source.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default multi-obstacle flow scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease swirl strength." },
  { keys: "D / Shift+D", description: "Increase or decrease history retention." },
  { keys: "M / Shift+M", description: "Increase or decrease composite mix." },
  { keys: "N / Shift+N", description: "Increase or decrease animation speed." },
  { keys: "I / Shift+I", description: "Increase or decrease injection strength." },
  { keys: "O / Shift+O", description: "Increase or decrease primary obstacle radius." },
  { keys: "P / Shift+P", description: "Increase or decrease secondary obstacle radius." },
  { keys: "Escape", description: "Reset to the default multi-obstacle flow scene." },
]

@Component({
  selector: "app-webgl-multi-obstacle-flow-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-multi-obstacle-flow.page.html",
  styleUrl: "./webgl-multi-obstacle-flow.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlMultiObstacleFlowPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false
  private animationFrameId: number | null = null
  private draggingObstacle: "primary" | "secondary" | null = null

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.alpha)
  protected readonly swirl = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.swirl)
  protected readonly dissipation = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.dissipation)
  protected readonly mix = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.mix)
  protected readonly speed = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.speed)
  protected readonly injectionX = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.injectionX)
  protected readonly injectionY = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.injectionY)
  protected readonly injectionStrength = signal(
    DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.injectionStrength,
  )
  protected readonly primaryX = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.primaryX)
  protected readonly primaryY = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.primaryY)
  protected readonly primaryRadius = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.primaryRadius)
  protected readonly secondaryX = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryX)
  protected readonly secondaryY = signal(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryY)
  protected readonly secondaryRadius = signal(
    DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryRadius,
  )
  protected readonly phase = signal(0)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL multi-obstacle flow route prepares a feedback field with two draggable blockers.",
  )
  protected readonly highlights = [
    "Extends the first interactive dye route into a stronger obstacle-aware simulation with two independently draggable blockers",
    "Chooses the nearest obstacle on pointer-down, so the interaction model stays direct instead of adding extra mode switches or overlay controls",
    "Keeps the same shared fullscreen post-process and render-target helpers while giving Phase 3 a stronger interaction-heavy simulation baseline",
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
    injectionStrength: {
      value: () => this.injectionStrength(),
      set: (value) => this.injectionStrength.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    primaryRadius: {
      value: () => this.primaryRadius(),
      set: (value) => this.primaryRadius.set(clampRadius(value)),
      displayValue: (value) => value.toFixed(2),
    },
    secondaryRadius: {
      value: () => this.secondaryRadius(),
      set: (value) => this.secondaryRadius.set(clampRadius(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlMultiObstacleFlowScene>(() => ({
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
    injectionStrength: this.injectionStrength(),
    primaryX: this.primaryX(),
    primaryY: this.primaryY(),
    primaryRadius: this.primaryRadius(),
    secondaryX: this.secondaryX(),
    secondaryY: this.secondaryY(),
    secondaryRadius: this.secondaryRadius(),
  }))
  protected readonly summary = computed(() =>
    webGlMultiObstacleFlowSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlMultiObstacleFlowClearColor(this.scene()) },
    { label: "Injection source", value: webGlMultiObstacleFlowInjectionLabel(this.scene()) },
    { label: "Primary obstacle", value: webGlMultiObstacleFlowPrimaryLabel(this.scene()) },
    { label: "Secondary obstacle", value: webGlMultiObstacleFlowSecondaryLabel(this.scene()) },
    { label: "Phase", value: this.phase().toFixed(2) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlMultiObstacleFlowScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL multi-obstacle flow scene from the shared URL.")
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

      renderWebGlMultiObstacleFlowScene(canvasRef.nativeElement, runtime, scene, phase)
      this.statusMessage.set(`Submitted a multi-obstacle flow frame using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_MULTI_OBSTACLE_FLOW_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-multi-obstacle-flow.png")
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
        this.applyScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)
        this.statusMessage.set("WebGL multi-obstacle flow scene reset to the default preset.")
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
        this.statusMessage.set("Updated composite mix.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.speed, event.shiftKey ? -0.1 : 0.1, clampSpeed)
        this.statusMessage.set("Updated animation speed.")
        break
      case "i":
        event.preventDefault()
        stepNumericSignal(this.injectionStrength, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated injection strength.")
        break
      case "o":
        event.preventDefault()
        stepNumericSignal(this.primaryRadius, event.shiftKey ? -0.02 : 0.02, clampRadius)
        this.statusMessage.set("Updated primary obstacle radius.")
        break
      case "p":
        event.preventDefault()
        stepNumericSignal(this.secondaryRadius, event.shiftKey ? -0.02 : 0.02, clampRadius)
        this.statusMessage.set("Updated secondary obstacle radius.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)
        this.statusMessage.set("WebGL multi-obstacle flow scene reset to the default preset.")
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
      this.draggingObstacle = null
      this.statusMessage.set("Pointer left the multi-obstacle flow viewport.")
      return
    }

    if (event.type === "pointerdown") {
      this.draggingObstacle = this.closestObstacle(normalizedX, normalizedY)
      this.updateDraggedObstacle(normalizedX, normalizedY)
      this.statusMessage.set(`Started dragging the ${this.draggingObstacle ?? "primary"} obstacle.`)
      return
    }

    if (event.type === "pointerup") {
      this.updateDraggedObstacle(normalizedX, normalizedY)
      this.draggingObstacle = null
      this.statusMessage.set("Released obstacle drag.")
      return
    }

    if (this.draggingObstacle) {
      this.updateDraggedObstacle(normalizedX, normalizedY)
      this.statusMessage.set(
        `Dragging the ${this.draggingObstacle} obstacle through the flow field.`,
      )
      return
    }

    this.injectionX.set(normalizedX)
    this.injectionY.set(normalizedY)
    this.statusMessage.set("Moved the flow injection source.")
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

    releaseWebGlMultiObstacleFlowResources(runtime)
  }

  private applyScene(scene: WebGlMultiObstacleFlowScene): void {
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
    this.injectionStrength.set(clampChannel(scene.injectionStrength))
    this.primaryX.set(clampChannel(scene.primaryX))
    this.primaryY.set(clampChannel(scene.primaryY))
    this.primaryRadius.set(clampRadius(scene.primaryRadius))
    this.secondaryX.set(clampChannel(scene.secondaryX))
    this.secondaryY.set(clampChannel(scene.secondaryY))
    this.secondaryRadius.set(clampRadius(scene.secondaryRadius))
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

  private closestObstacle(x: number, y: number): "primary" | "secondary" {
    const primaryDistance = Math.hypot(x - this.primaryX(), y - this.primaryY())
    const secondaryDistance = Math.hypot(x - this.secondaryX(), y - this.secondaryY())
    return primaryDistance <= secondaryDistance ? "primary" : "secondary"
  }

  private updateDraggedObstacle(x: number, y: number): void {
    if (this.draggingObstacle === "secondary") {
      this.secondaryX.set(x)
      this.secondaryY.set(y)
      return
    }

    if (this.draggingObstacle === "primary") {
      this.primaryX.set(x)
      this.primaryY.set(y)
    }
  }
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function clampSpeed(value: number): number {
  return Math.min(2.4, Math.max(0.2, value))
}

function clampRadius(value: number): number {
  return Math.min(0.3, Math.max(0.05, value))
}

function normalizePhase(value: number): number {
  return value % 1
}
