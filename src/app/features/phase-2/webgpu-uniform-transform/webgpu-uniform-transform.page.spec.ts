import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE } from "./webgpu-uniform-transform.model"
import { WebGpuUniformTransformPageComponent } from "./webgpu-uniform-transform.page"
import {
  releaseWebGpuUniformTransformResources,
  renderWebGpuUniformTransformScene,
} from "./webgpu-uniform-transform.renderer"

describe("WebGpuUniformTransformPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()

    await TestBed.configureTestingModule({
      imports: [WebGpuUniformTransformPageComponent],
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

  it("releases uniform resources and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuUniformTransformPageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
    }
    const vertexBufferDestroy = vi.fn()
    const uniformBufferDestroy = vi.fn()
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
          .mockReturnValueOnce({ destroy: uniformBufferDestroy }),
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

    renderWebGpuUniformTransformScene(canvas, runtime, DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)

    component.runtime.set(runtime)
    fixture.destroy()

    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(uniformBufferDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuUniformTransformResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
