import { ChangeDetectionStrategy, Component, input, output } from "@angular/core"

@Component({
  selector: "app-workbench-viewport-surface",
  templateUrl: "./workbench-viewport-surface.component.html",
  styleUrl: "./workbench-viewport-surface.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchViewportSurfaceComponent {
  readonly ariaLabel = input.required<string>()
  readonly keyPressed = output<KeyboardEvent>()
  readonly pointerInteracted = output<PointerEvent>()

  protected onKeydown(event: KeyboardEvent): void {
    this.keyPressed.emit(event)
  }

  protected onPointerEvent(event: PointerEvent): void {
    this.pointerInteracted.emit(event)
  }
}
