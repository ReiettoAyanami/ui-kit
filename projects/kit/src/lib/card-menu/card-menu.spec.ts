import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

import { KitCardMenu, KitMenuAction } from './card-menu';

@Component({
  imports: [KitCardMenu],
  template: `<div class="card" (click)="opened = opened + 1"><kit-card-menu label="Actions for Birra" [actions]="actions" (action)="chosen.push($event)" /></div>`,
})
class Host {
  readonly actions: KitMenuAction[] = [
    { id: 'edit', label: 'Edit', icon: 'edit' },
    { id: 'delete', label: 'Delete', icon: 'delete', destructive: true },
  ];
  opened = 0;
  chosen: string[] = [];
}

describe('KitCardMenu', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }] }));
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => overlay.remove()));

  it('opens its actions without opening the card, and says which one was chosen', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.trigger')!;
    expect(trigger.getAttribute('aria-label')).toBe('Actions for Birra');

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.opened).toBe(0);

    const items = Array.from(document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]'));
    expect(items.map((item) => item.textContent?.trim())).toEqual(['editEdit', 'deleteDelete']);
    expect(items[1]!.classList.contains('destructive')).toBe(true);
    items[1]!.click();
    expect(fixture.componentInstance.chosen).toEqual(['delete']);
  });
});
