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
  DEFAULT_WEBGL_DUAL_PASS_SCENE,
  isWebGlDualPassScene,
  type WebGlDualPassScene,
  webGlDualPassAccentColor,
  webGlDualPassClearColor,
  webGlDualPassStageLabel,
  webGlDualPassSummary,
} from "./webgl-dual-pass.model"
import { releaseWebGlDualPassResources, renderWebGlDualPassScene } from "./webgl-dual-pass.renderer"

const WEBGL_DUAL_PASS_ROUTE_PATH = "/phase-3/webgl-dual-pass"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Glow mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "skew", label: "First-pass skew", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlDualPassScene>[] = [
  {
    label: "Signal bloom",
    description: "Balanced first-pass glow and second-pass composite mix.",
    state: { red: 0.06, green: 0.1, blue: 0.2, alpha: 1, glow: 0.68, skew: 0.42, mix: 0.58 },
  },
  {
    label: "Cold shear",
    description: "Cooler clear color with a stronger geometric skew in the offscreen pass.",
    state: { red: 0.04, green: 0.08, blue: 0.24, alpha: 1, glow: 0.22, skew: 0.84, mix: 0.34 },
  },
  {
    label: "Heat composite",
    description: "Warmer backdrop and stronger second-pass composite lift.",
    state: { red: 0.14, green: 0.08, blue: 0.08, alpha: 1, glow: 0.88, skew: 0.2, mix: 0.82 },
  },
  {
    label: "Glass relay",
    description: "Softer alpha and quieter two-pass composition.",
    state: { red: 0.1, green: 0.16, blue: 0.24, alpha: 0.72, glow: 0.44, skew: 0.36, mix: 0.28 },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL dual-pass scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current dual-pass viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default dual-pass scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the glow mix." },
  { keys: "S / Shift+S", description: "Increase or decrease the first-pass skew." },
  { keys: "N / Shift+N", description: "Increase or decrease the composite mix." },
  { keys: "Escape", description: "Reset to the default dual-pass scene." },
]

@Component({
  selector: "app-webgl-dual-pass-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-dual-pass.page.html",
  styleUrl: "./webgl-dual-pass.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlDualPassPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.alpha)
  protected readonly glow = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.glow)
  protected readonly skew = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.skew)
  protected readonly mix = signal(DEFAULT_WEBGL_DUAL_PASS_SCENE.mix)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL dual-pass route prepares an offscreen framebuffer and a composite pass.",
  )
  protected readonly highlights = [
    "First Phase 3 route using a true offscreen pass before a second composite pass to the presentation canvas",
    "Pass one renders glowing geometry into a framebuffer-backed texture and pass two samples that texture on a fullscreen quad",
    "Reuses the shared WebGL program, buffer, binding, and texture upload helpers introduced by the earlier Phase 3 routes",
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
    skew: {
      value: () => this.skew(),
      set: (value) => this.skew.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    mix: {
      value: () => this.mix(),
      set: (value) => this.mix.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlDualPassScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    glow: this.glow(),
    skew: this.skew(),
    mix: this.mix(),
  }))
  protected readonly summary = computed(() =>
    webGlDualPassSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlDualPassClearColor(this.scene()) },
    { label: "Accent color", value: webGlDualPassAccentColor(this.scene()) },
    { label: "Stages", value: webGlDualPassStageLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlDualPassScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL dual-pass scene from the shared URL.")
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

      renderWebGlDualPassScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a multipass WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_DUAL_PASS_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-dual-pass.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)
        this.statusMessage.set("WebGL dual-pass scene reset to the default preset.")
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
        this.statusMessage.set("Updated the glow mix.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.skew, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the first-pass skew.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.mix, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the composite mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)
        this.statusMessage.set("WebGL dual-pass scene reset to the default preset.")
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

    releaseWebGlDualPassResources(runtime)
  }

  private applyScene(scene: WebGlDualPassScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.glow.set(clampChannel(scene.glow))
    this.skew.set(clampChannel(scene.skew))
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
