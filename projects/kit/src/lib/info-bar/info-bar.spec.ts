import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziInfoBar } from './info-bar';

@Component({
  imports: [LenziInfoBar],
  template: `<lenzi-info-bar icon="visibility" tone="tertiary" actionLabel="Exit" (action)="exits = exits + 1">Viewing as <strong>lenzi</strong></lenzi-info-bar>`,
})
class Host {
  exits = 0;
}

describe('LenziInfoBar', () => {
  it('says its sentence with its icon, as a status, and its action says when it is tapped', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const bar = element.querySelector('.bar')!;
    expect(bar.getAttribute('role')).toBe('status');
    expect(bar.classList.contains('tertiary')).toBe(true);
    expect(element.querySelector('.text')?.textContent?.trim()).toBe('Viewing as lenzi');
    element.querySelector<HTMLButtonElement>('button.action')!.click();
    expect(fixture.componentInstance.exits).toBe(1);
  });

  it('a link out opens elsewhere; no label, no action', () => {
    const fixture = TestBed.createComponent(LenziInfoBar);
    fixture.componentRef.setInput('actionLabel', 'Download');
    fixture.componentRef.setInput('actionHref', 'https://example.org/download');
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.action')!;
    expect(link.getAttribute('href')).toBe('https://example.org/download');
    expect(link.getAttribute('rel')).toBe('noopener');

    fixture.componentRef.setInput('actionLabel', null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.action')).toBeNull();
  });
});
