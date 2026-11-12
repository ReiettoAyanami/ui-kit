import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';

import { KitNotification, KitNotificationBell } from './notification-bell';

@Component({
  imports: [KitNotificationBell],
  template: `<kit-notification-bell noun="tickets" [items]="items" (opened)="seen.push($event)" (selected)="tapped.push($event.id)" />`,
})
class Host {
  items: KitNotification[] = [
    { id: 7, title: 'Printer offline again', meta: 'TT-0007', when: '2 min ago', link: '/tickets/7' },
    { id: 8, title: 'New mailbox', meta: 'TT-0008' },
  ];
  seen: (readonly KitNotification[])[] = [];
  tapped: (string | number)[] = [];
}

describe('KitNotificationBell', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] }),
  );
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => overlay.remove()));

  it('counts what arrived, lists it when opened, and says it was opened', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const bell = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.bell')!;
    expect(bell.getAttribute('aria-label')).toBe('2 new tickets');

    bell.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.seen.length).toBe(1);
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.kit-bell-menu .item'));
    expect(rows.map((row) => row.querySelector('.title')?.textContent?.trim())).toEqual(['Printer offline again', 'New mailbox']);
    expect(rows[0]!.getAttribute('href')).toBe('/tickets/7');
    rows[1]!.click();
    expect(fixture.componentInstance.tapped).toEqual([8]);
  });

  it('with nothing new it says so', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items = [];
    fixture.detectChanges();
    const bell = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.bell')!;
    expect(bell.getAttribute('aria-label')).toBe('No new tickets');
    bell.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('.kit-bell-menu .empty')?.textContent?.trim()).toBe('Nothing new.');
  });
});
