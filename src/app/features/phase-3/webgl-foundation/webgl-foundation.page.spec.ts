import { ActivatedRoute } from "@angular/router"
import { TestBed } from "@angular/core/testing"

import { WebGlFoundationPageComponent } from "./webgl-foundation.page"

describe("WebGlFoundationPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlFoundationPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: "PLATFORM_ID", useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the Phase 3 title", () => {
    const fixture = TestBed.createComponent(WebGlFoundationPageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL foundation")
  })
})
