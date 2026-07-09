import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE } from "./webgpu-instanced-lattice.model"
import { WebGpuInstancedLatticePageComponent } from "./webgpu-instanced-lattice.page"
import {
  releaseWebGpuInstancedLatticeResources,
  renderWebGpuInstancedLatticeScene,
} from "./webgpu-instanced-lattice.renderer"

describe("WebGpuInstancedLatticePageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuInstancedLatticePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("releases instancing resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuInstancedLatticePageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const meshDestroy = vi.fn()
    const instanceDestroy = vi.fn()
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: { submit: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginRenderPass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setVertexBuffer: vi.fn(),
            draw: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: meshDestroy })
          .mockReturnValueOnce({ destroy: instanceDestroy }),
        destroy: vi.fn(),
      } as unknown as GPUDevice,
      context: {
        getCurrentTexture: vi.fn().mockReturnValue({ createView: vi.fn().mockReturnValue({}) }),
        unconfigure: vi.fn(),
      } as unknown as GPUCanvasContext,
      format: "bgra8unorm",
    }
    const canvas = { width: 0, height: 0, style: {} } as HTMLCanvasElement

    renderWebGpuInstancedLatticeScene(canvas, runtime, DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(meshDestroy).toHaveBeenCalledTimes(1)
    expect(instanceDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuInstancedLatticeResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
