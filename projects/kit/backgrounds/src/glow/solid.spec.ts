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
    // with its outline, read at every frame: none given, its box
    expect(caster).toHaveBeenCalledWith(block, expect.any(Function));
    expect(caster.mock.calls[0]![1]!()).toBeNull();
    expect(surface).toHaveBeenCalledWith(block);
    expect(block.children.length).toBe(1);
    // see-through by itself: it takes the page's surface, so nothing under it shows
    expect(block.classList.contains('lenzi-solid-fill')).toBe(true);
  });

  it('keeps a colour of its own when it has one', async () => {
    @Component({ imports: [LenziSolid], template: `<div lenziSolid style="background-color: rgb(10, 20, 30)"></div>` })
    class Filled {}
    const fixture = TestBed.createComponent(Filled);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('div')!.classList.contains('lenzi-solid-fill')).toBe(false);
  });
});
