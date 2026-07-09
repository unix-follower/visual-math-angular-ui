import {
  DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
  isWebGpuStoragePaletteScene,
  storagePaletteClearColor,
  storagePalettePeakColor,
  storagePaletteSpread,
  webGpuStoragePaletteSummary,
} from "./webgpu-storage-palette.model"

describe("webgpu-storage-palette.model", () => {
  it("recognizes a valid storage palette scene", () => {
    expect(isWebGpuStoragePaletteScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(true)
    expect(isWebGpuStoragePaletteScene({ warmth: 0.4, balance: 2 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(storagePaletteClearColor(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(storagePalettePeakColor(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(
      "rgba(159, 123, 139, 1.00)",
    )
  })

  it("summarizes the storage-buffer scene", () => {
    const summary = webGpuStoragePaletteSummary(
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("storage buffer")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports palette spread", () => {
    expect(storagePaletteSpread(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe("1.10 palette units")
  })
})
