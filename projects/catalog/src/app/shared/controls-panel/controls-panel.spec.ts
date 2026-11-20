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

  it('follows a slider while it is dragged, before it is let go (lenzi, 2026-11-21: a video of the sliders)', async () => {
    const fixture = TestBed.createComponent(ControlsPanel);
    fixture.componentRef.setInput('controls', [{ key: 'bezel', label: 'Bezel', type: 'number', default: 28, min: 4, max: 90, step: 1 } satisfies Control]);
    fixture.componentRef.setInput('values', { bezel: 28 });
    fixture.detectChanges();
    await fixture.whenStable();
    const thumb = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[matSliderThumb]')!;
    // the thumb's own input moves while it is dragged: its "input" events, no "change" yet
    thumb.value = '60';
    thumb.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.values()['bezel']).toBe(60);
  });
});
