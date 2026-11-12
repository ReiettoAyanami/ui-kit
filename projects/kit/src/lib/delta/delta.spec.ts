import { TestBed } from '@angular/core/testing';

import { LenziDelta } from './delta';

describe('LenziDelta', () => {
  function delta(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(LenziDelta);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const change = element.querySelector('.change')!;
    const words = [element.querySelector('.label'), element.querySelector('.arrow'), element.querySelector('.number')];
    return {
      text: words.filter((word) => word !== null).map((word) => word!.textContent?.trim()).join(' '),
      tone: change.classList.contains('good') ? 'good' : change.classList.contains('bad') ? 'bad' : null,
      arrow: element.querySelector('.arrow')?.textContent?.trim() ?? null,
      title: change.getAttribute('title'),
    };
  }

  it('a fall: the triangle down, good when falling is good (the default)', () => {
    expect(delta({ ratio: '-0.3333' })).toEqual({ text: 'delta: arrow_drop_down -33.3%', tone: 'good', arrow: 'arrow_drop_down', title: null });
  });

  it('a rise: the triangle up, bad by default, good when rising is good', () => {
    expect(delta({ ratio: '0.05' }).tone).toBe('bad');
    expect(delta({ ratio: '0.05', good: 'up' }).tone).toBe('good');
    expect(delta({ ratio: '0.05', good: 'none' }).tone).toBeNull();
    expect(delta({ ratio: '0.05' }).text).toBe('delta: arrow_drop_up +5%');
  });

  it('no change and nothing to show are neither colour nor direction', () => {
    expect(delta({ ratio: '-0.0004' })).toEqual({ text: 'delta: 0%', tone: null, arrow: null, title: null });
    expect(delta({ ratio: null, noneReason: 'the previous one was free' })).toEqual({
      text: 'delta: —',
      tone: null,
      arrow: null,
      title: 'the previous one was free',
    });
  });

  it('takes another word', () => {
    expect(delta({ ratio: 0.1, label: 'change:' }).text).toBe('change: arrow_drop_up +10%');
  });
});
