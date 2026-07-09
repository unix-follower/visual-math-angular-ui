import { ChangeDetectionStrategy, Component, input, output } from "@angular/core"

@Component({
  selector: "app-workbench-toggle-control",
  templateUrl: "./workbench-toggle-control.component.html",
  styleUrl: "./workbench-toggle-control.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchToggleControlComponent {
  readonly label = input.required<string>()
  readonly checked = input.required<boolean>()
  readonly valueChanged = output<Event>()

  protected onChange(event: Event): void {
    this.valueChanged.emit(event)
  }
}
