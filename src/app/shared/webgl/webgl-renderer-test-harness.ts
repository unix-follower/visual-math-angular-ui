import { vi } from "vitest"
import { type WebGlCanvasRuntime } from "./webgl-bootstrap"

type MockFunction = ReturnType<typeof vi.fn>

export type WebGlRendererHarness = {
  readonly canvas: HTMLCanvasElement
  readonly runtime: WebGlCanvasRuntime
  readonly context: {
    readonly viewport: MockFunction
    readonly clearColor: MockFunction
    readonly clear: MockFunction
    readonly createShader: MockFunction
    readonly shaderSource: MockFunction
    readonly compileShader: MockFunction
    readonly getShaderParameter: MockFunction
    readonly getShaderInfoLog: MockFunction
    readonly deleteShader: MockFunction
    readonly createProgram: MockFunction
    readonly attachShader: MockFunction
    readonly linkProgram: MockFunction
    readonly getProgramParameter: MockFunction
    readonly getProgramInfoLog: MockFunction
    readonly useProgram: MockFunction
    readonly deleteProgram: MockFunction
    readonly createBuffer: MockFunction
    readonly bindBuffer: MockFunction
    readonly bufferData: MockFunction
    readonly deleteBuffer: MockFunction
    readonly createTexture: MockFunction
    readonly bindTexture: MockFunction
    readonly texImage2D: MockFunction
    readonly texParameteri: MockFunction
    readonly activeTexture: MockFunction
    readonly deleteTexture: MockFunction
    readonly createFramebuffer: MockFunction
    readonly bindFramebuffer: MockFunction
    readonly framebufferTexture2D: MockFunction
    readonly deleteFramebuffer: MockFunction
    readonly getAttribLocation: MockFunction
    readonly getUniformLocation: MockFunction
    readonly enableVertexAttribArray: MockFunction
    readonly vertexAttribPointer: MockFunction
    readonly uniformMatrix3fv: MockFunction
    readonly uniformMatrix4fv: MockFunction
    readonly uniform1f: MockFunction
    readonly uniform1i: MockFunction
    readonly enable: MockFunction
    readonly depthFunc: MockFunction
    readonly clearDepth: MockFunction
    readonly drawArrays: MockFunction
    readonly drawElements: MockFunction
    readonly COLOR_BUFFER_BIT: number
    readonly DEPTH_BUFFER_BIT: number
    readonly ARRAY_BUFFER: number
    readonly ELEMENT_ARRAY_BUFFER: number
    readonly STATIC_DRAW: number
    readonly FLOAT: number
    readonly TRIANGLES: number
    readonly UNSIGNED_SHORT: number
    readonly TEXTURE_2D: number
    readonly TEXTURE0: number
    readonly RGBA: number
    readonly UNSIGNED_BYTE: number
    readonly FRAMEBUFFER: number
    readonly COLOR_ATTACHMENT0: number
    readonly CLAMP_TO_EDGE: number
    readonly NEAREST: number
    readonly TEXTURE_MIN_FILTER: number
    readonly TEXTURE_MAG_FILTER: number
    readonly TEXTURE_WRAP_S: number
    readonly TEXTURE_WRAP_T: number
    readonly VERTEX_SHADER: number
    readonly FRAGMENT_SHADER: number
    readonly COMPILE_STATUS: number
    readonly LINK_STATUS: number
    readonly DEPTH_TEST: number
    readonly LESS: number
  }
}

export function createWebGlRendererHarness(): WebGlRendererHarness {
  const vertexShader = { kind: "vertex-shader" } as WebGLShader
  const fragmentShader = { kind: "fragment-shader" } as WebGLShader
  const program = { kind: "program" } as WebGLProgram
  const buffer = { kind: "buffer" } as WebGLBuffer
  const texture = { kind: "texture" } as WebGLTexture
  const framebuffer = { kind: "framebuffer" } as WebGLFramebuffer
  const transformUniform = { kind: "uniform-transform" } as unknown as WebGLUniformLocation
  const accentUniform = { kind: "uniform-accent" } as unknown as WebGLUniformLocation
  const textureUniform = { kind: "uniform-texture" } as unknown as WebGLUniformLocation
  const context = {
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    createShader: vi
      .fn()
      .mockImplementation((type: number) => (type === 0x8b31 ? vertexShader : fragmentShader)),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn().mockReturnValue(true),
    getShaderInfoLog: vi.fn().mockReturnValue(""),
    deleteShader: vi.fn(),
    createProgram: vi.fn().mockReturnValue(program),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn().mockReturnValue(true),
    getProgramInfoLog: vi.fn().mockReturnValue(""),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn().mockReturnValue(buffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    createTexture: vi.fn().mockReturnValue(texture),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    activeTexture: vi.fn(),
    deleteTexture: vi.fn(),
    createFramebuffer: vi.fn().mockReturnValue(framebuffer),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    deleteFramebuffer: vi.fn(),
    getAttribLocation: vi
      .fn()
      .mockImplementation((_program: WebGLProgram, name: string) =>
        name === "a_position" ? 0 : 1,
      ),
    getUniformLocation: vi.fn().mockImplementation((_program: WebGLProgram, name: string) => {
      if (name === "u_transform") {
        return transformUniform
      }

      if (name === "u_texture") {
        return textureUniform
      }

      return accentUniform
    }),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    enable: vi.fn(),
    depthFunc: vi.fn(),
    clearDepth: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    UNSIGNED_SHORT: 0x1403,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    CLAMP_TO_EDGE: 0x812f,
    NEAREST: 0x2600,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    DEPTH_TEST: 0x0b71,
    LESS: 0x0201,
  }
  const canvas = {
    width: 0,
    height: 0,
    style: {},
  } as HTMLCanvasElement

  return {
    canvas,
    runtime: {
      context: context as unknown as WebGL2RenderingContext,
      version: "webgl2",
    },
    context,
  }
}
