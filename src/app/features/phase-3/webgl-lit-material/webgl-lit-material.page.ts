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
  DEFAULT_WEBGL_LIT_MATERIAL_SCENE,
  isWebGlLitMaterialScene,
  type WebGlLitMaterialScene,
  webGlLitMaterialBaseColor,
  webGlLitMaterialClearColor,
  webGlLitMaterialFinishLabel,
  webGlLitMaterialLightDirection,
  webGlLitMaterialSummary,
} from "./webgl-lit-material.model"
import {
  releaseWebGlLitMaterialResources,
  renderWebGlLitMaterialScene,
} from "./webgl-lit-material.renderer"

const WEBGL_LIT_MATERIAL_ROUTE_PATH = "/phase-3/webgl-lit-material"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Material warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "metalness", label: "Metalness", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "roughness", label: "Roughness", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Light Y", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "rim", label: "Rim lift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlLitMaterialScene>[] = [
  {
    label: "Brushed brass",
    description: "Warm base color with a tighter highlight and moderate rim lift.",
    state: {
      red: 0.05,
      green: 0.07,
      blue: 0.11,
      alpha: 1,
      warmth: 0.78,
      metalness: 0.62,
      roughness: 0.28,
      lightX: 0.82,
      lightY: 0.72,
      rim: 0.34,
    },
  },
  {
    label: "Ceramic cool",
    description: "Cooler finish with softer diffuse shading and lower metal response.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.12,
      alpha: 1,
      warmth: 0.24,
      metalness: 0.16,
      roughness: 0.54,
      lightX: 0.7,
      lightY: 0.68,
      rim: 0.44,
    },
  },
  {
    label: "Chrome bead",
    description: "Stronger metal response with a sharper light angle.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      warmth: 0.48,
      metalness: 0.86,
      roughness: 0.12,
      lightX: 0.9,
      lightY: 0.84,
      rim: 0.22,
    },
  },
  {
    label: "Glass enamel",
    description: "Balanced warmth and rim lift for a softer coated material.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      warmth: 0.58,
      metalness: 0.28,
      roughness: 0.42,
      lightX: 0.68,
      lightY: 0.58,
      rim: 0.62,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized lit-material scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL lit-material viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default lit-material scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the material warmth." },
  { keys: "S / Shift+S", description: "Increase or decrease metalness." },
  { keys: "D / Shift+D", description: "Increase or decrease roughness." },
  { keys: "J / Shift+J", description: "Increase or decrease the light X position." },
  { keys: "K / Shift+K", description: "Increase or decrease the light Y position." },
  { keys: "N / Shift+N", description: "Increase or decrease rim lift." },
  { keys: "Escape", description: "Reset to the default lit-material scene." },
]

@Component({
  selector: "app-webgl-lit-material-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-lit-material.page.html",
  styleUrl: "./webgl-lit-material.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlLitMaterialPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.alpha)
  protected readonly warmth = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.warmth)
  protected readonly metalness = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.metalness)
  protected readonly roughness = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.roughness)
  protected readonly lightX = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.lightX)
  protected readonly lightY = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.lightY)
  protected readonly rim = signal(DEFAULT_WEBGL_LIT_MATERIAL_SCENE.rim)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL lit-material route prepares a procedural orb with derived normals and material shading.",
  )
  protected readonly highlights = [
    "First Phase 3 lighting-focused route, moving beyond geometry and post-process composition into material response",
    "Uses a procedural normal field in the fragment shader so diffuse, specular, and rim terms can all stay inside one WebGL draw call",
    "Keeps the route-local workbench contract while introducing light direction, metalness, roughness, and rim controls",
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
    metalness: {
      value: () => this.metalness(),
      set: (value) => this.metalness.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    roughness: {
      value: () => this.roughness(),
      set: (value) => this.roughness.set(clampChannel(value)),
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
    rim: {
      value: () => this.rim(),
      set: (value) => this.rim.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlLitMaterialScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    warmth: this.warmth(),
    metalness: this.metalness(),
    roughness: this.roughness(),
    lightX: this.lightX(),
    lightY: this.lightY(),
    rim: this.rim(),
  }))
  protected readonly summary = computed(() =>
    webGlLitMaterialSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlLitMaterialClearColor(this.scene()) },
    { label: "Base color", value: webGlLitMaterialBaseColor(this.scene()) },
    { label: "Light direction", value: webGlLitMaterialLightDirection(this.scene()) },
    { label: "Finish", value: webGlLitMaterialFinishLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlLitMaterialScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL lit-material scene from the shared URL.")
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

      renderWebGlLitMaterialScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a lit-material WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_LIT_MATERIAL_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-lit-material.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
        this.statusMessage.set("WebGL lit-material scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        stepNumericSignal(this.metalness, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated metalness.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.roughness, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated roughness.")
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
      case "n":
        event.preventDefault()
        stepNumericSignal(this.rim, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated rim lift.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
        this.statusMessage.set("WebGL lit-material scene reset to the default preset.")
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

    releaseWebGlLitMaterialResources(runtime)
  }

  private applyScene(scene: WebGlLitMaterialScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.warmth.set(clampChannel(scene.warmth))
    this.metalness.set(clampChannel(scene.metalness))
    this.roughness.set(clampChannel(scene.roughness))
    this.lightX.set(clampChannel(scene.lightX))
    this.lightY.set(clampChannel(scene.lightY))
    this.rim.set(clampChannel(scene.rim))
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
