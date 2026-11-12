import { TestBed } from '@angular/core/testing';

import { couldNotLoad } from '../util/describe-error';
import { LenziStatusMessage } from './status-message';

describe('LenziStatusMessage', () => {
  function message(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(LenziStatusMessage);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('says "…" while loading, as a status', () => {
    const element = message({ kind: 'loading' });
    expect(element.textContent?.trim()).toBe('…');
    expect(element.getAttribute('role')).toBe('status');
  });

  it('says why a load failed, as an alert', () => {
    const element = message({ kind: 'error', text: couldNotLoad('the substances', { status: 404, title: 'Not found' }) });
    expect(element.textContent?.trim()).toBe('Could not load the substances: Not found (404)');
    expect(element.getAttribute('role')).toBe('alert');
  });

  it('says what is empty', () => {
    expect(message({ text: 'No substances' }).textContent?.trim()).toBe('No substances');
  });
});
