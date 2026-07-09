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
  DEFAULT_WEBGL_DEPTH_PRISM_SCENE,
  isWebGlDepthPrismScene,
  type WebGlDepthPrismScene,
  webGlDepthPrismAccentColor,
  webGlDepthPrismCameraLabel,
  webGlDepthPrismClearColor,
  webGlDepthPrismOcclusionLabel,
  webGlDepthPrismSummary,
} from "./webgl-depth-prism.model"
import {
  releaseWebGlDepthPrismResources,
  renderWebGlDepthPrismScene,
} from "./webgl-depth-prism.renderer"

const WEBGL_DEPTH_PRISM_ROUTE_PATH = "/phase-3/webgl-depth-prism"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "yaw", label: "Camera yaw", min: -80, max: 80, step: 1 },
  { kind: "range", id: "pitch", label: "Camera pitch", min: -50, max: 50, step: 1 },
  { kind: "range", id: "distance", label: "Camera distance", min: 2.2, max: 6.8, step: 0.1 },
  { kind: "range", id: "prismLift", label: "Prism lift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "prismSpread", label: "Prism spread", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlDepthPrismScene>[] = [
  {
    label: "Gallery stack",
    description: "Balanced orbit and lift so front faces start to occlude the rear edges.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      yaw: 24,
      pitch: 18,
      distance: 4.4,
      prismLift: 0.46,
      prismSpread: 0.58,
      accent: 0.42,
    },
  },
  {
    label: "Overhang",
    description: "Higher pitch and lift to emphasize top-face occlusion.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      yaw: -18,
      pitch: 32,
      distance: 4.8,
      prismLift: 0.82,
      prismSpread: 0.42,
      accent: 0.36,
    },
  },
  {
    label: "Narrow canyon",
    description: "Lower spread and longer distance to compress the prism stack.",
    state: {
      red: 0.05,
      green: 0.07,
      blue: 0.12,
      alpha: 1,
      yaw: 38,
      pitch: 12,
      distance: 5.8,
      prismLift: 0.54,
      prismSpread: 0.22,
      accent: 0.5,
    },
  },
  {
    label: "Close cut",
    description: "Closer lens with wider spread for heavier side-face contrast.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 0.92,
      yaw: 12,
      pitch: 8,
      distance: 3.3,
      prismLift: 0.34,
      prismSpread: 0.86,
      accent: 0.64,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized depth-prism scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current depth-prism viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default depth-prism scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "Y / Shift+Y", description: "Increase or decrease camera yaw." },
  { keys: "P / Shift+P", description: "Increase or decrease camera pitch." },
  { keys: "D / Shift+D", description: "Increase or decrease camera distance." },
  { keys: "L / Shift+L", description: "Increase or decrease prism lift." },
  { keys: "S / Shift+S", description: "Increase or decrease prism spread." },
  { keys: "N / Shift+N", description: "Increase or decrease accent mix." },
  { keys: "Escape", description: "Reset to the default depth-prism scene." },
]

@Component({
  selector: "app-webgl-depth-prism-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-depth-prism.page.html",
  styleUrl: "./webgl-depth-prism.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlDepthPrismPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.alpha)
  protected readonly yaw = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.yaw)
  protected readonly pitch = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.pitch)
  protected readonly distance = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.distance)
  protected readonly prismLift = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.prismLift)
  protected readonly prismSpread = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.prismSpread)
  protected readonly accent = signal(DEFAULT_WEBGL_DEPTH_PRISM_SCENE.accent)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL depth-prism route prepares a solid prism stack with depth testing enabled.",
  )
  protected readonly highlights = [
    "First Phase 3 route that relies on depth testing for correct face occlusion instead of painter-style ordering",
    "Moves beyond layered panels by drawing solid prism faces with normals, camera orbit, and perspective projection",
    "Keeps the route-local workbench contract while adding actual hidden-surface behavior to the Angular WebGL surface",
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
    yaw: {
      value: () => this.yaw(),
      set: (value) => this.yaw.set(clampYaw(value)),
      displayValue: (value) => `${Math.round(value)}°`,
    },
    pitch: {
      value: () => this.pitch(),
      set: (value) => this.pitch.set(clampPitch(value)),
      displayValue: (value) => `${Math.round(value)}°`,
    },
    distance: {
      value: () => this.distance(),
      set: (value) => this.distance.set(clampDistance(value)),
      displayValue: (value) => value.toFixed(1),
    },
    prismLift: {
      value: () => this.prismLift(),
      set: (value) => this.prismLift.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    prismSpread: {
      value: () => this.prismSpread(),
      set: (value) => this.prismSpread.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    accent: {
      value: () => this.accent(),
      set: (value) => this.accent.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlDepthPrismScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    yaw: this.yaw(),
    pitch: this.pitch(),
    distance: this.distance(),
    prismLift: this.prismLift(),
    prismSpread: this.prismSpread(),
    accent: this.accent(),
  }))
  protected readonly summary = computed(() =>
    webGlDepthPrismSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlDepthPrismClearColor(this.scene()) },
    { label: "Accent color", value: webGlDepthPrismAccentColor(this.scene()) },
    { label: "Camera", value: webGlDepthPrismCameraLabel(this.scene()) },
    { label: "Occlusion", value: webGlDepthPrismOcclusionLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlDepthPrismScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL depth-prism scene from the shared URL.")
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

      renderWebGlDepthPrismScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a depth-tested prism draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_DEPTH_PRISM_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-depth-prism.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
        this.statusMessage.set("WebGL depth-prism scene reset to the default preset.")
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
      case "y":
        event.preventDefault()
        stepNumericSignal(this.yaw, event.shiftKey ? -4 : 4, clampYaw)
        this.statusMessage.set("Updated camera yaw.")
        break
      case "p":
        event.preventDefault()
        stepNumericSignal(this.pitch, event.shiftKey ? -3 : 3, clampPitch)
        this.statusMessage.set("Updated camera pitch.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.distance, event.shiftKey ? -0.2 : 0.2, clampDistance)
        this.statusMessage.set("Updated camera distance.")
        break
      case "l":
        event.preventDefault()
        stepNumericSignal(this.prismLift, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated prism lift.")
        break
      case "s":
        event.preventDefault()
        stepNumericSignal(this.prismSpread, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated prism spread.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.accent, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated accent mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
        this.statusMessage.set("WebGL depth-prism scene reset to the default preset.")
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

    releaseWebGlDepthPrismResources(runtime)
  }

  private applyScene(scene: WebGlDepthPrismScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.yaw.set(clampYaw(scene.yaw))
    this.pitch.set(clampPitch(scene.pitch))
    this.distance.set(clampDistance(scene.distance))
    this.prismLift.set(clampChannel(scene.prismLift))
    this.prismSpread.set(clampChannel(scene.prismSpread))
    this.accent.set(clampChannel(scene.accent))
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
  return Math.min(1, Math.max(0, value))
}

function clampYaw(value: number): number {
  return Math.min(80, Math.max(-80, value))
}

function clampPitch(value: number): number {
  return Math.min(50, Math.max(-50, value))
}

function clampDistance(value: number): number {
  return Math.min(6.8, Math.max(2.2, value))
}
