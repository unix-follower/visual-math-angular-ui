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
import { WorkbenchMetricGridComponent } from "../../../shared/math-workbench/workbench-metric-grid.component"
import { WorkbenchPresetGridComponent } from "../../../shared/math-workbench/workbench-preset-grid.component"
import { WorkbenchRangeControlComponent } from "../../../shared/math-workbench/workbench-range-control.component"
import { WorkbenchToggleControlComponent } from "../../../shared/math-workbench/workbench-toggle-control.component"
import { WorkbenchViewportSurfaceComponent } from "../../../shared/math-workbench/workbench-viewport-surface.component"
import {
  DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE,
  isModularArithmeticLabScene,
  modularArithmeticLabMetrics,
  ModularArithmeticLabScene,
  modularArithmeticLabSummary,
  normalizeResidue,
} from "./modular-arithmetic-lab.model"
import { renderModularArithmeticLabScene } from "./modular-arithmetic-lab.renderer"

const MODULAR_ARITHMETIC_ROUTE_PATH = "/number-theory/modular-arithmetic-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "modulus", label: "Modulus", min: 2, max: 16, step: 1 },
  { kind: "range", id: "operandA", label: "Operand a", min: 0, max: 15, step: 1 },
  { kind: "range", id: "operandB", label: "Operand b", min: 0, max: 15, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showAddition", label: "Show addition residue" },
  { kind: "toggle", id: "showMultiplication", label: "Show multiplication residue" },
  { kind: "toggle", id: "showCoprimeRing", label: "Show units / coprime residues" },
]
const PRESETS: readonly WorkbenchPreset<ModularArithmeticLabScene>[] = [
  {
    label: "Modulo 8",
    description: "Classic clock arithmetic with units highlighted.",
    state: {
      modulus: 8,
      operandA: 3,
      operandB: 5,
      showAddition: true,
      showMultiplication: true,
      showCoprimeRing: true,
    },
  },
  {
    label: "Prime modulus",
    description: "Every non-zero residue becomes invertible when the modulus is prime.",
    state: {
      modulus: 11,
      operandA: 4,
      operandB: 7,
      showAddition: true,
      showMultiplication: true,
      showCoprimeRing: true,
    },
  },
  {
    label: "Composite contrast",
    description: "Composite modulus exposes zero divisors and fewer units.",
    state: {
      modulus: 12,
      operandA: 4,
      operandB: 9,
      showAddition: true,
      showMultiplication: true,
      showCoprimeRing: true,
    },
  },
  {
    label: "Product focus",
    description: "Hide the sum and focus on multiplication around the ring.",
    state: {
      modulus: 9,
      operandA: 2,
      operandB: 6,
      showAddition: false,
      showMultiplication: true,
      showCoprimeRing: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized number-theory scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current modular viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default modular arithmetic scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Decrease or increase operand a." },
  { keys: "Arrow Up/Down", description: "Decrease or increase operand b." },
  { keys: "M / Shift+M", description: "Increase or decrease the modulus." },
  { keys: "A", description: "Toggle the addition residue." },
  { keys: "P", description: "Toggle the multiplication residue." },
  { keys: "C", description: "Toggle the coprime residue ring." },
  { keys: "R", description: "Reset the modular scene." },
]

@Component({
  selector: "app-modular-arithmetic-lab-page",
  imports: [
    MathWorkbenchComponent,
    WorkbenchControlSectionComponent,
    WorkbenchMetricGridComponent,
    WorkbenchPresetGridComponent,
    WorkbenchRangeControlComponent,
    WorkbenchToggleControlComponent,
    WorkbenchViewportSurfaceComponent,
  ],
  templateUrl: "./modular-arithmetic-lab.page.html",
  styleUrl: "./modular-arithmetic-lab.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModularArithmeticLabPageComponent {
  private readonly platformId = inject(PLATFORM_ID)
  private readonly route = inject(ActivatedRoute)

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas")
  protected readonly modulus = signal(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.modulus)
  protected readonly operandA = signal(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.operandA)
  protected readonly operandB = signal(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.operandB)
  protected readonly showAddition = signal(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.showAddition)
  protected readonly showMultiplication = signal(
    DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.showMultiplication,
  )
  protected readonly showCoprimeRing = signal(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE.showCoprimeRing)
  protected readonly statusMessage = signal(
    "Focus the residue ring for keyboard modular arithmetic controls.",
  )
  protected readonly highlights = [
    "Monthly-math number theory slice",
    "Residue classes arranged on a clock-style ring",
    "Addition, multiplication, and units shown on the shared workbench",
  ]
  protected readonly rangeControls = RANGE_CONTROLS
  protected readonly toggleControls = TOGGLE_CONTROLS
  protected readonly presets = PRESETS
  protected readonly actions = ACTIONS
  protected readonly keyboardShortcuts = KEYBOARD_SHORTCUTS
  private readonly rangeControlAdapters: Record<string, RangeControlAdapter> = {
    modulus: {
      value: () => this.modulus(),
      set: (value) => this.setModulus(clampInteger(value, 2, 16)),
      displayValue: (value) => `${clampInteger(value, 2, 16)}`,
    },
    operandA: {
      value: () => this.operandA(),
      set: (value) => this.operandA.set(clampOperand(value, this.modulus())),
      displayValue: (value) => `${normalizeResidue(value, this.modulus())} mod ${this.modulus()}`,
    },
    operandB: {
      value: () => this.operandB(),
      set: (value) => this.operandB.set(clampOperand(value, this.modulus())),
      displayValue: (value) => `${normalizeResidue(value, this.modulus())} mod ${this.modulus()}`,
    },
  }
  private readonly toggleControlAdapters: Record<string, ToggleControlAdapter> = {
    showAddition: {
      value: () => this.showAddition(),
      set: (value) => this.showAddition.set(value),
    },
    showMultiplication: {
      value: () => this.showMultiplication(),
      set: (value) => this.showMultiplication.set(value),
    },
    showCoprimeRing: {
      value: () => this.showCoprimeRing(),
      set: (value) => this.showCoprimeRing.set(value),
    },
  }
  protected readonly scene = computed<ModularArithmeticLabScene>(() => ({
    modulus: this.modulus(),
    operandA: normalizeResidue(this.operandA(), this.modulus()),
    operandB: normalizeResidue(this.operandB(), this.modulus()),
    showAddition: this.showAddition(),
    showMultiplication: this.showMultiplication(),
    showCoprimeRing: this.showCoprimeRing(),
  }))
  protected readonly derivedMetrics = computed(() => modularArithmeticLabMetrics(this.scene()))
  protected readonly summary = computed(() =>
    modularArithmeticLabSummary(this.scene(), this.derivedMetrics()),
  )
  protected readonly metrics = computed(() => {
    const metrics = this.derivedMetrics()

    return [
      { label: "a + b mod m", value: `${metrics.additionResidue}` },
      { label: "ab mod m", value: `${metrics.multiplicationResidue}` },
      { label: "Units", value: `${metrics.coprimeResidues.length}` },
      {
        label: "Invertibility",
        value: `a: ${metrics.invertibleA ? "yes" : "no"} | b: ${metrics.invertibleB ? "yes" : "no"}`,
      },
    ]
  })

  constructor() {
    const initialScene = deserializeWorkbenchScene(
      this.route.snapshot.queryParamMap.get("state"),
      isModularArithmeticLabScene,
    )

    if (initialScene) {
      this.applyScene(initialScene)
      this.statusMessage.set("Loaded the modular arithmetic scene from the shared URL.")
    }

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return
      }

      const canvasRef = this.canvas()
      const scene = this.scene()
      const metrics = this.derivedMetrics()

      if (!canvasRef) {
        return
      }

      renderModularArithmeticLabScene(canvasRef.nativeElement, scene, metrics)
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

    if (preset) {
      this.applyScene(preset.state)
      this.statusMessage.set(`Applied preset: ${preset.label}.`)
    }
  }

  protected async handleWorkbenchAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(MODULAR_ARITHMETIC_ROUTE_PATH, this.scene()),
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
          ? downloadWorkbenchCanvas(canvasRef.nativeElement, "modular-arithmetic-lab.png")
          : false
        this.statusMessage.set(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        this.applyScene(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE)
        this.statusMessage.set("Modular arithmetic scene reset to the default preset.")
    }
  }

  protected handleViewportKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        stepNumericSignal(this.operandA, -1, (value) => clampOperand(value, this.modulus()))
        this.statusMessage.set("Operand a decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        stepNumericSignal(this.operandA, 1, (value) => clampOperand(value, this.modulus()))
        this.statusMessage.set("Operand a increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        stepNumericSignal(this.operandB, -1, (value) => clampOperand(value, this.modulus()))
        this.statusMessage.set("Operand b decreased.")
        break
      case "ArrowUp":
        event.preventDefault()
        stepNumericSignal(this.operandB, 1, (value) => clampOperand(value, this.modulus()))
        this.statusMessage.set("Operand b increased.")
        break
      case "m":
        event.preventDefault()
        this.setModulus(stepNumericSignal(this.modulus, 1, (value) => clampInteger(value, 2, 16)))
        this.statusMessage.set("Modulus increased.")
        break
      case "M":
        event.preventDefault()
        this.setModulus(stepNumericSignal(this.modulus, -1, (value) => clampInteger(value, 2, 16)))
        this.statusMessage.set("Modulus decreased.")
        break
      case "a":
      case "A":
        event.preventDefault()
        this.showAddition.update((value) => !value)
        this.statusMessage.set("Addition residue toggled.")
        break
      case "p":
      case "P":
        event.preventDefault()
        this.showMultiplication.update((value) => !value)
        this.statusMessage.set("Multiplication residue toggled.")
        break
      case "c":
      case "C":
        event.preventDefault()
        this.showCoprimeRing.update((value) => !value)
        this.statusMessage.set("Coprime residue ring toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        this.applyScene(DEFAULT_MODULAR_ARITHMETIC_LAB_SCENE)
        this.statusMessage.set("Modular arithmetic scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  private applyScene(scene: ModularArithmeticLabScene): void {
    this.setModulus(clampInteger(scene.modulus, 2, 16))
    this.operandA.set(clampOperand(scene.operandA, this.modulus()))
    this.operandB.set(clampOperand(scene.operandB, this.modulus()))
    this.showAddition.set(scene.showAddition)
    this.showMultiplication.set(scene.showMultiplication)
    this.showCoprimeRing.set(scene.showCoprimeRing)
  }

  private setModulus(value: number): void {
    const nextModulus = clampInteger(value, 2, 16)
    this.modulus.set(nextModulus)
    this.operandA.update((operand) => clampOperand(operand, nextModulus))
    this.operandB.update((operand) => clampOperand(operand, nextModulus))
  }
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function clampOperand(value: number, modulus: number): number {
  return Math.min(Math.max(0, Math.round(value)), modulus - 1)
}
