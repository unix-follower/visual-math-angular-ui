import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE } from "./webgpu-indirect-indexed-polygon.model"
import { WebGpuIndirectIndexedPolygonPageComponent } from "./webgpu-indirect-indexed-polygon.page"
import {
  releaseWebGpuIndirectIndexedPolygonResources,
  renderWebGpuIndirectIndexedPolygonScene,
} from "./webgpu-indirect-indexed-polygon.renderer"

describe("WebGpuIndirectIndexedPolygonPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuIndirectIndexedPolygonPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("releases indirect indexed resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuIndirectIndexedPolygonPageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexDestroy = vi.fn()
    const indexDestroy = vi.fn()
    const indirectDestroy = vi.fn()
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: { submit: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginRenderPass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setVertexBuffer: vi.fn(),
            setIndexBuffer: vi.fn(),
            drawIndexedIndirect: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: vertexDestroy })
          .mockReturnValueOnce({ destroy: indexDestroy })
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

    renderWebGpuIndirectIndexedPolygonScene(
      canvas,
      runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexDestroy).toHaveBeenCalledTimes(1)
    expect(indexDestroy).toHaveBeenCalledTimes(1)
    expect(indirectDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndirectIndexedPolygonResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
