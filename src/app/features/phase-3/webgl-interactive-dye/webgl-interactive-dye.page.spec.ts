import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { WebGlInteractiveDyePageComponent } from "./webgl-interactive-dye.page"

describe("WebGlInteractiveDyePageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlInteractiveDyePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the interactive-dye title", () => {
    const fixture = TestBed.createComponent(WebGlInteractiveDyePageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL interactive dye")
  })

  it("drags the obstacle on pointer down and pointer move before releasing the drag", () => {
    const fixture = TestBed.createComponent(WebGlInteractiveDyePageComponent)
    const component = fixture.componentInstance as WebGlInteractiveDyePageComponent & {
      handleViewportPointer(event: PointerEvent): void
      obstacleX: { (): number }
      obstacleY: { (): number }
      injectionX: { (): number }
      injectionY: { (): number }
    }
    const target = document.createElement("div")

    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const pointerDown = new PointerEvent("pointerdown", { clientX: 20, clientY: 80 })
    Object.defineProperty(pointerDown, "target", { value: target })
    component.handleViewportPointer(pointerDown)

    const pointerMove = new PointerEvent("pointermove", { clientX: 60, clientY: 30 })
    Object.defineProperty(pointerMove, "target", { value: target })
    component.handleViewportPointer(pointerMove)

    expect(component.obstacleX()).toBe(0.6)
    expect(component.obstacleY()).toBe(0.7)

    const pointerUp = new PointerEvent("pointerup", { clientX: 60, clientY: 30 })
    Object.defineProperty(pointerUp, "target", { value: target })
    component.handleViewportPointer(pointerUp)

    const injectionMove = new PointerEvent("pointermove", { clientX: 80, clientY: 20 })
    Object.defineProperty(injectionMove, "target", { value: target })
    component.handleViewportPointer(injectionMove)

    expect(component.injectionX()).toBe(0.8)
    expect(component.injectionY()).toBe(0.8)
    expect(component.obstacleX()).toBe(0.6)
    expect(component.obstacleY()).toBe(0.7)
  })
})
