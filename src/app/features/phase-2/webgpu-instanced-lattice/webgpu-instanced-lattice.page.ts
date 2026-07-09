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
  DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
  instancedLatticeAccentColor,
  instancedLatticeClearColor,
  instancedLatticeStageLabel,
  isWebGpuInstancedLatticeScene,
  type WebGpuInstancedLatticeScene,
  webGpuInstancedLatticeSummary,
} from "./webgpu-instanced-lattice.model"
import {
  releaseWebGpuInstancedLatticeResources,
  renderWebGpuInstancedLatticeScene,
} from "./webgpu-instanced-lattice.renderer"

const WEBGPU_INSTANCED_LATTICE_ROUTE_PATH = "/phase-2/webgpu-instanced-lattice"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "spacing", label: "Instance spacing", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "scale", label: "Mesh scale", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "tilt", label: "Vertical tilt", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuInstancedLatticeScene>[] = [
  {
    label: "Balanced grid",
    description: "Default instanced lattice with moderate spacing and scale.",
    state: { red: 0.06, green: 0.1, blue: 0.18, alpha: 1, spacing: 0.48, scale: 0.56, tilt: 0.34 },
  },
  {
    label: "Tight band",
    description: "Closer instance placement with taller, denser triangles.",
    state: { red: 0.04, green: 0.08, blue: 0.2, alpha: 1, spacing: 0.22, scale: 0.78, tilt: 0.18 },
  },
  {
    label: "Wide relay",
    description: "Broader spacing and flatter instance geometry.",
    state: { red: 0.08, green: 0.12, blue: 0.16, alpha: 1, spacing: 0.84, scale: 0.3, tilt: 0.62 },
  },
  {
    label: "Glass rake",
    description: "Lower alpha and a stronger alternating vertical offset.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.22,
      alpha: 0.74,
      spacing: 0.54,
      scale: 0.42,
      tilt: 0.82,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized instanced-lattice scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current instanced-lattice viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default instanced-lattice scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the instance spacing." },
  { keys: "M / Shift+M", description: "Increase or decrease the mesh scale." },
  { keys: "T / Shift+T", description: "Increase or decrease the vertical tilt." },
  { keys: "Escape", description: "Reset to the default instanced-lattice scene." },
]

@Component({
  selector: "app-webgpu-instanced-lattice-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-instanced-lattice.page.html",
  styleUrl: "./webgpu-instanced-lattice.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuInstancedLatticePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.alpha)
  protected readonly spacing = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.spacing)
  protected readonly scale = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.scale)
  protected readonly tilt = signal(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE.tilt)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the instanced-lattice route checks browser support and prepares mesh plus instance buffers.",
  )
  protected readonly highlights = [
    "Eleventh Angular Phase 2 route introducing true instanced rendering from one shared mesh",
    "A single triangle mesh is reused across five per-instance records with unique offsets, scales, and colors",
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
    spacing: {
      value: () => this.spacing(),
      set: (value) => this.spacing.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    scale: {
      value: () => this.scale(),
      set: (value) => this.scale.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    tilt: {
      value: () => this.tilt(),
      set: (value) => this.tilt.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuInstancedLatticeScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    spacing: this.spacing(),
    scale: this.scale(),
    tilt: this.tilt(),
  }))
  protected readonly summary = computed(() =>
    webGpuInstancedLatticeSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: instancedLatticeClearColor(this.scene()) },
    { label: "Accent color", value: instancedLatticeAccentColor(this.scene()) },
    { label: "Draw mode", value: instancedLatticeStageLabel() },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuInstancedLatticeScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the instanced-lattice scene from the shared URL.")
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

      renderWebGpuInstancedLatticeScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted an instanced WebGPU draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_INSTANCED_LATTICE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-instanced-lattice.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)
        this.statusMessage.set("Instanced-lattice scene reset to the default preset.")
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
        stepNumericSignal(this.spacing, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the instance spacing.")
        break
      case "m":
        event.preventDefault()
        stepNumericSignal(this.scale, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the mesh scale.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.tilt, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the vertical tilt.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)
        this.statusMessage.set("Instanced-lattice scene reset to the default preset.")
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

    releaseWebGpuInstancedLatticeResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuInstancedLatticeScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.spacing.set(clampChannel(scene.spacing))
    this.scale.set(clampChannel(scene.scale))
    this.tilt.set(clampChannel(scene.tilt))
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
