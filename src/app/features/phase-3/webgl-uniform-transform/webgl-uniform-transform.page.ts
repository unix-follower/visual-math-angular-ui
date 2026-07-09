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
  DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
  isWebGlUniformTransformScene,
  type WebGlUniformTransformScene,
  webGlUniformTransformArea,
  webGlUniformTransformClearColor,
  webGlUniformTransformPeakColor,
  webGlUniformTransformSummary,
  webGlUniformTransformTranslation,
} from "./webgl-uniform-transform.model"
import {
  releaseWebGlUniformTransformResources,
  renderWebGlUniformTransformScene,
} from "./webgl-uniform-transform.renderer"

const WEBGL_UNIFORM_TRANSFORM_ROUTE_PATH = "/phase-3/webgl-uniform-transform"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "scale", label: "Scale", min: 0.4, max: 1.2, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "offsetX", label: "Offset X", min: -0.45, max: 0.45, step: 0.01 },
  { kind: "range", id: "offsetY", label: "Offset Y", min: -0.45, max: 0.45, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlUniformTransformScene>[] = [
  {
    label: "Card tilt",
    description: "Balanced transform showing rotation, slight offset, and warm accent blending.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      scale: 0.82,
      rotation: 14,
      offsetX: 0.06,
      offsetY: -0.04,
      accent: 0.72,
    },
  },
  {
    label: "Aligned",
    description: "Centered mesh with a cooler clear color and lighter accent mix.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      scale: 0.94,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      accent: 0.4,
    },
  },
  {
    label: "Orbit corner",
    description: "Stronger translation and rotation to emphasize uniform-driven movement.",
    state: {
      red: 0.1,
      green: 0.12,
      blue: 0.14,
      alpha: 1,
      scale: 0.72,
      rotation: -28,
      offsetX: -0.18,
      offsetY: 0.16,
      accent: 0.88,
    },
  },
  {
    label: "Glass frame",
    description: "Softer alpha and restrained accent blending with a smaller footprint.",
    state: {
      red: 0.08,
      green: 0.16,
      blue: 0.24,
      alpha: 0.68,
      scale: 0.7,
      rotation: 10,
      offsetX: 0.1,
      offsetY: 0.08,
      accent: 0.32,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL uniform transform scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL uniform transform viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL uniform transform scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the scale." },
  { keys: "T / Shift+T", description: "Increase or decrease the rotation." },
  { keys: "X / Shift+X", description: "Increase or decrease the horizontal offset." },
  { keys: "Y / Shift+Y", description: "Increase or decrease the vertical offset." },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  { keys: "Escape", description: "Reset to the default WebGL uniform transform scene." },
]

@Component({
  selector: "app-webgl-uniform-transform-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-uniform-transform.page.html",
  styleUrl: "./webgl-uniform-transform.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlUniformTransformPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.alpha)
  protected readonly scale = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.scale)
  protected readonly rotation = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.rotation)
  protected readonly offsetX = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.offsetX)
  protected readonly offsetY = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.offsetY)
  protected readonly accent = signal(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE.accent)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL viewport prepares uniform-driven transforms without rewriting GPU vertex data.",
  )
  protected readonly highlights = [
    "Second geometry-focused Phase 3 route moving transform updates out of buffer uploads and into WebGL uniforms",
    "Static panel mesh kept on the GPU while scale, rotation, translation, and accent change through uniform writes",
    "Reuses the extracted shared WebGL program and buffer helpers introduced from the previous route",
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
    scale: {
      value: () => this.scale(),
      set: (value) => this.scale.set(clampScale(value)),
      displayValue: (value) => value.toFixed(2),
    },
    rotation: {
      value: () => this.rotation(),
      set: (value) => this.rotation.set(clampRotation(value)),
      displayValue: (value) => value.toFixed(0),
    },
    offsetX: {
      value: () => this.offsetX(),
      set: (value) => this.offsetX.set(clampOffset(value)),
      displayValue: (value) => value.toFixed(2),
    },
    offsetY: {
      value: () => this.offsetY(),
      set: (value) => this.offsetY.set(clampOffset(value)),
      displayValue: (value) => value.toFixed(2),
    },
    accent: {
      value: () => this.accent(),
      set: (value) => this.accent.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlUniformTransformScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    scale: this.scale(),
    rotation: this.rotation(),
    offsetX: this.offsetX(),
    offsetY: this.offsetY(),
    accent: this.accent(),
  }))
  protected readonly summary = computed(() =>
    webGlUniformTransformSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlUniformTransformClearColor(this.scene()) },
    { label: "Peak color", value: webGlUniformTransformPeakColor(this.scene()) },
    { label: "Transform area", value: webGlUniformTransformArea(this.scene()) },
    { label: "Translation", value: webGlUniformTransformTranslation(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlUniformTransformScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL uniform transform scene from the shared URL.")
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

      renderWebGlUniformTransformScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a WebGL uniform-transform draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_UNIFORM_TRANSFORM_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-uniform-transform.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)
        this.statusMessage.set("WebGL uniform transform scene reset to the default preset.")
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
        stepNumericSignal(this.scale, event.shiftKey ? -0.05 : 0.05, clampScale)
        this.statusMessage.set("Updated the transform scale.")
        break
      case "t":
        event.preventDefault()
        stepNumericSignal(this.rotation, event.shiftKey ? -6 : 6, clampRotation)
        this.statusMessage.set("Updated the transform rotation.")
        break
      case "x":
        event.preventDefault()
        stepNumericSignal(this.offsetX, event.shiftKey ? -0.04 : 0.04, clampOffset)
        this.statusMessage.set("Updated the horizontal offset.")
        break
      case "y":
        event.preventDefault()
        stepNumericSignal(this.offsetY, event.shiftKey ? -0.04 : 0.04, clampOffset)
        this.statusMessage.set("Updated the vertical offset.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.accent, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the accent mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)
        this.statusMessage.set("WebGL uniform transform scene reset to the default preset.")
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

    releaseWebGlUniformTransformResources(runtime)
  }

  private applyScene(scene: WebGlUniformTransformScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.scale.set(clampScale(scene.scale))
    this.rotation.set(clampRotation(scene.rotation))
    this.offsetX.set(clampOffset(scene.offsetX))
    this.offsetY.set(clampOffset(scene.offsetY))
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
  return Math.min(1, Math.max(0, Number(value.toFixed(2))))
}

function clampScale(value: number): number {
  return Math.min(1.2, Math.max(0.4, Number(value.toFixed(2))))
}

function clampRotation(value: number): number {
  return Math.min(180, Math.max(-180, Number(value.toFixed(0))))
}

function clampOffset(value: number): number {
  return Math.min(0.45, Math.max(-0.45, Number(value.toFixed(2))))
}
