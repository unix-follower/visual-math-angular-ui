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
  hasWebGpuSupport,
  initializeWebGpuCanvas,
  type WebGpuCanvasRuntime,
} from "../../../shared/webgpu/webgpu-bootstrap"

import {
  DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
  indirectRibbonAccentColor,
  indirectRibbonClearColor,
  indirectRibbonStageLabel,
  isWebGpuIndirectRibbonScene,
  type WebGpuIndirectRibbonScene,
  webGpuIndirectRibbonSummary,
} from "./webgpu-indirect-ribbon.model"
import {
  releaseWebGpuIndirectRibbonResources,
  renderWebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.renderer"

const WEBGPU_INDIRECT_RIBBON_ROUTE_PATH = "/phase-2/webgpu-indirect-ribbon"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "span", label: "Ribbon span", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "taper", label: "Ribbon taper", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "echo", label: "Echo count bias", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuIndirectRibbonScene>[] = [
  {
    label: "Balanced ribbon",
    description: "Default indirect draw with a broad span and moderate taper.",
    state: { red: 0.05, green: 0.1, blue: 0.18, alpha: 1, span: 0.56, taper: 0.42, echo: 0.34 },
  },
  {
    label: "Wide echo",
    description: "Broader ribbon and more indirect instances from the draw buffer.",
    state: { red: 0.04, green: 0.08, blue: 0.2, alpha: 1, span: 0.84, taper: 0.24, echo: 0.88 },
  },
  {
    label: "Needle trace",
    description: "Narrower ribbon with sharper taper and quieter indirect repeats.",
    state: { red: 0.08, green: 0.1, blue: 0.16, alpha: 1, span: 0.26, taper: 0.82, echo: 0.14 },
  },
  {
    label: "Glass wake",
    description: "Lower alpha and a softer indirect ribbon profile.",
    state: { red: 0.1, green: 0.16, blue: 0.24, alpha: 0.74, span: 0.42, taper: 0.34, echo: 0.62 },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized indirect-ribbon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current indirect-ribbon viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default indirect-ribbon scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the ribbon span." },
  { keys: "T / Shift+T", description: "Increase or decrease the ribbon taper." },
  { keys: "E / Shift+E", description: "Increase or decrease the indirect echo count." },
  { keys: "Escape", description: "Reset to the default indirect-ribbon scene." },
]

@Component({
  selector: "app-webgpu-indirect-ribbon-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-indirect-ribbon.page.html",
  styleUrl: "./webgpu-indirect-ribbon.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuIndirectRibbonPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.alpha)
  protected readonly span = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.span)
  protected readonly taper = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.taper)
  protected readonly echo = signal(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE.echo)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the indirect-ribbon route checks browser support and prepares a draw buffer for indirect submission.",
  )
  protected readonly highlights = [
    "Twelfth Angular Phase 2 route introducing an indirect draw buffer instead of direct draw arguments",
    "The render pass pulls vertexCount and instanceCount from GPU buffer data through drawIndirect",
    "Same guarded WebGPU bootstrap, runtime-scoped resource cache, export flow, and explicit teardown pattern",
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
    span: {
      value: () => this.span(),
      set: (value) => this.span.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    taper: {
      value: () => this.taper(),
      set: (value) => this.taper.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    echo: {
      value: () => this.echo(),
      set: (value) => this.echo.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuIndirectRibbonScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    span: this.span(),
    taper: this.taper(),
    echo: this.echo(),
  }))
  protected readonly summary = computed(() =>
    webGpuIndirectRibbonSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: indirectRibbonClearColor(this.scene()) },
    { label: "Accent color", value: indirectRibbonAccentColor(this.scene()) },
    { label: "Draw path", value: indirectRibbonStageLabel(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuIndirectRibbonScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the indirect-ribbon scene from the shared URL.")
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
      void this.initializeRuntime(canvasRef.nativeElement)
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

      renderWebGpuIndirectRibbonScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted an indirect WebGPU draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_INDIRECT_RIBBON_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-indirect-ribbon.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
        this.statusMessage.set("Indirect-ribbon scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        stepNumericSignal(this.span, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the ribbon span.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.taper, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the ribbon taper.")
        break
      case "e":
        event.preventDefault()
        stepNumericSignal(this.echo, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the indirect echo count.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
        this.statusMessage.set("Indirect-ribbon scene reset to the default preset.")
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

    releaseWebGpuIndirectRibbonResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuIndirectRibbonScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.span.set(clampChannel(scene.span))
    this.taper.set(clampChannel(scene.taper))
    this.echo.set(clampChannel(scene.echo))
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

  private async initializeRuntime(canvas: HTMLCanvasElement): Promise<void> {
    const setup = await initializeWebGpuCanvas(canvas)
    if (!setup.ok) {
      this.runtimeState.set("unsupported")
      this.statusMessage.set(setup.reason)
      return
    }

    this.runtime.set(setup.runtime)
    this.runtimeState.set("ready")
    this.statusMessage.set(`WebGPU adapter acquired with ${setup.runtime.format}.`)
  }
}

function clampChannel(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}
