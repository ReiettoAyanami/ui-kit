import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { hsvToHex, toHexColor } from './color';
import { LenziColorChoice, LenziColorPicker } from './color-picker';

@Component({
  imports: [LenziColorPicker],
  template: `<div (click)="outside = outside + 1">
    <lenzi-color-picker
      label="Shift colour"
      [(value)]="colour"
      [choices]="choices"
      [disabled]="disabled()"
      [confirm]="confirm()"
      (picked)="picked.push($event)"
    />
  </div>`,
})
class Host {
  readonly colour = signal('#ff0000');
  readonly disabled = signal(false);
  readonly confirm = signal(true);
  readonly choices: LenziColorChoice[] = [
    { value: '#00dddd', label: 'Cyan' },
    { value: 'rgb(110, 216, 137)', label: 'Green' },
  ];
  readonly picked: string[] = [];
  outside = 0;
}

describe('LenziColorPicker', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const swatch = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.swatch')!;
  const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const part = <T extends HTMLElement = HTMLElement>(selector: string) => panel()!.querySelector<T>(selector)!;
  const key = (element: HTMLElement, name: string, shiftKey = false) => element.dispatchEvent(new KeyboardEvent('keydown', { key: name, keyCode: name === 'Escape' ? 27 : 0, shiftKey, bubbles: true }));
  const pointer = (element: HTMLElement, type: string, clientX: number, clientY: number) =>
    element.dispatchEvent(new MouseEvent(type, { clientX, clientY, button: 0, bubbles: true }));
  const type = (text: string) => {
    const field = part<HTMLInputElement>('input');
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const openIt = async () => {
    swatch().click();
    await settle();
  };
  const question = () => document.querySelector<HTMLElement>('mat-snack-bar-container');

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  it('is the colour, named; a click opens the selector under it and goes no further', async () => {
    expect(toHexColor(swatch().style.backgroundColor)).toBe('#ff0000');
    expect(swatch().getAttribute('aria-label')).toBe('Shift colour: #ff0000');
    expect(swatch().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();

    await openIt();
    expect(panel()!.getAttribute('aria-label')).toBe('Shift colour');
    expect(swatch().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(part('.area'));
    expect(host.outside).toBe(0);
  });

  it('arrows move the shade and the hue, and the colour follows at once', async () => {
    await openIt();
    key(part('.area'), 'ArrowLeft', true);
    await settle();
    expect(host.colour()).toBe(hsvToHex({ h: 0, s: 0.9, v: 1 }));
    expect(part('.area').getAttribute('aria-valuetext')).toBe('Saturation 90%, brightness 100%');

    key(part('.area'), 'ArrowDown', true);
    await settle();
    expect(part('.area').getAttribute('aria-valuetext')).toBe('Saturation 90%, brightness 90%');

    key(part('.hue'), 'ArrowRight', true);
    key(part('.hue'), 'ArrowRight');
    await settle();
    expect(part('.hue').getAttribute('aria-valuenow')).toBe('11');
    expect(swatch().getAttribute('aria-label')).toBe(`Shift colour: ${host.colour()}`);

    key(part('.hue'), 'End');
    await settle();
    expect(part('.hue').getAttribute('aria-valuetext')).toBe('360°');
  });

  it('a press and a drag on the shade pick where they are; white keeps the hue it came from', async () => {
    host.colour.set('#0000ff');
    await openIt();
    const area = part('.area');
    area.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 100, x: 0, y: 0, width: 200, height: 100, toJSON: () => ({}) });

    pointer(area, 'pointerdown', 100, 25);
    await settle();
    expect(host.colour()).toBe(hsvToHex({ h: 240, s: 0.5, v: 0.75 }));

    pointer(area, 'pointermove', -40, -40);
    await settle();
    expect(host.colour()).toBe('#ffffff');

    pointer(area, 'pointermove', 200, 0);
    await settle();
    expect(host.colour()).toBe('#0000ff');

    pointer(area, 'pointerup', 200, 0);
    pointer(area, 'pointermove', 0, 100);
    await settle();
    expect(host.colour()).toBe('#0000ff');
  });

  it('a whole hex applies as it is typed, a short one when typing is over, a wrong one never', async () => {
    await openIt();
    type('#00DDDD');
    await settle();
    expect(host.colour()).toBe('#00dddd');
    expect(part<HTMLInputElement>('input').value).toBe('#00DDDD');

    type('#f5');
    await settle();
    expect(host.colour()).toBe('#00dddd');
    expect(part('mat-hint').textContent).toContain('Six digits');

    type('#f59');
    await settle();
    expect(host.colour()).toBe('#00dddd');
    part('input').dispatchEvent(new Event('blur'));
    await settle();
    expect(host.colour()).toBe('#ff5599');
    expect(part<HTMLInputElement>('input').value).toBe('#ff5599');

    type('nothing');
    part('input').dispatchEvent(new Event('blur'));
    await settle();
    expect(host.colour()).toBe('#ff5599');
    expect(part<HTMLInputElement>('input').value).toBe('#ff5599');
  });

  it('offers the app’s colours: a click takes one, the one in use is marked', async () => {
    await openIt();
    const choices = [...panel()!.querySelectorAll<HTMLButtonElement>('.choice')];
    expect(choices.map((choice) => choice.getAttribute('aria-label'))).toEqual(['Cyan', 'Green']);
    expect(choices.map((choice) => choice.getAttribute('aria-pressed'))).toEqual(['false', 'false']);

    choices[1]!.click();
    await settle();
    expect(host.colour()).toBe('#6ed889');
    expect(choices[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('Escape closes it: the focus goes back to the swatch and the final colour goes out, once', async () => {
    await openIt();
    key(part('.area'), 'ArrowLeft', true);
    key(part('.area'), 'ArrowLeft', true);
    await settle();
    expect(host.picked).toEqual([]);

    key(part('.area'), 'Escape');
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(swatch());
    expect(host.picked).toEqual([host.colour()]);

    await openIt();
    key(part('.area'), 'Escape');
    await settle();
    expect(host.picked.length).toBe(1);
  });

  it('a click outside closes it, and so does the swatch again', async () => {
    await openIt();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(panel()).toBeNull();

    await openIt();
    expect(panel()).not.toBeNull();
    await openIt();
    expect(panel()).toBeNull();
  });

  it('has a way back in the selector: to the colour it opened with', async () => {
    await openIt();
    const back = part<HTMLButtonElement>('button.back');
    expect(back.disabled).toBe(true);

    key(part('.area'), 'ArrowLeft', true);
    key(part('.hue'), 'ArrowRight', true);
    await settle();
    expect(host.colour()).not.toBe('#ff0000');
    expect(back.disabled).toBe(false);
    expect(back.getAttribute('aria-label')).toBe('Back to #ff0000');

    back.click();
    await settle();
    expect(host.colour()).toBe('#ff0000');
    expect(back.disabled).toBe(true);
    expect(panel()).not.toBeNull();

    key(part('.area'), 'Escape');
    await settle();
    expect(host.picked).toEqual([]);
    expect(question()).toBeNull();
  });

  it('asks to keep the new colour when it closes; "Go back" brings the one before, and says so', async () => {
    await openIt();
    key(part('.area'), 'ArrowLeft', true);
    key(part('.area'), 'Escape');
    await settle();
    const changed = host.colour();
    expect(changed).not.toBe('#ff0000');
    expect(question()!.textContent).toContain(`Shift colour is now ${changed}. Keep it?`);

    const goBack = question()!.querySelector<HTMLButtonElement>('button')!;
    expect(goBack.textContent?.trim()).toBe('Go back');
    goBack.click();
    await settle();
    expect(host.colour()).toBe('#ff0000');
    expect(host.picked).toEqual([changed, '#ff0000']);
    expect(swatch().getAttribute('aria-label')).toBe('Shift colour: #ff0000');
  });

  it('"Go back" leaves a colour that moved again alone', async () => {
    await openIt();
    key(part('.area'), 'ArrowLeft', true);
    key(part('.area'), 'Escape');
    await settle();
    const goBack = question()!.querySelector<HTMLButtonElement>('button')!;

    host.colour.set('#00dddd');
    await settle();
    goBack.click();
    await settle();
    expect(host.colour()).toBe('#00dddd');
    expect(host.picked.length).toBe(1);
  });

  it('does not ask where the app has its own way back', async () => {
    host.confirm.set(false);
    await openIt();
    key(part('.area'), 'ArrowLeft', true);
    key(part('.area'), 'Escape');
    await settle();
    expect(host.picked.length).toBe(1);
    expect(question()).toBeNull();
  });

  it('does not open when it is disabled', async () => {
    host.disabled.set(true);
    await settle();
    expect(swatch().disabled).toBe(true);
    await openIt();
    expect(panel()).toBeNull();
  });
});
