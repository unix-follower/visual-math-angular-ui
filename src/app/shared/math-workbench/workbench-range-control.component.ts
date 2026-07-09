import { ChangeDetectionStrategy, Component, input, output } from "@angular/core"

@Component({
  selector: "app-workbench-range-control",
  templateUrl: "./workbench-range-control.component.html",
  styleUrl: "./workbench-range-control.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchRangeControlComponent {
  readonly label = input.required<string>()
  readonly min = input.required<number>()
  readonly max = input.required<number>()
  readonly step = input.required<number>()
  readonly value = input.required<number>()
  readonly displayValue = input.required<string>()
  readonly valueChanged = output<Event>()

  protected onInput(event: Event): void {
    this.valueChanged.emit(event)
  }
}
