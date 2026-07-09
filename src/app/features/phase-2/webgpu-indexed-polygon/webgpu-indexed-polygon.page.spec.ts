import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { WebGpuIndexedPolygonPageComponent } from "./webgpu-indexed-polygon.page"
import { DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE } from "./webgpu-indexed-polygon.model"
import {
  releaseWebGpuIndexedPolygonResources,
  renderWebGpuIndexedPolygonScene,
} from "./webgpu-indexed-polygon.renderer"

describe("WebGpuIndexedPolygonPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuIndexedPolygonPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
        {
          provide: "PLATFORM_ID",
          useValue: "server",
        },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
  })

  it("releases indexed resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuIndexedPolygonPageComponent)
    const component = fixture.componentInstance as WebGpuIndexedPolygonPageComponent & {
      runtime: { set: (value: unknown) => void }
    }
    const vertexBufferDestroy = vi.fn()
    const indexBufferDestroy = vi.fn()
    const runtime = {
      adapter: {} as GPUAdapter,
      device: {
        queue: {
          submit: vi.fn(),
          writeBuffer: vi.fn(),
        },
        createCommandEncoder: vi.fn().mockReturnValue({
          beginRenderPass: vi.fn().mockReturnValue({
            setPipeline: vi.fn(),
            setVertexBuffer: vi.fn(),
            setIndexBuffer: vi.fn(),
            drawIndexed: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: vertexBufferDestroy })
          .mockReturnValueOnce({ destroy: indexBufferDestroy }),
        destroy: vi.fn(),
      } as unknown as GPUDevice,
      context: {
        getCurrentTexture: vi.fn().mockReturnValue({
          createView: vi.fn().mockReturnValue({}),
        }),
        unconfigure: vi.fn(),
      } as unknown as GPUCanvasContext,
      format: "bgra8unorm",
    }
    const canvas = {
      width: 0,
      height: 0,
      style: {},
    } as HTMLCanvasElement

    renderWebGpuIndexedPolygonScene(canvas, runtime, DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(indexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndexedPolygonResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
