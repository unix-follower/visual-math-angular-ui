import { ChangeDetectionStrategy, Component } from "@angular/core"
import { RouterLink } from "@angular/router"
import { PHASE_2_CONCEPT_SECTIONS, PHASE_2_ROUTE_CARDS } from "../phase-2/phase-2-route-catalog"
import { PHASE_3_CONCEPT_SECTIONS, PHASE_3_ROUTE_CARDS } from "../phase-3/phase-3-route-catalog"

type FrequencyGroup = {
  readonly label: string
  readonly cadence: string
  readonly domains: readonly string[]
}

@Component({
  selector: "app-home-page",
  imports: [RouterLink],
  templateUrl: "./home.page.html",
  styleUrl: "./home.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  protected readonly starterTools = [
    {
      label: "Phase 3 Index",
      path: "/phase-3",
      description: "Catalog view for the current Angular WebGL routes and progression notes.",
    },
    ...PHASE_3_ROUTE_CARDS.map((route) => ({
      label: route.label,
      path: route.path,
      description: route.description,
    })),
    {
      label: "Phase 2 Index",
      path: "/phase-2",
      description: "Catalog view for the complete Angular WebGPU route baseline.",
    },
    ...PHASE_2_ROUTE_CARDS.map((route) => ({
      label: route.label,
      path: route.path,
      description: route.description,
    })),
    {
      label: "Quadratic plotter",
      path: "/algebra/quadratic-plotter",
      description: "Algebra graphing slice with roots, vertex, and keyboard-tuned coefficients.",
    },
    {
      label: "Derivative lab",
      path: "/calculus/derivative-lab",
      description: "Calculus slice comparing tangent and secant slopes on a controllable curve.",
    },
    {
      label: "Integral lab",
      path: "/calculus/integral-lab",
      description:
        "Calculus slice for exact area, midpoint rectangles, and accumulation intuition.",
    },
    {
      label: "Limits lab",
      path: "/calculus/limits-lab",
      description:
        "Calculus slice for left/right-hand samples and removable-discontinuity intuition.",
    },
    {
      label: "Graph traversal lab",
      path: "/discrete-math/graph-traversal-lab",
      description:
        "Discrete math slice comparing BFS and DFS with revealed visit order and path intuition.",
    },
    {
      label: "Triangle explorer",
      path: "/geometry/triangle-explorer",
      description: "Geometry slice with area, perimeter, centroid, and rigid-rotation controls.",
    },
    {
      label: "Payoff matrix lab",
      path: "/game-theory/payoff-matrix-lab",
      description:
        "Monthly game-theory slice for 2x2 payoffs, best responses, and Nash equilibrium intuition.",
    },
    {
      label: "Unit circle explorer",
      path: "/trigonometry/unit-circle",
      description: "Trigonometry slice linking angle, sine, cosine, tangent, and wave intuition.",
    },
    {
      label: "Sampling lab",
      path: "/statistics-probability/sampling-lab",
      description:
        "Statistics and probability slice with seeded experiments and histogram intuition.",
    },
    {
      label: "Distribution lab",
      path: "/statistics-probability/distribution-lab",
      description:
        "Weekly probability slice for exact binomial distributions, cumulative probability, and expected-value guides.",
    },
    {
      label: "Vector explorer",
      path: "/linear-algebra/vectors",
      description:
        "Linear algebra slice with vector components, projections, and keyboard movement.",
    },
    {
      label: "Euler characteristic lab",
      path: "/topology/euler-characteristic-lab",
      description:
        "Rare-math topology slice for genus, boundary components, and Euler characteristic intuition.",
    },
    {
      label: "Partial derivatives lab",
      path: "/multivariable-calculus/partial-derivatives-lab",
      description:
        "Multivariable calculus slice for local slope in x and y, gradients, and contours.",
    },
    {
      label: "Modular arithmetic lab",
      path: "/number-theory/modular-arithmetic-lab",
      description:
        "Monthly number-theory slice for residue classes, modular operations, and invertibility.",
    },
    {
      label: "Gradient descent lab",
      path: "/optimization/gradient-descent-lab",
      description:
        "Domain-specific optimization slice for contour geometry, learning rate, and iterative descent.",
    },
  ]

  protected readonly frequencyGroups: readonly FrequencyGroup[] = [
    {
      label: "Daily math",
      cadence: "Completed in Canvas and now serving as the reference breadth.",
      domains: ["Algebra", "Linear Algebra", "Geometry", "Trigonometry", "Statistics"],
    },
    {
      label: "Weekly math",
      cadence: "Complete in Canvas and ready for later renderer parity.",
      domains: ["Calculus", "Multivariable Calculus", "Probability", "Discrete Math"],
    },
    {
      label: "Monthly math",
      cadence: "Implemented in Canvas for broader concept coverage.",
      domains: ["Number Theory", "Game Theory", "Logic and relation tools"],
    },
    {
      label: "Rare math",
      cadence: "Covered selectively with intuition-first slices.",
      domains: ["Topology", "Abstract visual metaphors"],
    },
    {
      label: "Domain-specific math",
      cadence:
        "Started in Canvas and now opening renderer-specific Phase 3 work after the completed WebGPU baseline.",
      domains: ["Optimization", "Numerical Linear Algebra", "Stochastic simulations"],
    },
  ]

  protected readonly workbenchCapabilities = [
    "Reusable workbench shell that now hosts Canvas, a completed WebGPU route set, and multiple WebGL routes inside the same Angular app",
    "Typed parameter controls and preset-driven interactions",
    "Accessible text summaries and keyboard-operable viewport workflows",
    "Serializable scene state plus share, reset, and export actions",
  ]

  protected readonly phase2ConceptGroups = PHASE_2_CONCEPT_SECTIONS
  protected readonly phase3ConceptGroups = PHASE_3_CONCEPT_SECTIONS
}
