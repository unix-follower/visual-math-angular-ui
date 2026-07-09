import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { WebGlDepthPrismPageComponent } from "./webgl-depth-prism.page"

describe("WebGlDepthPrismPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlDepthPrismPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the depth-prism title", () => {
    const fixture = TestBed.createComponent(WebGlDepthPrismPageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL depth prism")
  })
})
