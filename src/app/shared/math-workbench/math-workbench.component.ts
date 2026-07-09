import { ChangeDetectionStrategy, Component, input, output } from "@angular/core"

import { WorkbenchAction, WorkbenchKeyboardShortcut } from "./math-workbench.models"

@Component({
  selector: "app-math-workbench",
  templateUrl: "./math-workbench.component.html",
  styleUrl: "./math-workbench.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MathWorkbenchComponent {
  readonly eyebrow = input.required<string>()
  readonly title = input.required<string>()
  readonly description = input.required<string>()
  readonly highlights = input<readonly string[]>([])
  readonly actions = input<readonly WorkbenchAction[]>([])
  readonly keyboardShortcuts = input<readonly WorkbenchKeyboardShortcut[]>([])
  readonly statusMessage = input("")
  readonly actionTriggered = output<string>()

  protected triggerAction(actionId: string): void {
    this.actionTriggered.emit(actionId)
  }
}
