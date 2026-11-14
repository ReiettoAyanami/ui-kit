import { TestBed } from '@angular/core/testing';

import { LenziLamp, LenziLightField, cssColor } from './light-field';

/** An element at a fixed place on the screen (jsdom lays nothing out). */
function placed(left: number, top: number, width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  document.body.append(element);
  return element;
}

describe('LenziLightField', () => {
  let field: LenziLightField;
  const lamp = (overrides: Partial<LenziLamp> = {}): LenziLamp => ({ on: true, color: '#ff0000', strength: 1, reach: 200, ...overrides });

  beforeEach(() => {
    field = TestBed.inject(LenziLightField);
    document.body.innerHTML = '';
  });

  it('lights a surface near a lamp from the side that faces it, in the lamp’s colour', () => {
    const surface = placed(300, 0, 100, 100);
    field.addSurface(surface);
    field.addLamp(placed(150, 40, 50, 20), () => lamp());
    field.update(1);
    const layer = surface.querySelector<HTMLElement>('.lenzi-lit-lamps')!;
    // the layer is not laid out either: it is where the surface is
    layer.getBoundingClientRect = () => new DOMRect(300, 0, 100, 100);
    field.update(1);
    const image = layer.style.getPropertyValue('--lenzi-lamps');
    expect(layer.classList.contains('lenzi-lit-lamps-on')).toBe(true);
    // from the lamp's right edge (x 200, 100 px left of the surface), at the height of the surface's middle
    expect(image).toContain('at -100px 50px');
    expect(image).toContain('circle 200px');
    expect(image).toContain('#ff0000 100%');
  });

  it('adds the lights of several lamps, the nearest first; never lights a lamp with its own light', () => {
    const surface = placed(300, 0, 100, 100);
    field.addSurface(surface);
    const red = placed(250, 0, 40, 40);
    field.addLamp(red, () => lamp({ color: '#ff0000' }));
    field.addSurface(red);
    field.addLamp(placed(450, 0, 40, 40), () => lamp({ color: '#0000ff' }));
    field.update(1);
    field.update(1);
    const image = surface.querySelector<HTMLElement>('.lenzi-lit-lamps')!.style.getPropertyValue('--lenzi-lamps');
    expect(image.indexOf('#ff0000')).toBeGreaterThan(-1);
    expect(image.indexOf('#0000ff')).toBeGreaterThan(image.indexOf('#ff0000'));
    const own = red.querySelector<HTMLElement>('.lenzi-lit-lamps')?.style.getPropertyValue('--lenzi-lamps') ?? '';
    expect(own).not.toContain('#ff0000');
    expect(own).toContain('#0000ff');
  });

  it('leaves dark what the light does not reach, and goes dark when the lamp switches off', () => {
    const near = placed(0, 0, 100, 100);
    const far = placed(1000, 0, 100, 100);
    field.addSurface(near);
    field.addSurface(far);
    let on = true;
    field.addLamp(placed(120, 0, 20, 20), () => lamp({ on }));
    field.update(1);
    expect(far.querySelector('.lenzi-lit-lamps')).toBeNull();
    expect(near.querySelector('.lenzi-lit-lamps-on')).not.toBeNull();
    on = false;
    // a long frame: the light has faded out
    expect(field.update(10)).toBe(false);
    expect(near.querySelector('.lenzi-lit-lamps-on')).toBeNull();
  });

  it('takes a surface away with its light', () => {
    const surface = placed(0, 0, 100, 100);
    const leave = field.addSurface(surface);
    field.addLamp(placed(120, 0, 20, 20), () => lamp());
    field.update(1);
    expect(surface.querySelector('.lenzi-lit-lamps')).not.toBeNull();
    leave();
    expect(surface.querySelector('.lenzi-lit-lamps')).toBeNull();
  });

  it('writes a variable name as its var()', () => {
    expect(cssColor(' --mat-sys-primary ')).toBe('var(--mat-sys-primary)');
    expect(cssColor('#fff')).toBe('#fff');
  });
});
