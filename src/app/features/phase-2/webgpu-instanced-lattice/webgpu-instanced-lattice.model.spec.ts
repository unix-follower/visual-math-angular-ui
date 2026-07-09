import {
  DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
  instancedLatticeAccentColor,
  instancedLatticeClearColor,
  instancedLatticeStageLabel,
  isWebGpuInstancedLatticeScene,
  webGpuInstancedLatticeSummary,
} from "./webgpu-instanced-lattice.model"

describe("webgpu-instanced-lattice.model", () => {
  it("recognizes a valid instanced-lattice scene", () => {
    expect(isWebGpuInstancedLatticeScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(true)
    expect(isWebGpuInstancedLatticeScene({ spacing: 1.4, scale: 0.4 })).toBe(false)
  })

  it("formats derived labels", () => {
    expect(instancedLatticeClearColor(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(instancedLatticeAccentColor(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(
      "rgba(117, 96, 88, 1.00)",
    )
  })

  it("summarizes the instanced scene", () => {
    const summary = webGpuInstancedLatticeSummary(
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("multiple instance records")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports the stage label", () => {
    expect(instancedLatticeStageLabel()).toBe("1 mesh / 5 instances")
  })
})
