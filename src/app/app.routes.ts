import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/home/home.page").then((module) => module.HomePageComponent),
    title: "Visual Math Lab",
  },
  {
    path: "algebra/quadratic-plotter",
    loadComponent: () =>
      import("./features/algebra/quadratic-plotter/quadratic-plotter.page").then(
        (module) => module.QuadraticPlotterPageComponent,
      ),
    title: "Quadratic Plotter",
  },
  {
    path: "calculus/derivative-lab",
    loadComponent: () =>
      import("./features/calculus/derivative-lab/derivative-lab.page").then(
        (module) => module.DerivativeLabPageComponent,
      ),
    title: "Derivative Lab",
  },
  {
    path: "calculus/integral-lab",
    loadComponent: () =>
      import("./features/calculus/integral-lab/integral-lab.page").then(
        (module) => module.IntegralLabPageComponent,
      ),
    title: "Integral Lab",
  },
  {
    path: "calculus/limits-lab",
    loadComponent: () =>
      import("./features/calculus/limits-lab/limits-lab.page").then(
        (module) => module.LimitsLabPageComponent,
      ),
    title: "Limits Lab",
  },
  {
    path: "discrete-math/graph-traversal-lab",
    loadComponent: () =>
      import("./features/discrete-math/graph-traversal-lab/graph-traversal-lab.page").then(
        (module) => module.GraphTraversalLabPageComponent,
      ),
    title: "Graph Traversal Lab",
  },
  {
    path: "geometry/triangle-explorer",
    loadComponent: () =>
      import("./features/geometry/triangle-explorer/triangle-explorer.page").then(
        (module) => module.TriangleExplorerPageComponent,
      ),
    title: "Triangle Explorer",
  },
  {
    path: "game-theory/payoff-matrix-lab",
    loadComponent: () =>
      import("./features/game-theory/payoff-matrix-lab/payoff-matrix-lab.page").then(
        (module) => module.PayoffMatrixLabPageComponent,
      ),
    title: "Payoff Matrix Lab",
  },
  {
    path: "trigonometry/unit-circle",
    loadComponent: () =>
      import("./features/trigonometry/unit-circle/unit-circle.page").then(
        (module) => module.UnitCirclePageComponent,
      ),
    title: "Unit Circle Explorer",
  },
  {
    path: "statistics-probability/sampling-lab",
    loadComponent: () =>
      import("./features/statistics-probability/sampling-lab/sampling-lab.page").then(
        (module) => module.SamplingLabPageComponent,
      ),
    title: "Sampling Lab",
  },
  {
    path: "statistics-probability/distribution-lab",
    loadComponent: () =>
      import("./features/statistics-probability/distribution-lab/distribution-lab.page").then(
        (module) => module.DistributionLabPageComponent,
      ),
    title: "Distribution Lab",
  },
  {
    path: "linear-algebra/vectors",
    loadComponent: () =>
      import("./features/linear-algebra/vector-explorer/vector-explorer.page").then(
        (module) => module.VectorExplorerPageComponent,
      ),
    title: "Vector Explorer",
  },
  {
    path: "topology/euler-characteristic-lab",
    loadComponent: () =>
      import("./features/topology/euler-characteristic-lab/euler-characteristic-lab.page").then(
        (module) => module.EulerCharacteristicLabPageComponent,
      ),
    title: "Euler Characteristic Lab",
  },
  {
    path: "multivariable-calculus/partial-derivatives-lab",
    loadComponent: () =>
      import("./features/multivariable-calculus/partial-derivatives-lab/partial-derivatives-lab.page").then(
        (module) => module.PartialDerivativesLabPageComponent,
      ),
    title: "Partial Derivatives Lab",
  },
  {
    path: "number-theory/modular-arithmetic-lab",
    loadComponent: () =>
      import("./features/number-theory/modular-arithmetic-lab/modular-arithmetic-lab.page").then(
        (module) => module.ModularArithmeticLabPageComponent,
      ),
    title: "Modular Arithmetic Lab",
  },
  {
    path: "optimization/gradient-descent-lab",
    loadComponent: () =>
      import("./features/optimization/gradient-descent-lab/gradient-descent-lab.page").then(
        (module) => module.GradientDescentLabPageComponent,
      ),
    title: "Gradient Descent Lab",
  },
  {
    path: "phase-2",
    pathMatch: "full",
    loadComponent: () =>
      import("./features/phase-2/phase-2-index.page").then(
        (module) => module.Phase2IndexPageComponent,
      ),
    title: "Phase 2 WebGPU Index",
  },
  {
    path: "phase-2/webgpu-foundation",
    loadComponent: () =>
      import("./features/phase-2/webgpu-foundation/webgpu-foundation.page").then(
        (module) => module.WebGpuFoundationPageComponent,
      ),
    title: "WebGPU Foundation",
  },
  {
    path: "phase-2/webgpu-gradient-quad",
    loadComponent: () =>
      import("./features/phase-2/webgpu-gradient-quad/webgpu-gradient-quad.page").then(
        (module) => module.WebGpuGradientQuadPageComponent,
      ),
    title: "WebGPU Gradient Quad",
  },
  {
    path: "phase-2/webgpu-indexed-polygon",
    loadComponent: () =>
      import("./features/phase-2/webgpu-indexed-polygon/webgpu-indexed-polygon.page").then(
        (module) => module.WebGpuIndexedPolygonPageComponent,
      ),
    title: "WebGPU Indexed Polygon",
  },
  {
    path: "phase-2/webgpu-pulse-diamond",
    loadComponent: () =>
      import("./features/phase-2/webgpu-pulse-diamond/webgpu-pulse-diamond.page").then(
        (module) => module.WebGpuPulseDiamondPageComponent,
      ),
    title: "WebGPU Pulse Diamond",
  },
  {
    path: "phase-2/webgpu-uniform-transform",
    loadComponent: () =>
      import("./features/phase-2/webgpu-uniform-transform/webgpu-uniform-transform.page").then(
        (module) => module.WebGpuUniformTransformPageComponent,
      ),
    title: "WebGPU Uniform Transform",
  },
  {
    path: "phase-2/webgpu-storage-palette",
    loadComponent: () =>
      import("./features/phase-2/webgpu-storage-palette/webgpu-storage-palette.page").then(
        (module) => module.WebGpuStoragePalettePageComponent,
      ),
    title: "WebGPU Storage Palette",
  },
  {
    path: "phase-2/webgpu-texture-grid",
    loadComponent: () =>
      import("./features/phase-2/webgpu-texture-grid/webgpu-texture-grid.page").then(
        (module) => module.WebGpuTextureGridPageComponent,
      ),
    title: "WebGPU Texture Grid",
  },
  {
    path: "phase-2/webgpu-sampler-wave",
    loadComponent: () =>
      import("./features/phase-2/webgpu-sampler-wave/webgpu-sampler-wave.page").then(
        (module) => module.WebGpuSamplerWavePageComponent,
      ),
    title: "WebGPU Sampler Wave",
  },
  {
    path: "phase-2/webgpu-dual-pass",
    loadComponent: () =>
      import("./features/phase-2/webgpu-dual-pass/webgpu-dual-pass.page").then(
        (module) => module.WebGpuDualPassPageComponent,
      ),
    title: "WebGPU Dual Pass",
  },
  {
    path: "phase-2/webgpu-compute-ripple",
    loadComponent: () =>
      import("./features/phase-2/webgpu-compute-ripple/webgpu-compute-ripple.page").then(
        (module) => module.WebGpuComputeRipplePageComponent,
      ),
    title: "WebGPU Compute Ripple",
  },
  {
    path: "phase-2/webgpu-instanced-lattice",
    loadComponent: () =>
      import("./features/phase-2/webgpu-instanced-lattice/webgpu-instanced-lattice.page").then(
        (module) => module.WebGpuInstancedLatticePageComponent,
      ),
    title: "WebGPU Instanced Lattice",
  },
  {
    path: "phase-2/webgpu-indirect-ribbon",
    loadComponent: () =>
      import("./features/phase-2/webgpu-indirect-ribbon/webgpu-indirect-ribbon.page").then(
        (module) => module.WebGpuIndirectRibbonPageComponent,
      ),
    title: "WebGPU Indirect Ribbon",
  },
  {
    path: "phase-2/webgpu-indirect-indexed-polygon",
    loadComponent: () =>
      import("./features/phase-2/webgpu-indirect-indexed-polygon/webgpu-indirect-indexed-polygon.page").then(
        (module) => module.WebGpuIndirectIndexedPolygonPageComponent,
      ),
    title: "WebGPU Indirect Indexed Polygon",
  },
  {
    path: "phase-3",
    pathMatch: "full",
    loadComponent: () =>
      import("./features/phase-3/phase-3-index.page").then(
        (module) => module.Phase3IndexPageComponent,
      ),
    title: "Phase 3 WebGL Index",
  },
  {
    path: "phase-3/webgl-foundation",
    loadComponent: () =>
      import("./features/phase-3/webgl-foundation/webgl-foundation.page").then(
        (module) => module.WebGlFoundationPageComponent,
      ),
    title: "WebGL Foundation",
  },
  {
    path: "phase-3/webgl-gradient-triangle",
    loadComponent: () =>
      import("./features/phase-3/webgl-gradient-triangle/webgl-gradient-triangle.page").then(
        (module) => module.WebGlGradientTrianglePageComponent,
      ),
    title: "WebGL Gradient Triangle",
  },
  {
    path: "phase-3/webgl-uniform-transform",
    loadComponent: () =>
      import("./features/phase-3/webgl-uniform-transform/webgl-uniform-transform.page").then(
        (module) => module.WebGlUniformTransformPageComponent,
      ),
    title: "WebGL Uniform Transform",
  },
  {
    path: "phase-3/webgl-indexed-polygon",
    loadComponent: () =>
      import("./features/phase-3/webgl-indexed-polygon/webgl-indexed-polygon.page").then(
        (module) => module.WebGlIndexedPolygonPageComponent,
      ),
    title: "WebGL Indexed Polygon",
  },
  {
    path: "phase-3/webgl-texture-grid",
    loadComponent: () =>
      import("./features/phase-3/webgl-texture-grid/webgl-texture-grid.page").then(
        (module) => module.WebGlTextureGridPageComponent,
      ),
    title: "WebGL Texture Grid",
  },
  {
    path: "phase-3/webgl-perspective-camera",
    loadComponent: () =>
      import("./features/phase-3/webgl-perspective-camera/webgl-perspective-camera.page").then(
        (module) => module.WebGlPerspectiveCameraPageComponent,
      ),
    title: "WebGL Perspective Camera",
  },
  {
    path: "phase-3/webgl-depth-prism",
    loadComponent: () =>
      import("./features/phase-3/webgl-depth-prism/webgl-depth-prism.page").then(
        (module) => module.WebGlDepthPrismPageComponent,
      ),
    title: "WebGL Depth Prism",
  },
  {
    path: "phase-3/webgl-lit-material",
    loadComponent: () =>
      import("./features/phase-3/webgl-lit-material/webgl-lit-material.page").then(
        (module) => module.WebGlLitMaterialPageComponent,
      ),
    title: "WebGL Lit Material",
  },
  {
    path: "phase-3/webgl-shadow-relief",
    loadComponent: () =>
      import("./features/phase-3/webgl-shadow-relief/webgl-shadow-relief.page").then(
        (module) => module.WebGlShadowReliefPageComponent,
      ),
    title: "WebGL Shadow Relief",
  },
  {
    path: "phase-3/webgl-textured-material",
    loadComponent: () =>
      import("./features/phase-3/webgl-textured-material/webgl-textured-material.page").then(
        (module) => module.WebGlTexturedMaterialPageComponent,
      ),
    title: "WebGL Textured Material",
  },
  {
    path: "phase-3/webgl-dual-pass",
    loadComponent: () =>
      import("./features/phase-3/webgl-dual-pass/webgl-dual-pass.page").then(
        (module) => module.WebGlDualPassPageComponent,
      ),
    title: "WebGL Dual Pass",
  },
  {
    path: "phase-3/webgl-bloom-blur",
    loadComponent: () =>
      import("./features/phase-3/webgl-bloom-blur/webgl-bloom-blur.page").then(
        (module) => module.WebGlBloomBlurPageComponent,
      ),
    title: "WebGL Bloom Blur",
  },
  {
    path: "phase-3/webgl-ping-pong-feedback",
    loadComponent: () =>
      import("./features/phase-3/webgl-ping-pong-feedback/webgl-ping-pong-feedback.page").then(
        (module) => module.WebGlPingPongFeedbackPageComponent,
      ),
    title: "WebGL Ping-Pong Feedback",
  },
  {
    path: "phase-3/webgl-feedback-trails",
    loadComponent: () =>
      import("./features/phase-3/webgl-feedback-trails/webgl-feedback-trails.page").then(
        (module) => module.WebGlFeedbackTrailsPageComponent,
      ),
    title: "WebGL Feedback Trails",
  },
  {
    path: "phase-3/webgl-temporal-feedback",
    loadComponent: () =>
      import("./features/phase-3/webgl-temporal-feedback/webgl-temporal-feedback.page").then(
        (module) => module.WebGlTemporalFeedbackPageComponent,
      ),
    title: "WebGL Temporal Feedback",
  },
  {
    path: "phase-3/webgl-velocity-field",
    loadComponent: () =>
      import("./features/phase-3/webgl-velocity-field/webgl-velocity-field.page").then(
        (module) => module.WebGlVelocityFieldPageComponent,
      ),
    title: "WebGL Velocity Field",
  },
  {
    path: "phase-3/webgl-interactive-dye",
    loadComponent: () =>
      import("./features/phase-3/webgl-interactive-dye/webgl-interactive-dye.page").then(
        (module) => module.WebGlInteractiveDyePageComponent,
      ),
    title: "WebGL Interactive Dye",
  },
  {
    path: "phase-3/webgl-multi-obstacle-flow",
    loadComponent: () =>
      import("./features/phase-3/webgl-multi-obstacle-flow/webgl-multi-obstacle-flow.page").then(
        (module) => module.WebGlMultiObstacleFlowPageComponent,
      ),
    title: "WebGL Multi-Obstacle Flow",
  },
  {
    path: "**",
    redirectTo: "",
  },
]
