import {
  buildWorkbenchShareUrl,
  deserializeWorkbenchScene,
  serializeWorkbenchScene,
} from "./math-workbench-state"

type ExampleScene = {
  readonly value: number
}

describe("math-workbench-state", () => {
  it("should serialize and deserialize a scene", () => {
    const scene: ExampleScene = { value: 7 }
    const serialized = serializeWorkbenchScene(scene)

    const deserialized = deserializeWorkbenchScene(
      serialized,
      (value): value is ExampleScene =>
        !!value &&
        typeof value === "object" &&
        typeof (value as Record<string, unknown>)["value"] === "number",
    )

    expect(deserialized).toEqual(scene)
  })

  it("should reject malformed serialized state", () => {
    const deserialized = deserializeWorkbenchScene(
      "not-json",
      (value): value is ExampleScene => !!value && typeof value === "object",
    )

    expect(deserialized).toBeNull()
  })

  it("should build a share url using the current origin", () => {
    const shareUrl = buildWorkbenchShareUrl("/geometry/triangle-explorer", { value: 3 })

    expect(shareUrl).toContain("/geometry/triangle-explorer?state=")
    expect(shareUrl.startsWith(globalThis.location.origin)).toBe(true)
  })
})
