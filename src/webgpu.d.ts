type GPUTextureFormat = string
type GPUVertexFormat = string
type GPUVertexStepMode = "vertex" | "instance"
type GPUIndexFormat = "uint16" | "uint32"
type GPUBufferUsageFlags = number
type GPUTextureUsageFlags = number
type GPUBindingResource = GPUBufferBinding | GPUTextureView | GPUSampler
type GPUCanvasAlphaMode = "opaque" | "premultiplied"
type GPULoadOp = "load" | "clear"
type GPUStoreOp = "store" | "discard"

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>
  getPreferredCanvasFormat(): GPUTextureFormat
}

interface GPURequestAdapterOptions {
  powerPreference?: "low-power" | "high-performance"
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>
}

interface GPUDeviceDescriptor {
  label?: string
}

interface GPUDevice {
  readonly queue: GPUQueue
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup
  destroy?(): void
}

interface GPUQueue {
  submit(commandBuffers: Iterable<GPUCommandBuffer>): void
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource): void
  writeTexture(
    destination: GPUImageCopyTexture,
    data: BufferSource,
    dataLayout: GPUImageDataLayout,
    size: GPUExtent3DDict,
  ): void
}

interface GPUShaderModuleDescriptor {
  label?: string
  code: string
}

interface GPUShaderModule {}

interface GPURenderPipelineDescriptor {
  label?: string
  layout?: "auto"
  vertex: GPUVertexState
  fragment?: GPUFragmentState
  primitive?: GPUPrimitiveState
}

interface GPUComputePipelineDescriptor {
  label?: string
  layout?: "auto"
  compute: GPUComputeState
}

interface GPUComputeState {
  module: GPUShaderModule
  entryPoint: string
}

interface GPUVertexState {
  module: GPUShaderModule
  entryPoint: string
  buffers?: GPUVertexBufferLayout[]
}

interface GPUVertexBufferLayout {
  arrayStride: number
  attributes: GPUVertexAttribute[]
  stepMode?: GPUVertexStepMode
}

interface GPUVertexAttribute {
  shaderLocation: number
  offset: number
  format: GPUVertexFormat
}

interface GPUFragmentState {
  module: GPUShaderModule
  entryPoint: string
  targets: GPUColorTargetState[]
}

interface GPUColorTargetState {
  format: GPUTextureFormat
}

interface GPUPrimitiveState {
  topology?: "triangle-list"
}

interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout
}

interface GPUBindGroupLayout {}

interface GPUBindGroup {}

interface GPUBufferBinding {
  buffer: GPUBuffer
  offset?: number
  size?: number
}

interface GPUBindGroupEntry {
  binding: number
  resource: GPUBindingResource
}

interface GPUBindGroupDescriptor {
  label?: string
  layout: GPUBindGroupLayout
  entries: GPUBindGroupEntry[]
}

interface GPUBufferDescriptor {
  label?: string
  size: number
  usage: GPUBufferUsageFlags
  mappedAtCreation?: boolean
}

interface GPUBuffer {
  destroy?(): void
}

interface GPUTextureDescriptor {
  label?: string
  size: GPUExtent3DDict
  format: GPUTextureFormat
  usage: GPUTextureUsageFlags
  dimension?: "2d"
  mipLevelCount?: number
  sampleCount?: number
}

interface GPUSamplerDescriptor {
  label?: string
  magFilter?: GPUFilterMode
  minFilter?: GPUFilterMode
  mipmapFilter?: GPUFilterMode
}

type GPUFilterMode = "nearest" | "linear"

interface GPUOrigin3DDict {
  x?: number
  y?: number
  z?: number
}

interface GPUImageCopyTexture {
  texture: GPUTexture
  mipLevel?: number
  origin?: GPUOrigin3DDict
}

interface GPUImageDataLayout {
  offset?: number
  bytesPerRow?: number
  rowsPerImage?: number
}

interface GPUExtent3DDict {
  width: number
  height?: number
  depthOrArrayLayers?: number
}

interface GPUCommandEncoderDescriptor {
  label?: string
}

interface GPUCommandEncoder {
  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder
  finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer
}

interface GPUCommandBufferDescriptor {
  label?: string
}

interface GPUCommandBuffer {}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup): void
  setVertexBuffer(slot: number, buffer: GPUBuffer): void
  setIndexBuffer(
    buffer: GPUBuffer,
    indexFormat: GPUIndexFormat,
    offset?: number,
    size?: number,
  ): void
  draw(
    vertexCount: number,
    instanceCount?: number,
    firstVertex?: number,
    firstInstance?: number,
  ): void
  drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void
  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number,
  ): void
  drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void
  end(): void
}

interface GPUComputePassDescriptor {
  label?: string
}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup): void
  dispatchWorkgroups(
    workgroupCountX: number,
    workgroupCountY?: number,
    workgroupCountZ?: number,
  ): void
  end(): void
}

interface GPUCanvasContext {
  configure(configuration: GPUCanvasConfiguration): void
  unconfigure?(): void
  getCurrentTexture(): GPUTexture
}

interface GPUCanvasConfiguration {
  device: GPUDevice
  format: GPUTextureFormat
  alphaMode?: GPUCanvasAlphaMode
}

interface GPUTexture {
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView
  destroy?(): void
}

interface GPUTextureViewDescriptor {
  label?: string
}

interface GPUTextureView {}

interface GPUSampler {}

interface GPUColorDict {
  r: number
  g: number
  b: number
  a: number
}

interface GPURenderPassColorAttachment {
  view: GPUTextureView
  clearValue?: GPUColorDict
  loadOp: GPULoadOp
  storeOp: GPUStoreOp
}

interface GPURenderPassDescriptor {
  colorAttachments: GPURenderPassColorAttachment[]
}

interface HTMLCanvasElement {
  getContext(contextId: "webgpu"): GPUCanvasContext | null
}

interface Navigator {
  gpu?: GPU
}

declare const GPUBufferUsage: {
  readonly COPY_DST: GPUBufferUsageFlags
  readonly INDIRECT: GPUBufferUsageFlags
  readonly INDEX: GPUBufferUsageFlags
  readonly STORAGE: GPUBufferUsageFlags
  readonly UNIFORM: GPUBufferUsageFlags
  readonly VERTEX: GPUBufferUsageFlags
}

declare const GPUTextureUsage: {
  readonly COPY_DST: GPUTextureUsageFlags
  readonly RENDER_ATTACHMENT: GPUTextureUsageFlags
  readonly TEXTURE_BINDING: GPUTextureUsageFlags
}
