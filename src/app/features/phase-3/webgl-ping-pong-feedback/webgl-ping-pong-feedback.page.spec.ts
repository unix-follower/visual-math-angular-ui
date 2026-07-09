import { PLATFORM_ID } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { ActivatedRoute } from "@angular/router"

import { WebGlPingPongFeedbackPageComponent } from "./webgl-ping-pong-feedback.page"

describe("WebGlPingPongFeedbackPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebGlPingPongFeedbackPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: PLATFORM_ID, useValue: "server" },
      ],
    }).compileComponents()
  })

  it("creates the page and exposes the ping-pong feedback title", () => {
    const fixture = TestBed.createComponent(WebGlPingPongFeedbackPageComponent)
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("WebGL ping-pong feedback")
  })
})
