import { TestBed } from '@angular/core/testing';

import { Control } from '../../registry';
import { ControlsPanel } from './controls-panel';

const choice = (key: string, labels: string[]): Control => ({
  key,
  label: key,
  type: 'select',
  default: labels[0]!,
  options: labels.map((label) => ({ value: label, label })),
});

describe('ControlsPanel', () => {
  it('shows few short choices as pills, and as a select the ones that would not fit on one line (2026-11-19)', async () => {
    const fixture = TestBed.createComponent(ControlsPanel);
    fixture.componentRef.setInput('controls', [
      choice('short', ['loading', 'empty', 'error']),
      choice('long', ['blobs', 'a picture', 'nothing (the page as it is)']),
      choice('many', ['a', 'b', 'c', 'd']),
    ]);
    fixture.componentRef.setInput('values', { short: 'loading', long: 'blobs', many: 'a' });
    fixture.detectChanges();
    await fixture.whenStable();
    const panel = fixture.nativeElement as HTMLElement;
    const kind = (key: string) => {
      const label = panel.querySelector(`#label-${key}`)!;
      const field = label.nextElementSibling!;
      return field.tagName === 'MAT-BUTTON-TOGGLE-GROUP' ? 'pills' : field.querySelector('mat-select') ? 'select' : field.tagName;
    };
    expect(kind('short')).toBe('pills');
    expect(kind('long')).toBe('select');
    expect(kind('many')).toBe('select');
  });
});
