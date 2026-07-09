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
  DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
  isWebGlPerspectiveCameraScene,
  type WebGlPerspectiveCameraScene,
  webGlPerspectiveCameraAccentColor,
  webGlPerspectiveCameraAngles,
  webGlPerspectiveCameraClearColor,
  webGlPerspectiveCameraDepthLabel,
  webGlPerspectiveCameraLens,
  webGlPerspectiveCameraSummary,
} from "./webgl-perspective-camera.model"
import {
  releaseWebGlPerspectiveCameraResources,
  renderWebGlPerspectiveCameraScene,
} from "./webgl-perspective-camera.renderer"

const WEBGL_PERSPECTIVE_CAMERA_ROUTE_PATH = "/phase-3/webgl-perspective-camera"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "yaw", label: "Camera yaw", min: -75, max: 75, step: 1 },
  { kind: "range", id: "pitch", label: "Camera pitch", min: -55, max: 55, step: 1 },
  { kind: "range", id: "distance", label: "Camera distance", min: 2, max: 7, step: 0.1 },
  { kind: "range", id: "fov", label: "Field of view", min: 30, max: 90, step: 1 },
  { kind: "range", id: "depth", label: "Layer depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlPerspectiveCameraScene>[] = [
  {
    label: "Gallery tilt",
    description: "Moderate yaw and pitch to show the three panel depths.",
    state: {
      red: 0.04,
      green: 0.07,
      blue: 0.12,
      alpha: 1,
      yaw: 22,
      pitch: 14,
      distance: 3.8,
      fov: 58,
      depth: 0.56,
      accent: 0.62,
    },
  },
  {
    label: "Wide orbit",
    description: "Broader lens and shallower pitch for a more cinematic spread.",
    state: {
      red: 0.02,
      green: 0.06,
      blue: 0.14,
      alpha: 1,
      yaw: 34,
      pitch: 8,
      distance: 4.6,
      fov: 72,
      depth: 0.78,
      accent: 0.44,
    },
  },
  {
    label: "Close inspection",
    description: "Tighter lens with a nearer camera and stronger accent lift.",
    state: {
      red: 0.08,
      green: 0.08,
      blue: 0.1,
      alpha: 1,
      yaw: -18,
      pitch: 22,
      distance: 2.6,
      fov: 44,
      depth: 0.42,
      accent: 0.82,
    },
  },
  {
    label: "Flat study",
    description: "Reduced depth and a more front-on camera for comparison.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.16,
      alpha: 0.86,
      yaw: 0,
      pitch: 4,
      distance: 4.2,
      fov: 50,
      depth: 0.18,
      accent: 0.28,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized perspective-camera scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current perspective-camera viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default perspective-camera scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "Y / Shift+Y", description: "Increase or decrease the camera yaw." },
  { keys: "P / Shift+P", description: "Increase or decrease the camera pitch." },
  { keys: "D / Shift+D", description: "Increase or decrease the camera distance." },
  { keys: "F / Shift+F", description: "Increase or decrease the field of view." },
  { keys: "Z / Shift+Z", description: "Increase or decrease the layer depth spread." },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  { keys: "Escape", description: "Reset to the default perspective-camera scene." },
]

@Component({
  selector: "app-webgl-perspective-camera-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./webgl-perspective-camera.page.html",
  styleUrl: "./webgl-perspective-camera.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebGlPerspectiveCameraPageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)
  private initializationStarted = false

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly red = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.red)
  protected readonly green = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.green)
  protected readonly blue = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.blue)
  protected readonly alpha = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.alpha)
  protected readonly yaw = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.yaw)
  protected readonly pitch = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.pitch)
  protected readonly distance = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.distance)
  protected readonly fov = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.fov)
  protected readonly depth = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.depth)
  protected readonly accent = signal(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE.accent)
  protected readonly runtime = signal<WebGlCanvasRuntime | null>(null)
  protected readonly runtimeState = signal<"checking" | "ready" | "unsupported">("checking")
  protected readonly statusMessage = signal(
    "Mounting the WebGL perspective-camera route prepares a perspective projection over layered geometry.",
  )
  protected readonly highlights = [
    "First Phase 3 route centered on depth cues and camera motion rather than only 2D transforms or post-process composition",
    "Uses a 4x4 view-projection matrix to orbit a camera around static layered panels in 3D space",
    "Keeps the route-local workbench contract while expanding Phase 3 into perspective, distance, and lens controls",
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
      displayValue: (value) => `${value.toFixed(0)}°`,
    },
    pitch: {
      value: () => this.pitch(),
      set: (value) => this.pitch.set(clampPitch(value)),
      displayValue: (value) => `${value.toFixed(0)}°`,
    },
    distance: {
      value: () => this.distance(),
      set: (value) => this.distance.set(clampDistance(value)),
      displayValue: (value) => value.toFixed(1),
    },
    fov: {
      value: () => this.fov(),
      set: (value) => this.fov.set(clampFov(value)),
      displayValue: (value) => `${value.toFixed(0)}°`,
    },
    depth: {
      value: () => this.depth(),
      set: (value) => this.depth.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
    accent: {
      value: () => this.accent(),
      set: (value) => this.accent.set(clampChannel(value)),
      displayValue: (value) => value.toFixed(2),
    },
  }
  protected readonly scene = computed<WebGlPerspectiveCameraScene>(() => ({
    red: this.red(),
    green: this.green(),
    blue: this.blue(),
    alpha: this.alpha(),
    yaw: this.yaw(),
    pitch: this.pitch(),
    distance: this.distance(),
    fov: this.fov(),
    depth: this.depth(),
    accent: this.accent(),
  }))
  protected readonly summary = computed(() =>
    webGlPerspectiveCameraSummary(this.scene(), this.runtimeStatusLabel(), this.runtime()?.version),
  )
  protected readonly metrics = computed(() => [
    { label: "Runtime", value: this.runtimeStatusLabel() },
    { label: "Context version", value: this.runtime()?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlPerspectiveCameraClearColor(this.scene()) },
    { label: "Accent color", value: webGlPerspectiveCameraAccentColor(this.scene()) },
    { label: "Camera angles", value: webGlPerspectiveCameraAngles(this.scene()) },
    { label: "Lens", value: webGlPerspectiveCameraLens(this.scene()) },
    { label: "Depth spread", value: webGlPerspectiveCameraDepthLabel(this.scene()) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ])

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isWebGlPerspectiveCameraScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the WebGL perspective-camera scene from the shared URL.")
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

      renderWebGlPerspectiveCameraScene(canvasRef.nativeElement, runtime, scene)
      this.statusMessage.set(`Submitted a perspective-camera WebGL draw using ${runtime.version}.`)
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
          buildWorkbenchShareUrl(WEBGL_PERSPECTIVE_CAMERA_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "webgl-perspective-camera.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)
        this.statusMessage.set("WebGL perspective-camera scene reset to the default preset.")
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
        this.statusMessage.set("Updated the camera yaw.")
        break
      case "p":
        event.preventDefault()
        stepNumericSignal(this.pitch, event.shiftKey ? -4 : 4, clampPitch)
        this.statusMessage.set("Updated the camera pitch.")
        break
      case "d":
        event.preventDefault()
        stepNumericSignal(this.distance, event.shiftKey ? -0.2 : 0.2, clampDistance)
        this.statusMessage.set("Updated the camera distance.")
        break
      case "f":
        event.preventDefault()
        stepNumericSignal(this.fov, event.shiftKey ? -3 : 3, clampFov)
        this.statusMessage.set("Updated the field of view.")
        break
      case "z":
        event.preventDefault()
        stepNumericSignal(this.depth, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the layer depth.")
        break
      case "n":
        event.preventDefault()
        stepNumericSignal(this.accent, event.shiftKey ? -0.05 : 0.05, clampChannel)
        this.statusMessage.set("Updated the accent mix.")
        break
      case "escape":
        event.preventDefault()
        this.applyScene(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)
        this.statusMessage.set("WebGL perspective-camera scene reset to the default preset.")
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

    releaseWebGlPerspectiveCameraResources(runtime)
  }

  private applyScene(scene: WebGlPerspectiveCameraScene): void {
    this.red.set(clampChannel(scene.red))
    this.green.set(clampChannel(scene.green))
    this.blue.set(clampChannel(scene.blue))
    this.alpha.set(clampChannel(scene.alpha))
    this.yaw.set(clampYaw(scene.yaw))
    this.pitch.set(clampPitch(scene.pitch))
    this.distance.set(clampDistance(scene.distance))
    this.fov.set(clampFov(scene.fov))
    this.depth.set(clampChannel(scene.depth))
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

function clampYaw(value: number): number {
  return Math.min(75, Math.max(-75, Number(value.toFixed(0))))
}

function clampPitch(value: number): number {
  return Math.min(55, Math.max(-55, Number(value.toFixed(0))))
}

function clampDistance(value: number): number {
  return Math.min(7, Math.max(2, Number(value.toFixed(1))))
}

function clampFov(value: number): number {
  return Math.min(90, Math.max(30, Number(value.toFixed(0))))
}
