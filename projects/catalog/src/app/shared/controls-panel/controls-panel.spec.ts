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
      return field.tagName === 'LENZI-GLASS-SEGMENTED' ? 'pills' : field.querySelector('mat-select') ? 'select' : field.tagName;
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
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('lenzi-glass-slider .track')!;
    track.querySelector<HTMLElement>('.rail')!.getBoundingClientRect = () => ({ left: 0, width: 86, top: 0, height: 40, right: 86, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    // pressed and held at 56 of 86 px (60 on 4 to 90): the value follows before it is let go
    track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 56 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.values()['bezel']).toBe(60);
  });

  describe('the number beside a slider (lenzi, 2026-11-21: "tanti input non si aggiornano automaticamente")', () => {
    async function numberField() {
      const fixture = TestBed.createComponent(ControlsPanel);
      fixture.componentRef.setInput('controls', [{ key: 'bezel', label: 'Bezel', type: 'number', default: 28, min: 4, max: 90, step: 1 } satisfies Control]);
      fixture.componentRef.setInput('values', { bezel: 28 });
      fixture.detectChanges();
      await fixture.whenStable();
      const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.number-field')!;
      const fire = async (type: 'input' | 'change') => {
        field.dispatchEvent(new Event(type, { bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();
      };
      return {
        field,
        bezel: () => fixture.componentInstance.values()['bezel'],
        /** The field holds this text, as a key typed it: its "input" event, no "change" yet. */
        type: async (text: string) => {
          field.value = text;
          await fire('input');
        },
        /** Enter, or the field left: its "change" event. */
        settle: () => fire('change'),
      };
    }

    it('applies a number as it is typed, before Enter or leaving the field', async () => {
      const { field, bezel, type } = await numberField();
      await type('6');
      expect(bezel()).toBe(6);
      await type('60');
      expect(bezel()).toBe(60);
      expect(field.value).toBe('60');
    });

    it('leaves alone, and never writes over, what is half typed, out of the range or written another way', async () => {
      const { field, bezel, type } = await numberField();
      // half typed ("1.", "-"), the field's value is empty (the browser still shows what was typed); never "28" again
      for (const [text, held] of [
        ['1.', ''],
        ['-', ''],
        ['900', '900'],
        ['05', '05'],
        ['', ''],
      ]) {
        await type(text!);
        expect(bezel()).toBe(28);
        expect(field.value).toBe(held);
      }
    });

    it('settles on Enter or leaving: within the range, and the field shows what applies', async () => {
      const { field, bezel, type, settle } = await numberField();
      // 90 applies; "900" is out of the range and settles on 90 again: the number already applied, which nothing else
      // would write in the field
      await type('90');
      await settle();
      await type('900');
      expect(field.value).toBe('900');
      await settle();
      expect(bezel()).toBe(90);
      expect(field.value).toBe('90');
    });

    it('emptied, or left half typed, goes back to the number it had (not the least of the range)', async () => {
      const { field, bezel, type, settle } = await numberField();
      await type('60');
      for (const text of ['', '-']) {
        await type(text);
        await settle();
        expect(bezel()).toBe(60);
        expect(field.value).toBe('60');
      }
    });
  });
});
