import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE } from "./webgl-multi-obstacle-flow.model"
import { WebGlMultiObstacleFlowPageComponent } from "./webgl-multi-obstacle-flow.page"

describe("WebGlMultiObstacleFlowPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlMultiObstacleFlowPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the multi-obstacle flow title", () => {
    const fixture = TestBed.createComponent(WebGlMultiObstacleFlowPageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL multi-obstacle flow")
  })

  it("drags the closest obstacle and then resumes injection steering after release", () => {
    const fixture = TestBed.createComponent(WebGlMultiObstacleFlowPageComponent)
    const component = fixture.componentInstance as WebGlMultiObstacleFlowPageComponent & {
      handleViewportPointer(event: PointerEvent): void
      primaryX: { (): number }
      primaryY: { (): number }
      secondaryX: { (): number }
      secondaryY: { (): number }
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

    const pointerDown = new PointerEvent("pointerdown", { clientX: 40, clientY: 50 })
    Object.defineProperty(pointerDown, "target", { value: target })
    component.handleViewportPointer(pointerDown)

    const pointerMove = new PointerEvent("pointermove", { clientX: 52, clientY: 28 })
    Object.defineProperty(pointerMove, "target", { value: target })
    component.handleViewportPointer(pointerMove)

    expect(component.primaryX()).toBe(0.52)
    expect(component.primaryY()).toBe(0.72)

    const pointerUp = new PointerEvent("pointerup", { clientX: 52, clientY: 28 })
    Object.defineProperty(pointerUp, "target", { value: target })
    component.handleViewportPointer(pointerUp)

    const injectionMove = new PointerEvent("pointermove", { clientX: 82, clientY: 18 })
    Object.defineProperty(injectionMove, "target", { value: target })
    component.handleViewportPointer(injectionMove)

    expect(component.injectionX()).toBeCloseTo(0.82, 6)
    expect(component.injectionY()).toBeCloseTo(0.82, 6)
    expect(component.secondaryX()).toBe(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryX)
    expect(component.secondaryY()).toBe(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryY)
  })
})
