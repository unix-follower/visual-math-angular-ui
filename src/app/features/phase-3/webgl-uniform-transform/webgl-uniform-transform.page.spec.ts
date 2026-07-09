import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { WebGlUniformTransformPageComponent } from "./webgl-uniform-transform.page"

describe("WebGlUniformTransformPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlUniformTransformPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the uniform-transform route title", () => {
    const fixture = TestBed.createComponent(WebGlUniformTransformPageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL uniform transform")
  })
})
