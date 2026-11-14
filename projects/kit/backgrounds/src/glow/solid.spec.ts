import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziLightField } from './light-field';
import { LenziSolid } from './solid';

@Component({
  imports: [LenziSolid],
  template: `<div lenziSolid class="block"><p>Solid</p></div>`,
})
class Host {}

describe('LenziSolid', () => {
  it('is a solid surface that casts a shadow, and puts nothing inside it', async () => {
    const field = TestBed.inject(LenziLightField);
    const caster = vi.spyOn(field, 'addCaster');
    const surface = vi.spyOn(field, 'addSurface');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const block = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.block')!;
    expect(block.classList.contains('lenzi-solid')).toBe(true);
    // not glass
    expect(block.classList.contains('lenzi-lit')).toBe(false);
    expect(caster).toHaveBeenCalledWith(block);
    expect(surface).toHaveBeenCalledWith(block);
    expect(block.children.length).toBe(1);
  });
});
