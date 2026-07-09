import { getWebGpuContext, hasWebGpuSupport, initializeWebGpuCanvas } from "./webgpu-bootstrap"

describe("webgpu-bootstrap", () => {
  const originalGpu = globalThis.navigator.gpu

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: originalGpu,
    })
  })

  it("reports when WebGPU support is unavailable", () => {
    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: undefined,
    })

    expect(hasWebGpuSupport()).toBe(false)
  })

  it("returns null when the canvas cannot provide a WebGPU context", () => {
    const canvas = {
      getContext: vi.fn().mockImplementation(() => {
        throw new Error("context unavailable")
      }),
    } as unknown as HTMLCanvasElement

    expect(getWebGpuContext(canvas)).toBeNull()
  })

  it("returns an unsupported result when no adapter is available", async () => {
    const context = {
      configure: vi.fn(),
    } as unknown as GPUCanvasContext
    const canvas = {
      getContext: vi.fn().mockReturnValue(context),
    } as unknown as HTMLCanvasElement

    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: {
        requestAdapter: vi.fn().mockResolvedValue(null),
        getPreferredCanvasFormat: vi.fn().mockReturnValue("bgra8unorm"),
      } satisfies GPU,
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: false,
      reason: "No compatible WebGPU adapter was found for this device.",
    })
  })

  it("returns an unsupported result when no WebGPU context is available", async () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement
    const gpu = {
      requestAdapter: vi.fn(),
      getPreferredCanvasFormat: vi.fn().mockReturnValue("bgra8unorm"),
    } satisfies GPU

    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: gpu,
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: false,
      reason: "The browser did not provide a WebGPU canvas context.",
    })
    expect(gpu.requestAdapter).not.toHaveBeenCalled()
  })

  it("configures the canvas and returns runtime details when initialization succeeds", async () => {
    const device = {
      queue: {
        submit: vi.fn(),
        writeBuffer: vi.fn(),
      },
      createCommandEncoder: vi.fn(),
      createShaderModule: vi.fn(),
      createRenderPipeline: vi.fn(),
      createBuffer: vi.fn(),
    } as unknown as GPUDevice
    const adapter = {
      requestDevice: vi.fn().mockResolvedValue(device),
    } as unknown as GPUAdapter
    const context = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn(),
    } as unknown as GPUCanvasContext
    const canvas = {
      getContext: vi.fn().mockReturnValue(context),
    } as unknown as HTMLCanvasElement
    const gpu = {
      requestAdapter: vi.fn().mockResolvedValue(adapter),
      getPreferredCanvasFormat: vi.fn().mockReturnValue("bgra8unorm"),
    } satisfies GPU

    Object.defineProperty(globalThis.navigator, "gpu", {
      configurable: true,
      value: gpu,
    })

    const result = await initializeWebGpuCanvas(canvas)

    expect(result).toEqual({
      ok: true,
      runtime: {
        adapter,
        device,
        context,
        format: "bgra8unorm",
      },
    })
    expect(adapter.requestDevice).toHaveBeenCalledWith({ label: "visual-math-webgpu-foundation" })
    expect(context.configure).toHaveBeenCalledWith({
      device,
      format: "bgra8unorm",
      alphaMode: "premultiplied",
    })
  })
})
