import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { KitPillOption, KitPillToggle } from './pill-toggle';

type Measure = 'quantity' | 'price';

@Component({
  imports: [KitPillToggle],
  template: `<div (click)="outside = outside + 1"><kit-pill-toggle [options]="options" [(value)]="measure" /></div>`,
})
class Host {
  readonly options: KitPillOption<Measure>[] = [
    { value: 'price', label: 'price', ariaLabel: 'price. Show the quantity' },
    { value: 'quantity', label: 'qty', ariaLabel: 'qty, the quantity. Show the price' },
  ];
  readonly measure = signal<Measure>('price');
  outside = 0;
}

describe('KitPillToggle', () => {
  it('reads the state shown, switches it at a tap, and the tap goes no further', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.textContent?.trim()).toBe('price');
    expect(button.getAttribute('aria-label')).toBe('price. Show the quantity');

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.measure()).toBe('quantity');
    expect(button.textContent?.trim()).toBe('qty');
    expect(fixture.componentInstance.outside).toBe(0);

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.measure()).toBe('price');
  });

  it('says what a tap does when no accessible name is given', () => {
    const fixture = TestBed.createComponent(KitPillToggle<string>);
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'total' },
      { value: 'b', label: 'per unit' },
    ]);
    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')!.getAttribute('aria-label')).toBe('total. Show per unit');
  });
});
