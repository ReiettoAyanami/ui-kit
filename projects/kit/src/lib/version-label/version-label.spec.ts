import { TestBed } from '@angular/core/testing';

import { LenziVersionLabel } from './version-label';

describe('LenziVersionLabel', () => {
  it('shows nothing until it has a version, then the version', () => {
    const fixture = TestBed.createComponent(LenziVersionLabel);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent?.trim()).toBe('');

    fixture.componentRef.setInput('version', 'dev26.0.0.0002');
    fixture.detectChanges();
    expect(element.querySelector('.version')?.textContent?.trim()).toBe('dev26.0.0.0002');
  });
});
