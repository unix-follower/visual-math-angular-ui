import { getWebGlContext, hasWebGlSupport, initializeWebGlCanvas } from "./webgl-bootstrap"

describe("webgl-bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("detects support when the runtime exposes WebGL2RenderingContext", () => {
    const originalContext = globalThis.WebGL2RenderingContext

    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: function MockWebGl2RenderingContext() {},
    })

    expect(hasWebGlSupport()).toBe(true)

    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: originalContext,
    })
  })

  it("returns null when the canvas does not provide a WebGL2 context", () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement

    expect(getWebGlContext(canvas)).toBeNull()
  })

  it("returns a failure result when WebGL2 is unavailable", () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement

    expect(initializeWebGlCanvas(canvas)).toEqual({
      ok: false,
      reason: "WebGL2 is unavailable in this browser or test environment.",
    })
  })

  it("returns a runtime when WebGL2 is available", () => {
    Object.defineProperty(globalThis, "WebGL2RenderingContext", {
      configurable: true,
      value: function MockWebGl2RenderingContext() {} as unknown as typeof WebGL2RenderingContext,
    })

    const context = { clear: vi.fn() } as unknown as WebGL2RenderingContext
    const canvas = {
      getContext: vi.fn().mockReturnValue(context),
    } as unknown as HTMLCanvasElement

    expect(initializeWebGlCanvas(canvas)).toEqual({
      ok: true,
      runtime: {
        context,
        version: "webgl2",
      },
    })
  })
})
