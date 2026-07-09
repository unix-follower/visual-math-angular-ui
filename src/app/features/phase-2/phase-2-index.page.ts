import { ChangeDetectionStrategy, Component } from "@angular/core"
import { RouterLink } from "@angular/router"
import {
  PHASE_2_CONCEPT_SECTIONS,
  PHASE_2_ROUTE_CARDS,
  PHASE_2_ROUTE_COUNT,
} from "./phase-2-route-catalog"

@Component({
  selector: "app-phase-2-index-page",
  imports: [RouterLink],
  templateUrl: "./phase-2-index.page.html",
  styleUrl: "./phase-2-index.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Phase2IndexPageComponent {
  protected readonly conceptSections = PHASE_2_CONCEPT_SECTIONS
  protected readonly routeCards = PHASE_2_ROUTE_CARDS
  protected readonly routeCount = PHASE_2_ROUTE_COUNT

  protected readonly progressionNotes = [
    "Phase 2 now closes with a complete Angular WebGPU baseline spanning indexing, instancing, indirect draw, indirect indexed draw, compute, textures, and multipass rendering.",
    "Every route keeps the same route-local model, scene, renderer, and page split plus explicit runtime teardown.",
    "Phase 3 now starts from this baseline with Angular WebGL Foundation rather than extending Phase 2 further in this cycle.",
  ]
}
