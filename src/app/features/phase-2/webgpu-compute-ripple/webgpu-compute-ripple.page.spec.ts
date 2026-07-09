import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE } from "./webgpu-compute-ripple.model"
import { WebGpuComputeRipplePageComponent } from "./webgpu-compute-ripple.page"
import {
  releaseWebGpuComputeRippleResources,
  renderWebGpuComputeRippleScene,
} from "./webgpu-compute-ripple.renderer"

describe("WebGpuComputeRipplePageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuComputeRipplePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("releases compute-ripple resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuComputeRipplePageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexDestroy = vi.fn()
    const uniformDestroy = vi.fn()
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: { submit: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginComputePass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setBindGroup: vi.fn(),
            dispatchWorkgroups: vi.fn(),
            end: vi.fn(),
          }),
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
        createComputePipeline: vi
          .fn()
          .mockReturnValue({ getBindGroupLayout: vi.fn().mockReturnValue({}) }),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: vertexDestroy })
          .mockReturnValueOnce({ destroy: uniformDestroy }),
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

    renderWebGpuComputeRippleScene(canvas, runtime, DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexDestroy).toHaveBeenCalledTimes(1)
    expect(uniformDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuComputeRippleResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
