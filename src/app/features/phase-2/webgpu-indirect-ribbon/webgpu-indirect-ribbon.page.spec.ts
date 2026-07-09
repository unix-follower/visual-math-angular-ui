import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE } from "./webgpu-indirect-ribbon.model"
import { WebGpuIndirectRibbonPageComponent } from "./webgpu-indirect-ribbon.page"
import {
  releaseWebGpuIndirectRibbonResources,
  renderWebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.renderer"

describe("WebGpuIndirectRibbonPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuIndirectRibbonPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("releases indirect resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuIndirectRibbonPageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexDestroy = vi.fn()
    const indirectDestroy = vi.fn()
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: { submit: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginRenderPass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setVertexBuffer: vi.fn(),
            drawIndirect: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: vertexDestroy })
          .mockReturnValueOnce({ destroy: indirectDestroy }),
        destroy: vi.fn(),
      } as unknown as GPUDevice,
      context: {
        getCurrentTexture: vi.fn().mockReturnValue({ createView: vi.fn().mockReturnValue({}) }),
        unconfigure: vi.fn(),
      } as unknown as GPUCanvasContext,
      format: "bgra8unorm",
    }
    const canvas = { width: 0, height: 0, style: {} } as HTMLCanvasElement

    renderWebGpuIndirectRibbonScene(canvas, runtime, DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexDestroy).toHaveBeenCalledTimes(1)
    expect(indirectDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndirectRibbonResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
