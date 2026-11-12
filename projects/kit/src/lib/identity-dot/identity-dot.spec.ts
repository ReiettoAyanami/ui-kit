import { TestBed } from '@angular/core/testing';

import { identityColor } from './identity-color';
import { LenziIdentityDot } from './identity-dot';

describe('LenziIdentityDot', () => {
  function dot(inputs: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(LenziIdentityDot);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is drawn in the identity colour of its id, and hidden from screen readers', () => {
    const element = dot({ id: 2 });
    expect(element.style.backgroundColor).toBe(identityColor(2));
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes the offset of a second kind of entity', () => {
    expect(dot({ id: 2, offset: 0.5 }).style.backgroundColor).toBe(identityColor(2, 0.5));
  });

  it('a colour of its own wins; with neither, the neutral outline colour', () => {
    expect(dot({ id: 2, color: 'red' }).style.backgroundColor).toBe('red');
    expect(dot({}).style.backgroundColor).toBe('var(--mat-sys-outline)');
  });
});
