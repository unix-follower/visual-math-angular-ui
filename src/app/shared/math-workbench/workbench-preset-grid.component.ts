import { ChangeDetectionStrategy, Component, input, output } from "@angular/core"

type WorkbenchPresetSummary = {
  readonly label: string
  readonly description: string
}

@Component({
  selector: "app-workbench-preset-grid",
  templateUrl: "./workbench-preset-grid.component.html",
  styleUrl: "./workbench-preset-grid.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchPresetGridComponent {
  readonly presets = input<readonly WorkbenchPresetSummary[]>([])
  readonly presetSelected = output<number>()

  protected selectPreset(index: number): void {
    this.presetSelected.emit(index)
  }
}
