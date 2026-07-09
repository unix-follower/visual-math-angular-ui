import { TestBed } from "@angular/core/testing"
import { provideRouter, Router } from "@angular/router"

import { App } from "./app"
import { routes } from "./app.routes"

describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents()
  })

  it("should create the app", () => {
    const fixture = TestBed.createComponent(App)
    const app = fixture.componentInstance
    expect(app).toBeTruthy()
  })

  it("should render the application shell", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)
    await router.navigateByUrl("/")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("h1")?.textContent).toContain("Visual Math Lab")
    expect(compiled.textContent).toContain("Phase 1 complete, Phase 2 complete, Phase 3 started")
  })

  it("should render the vector explorer route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/linear-algebra/vectors")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Linear Algebra vector explorer")
  })

  it("should render the quadratic plotter route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/algebra/quadratic-plotter")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Quadratic plotter")
  })

  it("should render the triangle explorer route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/geometry/triangle-explorer")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Triangle explorer")
  })

  it("should render the payoff matrix lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/game-theory/payoff-matrix-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Payoff matrix lab")
  })

  it("should render the derivative lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/calculus/derivative-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Derivative lab")
  })

  it("should render the integral lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/calculus/integral-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Integral lab")
  })

  it("should render the limits lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/calculus/limits-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Limits lab")
  })

  it("should render the graph traversal lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/discrete-math/graph-traversal-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Graph traversal lab")
  })

  it("should render the unit circle route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/trigonometry/unit-circle")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Unit circle explorer")
  })

  it("should render the sampling lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/statistics-probability/sampling-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Sampling lab")
  })

  it("should render the distribution lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/statistics-probability/distribution-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Distribution lab")
  })

  it("should render the Euler characteristic lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/topology/euler-characteristic-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Euler characteristic lab")
  })

  it("should render the partial derivatives lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/multivariable-calculus/partial-derivatives-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Partial derivatives lab")
  })

  it("should render the modular arithmetic lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/number-theory/modular-arithmetic-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Modular arithmetic lab")
  })

  it("should render the gradient descent lab route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/optimization/gradient-descent-lab")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("Gradient descent lab")
  })

  it("should render the WebGPU foundation route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-foundation")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU foundation")
  })

  it("should render the Phase 2 index route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("Phase 2 index")
    expect(compiled.textContent).toContain("13 WebGPU routes live")
  })

  it("should render the Phase 3 index route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain("Phase 3 index")
    expect(compiled.textContent).toContain("18 WebGL routes live")
  })

  it("should render the WebGPU gradient quad route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-gradient-quad")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU gradient quad")
  })

  it("should render the WebGPU indexed polygon route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-indexed-polygon")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU indexed polygon")
  })

  it("should render the WebGPU pulse diamond route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-pulse-diamond")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU pulse diamond")
  })

  it("should render the WebGPU uniform transform route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-uniform-transform")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU uniform transform")
  })

  it("should render the WebGPU storage palette route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-storage-palette")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU storage palette")
  })

  it("should render the WebGPU texture grid route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-texture-grid")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU texture grid")
  })

  it("should render the WebGPU sampler wave route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-sampler-wave")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU sampler wave")
  })

  it("should render the WebGPU dual pass route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-dual-pass")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU dual pass")
  })

  it("should render the WebGPU compute ripple route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-compute-ripple")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU compute ripple")
  })

  it("should render the WebGPU instanced lattice route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-instanced-lattice")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU instanced lattice")
  })

  it("should render the WebGPU indirect ribbon route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-indirect-ribbon")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU indirect ribbon")
  })

  it("should render the WebGPU indirect indexed polygon route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-2/webgpu-indirect-indexed-polygon")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGPU indirect indexed polygon")
  })

  it("should render the WebGL foundation route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-foundation")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL foundation")
  })

  it("should render the WebGL gradient triangle route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-gradient-triangle")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL gradient triangle")
  })

  it("should render the WebGL uniform transform route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-uniform-transform")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL uniform transform")
  })

  it("should render the WebGL indexed polygon route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-indexed-polygon")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL indexed polygon")
  })

  it("should render the WebGL texture grid route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-texture-grid")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL texture grid")
  })

  it("should render the WebGL perspective camera route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-perspective-camera")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL perspective camera")
  })

  it("should render the WebGL depth prism route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-depth-prism")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL depth prism")
  })

  it("should render the WebGL lit material route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-lit-material")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL lit material")
  })

  it("should render the WebGL shadow relief route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-shadow-relief")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL shadow relief")
  })

  it("should render the WebGL textured material route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-textured-material")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL textured material")
  })

  it("should render the WebGL dual pass route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-dual-pass")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL dual pass")
  })

  it("should render the WebGL bloom blur route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-bloom-blur")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL bloom blur")
  })

  it("should render the WebGL ping-pong feedback route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-ping-pong-feedback")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL ping-pong feedback")
  })

  it("should render the WebGL feedback trails route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-feedback-trails")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL feedback trails")
  })

  it("should render the WebGL temporal feedback route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-temporal-feedback")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL temporal feedback")
  })

  it("should render the WebGL velocity field route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-velocity-field")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL velocity field")
  })

  it("should render the WebGL interactive dye route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-interactive-dye")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL interactive dye")
  })

  it("should render the WebGL multi-obstacle flow route", async () => {
    const fixture = TestBed.createComponent(App)
    const router = TestBed.inject(Router)

    await router.navigateByUrl("/phase-3/webgl-multi-obstacle-flow")
    await fixture.whenStable()
    fixture.detectChanges()

    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("canvas")).toBeTruthy()
    expect(compiled.textContent).toContain("WebGL multi-obstacle flow")
  })
})
