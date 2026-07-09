import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { WebGpuFoundationPageComponent } from "./webgpu-foundation.page"
import { DEFAULT_WEBGPU_FOUNDATION_SCENE } from "./webgpu-foundation.model"
import {
  releaseWebGpuFoundationResources,
  renderWebGpuFoundationScene,
} from "./webgpu-foundation.renderer"

describe("WebGpuFoundationPageComponent", () => {
  const originalGpuBufferUsage = (
    globalThis as typeof globalThis & {
      GPUBufferUsage?: { readonly VERTEX: number; readonly COPY_DST: number }
    }
  ).GPUBufferUsage

  beforeEach(async () => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: {
        VERTEX: 1,
        COPY_DST: 2,
      },
    })

    await TestBed.configureTestingModule({
      imports: [WebGpuFoundationPageComponent],
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
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: originalGpuBufferUsage,
    })
  })

  it("releases renderer resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuFoundationPageComponent)
    const component = fixture.componentInstance as WebGpuFoundationPageComponent & {
      runtime: { set: (value: unknown) => void }
    }
    const vertexBufferDestroy = vi.fn()
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
            draw: vi.fn(),
            end: vi.fn(),
          }),
          finish: vi.fn().mockReturnValue({}),
        }),
        createShaderModule: vi.fn().mockReturnValue({}),
        createRenderPipeline: vi.fn().mockReturnValue({}),
        createBuffer: vi.fn().mockReturnValue({ destroy: vertexBufferDestroy }),
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

    renderWebGpuFoundationScene(canvas, runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuFoundationResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
