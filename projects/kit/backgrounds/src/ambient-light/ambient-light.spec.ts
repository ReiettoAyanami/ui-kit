// Written by hand: the service's own spec.
import { TestBed } from '@angular/core/testing';

import { LenziAmbientLight } from './ambient-light';

describe('LenziAmbientLight', () => {
  it('wants the light only while a surface is attached, and puts nothing inside it', () => {
    const ambient = TestBed.inject(LenziAmbientLight);
    expect(ambient.wanted).toBe(false);
    const surface = document.createElement('div');
    document.body.append(surface);
    const detach = ambient.attach(surface);
    expect(ambient.wanted).toBe(true);
    expect(surface.children.length).toBe(0);
    detach();
    expect(ambient.wanted).toBe(false);
    surface.remove();
  });

  it('where no canvas can encode the light, shining changes nothing and dimming an unknown source is harmless', () => {
    const ambient = TestBed.inject(LenziAmbientLight);
    const surface = document.createElement('div');
    document.body.append(surface);
    const detach = ambient.attach(surface);
    const source = {};
    ambient.shine(source, new Uint8Array(4 * 4 * 4), 4, 4, () => ({ left: 0, top: 0, width: 100, height: 100 }));
    expect(surface.style.getPropertyValue('--lenzi-ambient-veil')).toBe('');
    ambient.dim({});
    ambient.dim(source);
    detach();
    surface.remove();
  });
});
