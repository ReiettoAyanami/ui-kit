import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { KitBlockingScreen } from './blocking-screen';

@Component({
  imports: [KitBlockingScreen],
  template: `
    <kit-blocking-screen icon="system_update" title="Update required" actionLabel="Download the update" actionHref="/download">
      This app is older than your server and cannot work with it.
    </kit-blocking-screen>
  `,
})
class Host {}

describe('KitBlockingScreen', () => {
  it('is a dialog that cannot be closed, with its title, its text and one way out', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const screen = element.querySelector('.screen')!;
    expect(screen.getAttribute('role')).toBe('alertdialog');
    expect(screen.getAttribute('aria-labelledby')).toBe('kit-blocking-title');
    expect(element.querySelector('#kit-blocking-title')?.textContent?.trim()).toBe('Update required');
    expect(element.querySelector('.text')?.textContent?.trim()).toBe('This app is older than your server and cannot work with it.');
    expect(element.querySelector('a.get')?.getAttribute('href')).toBe('/download');
    expect(element.querySelectorAll('button').length).toBe(0);
  });
});
