import { isPlatformBrowser } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
  ToggleControlSchema,
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
import { WorkbenchMetricGridComponent } from "../../../shared/math-workbench/workbench-metric-grid.component"
import { WorkbenchPresetGridComponent } from "../../../shared/math-workbench/workbench-preset-grid.component"
import { WorkbenchRangeControlComponent } from "../../../shared/math-workbench/workbench-range-control.component"
import { WorkbenchToggleControlComponent } from "../../../shared/math-workbench/workbench-toggle-control.component"
import {
  readRangeControlDisplayValue,
  readRangeControlValue,
  readToggleControlValue,
  type RangeControlAdapter,
  type ToggleControlAdapter,
  writeRangeControlValue,
  writeToggleControlValue,
} from "../../../shared/math-workbench/workbench-control-state"
import { stepNumericSignal } from "../../../shared/math-workbench/workbench-keyboard-state"
import { WorkbenchViewportSurfaceComponent } from "../../../shared/math-workbench/workbench-viewport-surface.component"
import {
  DEFAULT_GRAPH_TRAVERSAL_SCENE,
  graphNodeLabel,
  graphTraversalResult,
  graphTraversalSummary,
  GraphTraversalLabScene,
  isGraphTraversalLabScene,
  revealedTraversalOrder,
  traversalPath,
} from "./graph-traversal-lab.model"
import { renderGraphTraversalScene } from "./graph-traversal-lab.renderer"

const GRAPH_TRAVERSAL_ROUTE_PATH = "/discrete-math/graph-traversal-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "startNode", label: "Start node", min: 0, max: 5, step: 1 },
  { kind: "range", id: "goalNode", label: "Goal node", min: 0, max: 5, step: 1 },
  { kind: "range", id: "revealSteps", label: "Reveal steps", min: 1, max: 6, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "useBreadthFirst", label: "Use breadth-first search" },
  { kind: "toggle", id: "showVisitOrder", label: "Show visit order" },
]
const PRESETS: readonly WorkbenchPreset<GraphTraversalLabScene>[] = [
  {
    label: "BFS shortest path",
    description: "Breadth-first traversal from A to F with the full reveal.",
    state: {
      startNode: 0,
      goalNode: 5,
      revealSteps: 6,
      useBreadthFirst: true,
      showVisitOrder: true,
    },
  },
  {
    label: "DFS contrast",
    description: "Depth-first traversal over the same start and goal to compare order.",
    state: {
      startNode: 0,
      goalNode: 5,
      revealSteps: 6,
      useBreadthFirst: false,
      showVisitOrder: true,
    },
  },
  {
    label: "Mid-graph target",
    description: "Find a shorter target starting from node C.",
    state: {
      startNode: 2,
      goalNode: 3,
      revealSteps: 5,
      useBreadthFirst: true,
      showVisitOrder: true,
    },
  },
  {
    label: "Order only",
    description: "Hide order labels while keeping traversal progression.",
    state: {
      startNode: 1,
      goalNode: 5,
      revealSteps: 4,
      useBreadthFirst: true,
      showVisitOrder: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized graph traversal scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current discrete-math viewport as a PNG image.",
  },
  { id: "reset-scene", label: "Reset", description: "Restore the default graph traversal scene." },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the start node backward or forward." },
  { keys: "Arrow Up/Down", description: "Move the goal node backward or forward." },
  { keys: "R / Shift+R", description: "Increase or decrease the number of revealed steps." },
  { keys: "B", description: "Toggle breadth-first versus depth-first traversal." },
  { keys: "O", description: "Toggle visit-order labels." },
  { keys: "T", description: "Reset the discrete-math scene." },
]

@Component({
  selector: "app-graph-traversal-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./graph-traversal-lab.page.html",
  styleUrl: "./graph-traversal-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphTraversalLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly startNode = signal(DEFAULT_GRAPH_TRAVERSAL_SCENE.startNode)
  protected readonly goalNode = signal(DEFAULT_GRAPH_TRAVERSAL_SCENE.goalNode)
  protected readonly revealSteps = signal(DEFAULT_GRAPH_TRAVERSAL_SCENE.revealSteps)
  protected readonly useBreadthFirst = signal(DEFAULT_GRAPH_TRAVERSAL_SCENE.useBreadthFirst)
  protected readonly showVisitOrder = signal(DEFAULT_GRAPH_TRAVERSAL_SCENE.showVisitOrder)
  protected readonly statusMessage = signal("Focus the graph area for keyboard traversal controls.")
  protected readonly highlights = [
    "Weekly-math discrete-math slice",
    "Breadth-first versus depth-first traversal contrast",
    "Path and visit-order intuition on the shared workbench",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    startNode: {
      value: () => this.startNode(),
      set: (value) => this.startNode.set(clampNode(value)),
      displayValue: (value) => graphNodeLabel(Math.round(value)),
    },
    goalNode: {
      value: () => this.goalNode(),
      set: (value) => this.goalNode.set(clampNode(value)),
      displayValue: (value) => graphNodeLabel(Math.round(value)),
    },
    revealSteps: {
      value: () => this.revealSteps(),
      set: (value) => this.revealSteps.set(clampStep(value)),
      displayValue: (value) => `${Math.round(value)}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    useBreadthFirst: {
      value: () => this.useBreadthFirst(),
      set: (value) => this.useBreadthFirst.set(value),
    },
    showVisitOrder: {
      value: () => this.showVisitOrder(),
      set: (value) => this.showVisitOrder.set(value),
    },
  }
  protected readonly scene = computed<GraphTraversalLabScene>(() => ({
    startNode: this.startNode(),
    goalNode: this.goalNode(),
    revealSteps: this.revealSteps(),
    useBreadthFirst: this.useBreadthFirst(),
    showVisitOrder: this.showVisitOrder(),
  }))
  protected readonly traversal = computed(() => graphTraversalResult(this.scene()))
  protected readonly summary = computed(() => graphTraversalSummary(this.scene()))
  protected readonly metrics = computed(() => {
    const scene = this.scene()
    const result = this.traversal()

    return [
      { label: "Mode", value: scene.useBreadthFirst ? "BFS" : "DFS" },
      { label: "Visited", value: `${revealedTraversalOrder(scene).length}/${result.order.length}` },
      {
        label: "Path length",
        value: result.foundGoal
          ? `${Math.max(result.path.length - 1, 0)} edges`
          : "Goal not reached",
      },
      {
        label: "Path",
        value:
          traversalPath(scene).length > 0
            ? traversalPath(scene).map(graphNodeLabel).join(" -> ")
            : "Hidden or incomplete",
      },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isGraphTraversalLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the discrete-math scene from the shared URL.")
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const scene = this.scene()

      if (!canvasRef) {
        return
      }

      renderGraphTraversalScene(canvasRef.nativeElement, scene)
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

  protected toggleValue(controlId: string): boolean {
    return readToggleControlValue(this.toggleControlAdapters, controlId)
  }

  protected toggleOption(controlId: string, event: Event): void {
    writeToggleControlValue(this.toggleControlAdapters, controlId, event)
  }

  protected applyPresetByIndex(index: number): void {
    const preset = this.presets[index]

    if (!preset) {
      return
    }

    this.applyScene(preset.state)
    this.statusMessage.set(`Applied preset: ${preset.label}.`)
  }

  protected async handleWorkbenchAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(GRAPH_TRAVERSAL_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "graph-traversal-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)
        this.statusMessage.set("Graph traversal scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.startNode, -1, clampNode)
        this.statusMessage.set("Start node moved backward.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.startNode, 1, clampNode)
        this.statusMessage.set("Start node moved forward.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.goalNode, 1, clampNode)
        this.statusMessage.set("Goal node moved forward.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.goalNode, -1, clampNode)
        this.statusMessage.set("Goal node moved backward.")
        break
      case "r":
        event.preventDefault()
        stepNumericSignal(this.revealSteps, 1, clampStep)
        this.statusMessage.set("Reveal steps increased.")
        break
      case "R":
        event.preventDefault()
        stepNumericSignal(this.revealSteps, -1, clampStep)
        this.statusMessage.set("Reveal steps decreased.")
        break
      case "b":
      case "B":
        event.preventDefault()
        this.useBreadthFirst.update((value) => !value)
        this.statusMessage.set("Traversal mode toggled.")
        break
      case "o":
      case "O":
        event.preventDefault()
        this.showVisitOrder.update((value) => !value)
        this.statusMessage.set("Visit-order labels toggled.")
        break
      case "t":
      case "T":
        event.preventDefault()
        this.applyScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)
        this.statusMessage.set("Graph traversal scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: GraphTraversalLabScene): void {
    this.startNode.set(clampNode(scene.startNode))
    this.goalNode.set(clampNode(scene.goalNode))
    this.revealSteps.set(clampStep(scene.revealSteps))
    this.useBreadthFirst.set(scene.useBreadthFirst)
    this.showVisitOrder.set(scene.showVisitOrder)
  }
}

function clampNode(value: number): number {
  return Math.max(0, Math.min(5, Math.round(value)))
}

function clampStep(value: number): number {
  return Math.max(1, Math.min(6, Math.round(value)))
}
