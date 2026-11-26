import { TestBed } from '@angular/core/testing';

import { LenziGlassList } from './glass-list';

describe('LenziGlassList', () => {
  function make(selected = 0) {
    const fixture = TestBed.createComponent(LenziGlassList);
    fixture.componentRef.setInput('label', 'Examples');
    fixture.componentRef.setInput('items', [
      { name: 'Glass slider', caption: "A player's volume" },
      { name: 'Glass switch', caption: 'A list of settings' },
      { name: 'Schedule grid' },
    ]);
    fixture.componentRef.setInput('selected', selected);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const entries = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button.entry'));
    return { fixture, element, entries };
  }

  it('is tabs, the chosen one selected and the only one in the tab order; captions under the names', () => {
    const { element, entries } = make(1);
    expect(element.querySelector('[role=tablist]')?.getAttribute('aria-label')).toBe('Examples');
    expect(entries().map((e) => e.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(entries().map((e) => e.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(entries()[0]!.querySelector('.caption')?.textContent).toBe("A player's volume");
    expect(entries()[2]!.querySelector('.caption')).toBeNull();
  });

  it('a tap chooses: the lens is clear glass on its way', () => {
    const { fixture, element, entries } = make();
    entries()[2]!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBe(2);
    expect(element.querySelector('.items')?.classList.contains('moving')).toBe(true);
  });

  it('the arrows walk it either way, round; Home and End go to the ends', () => {
    const { fixture, entries } = make();
    const press = (key: string) => {
      entries()[fixture.componentInstance.selected()]!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };
    press('ArrowDown');
    expect(fixture.componentInstance.selected()).toBe(1);
    press('ArrowRight');
    expect(fixture.componentInstance.selected()).toBe(2);
    press('ArrowDown');
    expect(fixture.componentInstance.selected()).toBe(0);
    press('End');
    expect(fixture.componentInstance.selected()).toBe(2);
    press('Home');
    expect(fixture.componentInstance.selected()).toBe(0);
  });

  it('the lens lies on the chosen entry, measured', async () => {
    const { fixture, element, entries } = make(1);
    await fixture.whenStable();
    fixture.detectChanges();
    const lens = element.querySelector<HTMLElement>('.lens')!;
    const entry = entries()[1]!;
    expect(lens.style.height).toBe(`${entry.offsetHeight}px`);
    expect(lens.style.translate).toBe(`${entry.offsetLeft}px ${entry.offsetTop}px`);
  });
});
