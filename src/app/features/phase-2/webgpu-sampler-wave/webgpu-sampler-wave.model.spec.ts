import {
  DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE,
  isWebGpuSamplerWaveScene,
  samplerWaveAccentColor,
  samplerWaveClearColor,
  samplerWaveFootprint,
  webGpuSamplerWaveSummary,
} from "./webgpu-sampler-wave.model"

describe("webgpu-sampler-wave.model", () => {
  it("recognizes a valid sampler-wave scene", () => {
    expect(isWebGpuSamplerWaveScene(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe(true)
    expect(isWebGpuSamplerWaveScene({ frequency: 4, softness: 0.5 })).toBe(false)
  })

  it("formats derived color labels", () => {
    expect(samplerWaveClearColor(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe("rgba(15, 26, 56, 1.00)")
    expect(samplerWaveAccentColor(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe(
      "rgba(126, 112, 90, 1.00)",
    )
  })

  it("summarizes the sampler-backed scene", () => {
    const summary = webGpuSamplerWaveSummary(
      DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("sampler-filtered")
    expect(summary).toContain("bgra8unorm")
  })

  it("reports sampler footprint", () => {
    expect(samplerWaveFootprint(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe("8x8 / filter linear")
  })
})
