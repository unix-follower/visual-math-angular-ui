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
  DEFAULT_WEBGL_BLOOM_BLUR_SCENE,
  isWebGlBloomBlurScene,
  type WebGlBloomBlurScene,
  webGlBloomBlurAccentColor,
  webGlBloomBlurClearColor,
  webGlBloomBlurStageLabel,
  webGlBloomBlurSummary,
} from "./webgl-bloom-blur.model"
import {
  releaseWebGlBloomBlurResources,
  renderWebGlBloomBlurScene,
} from "./webgl-bloom-blur.renderer"

const WEBGL_BLOOM_BLUR_ROUTE_PATH = "/phase-3/webgl-bloom-blur"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Glow lift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blur", label: "Blur radius", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Bloom mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlBloomBlurScene>[] = [
  {
    label: "Halo glass",
    description: "Balanced blur radius with a softer deep-blue backdrop.",
    state: { red: 0.05, green: 0.08, blue: 0.18, alpha: 1, glow: 0.74, blur: 0.36, mix: 0.64 },
  },
  {
    label: "Warm spill",
    description: "Hotter background and a stronger bloom composite.",
    state: { red: 0.12, green: 0.08, blue: 0.06, alpha: 1, glow: 0.92, blur: 0.48, mix: 0.82 },
  },
  {
    label: "Ice mist",
    description: "Cool clear color with a wider but quieter blur.",
    state: { red: 0.04, green: 0.1, blue: 0.24, alpha: 1, glow: 0.42, blur: 0.68, mix: 0.38 },
  },
  {
    label: "Soft relay",
    description: "Reduced alpha and restrained glow for a lower-energy pass pair.",
    state: { red: 0.08, green: 0.12, blue: 0.18, alpha: 0.78, glow: 0.34, blur: 0.24, mix: 0.26 },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL bloom-blur scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current bloom-blur viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default bloom-blur scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the glow lift." },
  { keys: "S / Shift+S", description: "Increase or decrease the blur radius." },
  { keys: "N / Shift+N", description: "Increase or decrease the bloom mix." },
  { keys: "Escape", description: "Reset to the default bloom-blur scene." },
]

@Component({
  selector: "app-webgl-bloom-blur-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-bloom-blur.page.html",
  styleUrl: "./webgl-bloom-blur.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlBloomBlurPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.alpha)
  protected readonly glow = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.glow)
  protected readonly blur = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.blur)
  protected readonly mix = signal(DEFAULT_WEBGL_BLOOM_BLUR_SCENE.mix)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL bloom-blur route prepares an offscreen target and a blur-composite fullscreen pass.",
  )
  protected readonly highlights = [
    "Second Phase 3 multi-pass route, using emissive geometry first and a blur-aware composite fragment shader second",
    "Extracts the fullscreen textured-quad setup into a shared helper so later post-process routes can reuse the same presentation surface",
    "Keeps the same route-local model, renderer, workbench, share, export, and teardown pattern established across the Phase 3 WebGL surface",
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
    blur: {
      value: () => this.blur(),
      set: (value) => this.blur.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    mix: {
      value: () => this.mix(),
      set: (value) => this.mix.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlBloomBlurScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    glow: this.glow(),
    blur: this.blur(),
    mix: this.mix(),
  }))
  protected readonly summary = computed(() =>
    webGlBloomBlurSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlBloomBlurClearColor(this.scene()) },
    { label: "Accent color", value: webGlBloomBlurAccentColor(this.scene()) },
    { label: "Stages", value: webGlBloomBlurStageLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlBloomBlurScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL bloom-blur scene from the shared URL.")
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

      renderWebGlBloomBlurScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a blur-composite WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_BLOOM_BLUR_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-bloom-blur.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)
        this.statusMessage.set("WebGL bloom-blur scene reset to the default preset.")
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
        this.statusMessage.set("Updated the glow lift.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.blur, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the blur radius.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.mix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the bloom mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)
        this.statusMessage.set("WebGL bloom-blur scene reset to the default preset.")
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

    releaseWebGlBloomBlurResources(runtime)
  }

  private applyScene(scene: WebGlBloomBlurScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.glow.set(clampChannel(scene.glow))
    this.blur.set(clampChannel(scene.blur))
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
