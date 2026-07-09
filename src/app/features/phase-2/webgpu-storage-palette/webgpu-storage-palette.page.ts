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
  DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
  isWebGpuStoragePaletteScene,
  storagePaletteClearColor,
  storagePalettePeakColor,
  storagePaletteSpread,
  type WebGpuStoragePaletteScene,
  webGpuStoragePaletteSummary,
} from "./webgpu-storage-palette.model"
import {
  releaseWebGpuStoragePaletteResources,
  renderWebGpuStoragePaletteScene,
} from "./webgpu-storage-palette.renderer"

const WEBGPU_STORAGE_PALETTE_ROUTE_PATH = "/phase-2/webgpu-storage-palette"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Palette warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "contrast", label: "Palette contrast", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "balance", label: "Palette balance", min: -1, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Glow lift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuStoragePaletteScene>[] = [
  {
    label: "Lantern",
    description: "Warm palette with balanced contrast and a mild positive color shift.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      warmth: 0.62,
      contrast: 0.74,
      balance: 0.12,
      glow: 0.68,
    },
  },
  {
    label: "Cool glass",
    description: "Lower warmth and higher blue emphasis for a colder storage-driven palette.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      warmth: 0.24,
      contrast: 0.52,
      balance: -0.22,
      glow: 0.38,
    },
  },
  {
    label: "Signal burst",
    description: "Higher contrast and glow for stronger vertex-color separation.",
    state: {
      red: 0.12,
      green: 0.1,
      blue: 0.12,
      alpha: 1,
      warmth: 0.78,
      contrast: 0.94,
      balance: 0.28,
      glow: 0.86,
    },
  },
  {
    label: "Muted panel",
    description: "Softer alpha and restrained palette spread with a cooler balance.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.68,
      warmth: 0.34,
      contrast: 0.28,
      balance: -0.14,
      glow: 0.24,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized storage-palette WebGPU scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current storage-palette viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default storage-palette scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the palette warmth." },
  { keys: "C / Shift+C", description: "Increase or decrease the palette contrast." },
  { keys: "L / Shift+L", description: "Increase or decrease the palette balance." },
  { keys: "N / Shift+N", description: "Increase or decrease the glow lift." },
  { keys: "Escape", description: "Reset to the default storage-palette scene." },
]

@Component({
  selector: "app-webgpu-storage-palette-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgpu-storage-palette.page.html",
  styleUrl: "./webgpu-storage-palette.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGpuStoragePalettePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.alpha)
  protected readonly warmth = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.warmth)
  protected readonly contrast = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.contrast)
  protected readonly balance = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.balance)
  protected readonly glow = signal(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE.glow)
  protected readonly runtime = signal<WebGpuCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the storage-palette route checks browser support and prepares shader-readable storage data.",
  )
  protected readonly highlights = [
    "Sixth Angular Phase 2 route introducing a real storage buffer for shader-read palette data",
    "Static vertex mesh colored from a six-entry GPU storage palette instead of per-vertex color attributes",
    "Same shared WebGPU runtime helpers, bind-group caching, export actions, and route-local teardown pattern",
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
    contrast: {
      value: () => this.contrast(),
      set: (value) => this.contrast.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    balance: {
      value: () => this.balance(),
      set: (value) => this.balance.set(clampBalance(value)),
      displayValue: (value) => value.toFixed(2),
    },
    glow: {
      value: () => this.glow(),
      set: (value) => this.glow.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGpuStoragePaletteScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    warmth: this.warmth(),
    contrast: this.contrast(),
    balance: this.balance(),
    glow: this.glow(),
  }))
  protected readonly summary = computed(() =>
    webGpuStoragePaletteSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.format),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Canvas format", value: this.runtime()?.format ?? "Unavailable" },
    { label: "Clear color", value: storagePaletteClearColor(this.scene()) },
    { label: "Peak color", value: storagePalettePeakColor(this.scene()) },
    { label: "Palette spread", value: storagePaletteSpread(this.scene()) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGpuStoragePaletteScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the storage-palette scene from the shared URL.")
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

      renderWebGpuStoragePaletteScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a storage-buffer WebGPU draw using ${runtime.format}.`)
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
          buildWorkbenchShareUrl(WEBGPU_STORAGE_PALETTE_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgpu-storage-palette.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)
        this.statusMessage.set("Storage-palette scene reset to the default preset.")
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
        this.statusMessage.set("Updated the palette warmth.")
        break
      case "c":
        event.preventDefault()
        stepNumericSignal(this.contrast, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the palette contrast.")
        break
      case "l":
        event.preventDefault()
        stepNumericSignal(this.balance, event.shiftKey ? -0.08 : 0.08, clampBalance)
        this.statusMessage.set("Updated the palette balance.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.glow, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the glow lift.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)
        this.statusMessage.set("Storage-palette scene reset to the default preset.")
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

    releaseWebGpuStoragePaletteResources(runtime)
    runtime.context.unconfigure?.()
    runtime.device.destroy?.()
  }

  private applyScene(scene: WebGpuStoragePaletteScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.warmth.set(clampChannel(scene.warmth))
    this.contrast.set(clampChannel(scene.contrast))
    this.balance.set(clampBalance(scene.balance))
    this.glow.set(clampChannel(scene.glow))
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

function clampBalance(value: number): number {
  return Math.min(1, Math.max(-1, Number(value.toFixed(2))))
}
