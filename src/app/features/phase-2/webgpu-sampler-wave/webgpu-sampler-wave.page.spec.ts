import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import {
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE } from "./webgpu-sampler-wave.model"
import { WebGpuSamplerWavePageComponent } from "./webgpu-sampler-wave.page"
import {
  releaseWebGpuSamplerWaveResources,
  renderWebGpuSamplerWaveScene,
} from "./webgpu-sampler-wave.renderer"

describe("WebGpuSamplerWavePageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>
  let gpuTextureUsageMock: ReturnType<typeof installMockGpuTextureUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
    gpuTextureUsageMock = installMockGpuTextureUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuSamplerWavePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
    gpuTextureUsageMock.restore()
  })

  it("releases sampler-wave resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuSamplerWavePageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexBufferDestroy = vi.fn()
    const textureDestroy = vi.fn()
    const texture = {
      createView: vi.fn().mockReturnValue({}),
      destroy: textureDestroy,
    } as unknown as GPUTexture
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: { submit: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginRenderPass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setBindGroup: vi.fn(),
            setVertexBuffer: vi.fn(),
            draw: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi
          .fn()
          .mockReturnValue({ getBindGroupLayout: vi.fn().mockReturnValue({}) }),
        createBuffer: vi.fn().mockReturnValueOnce({ destroy: vertexBufferDestroy }),
        createTexture: vi.fn().mockReturnValue(texture),
        createSampler: vi.fn().mockReturnValue({}),
        createBindGroup: vi.fn().mockReturnValue({}),
        destroy: vi.fn(),
      } as unknown as GPUDevice,
      context: {
        getCurrentTexture: vi.fn().mockReturnValue({ createView: vi.fn().mockReturnValue({}) }),
        unconfigure: vi.fn(),
      } as unknown as GPUCanvasContext,
      format: "bgra8unorm",
    }
    const canvas = { width: 0, height: 0, style: {} } as HTMLCanvasElement

    renderWebGpuSamplerWaveScene(canvas, runtime, DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(textureDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuSamplerWaveResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
