import { TestBed } from '@angular/core/testing';

import { LenziThreeCanvas } from './three-canvas';

describe('LenziThreeCanvas', () => {
  it('without WebGL says so, keeps its label as an image, and never runs the setup', async () => {
    let setups = 0;
    const fixture = TestBed.createComponent(LenziThreeCanvas);
    fixture.componentRef.setInput('label', 'A violet icosahedron, turning');
    fixture.componentRef.setInput('setup', () => {
      setups++;
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.box')?.getAttribute('role')).toBe('img');
    expect(element.querySelector('.box')?.getAttribute('aria-label')).toBe('A violet icosahedron, turning');
    expect(element.querySelector('.unavailable')?.textContent?.trim()).toBe('3D is not available on this device.');
    expect(setups).toBe(0);
    expect(element.style.height).toBe('320px');
  });
});
