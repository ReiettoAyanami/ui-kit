import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LenziShowcase } from './showcase';
import { LenziShowcaseSlide } from './showcase-slide';

@Component({
  imports: [LenziShowcase, LenziShowcaseSlide],
  template: `
    <lenzi-showcase label="Pieces in use" [interval]="5000" [(index)]="index">
      <ng-template lenziShowcaseSlide="Glass slider" caption="A player's volume"><p class="made">slider</p></ng-template>
      <ng-template lenziShowcaseSlide="Glass switch" caption="Settings"><p class="made">switch</p></ng-template>
      <ng-template lenziShowcaseSlide="Figure"><p class="made">figure</p></ng-template>
    </lenzi-showcase>
  `,
})
class Host {
  readonly index = signal(0);
}

describe('LenziShowcase', () => {
  const make = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const showcase = fixture.debugElement.children[0]!.componentInstance as LenziShowcase;
    const made = () => [...element.querySelectorAll('.made')].map((node) => node.textContent);
    const tabs = () => [...element.querySelectorAll<HTMLButtonElement>('lenzi-glass-list .entry')];
    return { fixture, element, showcase, made, tabs };
  };

  it('makes only the slide on show, and lists every slide by its name and caption', async () => {
    const { element, made, tabs } = await make();
    expect(made()).toEqual(['slider']);
    expect(tabs().map((tab) => tab.querySelector('.name')!.textContent!.trim())).toEqual(['Glass slider', 'Glass switch', 'Figure']);
    expect(tabs()[0]!.querySelector('.caption')!.textContent).toBe("A player's volume");
    expect(tabs()[2]!.querySelector('.caption')).toBeNull();
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('lenzi-showcase')!.getAttribute('aria-roledescription')).toBe('carousel');
    expect(element.querySelector('lenzi-showcase')!.classList).toContain('lenzi-surface');
  });

  it('shows a slide tapped in the list, and the next one when the clock fills; after the last, the first', async () => {
    const { fixture, made, tabs, element } = await make();
    tabs()[2]!.click();
    fixture.detectChanges();
    expect(made()).toEqual(['figure']);
    expect(fixture.componentInstance.index()).toBe(2);
    element.querySelector('.fill')!.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();
    expect(made()).toEqual(['slider']);
    expect(fixture.componentInstance.index()).toBe(0);
  });

  it('walks the list with the arrows, Home and End', async () => {
    const { fixture, made, tabs } = await make();
    tabs()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(made()).toEqual(['figure']);
    tabs()[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(made()).toEqual(['slider']);
  });

  it('holds while pointed at or stopped by "Pause"; the clock runs only while it turns', async () => {
    const { fixture, element, showcase } = await make();
    const host = element.querySelector('lenzi-showcase')!;
    showcase.paused.set(false);
    fixture.detectChanges();
    expect(showcase.running()).toBe(true);
    expect(element.querySelector('.fill')!.classList).toContain('running');
    host.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(showcase.running()).toBe(false);
    expect(element.querySelector('.fill')!.classList).not.toContain('running');
    host.dispatchEvent(new Event('pointerleave'));
    const pause = element.querySelector<HTMLButtonElement>('.pause')!;
    expect(pause.textContent).toContain('Pause');
    pause.click();
    fixture.detectChanges();
    expect(showcase.running()).toBe(false);
    expect(pause.textContent).toContain('Play');
  });
});
