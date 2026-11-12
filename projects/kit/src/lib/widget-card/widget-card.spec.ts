import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { KitWidgetCard } from './widget-card';

@Component({
  imports: [KitWidgetCard],
  template: `<kit-widget-card title="Spent" icon="payments" [scales]="scales" scale="week" (scaleChange)="chosen.push($event)"><p class="inside">chart</p></kit-widget-card>`,
})
class Host {
  scales = ['day', 'week', 'month'];
  chosen: string[] = [];
}

describe('KitWidgetCard', () => {
  it('shows its icon, title and content, with a toggle of its intervals', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('mat-card-title')?.textContent?.trim()).toBe('Spent');
    expect(element.querySelector('.icon')?.textContent?.trim()).toBe('payments');
    expect(element.querySelector('.inside')).not.toBeNull();
    const toggles = Array.from(element.querySelectorAll<HTMLButtonElement>('mat-button-toggle button'));
    expect(toggles.map((b) => b.textContent?.trim())).toEqual(['day', 'week', 'month']);
    toggles[2]!.click();
    expect(fixture.componentInstance.chosen).toEqual(['month']);
  });

  it('no toggle with one interval or none', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.scales = ['week'];
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('mat-button-toggle-group')).toBeNull();
  });
});
