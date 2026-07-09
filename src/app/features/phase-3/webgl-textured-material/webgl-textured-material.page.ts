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
  DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
  isWebGlTexturedMaterialScene,
  type WebGlTexturedMaterialScene,
  webGlTexturedMaterialBaseColor,
  webGlTexturedMaterialClearColor,
  webGlTexturedMaterialFinishLabel,
  webGlTexturedMaterialLightDirection,
  webGlTexturedMaterialSummary,
} from "./webgl-textured-material.model"
import {
  releaseWebGlTexturedMaterialResources,
  renderWebGlTexturedMaterialScene,
} from "./webgl-textured-material.renderer"

const WEBGL_TEXTURED_MATERIAL_ROUTE_PATH = "/phase-3/webgl-textured-material"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Material warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "textureMix", label: "Texture mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relief", label: "Relief depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "gloss", label: "Gloss response", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Primary light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Primary light Y", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "fill", label: "Fill light strength", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTexturedMaterialScene>[] = [
  {
    label: "Embossed brass",
    description: "Warm base with stronger texture mix and balanced fill lighting.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      warmth: 0.58,
      textureMix: 0.74,
      relief: 0.46,
      gloss: 0.52,
      lightX: 0.78,
      lightY: 0.7,
      fill: 0.34,
    },
  },
  {
    label: "Cool ceramic",
    description: "Cooler base with softer relief and a lighter fill light.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      warmth: 0.28,
      textureMix: 0.42,
      relief: 0.24,
      gloss: 0.26,
      lightX: 0.68,
      lightY: 0.66,
      fill: 0.52,
    },
  },
  {
    label: "Anodized plate",
    description: "Sharper relief and gloss with a stronger primary light.",
    state: {
      red: 0.02,
      green: 0.04,
      blue: 0.08,
      alpha: 1,
      warmth: 0.46,
      textureMix: 0.88,
      relief: 0.72,
      gloss: 0.82,
      lightX: 0.84,
      lightY: 0.82,
      fill: 0.18,
    },
  },
  {
    label: "Painted panel",
    description: "Softer gloss with more visible texture color than metallic highlight.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 0.94,
      warmth: 0.72,
      textureMix: 0.62,
      relief: 0.36,
      gloss: 0.32,
      lightX: 0.72,
      lightY: 0.64,
      fill: 0.44,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized textured-material scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current textured-material viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default textured-material scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease material warmth." },
  { keys: "T / Shift+T", description: "Increase or decrease texture mix." },
  { keys: "D / Shift+D", description: "Increase or decrease relief depth." },
  { keys: "N / Shift+N", description: "Increase or decrease gloss response." },
  { keys: "J / Shift+J", description: "Increase or decrease the primary light X position." },
  { keys: "K / Shift+K", description: "Increase or decrease the primary light Y position." },
  { keys: "F / Shift+F", description: "Increase or decrease fill-light strength." },
  { keys: "Escape", description: "Reset to the default textured-material scene." },
]

@Component({
  selector: "app-webgl-textured-material-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-textured-material.page.html",
  styleUrl: "./webgl-textured-material.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlTexturedMaterialPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.alpha)
  protected readonly warmth = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.warmth)
  protected readonly textureMix = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.textureMix)
  protected readonly relief = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.relief)
  protected readonly gloss = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.gloss)
  protected readonly lightX = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.lightX)
  protected readonly lightY = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.lightY)
  protected readonly fill = signal(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE.fill)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL textured-material route prepares a procedural texture upload plus two-light shading pass.",
  )
  protected readonly highlights = [
    "Closes the gap between basic texture uploads and advanced material workflows by shading a texture-backed surface instead of a flat sampled quad",
    "Derives relief normals from neighboring texels inside the fragment shader so uploaded texture data affects both color and lighting response",
    "Adds a second fill light so Phase 3 now covers both texture-backed materials and a first multi-light WebGL shading route",
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
    textureMix: {
      value: () => this.textureMix(),
      set: (value) => this.textureMix.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    relief: {
      value: () => this.relief(),
      set: (value) => this.relief.set(clampChannel(value)),
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
    fill: {
      value: () => this.fill(),
      set: (value) => this.fill.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlTexturedMaterialScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    warmth: this.warmth(),
    textureMix: this.textureMix(),
    relief: this.relief(),
    gloss: this.gloss(),
    lightX: this.lightX(),
    lightY: this.lightY(),
    fill: this.fill(),
  }))
  protected readonly summary = computed(() =>
    webGlTexturedMaterialSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTexturedMaterialClearColor(this.scene()) },
    { label: "Base color", value: webGlTexturedMaterialBaseColor(this.scene()) },
    { label: "Light direction", value: webGlTexturedMaterialLightDirection(this.scene()) },
    { label: "Finish", value: webGlTexturedMaterialFinishLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlTexturedMaterialScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL textured-material scene from the shared URL.")
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

      renderWebGlTexturedMaterialScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a textured-material WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_TEXTURED_MATERIAL_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-textured-material.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)
        this.statusMessage.set("WebGL textured-material scene reset to the default preset.")
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
      case "t":
        event.preventDefault()
        stepNumericSignal(this.textureMix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the texture mix.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.relief, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated relief depth.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.gloss, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated gloss response.")
        break
      case "j":
        event.preventDefault()
        stepNumericSignal(this.lightX, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the primary light X position.")
        break
      case "k":
        event.preventDefault()
        stepNumericSignal(this.lightY, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the primary light Y position.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.fill, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the fill-light strength.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)
        this.statusMessage.set("WebGL textured-material scene reset to the default preset.")
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

    releaseWebGlTexturedMaterialResources(runtime)
  }

  private applyScene(scene: WebGlTexturedMaterialScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.warmth.set(clampChannel(scene.warmth))
    this.textureMix.set(clampChannel(scene.textureMix))
    this.relief.set(clampChannel(scene.relief))
    this.gloss.set(clampChannel(scene.gloss))
    this.lightX.set(clampChannel(scene.lightX))
    this.lightY.set(clampChannel(scene.lightY))
    this.fill.set(clampChannel(scene.fill))
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
