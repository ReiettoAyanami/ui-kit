// Written by hand: the component was generated without its spec.
import { TestBed } from '@angular/core/testing';

import { LenziBackground } from './background';

describe('LenziBackground', () => {
  it('is the colour alone by default, hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(LenziBackground);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.style.backgroundColor).toBe('var(--mat-sys-surface)');
    expect(element.querySelector('.picture')).toBeNull();
    expect(element.classList.contains('lenzi-background-box')).toBe(false);
  });

  it('lays the gradient over the photo, dims and blurs it, and fills a box when asked', async () => {
    const fixture = TestBed.createComponent(LenziBackground);
    fixture.componentRef.setInput('color', '#101014');
    fixture.componentRef.setInput('gradient', 'linear-gradient(red, blue)');
    fixture.componentRef.setInput('image', 'a "b".jpg');
    fixture.componentRef.setInput('dim', 0.4);
    fixture.componentRef.setInput('blur', 10);
    fixture.componentRef.setInput('fill', 'box');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const picture = element.querySelector<HTMLElement>('.picture')!;
    expect(element.classList.contains('lenzi-background-box')).toBe(true);
    expect(picture.style.backgroundImage).toContain('linear-gradient');
    // a quote in the address cannot close the url()
    expect(picture.style.backgroundImage).toContain('%22b%22');
    expect(picture.style.filter).toBe('blur(10px)');
    expect(picture.style.inset).toBe('-20px');
    expect(element.querySelector<HTMLElement>('.veil')!.style.opacity).toBe('0.4');
  });
});
