import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziShelf } from './shelf';

@Component({
  imports: [LenziShelf],
  template: `
    <lenzi-shelf title="Light" [count]="7" [(expanded)]="expanded">
      @for (name of names; track name) {
        <a class="item" href="#">{{ name }}</a>
      }
    </lenzi-shelf>
  `,
})
class Host {
  readonly names = ['Glass switch', 'Glass slider', 'Glass search'];
  readonly expanded = signal(false);
}

describe('LenziShelf', () => {
  const make = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('says its title and how many, its things in one row', async () => {
    const { element } = await make();
    expect(element.querySelector('h2.title')!.textContent).toContain('Light');
    expect(element.querySelector('.count')!.textContent).toBe('7');
    expect([...element.querySelectorAll('.row > .item')].map((item) => item.textContent)).toEqual(['Glass switch', 'Glass slider', 'Glass search']);
  });

  it('scrolls a row at a time, and lays them all out with "Show all"', async () => {
    const { fixture, element } = await make();
    const row = element.querySelector<HTMLElement>('.row')!;
    // the test's window lays nothing out: say there is more past the end
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 900 });
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 300 });
    const by: ScrollToOptions[] = [];
    row.scrollBy = ((options: ScrollToOptions) => by.push(options)) as typeof row.scrollBy;
    row.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(row.classList).toContain('after');
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.arrows button')];
    expect(buttons[0]!.disabled).toBe(true);
    buttons[1]!.click();
    expect(by[0]!.left).toBeCloseTo(255);
    element.querySelector<HTMLButtonElement>('.all')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(element.querySelector('lenzi-shelf')!.classList).toContain('lenzi-shelf-expanded');
    expect(element.querySelector('.all')!.textContent).toContain('Show fewer');
    expect(element.querySelector('.arrows')).toBeNull();
  });
});
