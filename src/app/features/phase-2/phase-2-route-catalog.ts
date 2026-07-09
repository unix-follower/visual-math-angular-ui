export type Phase2RouteCard = {
  readonly label: string
  readonly path: string
  readonly concept: string
  readonly description: string
}

export type Phase2ConceptSection = {
  readonly label: string
  readonly summary: string
  readonly routes: readonly string[]
}

export const PHASE_2_CONCEPT_SECTIONS: readonly Phase2ConceptSection[] = [
  {
    label: "Foundations",
    summary: "Runtime bootstrap, canvas configuration, and baseline interpolated rendering.",
    routes: ["WebGPU Foundation", "WebGPU Gradient Quad"],
  },
  {
    label: "Geometry Reuse",
    summary:
      "Reducing duplication through indexing, instancing, indirect submission, and indirect indexed submission patterns.",
    routes: [
      "WebGPU Indexed Polygon",
      "WebGPU Instanced Lattice",
      "WebGPU Indirect Ribbon",
      "WebGPU Indirect Indexed Polygon",
    ],
  },
  {
    label: "GPU-Driven Motion",
    summary: "Animation, transform control, and compute-backed data generation on the GPU.",
    routes: ["WebGPU Pulse Diamond", "WebGPU Uniform Transform", "WebGPU Compute Ripple"],
  },
  {
    label: "Data And Surfaces",
    summary:
      "Moving through storage buffers, uploaded textures, filtered samplers, and offscreen passes.",
    routes: [
      "WebGPU Storage Palette",
      "WebGPU Texture Grid",
      "WebGPU Sampler Wave",
      "WebGPU Dual Pass",
    ],
  },
]

export const PHASE_2_ROUTE_CARDS: readonly Phase2RouteCard[] = [
  {
    label: "WebGPU Foundation",
    path: "/phase-2/webgpu-foundation",
    concept: "Foundations",
    description:
      "Support detection, GPU canvas configuration, and a pipeline-backed starter triangle.",
  },
  {
    label: "WebGPU Gradient Quad",
    path: "/phase-2/webgpu-gradient-quad",
    concept: "Foundations",
    description:
      "A six-vertex interpolated surface that establishes reusable render-pipeline structure.",
  },
  {
    label: "WebGPU Indexed Polygon",
    path: "/phase-2/webgpu-indexed-polygon",
    concept: "Geometry Reuse",
    description: "Shared polygon vertices drawn through a uint16 index buffer.",
  },
  {
    label: "WebGPU Instanced Lattice",
    path: "/phase-2/webgpu-instanced-lattice",
    concept: "Geometry Reuse",
    description: "One shared triangle mesh reused across five instance records.",
  },
  {
    label: "WebGPU Indirect Ribbon",
    path: "/phase-2/webgpu-indirect-ribbon",
    concept: "Geometry Reuse",
    description: "Draw submission driven by an indirect buffer instead of direct draw arguments.",
  },
  {
    label: "WebGPU Indirect Indexed Polygon",
    path: "/phase-2/webgpu-indirect-indexed-polygon",
    concept: "Geometry Reuse",
    description: "Indexed submission driven by a GPU indirect buffer through drawIndexedIndirect.",
  },
  {
    label: "WebGPU Pulse Diamond",
    path: "/phase-2/webgpu-pulse-diamond",
    concept: "GPU-Driven Motion",
    description: "Per-frame vertex updates via requestAnimationFrame and GPU buffer rewrites.",
  },
  {
    label: "WebGPU Uniform Transform",
    path: "/phase-2/webgpu-uniform-transform",
    concept: "GPU-Driven Motion",
    description: "Uniform-buffer transforms and tint changes without CPU geometry rebuilding.",
  },
  {
    label: "WebGPU Compute Ripple",
    path: "/phase-2/webgpu-compute-ripple",
    concept: "GPU-Driven Motion",
    description: "A compute pass writes GPU vertex data before the render pass consumes it.",
  },
  {
    label: "WebGPU Storage Palette",
    path: "/phase-2/webgpu-storage-palette",
    concept: "Data And Surfaces",
    description: "Per-vertex palette data read from a storage buffer.",
  },
  {
    label: "WebGPU Texture Grid",
    path: "/phase-2/webgpu-texture-grid",
    concept: "Data And Surfaces",
    description: "Uploaded texture data sampled through textureLoad in the fragment stage.",
  },
  {
    label: "WebGPU Sampler Wave",
    path: "/phase-2/webgpu-sampler-wave",
    concept: "Data And Surfaces",
    description: "Filtered texture sampling with an explicit sampler resource.",
  },
  {
    label: "WebGPU Dual Pass",
    path: "/phase-2/webgpu-dual-pass",
    concept: "Data And Surfaces",
    description: "An offscreen render target composited through a second pass.",
  },
]

export const PHASE_2_ROUTE_COUNT = PHASE_2_ROUTE_CARDS.length
