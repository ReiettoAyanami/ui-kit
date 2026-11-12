import { Component, DestroyRef, ElementRef, afterNextRender, booleanAttribute, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Color, Material, Mesh, PerspectiveCamera, SRGBColorSpace, Scene, Texture, WebGLRenderer } from 'three';

/** What a scene's setup gets: the scene to fill, the camera and renderer, and the theme's colours. */
export interface LenziThreeContext {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  /** A theme colour as a three.js Color: a CSS variable (`'--mat-sys-primary'`) or any CSS colour (oklch too). */
  color: (css: string) => Color;
  /** The canvas's size, in CSS px. */
  size: () => { width: number; height: number };
}

/** What a setup can give back. */
export interface LenziThreeScene {
  /** Called at every frame while the canvas is in view and moving: move things. `delta` and `elapsed` in seconds. */
  frame?: (delta: number, elapsed: number) => void;
  /** Called when the scene goes: free what the setup made outside the scene (the canvas frees the scene's geometries, materials and textures). */
  dispose?: () => void;
}

/** Fills the scene: adds meshes and lights, places the camera. Runs again when it changes. */
export type LenziThreeSetup = (context: LenziThreeContext) => LenziThreeScene | void;

/**
 * A three.js canvas (RULES.md, "3D"; three.js is in the kit for later: no app uses it yet). It owns
 * what every 3D view needs and gets wrong: the WebGL renderer with a transparent background (the
 * page's colour shows through), a camera that follows the canvas's size, a frame loop that stops
 * while the canvas is out of view or the tab is hidden, one still frame with reduced motion, and
 * every geometry, material and texture freed when it goes. The scene itself is the page's: its
 * `setup` fills it, in the theme's colours (`color('--mat-sys-primary')`). Without WebGL it says so.
 * three.js is heavy: put the page that uses it behind a lazy route.
 */
@Component({
  selector: 'lenzi-three-canvas',
  imports: [],
  templateUrl: './three-canvas.html',
  styleUrl: './three-canvas.css',
  host: { '[style.height]': 'height()' },
})
export class LenziThreeCanvas {
  /** Fills the scene. */
  readonly setup = input.required<LenziThreeSetup>();
  /** What the picture shows, for a screen reader: the canvas is an image. */
  readonly label = input.required<string>();
  /** The frame loop runs (still false: one frame, drawn again when the size changes). */
  readonly animate = input(true, { transform: booleanAttribute });
  /** The camera's vertical field of view, in degrees. */
  readonly fov = input(50);
  /** How far the camera stands from the centre, on z. */
  readonly distance = input(5);
  /** The canvas's height (CSS); its width is its host's. */
  readonly height = input('320px');
  /** What it says without WebGL. */
  readonly unavailableText = input('3D is not available on this device.');

  protected readonly unavailable = signal(false);
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private renderer: WebGLRenderer | null = null;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private scene = new Scene();
  private current: LenziThreeScene = {};
  private frameId: number | null = null;
  private visible = true;
  private reducedMotion = false;
  private last = 0;
  private elapsed = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const renderer = createRenderer();
      if (!renderer) {
        this.unavailable.set(true);
        return;
      }
      this.renderer = renderer;
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      const box = this.box().nativeElement;
      box.appendChild(renderer.domElement);

      const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.reducedMotion = motion?.matches ?? false;
      const onMotion = (event: MediaQueryListEvent) => {
        this.reducedMotion = event.matches;
        this.loop();
      };
      motion?.addEventListener?.('change', onMotion);

      const resized = new ResizeObserver(() => this.resize());
      resized.observe(box);
      const seen = new IntersectionObserver((entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        this.loop();
      });
      seen.observe(box);
      const onVisibility = () => this.loop();
      document.addEventListener('visibilitychange', onVisibility);

      this.build();
      this.resize();

      destroyRef.onDestroy(() => {
        this.stop();
        resized.disconnect();
        seen.disconnect();
        motion?.removeEventListener?.('change', onMotion);
        document.removeEventListener('visibilitychange', onVisibility);
        this.teardown();
        renderer.dispose();
        renderer.domElement.remove();
        this.renderer = null;
      });
    });

    // A new setup, or another camera: the scene is built again.
    effect(() => {
      this.setup();
      this.fov();
      this.distance();
      untracked(() => {
        if (this.renderer) this.build();
      });
    });
    effect(() => {
      this.animate();
      untracked(() => this.loop());
    });
  }

  /** A theme colour as a three.js Color, resolved by the browser (CSS variables, oklch). */
  private color = (css: string): Color => {
    const probe = document.createElement('span');
    probe.style.display = 'none';
    probe.style.color = css.startsWith('--') ? `var(${css})` : css;
    this.host.nativeElement.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) return new Color(computed);
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
  };

  private size = () => {
    const box = this.box().nativeElement;
    return { width: box.clientWidth, height: box.clientHeight };
  };

  private build(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    this.teardown();
    this.scene = new Scene();
    this.camera.fov = this.fov();
    this.camera.position.set(0, 0, this.distance());
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.elapsed = 0;
    this.current = this.setup()({ scene: this.scene, camera: this.camera, renderer, color: this.color, size: this.size }) ?? {};
    this.render();
    this.loop();
  }

  /** Frees what the scene holds: the setup's own, then every geometry, material and texture. */
  private teardown(): void {
    this.current.dispose?.();
    this.current = {};
    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      mesh.geometry?.dispose();
      const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const material of materials as Material[]) {
        for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
        material.dispose();
      }
    });
    this.scene.clear();
  }

  private resize(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    const { width, height } = this.size();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private render(): void {
    this.renderer?.render(this.scene, this.camera);
  }

  private moving(): boolean {
    return !!this.renderer && this.animate() && this.visible && !this.reducedMotion && !document.hidden;
  }

  /** Starts the frame loop when it should run, stops it when it should not. */
  private loop(): void {
    if (!this.moving()) {
      this.stop();
      return;
    }
    if (this.frameId !== null) return;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.moving()) {
        this.frameId = null;
        return;
      }
      const delta = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.elapsed += delta;
      this.current.frame?.(delta, this.elapsed);
      this.render();
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }
}

/** A WebGL renderer, or null where there is no WebGL (an old device, a test, a blocked GPU). */
function createRenderer(): WebGLRenderer | null {
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return null;
    return new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
}
