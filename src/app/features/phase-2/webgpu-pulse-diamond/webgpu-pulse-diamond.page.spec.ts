import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { installMockGpuBufferUsage } from "../../../shared/webgpu/webgpu-renderer-test-harness"
import { DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE } from "./webgpu-pulse-diamond.model"
import { WebGpuPulseDiamondPageComponent } from "./webgpu-pulse-diamond.page"
import {
  releaseWebGpuPulseDiamondResources,
  renderWebGpuPulseDiamondScene,
} from "./webgpu-pulse-diamond.renderer"

describe("WebGpuPulseDiamondPageComponent", () => {
  let gpuBufferUsageMock: ReturnType<typeof installMockGpuBufferUsage>
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame
  let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame

  beforeEach(async () => {
    gpuBufferUsageMock = installMockGpuBufferUsage()
    originalRequestAnimationFrame = globalThis.requestAnimationFrame
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame

    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn().mockReturnValue(77),
    })
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    })

    await TestBed.configureTestingModule({
      imports: [WebGpuPulseDiamondPageComponent],
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
          useValue: "browser",
        },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    gpuBufferUsageMock.restore()
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: originalRequestAnimationFrame,
    })
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: originalCancelAnimationFrame,
    })
  })

  it("cancels the animation loop and tears down the runtime on destroy", () => {
    const fixture = TestBed.createComponent(WebGpuPulseDiamondPageComponent)
    const component = fixture.componentInstance as unknown as {
      runtime: { set: (value: unknown) => void }
      animationFrameId: number | null
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

    renderWebGpuPulseDiamondScene(canvas, runtime, DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)

    component.runtime.set(runtime)
    component.animationFrameId = 77
    fixture.destroy()

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(77)
    expect(vertexBufferDestroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuPulseDiamondResources(runtime)).toBe(false)
    expect(runtime.context.unconfigure).toHaveBeenCalledTimes(1)
    expect(runtime.device.destroy).toHaveBeenCalledTimes(1)
  })
})
