import { vi } from "vitest"
import { type WebGpuCanvasRuntime } from "./webgpu-bootstrap"

type MockFunction = ReturnType<typeof vi.fn>

export type WebGpuRendererHarness = {
  readonly canvas: HTMLCanvasElement
  readonly runtime: WebGpuCanvasRuntime
  readonly device: {
    readonly queue: {
      readonly submit: MockFunction
      readonly writeBuffer: MockFunction
      readonly writeTexture: MockFunction
    }
    readonly createCommandEncoder: MockFunction
    readonly createShaderModule: MockFunction
    readonly createComputePipeline: MockFunction
    readonly createRenderPipeline: MockFunction
    readonly createBuffer: MockFunction
    readonly createTexture: MockFunction
    readonly createSampler: MockFunction
    readonly createBindGroup: MockFunction
  }
  readonly queue: {
    readonly submit: MockFunction
    readonly writeBuffer: MockFunction
    readonly writeTexture: MockFunction
  }
  readonly pass: {
    readonly setPipeline: MockFunction
    readonly setBindGroup: MockFunction
    readonly setVertexBuffer: MockFunction
    readonly setIndexBuffer: MockFunction
    readonly draw: MockFunction
    readonly drawIndirect: MockFunction
    readonly drawIndexed: MockFunction
    readonly drawIndexedIndirect: MockFunction
    readonly end: MockFunction
  }
  readonly computePass: {
    readonly setPipeline: MockFunction
    readonly setBindGroup: MockFunction
    readonly dispatchWorkgroups: MockFunction
    readonly end: MockFunction
  }
  readonly pipeline: GPURenderPipeline
  readonly computePipeline: GPUComputePipeline
  readonly bindGroup: GPUBindGroup
  readonly bindGroupLayout: GPUBindGroupLayout
  readonly shaderModule: GPUShaderModule
  readonly vertexBuffers: readonly GPUBuffer[]
  readonly vertexBufferDestroyers: readonly MockFunction[]
  readonly texture: GPUTexture
  readonly textureView: GPUTextureView
  readonly textureDestroy: MockFunction
  readonly sampler: GPUSampler
}

export function installMockGpuBufferUsage(): {
  restore(): void
} {
  const originalGpuBufferUsage = (
    globalThis as typeof globalThis & {
      GPUBufferUsage?: {
        readonly VERTEX: number
        readonly COPY_DST: number
        readonly INDEX?: number
        readonly INDIRECT?: number
        readonly UNIFORM?: number
        readonly STORAGE?: number
      }
    }
  ).GPUBufferUsage

  Object.defineProperty(globalThis, "GPUBufferUsage", {
    configurable: true,
    value: {
      VERTEX: 1,
      COPY_DST: 2,
      INDEX: 4,
      INDIRECT: 8,
      UNIFORM: 16,
      STORAGE: 32,
    },
  })

  return {
    restore(): void {
      Object.defineProperty(globalThis, "GPUBufferUsage", {
        configurable: true,
        value: originalGpuBufferUsage,
      })
    },
  }
}

export function installMockGpuTextureUsage(): {
  restore(): void
} {
  const originalGpuTextureUsage = (
    globalThis as typeof globalThis & {
      GPUTextureUsage?: { readonly COPY_DST: number; readonly TEXTURE_BINDING: number }
    }
  ).GPUTextureUsage

  Object.defineProperty(globalThis, "GPUTextureUsage", {
    configurable: true,
    value: {
      COPY_DST: 1,
      TEXTURE_BINDING: 2,
      RENDER_ATTACHMENT: 4,
    },
  })

  return {
    restore(): void {
      Object.defineProperty(globalThis, "GPUTextureUsage", {
        configurable: true,
        value: originalGpuTextureUsage,
      })
    },
  }
}

export function createWebGpuRendererHarness(bufferCount = 1): WebGpuRendererHarness {
  const bindGroupLayout = { kind: "bind-group-layout" } as unknown as GPUBindGroupLayout
  const bindGroup = { kind: "bind-group" } as unknown as GPUBindGroup
  const computePipeline = {
    kind: "compute-pipeline",
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPUComputePipeline
  const pipeline = {
    kind: "pipeline",
    getBindGroupLayout: vi.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const shaderModule = { kind: "shader-module" } as unknown as GPUShaderModule
  const commandBuffer = { kind: "command-buffer" } as unknown as GPUCommandBuffer
  const textureView = { kind: "texture-view" } as unknown as GPUTextureView
  const textureDestroy = vi.fn()
  const texture = {
    kind: "texture",
    createView: vi.fn().mockReturnValue(textureView),
    destroy: textureDestroy,
  } as unknown as GPUTexture
  const sampler = { kind: "sampler" } as unknown as GPUSampler
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    setVertexBuffer: vi.fn(),
    setIndexBuffer: vi.fn(),
    draw: vi.fn(),
    drawIndirect: vi.fn(),
    drawIndexed: vi.fn(),
    drawIndexedIndirect: vi.fn(),
    end: vi.fn(),
  }
  const computePass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    dispatchWorkgroups: vi.fn(),
    end: vi.fn(),
  }
  const encoder = {
    beginComputePass: vi.fn().mockReturnValue(computePass),
    beginRenderPass: vi.fn().mockReturnValue(pass),
    finish: vi.fn().mockReturnValue(commandBuffer),
  }
  const queue = {
    submit: vi.fn(),
    writeBuffer: vi.fn(),
    writeTexture: vi.fn(),
  }
  const vertexBufferDestroyers = Array.from({ length: bufferCount }, () => vi.fn())
  const vertexBuffers = vertexBufferDestroyers.map(
    (destroy, index) => ({ kind: `buffer-${index}`, destroy }) as unknown as GPUBuffer,
  )
  const device = {
    queue,
    createCommandEncoder: vi.fn().mockReturnValue(encoder),
    createShaderModule: vi.fn().mockReturnValue(shaderModule),
    createComputePipeline: vi.fn().mockReturnValue(computePipeline),
    createRenderPipeline: vi.fn().mockReturnValue(pipeline),
    createTexture: vi.fn().mockReturnValue(texture),
    createSampler: vi.fn().mockReturnValue(sampler),
    createBindGroup: vi.fn().mockReturnValue(bindGroup),
    createBuffer: vi
      .fn()
      .mockImplementation(
        () =>
          vertexBuffers[
            Math.min(device.createBuffer.mock.calls.length - 1, vertexBuffers.length - 1)
          ],
      ),
  }
  const runtime: WebGpuCanvasRuntime = {
    adapter: {} as GPUAdapter,
    device: device as unknown as GPUDevice,
    context: {
      configure: vi.fn(),
      getCurrentTexture: vi.fn().mockReturnValue({
        createView: vi.fn().mockReturnValue(textureView),
      }),
    } as unknown as GPUCanvasContext,
    format: "bgra8unorm",
  }
  const canvas = {
    width: 0,
    height: 0,
    style: {},
  } as HTMLCanvasElement

  return {
    canvas,
    runtime,
    device,
    queue,
    pass,
    computePass,
    pipeline,
    computePipeline,
    bindGroup,
    bindGroupLayout,
    shaderModule,
    vertexBuffers,
    vertexBufferDestroyers,
    texture,
    textureView,
    textureDestroy,
    sampler,
  }
}
