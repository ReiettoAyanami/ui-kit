import { TestBed } from '@angular/core/testing';

import { KitVersionLabel } from './version-label';

describe('KitVersionLabel', () => {
  it('shows nothing until it has a version, then the version', () => {
    const fixture = TestBed.createComponent(KitVersionLabel);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent?.trim()).toBe('');

    fixture.componentRef.setInput('version', 'dev26.0.0.0002');
    fixture.detectChanges();
    expect(element.querySelector('.version')?.textContent?.trim()).toBe('dev26.0.0.0002');
  });
});
