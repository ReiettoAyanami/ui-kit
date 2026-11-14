import { TestBed } from '@angular/core/testing';

import { LenziLamp, LenziLightField, above, cssColor, shadowOf } from './light-field';

/** An element at a fixed place on the screen (jsdom lays nothing out). */
function placed(left: number, top: number, width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  document.body.append(element);
  return element;
}

const veil = (element: HTMLElement) => element.style.getPropertyValue('--lenzi-lamps-veil');

describe('LenziLightField', () => {
  let field: LenziLightField;
  const lamp = (overrides: Partial<LenziLamp> = {}): LenziLamp => ({ on: true, color: '#ff0000', strength: 1, reach: 200, ...overrides });

  beforeEach(() => {
    field = TestBed.inject(LenziLightField);
    document.body.innerHTML = '';
  });

  it('lights a surface near a lamp from the side that faces it, in the lamp’s colour, without putting anything inside it', () => {
    const surface = placed(300, 0, 100, 100);
    field.addSurface(surface);
    field.addLamp(placed(150, 40, 50, 20), () => lamp());
    field.update(1);
    const image = veil(surface);
    // from the lamp's right edge (x 200, 100 px left of the surface), at the height of the surface's middle
    expect(image).toContain('at -100px 50px');
    expect(image).toContain('circle 200px');
    // as much as the global variable says
    expect(image).toContain('color-mix(in srgb, #ff0000 min(100%, calc(var(--lenzi-glow-veil) * 1)), transparent)');
    expect(surface.style.getPropertyValue('--lenzi-lamps-rim')).toContain('var(--lenzi-glow-rim)');
    expect(surface.children.length).toBe(0);
  });

  it('adds the lights of several lamps, the nearest first; a lamp lights what it holds with its own light', () => {
    const surface = placed(300, 0, 100, 100);
    field.addSurface(surface);
    const red = placed(250, 0, 40, 40);
    field.addLamp(red, () => lamp({ color: '#ff0000' }));
    field.addSurface(red);
    field.addLamp(placed(450, 0, 40, 40), () => lamp({ color: '#0000ff' }));
    field.update(1);
    const image = veil(surface);
    expect(image.indexOf('#ff0000')).toBeGreaterThan(-1);
    expect(image.indexOf('#0000ff')).toBeGreaterThan(image.indexOf('#ff0000'));
    const own = veil(red);
    expect(own).toContain('radial-gradient(circle 200px');
    expect(own).toContain('#0000ff');
    // its own light: even, not from a side
    expect(own).toMatch(/linear-gradient\(color-mix\(in srgb, #ff0000 /);
    expect(own).not.toMatch(/radial-gradient[^)]*#ff0000/);
  });

  it('leaves dark what the light does not reach, and goes dark when the lamp switches off', () => {
    const near = placed(0, 0, 100, 100);
    const far = placed(1000, 0, 100, 100);
    field.addSurface(near);
    field.addSurface(far);
    let on = true;
    field.addLamp(placed(120, 0, 20, 20), () => lamp({ on }));
    field.update(1);
    expect(veil(far)).toBe('');
    expect(veil(near)).not.toBe('');
    on = false;
    // a long frame: the light has faded out
    expect(field.update(10)).toBe(false);
    expect(veil(near)).toBe('');
  });

  it('takes a surface away with its light', () => {
    const surface = placed(0, 0, 100, 100);
    const leave = field.addSurface(surface);
    field.addLamp(placed(120, 0, 20, 20), () => lamp());
    field.update(1);
    expect(veil(surface)).not.toBe('');
    leave();
    expect(veil(surface)).toBe('');
  });

  it('gives the paint worklet each light, and the shadow a solid element casts from it onto the surface', () => {
    // a floor, a lamp at its left, a solid block between them and the right part of the floor
    const floor = placed(0, 0, 1000, 400);
    field.addSurface(floor);
    field.addLamp(placed(90, 190, 20, 20), () => lamp({ reach: 600 }));
    const block = placed(300, 150, 100, 100);
    field.addCaster(block);
    field.update(1);
    const raw = floor.style.getPropertyValue('--lenzi-light-data');
    expect(raw.startsWith("'") && raw.endsWith("'")).toBe(true);
    const [[x, y, reach, r, g, b, strength, shadows]] = JSON.parse(raw.slice(1, -1));
    // the lamp is inside the floor: its light comes from the point nearest the floor's middle
    expect([x, y, reach, strength]).toEqual([110, 200, 600, 1]);
    expect([r, g, b]).toHaveLength(3);
    expect(shadows).toHaveLength(1);
    const xs = (shadows[0] as number[]).filter((_, index) => index % 2 === 0);
    // the shadow starts at the block and goes away from the lamp, to the right
    expect(Math.min(...xs)).toBe(300);
    expect(Math.max(...xs)).toBeGreaterThan(3000);
  });

  it('casts no shadow from the lamp itself, nor onto the solid element, nor from a block the lamp is inside', () => {
    const block = placed(300, 150, 100, 100);
    field.addSurface(block);
    field.addCaster(block);
    const inner = placed(320, 170, 20, 20);
    field.addLamp(inner, () => lamp());
    field.addCaster(inner);
    const floor = placed(0, 0, 1000, 400);
    field.addSurface(floor);
    field.update(1);
    const [[, , , , , , , onFloor]] = JSON.parse(floor.style.getPropertyValue('--lenzi-light-data').slice(1, -1));
    expect(onFloor).toEqual([]);
    const [[, , , , , , , onBlock]] = JSON.parse(block.style.getPropertyValue('--lenzi-light-data').slice(1, -1));
    expect(onBlock).toEqual([]);
  });

  it('lights surfaces from sources with no element (a background’s blobs), until they are taken away', () => {
    const surface = placed(300, 0, 100, 100);
    field.addSurface(surface);
    const source = {};
    field.setSourceLamps(source, [{ left: 150, top: 40, right: 200, bottom: 60, color: '#00ff00', strength: 0.5, reach: 200 }]);
    field.update(1);
    expect(veil(surface)).toContain('#00ff00');
    field.setSourceLamps(source, []);
    expect(field.update(1)).toBe(false);
    expect(veil(surface)).toBe('');
  });

  it('a shadow is the box and what is behind it, away from the light', () => {
    const shadow = shadowOf({ left: 10, top: 10, right: 20, bottom: 20 }, { x: 0, y: 15 });
    const points = shadow.length / 2;
    expect(points).toBeGreaterThanOrEqual(4);
    // the side that faces the light is part of it
    expect(shadow.join(',')).toContain('10,10');
    expect(shadow.join(',')).toContain('10,20');
    // nothing of it is nearer the light than the box
    for (let i = 0; i < shadow.length; i += 2) expect(shadow[i]).toBeGreaterThanOrEqual(10);
  });

  it('a rounded element casts a rounded shadow: nothing of it sticks out of its corners', () => {
    // a light straight above a 100 × 100 box rounded 20 px
    const shadow = shadowOf({ left: 0, top: 100, right: 100, bottom: 200 }, { x: 50, y: -200 }, 20);
    const points: [number, number][] = [];
    for (let i = 0; i < shadow.length; i += 2) points.push([shadow[i]!, shadow[i + 1]!]);
    // the square corner facing the light is not part of it
    expect(points.some(([x, y]) => x === 0 && y === 100)).toBe(false);
    // every point near the top corners is on the rounded outline (or beyond, away from the light)
    for (const [x, y] of points.filter(([, y]) => y < 120)) {
      const corner = x < 50 ? [20, 120] : [80, 120];
      expect(Math.hypot(x - corner[0]!, y - corner[1]!)).toBeCloseTo(20, 5);
    }
  });

  it('casts a shadow only on what lies under the solid element, never on what lies over it', () => {
    const lampAt = placed(0, 190, 20, 20);
    field.addLamp(lampAt, () => lamp({ reach: 800 }));
    // drawn first: under the next ones
    const under = placed(400, 150, 200, 100);
    field.addSurface(under);
    const block = placed(200, 150, 100, 100);
    field.addCaster(block);
    // drawn after the block: over it
    const over = placed(400, 150, 200, 100);
    field.addSurface(over);
    field.update(1);
    const shadows = (element: HTMLElement) => JSON.parse(element.style.getPropertyValue('--lenzi-light-data').slice(1, -1))[0][7];
    expect(shadows(under)).toHaveLength(1);
    expect(shadows(over)).toEqual([]);
  });

  it('says which of two elements is drawn above: what one holds, then z-index, then the later one', () => {
    const floor = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');
    const inner = document.createElement('span');
    first.append(inner);
    floor.append(first, second);
    document.body.append(floor);
    expect(above(first, floor)).toBe(true);
    expect(above(floor, first)).toBe(false);
    expect(above(second, first)).toBe(true);
    expect(above(inner, second)).toBe(false);
    first.style.position = 'relative';
    first.style.zIndex = '1';
    expect(above(inner, second)).toBe(true);
    expect(above(second, first)).toBe(false);
  });

  it('writes a variable name as its var()', () => {
    expect(cssColor(' --mat-sys-primary ')).toBe('var(--mat-sys-primary)');
    expect(cssColor('#fff')).toBe('#fff');
  });
});
