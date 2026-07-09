import { ChangeDetectionStrategy, Component } from "@angular/core"
import { RouterLink } from "@angular/router"

import {
  PHASE_3_CONCEPT_SECTIONS,
  PHASE_3_ROUTE_CARDS,
  PHASE_3_ROUTE_COUNT,
} from "./phase-3-route-catalog"

@Component({
  selector: "app-phase-3-index-page",
  imports: [RouterLink],
  templateUrl: "./phase-3-index.page.html",
  styleUrl: "./phase-3-index.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Phase3IndexPageComponent {
  protected readonly conceptSections = PHASE_3_CONCEPT_SECTIONS
  protected readonly routeCards = PHASE_3_ROUTE_CARDS
  protected readonly routeCount = PHASE_3_ROUTE_COUNT

  protected readonly progressionNotes = [
    "Phase 3 now spans a stable WebGL2 bootstrap route, shader-linked geometry, a uniform-driven transform route, indexed geometry, a texture-backed route, two depth-and-camera routes, three lighting-and-material routes, and eight multi-pass routes for compositing, blur, ping-pong feedback, longer trail relays, frame-stepped persistence, velocity-field advection, interactive dye injection, and multi-obstacle flow.",
    "The current slice proves WebGL pages can follow the same route-local model, renderer, page, and teardown pattern used in the Angular WebGPU phase.",
    "The planned Angular WebGL baseline is now complete: the route catalog covers guarded bootstrap, geometry, transforms, indexing, textures, depth/cameras, lighting/materials, offscreen passes, feedback, and direct simulation interaction in one consistent workbench surface.",
  ]
}
