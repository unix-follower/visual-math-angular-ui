export type Phase3RouteCard = {
  readonly label: string
  readonly path: string
  readonly concept: string
  readonly description: string
}

export type Phase3ConceptSection = {
  readonly label: string
  readonly summary: string
  readonly routes: readonly string[]
}

export const PHASE_3_CONCEPT_SECTIONS: readonly Phase3ConceptSection[] = [
  {
    label: "Foundations",
    summary:
      "Context detection, support guards, clear passes, and a stable workbench integration surface.",
    routes: ["WebGL Foundation"],
  },
  {
    label: "Geometry And Programs",
    summary:
      "Compiling shaders, linking programs, binding vertex buffers, and drawing explicit geometry.",
    routes: ["WebGL Gradient Triangle"],
  },
  {
    label: "Uniform-Driven Motion",
    summary:
      "Keeping static geometry resident while scale, rotation, translation, and accent change through uniform updates.",
    routes: ["WebGL Uniform Transform"],
  },
  {
    label: "Indexed Geometry",
    summary:
      "Reusing shared vertices through index buffers instead of duplicating perimeter positions per triangle.",
    routes: ["WebGL Indexed Polygon"],
  },
  {
    label: "Textures",
    summary:
      "Uploading RGBA texture data and sampling it in the fragment shader over static geometry.",
    routes: ["WebGL Texture Grid"],
  },
  {
    label: "Depth And Cameras",
    summary:
      "Using perspective projection, camera distance, orbit angles, and depth testing to reveal parallax, occlusion, and solid 3D forms.",
    routes: ["WebGL Perspective Camera", "WebGL Depth Prism"],
  },
  {
    label: "Lighting And Materials",
    summary:
      "Deriving normals and combining diffuse, metallic, specular, rim-lit, relief-shadowed, and texture-backed multi-light responses inside single-pass WebGL shading routes.",
    routes: ["WebGL Lit Material", "WebGL Shadow Relief", "WebGL Textured Material"],
  },
  {
    label: "Multi-Pass",
    summary:
      "Rendering into offscreen framebuffer textures first, then compositing, post-processing, ping-ponging, relaying, persisting, or interactively injecting those textures across animation frames before presentation.",
    routes: [
      "WebGL Dual Pass",
      "WebGL Bloom Blur",
      "WebGL Ping-Pong Feedback",
      "WebGL Feedback Trails",
      "WebGL Temporal Feedback",
      "WebGL Velocity Field",
      "WebGL Interactive Dye",
      "WebGL Multi-Obstacle Flow",
    ],
  },
]

export const PHASE_3_ROUTE_CARDS: readonly Phase3RouteCard[] = [
  {
    label: "WebGL Foundation",
    path: "/phase-3/webgl-foundation",
    concept: "Foundations",
    description: "Shared WebGL2 support detection and a minimal clear-pass renderer.",
  },
  {
    label: "WebGL Gradient Triangle",
    path: "/phase-3/webgl-gradient-triangle",
    concept: "Geometry And Programs",
    description: "A shader-linked triangle draw using interleaved position and color vertex data.",
  },
  {
    label: "WebGL Uniform Transform",
    path: "/phase-3/webgl-uniform-transform",
    concept: "Uniform-Driven Motion",
    description: "Static geometry transformed through a matrix uniform and accent mixing uniform.",
  },
  {
    label: "WebGL Indexed Polygon",
    path: "/phase-3/webgl-indexed-polygon",
    concept: "Indexed Geometry",
    description: "A polygon draw using shared perimeter vertices plus a uint16 index buffer.",
  },
  {
    label: "WebGL Texture Grid",
    path: "/phase-3/webgl-texture-grid",
    concept: "Textures",
    description: "A textured quad driven by a procedural 4x4 RGBA upload and fragment sampling.",
  },
  {
    label: "WebGL Perspective Camera",
    path: "/phase-3/webgl-perspective-camera",
    concept: "Depth And Cameras",
    description:
      "A layered 3D panel scene viewed through a perspective camera with orbit, distance, and lens controls.",
  },
  {
    label: "WebGL Depth Prism",
    path: "/phase-3/webgl-depth-prism",
    concept: "Depth And Cameras",
    description:
      "A depth-tested prism stack that uses indexed solid faces, camera orbit, and occlusion instead of layered quads.",
  },
  {
    label: "WebGL Lit Material",
    path: "/phase-3/webgl-lit-material",
    concept: "Lighting And Materials",
    description:
      "A procedural orb shaded with diffuse, metallic, specular, and rim-lit material responses in one pass.",
  },
  {
    label: "WebGL Shadow Relief",
    path: "/phase-3/webgl-shadow-relief",
    concept: "Lighting And Materials",
    description:
      "A procedural relief surface shaded with derived normals, contact-shadow cues, and glossy highlights in one pass.",
  },
  {
    label: "WebGL Textured Material",
    path: "/phase-3/webgl-textured-material",
    concept: "Lighting And Materials",
    description:
      "A texture-backed relief surface shaded with derived texel normals plus primary and fill lights in one pass.",
  },
  {
    label: "WebGL Dual Pass",
    path: "/phase-3/webgl-dual-pass",
    concept: "Multi-Pass",
    description: "An offscreen framebuffer pass composited back onto the canvas in a second pass.",
  },
  {
    label: "WebGL Bloom Blur",
    path: "/phase-3/webgl-bloom-blur",
    concept: "Multi-Pass",
    description:
      "An emissive offscreen pass blurred across neighboring texels during a fullscreen composite pass.",
  },
  {
    label: "WebGL Ping-Pong Feedback",
    path: "/phase-3/webgl-ping-pong-feedback",
    concept: "Multi-Pass",
    description:
      "A two-target feedback route that bounces an offscreen image between textures before the final canvas composite.",
  },
  {
    label: "WebGL Feedback Trails",
    path: "/phase-3/webgl-feedback-trails",
    concept: "Multi-Pass",
    description:
      "A longer relay chain that reuses the same two ping-pong targets across repeated offscreen trail passes.",
  },
  {
    label: "WebGL Temporal Feedback",
    path: "/phase-3/webgl-temporal-feedback",
    concept: "Multi-Pass",
    description:
      "An animated persistence route that advances one ping-pong feedback relay per frame instead of rebuilding the full chain in one call.",
  },
  {
    label: "WebGL Velocity Field",
    path: "/phase-3/webgl-velocity-field",
    concept: "Multi-Pass",
    description:
      "A simulation-style route that advects the previous frame through a synthetic velocity field before compositing the result.",
  },
  {
    label: "WebGL Interactive Dye",
    path: "/phase-3/webgl-interactive-dye",
    concept: "Multi-Pass",
    description:
      "An interactive feedback route that injects dye at pointer-selected positions and bends flow around a draggable obstacle.",
  },
  {
    label: "WebGL Multi-Obstacle Flow",
    path: "/phase-3/webgl-multi-obstacle-flow",
    concept: "Multi-Pass",
    description:
      "An interaction-heavy flow route that injects dye and bends it around two draggable obstacles chosen directly from the viewport.",
  },
]

export const PHASE_3_ROUTE_COUNT = PHASE_3_ROUTE_CARDS.length
