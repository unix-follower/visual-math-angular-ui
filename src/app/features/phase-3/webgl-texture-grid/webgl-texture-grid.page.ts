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
  DEFAULT_WEBGL_TEXTURE_GRID_SCENE,
  isWebGlTextureGridScene,
  type WebGlTextureGridScene,
  webGlTextureGridAccentColor,
  webGlTextureGridClearColor,
  webGlTextureGridDensity,
  webGlTextureGridSummary,
} from "./webgl-texture-grid.model"
import {
  releaseWebGlTextureGridResources,
  renderWebGlTextureGridScene,
} from "./webgl-texture-grid.renderer"

const WEBGL_TEXTURE_GRID_ROUTE_PATH = "/phase-3/webgl-texture-grid"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "frequency", label: "Texture phase", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "contrast", label: "Checker contrast", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blend", label: "Diagonal blend", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTextureGridScene>[] = [
  {
    label: "Signal tiles",
    description: "Balanced texture upload with a strong diagonal blend across the quad.",
    state: {
      red: 0.08,
      green: 0.1,
      blue: 0.22,
      alpha: 1,
      frequency: 0.5,
      contrast: 0.7,
      blend: 0.6,
    },
  },
  {
    label: "Cool matrix",
    description: "Lower contrast and stronger blue floor for a colder 4x4 texture.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.26,
      alpha: 1,
      frequency: 0.18,
      contrast: 0.34,
      blend: 0.42,
    },
  },
  {
    label: "Heat tiles",
    description: "Warmer clear color with higher checker contrast and diagonal intensity.",
    state: {
      red: 0.14,
      green: 0.08,
      blue: 0.08,
      alpha: 1,
      frequency: 0.84,
      contrast: 0.92,
      blend: 0.74,
    },
  },
  {
    label: "Glass texture",
    description: "Softer alpha and a quieter uploaded pattern for a muted texture surface.",
    state: {
      red: 0.12,
      green: 0.16,
      blue: 0.24,
      alpha: 0.72,
      frequency: 0.34,
      contrast: 0.28,
      blend: 0.32,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL texture grid scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current texture-grid viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default texture-grid scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "F / Shift+F", description: "Increase or decrease the texture phase." },
  { keys: "C / Shift+C", description: "Increase or decrease the checker contrast." },
  { keys: "N / Shift+N", description: "Increase or decrease the diagonal blend." },
  { keys: "Escape", description: "Reset to the default texture-grid scene." },
]

@Component({
  selector: "app-webgl-texture-grid-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-texture-grid.page.html",
  styleUrl: "./webgl-texture-grid.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlTextureGridPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.alpha)
  protected readonly frequency = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.frequency)
  protected readonly contrast = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.contrast)
  protected readonly blend = signal(DEFAULT_WEBGL_TEXTURE_GRID_SCENE.blend)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL texture grid route prepares a textured quad and a procedural RGBA upload.",
  )
  protected readonly highlights = [
    "First Phase 3 route that uploads and samples a real WebGL texture instead of relying only on buffers and uniforms",
    "Static quad geometry paired with a 4x4 RGBA texture rewritten from the current control state before each draw",
    "Reuses the shared WebGL program, texture, and binding helper path introduced across the Phase 3 routes",
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
    frequency: {
      value: () => this.frequency(),
      set: (value) => this.frequency.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    contrast: {
      value: () => this.contrast(),
      set: (value) => this.contrast.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    blend: {
      value: () => this.blend(),
      set: (value) => this.blend.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlTextureGridScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    frequency: this.frequency(),
    contrast: this.contrast(),
    blend: this.blend(),
  }))
  protected readonly summary = computed(() =>
    webGlTextureGridSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTextureGridClearColor(this.scene()) },
    { label: "Accent color", value: webGlTextureGridAccentColor(this.scene()) },
    { label: "Texture density", value: webGlTextureGridDensity(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlTextureGridScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL texture grid scene from the shared URL.")
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

      renderWebGlTextureGridScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a texture-backed WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_TEXTURE_GRID_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-texture-grid.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
        this.statusMessage.set("WebGL texture grid scene reset to the default preset.")
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
      case "f":
        event.preventDefault()
        stepNumericSignal(this.frequency, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the texture phase.")
        break
      case "c":
        event.preventDefault()
        stepNumericSignal(this.contrast, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the checker contrast.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.blend, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the diagonal blend.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
        this.statusMessage.set("WebGL texture grid scene reset to the default preset.")
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

    releaseWebGlTextureGridResources(runtime)
  }

  private applyScene(scene: WebGlTextureGridScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.frequency.set(clampChannel(scene.frequency))
    this.contrast.set(clampChannel(scene.contrast))
    this.blend.set(clampChannel(scene.blend))
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
