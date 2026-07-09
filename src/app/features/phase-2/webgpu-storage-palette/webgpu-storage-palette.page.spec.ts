import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE } from "./webgpu-storage-palette.model"
import { WebGpuStoragePalettePageComponent } from "./webgpu-storage-palette.page"
import {
  releaseWebGpuStoragePaletteResources,
  renderWebGpuStoragePaletteScene,
} from "./webgpu-storage-palette.renderer"

describe("WebGpuStoragePalettePageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuStoragePalettePageComponent],
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

  it("releases storage resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuStoragePalettePageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexBufferDestroy = vi.fn()
    const storageBufferDestroy = vi.fn()
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
            setBindGroup: vi.fn(),
            setVertexBuffer: vi.fn(),
            draw: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({
          getBindGroupLayout: vi.fn().mockReturnValue({}),
        }),
        createBindGroup: vi.fn().mockReturnValue({}),
        createBuffer: vi
          .fn()
          .mockReturnValueOnce({ destroy: vertexBufferDestroy })
          .mockReturnValueOnce({ destroy: storageBufferDestroy }),
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

    renderWebGpuStoragePaletteScene(canvas, runtime, DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(storageBufferDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuStoragePaletteResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
