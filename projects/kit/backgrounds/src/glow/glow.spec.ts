import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziGlow } from './glow';

@Component({
  imports: [LenziGlow],
  template: `<button type="button" [lenziGlow]="on()" glowColor="#ff4f8b" [glowStrength]="3" [glowReach]="-5">Lamp</button>`,
})
class Host {
  readonly on = signal(true);
}

describe('LenziGlow', () => {
  it('is a lit surface and a lamp in its colour, its numbers kept in range; switches off', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const lamp = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(lamp.classList.contains('lenzi-lit')).toBe(true);
    expect(lamp.classList.contains('lenzi-glow-on')).toBe(true);
    expect(lamp.style.getPropertyValue('--lenzi-glow-color')).toBe('#ff4f8b');
    expect(lamp.style.getPropertyValue('--lenzi-glow-strength')).toBe('2');
    expect(lamp.style.getPropertyValue('--lenzi-glow-reach')).toBe('0px');
    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    expect(lamp.classList.contains('lenzi-glow-on')).toBe(false);
  });

  it('a bare attribute is on, and a variable name is its var()', async () => {
    @Component({ imports: [LenziGlow], template: `<div lenziGlow glowColor="--mat-sys-tertiary"></div>` })
    class Bare {}
    const fixture = TestBed.createComponent(Bare);
    fixture.detectChanges();
    await fixture.whenStable();
    const lamp = (fixture.nativeElement as HTMLElement).querySelector('div')!;
    expect(lamp.classList.contains('lenzi-glow-on')).toBe(true);
    expect(lamp.style.getPropertyValue('--lenzi-glow-color')).toBe('var(--mat-sys-tertiary)');
  });
});
