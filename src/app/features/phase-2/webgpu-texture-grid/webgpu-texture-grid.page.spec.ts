import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import {
  installMockGpuBufferUsage,
  installMockGpuTextureUsage,
} from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_TEXTURE_GRID_SCENE } from "./webgpu-texture-grid.model"
import { WebGpuTextureGridPageComponent } from "./webgpu-texture-grid.page"
import {
  releaseWebGpuTextureGridResources,
  renderWebGpuTextureGridScene,
} from "./webgpu-texture-grid.renderer"

describe("WebGpuTextureGridPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>
  let gpuTextureUsageMock: ReturnType<typeof installMockGpuTextureUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
    gpuTextureUsageMock = installMockGpuTextureUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuTextureGridPageComponent],
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
    gpuTextureUsageMock.restore()
  })

  it("releases texture resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuTextureGridPageComponent)
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
        queue: {
          submit: vi.fn(),
          writeBuffer: vi.fn(),
          writeTexture: vi.fn(),
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
        createBuffer: vi.fn().mockReturnValueOnce({ destroy: vertexBufferDestroy }),
        createTexture: vi.fn().mockReturnValue(texture),
        createBindGroup: vi.fn().mockReturnValue({}),
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

    renderWebGpuTextureGridScene(canvas, runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(textureDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuTextureGridResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
