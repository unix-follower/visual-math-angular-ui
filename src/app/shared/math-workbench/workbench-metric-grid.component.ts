import { ChangeDetectionStrategy, Component, input } from "@angular/core"

type WorkbenchMetric = {
  readonly label: string
  readonly value: string
}

@Component({
  selector: "app-workbench-metric-grid",
  templateUrl: "./workbench-metric-grid.component.html",
  styleUrl: "./workbench-metric-grid.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchMetricGridComponent {
  readonly metrics = input<readonly WorkbenchMetric[]>([])
}
