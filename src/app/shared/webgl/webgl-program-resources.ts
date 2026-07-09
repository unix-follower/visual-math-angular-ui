export function createLinkedWebGlProgram(
  context: WebGL2RenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string,
): WebGLProgram {
  const vertexShader = compileWebGlShader(context, context.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compileWebGlShader(context, context.FRAGMENT_SHADER, fragmentShaderSource)

  try {
    const program = context.createProgram()

    if (!program) {
      throw new Error("WebGL program creation failed.")
    }

    context.attachShader(program, vertexShader)
    context.attachShader(program, fragmentShader)
    context.linkProgram(program)

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      throw new Error(context.getProgramInfoLog(program) ?? "WebGL program link failed.")
    }

    return program
  } finally {
    context.deleteShader(vertexShader)
    context.deleteShader(fragmentShader)
  }
}

export function createRequiredWebGlBuffer(context: WebGL2RenderingContext): WebGLBuffer {
  const buffer = context.createBuffer()

  if (!buffer) {
    throw new Error("WebGL buffer creation failed.")
  }

  return buffer
}

export function compileWebGlShader(
  context: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = context.createShader(type)

  if (!shader) {
    throw new Error("WebGL shader creation failed.")
  }

  context.shaderSource(shader, source)
  context.compileShader(shader)

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const info = context.getShaderInfoLog(shader) ?? "WebGL shader compile failed."
    context.deleteShader(shader)
    throw new Error(info)
  }

  return shader
}
