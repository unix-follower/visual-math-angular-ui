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
  DEFAULT_WEBGL_SHADOW_RELIEF_SCENE,
  isWebGlShadowReliefScene,
  type WebGlShadowReliefScene,
  webGlShadowReliefBaseColor,
  webGlShadowReliefClearColor,
  webGlShadowReliefFinishLabel,
  webGlShadowReliefLightDirection,
  webGlShadowReliefSummary,
} from "./webgl-shadow-relief.model"
import {
  releaseWebGlShadowReliefResources,
  renderWebGlShadowReliefScene,
} from "./webgl-shadow-relief.renderer"

const WEBGL_SHADOW_RELIEF_ROUTE_PATH = "/phase-3/webgl-shadow-relief"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Material warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relief", label: "Relief depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "shadow", label: "Shadow depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "gloss", label: "Gloss response", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Light Y", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlShadowReliefScene>[] = [
  {
    label: "Stone emboss",
    description: "Balanced relief and shadow for carved stone-like ridges.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      warmth: 0.64,
      relief: 0.58,
      shadow: 0.52,
      gloss: 0.44,
      lightX: 0.76,
      lightY: 0.72,
    },
  },
  {
    label: "Soft plaster",
    description: "Shallower relief with softer shadow and lower gloss.",
    state: {
      red: 0.05,
      green: 0.07,
      blue: 0.11,
      alpha: 1,
      warmth: 0.74,
      relief: 0.34,
      shadow: 0.28,
      gloss: 0.18,
      lightX: 0.7,
      lightY: 0.64,
    },
  },
  {
    label: "Metal plate",
    description: "Sharper highlights and deeper cut lines under a steeper light.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      warmth: 0.4,
      relief: 0.72,
      shadow: 0.66,
      gloss: 0.82,
      lightX: 0.86,
      lightY: 0.84,
    },
  },
  {
    label: "Basalt fold",
    description: "Cooler base with heavier shadowing across the height field.",
    state: {
      red: 0.02,
      green: 0.04,
      blue: 0.08,
      alpha: 1,
      warmth: 0.22,
      relief: 0.66,
      shadow: 0.78,
      gloss: 0.26,
      lightX: 0.62,
      lightY: 0.74,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized shadow-relief scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL shadow-relief viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default shadow-relief scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease material warmth." },
  { keys: "D / Shift+D", description: "Increase or decrease relief depth." },
  { keys: "S / Shift+S", description: "Increase or decrease shadow depth." },
  { keys: "N / Shift+N", description: "Increase or decrease gloss response." },
  { keys: "J / Shift+J", description: "Increase or decrease the light X position." },
  { keys: "K / Shift+K", description: "Increase or decrease the light Y position." },
  { keys: "Escape", description: "Reset to the default shadow-relief scene." },
]

@Component({
  selector: "app-webgl-shadow-relief-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-shadow-relief.page.html",
  styleUrl: "./webgl-shadow-relief.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlShadowReliefPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.alpha)
  protected readonly warmth = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.warmth)
  protected readonly relief = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.relief)
  protected readonly shadow = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.shadow)
  protected readonly gloss = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.gloss)
  protected readonly lightX = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.lightX)
  protected readonly lightY = signal(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE.lightY)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL shadow-relief route prepares a procedural height field with normal-derived lighting and shadow cues.",
  )
  protected readonly highlights = [
    "Adds stronger spatial cues than the first lit-material route by deriving normals from a procedural height field instead of a smooth orb",
    "Builds relief, contact-shadow, and glossy highlight cues inside one fragment shader so the slice stays route-local and shader-driven",
    "Gives Phase 3 a first shadow-oriented WebGL route without widening the shared runtime or resource helpers",
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
    warmth: {
      value: () => this.warmth(),
      set: (value) => this.warmth.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    relief: {
      value: () => this.relief(),
      set: (value) => this.relief.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    shadow: {
      value: () => this.shadow(),
      set: (value) => this.shadow.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    gloss: {
      value: () => this.gloss(),
      set: (value) => this.gloss.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    lightX: {
      value: () => this.lightX(),
      set: (value) => this.lightX.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    lightY: {
      value: () => this.lightY(),
      set: (value) => this.lightY.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlShadowReliefScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    warmth: this.warmth(),
    relief: this.relief(),
    shadow: this.shadow(),
    gloss: this.gloss(),
    lightX: this.lightX(),
    lightY: this.lightY(),
  }))
  protected readonly summary = computed(() =>
    webGlShadowReliefSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlShadowReliefClearColor(this.scene()) },
    { label: "Base color", value: webGlShadowReliefBaseColor(this.scene()) },
    { label: "Light direction", value: webGlShadowReliefLightDirection(this.scene()) },
    { label: "Finish", value: webGlShadowReliefFinishLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlShadowReliefScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL shadow-relief scene from the shared URL.")
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

      renderWebGlShadowReliefScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a shadow-relief WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_SHADOW_RELIEF_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-shadow-relief.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
        this.statusMessage.set("WebGL shadow-relief scene reset to the default preset.")
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
        stepNumericSignal(this.warmth, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the material warmth.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.relief, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated relief depth.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.shadow, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated shadow depth.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.gloss, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated gloss response.")
        break
      case "j":
        event.preventDefault()
        stepNumericSignal(this.lightX, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the light X position.")
        break
      case "k":
        event.preventDefault()
        stepNumericSignal(this.lightY, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the light Y position.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
        this.statusMessage.set("WebGL shadow-relief scene reset to the default preset.")
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

    releaseWebGlShadowReliefResources(runtime)
  }

  private applyScene(scene: WebGlShadowReliefScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.warmth.set(clampChannel(scene.warmth))
    this.relief.set(clampChannel(scene.relief))
    this.shadow.set(clampChannel(scene.shadow))
    this.gloss.set(clampChannel(scene.gloss))
    this.lightX.set(clampChannel(scene.lightX))
    this.lightY.set(clampChannel(scene.lightY))
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
