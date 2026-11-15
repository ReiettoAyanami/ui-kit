import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziCardMenu, LenziMenuAction } from '../card-menu/card-menu';
import { LenziPreviewCard } from './preview-card';

@Component({
  imports: [LenziCardMenu, LenziPreviewCard],
  template: `
    <lenzi-preview-card [title]="title" [lines]="lines" [icon]="icon" (opened)="opened = opened + 1" (activeChange)="active.push($event)">
      <img class="picture" alt="" />
      @if (menu) {
        <lenzi-card-menu label="Actions for Dusk" [actions]="actions" (action)="chosen.push($event)" />
      }
    </lenzi-preview-card>
  `,
})
class Host {
  title = 'Dusk';
  lines: string[] = ['6 blobs', 'Saved on 15 November'];
  icon: string | null = null;
  menu = true;
  actions: LenziMenuAction[] = [{ id: 'delete', label: 'Delete', icon: 'delete', destructive: true }];
  opened = 0;
  active: boolean[] = [];
  chosen: string[] = [];
}

function shown(change: (host: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
  change(fixture.componentInstance);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, element, card: element.querySelector<HTMLElement>('lenzi-preview-card')! };
}

describe('LenziPreviewCard', () => {
  it('shows the preview, the title and its facts, one a line', () => {
    const { element } = shown();
    expect(element.querySelector('.preview .picture')).not.toBeNull();
    expect(element.querySelector('.open .title')?.textContent?.trim()).toBe('Dusk');
    expect([...element.querySelectorAll('.line')].map((line) => line.textContent?.trim())).toEqual(['6 blobs', 'Saved on 15 November']);
    expect(element.querySelector<HTMLElement>('.preview')!.style.aspectRatio).toBe('16 / 9');
    expect(element.querySelector('.icon')).toBeNull();
  });

  it('an icon in its well when given', () => {
    const { element } = shown((host) => (host.icon = 'landscape'));
    expect(element.querySelector('.icon')?.textContent?.trim()).toBe('landscape');
  });

  it("opens on a tap; the menu's taps are its own", () => {
    const { element, host, fixture } = shown();
    element.querySelector<HTMLButtonElement>('.open')!.click();
    expect(host.opened).toBe(1);
    element.querySelector<HTMLButtonElement>('.menu lenzi-card-menu button')!.click();
    fixture.detectChanges();
    expect(host.opened).toBe(1);
  });

  it('no room kept for a menu that is not there', () => {
    const { element } = shown((host) => (host.menu = false));
    expect(element.querySelector('.menu')!.children.length).toBe(0);
  });

  it('says when the pointer is over it, and when it left', () => {
    const { card, host, fixture } = shown();
    card.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(host.active).toEqual([true]);
    expect(card.classList.contains('active')).toBe(true);
    card.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(host.active).toEqual([true, false]);
    expect(card.classList.contains('active')).toBe(false);
  });

  it('the keyboard on it counts as the pointer; both gone, it says so once', () => {
    const { card, element, host, fixture } = shown();
    const open = element.querySelector<HTMLButtonElement>('.open')!;
    // focus from the keyboard (the test's browser may not know :focus-visible: then every focus counts)
    open.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    card.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    const wasActive = host.active.at(-1);
    expect(wasActive).toBe(true);
    const said = host.active.length;
    open.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    card.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(host.active.length).toBe(said + 1);
    expect(host.active.at(-1)).toBe(false);
  });
});
