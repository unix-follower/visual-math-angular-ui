import { ChangeDetectionStrategy, Component, input } from "@angular/core"

@Component({
  selector: "app-workbench-control-section",
  templateUrl: "./workbench-control-section.component.html",
  styleUrl: "./workbench-control-section.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchControlSectionComponent {
  readonly heading = input.required<string>()
  readonly headingId = input.required<string>()
}
