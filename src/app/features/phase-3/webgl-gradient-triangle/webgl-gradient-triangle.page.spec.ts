import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { WebGlGradientTrianglePageComponent } from "./webgl-gradient-triangle.page"

describe("WebGlGradientTrianglePageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlGradientTrianglePageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the geometry route title", () => {
    const fixture = TestBed.createComponent(WebGlGradientTrianglePageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL gradient triangle")
  })
})
